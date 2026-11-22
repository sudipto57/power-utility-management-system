// Puts a message in a customer's inbox (the bell in the top bar).
// The notifications table comes from database/12_customer_inbox.sql.
//
// Example:
//   await notifyCustomer(customerId, { kind: 'bill', title: 'New bill', message: '...', link: '/my/bills/<id>' });
//
// The inbox is extra: if writing the message fails, the main action (bill, payment ...)
// is already saved, so we only print the problem and carry on.
// Call it AFTER the main change is saved (not inside withTransaction).
import { query } from '../config/db.js';

export async function notifyCustomer(customerId, { kind, title, message, link = null, refId = null }) {
  try {
    await query(
      'INSERT INTO notifications (customer_id, kind, title, message, link, ref_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [customerId, kind, title.slice(0, 150), message, link, refId]
    );
  } catch (err) {
    console.error('[inbox] Could not save the message:', err.message);
  }
}
