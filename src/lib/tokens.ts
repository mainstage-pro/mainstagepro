// Token generation with embedded expiry — no DB migration required.
// Format: "{randomHex}.{expiryEpochSeconds_base36}"
// Legacy tokens (no dot) are treated as non-expiring for backward compatibility.

/**
 * Generate a new token with embedded expiry.
 * @param expiryDays Days until the token expires (default 90)
 */
export function createExpiringToken(expiryDays = 90): string {
  const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  const expiresAt = Math.floor(Date.now() / 1000) + expiryDays * 86400;
  return `${randomHex}.${expiresAt.toString(36)}`;
}

/**
 * Check if a token is expired.
 * Returns false (not expired) for legacy tokens without an embedded expiry.
 */
export function isTokenExpired(token: string): boolean {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return false; // legacy token — no expiry
  const expiryPart = token.slice(dotIndex + 1);
  const expiresAt = parseInt(expiryPart, 36);
  if (isNaN(expiresAt) || expiresAt === 0) return false; // malformed — treat as legacy
  return Math.floor(Date.now() / 1000) > expiresAt;
}
