import AppLayout from './AppLayout';

const ADMIN_MENU = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/customers', label: 'Customers', icon: 'users' },
  { to: '/admin/connections', label: 'Connections & Meters', icon: 'plug' },
  { to: '/admin/readings', label: 'Meter Readings', icon: 'gauge' },
  { to: '/admin/bills', label: 'Bills & Payments', icon: 'receipt' },
  { to: '/admin/requests', label: 'Complaints', icon: 'complaint' },
  { to: '/admin/reports', label: 'Reports', icon: 'chart' },
];

export default function AdminLayout() {
  return <AppLayout menu={ADMIN_MENU} roleLabel="Admin panel" role="admin" />;
}
