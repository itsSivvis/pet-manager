import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;
export const PASSWORD_MIN_LENGTH = 10;
// bcrypt silently ignores everything after 72 bytes, so we reject longer input.
export const PASSWORD_MAX_BYTES = 72;

/** Returns an error code if the password violates the policy, otherwise null. */
export function checkPasswordPolicy(password, { email } = {}) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH)
    return 'PASSWORD_TOO_SHORT';
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) return 'PASSWORD_TOO_LONG';
  if (email && password.toLowerCase() === email.toLowerCase()) return 'PASSWORD_EQUALS_EMAIL';
  if (/^(.)\1+$/.test(password)) return 'PASSWORD_TOO_WEAK';
  return null;
}

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

let dummy;
/**
 * A real bcrypt hash of a random value. Comparing against it for unknown
 * e-mails makes failed logins take as long as for existing accounts
 * (prevents user enumeration via response timing).
 */
export function dummyHash() {
  dummy ??= bcrypt.hash(crypto.randomUUID(), BCRYPT_ROUNDS);
  return dummy;
}
