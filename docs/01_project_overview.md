# 1. Project overview

## What it is

**Sparkility** (called *Power Utility Management System* until 27 Nov 2026) is a web application for an electricity company. Staff use it to manage customers, their electricity connections and meters, meter readings, bills, payments and complaints. Customers log in to see their own bills and to send service requests.

It is an academic Database Management Systems (DBMS) project. The database does the important work with **foreign keys, CHECK constraints, triggers, views and a PL/pgSQL function**, and the website shows it off.

## Team

| Name | Role in the project |
| --- | --- |
| _(add name)_ | Database |
| _(add name)_ | Backend / API |
| _(add name)_ | Frontend / UI |
| _(add name)_ | Testing & docs |

## Users and roles

| Role | Who | Can do |
| --- | --- | --- |
| **Admin** | Company staff (admin, technician, billing officer) | Everything: customers, connections, meters, readings, bills, payments, complaints, reports |
| **Customer** | An electricity customer | See own profile, own connections, own bills and payment status; send and follow own service requests |

## The 15 features and where they live

| # | Feature | Website page | Main tables |
| --- | --- | --- | --- |
| 1 | Login system | `/login` | users |
| 2 | Simple user roles | Admin menu vs Customer menu | users.role |
| 3 | Main dashboard | `/admin`, `/my` | customers, connections, bills, payments, service_requests |
| 4 | Customer management | `/admin/customers` (+ new / edit / delete) | customers (+ users) |
| 5 | Customer profile | `/admin/customers/:id`, `/my/profile` | customers |
| 6 | Electricity service management | `/admin/connections` | connections |
| 7 | Meter information | `/admin/connections/:id` (meter card) | connections |
| 8 | Meter reading entry | `/admin/readings/new` | meter_readings |
| 9 | Simple bill generation | `/admin/bills/generate` | bills, tariffs, tariff_slabs, `calculate_bill_amount()` |
| 10 | Bill list | `/admin/bills`, `/my/bills` | bills |
| 11 | Payment status | "Mark paid / Mark unpaid" buttons | payments + trigger `update_bill_status` |
| 12 | Customer service requests | `/my/requests/new` | service_requests |
| 13 | Complaint management | `/admin/requests` | service_requests, service_request_comments |
| 14 | Basic search & filter | search box + filters on every list | indexes on phone, status, meter_number, due_date |
| 15 | Basic reports | `/admin/reports` | view `customer_billing_summary`, GROUP BY queries |

## Architecture

```
 Browser (React website)  ──HTTP + login token──▶  Express API  ──SQL──▶  PostgreSQL (Supabase)
        localhost:5173      ◀──────JSON─────────    localhost:5000  ◀─rows─
```

The browser never talks to the database directly. Only the API does, which keeps passwords and data safe.

## Ground rules we followed (beginner friendly)

- One language for website and API: **JavaScript**.
- **Plain SQL**, no ORM: we write and show the SQL ourselves.
- Only the 15 features. `bill_adjustments`, `bill_installments` and `meter_reading_schedules` exist in the database but are on the "Later" list.
- One feature at a time: SQL → API → Postman → page.
