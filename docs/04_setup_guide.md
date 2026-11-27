# 4. Setup guide (Windows, step by step)

Follow the steps **in order**. Each step ends with a ✅ check, so don't move on until you see it.

---

## Step 0 · Tools (one time)

| Tool | Get it | Check |
| --- | --- | --- |
| **Node.js LTS** (22.12 or newer; 24 or 26 LTS recommended) | https://nodejs.org → "LTS" installer → Next, Next, Finish | open a **new** terminal: `node -v` shows v22.12+ |
| VS Code | https://code.visualstudio.com | |
| pgAdmin 4 | already installed | |
| Postman | https://www.postman.com/downloads | |
| Git (for GitHub) | https://git-scm.com | `git --version` |

> Close and reopen VS Code / terminals after installing Node, otherwise `npm` is "not recognized".

Open the **whole project folder** in VS Code: *File → Open Folder → `Power Utility Management System`* (the project folder keeps its old name; the app itself is called **Sparkility**).
You will use **two terminals** (*Terminal → New Terminal*, then the **+** button): one for the backend, one for the frontend.

---

## Step 1 · Database (Supabase)

You already connected Supabase to pgAdmin. We run the SQL files there.

1. In pgAdmin, open your Supabase server → **Databases → postgres** (Supabase's database is always called `postgres`).
2. Right-click **postgres → Query Tool**.
3. For each file below: click the **Open File** icon → choose the file → press **▶ Execute (F5)** → wait for "Query returned successfully".

| Order | File |
| --- | --- |
| 1 | `database/00_reset.sql` (removes the OLD tables you created before) |
| 2 | `database/01_create_tables.sql` |
| 3 | `database/02_billing_tables.sql` |
| 4 | `database/03_functions_triggers_views.sql` |
| 5 | `database/04_sample_data.sql` |
| 6 | `database/07_supabase_security.sql` |
| 7 | `database/09_account_security.sql` (email codes + profile change requests) |
| 8 | `database/10_auto_save.sql` (history of the laptop's copies into `04`, `customers_in_order` view) |
| 9 | `database/11_extra_features.sql` (activity log, statement, usage alerts, late fees, outage notices, meter replacement) |
| 10 | `database/12_customer_inbox.sql` (the customer inbox: messages and due reminders) |
| 11 | `database/13_support_and_deletions.sql` (the Support form + Delete permanently) |
| 12 | `database/14_profile_photos.sql` (customer profile pictures) |

*(Skip `05_roles_and_grants.sql` on Supabase. `06_report_queries.sql` is optional practice.)*

**Alternative:** Supabase dashboard → **SQL Editor** → **New query** → paste a file's text → **Run**, one file at a time, same order.

✅ **Check:** run `SELECT * FROM calculate_bill_amount('Residential', 'Single Phase', 250);`. The total should be **2095.80**.

**Already set up before?** Run **`11_extra_features.sql`**, **`12_customer_inbox.sql`**, **`13_support_and_deletions.sql`** and **`14_profile_photos.sql`** once (after 10). Also run **`10_auto_save.sql`** once, and **`09_account_security.sql`** again (it adds the tables for email codes and profile change requests, and the customer login codes). It is safe to run more than once. The backend will not start without it.

> "relation already exists" error? You skipped 00. Run `00_reset.sql`, then the files above from `01` again.

---

## Step 2 · Backend settings (`backend/.env`)

1. In VS Code, right-click `backend/.env.example` → **Copy**, right-click the `backend` folder → **Paste**, and rename the copy to **`.env`**.
   (Or in a terminal inside `backend`: `copy .env.example .env`)
2. Open pgAdmin → right-click your Supabase **server** → **Properties → Connection** tab. Copy these values into `.env`:

| pgAdmin field | `.env` line |
| --- | --- |
| Host name/address | `DB_HOST=` |
| Port | `DB_PORT=` |
| Maintenance database | `DB_NAME=postgres` |
| Username | `DB_USER=` |
| (your Supabase database password) | `DB_PASSWORD=` |
| | `DB_SSL=true` (always true for Supabase) |

3. Change `JWT_SECRET` to a long random text. Make one with:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
4. **Emails (optional on your computer).** Leave `BREVO_API_KEY` empty: confirmation codes, reset codes and bill emails are then **printed in the backend terminal**, so you can copy the code from there.
   To send real emails (needed on the live website):
   1. Make a free account at **brevo.com** (300 emails a day).
   2. **Senders, Domains & IPs → Senders → Add a sender** with your Gmail address, and click the link Brevo emails you.
   3. **SMTP & API → API Keys → Generate a new API key**. Put it in `BREVO_API_KEY=`, and your sender address in `EMAIL_FROM=`.
   4. `APP_URL=` is the website address used for the buttons in the emails (the Render website address when the site is live).
   5. `SUPPORT_EMAIL=pums.admins@gmail.com` is where new problems from the **Support** form are emailed (it is already in `.env.example`; add the same line on Render under **Environment**).

> `backend/.env` holds your passwords and keys. It is in `.gitignore`: **never** upload it to GitHub, and never paste real values into `.env.example`.

**Which host should I use?**

- **Session pooler** (recommended, works on every network): Supabase dashboard → **Connect** → **Session pooler** → *View parameters*. The host looks like `aws-0-<region>.pooler.supabase.com`, port `5432`, and the user looks like `postgres.<project-ref>` (with the dot!).
- **Direct connection** (`db.<project-ref>.supabase.co`) only works if your internet supports IPv6. If pgAdmin works with it, the backend will too.

> Passwords with special characters (`@ # % /`) are fine. Because the password has its own `DB_PASSWORD` line, nothing needs encoding.
> Forgot the password? Supabase → **Project Settings → Database → Reset database password**. Then update pgAdmin and `.env`.

---

## Step 3 · Start the backend

Terminal 1:

```bash
cd backend
npm install
npm run db:test
```

Then set the staff password (the staff logins are created **locked**, because the real password is never written in GitHub). Ask the team for it, then type it twice:

```bash
npm run staff:password
```

✅ **Check:** `Connected!` and `Tables found (22)`, then a row count of about 200 customers and 1,000+ bills (a few more if people signed up on the website).

```bash
npm run dev
```

✅ **Check:** the terminal shows `Running on http://localhost:5000/api`, and http://localhost:5000/api/health in the browser shows `"status":"ok"`.

Leave this terminal running.

---

## Step 4 · Start the website

Terminal 2:

```bash
cd frontend
npm install
npm run dev
```

✅ **Check:** open **http://localhost:5173**. Pick the **Admin** tab, type `PUMSadmin` / `<staff password>` → **Log in**. The dashboard appears with numbers and charts.

---

## Step 5 · Postman (optional but recommended)

Import both files in `postman/`, select the **Sparkility - Local** environment, and send **1. Auth → Login as Admin**. See `postman/README.md`.

---

## Every day after setup

```bash
# terminal 1
cd backend && npm run dev
# terminal 2
cd frontend && npm run dev
```

---

## Troubleshooting

| You see | Why | Fix |
| --- | --- | --- |
| `'npm' is not recognized` | Node.js not installed, or terminal opened before installing | Install Node LTS, close and reopen VS Code |
| `npm.ps1 cannot be loaded because running scripts is disabled` | PowerShell security setting | Run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or switch the terminal to **Command Prompt** (the ˅ next to +) |
| `Vite requires Node.js version 20.19+ or 22.12+` | Node too old | Install the current Node LTS |
| Sign-ups are not in `database/private/website_customers.sql` | The laptop was off or the auto-save job is not on | On the laptop, once: `cd backend && npm run auto-save:on` (starts with Windows, copies every 10 minutes). Check with `npm run auto-save:status` |
| `SELECT * FROM customers` shows CUST-201 first / numbers "missing" | Rows have no fixed order in PostgreSQL | `SELECT * FROM customers_in_order;` (or add `ORDER BY customer_number`) |
| `[setup] These settings are missing: DB_HOST ...` | Step 2 not done / file named `.env.txt` | Create `backend/.env` (turn on "File name extensions" in Explorer to see `.txt`). On Render: add the settings on the Environment page |
| `[database] ... tables for email codes and change requests are missing` | `09_account_security.sql` not run yet | Run it once in pgAdmin / Supabase SQL Editor |
| `[database] ... table for the customer inbox is missing` | `12_customer_inbox.sql` not run yet | Run it once in pgAdmin / Supabase SQL Editor |
| `[database] ... tables for Support and permanent deletes are missing` | `13_support_and_deletions.sql` not run yet | Run it once in pgAdmin / Supabase SQL Editor |
| `[database] ... table for profile pictures is missing` | `14_profile_photos.sql` not run yet | Run it once in pgAdmin / Supabase SQL Editor |
| `[database] The database is missing the newest change for customer login codes` | An older copy of `09_account_security.sql` was run | Run the newest `09_account_security.sql` again |
| No email arrives | `BREVO_API_KEY` / `EMAIL_FROM` empty or the sender not verified in Brevo | Without a key the email is printed in the backend terminal. With a key, check Brevo → Transactional → Logs |
| `[setup] backend/.env still has the example values` | Example values left in `.env` | Put your real DB_USER / DB_PASSWORD |
| `password authentication failed` | Wrong user/password | Copy them from pgAdmin; pooler user is `postgres.<project-ref>` |
| `Tenant or user not found` | Pooler host with user `postgres` | Use `postgres.<project-ref>` as DB_USER |
| `ENOTFOUND` | Host name typo or no internet | Copy the host again |
| `ENETUNREACH` / `EHOSTUNREACH` / timeout with `db.xxx.supabase.co` | Your network has no IPv6 | Use the **Session pooler** host |
| `connection timeout` everywhere | Supabase project **paused** (free projects pause when unused) | Supabase dashboard → **Restore project**, wait ~1 min |
| `self-signed certificate` / SSL errors | SSL setting | Supabase: `DB_SSL=true`. Local PostgreSQL: `DB_SSL=false` |
| `Connected, but the project tables/functions are missing` | SQL files not run on this database | Do Step 1 (on the `postgres` database) |
| `Port 5000 is already in use` | The backend is already running in another terminal | Close the other terminal (Ctrl + C) or change `PORT` |
| Website says **"Cannot reach the server"** | Backend not running | Start it (Step 3) |
| Login says **"Wrong email/username or password"** | Sample data not loaded, staff password not set, or typo | Run `04_sample_data.sql`, then `npm run staff:password` in `backend`; demo logins are `PUMSadmin` / `<staff password>` (Admin tab) and `sumaiya.khanam` / `customer123` (Customer tab) |
| Website blank / errors after changing `.env` | Vite reads `.env` only at start | Stop (Ctrl + C) and `npm run dev` again |
| Opened `http://127.0.0.1:5173` and requests fail | The API only allows `localhost:5173` | Use **http://localhost:5173** or add it to `CLIENT_URL` |

### Using a local PostgreSQL instead of Supabase

Create a database `power_utility_db` in pgAdmin, run the same SQL files (skip 07), and set:
`DB_HOST=localhost`, `DB_PORT=5432`, `DB_NAME=power_utility_db`, `DB_USER=postgres`, `DB_PASSWORD=<your local password>`, `DB_SSL=false`.
