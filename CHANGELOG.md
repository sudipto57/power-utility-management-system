# Changelog

What changed in Sparkility, newest first. Dates are 2026. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 28 Nov

### Changed
- Repository tidy-up for review: new README, LICENSE (ISC), CONTRIBUTING, SECURITY, this changelog,
  issue and pull request templates, `.editorconfig` and a documentation index (`docs/README.md`).

### Removed
- `Project Documents/Project's UI Interface/` (UI change notes and screenshots). It is now in `.gitignore`.

## 27 Nov

### Added
- Customer profile pictures (`database/14_profile_photos.sql`).
- New name **Sparkility** with its logo and favicon (was *Power Utility Management System*).
- Wrong-tab warning on the login card; long lists show 50 rows at a time.

## 26 Nov

### Security
- Privacy check (`tools/privacy-check.mjs`) before every commit and push and on GitHub.
- Real sign-ups and the staff password hash removed from the SQL files and from the git history;
  staff logins are created locked (`npm run staff:password`).
- Website sign-ups are copied to the private, git-ignored `database/private/`.
- Real customers blurred in screenshots.

## 25 Nov

### Added
- Support form on the first page and the admin Support page (`13_support_and_deletions.sql`).
- *Delete permanently* for customers; sign-up rules for username, email and password;
  phone numbers with a country code; address with area and city; 4-digit email codes;
  live clock on the first page.

## 21 – 22 Nov

### Added
- Customer inbox and due reminders (`12_customer_inbox.sql`).
- Customer meter readings, price-band warning, bill calculator, Pay now, payment history and receipts,
  outage notices per area, replies on requests.

### Fixed
- Crashes on impossible dates and very large numbers.
- Old meter number kept on old bills after a meter replacement.

## 20 Nov

### Added
- Activity log, account statement, usage alerts, automatic late fees, outage notices and meter
  replacement (`11_extra_features.sql`), with their API, pages, Postman requests and docs.
- Automatic copy of website sign-ups (`10_auto_save.sql`).

## 18 – 19 Nov

### Added
- Account security: email confirmation at sign-up, forgot password, a login code for customers,
  profile change requests (`09_account_security.sql`); emails through Brevo.
- Website feedback form; Render-ready settings check.

## 10 – 12 Nov

### Added
- First version: database schema, sample data, Express API, React website with the 15 core features,
  Postman collection and documentation.
