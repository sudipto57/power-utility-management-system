# Security policy

## Reporting a problem

Please **do not open a public issue** for a security problem (for example a way to see another
customer's bills, a leaked key, or a way to log in without a password).

Email the team at **pums.admins@gmail.com** with:

- what you found and where (page, API endpoint or file),
- the steps to see it again,
- what could go wrong because of it.

We reply within a few days and tell you when it is fixed.

## What we already do

- Passwords are stored as bcrypt hashes; email codes are stored as hashes too.
- Every admin route checks the login token **and** the role on the server; customer routes use the
  customer id from the token, never from the request.
- All SQL uses parameters (`$1`, `$2` ...), never text built from user input.
- Login and code attempts are rate-limited, and safety headers are set on every response.
- Secrets live only in `backend/.env` (git-ignored). Real people's data never goes to GitHub:
  `tools/privacy-check.mjs` checks every commit, every push and every pull request.

## Supported versions

Only the latest `main` branch (the live site) gets fixes.
