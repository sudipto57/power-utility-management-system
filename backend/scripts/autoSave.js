// Turns the laptop's automatic copy of website sign-ups ON or OFF (Windows).
//
//   npm run auto-save:on      start now + start again every time Windows starts (you log in)
//   npm run auto-save:off     stop it and do not start it any more
//   npm run auto-save:status  is it on? what did it do last?
//
// How it works: "on" puts a small file "Power Utility auto-save.cmd" in your Windows
// Startup folder. Windows runs every file in that folder when you log in. The file starts
// "node scripts/saveCustomers.js --every 10" hidden in the background, which copies new
// sign-ups from Supabase into database/private/website_customers.sql (private, not in GitHub) right away and then every 10 minutes.
// It needs backend/.env (the same database settings the backend uses) and an internet connection.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const backendFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_FILE = path.join(backendFolder, 'auto-save.log');
const LOCK_FILE = path.join(backendFolder, 'auto-save.lock');
const MINUTES = 10;

const startupFolder = path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const startupFile = path.join(startupFolder, 'Power Utility auto-save.cmd');

const command = process.argv[2] || 'status';

/** Process number of the running background job, or null. */
function runningPid() {
  try {
    // a lock file from before the laptop was last switched on is old
    if (fs.statSync(LOCK_FILE).mtimeMs < Date.now() - os.uptime() * 1000) return null;
    const pid = Number(fs.readFileSync(LOCK_FILE, 'utf8'));
    process.kill(pid, 0);
    return pid;
  } catch {
    return null;
  }
}

/** Starts the background job now, hidden, without a terminal window. */
function startNow() {
  const child = spawn(process.execPath, ['scripts/saveCustomers.js', '--every', String(MINUTES)], {
    cwd: backendFolder,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

/** The text of the Startup file. PowerShell starts node hidden, in the backend folder. */
function startupFileText() {
  const quote = (text) => `'${text.replace(/'/g, "''")}'`; // PowerShell 'text' (a ' inside becomes '')
  return [
    '@echo off',
    'rem Power Utility Management System: copies website sign-ups from Supabase into',
    `rem database\\private\\website_customers.sql when Windows starts, then every ${MINUTES} minutes.`,
    'rem Made by "npm run auto-save:on" in the backend folder. Remove it with "npm run auto-save:off".',
    `powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath ${quote(process.execPath)} ` +
      `-ArgumentList 'scripts/saveCustomers.js --every ${MINUTES}' -WorkingDirectory ${quote(backendFolder)} -WindowStyle Hidden"`,
    '',
  ].join('\r\n');
}

function lastLogLines(count) {
  try {
    return fs.readFileSync(LOG_FILE, 'utf8').trim().split(/\r?\n/).slice(-count);
  } catch {
    return [];
  }
}

if (process.platform !== 'win32' && command !== 'status') {
  console.log('\nauto-save:on/off is made for Windows. On other computers run "npm run db:save-customers" when needed.\n');
  process.exit(0);
}

if (command === 'on') {
  fs.mkdirSync(startupFolder, { recursive: true });
  fs.writeFileSync(startupFile, startupFileText());
  if (!runningPid()) startNow();
  console.log('\nAuto-save is ON.');
  console.log(`  Starts with Windows: ${startupFile}`);
  console.log(`  Copies new website sign-ups into database/private/website_customers.sql now and every ${MINUTES} minutes.`);
  console.log('  Check it any time with: npm run auto-save:status\n');
} else if (command === 'off') {
  fs.rmSync(startupFile, { force: true });
  const pid = runningPid();
  if (pid) process.kill(pid);
  console.log('\nAuto-save is OFF. (Turn it on again with: npm run auto-save:on)\n');
} else {
  const pid = runningPid();
  console.log(`\nStarts with Windows: ${fs.existsSync(startupFile) ? 'yes' : 'no'}`);
  console.log(`Running now:         ${pid ? `yes (process ${pid})` : 'no'}`);
  const lines = lastLogLines(5);
  console.log(lines.length ? `Last messages (backend/auto-save.log):\n  ${lines.join('\n  ')}\n` : 'No messages yet.\n');
}
