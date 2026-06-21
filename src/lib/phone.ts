/**
 * Phone validation utility for frontend
 * Mirrors backend phone.ts validation
 */

const PHONE_REGEX = /^\+62\d{8,12}$/;

export function isValidIndonesianPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  return PHONE_REGEX.test(phone);
}

/**
 * Password strength validation
 * Must be >= 8 chars, contain at least one letter and one number
 */
export function isValidPassword(password: string): boolean {
  if (!password || password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}

export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (!password || password.length < 8) return 'weak';
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (hasLetter && hasNumber && hasSpecial && password.length >= 12) return 'strong';
  if (hasLetter && hasNumber) return 'medium';
  return 'weak';
}

/**
 * Mask phone number for display: +62 812-****-7890
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return phone;
  const prefix = phone.slice(0, 6);
  const suffix = phone.slice(-4);
  return `${prefix}****${suffix}`;
}
