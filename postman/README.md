# Postman

| File | What it is |
| --- | --- |
| `Power-Utility-Management-System.postman_collection.json` | Every API endpoint (133 requests, 237 automatic checks) in 17 folders |
| `Local.postman_environment.json` | Variables: `baseUrl`, tokens and saved ids |

## Use it

1. Start the backend (`cd backend` → `npm run dev`).
2. Postman → **Import** → choose both files.
3. Top-right environment dropdown → choose **Power Utility - Local**.
4. Open **1. Auth → Login as Admin** (`PUMSadmin`; first type the staff password into the **adminPassword** value of the **Local** environment. Ask the team for it: it is never saved in GitHub) → **Send**. The token is saved automatically (`adminToken`).
   Customers log in in two steps, like on GitHub: send **Login as Customer (step 1)**, copy the 8-digit code from the email (or the backend terminal) into the environment variable **`loginCode`**, then send **step 2** (saves `customerToken`) within 15 minutes.
5. Send any other request. Admin requests use `{{adminToken}}` automatically (collection Authorization tab).

## Run everything at once

Right-click the collection → **Run collection** → **Run**. Do step 4 first (so `loginCode` is filled), then run the collection within 15 minutes: all 237 checks should be green (*Save now* needs `SAVE_CUSTOMERS_TO_SQL_FILE` on and *Send feedback* needs `BREVO_API_KEY`). (Logging in again does not send a new code while the last one still works.)
Running it creates a few test records ("Test Customer", "Temporary Customer"). Run `database/00_reset.sql` … `04_sample_data.sql` again to start fresh.

## Folders

0 Health · 1 Auth · 2 Dashboard · 3 Customers · 4 Connections & Meters · 5 Meter Readings · 6 Bills & Payments ·
7 My (Customer portal) · 8 Complaint Management · 9 Reports · 10 Security checks · 11 Delete rules ·
12 Bill estimator (public) · 13 Account security & profile changes · 14 Feedback (public) · 15 Extra features (activity log, statement, usage alerts, late fees, outage notices, meter replacement) ·
16 Customer readings, Pay now & inbox (customer readings + Verify, Pay now + confirm / reject, payments and receipts, replies, outage notices on My Dashboard, due reminders, inbox; needs `database/12_customer_inbox.sql`)

## Postman desktop (local files)

The `collections/` and `environments/` folders are the files the Postman desktop app keeps for this project. Their **Login** request also uses `PUMSadmin` and the `{{adminPassword}}` environment value, and the **Local** environment's `baseUrl` is `http://localhost:5000/api`. If Postman shows an older copy, re-import both files above.
