// npm run staff:password
//   Sets the password of the staff (admin) logins in the database that backend/.env points to.
// npm run staff:password -- PUMSadmin
//   Sets it for one staff login only.
//
// Why: the staff password is private, so it is never written in GitHub, not even as a hash.
// database/04_sample_data.sql creates the 3 staff logins LOCKED (they cannot log in).
// Run this once after loading 04 on a new database, then log in on the Admin tab.
import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';
import { passwordProblem } from '../src/utils/validate.js';

const onlyUser = process.argv[2] || null;

async function main() {
  // Read the answers line by line (works when typing and when the answers are piped in)
  const input = readline.createInterface({ input: process.stdin });
  const lines = input[Symbol.asyncIterator]();
  const ask = async (question) => {
    process.stdout.write(question);
    const { value } = await lines.next();
    return value ?? '';
  };
  console.log('\nThe password is shown while you type, so make sure nobody is watching the screen.');
  const password = await ask(`New staff password${onlyUser ? ` for ${onlyUser}` : ' (all staff logins)'}: `);
  const again = await ask('Type it again: ');
  input.close();

  if (password !== again) throw new Error('The two passwords are not the same. Nothing was changed.');
  const problem = passwordProblem(password, { username: onlyUser || '' });
  if (problem) throw new Error(`The password ${problem}. Nothing was changed.`);

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `UPDATE users SET password_hash = $1
     WHERE role = 'admin' AND ($2::text IS NULL OR LOWER(username) = LOWER($2))
     RETURNING username`,
    [hash, onlyUser]
  );
  if (rows.length === 0) throw new Error(`No staff login found${onlyUser ? ` with the username ${onlyUser}` : ''}.`);
  console.log(`\nDone. New password set for: ${rows.map((r) => r.username).join(', ')}`);
  console.log('Share it with the team privately (never in GitHub, chat groups or screenshots).\n');
}

main()
  .catch((err) => {
    console.error(`\n[staff password] ${err.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
