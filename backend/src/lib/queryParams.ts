/**
 * Extract a single string value from Express req.query parameter
 * Handles the case where query params can be string | string[] | undefined
 */
export function getQueryParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Extract a required string value from Express req.query parameter
 * Throws if the value is not a valid string
 */
export function requireQueryParam(value: string | string[] | undefined, name: string): string {
  const result = getQueryParam(value);
  if (!result) {
    throw new Error(`Missing required query parameter: ${name}`);
  }
  return result;
}
