import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import AnnouncementStrip from '../components/layout/AnnouncementStrip';
import BackToTop from '../components/common/BackToTop';
import useAuth from '../hooks/useAuth';
import useNotifications from '../hooks/useNotifications';

const SITE_NAME = 'Power Utility Management System';

// The menu item that matches the open page (the longest matching link wins)
function currentMenuLabel(menu, pathname) {
  const matches = menu.filter((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
  matches.sort((a, b) => b.to.length - a.to.length);
  return matches[0]?.label;
}

/** Shared frame for both portals: sidebar + top bar + the current page. */
export default function AppLayout({ menu, roleLabel, role }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const notifications = useNotifications(role);

  // Opening another page starts at the top of it
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Browser tab title, e.g. "(1) My Bills · Power Utility Management System"
  // Customers see how many bills they still have to pay.
  const unpaidBills = notifications.filter((item) => item.unpaidBill).length;
  const pageLabel = currentMenuLabel(menu, location.pathname);
  useEffect(() => {
    const count = role === 'customer' && unpaidBills > 0 ? `(${unpaidBills}) ` : '';
    document.title = `${count}${pageLabel ? `${pageLabel} · ` : ''}${SITE_NAME}`;
  }, [role, unpaidBills, pageLabel]);

  // Put the normal title back after logging out
  useEffect(() => {
    return () => {
      document.title = SITE_NAME;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen">
      <Sidebar items={menu} open={menuOpen} onClose={() => setMenuOpen(false)} roleLabel={roleLabel} role={role} />
      <div className="app-colorful min-h-screen lg:pl-68 print:pl-0">
        <AnnouncementStrip />
        <Topbar user={user} notifications={notifications} onMenu={() => setMenuOpen(true)} onLogout={handleLogout} />
        {/* key = path, so every page plays its entrance animation */}
        <main
          key={location.pathname}
          className="mx-auto w-full max-w-7xl animate-fade-in px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:p-0"
        >
          <Outlet />
        </main>
      </div>
      <BackToTop />
    </div>
  );
}
