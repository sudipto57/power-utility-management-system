// One place that turns every error into a JSON answer: { "message": "..." }
// It also translates common PostgreSQL error codes into friendly messages.
import ApiError from '../utils/ApiError.js';

const UNIQUE_MESSAGES = {
  users_username_key: 'That username is already taken',
  users_email_key: 'That email is already used by another login',
  connections_meter_number_key: 'That meter number already exists',
  customers_customer_number_key: 'That customer number already exists',
  bills_bill_number_key: 'That bill number already exists, please try again',
  payments_payment_number_key: 'That payment number already exists, please try again',
  service_requests_request_number_key: 'That request number already exists, please try again',
  meter_readings_one_per_day: 'This meter already has a reading on that date',
  bills_one_per_period: 'This reading is already billed',
  tariff_slabs_order_unique: 'That slab number is already used in this tariff',
  change_requests_one_pending: 'You already have a waiting request for this. Please wait for the office to answer it',
};

const CHECK_MESSAGES = {
  valid_reading: 'Current reading cannot be lower than the previous reading',
  bills_valid_dates: 'The due date must be on or after the end of the billing period',
  bills_amounts_not_negative: 'Bill amounts cannot be negative',
  tariffs_valid_amounts: 'Fixed charge cannot be negative and VAT must be between 0 and 100 %',
  tariff_slabs_valid_range: 'Slab start, end and rate must be valid (end after start, no negatives)',
};

// Express knows this is an error handler because it has FOUR parameters,
// so keep `next` even though we don't use it.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Errors we threw on purpose
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message, ...(err.code ? { code: err.code } : {}) });
  }

  // Bad JSON body sent by the client
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON' });
  }

  // PostgreSQL errors
  switch (err.code) {
    case '23505': // unique_violation
      return res.status(409).json({ message: UNIQUE_MESSAGES[err.constraint] || 'This value already exists' });
    case '23503': // foreign_key_violation
      return res.status(409).json({ message: 'This record is linked to other data and cannot be changed this way' });
    case '23514': // check_violation
      return res.status(400).json({ message: CHECK_MESSAGES[err.constraint] || 'A value is not allowed by the database rules' });
    case '23502': // not_null_violation
      return res.status(400).json({ message: `${err.column || 'A required field'} is required` });
    case '22P02': // invalid_text_representation (e.g. bad UUID)
      return res.status(400).json({ message: 'Invalid id or value format' });
    case 'P0001': // RAISE EXCEPTION from our triggers/functions
      return res.status(400).json({ message: err.message });
    default:
      break;
  }

  // Anything else is a real bug or a connection problem: log it fully, answer briefly
  console.error('[error]', req.method, req.originalUrl, '\n', err);
  return res.status(500).json({ message: 'Something went wrong on the server. Check the backend terminal for details.' });
}

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}
