// npm run db:test
// Checks backend/.env + the database connection WITHOUT starting the API.
import env from '../src/config/env.js';
import pool, { explainDbError } from '../src/config/db.js';

console.log(`\nConnecting to ${env.db.host}:${env.db.port} / ${env.db.database} as ${env.db.user} (SSL: ${env.db.ssl}) ...`);

try {
  const { rows } = await pool.query('SELECT version() AS version, NOW() AS now');
  console.log('Connected!');
  console.log(`  ${rows[0].version.split(',')[0]}`);
  console.log(`  Server time: ${rows[0].now.toISOString()}`);

  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`
  );
  console.log(`  Tables found (${tables.rows.length}): ${tables.rows.map((r) => r.table_name).join(', ') || 'none'}`);

  const counts = await pool
    .query(
      `SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM customers) AS customers,
            (SELECT COUNT(*) FROM bills) AS bills`
    )
    .catch(() => null);
  if (counts) {
    const c = counts.rows[0];
    console.log(`  Rows: ${c.users} users, ${c.customers} customers, ${c.bills} bills`);
  } else {
    console.log('  The project tables are not there yet. Run the SQL files in the database folder.');
  }
  console.log('\nAll good. Start the API with:  npm run dev\n');
} catch (err) {
  console.error(`\nConnection FAILED: ${err.message}`);
  for (const tip of explainDbError(err)) console.error(`  Tip: ${tip}`);
  console.error('');
  process.exitCode = 1;
} finally {
  await pool.end();
}
