// Starts the API:  npm run dev
// 1. checks the database connection (with clear tips if it fails)
// 2. checks that the tables exist
// 3. starts listening on PORT (default 5000)
import env from './config/env.js';
import pool, { explainDbError } from './config/db.js';
import app from './app.js';
import { scheduleSave } from './utils/saveCustomersToSql.js';

async function checkDatabase() {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.error('\n[database] Could not connect to PostgreSQL.');
    console.error(
      `           Host: ${env.db.host}:${env.db.port}  Database: ${env.db.database}  User: ${env.db.user}  SSL: ${env.db.ssl}`
    );
    console.error(`           Error: ${err.message}`);
    for (const tip of explainDbError(err)) console.error(`           Tip: ${tip}`);
    console.error('');
    return false;
  }

  const { rows } = await pool.query(
    `SELECT to_regclass('public.users') AS users_table, to_regclass('public.account_codes') AS codes_table,
            to_regprocedure('calculate_bill_amount(varchar, varchar, integer)') AS bill_function`
  );
  if (!rows[0].users_table || !rows[0].bill_function) {
    console.error('\n[database] Connected, but the project tables/functions are missing or out of date.');
    console.error(
      '           Run the SQL files in the database folder (00 -> 04, then 07 on Supabase). See database/README.md\n'
    );
    return false;
  }
  if (!rows[0].codes_table) {
    console.error('\n[database] Connected, but the tables for email codes and change requests are missing.');
    console.error('           Run database/09_account_security.sql once (pgAdmin or the Supabase SQL Editor).\n');
    return false;
  }
  // 18 Nov 2026: account_codes must also accept login codes (the newer 09 file adds them)
  const loginCodes = await pool.query(
    "SELECT 1 FROM pg_constraint WHERE conname = 'account_codes_purpose_check' AND pg_get_constraintdef(oid) LIKE '%login%'"
  );
  // 20 Nov 2026: history of copies into database/private/website_customers.sql (not required, the API still works without it)
  const saves = await pool.query("SELECT to_regclass('public.sql_file_saves') AS saves_table");
  if (!saves.rows[0].saves_table) {
    console.warn('\n[database] Tip: run database/10_auto_save.sql once, so the website can show when the');
    console.warn('           laptop last copied new sign-ups into database/private/website_customers.sql (private, not in GitHub).\n');
  }
  if (!loginCodes.rows[0]) {
    console.error('\n[database] The database is missing the newest change for customer login codes.');
    console.error('           Run database/09_account_security.sql again (it is safe to run more than once).\n');
    return false;
  }
  // 20 Nov 2026: activity log, late fees, statement, usage alerts, outages, meter replacement
  const extras = await pool.query(
    `SELECT to_regclass('public.audit_log') AS audit_table, to_regclass('public.bill_balance') AS balance_view,
            to_regprocedure('replace_meter(uuid, varchar, integer, integer, date, text, uuid)') AS replace_function,
            to_regprocedure('meter_number_on(uuid, date)') AS meter_function`
  );
  const x = extras.rows[0];
  if (!x.audit_table || !x.balance_view || !x.replace_function || !x.meter_function) {
    console.error('\n[database] Connected, but the tables and views for the extra features are missing.');
    console.error('           Run database/11_extra_features.sql (pgAdmin or the Supabase SQL Editor). It is safe to run again.\n');
    return false;
  }
  // 21 Nov 2026: the customer inbox (the bell, reminders, messages about bills, payments and readings)
  const inbox = await pool.query("SELECT to_regclass('public.notifications') AS inbox_table");
  if (!inbox.rows[0].inbox_table) {
    console.error('\n[database] Connected, but the table for the customer inbox is missing.');
    console.error('           Run database/12_customer_inbox.sql once (pgAdmin or the Supabase SQL Editor).\n');
    return false;
  }
  // 25 Nov 2026: the Support form and "Delete permanently"
  const support = await pool.query(
    "SELECT to_regclass('public.support_tickets') AS support_table, to_regclass('public.deleted_customers') AS deleted_table"
  );
  if (!support.rows[0].support_table || !support.rows[0].deleted_table) {
    console.error('\n[database] Connected, but the tables for Support and permanent deletes are missing.');
    console.error('           Run database/13_support_and_deletions.sql once (pgAdmin or the Supabase SQL Editor).\n');
    return false;
  }
  // 27 Nov 2026: customer profile pictures
  const photos = await pool.query("SELECT to_regclass('public.customer_photos') AS photo_table");
  if (!photos.rows[0].photo_table) {
    console.error('\n[database] Connected, but the table for profile pictures is missing.');
    console.error('           Run database/14_profile_photos.sql once (pgAdmin or the Supabase SQL Editor).\n');
    return false;
  }
  return true;
}

const ok = await checkDatabase();
if (!ok) {
  await pool.end().catch(() => {});
  process.exit(1);
}

const server = app.listen(env.port, () => {
  console.log('\n  Sparkility API');
  console.log(`  Running on   http://localhost:${env.port}/api`);
  console.log(`  Health check http://localhost:${env.port}/api/health`);
  console.log(`  Database     ${env.db.host} / ${env.db.database}`);
  console.log(
    env.email.brevoApiKey && env.email.from
      ? `  Emails       sent from ${env.email.from} (Brevo)\n`
      : '  Emails       NOT sent: printed here instead (add BREVO_API_KEY and EMAIL_FROM to send real emails)\n'
  );
  // Catch up: copy any sign-ups made while the backend was off into database/private/website_customers.sql (private, not in GitHub)
  scheduleSave();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n[server] Port ${env.port} is already in use. Close the other terminal running the backend, or change PORT in backend/.env\n`
    );
  } else {
    console.error('[server]', err);
  }
  process.exit(1);
});
