import AppLayout from './AppLayout';

const CUSTOMER_MENU = [
  { to: '/my', label: 'My Dashboard', icon: 'dashboard', end: true },
  { to: '/my/usage', label: 'Meter & Usage', icon: 'gauge' },
  { to: '/my/bills', label: 'My Bills', icon: 'receipt' },
  { to: '/my/statement', label: 'My Statement', icon: 'file' },
  { to: '/my/payments', label: 'My Payments', icon: 'wallet' },
  { to: '/my/requests', label: 'My Requests', icon: 'complaint' },
  { to: '/my/profile', label: 'My Profile', icon: 'user' },
  { to: '/my/feedback', label: 'Give Feedback', icon: 'send' },
];

export default function CustomerLayout() {
  return <AppLayout menu={CUSTOMER_MENU} roleLabel="Customer portal" role="customer" />;
}
