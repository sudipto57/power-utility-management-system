// Keeps a PRIVATE copy of the REAL customers on the laptop.
//
// 04_sample_data.sql loads the 200 made-up sample customers (CUST-001 ... CUST-200) and is in GitHub.
// Everybody who joins later (a sign-up on the website, or a customer an admin adds)
// is a real person. They are saved in the live database first. This file then copies those
// customers, their logins and their meters into database/private/website_customers.sql.
// That folder is in .gitignore, so real names, phones, emails and password hashes never go
// to GitHub (users' privacy, 26 Nov 2026). Run that file after 13 to bring them back.
// (Before 26 Nov 2026 they were written at the end of 04_sample_data.sql; that part is now
// taken out of 04 automatically the next time this runs.)
//
// When does it run?
//   * automatically, a moment after a sign-up or any change to customers, logins or meters
//     (see saveAfterChanges below, used in app.js)
//   * on the laptop, in the background: when the laptop starts and then every 10 minutes
//     (npm run auto-save:on, see scripts/autoSave.js). This catches sign-ups made on the
//     live website while the laptop was off: they wait safely in Supabase until then.
//   * from the admin Customers page ("Save now" button)
//   * from a terminal:  cd backend && npm run db:save-customers
// Every copy is also noted in the sql_file_saves table (database/10_auto_save.sql),
// so the live website can show when the laptop file was last updated.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from '../config/db.js';
import env from '../config/env.js';

const SAMPLE_CUSTOMERS = 200; // CUST-001 ... CUST-200 come from the survey sample
const FILE_NAME = '04_sample_data.sql';
const DATABASE_FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'database');
export const SQL_FILE = path.join(DATABASE_FOLDER, FILE_NAME);
// The private copy of the real customers (database/private/ is in .gitignore: never in GitHub)
const PRIVATE_NAME = 'private/website_customers.sql';
export const PRIVATE_FILE = path.join(DATABASE_FOLDER, 'private', 'website_customers.sql');

// The part of the file that this code owns (everything between these two lines is rewritten)
const START = '-- >>> WEBSITE CUSTOMERS START (written by the backend, do not edit by hand) >>>';
const END = '-- <<< WEBSITE CUSTOMERS END <<<';

// ---------------------------------------------------------------------
// Small helpers that turn JavaScript values into safe SQL text
// ---------------------------------------------------------------------
function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`; // ' becomes '' inside SQL text
}

const row = (values) => `(${values.map(sqlValue).join(', ')})`;

function dhakaTime(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// ---------------------------------------------------------------------
// 1. Read the new customers from the database
// ---------------------------------------------------------------------
async function readWebsiteCustomers() {
  // account_codes comes from 09_account_security.sql. A login whose email is not
  // confirmed yet is left out until the customer types the code.
  const { rows: check } = await query("SELECT to_regclass('public.account_codes') IS NOT NULL AS has_codes");
  const confirmedSql = check[0].has_codes
    ? `NOT EXISTS (SELECT 1 FROM account_codes a
                   WHERE a.user_id = u.id AND a.purpose = 'confirm_email' AND a.used_at IS NULL)`
    : 'TRUE';

  const { rows: customers } = await query(
    `SELECT c.customer_number, c.full_name, c.phone, c.email, c.address, c.customer_type, c.status,
            c.created_at, c.updated_at,
            u.username, u.email AS login_email, u.full_name AS login_name, u.status AS login_status,
            u.password_hash, u.created_at AS login_created_at,
            (${confirmedSql}) AS email_confirmed
     FROM customers c
     LEFT JOIN users u ON u.id = c.user_id
     WHERE COALESCE(substring(c.customer_number FROM '[0-9]+$')::int, 0) > $1
     ORDER BY c.created_at, c.customer_number`,
    [SAMPLE_CUSTOMERS]
  );

  const { rows: meters } = await query(
    `SELECT c.customer_number, co.meter_number, co.connection_type, co.installation_date, co.status, co.notes, co.created_at
     FROM connections co
     JOIN customers c ON c.id = co.customer_id
     WHERE c.customer_number = ANY($1)
     ORDER BY c.customer_number, co.created_at`,
    [customers.map((c) => c.customer_number)]
  );

  return { customers, meters };
}

// ---------------------------------------------------------------------
// 2. Write the SQL text for the marked part of the file
// ---------------------------------------------------------------------
function buildSection({ customers, meters }, savedAt) {
  const logins = customers.filter((c) => c.username && c.email_confirmed);
  const waiting = customers.filter((c) => c.username && !c.email_confirmed);

  const lines = [
    START,
    '-- =====================================================================',
    `-- 11. Customers who joined after the sample data (website sign-ups and customers added by an admin)`,
    '--     REAL PEOPLE: this file is private (database/private/ is in .gitignore). Never upload it.',
    '--     The backend rewrites it after every sign-up or customer change.',
    '--     Run it after 13_support_and_deletions.sql to bring these customers back.',
    `-- Last saved: ${dhakaTime(savedAt)} (Dhaka time)`,
    `-- Customers: ${customers.length} | Logins: ${logins.length} | Meters: ${meters.length}`,
    '-- =====================================================================',
  ];

  if (customers.length === 0) {
    lines.push('-- Nobody has signed up yet.', END);
    return lines.join('\n');
  }

  lines.push(
    '',
    'INSERT INTO customers (customer_number, full_name, phone, email, address, customer_type, status, created_at, updated_at) VALUES',
    customers
      .map((c) =>
        row([c.customer_number, c.full_name, c.phone, c.email, c.address, c.customer_type, c.status, c.created_at, c.updated_at])
      )
      .join(',\n') + ';'
  );

  if (logins.length > 0) {
    lines.push(
      '',
      '-- Their logins (the password is stored only as a bcrypt hash, never as plain text)',
      'INSERT INTO users (username, email, full_name, role, status, password_hash, created_at) VALUES',
      logins
        .map((c) => row([c.username, c.login_email, c.login_name, 'customer', c.login_status, c.password_hash, c.login_created_at]))
        .join(',\n') + ';',
      '',
      '-- Link each login to its customer profile (both directions)',
      'UPDATE customers c SET user_id = u.id',
      `FROM (VALUES\n${logins.map((c) => row([c.customer_number, c.username])).join(',\n')}\n) AS v(customer_number, username)`,
      'JOIN users u ON u.username = v.username',
      'WHERE c.customer_number = v.customer_number;',
      'UPDATE users u SET customer_id = c.id FROM customers c',
      "WHERE c.user_id = u.id AND u.role = 'customer' AND u.customer_id IS NULL;"
    );
  }
  for (const c of waiting) {
    lines.push(`-- ${c.customer_number}: login "${c.username}" is saved after the customer confirms the email code`);
  }

  if (meters.length > 0) {
    lines.push(
      '',
      '-- Their meters (connections)',
      'INSERT INTO connections (customer_id, meter_number, connection_type, installation_date, status, notes, created_at)',
      'SELECT c.id, v.meter_number, v.connection_type, v.installation_date::date, v.status, v.notes, v.created_at::timestamptz',
      'FROM (VALUES',
      meters
        .map((m) => row([m.customer_number, m.meter_number, m.connection_type, m.installation_date, m.status, m.notes, m.created_at]))
        .join(',\n'),
      ') AS v(customer_number, meter_number, connection_type, installation_date, status, notes, created_at)',
      'JOIN customers c ON c.customer_number = v.customer_number;'
    );
  }

  lines.push(END);
  return lines.join('\n');
}

// ---------------------------------------------------------------------
// 2b. Customers an admin deleted for ever ("Delete permanently", table deleted_customers)
//     A sample customer (CUST-001 ... CUST-200) is written in the first part of the file, one line per
//     row: their customer row, meters, readings, payments, requests, comments and demo login.
//     We take exactly those lines out, so running the file again does not bring them back.
//     (Website customers simply disappear from the marked part, because it is rebuilt from the database.)
// ---------------------------------------------------------------------
async function readDeletedSampleNumbers() {
  const { rows: check } = await query("SELECT to_regclass('public.deleted_customers') IS NOT NULL AS ok");
  if (!check[0].ok) return [];
  const { rows } = await query(
    "SELECT customer_number FROM deleted_customers WHERE COALESCE(substring(customer_number FROM '[0-9]+$')::int, 0) <= $1",
    [SAMPLE_CUSTOMERS]
  );
  return rows.map((r) => r.customer_number);
}

/** One VALUES row of the file, e.g.  ('CUST-001', 'Md. Rafiqul Islam', ...),  */
const isRow = (line) => /^\(.*\)[,;]?\s*$/.test(line.trim());
// The value inside the first quotes of a row: ('46804560', ...) -> 46804560
const firstValue = (line) => line.trim().match(/^\('([^']*)'/)?.[1];

/** Returns the sample part of the file without the rows of the deleted customers. */
function removeDeletedRows(text, numbers) {
  if (numbers.length === 0) return text;
  const lines = text.split('\n');

  // 1. Collect everything that belongs to them: customer numbers, emails, meters and requests
  const customers = new Set(numbers);
  const emails = new Set();
  const meters = new Set();
  const requests = new Set();
  for (const line of lines) {
    if (!isRow(line)) continue;
    const values = [...line.matchAll(/'([^']*)'/g)].map((m) => m[1]);
    if (customers.has(values[0]) && values[3]?.includes('@')) emails.add(values[3]); // customer row: email is the 4th value
    if (customers.has(values[0]) && /^([0-9]+|MET-[0-9]+)$/.test(values[1] || '')) meters.add(values[1]); // meter row
    if (/^REQ-/.test(values[0]) && customers.has(values[1])) requests.add(values[0]); // request row
  }

  // 2. Drop their lines. If a dropped row was the LAST row of a list, the row before it gets its ending.
  const kept = [];
  for (const line of lines) {
    const first = firstValue(line);
    const values = [...line.matchAll(/'([^']*)'/g)].map((m) => m[1]);
    const drop =
      isRow(line) && (customers.has(first) || meters.has(first) || requests.has(first) || values.some((v) => emails.has(v)));
    if (drop) {
      const ending = line.trim().endsWith(');') ? ';' : line.trim().endsWith('),') ? ',' : '';
      if (ending !== ',') {
        const last = kept.length - 1;
        if (last >= 0 && isRow(kept[last])) kept[last] = kept[last].replace(/,(\s*)$/, `${ending}$1`);
      }
      continue;
    }
    // The list of meters that keep an unbilled reading ('78144592', '6968506314', ...)
    if (/^'[^']+'(, '[^']+')*\r?$/.test(line.trim()) && [...meters].some((m) => line.includes(`'${m}'`))) {
      const list = [...line.matchAll(/'([^']*)'/g)].map((m) => m[1]).filter((m) => !meters.has(m));
      kept.push(list.map((m) => `'${m}'`).join(', ') + (line.endsWith('\r') ? '\r' : ''));
      continue;
    }
    // The comment that lists the demo logins:  --     rafiqul.islam   CUST-001 ...
    if (line.startsWith('--') && numbers.some((n) => new RegExp(`\\s${n}\\s`).test(line))) continue;
    kept.push(line);
  }
  return kept.join('\n');
}

// The "Last saved" line changes every time, so it is ignored when we check for real changes
const withoutTime = (text) => text.replace(/^-- Last saved: .*$/m, '');

/** Finds the marked part in the file text: { start, end } character positions, or null. */
function findSection(text) {
  const start = text.indexOf(START);
  const endMark = text.indexOf(END);
  if (start === -1 || endMark === -1 || endMark < start) return null;
  return { start, end: endMark + END.length };
}

/** Writes the whole file at once (temp file, then rename), so two saves can never mix. */
async function writeFileSafely(file, text) {
  const temp = `${file}.saving`;
  try {
    await fs.writeFile(temp, text, 'utf8');
    await fs.rename(temp, file);
  } catch {
    // e.g. OneDrive is busy with the file for a moment: write it directly instead
    await fs.writeFile(file, text, 'utf8');
    await fs.rm(temp, { force: true });
  }
}

/** Reads a file, or returns '' when it does not exist yet. */
async function readIfExists(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return '';
  }
}

/** The whole private file: the activity log is off while it loads, like in 04_sample_data.sql. */
function buildPrivateFile(section, newline) {
  return [
    '-- Sparkility - database/private/website_customers.sql',
    '-- PRIVATE: real customers who signed up on the website (names, phones, emails, password hashes).',
    '-- Written by the backend (utils/saveCustomersToSql.js). database/private/ is in .gitignore: never upload it.',
    '-- Run it after 13_support_and_deletions.sql.',
    '',
    "SELECT set_config('app.skip_audit', 'on', false);",
    '',
    section,
    '',
    "SELECT set_config('app.skip_audit', 'off', false);",
    '',
  ].join('\n').replace(/\n/g, newline);
}

/** Takes the old marked part (real customers, before 26 Nov 2026) out of 04_sample_data.sql. */
function withoutOldSection(text) {
  const place = findSection(text);
  if (!place) return text;
  return text.slice(0, place.start).replace(/(\r?\n)+$/, '$1') + text.slice(place.end).replace(/^(\r?\n)+/, '$1');
}

/** True when 10_auto_save.sql has been run (the history table exists). */
async function hasSaveHistory() {
  const { rows } = await query("SELECT to_regclass('public.sql_file_saves') IS NOT NULL AS ok");
  return rows[0].ok;
}

/** Notes in the database that this computer updated the file (shown on the live website). */
async function recordSave(result) {
  if (!(await hasSaveHistory())) return;
  await query(
    `INSERT INTO sql_file_saves (computer, customers_in_file, logins_in_file, meters_in_file) VALUES ($1, $2, $3, $4)`,
    [os.hostname().slice(0, 100), result.customers, result.logins, result.meters]
  );
}

/** Does database/04_sample_data.sql exist next to this backend? (No on Render: then there is no project folder.) */
export async function sqlFileExists() {
  try {
    await fs.access(SQL_FILE);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------
// 3. Save: read the database, rewrite the marked part, write the file
// ---------------------------------------------------------------------
/** Returns { saved, changed, customers, logins, meters, file } or throws a clear error. */
export async function saveCustomersToSqlFile() {
  let sampleText;
  try {
    sampleText = await fs.readFile(SQL_FILE, 'utf8');
  } catch {
    throw new Error(`database/${FILE_NAME} was not found next to the backend folder (normal on a hosting site like Render)`);
  }
  const newline = sampleText.includes('\r\n') ? '\r\n' : '\n'; // keep Windows line endings if the file has them

  // 1. 04_sample_data.sql (in GitHub) keeps only made-up people:
  //    the old real-customer part is taken out, and sample customers deleted for ever leave it too
  const cleanedSample = removeDeletedRows(withoutOldSection(sampleText), await readDeletedSampleNumbers());
  const sampleChanged = cleanedSample !== sampleText;
  if (sampleChanged) await writeFileSafely(SQL_FILE, cleanedSample);

  // 2. The real customers go into the private file (not in GitHub)
  const data = await readWebsiteCustomers();
  const section = buildSection(data, new Date()).replace(/\n/g, newline);
  const privateText = buildPrivateFile(section, newline);
  const oldPrivate = await readIfExists(PRIVATE_FILE);

  const result = {
    file: `database/${PRIVATE_NAME}`,
    customers: data.customers.length,
    logins: data.customers.filter((c) => c.username && c.email_confirmed).length,
    meters: data.meters.length,
  };

  if (oldPrivate && !sampleChanged && withoutTime(oldPrivate) === withoutTime(privateText)) {
    return { ...result, saved: true, changed: false }; // nothing new: leave the files alone
  }

  await fs.mkdir(path.dirname(PRIVATE_FILE), { recursive: true });
  await writeFileSafely(PRIVATE_FILE, privateText);
  await recordSave(result);
  return { ...result, saved: true, changed: true };
}

/**
 * What the admin page shows.
 * On the laptop (the file is here) the numbers come from the file itself.
 * On the live website (no file there) they come from the last copy noted in sql_file_saves.
 * waiting = customers in the database that are not in the file yet (e.g. the laptop is off).
 */
export async function readSqlFileStatus() {
  const status = { file: `database/${PRIVATE_NAME}`, auto_save: env.saveCustomersToSqlFile, found: false };

  const { rows } = await query(
    "SELECT COUNT(*) AS total FROM customers WHERE COALESCE(substring(customer_number FROM '[0-9]+$')::int, 0) > $1",
    [SAMPLE_CUSTOMERS]
  );
  status.customers_in_database = rows[0].total;

  if (env.saveCustomersToSqlFile && (await sqlFileExists())) {
    const text = await readIfExists(PRIVATE_FILE);
    const place = findSection(text);
    const section = place ? text.slice(place.start, place.end) : '';
    status.found = true;
    status.computer = os.hostname();
    status.last_saved = section.match(/^-- Last saved: (.*) \(Dhaka time\)/m)?.[1] ?? null;
    status.customers_in_file = Number(section.match(/^-- Customers: (\d+)/m)?.[1] ?? 0);
  } else if (await hasSaveHistory()) {
    const last = await query('SELECT saved_at, computer, customers_in_file FROM sql_file_saves ORDER BY saved_at DESC LIMIT 1');
    const row = last.rows[0];
    status.computer = row?.computer ?? null;
    status.last_saved = row ? dhakaTime(row.saved_at) : null;
    status.customers_in_file = row?.customers_in_file ?? 0;
  } else {
    status.customers_in_file = 0;
  }
  status.waiting = Math.max(status.customers_in_database - status.customers_in_file, 0);
  return status;
}

// ---------------------------------------------------------------------
// 4. Automatic saving after changes
// ---------------------------------------------------------------------
let timer = null;
let queue = Promise.resolve(); // one save at a time, never two writes at once

/** Saves a moment later; many changes close together become one save. */
export function scheduleSave() {
  if (!env.saveCustomersToSqlFile) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    queue = queue
      .then(async () => {
        // No project folder here (e.g. Render): the laptop copies the sign-ups later, nothing to do
        if (!(await sqlFileExists())) return { changed: false };
        return saveCustomersToSqlFile();
      })
      .then((r) => {
        if (r.changed) console.log(`[sql file] ${r.file} updated: ${r.customers} website customer(s), ${r.logins} login(s)`);
      })
      .catch((err) => console.error(`[sql file] Not saved: ${err.message}`));
  }, 1000);
}

/**
 * Express middleware: after a change (not a GET) that worked (status below 400),
 * save the customers into the private SQL file. Used in app.js for sign-up, customers, meters and profiles.
 */
export function saveAfterChanges(req, res, next) {
  if (req.method !== 'GET') {
    res.on('finish', () => {
      if (res.statusCode < 400) scheduleSave();
    });
  }
  next();
}
