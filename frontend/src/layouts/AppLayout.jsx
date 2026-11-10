import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import useAuth from '../hooks/useAuth';

/** Shared frame for both portals: sidebar + top bar + the current page. */
export default function AppLayout({ menu, roleLabel }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen">
      <Sidebar items={menu} open={menuOpen} onClose={() => setMenuOpen(false)} roleLabel={roleLabel} />
      <div className="app-backdrop min-h-screen lg:pl-68 print:pl-0">
        <Topbar user={user} onMenu={() => setMenuOpen(true)} onLogout={handleLogout} />
        {/* key = path, so every page plays its entrance animation */}
        <main
          key={location.pathname}
          className="mx-auto w-full max-w-7xl animate-fade-in px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:p-0"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
