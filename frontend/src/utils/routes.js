/** Where a user lands after logging in. */
export function homePathFor(user) {
  return user?.role === 'admin' ? '/admin' : '/my';
}
