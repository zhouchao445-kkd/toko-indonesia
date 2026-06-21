/**
 * Format a number as Indonesian Rupiah (IDR) string.
 * Example: formatIDR(1500000) => "Rp 1.500.000"
 */
export function formatIDR(amount: number): string {
  // Use Indonesian locale for thousand separator (dot)
  const formatted = amount.toLocaleString('id-ID');
  return `Rp ${formatted}`;
}
