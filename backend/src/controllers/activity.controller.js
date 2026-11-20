// Extra feature: activity log (who changed what, and when)
// The rows are written by the database trigger log_change() (database/11_extra_features.sql),
// so nothing here has to remember to log: every change to the watched tables is saved.
import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { clean, optionalOneOf } from '../utils/validate.js';
import { AUDITED_TABLES } from '../utils/constants.js';

const ACTIONS = ['INSERT', 'UPDATE', 'DELETE'];

// A human-friendly name for the changed row (e.g. "BILL-2026-013").
// First from the row as it is now; for a deleted row, from the values saved in the log (saved.v).
const LABEL_SQL = `
  COALESCE(
    CASE a.table_name
      WHEN 'customers' THEN (SELECT x.customer_number || ' ' || x.full_name FROM customers x WHERE x.id = a.record_id)
      WHEN 'connections' THEN (SELECT 'Meter ' || x.meter_number FROM connections x WHERE x.id = a.record_id)
      WHEN 'meter_readings' THEN (SELECT 'Meter ' || co.meter_number || ', ' || to_char(x.reading_date, 'DD Mon YYYY')
                                  FROM meter_readings x JOIN connections co ON co.id = x.connection_id
                                  WHERE x.id = a.record_id)
      WHEN 'bills' THEN (SELECT x.bill_number FROM bills x WHERE x.id = a.record_id)
      WHEN 'payments' THEN (SELECT x.payment_number FROM payments x WHERE x.id = a.record_id)
      WHEN 'service_requests' THEN (SELECT x.request_number FROM service_requests x WHERE x.id = a.record_id)
      WHEN 'bill_adjustments' THEN (SELECT x.adjustment_type || ' on ' || b.bill_number
                                    FROM bill_adjustments x JOIN bills b ON b.id = x.bill_id WHERE x.id = a.record_id)
      WHEN 'outage_notices' THEN (SELECT x.title FROM outage_notices x WHERE x.id = a.record_id)
      WHEN 'meter_replacements' THEN (SELECT x.old_meter_number || ' -> ' || x.new_meter_number
                                      FROM meter_replacements x WHERE x.id = a.record_id)
    END,
    saved.v ->> 'customer_number', saved.v ->> 'meter_number', saved.v ->> 'bill_number',
    saved.v ->> 'payment_number', saved.v ->> 'request_number', saved.v ->> 'title',
    saved.v ->> 'new_meter_number', saved.v ->> 'adjustment_type', saved.v ->> 'reading_date'
  )`;

// GET /api/activity?table=&action=&search=&limit=
//   search = a bill / customer / meter / payment / request number, or the name of who made the change
export async function listActivity(req, res) {
  const table = optionalOneOf(req.query.table, AUDITED_TABLES, 'table');
  const action = optionalOneOf(req.query.action, ACTIONS, 'action');
  const search = clean(req.query.search);
  const limit = Number(req.query.limit || 200);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new ApiError(400, 'limit must be between 1 and 500');

  const { rows } = await query(
    `SELECT * FROM (
       SELECT a.id, a.table_name, a.record_id, a.action, a.old_values, a.new_values, a.changed_at,
              u.full_name AS changed_by_name, u.role AS changed_by_role,
              ${LABEL_SQL} AS label
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.changed_by
       -- the values saved in the log (a deleted row only has these)
       CROSS JOIN LATERAL (SELECT COALESCE(a.old_values, '{}') || COALESCE(a.new_values, '{}') AS v) saved
       WHERE ($1::text IS NULL OR a.table_name = $1)
         AND ($2::text IS NULL OR a.action = $2)
     ) activity
     WHERE ($3::text IS NULL OR activity.label ILIKE $3 OR activity.changed_by_name ILIKE $3)
     ORDER BY activity.id DESC
     LIMIT $4`,
    [table, action, search ? `%${search}%` : null, limit]
  );
  res.json({ data: rows });
}
