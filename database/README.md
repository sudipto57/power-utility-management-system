# Database folder

PostgreSQL scripts for the Power Utility Management System. They work on **Supabase** and on a **local PostgreSQL** (pgAdmin 4).

**The tables are exactly the team's original schema.** No table or column was added, removed or renamed. Only functions, views and sample data were fixed.

## Run order (pgAdmin → right-click your database → Query Tool → open file → ▶ Execute)

| # | File | What it does | Where |
| --- | --- | --- | --- |
| 00 | `00_reset.sql` | Deletes this project's tables, views and functions so you can start clean. Keeps Supabase's `public` schema. | Both |
| 01 | `01_create_tables.sql` | 8 core tables, indexes, `updated_at` triggers (original schema) | Both |
| 02 | `02_billing_tables.sql` | Tariffs + tariff slabs (+ 3 "later" tables) (original schema) | Both |
| 03 | `03_functions_triggers_views.sql` | Reading-sequence trigger, bill-status trigger, overdue function, 2 views, **fixed bill calculator** | Both |
| 04 | `04_sample_data.sql` | Demo users, customers, meters, readings, **calculated** bills, payments, requests | Both |
| 05 | `05_roles_and_grants.sql` | Optional extra login roles (`power_app` ...). Change passwords first | **Local only** (skip on Supabase) |
| 06 | `06_report_queries.sql` | SELECT-only practice queries behind the Dashboard and Reports | Both (optional) |
| 07 | `07_supabase_security.sql` | Turns on Row Level Security so Supabase's public API cannot read your tables | **Supabase only** |

Run each file once, top to bottom. If anything fails halfway, run `00_reset.sql` and start again from `01`.

## The 8 fixes

| # | Problem in the old files | Fix |
| --- | --- | --- |
| 1 | Sample bill amounts did not match the readings or the bill function | Bills in `04` are calculated with `calculate_bill_amount()` from the readings |
| 2 | First slab "0-50" counted 51 units | Slab sizes are now 50, 50, 100, 300 ... |
| 3 | Rates picked by connection type only, hard-coded, no VAT | Function reads `tariffs` + `tariff_slabs` by customer type **and** connection type and adds VAT |
| 4 | All demo users had the same password hash | Real bcrypt hashes: staff = `admin123`, customers = `customer123` |
| 5 | Users and customers point at each other twice | Kept both columns (schema unchanged); the backend keeps them in sync |
| 6 | Deleting a customer erased their bills | The API refuses and offers "Deactivate" instead |
| 7 | `check_overdue_bills()` was never called | The API calls it before showing bills and the dashboard |
| 8 | Old short project name in e-mails and role names | `@powerutility.com`, roles `power_app` / `power_readonly` / `power_admin` |

Also fixed: the `customer_billing_summary` view counted a bill twice when it had two payments.

## Try the bill calculator

```sql
SELECT * FROM calculate_bill_amount('Residential', 'Single Phase', 250);
-- fixed 150.00 | variable 1175.00 | tax 212.00 | total 1537.00
```

250 kWh residential = 50 × 2.50 + 50 × 3.50 + 100 × 5.00 + 50 × 7.50 = 1,175 → + 150 fixed = 1,325 → + 16 % VAT (212) = **1,537.00**

## Demo logins created by 04

| Username | Password | Role |
| --- | --- | --- |
| admin, tech.john, billing.officer | admin123 | admin |
| john.kamau, jane.wanjiku, peter.ochieng, mary.akinyi | customer123 | customer |

## Old files

Your original files (`01_create_tables.sql` … `05_grants.sql`) were replaced by this set. The table definitions in `01` and `02` are copied unchanged from them.
