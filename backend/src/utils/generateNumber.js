// Creates the next human-friendly number, e.g. CUST-009, MET-0902, BILL-2026-013.
// It looks at the highest number already in the table and adds 1.
// (The UNIQUE constraint in the database is the final safety net.)

const SOURCES = {
  customer: { table: 'customers', column: 'customer_number', prefix: () => 'CUST-', digits: 3 },
  meter: { table: 'connections', column: 'meter_number', prefix: () => 'MET-', digits: 4 },
  bill: { table: 'bills', column: 'bill_number', prefix: (year) => `BILL-${year}-`, digits: 3 },
  payment: { table: 'payments', column: 'payment_number', prefix: (year) => `PAY-${year}-`, digits: 3 },
  request: { table: 'service_requests', column: 'request_number', prefix: (year) => `REQ-${year}-`, digits: 3 },
};

/**
 * @param {object} db   - anything with .query() (the pool, or a transaction client)
 * @param {'customer'|'meter'|'bill'|'payment'|'request'} kind
 */
export async function generateNumber(db, kind) {
  const source = SOURCES[kind];
  if (!source) throw new Error(`Unknown number kind: ${kind}`);

  const prefix = source.prefix(new Date().getFullYear());
  // Table/column names come from the fixed list above (never from the user), so this is safe.
  const sql = `
    SELECT COALESCE(MAX(CAST(SUBSTRING(${source.column} FROM '([0-9]+)$') AS INTEGER)), 0) AS last_number
    FROM ${source.table}
    WHERE ${source.column} LIKE $1`;
  const { rows } = await db.query(sql, [`${prefix}%`]);
  const next = rows[0].last_number + 1;
  return prefix + String(next).padStart(source.digits, '0');
}
