# Contributing to Sparkility

Thanks for helping. This is a beginner team's first full-stack project, so the rules are simple and
the code should stay easy to read and explain in a viva.

Read **[CLAUDE.md](CLAUDE.md)** once: it holds the full coding, design and git rules.

## 1. Set up

Follow [docs/04_setup_guide.md](docs/04_setup_guide.md). Running `npm install` in `backend/` also
switches on the git hooks that run the privacy check before every commit and push.

## 2. Work on a branch

```bash
git checkout main
git pull
git checkout -b feature/short-name      # or fix/short-name, docs/short-name
```

Never push straight to `main`: it is the live site.

## 3. Build one feature end to end

Do the steps in this order, and only start the next when the current one works:

1. **SQL**: write and try the query in pgAdmin.
2. **API**: route in `backend/src/routes/`, logic in the matching controller.
3. **Postman**: add the request to the collection and send it.
4. **Page**: function in `frontend/src/api/`, the page, its route in `App.jsx` and the menu.
5. **Docs**: one line in `docs/03_api_reference.md` (and the user guide if a screen changed).

Do not add, remove or rename tables or columns unless the team agreed. Do not add new libraries
without asking the team.

## 4. Check your work

```bash
cd frontend && npm run lint && npm run build     # no errors, no warnings
cd backend  && npm run db:test                   # database reachable
node tools/privacy-check.mjs                     # no real people's data or secrets
```

Open the changed pages in the browser as **admin and as customer**.

## 5. Commit

- Small commits, one idea each, written as a short command: `Add customer sign-up API`,
  `Fix due date on the bill list`.
- Before committing, run `git status` and make sure no `.env`, `node_modules/` or `dist/` is staged.
- Never use `--no-verify`. If the privacy check stops you, remove what it found.
- New pictures or documents: look at them first (no real people; blur real customers), then
  `node tools/privacy-check.mjs --mark-checked "path/to/file.png"` and commit the updated list.

## 6. Open a pull request

Push your branch and open a pull request to `main`. Fill in the template, wait for the green
**Checks**, and ask a teammate to review. Merge only after the review.

## Reporting bugs and ideas

Use the **Issues** tab and pick *Bug report* or *Feature request*. Security problems go by email:
see [SECURITY.md](SECURITY.md).
