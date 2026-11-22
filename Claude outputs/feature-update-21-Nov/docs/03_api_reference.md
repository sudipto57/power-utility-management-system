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
| GET | `/dashboard/stats` | totals (customers, active services, unpaid bills, open complaints, outstanding, collected this month, `pending_readings` sent by customers, `pending_payments` paid online), `monthly` (6 months billed vs collected), `bill_status` |
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
| GET | `/connections/:id` | | + readings + bills |
| POST | `/connections` | `customer_id, meter_number (empty = auto MET-####), connection_type, installation_date, status, notes` | |
| PUT | `/connections/:id` | any of `meter_number, connection_type, installation_date, status, notes` | |
| GET | `/connections/:id/last-reading` | | `{ previous_reading, last_reading_date, is_first_reading }` |

## Meter readings (feature 8) - admin

| Method | URL | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/readings` | `?connection_id=&search=&billed=yes|no&status=Pending` | `billed=no` = waiting for a bill; `status=Pending` = readings customers sent (`recorded_by_role: customer`) |
| POST | `/readings` | `connection_id, current_reading, reading_date, notes` (+ `previous_reading` only for a meter's first reading) | previous = last verified reading; date must be after it and not in the future; connection must be Active; **409** if a customer reading for that day is waiting |
| POST | `/readings/:id/verify` | | a customer's Pending reading → Verified (previous = last verified reading), can be billed now; inbox message to the customer; **409** if not Pending, **400** if a newer reading is verified or the number is lower |
| POST | `/readings/:id/reject` | `{ "note" }` (optional, shown to the customer) | Pending → Rejected (never billed); inbox message to the customer |

## Bills & payments (features 9, 10, 11, 14) - admin

| Method | URL | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/bills` | `?search=&status=Overdue&customer_id=&waiting=yes` | runs `check_overdue_bills()` first; `waiting=yes` = a customer paid online and staff must confirm; every bill has `waiting_payments` |
| GET | `/bills/:id` | | + reading, payments, paid amount, balance |
| POST | `/bills/preview` | `{ "reading_id": "..." }` | calculates, saves nothing |
| POST | `/bills/generate` | `{ "reading_id": "...", "due_date": "2026-11-25" }` | due date optional (today + 20); **409** if already billed |
| POST | `/bills/:id/mark-paid` | `{ "method": "Cash", "reference": "", "payment_date": "" }` (all optional) | records a payment for the balance → status Paid; **409** if already paid, or while an online payment waits |
| POST | `/bills/:id/mark-unpaid` | | deletes the Completed payments → Unpaid / Overdue (Failed ones stay as history) |
| POST | `/bills/:id/payments/:paymentId/confirm` | | an online payment (Pending) → Completed; the trigger marks the bill Paid; inbox message with the receipt link |
| POST | `/bills/:id/payments/:paymentId/reject` | `{ "note" }` (optional) | Pending → Failed (money not received); the bill stays unpaid; inbox message to the customer |
| POST | `/bills/send-reminders` | | inbox message (+ email when the customer has one) for every bill overdue or due in the next 3 days; one reminder per bill every 3 days. Answer `{ reminded, emailed }` |
| POST | `/bills/generate` (also) | | adds a "New bill" inbox message for the customer |

## Complaint management (feature 13) - admin

| Method | URL | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/requests` | `?search=&status=&priority=&category=` | open + urgent first |
| GET | `/requests/staff` | | admin users for the "Assigned to" list |
| GET | `/requests/:id` | | + comments |
| PATCH | `/requests/:id/status` | `status` + optional `priority, assigned_to, resolution_notes` | Resolved needs a resolution note; adds a "Status changed" comment |
| POST | `/requests/:id/comments` | `{ "comment": "..." }` | inbox message to the customer (a status change sends one too) |

## Power notices - admin

Table `outage_notices` (from `database/11_notices_and_inbox.sql`). A customer sees a notice when its `area` appears in their address, or when the area is `All areas`.

| Method | URL | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/notices` | | every notice + `state` (Upcoming / Now / Ended) + `customers_reached` |
| GET | `/notices/areas` | | districts found in the customers' addresses, with how many customers live there |
| POST | `/notices` | `{ "title", "notice_type": "Outage" \| "Maintenance", "area": "Gazipur" (empty = All areas), "message", "starts_at", "ends_at" }` (times as ISO, e.g. `2026-11-25T03:00:00.000Z`) | **400** if it ends before it starts or has already ended; every customer in the area gets an inbox message |
| PUT | `/notices/:id` | same as POST | no new inbox messages |
| DELETE | `/notices/:id` | | |

## Reports (feature 15) - admin

| Method | URL | Answer |
| --- | --- | --- |
| GET | `/reports/customers` | by type, by status, connections by type, top 5 customers (view) |
| GET | `/reports/bills` | totals, billed per month, by status |
| GET | `/reports/payments` | totals, collected per month, by method, latest 10 |

## Customer portal (features 3, 5, 10, 11, 12) - customer

Every query uses the customer id inside the login token, so a customer only ever sees their own data.

| Method | URL | Body | Answer |
| --- | --- | --- | --- |
| GET | `/my/profile` | | profile + connections |
| GET | `/my/dashboard` | | amount due, overdue, open requests, latest bill, kWh per month, `alerts` (overdue / due in 3 days / new since the last login / office replies / payment being checked: `{ tone, text, link, amount }`) and `notices` for the customer's area |
| GET | `/my/bills` | `?status=` | own bills |
| GET | `/my/bills/:id` | | one own bill (404 for other people's bills) |
| GET | `/my/requests` | | own requests |
| GET | `/my/requests/:id` | | one own request + updates |
| POST | `/my/requests` | `{ "category": "Power Outage", "priority": "High", "description": "..." }` | new request (Pending) |
| POST | `/my/requests/:id/comments` | `{ "comment": "..." }` | reply to the office; **400** when the request is Resolved or Cancelled |
| GET | `/my/usage` | | per meter: `official_reading`, `own_reading` (Pending), `units_so_far`, `days_so_far`, `projected_units` (30 days), `projected_bill` (from `calculate_bill_amount()`), `last_month_units`, `slabs`, `warning` (price band warning), last 12 `readings` |
| POST | `/my/readings` | `{ "connection_id", "current_reading", "reading_date" (optional, default today) }` | own meter reading, saved as **Pending** until staff verify it; the same day again replaces the own Pending one (200); **400** lower than the official reading, **404** another customer's meter |
| POST | `/my/bills/:id/pay` | `{ "method": "Mobile Banking" \| "Card", "reference": "TRX8K2M4P9" }` | **Pay now (demo):** the full balance as a Pending payment (no card number is ever sent); **409** if one already waits or the bill is paid |
| GET | `/my/payments` | | every payment for own bills (Pending / Completed / Failed) |
| GET | `/my/payments/:id` | | one own payment (the receipt page) |
| GET | `/my/notifications` | | inbox: newest 30 `items` + `unread` count |
| POST | `/my/notifications/:id/read` | | marks one message read (`:id` = `all` marks every message); answers like GET |
| PUT | `/my/profile` | `{ "full_name", "address" }` | saved straight away (email / phone / type here → 400) |
| GET | `/my/change-requests` | | own profile change requests + the office's answer |
| POST | `/my/change-requests` | `{ "field": "email" \| "phone" \| "customer_type" \| "connection_type", "new_value", "connection_id" (only for connection_type), "reason" }` | new request (Pending); 409 if one is already waiting for the same thing |

## Profile change requests - admin

| Method | URL | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/change-requests` | `?status=Pending` (or Approved / Rejected) | waiting ones first |
| POST | `/change-requests/:id/approve` | `{ "note" }` (optional) | makes the change + marks Approved (one transaction), emails the customer |
| POST | `/change-requests/:id/reject` | `{ "note" }` (optional, shown to the customer) | marks Rejected, emails the customer |

**Emails:** a new bill (`POST /bills/generate`, answer has `email_sent`), due reminders, codes and change answers are emailed through Brevo. Without `BREVO_API_KEY` they are printed in the backend terminal.

## Allowed values

| Field | Values |
| --- | --- |
| customer_type | Residential, Commercial |
| customer / login status | Active, Inactive |
| connection_type | Single Phase, Three Phase |
| connection status | Active, Inactive, Disconnected |
| bill status | Unpaid, Partially Paid, Paid, Overdue |
| payment method | Cash, Bank Transfer, Mobile Banking, Cheque, Card, Other (Pay now: Mobile Banking, Card) |
| payment status | Pending (paid online, waiting), Completed, Failed (not received), Refunded |
| reading status | Pending (sent by the customer), Verified, Rejected |
| notice type | Outage, Maintenance |
| request category | Power Outage, Meter Issue, Connection Issue, Billing Inquiry, General Complaint, New Connection Request, Disconnection Request |
| request priority | Low, Medium, High, Critical |
| request status | Pending, In Progress, Resolved, Cancelled |
