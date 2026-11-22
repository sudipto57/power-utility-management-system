// npm run db:save-customers
// Copies every customer who joined after the 200 sample customers (website sign-ups and
// customers added by an admin) from the database (Supabase) into database/04_sample_data.sql.
//
// node scripts/saveCustomers.js --every 10
//   keeps running in the background and copies again every 10 minutes.
//   This is what the laptop runs when it starts (see scripts/autoSave.js, npm run auto-save:on),
//   so sign-ups made on the live website while the laptop was off reach the file by themselves.
//   Each run is written to backend/auto-save.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../src/config/db.js';
import { saveCustomersToSqlFile } from '../src/utils/saveCustomersToSql.js';

const backendFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_FILE = path.join(backendFolder, 'auto-save.log');
const LOCK_FILE = path.join(backendFolder, 'auto-save.lock'); // holds the process number while running

const everyIndex = process.argv.indexOf('--every');
const minutes = everyIndex === -1 ? 0 : Number(process.argv[everyIndex + 1]) || 10;

function log(message) {
  const time = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' });
  const line = `[${time}] ${message}`;
  console.log(line);
  if (minutes) fs.appendFileSync(LOG_FILE, `${line}\n`);
}

async function saveOnce() {
  const result = await saveCustomersToSqlFile();
  if (result.changed || !minutes) {
    log(`${result.file} ${result.changed ? 'updated' : 'was already up to date'}: ` +
      `${result.customers} website customer(s), ${result.logins} login(s), ${result.meters} meter(s)`);
  }
}

/** Is another copy of this background job already running? (checks the process number in the lock file) */
function alreadyRunning() {
  try {
    // A lock file from before the laptop was last switched on is old: that job is gone
    const startedThisBoot = fs.statSync(LOCK_FILE).mtimeMs > Date.now() - os.uptime() * 1000;
    if (!startedThisBoot) return false;
    const pid = Number(fs.readFileSync(LOCK_FILE, 'utf8'));
    process.kill(pid, 0); // throws if that process does not exist any more
    return pid !== process.pid;
  } catch {
    return false;
  }
}

if (!minutes) {
  // ----- one copy, then stop (npm run db:save-customers) -----
  try {
    await saveOnce();
  } catch (err) {
    console.error(`\nCould not save: ${err.message}\n`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
} else {
  // ----- background job: copy now, then every N minutes -----
  if (alreadyRunning()) {
    console.log('The auto-save job is already running.');
    process.exit(0);
  }
  fs.writeFileSync(LOCK_FILE, String(process.pid));
  const removeLock = () => fs.rmSync(LOCK_FILE, { force: true });
  process.on('exit', removeLock);
  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));

  log(`Auto-save started: copying website sign-ups into 04_sample_data.sql every ${minutes} minutes`);
  const run = async () => {
    let wait = minutes;
    try {
      await saveOnce();
    } catch (err) {
      // Usually "no internet yet" right after the laptop starts: try again in 1 minute
      log(`Not saved (will try again in 1 minute): ${err.message}`);
      wait = 1;
    }
    setTimeout(run, wait * 60 * 1000);
  };
  run();
}
