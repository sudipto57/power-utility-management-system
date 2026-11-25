import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getBills } from '../api/bills';
import { getRequests } from '../api/requests';
import { getReadings } from '../api/readings';
import { getChangeRequests } from '../api/changeRequests';
import { getMyNotifications, readMyNotification } from '../api/my';
import { getSupportTickets } from '../api/support';
import { formatDate, formatMoney, timeAgo } from '../utils/format';

// Admin: new Support problems + payments and readings that customers sent + profile changes to approve
//        + overdue bills + complaints nobody has started yet
async function loadAdminItems() {
  const [overdue, pending, changes, payments, readings, support] = await Promise.all([
    getBills({ status: 'Overdue' }),
    getRequests({ status: 'Pending' }),
    getChangeRequests({ status: 'Pending' }),
    getBills({ waiting: 'yes' }),
    getReadings({ status: 'Pending' }),
    getSupportTickets({ status: 'Open' }).catch(() => []), // new problems from the Support form
  ]);
  return [
    ...support.map((t) => ({
      id: `support-${t.id}`,
      icon: 'mail',
      tone: 'bg-orange-100 text-orange-700',
      title: `Support ${t.ticket_number}: ${t.subject}`,
      text: `${t.name} · ${t.category}`,
      to: `/admin/support/${t.id}`,
    })),
    ...payments.map((b) => ({
      id: `payment-${b.id}`,
      icon: 'wallet',
      tone: 'bg-emerald-100 text-emerald-700',
      title: `${b.customer_name} paid ${b.bill_number} online`,
      text: 'Check the reference and confirm it',
      to: `/admin/bills/${b.id}`,
    })),
    ...readings.map((r) => ({
      id: `reading-${r.id}`,
      icon: 'gauge',
      tone: 'bg-sky-100 text-sky-700',
      title: `${r.customer_name} sent a meter reading`,
      text: `${r.meter_number} · ${r.current_reading} kWh · ${formatDate(r.reading_date)}`,
      to: '/admin/readings?status=Pending',
    })),
    ...changes.map((c) => ({
      id: `change-${c.id}`,
      icon: 'user',
      tone: 'bg-violet-100 text-violet-600',
      title: `${c.customer_name} wants a new ${c.field_label.toLowerCase()}`,
      text: `${c.customer_number} · waiting for approval`,
      to: '/admin#change-requests',
    })),
    ...overdue.map((b) => ({
      id: `bill-${b.id}`,
      icon: 'alert',
      tone: 'bg-rose-100 text-rose-600',
      title: `${b.bill_number} is overdue`,
      text: `${b.customer_name} · ${formatMoney(b.balance)} to collect`,
      to: `/admin/bills/${b.id}`,
    })),
    ...pending.map((r) => ({
      id: `request-${r.id}`,
      icon: 'complaint',
      tone: 'bg-amber-100 text-amber-600',
      title: `${r.request_number} · ${r.category}`,
      text: `${r.customer_name} · waiting to start`,
      to: `/admin/requests/${r.id}`,
    })),
  ];
}

// Customer: their inbox (messages saved by the backend, newest first)
const KIND_LOOK = {
  bill: { icon: 'receipt', tone: 'bg-amber-100 text-amber-700' },
  reminder: { icon: 'alert', tone: 'bg-rose-100 text-rose-700' },
  payment: { icon: 'wallet', tone: 'bg-emerald-100 text-emerald-700' },
  reading: { icon: 'gauge', tone: 'bg-sky-100 text-sky-700' },
  request: { icon: 'complaint', tone: 'bg-violet-100 text-violet-700' },
  notice: { icon: 'megaphone', tone: 'bg-orange-100 text-orange-700' },
  profile: { icon: 'user', tone: 'bg-indigo-100 text-indigo-700' },
};

function toItem(message) {
  return {
    id: message.id,
    ...(KIND_LOOK[message.kind] || KIND_LOOK.notice),
    title: message.title,
    text: message.message,
    time: timeAgo(message.created_at),
    to: message.link || '/my',
    unread: !message.is_read,
  };
}

// Admin: the things the admin already opened (or marked as read) are remembered in this browser,
// so each one shows in the bell only once. (Customers' read messages are saved in the database.)
const seenKey = (userId) => `power_utility_seen_${userId}`;
function readSeen(userId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(seenKey(userId)) || '[]'));
  } catch {
    return new Set();
  }
}
function saveSeen(userId, seen) {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify([...seen].slice(-500))); // keep the newest 500
  } catch {
    /* storage not available: the bell just shows them again next time */
  }
}

const REFRESH_MS = 30000; // look for new notifications every 30 seconds

/**
 * The bell in the top bar. It loads again when another page opens, when you come back to the
 * browser tab, and every 30 seconds. Only NEW things are shown: opening one hides it from the bell.
 * Returns { items, count, openItem, readAll, isInbox }
 *   admin:    things that need attention and were not opened yet
 *   customer: the unread inbox messages (opening one marks it as read in the database)
 */
export default function useNotifications(role, userId) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [seen, setSeen] = useState(() => readSeen(userId));
  const { pathname } = useLocation();
  const isCustomer = role === 'customer';

  // Customers: show only the unread messages
  const showInbox = useCallback((inbox) => {
    setItems(inbox.items.filter((message) => !message.is_read).map(toItem));
    setUnread(inbox.unread);
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => {
      const request = isCustomer
        ? getMyNotifications().then((inbox) => active && showInbox(inbox))
        : loadAdminItems().then((list) => active && setItems(list));
      request.catch(() => {}); // the bell is extra: if it fails, the page still works
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    window.addEventListener('focus', load); // back to this tab: check at once
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', load);
    };
  }, [isCustomer, pathname, showInbox]);

  // Admin: hide what was already opened
  const visible = isCustomer ? items : items.filter((item) => !seen.has(item.id));

  const markSeen = (ids) => {
    const next = new Set([...seen, ...ids]);
    setSeen(next);
    saveSeen(userId, next);
  };

  const openItem = (item) => {
    if (!isCustomer) return markSeen([item.id]);
    setItems((list) => list.filter((other) => other.id !== item.id)); // hide it straight away
    setUnread((n) => Math.max(n - 1, 0));
    readMyNotification(item.id)
      .then(showInbox)
      .catch(() => {});
  };

  const readAll = () => {
    if (!isCustomer) return markSeen(visible.map((item) => item.id));
    setItems([]);
    setUnread(0);
    readMyNotification('all')
      .then(showInbox)
      .catch(() => {});
  };

  return {
    items: visible,
    count: isCustomer ? unread : visible.length,
    openItem,
    readAll: visible.length > 0 ? readAll : null,
    isInbox: isCustomer,
  };
}
