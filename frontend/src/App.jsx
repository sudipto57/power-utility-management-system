import { Navigate, Route, Routes } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import CustomerLayout from './layouts/CustomerLayout';
import PageLoader from './components/common/PageLoader';
import { homePathFor } from './utils/routes';

import Login from './pages/auth/Login';
import NotFound from './pages/NotFound';

import Dashboard from './pages/admin/Dashboard';
import CustomerList from './pages/admin/customers/CustomerList';
import CustomerForm from './pages/admin/customers/CustomerForm';
import CustomerProfile from './pages/admin/customers/CustomerProfile';
import ConnectionList from './pages/admin/connections/ConnectionList';
import ConnectionForm from './pages/admin/connections/ConnectionForm';
import ConnectionDetails from './pages/admin/connections/ConnectionDetails';
import ReadingList from './pages/admin/readings/ReadingList';
import ReadingEntry from './pages/admin/readings/ReadingEntry';
import BillList from './pages/admin/bills/BillList';
import GenerateBill from './pages/admin/bills/GenerateBill';
import BillDetails from './pages/admin/bills/BillDetails';
import RequestList from './pages/admin/requests/RequestList';
import RequestDetails from './pages/admin/requests/RequestDetails';
import Reports from './pages/admin/reports/Reports';

import MyDashboard from './pages/customer/MyDashboard';
import MyProfile from './pages/customer/MyProfile';
import MyBills from './pages/customer/MyBills';
import MyBillDetails from './pages/customer/MyBillDetails';
import MyRequests from './pages/customer/MyRequests';
import MyRequestDetails from './pages/customer/MyRequestDetails';
import NewRequest from './pages/customer/NewRequest';
import MyFeedback from './pages/customer/MyFeedback';

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
          <Route path="connections" element={<ConnectionList />} />
          <Route path="connections/new" element={<ConnectionForm />} />
          <Route path="connections/:id" element={<ConnectionDetails />} />
          <Route path="connections/:id/edit" element={<ConnectionForm />} />
          <Route path="readings" element={<ReadingList />} />
          <Route path="readings/new" element={<ReadingEntry />} />
          <Route path="bills" element={<BillList />} />
          <Route path="bills/generate" element={<GenerateBill />} />
          <Route path="bills/:id" element={<BillDetails />} />
          <Route path="requests" element={<RequestList />} />
          <Route path="requests/:id" element={<RequestDetails />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Route>

      {/* ---------- Customer ---------- */}
      <Route element={<ProtectedRoute role="customer" />}>
        <Route path="/my" element={<CustomerLayout />}>
          <Route index element={<MyDashboard />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="bills" element={<MyBills />} />
          <Route path="bills/:id" element={<MyBillDetails />} />
          <Route path="requests" element={<MyRequests />} />
          <Route path="requests/new" element={<NewRequest />} />
          <Route path="requests/:id" element={<MyRequestDetails />} />
          <Route path="feedback" element={<MyFeedback />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
