import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import PageLoader from '../components/common/PageLoader';
import { homePathFor } from '../utils/routes';

/**
 * Only lets the right people in.
 *   <ProtectedRoute role="admin" />  -> admins only
 * Not logged in -> login page.  Wrong role -> their own home page.
 */
export default function ProtectedRoute({ role }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <PageLoader text="Checking your login..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to={homePathFor(user)} replace />;
  return <Outlet />;
}
