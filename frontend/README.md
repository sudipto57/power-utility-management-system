# Frontend (website)

React + Vite + Tailwind CSS v4 + Chart.js, with React Router for pages. Runs on **http://localhost:5173**.

## Start

```bash
npm install
npm run dev        # http://localhost:5173  (the backend must be running on port 5000)
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with instant reload |
| `npm run build` | Production build into `dist/` |
| `npm run lint` | Check the code with oxlint |
| `npm run preview` | Preview the production build |

The API address defaults to `http://localhost:5000/api`. Only if your backend runs elsewhere, copy `.env.example` to `.env` and change `VITE_API_URL`.

## How the code is organised

```
src/
├── api/          one file per backend area; all use api/client.js (adds the login token, handles errors)
├── context/      AuthProvider (who is logged in), ToastProvider (pop-up messages), ThemeProvider (light / dark mode)
├── hooks/        useAuth, useToast, useTheme (light / dark switch), useFetch (load data), useDebounce (search box), useCountUp (animated numbers),
│                 useNow (live clock), useNotifications (the bell in the top bar)
├── routes/       ProtectedRoute (login + role check)
├── layouts/      AppLayout (sidebar + top bar), AdminLayout, CustomerLayout (their menus)
├── components/
│   ├── common/   Button, Card, StatCard, StatusBadge, DataTable, Modal, ConfirmDialog, SearchBar, FormField, ThemeToggle,
│   │             WelcomeBanner (day/night), MeterDigits, RequestProgress, EnergyTips, EmptyState, ...
│   ├── charts/   ChartCanvas (Chart.js wrapper), BarChart, LineChart, DoughnutChart, UsageGauge, colors
│   ├── bills/    BillInvoice (printable bill), MarkPaidModal, PaidCelebration
│   ├── landing/  first page: LandingNavbar, AuthCard (Customer/Admin switch, login, sign up), AccountCodeForms (email code, forgot password), LandingSections (incl. bill estimator),
│   │             LandingFooter, WatchDemo, landingData (all page text)
│   └── layout/   Sidebar, Topbar, NotificationBell, AnnouncementStrip + announcements.js (the News messages)
├── pages/
│   ├── auth/     Login (the first page: hero + role based login / customer sign up + scroll-down sections)
│   ├── admin/    Dashboard, customers/, connections/, readings/, bills/, requests/, reports/
│   └── customer/ MyDashboard, MyProfile, MyBills, MyBillDetails, MyRequests, MyRequestDetails, NewRequest
├── utils/        format (money, dates), options (dropdown values), ui (shared classes), routes, time (morning/afternoon/evening/night)
├── App.jsx       every page/route in one place
├── main.jsx      starts React
└── index.css     Tailwind + "Warm Sunrise" colours (sand greys, deep ember/flame/dusk) + animations (fade-up, scale-in, shimmer, flow ...) + dark mode colours

public/videos/   hero-loop.webm (first-page background) + demo.mp4 ("Watch demo"), each with a poster .jpg
```

Every page handles three states: **loading** (skeletons), **empty** (friendly message) and **error** (message + "Try again").
Animations are switched off automatically for people who turn on "reduce motion" in their system settings.
Each page's code is downloaded only when it is first opened (`React.lazy` in `App.jsx`), so the first page loads faster.

Money is shown in Bangladeshi Taka: `৳1,537.00`, with Bangladeshi digit grouping (`৳3,08,896.40`) and lakh / crore on stat cards (`৳3.09 lakh`). To change it, edit `CURRENCY` and `LOCALE` in `src/utils/format.js`.

**Dark mode:** the sun / moon button (`ThemeToggle`) adds the class `dark` to the page and saves the choice in the browser (`localStorage`). The `.dark { ... }` block in `src/index.css` swaps the colour values, so the same Tailwind classes (`bg-white`, `text-sand-900` ...) turn dark by themselves. A small script in `index.html` sets dark mode before the page shows, so there is no white flash. Printed bills always stay light.
