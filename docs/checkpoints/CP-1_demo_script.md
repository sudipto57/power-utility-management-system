# CP-1 live demo script (about 5 minutes)

CP-1 checks: working setup · basic frontend structure · main pages · navigation · basic database/backend · some initial functionality.

## Before the demo (10 minutes earlier)

- [ ] Supabase project is awake (open the Supabase dashboard once)
- [ ] Fresh data: run `database/00_reset.sql` → `04_sample_data.sql` → `07_supabase_security.sql`
- [ ] Terminal 1: `cd backend` → `npm run dev` (shows *Running on http://localhost:5000/api*)
- [ ] Terminal 2: `cd frontend` → `npm run dev`
- [ ] Browser tabs: http://localhost:5173 · http://localhost:5000/api/health · pgAdmin Query Tool

## The demo

| # | Show | Say | Proves |
| --- | --- | --- | --- |
| 1 | VS Code folder tree: `frontend/ backend/ database/ docs/ postman/` | "React website, Express API, PostgreSQL on Supabase." | Setup, structure |
| 2 | `/api/health` tab | "The API is up and talking to the database." | Backend + database |
| 3 | Login page → **Admin demo** → Log in | "Passwords are bcrypt-hashed; login returns a JWT token; roles decide the menu." | Features 1, 2 |
| 4 | Dashboard | "Live numbers and charts come from SQL queries." | Feature 3 |
| 5 | Click through the sidebar: Customers, Connections, Readings, Bills, Complaints, Reports | | Main pages, navigation |
| 6 | Customers → search "green" → **Add customer** (tick *Create a login*) → profile opens | "CUST number is generated; customer + login saved in one transaction." | Feature 4, 5, 14 |
| 7 | pgAdmin: `SELECT * FROM customers ORDER BY created_at DESC LIMIT 1;` | "Here it is in the database." | Real data |
| 8 | Profile → **Add connection** → **Enter reading** → **Generate bill** → **Mark paid** | "Bill amounts come from our PL/pgSQL function; the payment trigger sets Paid." | Features 6–11 |
| 9 | Log out → **Customer demo** → My bills, New request | "Customers only see their own data." | Roles |

## If something goes wrong

- Website says *Cannot reach the server* → the backend terminal stopped; run `npm run dev` again.
- Login fails → re-run `04_sample_data.sql`.
- See `docs/04_setup_guide.md` → Troubleshooting.
