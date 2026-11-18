// Starts the API:  npm run dev
// 1. checks the database connection (with clear tips if it fails)
// 2. checks that the tables exist
// 3. starts listening on PORT (default 5000)
import env from './config/env.js';
import pool, { explainDbError } from './config/db.js';
import app from './app.js';

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
  return true;
}

const ok = await checkDatabase();
if (!ok) {
  await pool.end().catch(() => {});
  process.exit(1);
}

const server = app.listen(env.port, () => {
  console.log('\n  Power Utility Management System API');
  console.log(`  Running on   http://localhost:${env.port}/api`);
  console.log(`  Health check http://localhost:${env.port}/api/health`);
  console.log(`  Database     ${env.db.host} / ${env.db.database}`);
  console.log(
    env.email.brevoApiKey && env.email.from
      ? `  Emails       sent from ${env.email.from} (Brevo)\n`
      : '  Emails       NOT sent: printed here instead (add BREVO_API_KEY and EMAIL_FROM to send real emails)\n'
  );
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
