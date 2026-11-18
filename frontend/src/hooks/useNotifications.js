import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getBills } from '../api/bills';
import { getRequests } from '../api/requests';
import { getChangeRequests } from '../api/changeRequests';
import { getMyBills, getMyRequests } from '../api/my';
import { formatDate, formatMoney } from '../utils/format';

const OPEN_BILLS = ['Unpaid', 'Partially Paid', 'Overdue'];
const OPEN_REQUESTS = ['Pending', 'In Progress'];

// Admin: overdue bills + complaints nobody has started yet + profile changes to approve
async function loadAdminItems() {
  const [overdue, pending, changes] = await Promise.all([
    getBills({ status: 'Overdue' }),
    getRequests({ status: 'Pending' }),
    getChangeRequests({ status: 'Pending' }),
  ]);
  return [
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

// Customer: bills still to pay + their requests that are still open
async function loadCustomerItems() {
  const [bills, requests] = await Promise.all([getMyBills(), getMyRequests()]);
  return [
    ...bills
      .filter((b) => OPEN_BILLS.includes(b.status))
      .map((b) => ({
        id: `bill-${b.id}`,
        icon: b.status === 'Overdue' ? 'alert' : 'receipt',
        tone: b.status === 'Overdue' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600',
        title: `${b.bill_number} · ${formatMoney(b.balance)} to pay`,
        text: `${b.status} · due ${formatDate(b.due_date)}`,
        to: `/my/bills/${b.id}`,
        unpaidBill: true,
      })),
    ...requests
      .filter((r) => OPEN_REQUESTS.includes(r.status))
      .map((r) => ({
        id: `request-${r.id}`,
        icon: 'complaint',
        tone: 'bg-sky-100 text-sky-600',
        title: `${r.request_number} · ${r.category}`,
        text: `Status: ${r.status}`,
        to: `/my/requests/${r.id}`,
      })),
  ];
}

/**
 * Things that need attention, for the bell in the top bar.
 * Loads again when another page opens and every minute.
 */
export default function useNotifications(role) {
  const [items, setItems] = useState([]);
  const { pathname } = useLocation();

  useEffect(() => {
    let active = true;
    const load = () => {
      const loader = role === 'admin' ? loadAdminItems : loadCustomerItems;
      loader()
        .then((list) => active && setItems(list))
        .catch(() => {}); // the bell is extra: if it fails, the page still works
    };
    load();
    const timer = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [role, pathname]);

  return items;
}
