// Loads backend/.env (on your computer) and checks that every required setting is present.
// On a hosting site like Render there is no .env file: the same settings are typed into
// the website's "Environment" page instead, so a missing file is fine there.
// If something is missing we stop early with a clear message instead of
// failing later with a confusing error.
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const envPath = path.join(backendRoot, '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
}

const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key] || !process.env[key].trim());

if (missing.length > 0) {
  console.error(`\n[setup] These settings are missing: ${missing.join(', ')}`);
  console.error('        On your computer: copy backend/.env.example to backend/.env and fill them in.');
  console.error('        On Render: add them on the service\'s Environment page.\n');
  process.exit(1);
}

if (process.env.DB_PASSWORD === 'your-database-password' || process.env.DB_USER === 'postgres.your-project-ref') {
  console.error('\n[setup] backend/.env still has the example values.');
  console.error('        Put your real DB_USER and DB_PASSWORD (the same ones pgAdmin uses).\n');
  process.exit(1);
}

// A short login secret can be guessed, so the live website refuses to start with one
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.trim().length < 32) {
  console.error('\n[setup] JWT_SECRET is too short. Use a long random text (64+ characters), see backend/.env.example\n');
  process.exit(1);
}

const env = {
  port: Number(process.env.PORT) || 5000,
  db: {
    host: process.env.DB_HOST.trim(),
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME.trim(),
    user: process.env.DB_USER.trim(),
    password: process.env.DB_PASSWORD,
    ssl:
      String(process.env.DB_SSL || 'false')
        .trim()
        .toLowerCase() === 'true',
  },
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean),
  isProduction: process.env.NODE_ENV === 'production',
  // Emails (codes and bills) are sent through Brevo's free email API.
  // Without BREVO_API_KEY the emails are printed in this terminal instead (handy for testing).
  email: {
    brevoApiKey: (process.env.BREVO_API_KEY || '').trim(),
    from: (process.env.EMAIL_FROM || '').trim(),
    fromName: (process.env.EMAIL_FROM_NAME || 'Power Utility Management System').trim(),
  },
  // Copy website sign-ups into database/04_sample_data.sql (see utils/saveCustomersToSql.js).
  // On your computer leave it on. On Render set SAVE_CUSTOMERS_TO_SQL_FILE=false (there is no project folder there).
  saveCustomersToSqlFile: (process.env.SAVE_CUSTOMERS_TO_SQL_FILE || 'true').trim().toLowerCase() !== 'false',
  // The website address used in email links (the first CLIENT_URL if APP_URL is not set)
  appUrl: (process.env.APP_URL || (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0]).trim().replace(/\/$/, ''),
};

export default env;
