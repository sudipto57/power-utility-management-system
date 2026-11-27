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

### 27 Nov 2026 (evening): new name and logo, Sparkility

| Check | How | Result |
| --- | --- | --- |
| Old name gone | searched every source file, doc, SQL file and the Postman files for "Power Utility" | ✅ only kept on purpose: the project folder and GitHub repository, the database `power_utility_db`, npm package names, browser storage keys, the Postman file names and `pums.admins@gmail.com` (changing those would break things) |
| Logo | first page, sign-up, 404 page, admin + customer sidebar, bill, receipt; light + dark + phone size | ✅ navy-head logo in light mode, white-head logo in dark mode and in the dark sidebar; a **printed** bill or receipt always gets the navy-head logo, also when the screen is dark |
| Browser tab | tab title and icon | ✅ "Sparkility" (e.g. *Bills & Payments · Sparkility*); the icon's head turns white when the browser itself is dark |
| Emails | code email rendered | ✅ "[Sparkility] ..." subjects, "The Sparkility Team" |
| Watch demo | new 74-second video recorded from the running app | ✅ shows the new name and logo |
| Frontend | `npm run lint` + `npm run build` | ✅ 0 warnings, builds |

### 27 Nov 2026: profile pictures, wrong-tab warning, two-line tagline, phone country box, Give Feedback, speed

| Check | How | Result |
| --- | --- | --- |
| New SQL file | `14_profile_photos.sql` after `00 → 04, 09 → 13`, then 14 again on top | ✅ no errors, both times |
| API | Postman collection with newman: 152 requests, 271 checks (folder **18** is new: 6 requests) | ✅ every check in folder 18 passed; the same 3 older checks need `SAVE_CUSTOMERS_TO_SQL_FILE` / `BREVO_API_KEY` |
| Profile pictures | set / show / remove as admin and as customer; a renamed text file, a 400 KB file and a non-picture refused; no login → 401 | ✅ |
| Speed (phone with a 4 × slower processor) | time from click to a full page | Bills 4.2 s → 0.8 s, Meter Readings 3.4 s → 0.5 s, Customers 1.1 s → 0.6 s (lists draw 50 rows, **Show 50 more**); the first page on phones no longer downloads the 500 KB background video |
| Frontend | `npm run lint` + `npm run build` | ✅ 0 warnings, builds |
| Pages in Chrome | first page, sign-up, Admin tab warning, customer profile, My Profile, Give Feedback, long lists; light + dark + phone size | ✅ no JavaScript errors, nothing wider than the screen |

### 26 Nov 2026: full repository check before sharing

| Check | How | Result |
| --- | --- | --- |
| Clean install | `npm ci` in `backend/` and `frontend/` on Node.js 22 | ✅ 0 vulnerabilities |
| SQL files | `00 → 04, 09 → 13`, then `06` and `05`, on an empty local PostgreSQL 16 database; `09 → 13` again on top | ✅ no errors, both times; `npm run db:test` finds 22 tables |
| API | Postman collection with newman: 146 requests, 258 checks | ✅ 256 passed; the 2 that failed are *Save now*, which needs `SAVE_CUSTOMERS_TO_SQL_FILE=true` |
| Frontend | `npm run lint` + `npm run build` | ✅ 0 warnings, 0 errors, builds |
| Every page in Chromium | first page, login, 404, all 22 admin pages and all 12 customer pages (with real ids) | ✅ no console errors, no failed API calls, no "undefined" / "NaN" on screen |
| Secrets | every commit on every branch searched for database passwords, JWT secrets and Brevo keys | ✅ none; `.env.example` files only have placeholders |

### 25 Nov 2026: Delete permanently, sign-up rules, Support, live clock, 4-digit codes, notification bell

| Check | How | Result |
| --- | --- | --- |
| New SQL file | `13_support_and_deletions.sql` after `00 → 04, 09 → 12`, then 13 and 09 again on top | ✅ no errors, both times; `npm run db:test` finds 22 tables |
| API | Postman collection with newman: 146 requests, 258 checks (folder **17** is new: 13 requests) | ✅ every check in folders 13 and 17 passed. The same 3 older checks as before need things a test laptop may not have (`SAVE_CUSTOMERS_TO_SQL_FILE`, `BREVO_API_KEY`) |
| Rules | reserved / too short / `..` usernames refused; bad emails (`a..b@x.com`, `-x@y.com`, `x@-y.com`, no ending) refused; weak passwords (`Password1!`, name inside, `1234`, `qwerty`) refused; a wrong-length phone for its country refused; sign-up without Area or City refused; an 8-digit code refused, the 4-digit code accepted | ✅ |
| Support | a fake PNG refused; a wrong code counts down the tries; the right code gives SUP-2026-001 and emails the office with the file; Solved without a reply refused; Solved emails the reply; the file downloads only for admins | ✅ |
| Delete permanently | wrong customer number refused; the customer, login, meters, readings, bills, payments, requests and their activity-log rows are gone; the customer also leaves `04_sample_data.sql`, and the file still loads into an empty database | ✅ |
| Frontend | `npm run lint` + `npm run build` | ✅ 0 warnings, builds |
| Every page in Chrome | admin, customer and first page, light + dark + phone size (390 px), plus the new Support, sign-up and delete screens | ✅ no JavaScript errors, nothing wider than the screen; the greeting stays on one line with the name under it; the bell empties after opening a message |

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
