import crypto from 'crypto';

/**
 * Generates a cryptographically secure random token.
 * Used for email verification and password reset.
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generates a token with an expiry date.
 * Returns both the token and its expiry date.
 */
export function generateTokenWithExpiry(hours = 24): {
  token: string;
  expiresAt: Date;
} {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);

  return { token, expiresAt };
}

/**
 * Checks if a token has expired.
 */
export function isTokenExpired(expiryDate?: Date): boolean {
  if (!expiryDate) return true;
  return new Date() > expiryDate;
}

/**
 * Hashes a token for secure storage.
 * Uses SHA-256 to avoid storing plaintext tokens in the database.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}