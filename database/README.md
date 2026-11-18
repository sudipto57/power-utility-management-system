# Database folder

PostgreSQL scripts for the Power Utility Management System. They work on **Supabase** and on a **local PostgreSQL** (pgAdmin 4).

**The original tables are exactly the team's schema.** No table or column was added, removed or renamed in them. Only functions, views, rules (constraints), indexes and sample data were fixed.
For the account features the team asked for (email confirmation, forgot password, the customer login code, profile change requests), `09_account_security.sql` **adds two new tables**: `account_codes` and `profile_change_requests`.

## Run order (pgAdmin → right-click your database → Query Tool → open file → ▶ Execute)

| # | File | What it does | Where |
| --- | --- | --- | --- |
| 00 | `00_reset.sql` | Deletes this project's tables, views and functions so you can start clean. Keeps Supabase's `public` schema. | Both |
| 01 | `01_create_tables.sql` | 8 core tables, indexes, `updated_at` triggers (original schema) | Both |
| 02 | `02_billing_tables.sql` | Tariffs + tariff slabs (+ 3 "later" tables) (original schema) | Both |
| 03 | `03_functions_triggers_views.sql` | Reading-sequence trigger, bill-status trigger, overdue function, 2 views, **fixed bill calculator**, plus the November 2026 fixes (rules, indexes) | Both |
| 04 | `04_sample_data.sql` | **Deletes all data**, then loads Bangladesh tariffs, 3 staff + 7 customer logins, 200 survey-based customers and meters, 6 months of readings, **calculated** bills, payments, requests | Both |
| 05 | `05_roles_and_grants.sql` | Optional extra login roles (`power_app` ...). Change passwords first | **Local only** (skip on Supabase) |
| 06 | `06_report_queries.sql` | SELECT-only practice queries behind the Dashboard and Reports | Both (optional) |
| 07 | `07_supabase_security.sql` | Turns on Row Level Security, blocks the public API from our tables **and functions**, removes unused login roles | **Supabase only** |
| 08 | `08_update_existing_database.sql` | Only for a database built **before 17 Nov 2026**: adds the fixes from 03 and 07 without rebuilding. Then run `04`. | Both (old databases only) |
| 09 | `09_account_security.sql` | **New (18 Nov 2026).** Adds `account_codes` (email codes, stored as hashes) and `profile_change_requests`, protects them on Supabase, and on an existing database changes the admin login to `PUMSadmin` and the sample customers' emails to `@example.com` | Both (**every** database, last) |

Run each file once, top to bottom. If anything fails halfway, run `00_reset.sql` and start again from `01`.

**Already have the old database?** Run `08_update_existing_database.sql`, then `04_sample_data.sql`. (Our Supabase project was updated this way on 17 Nov 2026.)
**Then run `09_account_security.sql`** (Supabase → SQL Editor → paste → Run). The backend will not start without it.
**Ran it before 18 Nov 2026, 5 PM? Run it once more:** the newer copy lets `account_codes` store the customer **login codes**. Running it again is safe: it never undoes a password you changed yourself.

## The 8 fixes

| # | Problem in the old files | Fix |
| --- | --- | --- |
| 1 | Sample bill amounts did not match the readings or the bill function | Bills in `04` are calculated with `calculate_bill_amount()` from the readings |
| 2 | First slab "0-50" counted 51 units | Each slab now counts exactly its own units (0-75 = 75 units, 76-200 = 125 units ...) |
| 3 | Rates picked by connection type only, hard-coded, no VAT | Function reads `tariffs` + `tariff_slabs` by customer type **and** connection type and adds VAT |
| 4 | All demo users had the same password hash | Real bcrypt hashes: staff = `<staff password>` (was `admin123`, which was public), customers = `customer123` |
| 5 | Users and customers point at each other twice | Kept both columns (schema unchanged); the backend keeps them in sync |
| 6 | Deleting a customer erased their bills | The API refuses and offers "Deactivate" instead |
| 7 | `check_overdue_bills()` was never called | The API calls it before showing bills and the dashboard |
| 8 | Old short project name in e-mails and role names | `@powerutility.com`, roles `power_app` / `power_readonly` / `power_admin` (local PostgreSQL only) |

Also fixed: the `customer_billing_summary` view counted a bill twice when it had two payments.

## November 2026 fixes (from a full check of the Supabase project)

| # | Problem found | Fix | File |
| --- | --- | --- | --- |
| 9 | Tariffs were Kenyan (16 % VAT) | Bangladesh BERC tariff of June 2026, 5 % VAT | 04 (+ default in 03/08) |
| 10 | `users.customer_id` could point at a customer that does not exist | Foreign key to `customers` | 03 / 08 |
| 11 | Two readings on the same day, or two bills for the same period, were possible | `UNIQUE` rules `meter_readings_one_per_day`, `bills_one_per_period`, `tariff_slabs_order_unique` | 03 / 08 |
| 12 | Negative amounts, VAT over 100 %, or a due date before the period end were allowed | `CHECK` rules on bills, tariffs and slabs | 03 / 08 |
| 13 | A late bill went back to "Unpaid" (not "Overdue") when a payment was deleted; moving a payment to another bill left the old bill's status wrong | `update_bill_status()` rewritten | 03 / 08 |
| 14 | 8 foreign keys had no index (slow joins) and 3 indexes were exact copies | 8 indexes added, 3 copies removed | 03 / 08 |
| 15 | Our 5 functions had a changeable `search_path` (Supabase Security Advisor warning) | Fixed `search_path = public, pg_temp` | 03 / 08 |
| 16 | Anyone with the public Supabase key could call our functions, including `check_overdue_bills()` and Supabase's `rls_auto_enable()` | `EXECUTE` removed from `anon` / `authenticated` | 07 / 08 |
| 17 | Six unused login roles (`power_*` and three with the old short project name) could read and delete every table on Supabase | Removed (the backend logs in as `postgres`) | 07 / 08 |

The backend's error messages for the new rules are in `backend/src/middleware/errorHandler.js`.

## Try the bill calculator

```sql
SELECT * FROM calculate_bill_amount('Residential', 'Single Phase', 250);
-- fixed 84.00 | variable 1912.00 | tax 99.80 | total 2095.80
```

250 kWh residential = 75 × 5.26 + 125 × 8.50 + 50 × 9.10 = 394.50 + 1,062.50 + 455.00 = 1,912.00 → + 84 fixed = 1,996.00 → + 5 % VAT (99.80) = **2,095.80**

| Tariff (Tk) | Fixed charge | Energy rate | VAT |
| --- | --- | --- | --- |
| Residential single / three phase | 84 / 252 (Tk 42 per kW × 2 kW / 6 kW) | 0-75 = 5.26, 76-200 = 8.50, 201-300 = 9.10, 301-400 = 9.62, 401-600 = 15.01, 600+ = 17.35 | 5 % |
| Commercial single / three phase (shops, factories, farms) | 270 / 900 (Tk 90 per kW × 3 kW / 10 kW) | 15.36 per unit (flat) | 5 % |

Source: BERC retail tariff order, June 2026. Real irrigation (Tk 6.04) and industrial time-of-day rates need extra tariff types, so farms and factories use the commercial tariff here.

## Demo logins created by 04

| Username | Password | Role |
| --- | --- | --- |
| PUMSadmin, tech.john, billing.officer | <staff password> | admin |
| sumaiya.khanam (CUST-011, has an Overdue bill), nayeem.sheikh, khadija.yasmin (prepaid), rafiqul.islam (shop), sohag.howlader (farm), sadia.sultana (factory), tapas.saha | customer123 | customer |

The 200 sample customers are made-up people built from the electricity survey (see `docs/data-collection/Survey_Sample_Data_200.xlsx`). No real respondent's name, phone, email or meter number is used.

## Website sign-ups are copied into 04 (18 Nov 2026)

Everybody who signs up on the website (and every customer an admin adds) is saved **in the live database first**, like before. The backend then copies them into a marked part at the **end of `04_sample_data.sql`**:

```sql
-- >>> WEBSITE CUSTOMERS START (written by the backend, do not edit by hand) >>>
-- 11. Customers who joined after the sample data ...
INSERT INTO customers (...) VALUES ('CUST-201', ...);
INSERT INTO users (...) VALUES (...);      -- the login, password only as a bcrypt hash
INSERT INTO connections (...) ...;         -- their meters, if an admin added any
-- <<< WEBSITE CUSTOMERS END <<<
```

- It happens about one second after a sign-up, an email confirmation, or any change to customers, meters or profiles, and once when the backend starts. Only that marked part is rewritten; the rest of the file is never touched.
- A login is added after the customer confirms the email code (before that, only the customer row is there).
- So running `04_sample_data.sql` again brings the sample data **and** the real sign-ups back.
- Readings, bills and payments of new customers stay only in the database (they are not copied).
- Admin → **Customers** shows a strip with "N new customers · also copied into database/04_sample_data.sql" and a **Save now** button.
- The live website (Render) has no copy of your project folder. There, set `SAVE_CUSTOMERS_TO_SQL_FILE=false` and, on your computer, run `cd backend && npm run db:save-customers` to pull the sign-ups from Supabase into the file.
- The code is in `backend/src/utils/saveCustomersToSql.js`.

## Old files

Your original files (`01_create_tables.sql` … `05_grants.sql`) were replaced by this set. The table definitions in `01` and `02` are copied unchanged from them.
