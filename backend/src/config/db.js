// PostgreSQL connection pool (works with Supabase and with a local PostgreSQL).
import pg from 'pg';
import env from './env.js';

const { Pool, types } = pg;

// Make PostgreSQL types friendly for JavaScript:
types.setTypeParser(1700, (value) => (value === null ? null : parseFloat(value))); // NUMERIC/DECIMAL -> number
types.setTypeParser(20, (value) => (value === null ? null : parseInt(value, 10))); // BIGINT (COUNT) -> number
types.setTypeParser(1082, (value) => value); // DATE -> plain 'YYYY-MM-DD' text (no timezone shifting)

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  // Supabase needs SSL. rejectUnauthorized:false accepts Supabase's certificate without extra files.
  ssl: env.db.ssl ? { rejectUnauthorized: false } : false,
  max: 5, // small pool: plenty for a student project and friendly to Supabase limits
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

// An idle connection can be closed by the server (e.g. Supabase restarts).
// Log it instead of crashing the whole API.
pool.on('error', (err) => {
  console.error('[db] idle connection error:', err.message);
});

/** Run one SQL statement. Always pass user values in `params` ($1, $2 ...). */
export function query(text, params = []) {
  return pool.query(text, params);
}

/**
 * Run several statements as ONE transaction (all succeed or all are undone).
 * Usage: await withTransaction(async (client) => { await client.query(...); }, req.user.id);
 *
 * userId (optional) = who is logged in. It is saved for this transaction only, so the
 * activity log (database/11_extra_features.sql) can write down who made each change.
 */
export async function withTransaction(work, userId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (userId) await setAuditUser(client, userId);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Tells the database who is making the changes in the current transaction.
 * The activity-log trigger reads it with current_setting('app.user_id').
 * (true = only for this transaction; the connection forgets it afterwards.)
 */
export function setAuditUser(client, userId) {
  return client.query("SELECT set_config('app.user_id', $1, true)", [String(userId)]);
}

/** One change (INSERT / UPDATE / DELETE) that the activity log should credit to a user. */
export function queryAs(userId, text, params = []) {
  return withTransaction((client) => client.query(text, params), userId);
}

/** Turn low-level connection errors into advice a beginner can act on. */
export function explainDbError(err) {
  const msg = String(err?.message || err);
  const code = err?.code;
  const tips = [];

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    tips.push('The DB_HOST name could not be found. Check the spelling and your internet connection.');
    tips.push('For Supabase use the "Session pooler" host, e.g. aws-0-<region>.pooler.supabase.com');
  } else if (code === 'ENETUNREACH' || code === 'EHOSTUNREACH' || code === 'EADDRNOTAVAIL') {
    tips.push('Your network cannot reach this host. The Supabase "Direct connection" (db.<ref>.supabase.co) needs IPv6.');
    tips.push('Use the Supabase "Session pooler" values instead (Connect button -> Session pooler).');
  } else if (code === 'ECONNREFUSED') {
    tips.push('Nothing is listening on DB_HOST:DB_PORT. Is PostgreSQL running? Is the port right (5432)?');
  } else if (code === 'ETIMEDOUT' || /timeout/i.test(msg)) {
    tips.push('The database did not answer in time. Check internet/firewall, and that your Supabase project is not paused.');
  } else if (code === '28P01' || /password authentication failed/i.test(msg)) {
    tips.push(
      'Wrong DB_USER or DB_PASSWORD. Use exactly what works in pgAdmin. You can reset the password in Supabase -> Project Settings -> Database.'
    );
  } else if (code === '3D000') {
    tips.push('DB_NAME does not exist. On Supabase it is "postgres". Locally create it first (e.g. power_utility_db).');
  } else if (/tenant or user not found/i.test(msg)) {
    tips.push('Supabase pooler needs DB_USER in the form postgres.<project-ref> (copy it from Connect -> Session pooler).');
  } else if (/does not support SSL/i.test(msg)) {
    tips.push('Your database does not use SSL. Set DB_SSL=false in backend/.env (normal for a local PostgreSQL).');
  } else if (/SSL|certificate/i.test(msg)) {
    tips.push('SSL problem. For Supabase set DB_SSL=true. For local PostgreSQL set DB_SSL=false.');
  }
  return tips;
}

export default pool;
