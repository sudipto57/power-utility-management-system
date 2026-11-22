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

**You need:** Node.js 22.12 or newer (Node 24 / 26 LTS recommended), pgAdmin 4, and your Supabase project (or a local PostgreSQL).

1. **Database:** in pgAdmin, open the Query Tool on your database and run the files in `database/` in this order:
   `00_reset.sql` → `01_create_tables.sql` → `02_billing_tables.sql` → `03_functions_triggers_views.sql` → `04_sample_data.sql` → `07_supabase_security.sql` (Supabase only) → `09_account_security.sql` → `10_auto_save.sql` → `11_extra_features.sql`.
   The backend does not start without `09` and `11`. Full table: [database/README.md](database/README.md).
2. **Backend settings:** copy `backend/.env.example` to `backend/.env` and fill in the same host / user / password that work in pgAdmin.
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
| Admin (Admin tab) | `PUMSadmin` (or `admin@powerutility.com`) | the staff password (ask the team: it is shared privately, never written in GitHub) |
| Customer (Customer tab) | `sumaiya.khanam` (or `sumaiya_khanam1988@example.com`) | `customer123`, then the 8-digit code from the email (on your computer it is printed in the backend terminal) |

Other demo logins: `tech.john`, `billing.officer` (staff password) · `nayeem.sheikh`, `khadija.yasmin`, `rafiqul.islam`, `sohag.howlader`, `sadia.sultana`, `tapas.saha` (customer123).

## Folder map

```
Power Utility Management System/
├── frontend/     the website (pages, components, charts, API calls)
├── backend/      the API (routes -> controllers -> SQL)
├── database/     SQL files, run in number order
├── docs/         overview, database design, API reference, setup, user guide, testing
├── postman/      import both files into Postman
├── .gitignore
├── .prettierrc.json
└── README.md
```

## Quality checks done

- Every SQL file runs top to bottom on a fresh database, twice in a row.
- The Postman collection (105 requests, 190 checks) passes against the API.
- The frontend builds and lints with **zero** errors and warnings, and every page was opened in Chrome with no runtime errors.

See [docs/06_testing_report.md](docs/06_testing_report.md).
## Team
- Apurba Das (apurbaByte04): Team Member
- Tasnim Khan Nova (tasnim56-ctrl): Team Member
