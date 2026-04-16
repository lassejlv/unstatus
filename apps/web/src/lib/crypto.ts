/**
 * Shared cryptographic utilities.
 */

/**
 * Hash a string using SHA-256 and return the hex digest.
 * Used for API key hashing.
 */
export async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
