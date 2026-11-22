import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getBills } from '../api/bills';
import { getRequests } from '../api/requests';
import { getReadings } from '../api/readings';
import { getChangeRequests } from '../api/changeRequests';
import { getMyNotifications, readMyNotification } from '../api/my';
import { formatDate, formatMoney, timeAgo } from '../utils/format';

// Admin: payments and readings that customers sent + profile changes to approve
//        + overdue bills + complaints nobody has started yet
async function loadAdminItems() {
  const [overdue, pending, changes, payments, readings] = await Promise.all([
    getBills({ status: 'Overdue' }),
    getRequests({ status: 'Pending' }),
    getChangeRequests({ status: 'Pending' }),
    getBills({ waiting: 'yes' }),
    getReadings({ status: 'Pending' }),
  ]);
  return [
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

/**
 * The bell in the top bar. Loads again when another page opens and every minute.
 * Returns { items, count, openItem, readAll }
 *   admin:    things that need attention (count = how many)
 *   customer: the inbox (count = unread messages; opening one marks it as read)
 */
export default function useNotifications(role) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const { pathname } = useLocation();
  const isCustomer = role === 'customer';

  const showInbox = useCallback((inbox) => {
    setItems(inbox.items.map(toItem));
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
    const timer = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isCustomer, pathname, showInbox]);

  const openItem = (item) => {
    if (isCustomer && item.unread)
      readMyNotification(item.id)
        .then(showInbox)
        .catch(() => {});
  };
  const readAll =
    isCustomer && unread > 0
      ? () =>
          readMyNotification('all')
            .then(showInbox)
            .catch(() => {})
      : null;

  return { items, count: isCustomer ? unread : items.length, openItem, readAll };
}
