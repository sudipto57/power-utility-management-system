# Power Utility Management System

A web app where an electricity company manages **customers, connections, meters, readings, bills, payments and complaints**, and where **customers log in** to see their own bills and send service requests.

Academic DBMS project, built by beginners as a simple and finishable full-stack project.

| Part | Technology | Folder |
| --- | --- | --- |
| Website | React + Vite + Tailwind CSS + Chart.js (+ React Router) | `frontend/` |
| API | Node.js + Express 5 + plain SQL (`pg`) | `backend/` |
| Database | PostgreSQL (Supabase or local) + pgAdmin 4 | `database/` |
| API tests | Postman collection + environment | `postman/` |
| Documents | Markdown docs | `docs/` |

## The 15 features

1. Login system · 2. Admin and Customer roles · 3. Main dashboard · 4. Customer management · 5. Customer profile ·
6. Electricity service (connection) management · 7. Meter information · 8. Meter reading entry · 9. Bill generation ·
10. Bill list · 11. Paid / Unpaid status · 12. Customer service requests · 13. Complaint management ·
14. Search & filter · 15. Reports

## Run it in 5 steps

> Full beginner guide with screenshots-in-words: **[docs/04_setup_guide.md](docs/04_setup_guide.md)**

**You need:** Node.js 22.12 or newer (Node 24 / 26 LTS recommended; Node 20.19+ also works), pgAdmin 4, and your Supabase project (or a local PostgreSQL).

1. **Database:** in pgAdmin, open the Query Tool on your database and run the files in `database/` in this order:
   `00_reset.sql` → `01_create_tables.sql` → `02_billing_tables.sql` → `03_functions_triggers_views.sql` → `04_sample_data.sql` → `07_supabase_security.sql` (Supabase only) → `09_account_security.sql` → `10_auto_save.sql` → `11_extra_features.sql` → `12_customer_inbox.sql` → `13_support_and_deletions.sql`.
   The backend does not start without `09`, `11`, `12` and `13`. Full table: [database/README.md](database/README.md).
2. **Backend settings:** copy `backend/.env.example` to `backend/.env` and fill in the same host / user / password that work in pgAdmin. `backend/.env` is secret and is never committed (`.gitignore` blocks it).
3. **Start the API** (terminal 1):
   ```bash
   cd backend
   npm install
   npm run db:test     # checks the database connection
   npm run dev         # http://localhost:5000/api/health
   ```
4. **Start the website** (terminal 2):
   ```bash
   cd frontend
   npm install
   npm run dev         # http://localhost:5173
   ```
5. **Log in** with a demo account:

| Role | Username | Password |
| --- | --- | --- |
| Admin (Admin tab) | `PUMSadmin` (or `admin@powerutility.com`) | the staff password (ask the team: it is shared privately, never written in GitHub). On a new database set it first: `cd backend && npm run staff:password` |
| Customer (Customer tab) | `sumaiya.khanam` (or `sumaiya_khanam1988@example.com`) | `customer123`, then the 4-digit code from the email (on your computer it is printed in the backend terminal) |

Other demo logins: `tech.john`, `billing.officer` (staff password) · `nayeem.sheikh`, `khadija.yasmin`, `rafiqul.islam`, `sohag.howlader`, `sadia.sultana`, `tapas.saha` (customer123).

## Folder map

```
power-utility-management-system/
├── frontend/            the website (pages, components, charts, API calls)        -> frontend/README.md
├── backend/             the API (routes -> controllers -> SQL)                     -> backend/README.md
├── database/            SQL files, run in number order                            -> database/README.md
├── docs/                overview, database design, API reference, setup, user guide, testing,
│                        checkpoints/ (demo scripts), data-collection/ (the survey), images/ + screenshots/
├── postman/             import both .json files into Postman                      -> postman/README.md
├── tools/               privacy-check.mjs (blocks real people's data and secrets) + its allowlist
├── .githooks/           pre-commit + pre-push hooks that run the privacy check
├── .github/workflows/   checks.yml: privacy check, lint and build on GitHub
├── Project Documents/   the team's blueprint, roadmap, tech stack guide, viva questions, survey and UI notes
├── CLAUDE.md            the team's rules for code, design and git (read it before changing anything)
├── .gitignore           keeps secrets (.env), node_modules/, dist/ and private survey answers out of git
├── .prettierrc.json
└── README.md
```

## Documentation

| Read this | For |
| --- | --- |
| [docs/01_project_overview.md](docs/01_project_overview.md) | What the system does, roles, where each feature lives |
| [docs/02_database_design.md](docs/02_database_design.md) | Tables, triggers, views and the bill formula |
| [docs/03_api_reference.md](docs/03_api_reference.md) | Every API endpoint |
| [docs/04_setup_guide.md](docs/04_setup_guide.md) | Step-by-step setup and a troubleshooting table |
| [docs/05_user_guide.md](docs/05_user_guide.md) | How to use each screen |
| [docs/06_testing_report.md](docs/06_testing_report.md) | What was tested and how |

## Check your work

```bash
cd frontend && npm run lint && npm run build     # must show no errors
cd backend  && npm run db:test                   # database reachable, 22 tables
```

Then run the Postman collection against the running backend (see [postman/README.md](postman/README.md)).

## Quality checks done (26 Nov 2026)

- Every SQL file (`00` → `13`, plus `05` and `06`) runs top to bottom on a fresh local PostgreSQL 16 database, and `09` → `13` run a second time without errors.
- The Postman collection (146 requests, 258 checks) passes against the API. The only 2 expected failures are *Save now* when `SAVE_CUSTOMERS_TO_SQL_FILE=false`.
- `npm ci`, `npm run lint` and `npm run build` in `frontend/` finish with **zero** errors and warnings; `npm ci` in `backend/` reports 0 vulnerabilities.
- Every page was opened in Chromium as admin and as customer with no console errors and no failed API calls.

See [docs/06_testing_report.md](docs/06_testing_report.md).

## Hosting

The live website and API run on Render (`power-utility-website` static site and `power-utility-api` web service) with the database on Supabase. On Render the settings from `backend/.env.example` are typed on the service's **Environment** page (with `NODE_ENV=production` and `SAVE_CUSTOMERS_TO_SQL_FILE=false`). The website needs `VITE_API_URL` set to the API address.

## Privacy: real people's data never goes to GitHub

- `database/04_sample_data.sql` holds only **made-up** people (CUST-001 … CUST-200, emails at `@example.com`).
- Real website sign-ups are copied by the backend into `database/private/website_customers.sql` on the laptop. `database/private/` is in `.gitignore`, so it is never committed. To bring the real customers back into a fresh database, run that file after `13_support_and_deletions.sql`.
- The staff password is never written in the repository, not even as a hash: `04_sample_data.sql` creates the staff logins **locked**. Set the password once with `cd backend && npm run staff:password`.
- **Automatic privacy check** (`tools/privacy-check.mjs`): it looks for real email addresses, mobile numbers, password hashes, `.env` files, keys and real customers in the sample data.
  - On your computer it runs before every **commit** and **push**. It is switched on by `npm install` in `backend/` (or by hand: `git config core.hooksPath .githooks`). If it stops you, remove what it found; never skip it with `--no-verify`.
  - On GitHub it runs for every push and pull request (`.github/workflows/checks.yml`, together with the lint and build checks).
  - Run it yourself any time: `node tools/privacy-check.mjs` (add `--history` to check every old version of every file).
  - Something it finds that is really not private (a made-up example)? Add the exact text to `tools/privacy-allowlist.txt` with a comment.
- Screenshots in `docs/` must not show real customers either: blur them before committing.

## Team

- Sudipto Pramanik (sudipto57): Team Member
- Apurba Das (apurbaByte04): Team Member
- Tasnim Khan Nova (tasnim56-ctrl): Team Member
