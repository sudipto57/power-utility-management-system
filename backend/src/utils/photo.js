import { query, queryAs } from '../config/db.js';
import ApiError from './ApiError.js';

// Profile pictures (table customer_photos, database/14_profile_photos.sql).
// The website sends the picture as a "data URL": data:image/jpeg;base64,/9j/4AAQ...
// The first bytes of the file are checked too, so a renamed file is refused.

const MAX_BYTES = 300000; // same limit as the database (14_profile_photos.sql); the website sends about 30-80 KB
const FIRST_BYTES = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/webp': (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
};

/** Checks body.photo and returns { type, data } (data is a Buffer), or throws a 400 error. */
export function readPhoto(photo) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(photo || ''));
  if (!match) throw new ApiError(400, 'Please choose a JPG, PNG or WebP picture');
  const [, type, base64] = match;
  const data = Buffer.from(base64, 'base64');
  if (data.length > MAX_BYTES) throw new ApiError(400, 'The picture is too large (300 KB at most)');
  if (data.length < 12 || !FIRST_BYTES[type](data)) throw new ApiError(400, 'This file is not a real picture');
  return { type, data };
}

/** Saves (or replaces) the picture of one customer. */
export function savePhoto(customerId, userId, photo) {
  return queryAs(
    userId,
    `INSERT INTO customer_photos (customer_id, photo_type, photo_data, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (customer_id) DO UPDATE
       SET photo_type = EXCLUDED.photo_type, photo_data = EXCLUDED.photo_data,
           updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [customerId, photo.type, photo.data, userId]
  );
}

/** Removes the picture of one customer (nothing happens if there is none). */
export function removePhoto(customerId, userId) {
  return queryAs(userId, 'DELETE FROM customer_photos WHERE customer_id = $1', [customerId]);
}

/** The picture as a data URL for an <img src="...">, or null when the customer has none. */
export async function photoUrlFor(customerId) {
  const { rows } = await query('SELECT photo_type, photo_data FROM customer_photos WHERE customer_id = $1', [customerId]);
  if (!rows[0]) return null;
  return `data:${rows[0].photo_type};base64,${rows[0].photo_data.toString('base64')}`;
}
