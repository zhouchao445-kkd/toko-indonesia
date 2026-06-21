import jwt from 'jsonwebtoken';

/**
 * JWT Configuration
 * 
 * Security requirements:
 * - JWT_SECRET must be set in environment variables (no default value)
 * - Admin tokens expire in 8 hours
 * - Member tokens expire in 7 days
 */

// Throw error if JWT_SECRET is not configured
const JWT_SECRET: string = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Please set it in .env file.');
}

// Token expiry configuration
export const JWT_EXPIRES_IN = {
  ADMIN: '8h',    // Admin tokens expire in 8 hours
  MEMBER: '7d',   // Member tokens expire in 7 days
} as const;

/**
 * Generate JWT token
 * @param payload - Data to encode in token
 * @param userType - 'admin' or 'member' to determine expiry time
 * @returns JWT token string
 */
export function generateToken(
  payload: Record<string, unknown>,
  userType: 'admin' | 'member'
): string {
  const expiresIn = userType === 'admin' ? JWT_EXPIRES_IN.ADMIN : JWT_EXPIRES_IN.MEMBER;
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

/**
 * Verify JWT token
 * @param token - JWT token string
 * @returns Decoded token payload
 */
export function verifyToken(token: string): Record<string, unknown> {
  return jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
}

export { JWT_SECRET };
