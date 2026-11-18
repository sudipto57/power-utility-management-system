// npm run db:save-customers
// Copies every customer who joined after the 200 sample customers (website sign-ups and
// customers added by an admin) from the database into database/04_sample_data.sql.
// Use it after sign-ups on the live website (Render), where the backend cannot reach your project folder.
import pool from '../src/config/db.js';
import { saveCustomersToSqlFile } from '../src/utils/saveCustomersToSql.js';

try {
  const result = await saveCustomersToSqlFile();
  console.log(`\n${result.file} ${result.changed ? 'updated' : 'was already up to date'}.`);
  console.log(`  Website customers: ${result.customers}   Logins: ${result.logins}   Meters: ${result.meters}\n`);
} catch (err) {
  console.error(`\nCould not save: ${err.message}\n`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
