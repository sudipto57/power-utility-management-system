// Loads backend/.env and checks that every required setting is present.
// If something is missing we stop early with a clear message instead of
// failing later with a confusing error.
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const envPath = path.join(backendRoot, '.env');

if (!fs.existsSync(envPath)) {
  console.error('\n[setup] backend/.env file not found.');
  console.error('        Copy backend/.env.example to backend/.env and fill in your database values.\n');
  process.exit(1);
}

dotenv.config({ path: envPath, quiet: true });

const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key] || !process.env[key].trim());

if (missing.length > 0) {
  console.error(`\n[setup] These values are empty in backend/.env: ${missing.join(', ')}\n`);
  process.exit(1);
}

if (process.env.DB_PASSWORD === 'your-database-password' || process.env.DB_USER === 'postgres.your-project-ref') {
  console.error('\n[setup] backend/.env still has the example values.');
  console.error('        Put your real DB_USER and DB_PASSWORD (the same ones pgAdmin uses).\n');
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
};

export default env;
