import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import CustomerLayout from './layouts/CustomerLayout';
import PageLoader from './components/common/PageLoader';
import { homePathFor } from './utils/routes';

import Login from './pages/auth/Login';

// Every other page is loaded only when someone opens it (React.lazy), so the first page appears faster.
// While a page loads, the layout shows a placeholder (Suspense in layouts/AppLayout.jsx).
const NotFound = lazy(() => import('./pages/NotFound'));

const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const CustomerList = lazy(() => import('./pages/admin/customers/CustomerList'));
const CustomerForm = lazy(() => import('./pages/admin/customers/CustomerForm'));
const CustomerProfile = lazy(() => import('./pages/admin/customers/CustomerProfile'));
const ConnectionList = lazy(() => import('./pages/admin/connections/ConnectionList'));
const ConnectionForm = lazy(() => import('./pages/admin/connections/ConnectionForm'));
const ConnectionDetails = lazy(() => import('./pages/admin/connections/ConnectionDetails'));
const ReadingList = lazy(() => import('./pages/admin/readings/ReadingList'));
const ReadingEntry = lazy(() => import('./pages/admin/readings/ReadingEntry'));
const BillList = lazy(() => import('./pages/admin/bills/BillList'));
const GenerateBill = lazy(() => import('./pages/admin/bills/GenerateBill'));
const BillDetails = lazy(() => import('./pages/admin/bills/BillDetails'));
const RequestList = lazy(() => import('./pages/admin/requests/RequestList'));
const RequestDetails = lazy(() => import('./pages/admin/requests/RequestDetails'));
const Reports = lazy(() => import('./pages/admin/reports/Reports'));
const CustomerStatement = lazy(() => import('./pages/admin/customers/CustomerStatement'));
const UsageAlerts = lazy(() => import('./pages/admin/readings/UsageAlerts'));
const ActivityLog = lazy(() => import('./pages/admin/activity/ActivityLog'));
const OutageNotices = lazy(() => import('./pages/admin/outages/OutageNotices'));

const MyDashboard = lazy(() => import('./pages/customer/MyDashboard'));
const MyProfile = lazy(() => import('./pages/customer/MyProfile'));
const MyBills = lazy(() => import('./pages/customer/MyBills'));
const MyBillDetails = lazy(() => import('./pages/customer/MyBillDetails'));
const MyRequests = lazy(() => import('./pages/customer/MyRequests'));
const MyRequestDetails = lazy(() => import('./pages/customer/MyRequestDetails'));
const NewRequest = lazy(() => import('./pages/customer/NewRequest'));
const MyFeedback = lazy(() => import('./pages/customer/MyFeedback'));
const MyStatement = lazy(() => import('./pages/customer/MyStatement'));
const MyUsage = lazy(() => import('./pages/customer/MyUsage'));
const MyPayments = lazy(() => import('./pages/customer/MyPayments'));
const MyReceipt = lazy(() => import('./pages/customer/MyReceipt'));

/** "/" sends people to the right place. */
function HomeRedirect() {
  const { user, checking } = useAuth();
  if (checking) return <PageLoader />;
  return <Navigate to={user ? homePathFor(user) : '/login'} replace />;
}

// Every page of the website in one place
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />

      {/* ---------- Admin ---------- */}
      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/new" element={<CustomerForm />} />
          <Route path="customers/:id" element={<CustomerProfile />} />
          <Route path="customers/:id/edit" element={<CustomerForm />} />
          <Route path="customers/:id/statement" element={<CustomerStatement />} />
          <Route path="connections" element={<ConnectionList />} />
          <Route path="connections/new" element={<ConnectionForm />} />
          <Route path="connections/:id" element={<ConnectionDetails />} />
          <Route path="connections/:id/edit" element={<ConnectionForm />} />
          <Route path="readings" element={<ReadingList />} />
          <Route path="readings/new" element={<ReadingEntry />} />
          <Route path="readings/alerts" element={<UsageAlerts />} />
          <Route path="bills" element={<BillList />} />
          <Route path="bills/generate" element={<GenerateBill />} />
          <Route path="bills/:id" element={<BillDetails />} />
          <Route path="requests" element={<RequestList />} />
          <Route path="requests/:id" element={<RequestDetails />} />
          <Route path="reports" element={<Reports />} />
          <Route path="outages" element={<OutageNotices />} />
          <Route path="activity" element={<ActivityLog />} />
        </Route>
      </Route>

      {/* ---------- Customer ---------- */}
      <Route element={<ProtectedRoute role="customer" />}>
        <Route path="/my" element={<CustomerLayout />}>
          <Route index element={<MyDashboard />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="bills" element={<MyBills />} />
          <Route path="bills/:id" element={<MyBillDetails />} />
          <Route path="statement" element={<MyStatement />} />
          <Route path="usage" element={<MyUsage />} />
          <Route path="payments" element={<MyPayments />} />
          <Route path="payments/:id" element={<MyReceipt />} />
          <Route path="requests" element={<MyRequests />} />
          <Route path="requests/new" element={<NewRequest />} />
          <Route path="requests/:id" element={<MyRequestDetails />} />
          <Route path="feedback" element={<MyFeedback />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Suspense fallback={<PageLoader />}>
            <NotFound />
          </Suspense>
        }
      />
    </Routes>
  );
}
