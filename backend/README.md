# Backend (API)

Node.js + Express 5 + PostgreSQL (`pg`, plain SQL). Runs on **http://localhost:5000/api**.

## Start

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env   -> then fill in your values
npm run db:test           # checks the database connection and lists the tables
npm run dev               # starts the API and restarts it when you save a file
```

Open http://localhost:5000/api/health: `"status": "ok"` means the API and the database are working.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start with auto-restart (`node --watch`) |
| `npm start` | Start normally |
| `npm run db:test` | Test `.env` + database connection, nothing else |
| `npm run hash -- myPassword` | Print a bcrypt hash (to reset a password in pgAdmin) |
| `npm run db:save-customers` | Copy website sign-ups from the database into `database/04_sample_data.sql` once |
| `npm run auto-save:on` / `:off` / `:status` | The laptop's background copy of sign-ups (Windows, every 10 minutes) |

## How the code is organised

```
src/
├── config/        env.js (reads .env), db.js (connection pool + friendly connection tips)
├── middleware/    auth.js (checks the token), requireRole.js (admin/customer), errorHandler.js,
│                  security.js (safety headers + limits on login/code attempts)
├── routes/        one file per URL group: which URL -> which controller function
├── controllers/   the work: validate input, run SQL, send JSON
├── utils/         ApiError, validate.js + countries.js (input rules), constants.js (allowed values),
│                  generateNumber.js (CUST-009 ...), email.js (Brevo emails), notify.js (customer inbox),
│                  saveCustomersToSql.js (copies sign-ups into database/04_sample_data.sql)
├── app.js         builds the Express app
└── server.js      checks the database, then starts listening
```

Settings come from `backend/.env` (copy `.env.example`; never commit `.env`). On Render they are typed on the service's Environment page.

Request flow: **route → requireAuth → requireRole → controller → SQL → `{ "data": ... }`**.
Errors always come back as `{ "message": "..." }` with a proper status code (400, 401, 403, 404, 409, 500).

All endpoints are listed in [../docs/03_api_reference.md](../docs/03_api_reference.md).
