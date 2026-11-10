import AppLayout from './AppLayout';

const CUSTOMER_MENU = [
  { to: '/my', label: 'My Dashboard', icon: 'dashboard', end: true },
  { to: '/my/bills', label: 'My Bills', icon: 'receipt' },
  { to: '/my/requests', label: 'My Requests', icon: 'complaint' },
  { to: '/my/profile', label: 'My Profile', icon: 'user' },
];

export default function CustomerLayout() {
  return <AppLayout menu={CUSTOMER_MENU} roleLabel="Customer portal" />;
}
