# Power Utility Management System — guide for Claude

Read this first in every session. It is the short version of how this project works and what the team expects.

## What this is

An academic DBMS project: a web app where an electricity company manages customers, connections, meters, readings, bills, payments and complaints, and customers log in to see their own bills and send service requests.

- Team repo: https://github.com/sudipto57/power-utility-management-system (branch `main`)
- The team are **beginners building their first full-stack project**. Checkpoints are live demos: CP-1 (10%), CP-2 (about 30%), CP-3 (about 50% by midterm). Earlier work must keep working at every checkpoint.

## Rules that always apply

1. **Name rule.** Always write "Power Utility Management System" (or "Power Utility" in tight UI spots). The old four-letter abbreviation of the name is never used anywhere: code, folders, files, database names, e-mails, docs or replies. **One exception the team chose (18 Nov 2026):** the admin login username `PUMSadmin`.
2. **Keep it beginner-friendly.** Simple code a first-year student can read and explain in a viva. Short functions, clear names, a comment where the "why" is not obvious. No clever tricks.
3. **The stack is fixed.** Do not add frameworks or libraries without the team asking.
   - Frontend: React 19 + Vite + Tailwind CSS v4 + Chart.js + React Router. Plain JavaScript (no TypeScript). `fetch` for API calls. No Redux, no UI kit, no icon library.
   - Backend: Node.js + Express 5, plain SQL through `pg`. No ORM.
   - Database: PostgreSQL on Supabase (also runs on local PostgreSQL), managed with pgAdmin 4.
4. **Do not change the tables.** `database/01_create_tables.sql` and `database/02_billing_tables.sql` are the team's schema. Never add, remove or rename a table or column unless the team asks for exactly that. New logic goes in functions, triggers, views or the API. The team asked for email codes (sign-up confirmation, forgot password, an 8-digit code at every customer login like GitHub) and profile change requests, so `database/09_account_security.sql` **adds** two new tables (`account_codes`, `profile_change_requests`); for the automatic copy of sign-ups the team asked for, `database/10_auto_save.sql` adds `sql_file_saves`; for the extra features the team chose (20 Nov 2026), `database/11_extra_features.sql` adds `audit_log`, `outage_notices` and `meter_replacements`. The original tables are unchanged.
5. **Build only what was asked.** The scope is the 15 features (plus customer sign-up and role-based login) and the six extra features of file 11 (activity log, account statement, usage alerts, late fees, outage notices, meter replacement). `bill_adjustments` is used only for late fees and their waivers; `bill_installments` and `meter_reading_schedules` exist in the database but have no API or UI on purpose.
6. **Secrets stay out of git.** Never print, copy or commit `backend/.env`. Only `.env.example` files (with fake values) are committed. `.gitignore` blocks every `.env*` file except `.env.example`.

## Run it

```bash
# terminal 1 - API on http://localhost:5000/api
cd backend && npm install && npm run db:test && npm run dev

# terminal 2 - website on http://localhost:5173
cd frontend && npm install && npm run dev
```

Demo logins (from `database/04_sample_data.sql`): `PUMSadmin` / staff password (ask the team: it is shared privately and never written in GitHub), `sumaiya.khanam` / `customer123` (Bangladesh sample data: 200 customers CUST-001 … CUST-200, emails end in `@example.com` so test emails never reach real people).
Website sign-ups (and customers added by an admin) are saved in the database and then copied by the backend into the marked "WEBSITE CUSTOMERS" part at the end of `database/04_sample_data.sql` (`backend/src/utils/saveCustomersToSql.js`; by hand: `npm run db:save-customers`). Never edit that part by hand. When the laptop is off, sign-ups wait in Supabase; the laptop's background job (`npm run auto-save:on`, starts with Windows, runs every 10 minutes) copies them in. On Render `SAVE_CUSTOMERS_TO_SQL_FILE=false`.
`SELECT * FROM customers` has no fixed order: use the view `customers_in_order` or `ORDER BY`.
Database setup order: `00_reset` → `01` → `02` → `03` → `04` → `07` (Supabase only) → `09` → `10` → `11`. `05` is local-only, `06` is practice queries. Full steps: `docs/04_setup_guide.md`.

## Check your work (before saying something is done)

```bash
cd frontend && npm run lint && npm run build     # must show no errors
cd backend  && npm run db:test                   # database reachable, 19 tables
```

API changes: run the Postman collection in `postman/` (or the matching request) against the running backend. UI changes: open the page in the browser as admin **and** as customer.

## Where things live

```
frontend/src/
  api/          one file per backend area; all go through api/client.js (adds the token, turns errors into messages)
  context/      AuthProvider (who is logged in), ToastProvider (pop-up messages), ThemeProvider (light / dark mode)
  hooks/        useAuth, useToast, useTheme, useFetch, useDebounce, useCountUp, useNow (live clock), useNotifications (top-bar bell)
  routes/       ProtectedRoute (login + role check)
  layouts/      AppLayout, AdminLayout, CustomerLayout (the menus)
  components/   common/ (Button, Card, StatCard, StatusBadge, DataTable, Modal, FormField ...)
                charts/ (Chart.js wrappers)  bills/  layout/ (Sidebar, Topbar)  landing/ (first page, AuthCard)
  pages/        auth/Login.jsx   admin/...   customer/...   NotFound.jsx
  utils/        format.js (money, dates)  options.js (dropdown values)  ui.js (shared class strings)  routes.js
  App.jsx       every route in one place
  index.css     Tailwind @theme: fonts + animations

backend/src/
  config/       env.js (reads .env), db.js (pool, query(), withTransaction(), connection tips)
  middleware/   auth.js (requireAuth: token + account still active + password unchanged), requireRole.js, errorHandler.js,
                security.js (safety headers, rateLimit per visitor)
  routes/       URL -> controller function      controllers/   validate -> SQL -> JSON
  utils/        ApiError, validate.js, constants.js, generateNumber.js (CUST-009, BILL-2026-013 ...),
                email.js (Brevo email API; prints to the terminal when BREVO_API_KEY is empty)
  app.js        builds the Express app          server.js      checks the database, then listens

database/       numbered SQL files (run in order) + README
docs/           01 overview · 02 database design · 03 API reference · 04 setup · 05 user guide · 06 testing · checkpoints/ · data-collection/
postman/        collection + Local environment
```

## How to add or change a feature

Work one feature end to end, in this order. Do not start the next step until the current one works.

1. **SQL** — write and try the query in pgAdmin first.
2. **API** — route in `backend/src/routes/`, logic in the matching controller.
3. **Postman** — add the request to the collection and send it.
4. **Page** — function in `frontend/src/api/`, then the page, then the route in `App.jsx` and the menu in the layout.
5. **Docs** — one line in `docs/03_api_reference.md` (and the user guide if a screen changed).

### Backend conventions

- Success: `res.json({ data: ... })`. Errors: `throw new ApiError(400, 'Clear message')`; the error handler sends `{ "message": "..." }`. Use 400 / 401 / 403 / 404 / 409 correctly.
- **Always** pass values as SQL parameters: `query('SELECT ... WHERE id = $1', [id])`. Never build SQL from user input.
- Validate input with the helpers in `utils/validate.js`; allowed values live in `utils/constants.js` and must match the database CHECK constraints.
- Several writes that belong together go in `withTransaction()`.
- Writes pass the logged-in user: `withTransaction(work, req.user.id)` or `queryAs(req.user.id, sql, params)`, so the activity log knows who made the change.
- Admin routes: `router.use(requireAuth, requireRole('admin'))`. Customer routes live under `/api/my` and use the customer id from the token, never from the request.
- Bill amounts are **never** typed or calculated in JavaScript: call `calculate_bill_amount()`. Balances come from the view `bill_balance` (total + late fee − waiver − payments). "Mark paid" inserts a payment row (the trigger sets the status); "Mark unpaid" deletes it.
- A customer with bills is never deleted: answer 409 and offer "Inactive".

### Frontend conventions

- Follow the design system: https://claude.ai/artifact/U6q3eGG593W9Z4hpZmJLnm (colours, type, spacing, components, wording).
- Reuse `components/common/` and the class strings in `utils/ui.js` before writing new styles. One brand gradient (`from-amber-400 via-orange-500 to-rose-500`) for customer screens, the cool one (`from-indigo-500 via-violet-500 to-fuchsia-500`) for admin.
- Every page handles three states: loading (`PageSkeleton` / `Skeleton`), empty (`EmptyState`), error (`ErrorState` with "Try again").
- Load data with `useFetch`; show results of actions with `useToast`; format with `utils/format.js` (`formatMoney`, `formatDate`, `formatNumber`).
- Status words always go through `StatusBadge`. Titles and buttons are sentence case; buttons are verbs.
- Animations come from the classes in `index.css` (`animate-fade-up`, `animate-scale-in` ...). Do not add an animation library.
- Role checks in React only hide things. The real check is always in the backend.

## Git

- Small commits with clear messages ("Add customer sign-up API"). Work on a feature branch and open a pull request when the team asks for one; do not push to `main` without being asked.
- Before committing: `git status`, make sure no `.env`, `node_modules/` or `dist/` is staged.

## More detail

`docs/02_database_design.md` (tables, triggers, views, the bill formula) · `docs/03_api_reference.md` (every endpoint) · `docs/04_setup_guide.md` (setup + troubleshooting table) · `docs/checkpoints/` (demo scripts).
