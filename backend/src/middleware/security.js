// Two small safety layers for the API (no extra library needed).
import env from '../config/env.js';

/**
 * Safety headers on every answer. They tell the browser:
 * - do not guess file types, do not show the API inside another website (clickjacking),
 * - do not send our address to other sites, and (on the live site) always use HTTPS.
 */
export function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Cache-Control': 'no-store', // answers can contain personal data: never keep a copy
  });
  if (env.isProduction) {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

/**
 * rateLimit({ max: 10, minutes: 15 })  ->  each visitor (IP address) may call that route
 * at most 10 times in 15 minutes. Stops people from guessing passwords or codes, and
 * from making the server send hundreds of emails.
 * The counts are kept in memory, so they reset when the server restarts.
 */
export function rateLimit({ max, minutes }) {
  const windowMs = minutes * 60 * 1000;
  const hits = new Map(); // "ip" -> { count, resetAt }

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    // Forget old visitors now and then, so the map does not grow forever
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }

    if (entry.count > max) {
      const waitMinutes = Math.ceil((entry.resetAt - now) / 60000);
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({
        message: `Too many tries. Please wait ${waitMinutes} minute${waitMinutes === 1 ? '' : 's'} and try again.`,
      });
    }
    return next();
  };
}
