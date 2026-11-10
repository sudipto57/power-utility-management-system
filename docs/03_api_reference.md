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
| POST | `/auth/login` | everyone | `{ "login": "admin", "password": "admin123" }` (email or username) | `{ token, user }` |
| GET | `/auth/me` | logged in | | the current user |

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
| GET | `/readings` | `?connection_id=&search=&billed=yes|no` | `billed=no` = waiting for a bill |
| POST | `/readings` | `connection_id, current_reading, reading_date, notes` (+ `previous_reading` only for a meter's first reading) | previous = last verified reading; date must be after it and not in the future; connection must be Active |

## Bills & payments (features 9, 10, 11, 14) - admin

| Method | URL | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/bills` | `?search=&status=Overdue&customer_id=` | runs `check_overdue_bills()` first |
| GET | `/bills/:id` | | + reading, payments, paid amount, balance |
| POST | `/bills/preview` | `{ "reading_id": "..." }` | calculates, saves nothing |
| POST | `/bills/generate` | `{ "reading_id": "...", "due_date": "2026-11-25" }` | due date optional (today + 20); **409** if already billed |
| POST | `/bills/:id/mark-paid` | `{ "method": "Cash", "reference": "", "payment_date": "" }` (all optional) | records a payment for the balance → status Paid; **409** if already paid |
| POST | `/bills/:id/mark-unpaid` | | deletes the payments → Unpaid / Overdue |

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

## Customer portal (features 3, 5, 10, 11, 12) - customer

Every query uses the customer id inside the login token, so a customer only ever sees their own data.

| Method | URL | Body | Answer |
| --- | --- | --- | --- |
| GET | `/my/profile` | | profile + connections |
| GET | `/my/dashboard` | | amount due, overdue, open requests, latest bill, kWh per month |
| GET | `/my/bills` | `?status=` | own bills |
| GET | `/my/bills/:id` | | one own bill (404 for other people's bills) |
| GET | `/my/requests` | | own requests |
| GET | `/my/requests/:id` | | one own request + updates |
| POST | `/my/requests` | `{ "category": "Power Outage", "priority": "High", "description": "..." }` | new request (Pending) |

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
