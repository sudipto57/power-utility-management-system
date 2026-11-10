# 5. User guide

How to use each feature. Screenshots are in `docs/images/`.

## Logging in (features 1, 2)

Open http://localhost:5173. Type your **email or username** and password, or click a **Quick demo login** button.
Admins land on the **Admin panel**; customers land on the **Customer portal**. Each role only sees its own menu.
**Log out** is in the top-right corner.

![Login](images/01_login.png)

---

## Admin

### Dashboard (feature 3)

Four live numbers (customers, active services, unpaid bills, open complaints), a **billed vs collected** chart for the last 6 months, bills by status, the **latest 10 activities**, and quick-action buttons.

![Dashboard](images/02_dashboard.png)

### Customers (features 4, 5, 14)

- **Customers** menu → search by name, ID, phone or e-mail; filter by type and status.
- **Add customer** → fill the form. Tick *Create a login for this customer* to give them portal access.
- Click a row to open the **profile**: contact details, connections (meters), bills and requests.
- ✏️ edits, 🗑️ deletes. A customer **with bills cannot be deleted** (that would erase billing history), so the app offers **Set as Inactive** instead.

![Customers](images/03_customers.png)

### Connections & meters (features 6, 7)

- **Connections & Meters** → list of every service with its meter and last reading.
- **New connection** (or *Add connection* on a customer profile). Leave *Meter number* empty to create one automatically (MET-####).
- Open a connection to see the **meter card** (number, status, odometer of the last reading), meter information, a consumption chart, all readings and bills.

![Connection details](images/04_connection_details.png)

### Meter readings (feature 8)

- **Meter Readings → Enter reading** → choose the meter. The **previous reading is filled in automatically** from the last reading.
- Type the current reading. The live box shows the consumption. The current reading can never be lower than the previous one.
- After saving, click **Generate bill now**.
- The *Waiting for a bill* tab lists readings that have no bill yet.

![Reading entry](images/05_reading_entry.png)

### Bills (features 9, 10, 11)

- **Bills & Payments → Generate bill** → choose a reading. The amounts are calculated by the database (fixed charge + slab energy charge + VAT) **before** you save.
- The bill list shows amount, due date and status; filter with the status chips or search.
- **Mark paid** → choose the method (cash, mobile banking …) → the bill becomes **Paid**.
  **Mark unpaid** removes the payment again.
- Open a bill to see the printable invoice → **Print** (or *Save as PDF* in the print window).

![Generate bill](images/06_generate_bill.png)
![Bill](images/07_bill_details.png)

### Complaints (feature 13)

- **Complaints** → the four coloured cards count Pending / In Progress / Resolved / Cancelled (click one to filter).
- Open a request → change **status**, **priority**, **assigned staff**, write a **resolution note** (required to resolve), and add notes to the conversation.

![Complaint](images/08_request_details.png)

### Reports (feature 15)

Totals (billed, collected, outstanding, VAT), customers by type, **top customers** (from the `customer_billing_summary` view), billed per month, bills by status, collected per month, payment methods and the latest payments. **Print** gives a paper copy.

![Reports](images/09_reports.png)

---

## Customer

- **My Dashboard**: amount due, overdue bills, open requests, active services, kWh used per month, latest bill.
- **My Bills**: every bill with its payment status; open one for the full printable bill.
- **My Requests → New request**: choose what it is about, how urgent, describe it. Follow the progress bar and staff replies.
- **My Profile**: contact details and meters.

![Customer dashboard](images/10_customer_dashboard.png)
![New request](images/11_new_request.png)
