import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import AnnouncementStrip from '../components/layout/AnnouncementStrip';
import BackToTop from '../components/common/BackToTop';
import { PageSkeleton } from '../components/common/Skeleton';
import useAuth from '../hooks/useAuth';
import useNotifications from '../hooks/useNotifications';

const SITE_NAME = 'Sparkility';

// The page files of each portal (Vite makes one small file per page, the same ones App.jsx loads).
// Loading them early, while nothing else happens, makes the next click open a page at once.
const PAGE_FILES = {
  admin: import.meta.glob('../pages/admin/**/*.jsx'),
  customer: import.meta.glob('../pages/customer/**/*.jsx'),
};

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
  const notifications = useNotifications(role, user?.id);

  // Opening another page starts at the top of it
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // When the page is ready and the browser is idle, download the other pages of this portal.
  // Skipped when the phone asks to save data (Data Saver).
  useEffect(() => {
    if (navigator.connection?.saveData) return undefined;
    const idle = window.requestIdleCallback || ((work) => setTimeout(work, 1500));
    const cancelIdle = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => {
      Object.values(PAGE_FILES[role] || {}).forEach((load) => load().catch(() => {}));
    });
    return () => cancelIdle(id);
  }, [role]);

  // Browser tab title, e.g. "(2) My Bills · Sparkility"
  // Customers see how many unread messages are in their inbox.
  const unread = role === 'customer' ? notifications.count : 0;
  const pageLabel = currentMenuLabel(menu, location.pathname);
  useEffect(() => {
    const count = unread > 0 ? `(${unread}) ` : '';
    document.title = `${count}${pageLabel ? `${pageLabel} · ` : ''}${SITE_NAME}`;
  }, [unread, pageLabel]);

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
          {/* Each page's code is downloaded the first time it is opened (see App.jsx);
              meanwhile the menu stays and a page-shaped placeholder shows */}
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BackToTop />
    </div>
  );
}
