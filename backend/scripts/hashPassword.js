// npm run hash -- mySecretPassword
// Prints a bcrypt hash you can paste into the users.password_hash column (e.g. to reset a password in pgAdmin).
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.log('Usage: npm run hash -- yourPassword');
  process.exit(1);
}
console.log(bcrypt.hashSync(password, 10));
