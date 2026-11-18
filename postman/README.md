# Postman

| File | What it is |
| --- | --- |
| `Power-Utility-Management-System.postman_collection.json` | Every API endpoint (79 requests, 139 automatic checks) in 14 folders |
| `Local.postman_environment.json` | Variables: `baseUrl`, tokens and saved ids |

## Use it

1. Start the backend (`cd backend` → `npm run dev`).
2. Postman → **Import** → choose both files.
3. Top-right environment dropdown → choose **Power Utility - Local**.
4. Open **1. Auth → Login as Admin** (`PUMSadmin` / `PUMS@dmin578`) → **Send**. The token is saved automatically (`adminToken`).
   Do the same for **Login as Customer** (`customerToken`).
5. Send any other request. Admin requests use `{{adminToken}}` automatically (collection Authorization tab).

## Run everything at once

Right-click the collection → **Run collection** → **Run**. All 139 checks should be green.
Running it creates a few test records ("Test Customer", "Temporary Customer"). Run `database/00_reset.sql` … `04_sample_data.sql` again to start fresh.

## Folders

0 Health · 1 Auth · 2 Dashboard · 3 Customers · 4 Connections & Meters · 5 Meter Readings · 6 Bills & Payments ·
7 My (Customer portal) · 8 Complaint Management · 9 Reports · 10 Security checks · 11 Delete rules ·
12 Bill estimator (public) · 13 Account security & profile changes

## Postman desktop (local files)

The `collections/` and `environments/` folders are the files the Postman desktop app keeps for this project. Their **Login** request also uses `PUMSadmin` / `PUMS@dmin578`, and the **Local** environment's `baseUrl` is `http://localhost:5000/api`. If Postman shows an older copy, re-import both files above.
