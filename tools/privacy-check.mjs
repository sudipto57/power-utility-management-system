// Privacy check for the Sparkility repository.
// It stops real people's data and secrets from going to GitHub.
//
//   node tools/privacy-check.mjs            check every file git tracks (what is in the working folder)
//   node tools/privacy-check.mjs --staged   check only what is staged for the next commit (git pre-commit hook)
//   node tools/privacy-check.mjs --tree REV check the files of one commit, e.g. HEAD
//   node tools/privacy-check.mjs --commits A..B   check what every commit from A to B added or changed
//                                           (git pre-push hook and GitHub), so data that was added in one
//                                           commit and deleted in a later one is caught too
//   node tools/privacy-check.mjs --history  check every version of every file in the whole git history
//   node tools/privacy-check.mjs --mark-checked FILE...   after a person looked at a picture or Office
//                                           file and it shows no real people, write it down as checked
//
// It runs automatically before every commit and push (.githooks/, switched on by `npm install`
// in backend/ or by `git config core.hooksPath .githooks`) and on GitHub for every push and pull request
// (.github/workflows/checks.yml). Exit code 1 = something private was found: nothing is committed or pushed.
//
// What counts as private:
//   - files that must never be in git: .env (only .env.example is allowed), database/private/,
//     real survey answers (Survey Responses*.xlsx), private keys, the auto-save log
//   - password hashes (bcrypt "$2b$10$...") except the public demo ones in tools/privacy-allowlist.txt
//   - passwords and keys in settings: DB_PASSWORD=..., JWT_SECRET=..., Brevo keys, database URLs
//     with a password, private keys, GitHub tokens, Supabase keys, a filled-in Postman adminPassword
//   - real email addresses (gmail, yahoo, outlook ...) and Bangladeshi mobile numbers
//     (the made-up ones in database/04_sample_data.sql are allowed; see the rules below)
//   - real website customers in database/04_sample_data.sql (CUST-201 and up, or the old
//     "WEBSITE CUSTOMERS" part). They belong in database/private/website_customers.sql.
//   - pictures, PDFs, Word / Excel files and videos cannot be read by this check. A NEW or CHANGED one
//     is stopped until a person has looked at it (no real names, phones, emails; blur screenshots)
//     and written it down with --mark-checked (the list is tools/privacy-checked-files.txt).
//
// A finding that is NOT private (an example in a comment, the team's public inbox ...) can be
// allowed by adding the exact text to tools/privacy-allowlist.txt, with a comment that says why.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWLIST_FILE = path.join(ROOT, 'tools', 'privacy-allowlist.txt');
const CHECKED_FILES_LIST = path.join(ROOT, 'tools', 'privacy-checked-files.txt');

// ---------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------

// Files that may never be in git, whatever is inside them
const FORBIDDEN_FILES = [
  { test: (f) => /(^|\/)\.env(\.[^/]*)?$/.test(f) && !f.endsWith('.env.example'), why: 'a .env file holds real passwords and keys' },
  { test: (f) => f.startsWith('database/private/'), why: 'database/private/ holds real customers' },
  { test: (f) => /(^|\/)Survey Responses[^/]*\.xlsx$/i.test(f), why: 'real survey answers (names, phones, emails)' },
  { test: (f) => /\.(pem|key|p12|pfx)$/i.test(f) || /(^|\/)id_(rsa|ed25519|ecdsa)$/.test(f), why: 'a private key file' },
  { test: (f) => /(^|\/)auto-save\.log$/.test(f), why: 'the auto-save log lists real sign-ups' },
];

// Text patterns. Each finding shows the rule name, so it is easy to see what to fix.
const RULES = [
  {
    name: 'Password hash',
    regex: /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g,
    why: 'a bcrypt password hash can be cracked offline; real ones never go to GitHub',
  },
  {
    name: 'Database password',
    regex: /\bDB_PASSWORD\s*=(?!=)\s*(?!your-database-password\b|<[^>]*>|\s*$)[^\s#'"`]+/gm,
    why: 'a real database password',
  },
  {
    name: 'Login secret',
    regex: /\bJWT_SECRET\s*=(?!=)\s*(?!change-me[\w-]*|<[^>]*>|\s*$)[^\s#'"`]{12,}/gm,
    why: 'the real JWT_SECRET lets anyone make login tokens',
  },
  { name: 'Brevo key', regex: /xkeysib-[A-Za-z0-9-]{20,}/g, why: 'a real Brevo (email) API key' },
  { name: 'GitHub token', regex: /\b(ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{30,}/g, why: 'a GitHub access token' },
  { name: 'Private key', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, why: 'a private key' },
  {
    name: 'Supabase / JWT key',
    regex: /\beyJhbGciOi[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
    why: 'a Supabase key or a login token',
  },
  {
    name: 'Database URL with password',
    regex: /\bpostgres(ql)?:\/\/[^\s:@/'"`]+:(?!<|\*|password\b|your)[^\s@/'"`]+@/g,
    why: 'a connection string with a real password',
  },
  {
    name: 'Postman staff password',
    regex: /"key"\s*:\s*"adminPassword"\s*,\s*"value"\s*:\s*"[^"]+"|adminPassword:\s*\S+/g,
    files: (f) => f.startsWith('postman/') && /environment/i.test(f),
    why: 'the staff password must stay empty in the Postman environment (type it only in your own Postman)',
  },
  {
    name: 'Real email address',
    // Big free mail providers: these are real people. Made-up people use @example.com.
    // A masked address like s****8@gmail.com is fine (the * in front is checked below).
    regex: /[A-Za-z0-9._%+-]+@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|aol|proton|protonmail|gmx|zoho|yandex|mail)\.[a-z.]{2,}/gi,
    why: 'a real email address (use name@example.com for made-up people)',
  },
  {
    name: 'Email in database file',
    regex: /[A-Za-z0-9._%+-]+@(?!example\.(com|org|net)\b|powerutility\.com\b)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[a-z]{2,}/gi,
    files: (f) => f.startsWith('database/') && f.endsWith('.sql'),
    why: 'database files may only hold @example.com (customers) and @powerutility.com (staff) addresses',
  },
  {
    name: 'Mobile number',
    // Bangladeshi mobile numbers. database/04_sample_data.sql is checked with the rules below instead,
    // because its 200 made-up customers have made-up numbers.
    regex: /(?<![\d*])(\+?880|0)1[3-9]\d{8}(?!\d)/g,
    files: (f) => f !== 'database/04_sample_data.sql',
    why: 'a real mobile number (use the example 01712345678)',
  },
  {
    name: 'Real customer in sample data',
    regex: /'CUST-(2(0[1-9]|[1-9]\d)|[3-9]\d\d|\d{4,})'/g,
    files: (f) => f === 'database/04_sample_data.sql',
    why: 'CUST-201 and up are real sign-ups: they belong in database/private/website_customers.sql',
  },
  {
    name: 'Old website-customers part',
    regex: /WEBSITE CUSTOMERS START/g,
    files: (f) => f === 'database/04_sample_data.sql',
    why: 'real sign-ups are no longer written into 04_sample_data.sql (see database/private/)',
  },
];

// Big generated files that cannot hold anyone's data
const SKIP_FILES = (f) =>
  /(^|\/)package-lock\.json$/.test(f) ||
  ['tools/privacy-check.mjs', 'tools/privacy-allowlist.txt', 'tools/privacy-checked-files.txt'].includes(f);

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function git(args, options = {}) {
  return execFileSync('git', args, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024, ...options });
}

function readAllowlist() {
  if (!fs.existsSync(ALLOWLIST_FILE)) return new Set();
  return new Set(
    fs
      .readFileSync(ALLOWLIST_FILE, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
  );
}

const isBinary = (buffer) => buffer.subarray(0, 8000).includes(0);

/** Git's own id of a file's content (the same as `git hash-object FILE`). */
function blobId(buffer) {
  return crypto.createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
}

/** The ids of the pictures / Office files a person has already looked at. */
function readCheckedFiles() {
  if (!fs.existsSync(CHECKED_FILES_LIST)) return new Set();
  return new Set(
    fs
      .readFileSync(CHECKED_FILES_LIST, 'utf8')
      .split(/\r?\n/)
      .filter((line) => /^[0-9a-f]{40}\s/.test(line))
      .map((line) => line.slice(0, 40))
  );
}

/** Shows only the start and end of a finding, so the check itself never prints private data. */
function hide(text) {
  if (text.length <= 8) return `${text[0]}***`;
  return `${text.slice(0, 4)}***${text.slice(-3)}`;
}

/** Checks one file. Returns a list of findings ({ file, line, rule, text, why }). */
function checkFile(file, buffer, allowlist, checkedFiles) {
  const findings = [];
  for (const rule of FORBIDDEN_FILES) {
    if (rule.test(file)) findings.push({ file, line: 0, rule: 'File not allowed in git', text: file, why: rule.why });
  }
  if (findings.length > 0 || SKIP_FILES(file)) return findings;
  if (isBinary(buffer)) {
    // A picture / PDF / Office file: the text rules cannot read it, so a person has to look at it.
    // (checkedFiles is null for --history: old versions are not stopped one by one.)
    if (checkedFiles && !checkedFiles.has(blobId(buffer))) {
      findings.push({
        file,
        line: 0,
        rule: 'Picture or document not checked yet',
        text: file,
        why: `look at it: no real names, phones or emails (blur screenshots). Then run: node tools/privacy-check.mjs --mark-checked "${file}"`,
      });
    }
    return findings;
  }

  const text = buffer.toString('utf8');
  for (const rule of RULES) {
    if (rule.files && !rule.files(file)) continue;
    for (const match of text.matchAll(rule.regex)) {
      const found = match[0];
      if (allowlist.has(found)) continue;
      if (rule.name === 'Real email address' && text[match.index - 1] === '*') continue; // masked: s****8@gmail.com
      const line = text.slice(0, match.index).split('\n').length;
      findings.push({ file, line, rule: rule.name, text: found, why: rule.why });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------
// Which files to check
// ---------------------------------------------------------------------
function* workingFiles() {
  const files = git(['ls-files', '-z']).toString().split('\0').filter(Boolean);
  for (const file of files) {
    const full = path.join(ROOT, file);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) yield { file, buffer: fs.readFileSync(full) };
  }
}

function* stagedFiles() {
  const files = git(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR']).toString().split('\0').filter(Boolean);
  for (const file of files) yield { file, buffer: git(['show', `:${file}`]) };
}

function* treeFiles(rev) {
  const lines = git(['ls-tree', '-r', '-z', rev]).toString().split('\0').filter(Boolean);
  for (const line of lines) {
    const [info, file] = line.split('\t');
    const [, type, sha] = info.split(' ');
    if (type === 'blob') yield { file, buffer: git(['cat-file', 'blob', sha]) };
  }
}

function* commitFiles(revs) {
  // What every commit in the range added or changed (each file version once)
  const commits = git(['rev-list', ...revs]).toString().split('\n').filter(Boolean);
  const seen = new Set();
  for (const commit of commits) {
    const parts = git(['diff-tree', '-r', '-z', '--root', '--no-commit-id', '--diff-filter=ACMR', commit])
      .toString()
      .split('\0');
    for (let i = 0; i + 1 < parts.length; i += 2) {
      const sha = parts[i].split(' ')[3];
      const file = parts[i + 1];
      if (!sha || seen.has(sha) || /^0+$/.test(sha)) continue;
      seen.add(sha);
      if (git(['cat-file', '-t', sha]).toString().trim() === 'blob') yield { file, buffer: git(['cat-file', 'blob', sha]) };
    }
  }
}

function* historyFiles() {
  // Every different version of every file ever committed (each one once)
  const objects = git(['rev-list', '--all', '--objects']);
  const lines = git(['cat-file', '--batch-check=%(objecttype) %(objectname) %(rest)'], { input: objects })
    .toString()
    .split('\n')
    .filter((line) => line.startsWith('blob '));
  for (const line of lines) {
    const [, sha, ...rest] = line.split(' ');
    yield { file: rest.join(' '), buffer: git(['cat-file', 'blob', sha]), sha };
  }
}

// ---------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------
/** --mark-checked FILE...: writes the files down as "looked at by a person, no private data". */
function markChecked(files) {
  const lines = [];
  for (const file of files) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) {
      console.error(`[privacy check] Not found: ${file}`);
      process.exitCode = 1;
      continue;
    }
    const relative = path.relative(ROOT, full).split(path.sep).join('/');
    lines.push(`${blobId(fs.readFileSync(full))}  ${relative}`);
  }
  if (lines.length === 0) return;
  fs.appendFileSync(CHECKED_FILES_LIST, `${lines.join('\n')}\n`);
  console.log(`[privacy check] Written down as checked by a person:\n  ${lines.join('\n  ')}`);
}

function main() {
  const args = process.argv.slice(2);
  let mode = 'working folder';
  let files;
  if (args.includes('--mark-checked')) {
    markChecked(args.slice(args.indexOf('--mark-checked') + 1));
    return;
  }
  if (args.includes('--staged')) {
    mode = 'staged changes';
    files = stagedFiles();
  } else if (args.includes('--tree')) {
    const rev = args[args.indexOf('--tree') + 1] || 'HEAD';
    mode = `commit ${rev}`;
    files = treeFiles(rev);
  } else if (args.includes('--commits')) {
    const revs = args.slice(args.indexOf('--commits') + 1);
    mode = `commits ${revs.join(' ')}`;
    files = commitFiles(revs);
  } else if (args.includes('--history')) {
    mode = 'whole git history';
    files = historyFiles();
  } else {
    files = workingFiles();
  }

  const allowlist = readAllowlist();
  const checkedFiles = args.includes('--history') ? null : readCheckedFiles();
  const findings = [];
  let count = 0;
  for (const { file, buffer, sha } of files) {
    count += 1;
    for (const f of checkFile(file, buffer, allowlist, checkedFiles)) findings.push(sha ? { ...f, file: `${file} (version ${sha.slice(0, 7)})` } : f);
  }

  if (findings.length === 0) {
    console.log(`[privacy check] OK: ${count} file(s) checked (${mode}), no personal data or secrets found.`);
    return;
  }

  console.error(`\n[privacy check] STOPPED: ${findings.length} private item(s) found in the ${mode}.\n`);
  for (const f of findings.slice(0, 200)) {
    console.error(`  ${f.file}${f.line ? `:${f.line}` : ''}  ${f.rule}: ${hide(f.text)}`);
    console.error(`      why: ${f.why}`);
  }
  if (findings.length > 200) console.error(`  ... and ${findings.length - 200} more`);
  console.error(
    '\nRemove them (real customers belong in database/private/, secrets in backend/.env), then try again.\n' +
      'Only if a finding is NOT private (for example a made-up example), add the exact text to tools/privacy-allowlist.txt.\n'
  );
  process.exitCode = 1;
}

main();
