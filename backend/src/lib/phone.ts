/**
 * Phone validation and formatting utilities for Indonesian phone numbers
 */

// Indonesian phone number pattern: +62 followed by 8-12 digits
const PHONE_REGEX = /^\+62\d{8,12}$/;

/**
 * Validate Indonesian phone number format
 * Must match +62 followed by 8-12 digits (total 11-15 characters)
 * Examples:
 *   +6281234567890 - valid (13 digits after +62)
 *   +62812345678   - valid (8 digits after +62, minimum)
 *   081234567890   - invalid (no +62 prefix)
 *   +62123         - invalid (too short)
 */
export function isValidIndonesianPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  return PHONE_REGEX.test(phone);
}

/**
 * Format phone number for display
 * Input: +6281234567890
 * Output: +62 812-3456-7890
 */
export function formatPhoneDisplay(phone: string): string {
  if (!isValidIndonesianPhone(phone)) {
    return phone;
  }

  // Remove +62 prefix
  const digits = phone.slice(3);
  const len = digits.length;

  // Format based on length
  if (len <= 4) {
    return `+62 ${digits}`;
  } else if (len <= 8) {
    return `+62 ${digits.slice(0, 3)}-${digits.slice(3)}`;
  } else {
    return `+62 ${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
}
