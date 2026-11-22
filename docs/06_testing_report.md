# 6. Testing report

## Automated checks (5 Nov 2026)

Run on a **fresh copy** of the project with a **fresh database** (PostgreSQL 16, Node.js 22).

| Check | How | Result |
| --- | --- | --- |
| SQL files run cleanly | `00 → 01 → 02 → 03 → 04 → 06 → 07` on an empty database, then again on top (re-run) | ✅ no errors, both times |
| Optional roles file | `05_roles_and_grants.sql` on a separate test database | ✅ no errors |
| Supabase security file | `07` on a database with Supabase's `anon` role | ✅ `anon` gets "permission denied"; the backend user still reads all rows |
| Bill maths | `calculate_bill_amount('Residential','Single Phase',250)` | ✅ 2,095.80 (worked by hand in `database/README.md`) |
| Sample bills | all 12 bills recalculated from readings | ✅ amounts match the tariff; statuses come from the payment trigger |
| API | Postman collection with newman: 57 requests, 100 checks | ✅ 100 / 100 passed, 0 server errors |
| Frontend code | `npm run lint` (oxlint) | ✅ 0 warnings, 0 errors |
| Frontend build | `npm run build` | ✅ builds |
| Every page in a real browser | Chrome, admin + customer + phone size: login, all list/detail/form pages, add customer → connection → reading → bill → mark paid, delete guard, complaint update, new request, 404, logout, customer blocked from admin pages | ✅ no JavaScript errors |
| Friendly setup errors | missing `.env`, example values left in `.env`, wrong password, wrong host | ✅ clear message + tip in the terminal |

Run the API tests yourself: Postman → collection → **Run collection** (see `postman/README.md`).

### 21 Nov 2026: meter readings from customers, Pay now, receipts, outage notices per area, inbox

| Check | How | Result |
| --- | --- | --- |
| New SQL file | `12_customer_inbox.sql` after `00 → 04, 09, 10, 11`, then 11 and 12 again on top | ✅ no errors, both times |
| API | Postman collection with newman: 133 requests, 237 checks (folder **16** is new: 28 requests) | ✅ every check in folders 15 and 16 passed. 3 older checks need things a test laptop may not have: *Save now* needs `SAVE_CUSTOMERS_TO_SQL_FILE` on, *Send feedback* needs `BREVO_API_KEY` |
| Rules | lower / future / other customer's reading refused; reading counted only after Verify; Mark paid blocked while an online payment waits; cash refused for Pay now; reply refused on a closed request; customer cannot open the admin notices; reminders not repeated within 3 days | ✅ |
| Frontend | `npm run lint` + `npm run build` | ✅ 0 warnings, builds |
| Every page in Chrome | 36 pages (admin, Rafiqul = commercial, Sumaiya = residential), light + dark + phone size, plus 16 pop-up / click-through screens | ✅ no JavaScript errors, nothing wider than the screen |

## Manual test checklist (do this on your own Supabase setup before each checkpoint)

| # | Feature | Steps | Expected | ✓ |
| --- | --- | --- | --- | --- |
| 1 | Login | Log in as `PUMSadmin` / `<staff password>`; then try a wrong password | Admin dashboard; then "Wrong email/username or password" | ☐ |
| 2 | Roles | Log in as `sumaiya.khanam` / `customer123`; type `/admin` in the address bar | Customer portal; sent back to `/my` | ☐ |
| 3 | Dashboard | Open Dashboard | 4 numbers, 2 charts, recent activity | ☐ |
| 4 | Customer management | Add a customer, edit the phone, delete a customer without bills | Each change shows a green message and appears in the list | ☐ |
| 5 | Customer profile | Open Md. Rafiqul Islam (CUST-001) | Contact details, connection, bills, requests | ☐ |
| 6 | Electricity service | Add a connection with an empty meter number | A new MET-#### is created | ☐ |
| 7 | Meter information | Open the connection | Meter card, installation date, status | ☐ |
| 8 | Meter reading | Enter a reading lower than the previous one; then a correct one | First is refused; second saved with consumption shown | ☐ |
| 9 | Bill generation | Generate a bill from that reading | Preview amounts = saved bill amounts | ☐ |
| 10 | Bill list | Filter "Overdue", search a bill number | Only matching bills | ☐ |
| 11 | Payment status | Mark paid, then mark unpaid | Paid ↔ Unpaid / Overdue | ☐ |
| 12 | Service request | As a customer: New request | Shows as Pending in My Requests | ☐ |
| 13 | Complaint management | As admin: set In Progress, add a note, Resolve (with note) | Status changes, timeline updates; customer sees it | ☐ |
| 14 | Search & filter | Search customers, connections, bills, requests | Lists update while typing | ☐ |
| 15 | Reports | Open Reports | Totals, 5 charts, top customers, latest payments | ☐ |
| - | Delete guard | Delete Md. Rafiqul Islam (CUST-001) | "Can't delete. Deactivate instead?" | ☐ |
| - | Print | Open a bill → Print | Only the bill is printed | ☐ |
| - | Customer login code | Log in as `sumaiya.khanam` / `customer123`; type a wrong code, then the code from the email (or the backend terminal) | "Verify your identity" step, then "Wrong code. 4 tries left", then the Customer portal | ☐ |
| - | Sign up + email code | Create a customer account (password with letters and numbers); type a wrong code, then the right one (from the email, or the backend terminal without Brevo) | "Wrong code. 4 tries left"; then logged in to the Customer portal | ☐ |
| - | Forgot password | Customer tab → Forgot password? → type the phone number → code + new password; log in | Old password refused, new one works | ☐ |
| - | Profile edit | My Profile → Edit my details → change the address | Saved straight away | ☐ |
| - | Change request | My Profile → Request a change → new phone; as admin approve it on the Dashboard | Customer sees *Approved* and the new phone; an email is sent | ☐ |
| - | Bill email | Generate a bill for a customer with an email | Message says "emailed to ..."; the email arrives (or is printed in the terminal) | ☐ |
| - | Old admin login | Log in as `admin` / `admin123` | Refused (the admin is now `PUMSadmin`) | ☐ |
| - | Customer reading | As Sumaiya: Meter & Usage → type a number 150 higher than the official one → Send reading; as admin: Meter Readings → *Sent by customers* → Verify | *This month so far* + projected bill (+ price warning); after Verify it can be billed | ☐ |
| - | Pay now | As a customer: open an unpaid bill → Pay now → Mobile Banking + any reference; as admin: open the bill → Confirm payment | "Being checked", then Paid; receipt in My Payments | ☐ |
| - | Power notice | As admin: Power Notices → Post a notice for the customer's district | Customer sees it on My Dashboard and in the bell | ☐ |
| - | Reminders + inbox | As admin: Bills → Send due reminders; as a customer open the bell → Mark all as read | Reminder messages; the red count goes away | ☐ |
