# Electricity Survey — real data for the Power Utility Management System

A Google Form + Google Sheet that collects real data for our database, without
asking people to remember meter numbers or readings.

- Form (share this): https://docs.google.com/forms/d/e/1FAIpQLSdUL9gdxOfDcL4-ILh2zDlo8jYPGSAKRL7qdAuYahaqN9HAqQ/viewform
- Script project: "Electricity Survey Builder" at script.google.com (the team's Google account)

## Files in this folder

| File | What it is |
| --- | --- |
| `Code.gs` | Version 3 — the script that is live now (repair + sheet tools) |
| `Code_v1_builder.gs` | Version 1 — the script that first built the form (kept for reference) |
| `survey-images/` | All pictures used inside the form |

## How the form is laid out

Every person sees the same 5 steps, in order. Nothing is skipped.

| Step | Page | Required? |
| --- | --- | --- |
| – | Welcome + consent ("No" ends the form) | Yes |
| 1 | About you: name, mobile, email, division, area, home or business | Yes |
| 2 | Your electricity connection: company, meter type, phase, years, people, appliances | Yes |
| 3 | Bill & meter details: a **postpaid** part and a **prepaid** part on one page | All optional — fill only your own part |
| 4 | Monthly usage: usage level + monthly cost | Yes (a guess is fine) |
| 5 | Payments & service: how you pay, problems, power cuts, happiness | Yes (story is optional) |

The progress bar says "Page 1 of 6" on the welcome page, so Step 1 is page 2 and Step 5 is page 6.

### What went wrong before (fixed on 15 Nov 2026)
1. Version 1 jumped from "Quick check" to one of three pages, so two sections were
   always skipped and it looked like a section was missing.
2. The first repair script stopped half-way (it gave `moveItem` the wrong kind of value).
   That left every Step 3 box required (bill boxes AND prepaid boxes), so nobody could
   get past Step 3, and left two pictures and two headings at the bottom of Step 5.
3. "Shuffle question order" was switched on, so questions appeared in a random order.
4. The Dashboard counted 0 answers, because its ranges slid down each time an answer arrived.

Version 3 of `fixSurveyForm` fixed all four and can be run again safely.

## Which answer fills which table

| Question | Database column |
| --- | --- |
| Name, mobile, email, area + division, home/business | `customers` |
| Meter No (bill or prepaid), phase, years connected, company | `connections` |
| Previous + present reading, bill month | `meter_readings` (status Verified) |
| kWh on prepaid screen + monthly cost | `meter_readings` (estimated, status Pending) |
| Bill amount + paid? | only to check our SQL bill function |
| How you pay | `payments.method` |
| Problems, power cuts, story | `service_requests` |

## Spreadsheet tabs

| Tab | What it shows |
| --- | --- |
| 📊 Dashboard | Live totals + 8 charts |
| Form Responses 1 | Raw answers (do not edit the headers) |
| 🗄️ Database Ready | Each answer cleaned into our table columns, with a ✅ / ⚠️ note |
| 🧾 SQL Inserts | Ready `INSERT` statements for pgAdmin / Supabase (safe to run twice) |
| 📘 Field Guide | Which question fills which column |

## Functions in the script

| Function | When to run it |
| --- | --- |
| `fixSurveyForm` | Puts the form back into the 5-step layout. Safe to run again. If someone added or removed a question by hand it stops and changes nothing. |
| `rebuildDatabaseSheet` | Runs by itself after every answer. Run by hand to refresh the database tabs. |
| `refreshSheets` | Rebuilds the Dashboard and Field Guide tabs. |

## Rules when you edit the form by hand

- You may change wording, capital letters and answer choices freely — the script matches by key words.
- Do **not** rename the question titles or the picture titles, and do not add "Go to section" rules.
- Do **not** switch on "Shuffle question order" (Settings → Presentation).
- Do **not** add or delete questions, pictures or headings without updating `fixSurveyForm`.
- Keep the Step 3 boxes optional (a prepaid user cannot fill the bill boxes).
- Keep the spreadsheet private and never commit real answers to GitHub.

## Sample data (17 Nov 2026)

`Survey_Sample_Data_200.xlsx` holds 200 made-up Bangladeshi people shaped like the real answers (same columns as "Form Responses 1", plus Gender). No real respondent's details are in it. The same people are loaded into the database by `database/04_sample_data.sql`.
