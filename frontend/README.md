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
├── context/      AuthProvider (who is logged in), ToastProvider (pop-up messages)
├── hooks/        useAuth, useToast, useFetch (load data), useDebounce (search box), useCountUp (animated numbers)
├── routes/       ProtectedRoute (login + role check)
├── layouts/      AppLayout (sidebar + top bar), AdminLayout, CustomerLayout (their menus)
├── components/
│   ├── common/   Button, Card, StatCard, StatusBadge, DataTable, Modal, ConfirmDialog, SearchBar, FormField, ...
│   ├── charts/   ChartCanvas (Chart.js wrapper), BarChart, LineChart, DoughnutChart, colors
│   ├── bills/    BillInvoice (printable bill), MarkPaidModal
│   └── layout/   Sidebar, Topbar
├── pages/
│   ├── auth/     Login
│   ├── admin/    Dashboard, customers/, connections/, readings/, bills/, requests/, reports/
│   └── customer/ MyDashboard, MyProfile, MyBills, MyBillDetails, MyRequests, MyRequestDetails, NewRequest
├── utils/        format (money, dates), options (dropdown values), ui (shared classes), routes
├── App.jsx       every page/route in one place
├── main.jsx      starts React
└── index.css     Tailwind + animations (fade-up, scale-in, shimmer, flow, glow ...)
```

Every page handles three states: **loading** (skeletons), **empty** (friendly message) and **error** (message + "Try again").
Animations are switched off automatically for people who turn on "reduce motion" in their system settings.

To show another currency, change `CURRENCY` in `src/utils/format.js` (the sample data uses KES).
