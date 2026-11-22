// Bill estimator on the first page (public: tariff prices are not private data)
import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { CONNECTION_TYPES, CUSTOMER_TYPES } from '../utils/constants.js';
import { requireOneOf, requireWholeNumber } from '../utils/validate.js';

const MAX_UNITS = 100000;

// How the units are split over the slabs of the active tariff (same rule as calculate_bill_amount)
const SLAB_SPLIT_SQL = `
  WITH tariff AS (
    SELECT t.id
    FROM tariffs t
    WHERE t.customer_type = $1 AND t.connection_type = $2
      AND t.is_active = TRUE AND t.effective_from <= CURRENT_DATE
      AND (t.effective_to IS NULL OR t.effective_to >= CURRENT_DATE)
    ORDER BY t.effective_from DESC
    LIMIT 1
  ),
  slabs AS (
    SELECT s.slab_order, s.start_unit, s.end_unit, s.rate_per_unit,
           s.end_unit - GREATEST(s.start_unit - 1, 0) AS slab_size   -- NULL for the last slab (no limit)
    FROM tariff_slabs s JOIN tariff ON tariff.id = s.tariff_id
  ),
  filled AS (
    SELECT *, COALESCE(SUM(slab_size) OVER (ORDER BY slab_order ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS units_before
    FROM slabs
  )
  SELECT slab_order, start_unit, end_unit, rate_per_unit,
         GREATEST(0, LEAST(COALESCE(slab_size, $3 - units_before), $3 - units_before)) AS units,
         ROUND(GREATEST(0, LEAST(COALESCE(slab_size, $3 - units_before), $3 - units_before)) * rate_per_unit, 2) AS amount
  FROM filled
  ORDER BY slab_order`;

/** The price bands of the active tariff, cheapest first: [{ slab_order, start_unit, end_unit, rate_per_unit }] */
export async function activeSlabs(customerType, connectionType) {
  const { rows } = await query(
    `SELECT s.slab_order, s.start_unit, s.end_unit, s.rate_per_unit
     FROM tariff_slabs s
     WHERE s.tariff_id = (
       SELECT t.id FROM tariffs t
       WHERE t.customer_type = $1 AND t.connection_type = $2
         AND t.is_active = TRUE AND t.effective_from <= CURRENT_DATE
         AND (t.effective_to IS NULL OR t.effective_to >= CURRENT_DATE)
       ORDER BY t.effective_from DESC LIMIT 1)
     ORDER BY s.slab_order`,
    [customerType, connectionType]
  );
  return rows;
}

// GET /api/tariffs/estimate?customer_type=Residential&connection_type=Single Phase&units=250
export async function estimateBill(req, res) {
  const customerType = requireOneOf(req.query.customer_type, CUSTOMER_TYPES, 'Customer type');
  const connectionType = requireOneOf(req.query.connection_type, CONNECTION_TYPES, 'Connection type');
  const units = requireWholeNumber(req.query.units, 'Units', { min: 0 });
  if (units > MAX_UNITS) throw new ApiError(400, `Units must be at most ${MAX_UNITS}`);

  // The amounts come from the database bill function, exactly like a real bill
  const [totals, slabs] = await Promise.all([
    query('SELECT * FROM calculate_bill_amount($1, $2, $3)', [customerType, connectionType, units]),
    query(SLAB_SPLIT_SQL, [customerType, connectionType, units]),
  ]);

  res.json({
    data: {
      customer_type: customerType,
      connection_type: connectionType,
      units,
      slabs: slabs.rows,
      ...totals.rows[0], // fixed_charge, variable_charge, tax_amount, total_amount
    },
  });
}
