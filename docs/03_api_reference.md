# 3. API reference

Base URL: `http://localhost:5000/api`

- Send JSON bodies with the header `Content-Type: application/json`.
- Protected endpoints need `Authorization: Bearer <token>` (the token comes from **POST /auth/login**).
- Success → `{ "data": ... }`. Error → `{ "message": "..." }` (+ sometimes `"code"`).

| Status | Meaning |
| --- | --- |
| 200 / 201 | OK / created |
| 400 | Something in the request is wrong (the message says what) |
| 401 | Not logged in, or the token expired |
| 403 | Logged in, but your role is not allowed |
| 404 | Not found (also used when a customer asks for someone else's bill) |
| 409 | Conflict: duplicate value, already paid, already billed, customer has bills |
| 500 | Server problem: look at the backend terminal |

## Health

| Method | URL | Who | What |
| --- | --- | --- | --- |
| GET | `/health` | everyone | API + database check |

## Auth (features 1, 2)

| Method | URL | Who | Body / query | Answer |
| --- | --- | --- | --- | --- |
| POST | `/auth/login` | everyone | `{ "login": "PUMSadmin", "password": "<staff password>", "role": "admin" }` (email or username; `role` = `admin` or `customer`, optional) | **Admin:** `{ token, user }`. **Customer:** `{ needs_code: true, email: "s*****8@gmail.com", expires_at, email_sent }` and an 8-digit code is emailed (like GitHub). **403 `EMAIL_NOT_CONFIRMED`** for a customer who has not confirmed the sign up email yet |
| POST | `/auth/verify-login` | customers | `{ "login": "email or username", "code": "12345678" }` | `{ token, user }` (step 2 of a customer login) |
| POST | `/auth/signup` | everyone (creates **customers only**) | `{ "full_name", "email", "phone", "address", "customer_type": "Residential", "username", "password" }` (password: 8+ characters with a letter and a number) | `{ needs_confirmation: true, email, email_sent }` - an 8-digit code is emailed, no login yet |
| POST | `/auth/confirm-email` | everyone | `{ "login": "email or username", "code": "12345678" }` | `{ token, user }` (email confirmed, logged in) |
| POST | `/auth/resend-code` | everyone | `{ "login" }` | always the same message (429 if asked again within a minute) |
| POST | `/auth/forgot-password` | everyone (customers) | `{ "login": "email, username or phone" }` | always the same message; the code goes to the account's email |
| POST | `/auth/reset-password` | everyone (customers) | `{ "login", "code", "password" }` | new password saved; every old login token stops working |
| GET | `/auth/me` | logged in | | the current user |

**Codes:** 8 digits, work for 15 minutes, used once, 5 wrong tries, stored only as a SHA-256 hash (table `account_codes`, purpose `login` / `confirm_email` / `reset_password`). Logging in again within a minute does not send a second email; the same code still works.
**Limits per visitor (IP):** login 20 / 15 min, sign up 10 / hour, typing a code 15 / 15 min, asking for an email 5 / 15 min → `429 "Too many tries"`.

**Role Based Login:** when `role` is sent, the account must have that role, otherwise the answer is `403` ("This is an admin account. Switch to the Admin tab to log in."). Sign up always creates a `customer` login + customer profile; admin accounts are never created here.

## Bill estimator - public (no login)

| Method | URL | Query | Answer |
| --- | --- | --- | --- |
| GET | `/tariffs/estimate` | `customer_type` (Residential / Commercial), `connection_type` (Single Phase / Three Phase), `units` (0 - 100000) | `{ units, slabs: [{ slab_order, start_unit, end_unit, rate_per_unit, units, amount }], fixed_charge, variable_charge, tax_amount, total_amount }` — totals from `calculate_bill_amount()` |
| POST | `/feedback` | `{ "rating": 1-5, "topic": "Website design" / "Bills and payments" / "Login and account" / "Service requests" / "New idea" / "Other", "message": "10-2000 chars", "name"?, "email"? }` (public, 5 per hour per visitor) | `201 { message }`; the message is emailed to `FEEDBACK_EMAIL` (or `EMAIL_FROM`), nothing is saved in the database. `503` if email is not set up |

## Dashboard (feature 3) - admin

| Method | URL | Answer |
| --- | --- | --- |
| GET | `/dashboard/stats` | totals (customers, active services, unpaid bills, open complaints, outstanding, collected this month), `monthly` (6 months billed vs collected), `bill_status` |
| GET | `/dashboard/recent-activity` | latest 10 bills, payments, requests, readings, customers |

## Customers (features 4, 5, 14) - admin

| Method | URL | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/customers` | `?search=&status=Active&type=Residential` | search: number, name, phone, email, address |
| GET | `/customers/:id` | | profile + connections + bills + requests |
| POST | `/customers` | `full_name, phone, email, address, customer_type, status` + optional `create_login: true, username, password` | number CUST-### is generated |
| PUT | `/customers/:id` | any of the fields above | send only what changes; the linked login is kept in sync |
| DELETE | `/customers/:id` | | **409 `HAS_BILLS`** if the customer has bills → set status Inactive instead |
| GET | `/customers/sql-file` | | website sign-ups vs. `database/04_sample_data.sql`: `customers_in_database`, `customers_in_file`, `waiting`, `last_saved`, `computer`, `found` (file on this server), `auto_save`. On Render the numbers come from the last laptop copy (`sql_file_saves`) |
| POST | `/customers/sql-file` | | **Save now** (laptop only): copies every customer after CUST-200 (with login and meters) into `04_sample_data.sql`; **409** on a server without the file (Render) |

## Connections & meters (features 6, 7, 14) - admin

| Method | URL | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/connections` | `?search=&status=&type=&customer_id=` | includes last reading |
| GET | `/connections/:id` | | + readings + bills + `replacements` (meter replacement history) |
| POST | `/connections` | `customer_id, meter_number (empty = auto MET-####), connection_type, installation_date, status, notes` | |
| PUT | `/connections/:id` | any of `meter_number, connection_type, installation_date, status, notes` | |
| GET | `/connections/:id/last-reading` | | `{ previous_reading, last_reading_date, is_first_reading }` (after a meter replacement: the new meter's start reading) |
| POST | `/connections/:id/replace-meter` | `new_meter_number` (empty = auto MET-####), `old_meter_final_reading`, `new_meter_start_reading` (default 0), `replaced_on`, `reason` | **New (file 11).** Saves the old meter's final reading, keeps the history, puts the new number on the connection (`replace_meter()`). **400** if the date is not after the last reading or the final reading is too low |

## Meter readings (feature 8) - admin

| Method | URL | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/readings` | `?connection_id=&search=&billed=yes|no` | `billed=no` = waiting for a bill |
| POST | `/readings` | `connection_id, current_reading, reading_date, notes` (+ `previous_reading` only for a meter's first reading) | previous = last verified reading; date must be after it and not in the future; connection must be Active. The answer has `unusual` (`{ alert, times_usual }` or null) |
| GET | `/readings/unusual` | `?alert=Very high\|Very low` | **New (file 11).** Usage alerts: use per day more than 2× or less than ⅓ of the meter's last 3 readings (view `unusual_readings`), with the bill if there is one |

## Bills & payments (features 9, 10, 11, 14) - admin

| Method | URL | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/bills` | `?search=&status=Overdue&customer_id=` | runs `check_overdue_bills()` first |
| GET | `/bills/:id` | | + reading, payments, adjustments, `late_fee`, `waived`, `amount_due`, paid amount, balance (from the view `bill_balance`) |
| POST | `/bills/preview` | `{ "reading_id": "..." }` | calculates, saves nothing |
| POST | `/bills/generate` | `{ "reading_id": "...", "due_date": "2026-11-25" }` | due date optional (today + 20); **409** if already billed |
| POST | `/bills/:id/mark-paid` | `{ "method": "Cash", "reference": "", "payment_date": "" }` (all optional) | records a payment for the balance → status Paid; **409** if already paid |
| POST | `/bills/:id/mark-unpaid` | | deletes the payments → Unpaid / Overdue |
| POST | `/bills/:id/waive-late-fee` | `{ "reason": "..." }` | **New (file 11).** Cancels the 5% late fee (a `Waiver` row in `bill_adjustments`). **409** if the bill has no late fee or it is already waived |

## Complaint management (feature 13) - admin

| Method | URL | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/requests` | `?search=&status=&priority=&category=` | open + urgent first |
| GET | `/requests/staff` | | admin users for the "Assigned to" list |
| GET | `/requests/:id` | | + comments |
| PATCH | `/requests/:id/status` | `status` + optional `priority, assigned_to, resolution_notes` | Resolved needs a resolution note; adds a "Status changed" comment |
| POST | `/requests/:id/comments` | `{ "comment": "..." }` | |

## Reports (feature 15) - admin

| Method | URL | Answer |
| --- | --- | --- |
| GET | `/reports/customers` | by type, by status, connections by type, top 5 customers (view) |
| GET | `/reports/bills` | totals, billed per month, by status |
| GET | `/reports/payments` | totals, collected per month, by method, latest 10 |
| GET | `/customers/:id/statement` | **New (file 11).** Account statement: `{ customer, lines, total_charged, total_paid, balance }`; each line has date, type (Bill / Late fee / Late fee waived / Payment), reference, debit, credit and the running balance (view `customer_statement`) |

## Activity log and outage notices (file 11)

| Method | URL | Who | Body / query | Notes |
| --- | --- | --- | --- | --- |
| GET | `/activity` | admin | `?table=bills&action=UPDATE&search=BILL-2026-013&limit=200` (limit 1-500) | Who changed what and when (table `audit_log`, filled by the trigger `log_change()`). `search` = a bill / customer / meter / payment / request number, or the name of who made the change |
| GET | `/outages/current` | logged in | | Outage notices that have not ended yet (state `Planned` or `Happening now`), for the news strip |
| GET | `/outages` | admin | | Every notice, with state `Planned` / `Happening now` / `Ended` |
| POST | `/outages` | admin | `{ "title", "area", "starts_at", "ends_at", "details" }` (times as ISO, e.g. `2026-11-25T04:00:00.000Z`) | **400** if the end is not after the start |
| PUT | `/outages/:id` | admin | same as POST | |
| DELETE | `/outages/:id` | admin | | |

## Customer portal (features 3, 5, 10, 11, 12) - customer

Every query uses the customer id inside the login token, so a customer only ever sees their own data.

| Method | URL | Body | Answer |
| --- | --- | --- | --- |
| GET | `/my/profile` | | profile + connections |
| GET | `/my/dashboard` | | amount due, overdue, open requests, latest bill, kWh per month |
| GET | `/my/bills` | `?status=` | own bills |
| GET | `/my/bills/:id` | | one own bill (404 for other people's bills) |
| GET | `/my/statement` | | own account statement (same shape as `/customers/:id/statement`) |
| GET | `/my/requests` | | own requests |
| GET | `/my/requests/:id` | | one own request + updates |
| POST | `/my/requests` | `{ "category": "Power Outage", "priority": "High", "description": "..." }` | new request (Pending) |
| PUT | `/my/profile` | `{ "full_name", "address" }` | saved straight away (email / phone / type here → 400) |
| GET | `/my/change-requests` | | own profile change requests + the office's answer |
| POST | `/my/change-requests` | `{ "field": "email" \| "phone" \| "customer_type" \| "connection_type", "new_value", "connection_id" (only for connection_type), "reason" }` | new request (Pending); 409 if one is already waiting for the same thing |

## Profile change requests - admin

| Method | URL | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/change-requests` | `?status=Pending` (or Approved / Rejected) | waiting ones first |
| POST | `/change-requests/:id/approve` | `{ "note" }` (optional) | makes the change + marks Approved (one transaction), emails the customer |
| POST | `/change-requests/:id/reject` | `{ "note" }` (optional, shown to the customer) | marks Rejected, emails the customer |

**Emails:** a new bill (`POST /bills/generate`, answer has `email_sent`), codes and change answers are emailed through Brevo. Without `BREVO_API_KEY` they are printed in the backend terminal.

## Allowed values

| Field | Values |
| --- | --- |
| customer_type | Residential, Commercial |
| customer / login status | Active, Inactive |
| connection_type | Single Phase, Three Phase |
| connection status | Active, Inactive, Disconnected |
| bill status | Unpaid, Partially Paid, Paid, Overdue |
| payment method | Cash, Bank Transfer, Mobile Banking, Cheque, Card, Other |
| request category | Power Outage, Meter Issue, Connection Issue, Billing Inquiry, General Complaint, New Connection Request, Disconnection Request |
| request priority | Low, Medium, High, Critical |
| request status | Pending, In Progress, Resolved, Cancelled |
