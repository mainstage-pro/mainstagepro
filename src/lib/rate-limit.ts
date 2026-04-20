// Simple in-memory sliding-window rate limiter.
// On Vercel (serverless), state is per-instance — provides protection against
// single-source bursts but not distributed attacks. Upgrade to Redis/Upstash
// if multi-instance coordination is needed.

const store = new Map<string, number[]>();

// Clean up old entries every 5 minutes to avoid memory leaks
let lastCleanup = Date.now();
function maybeCleanup(windowMs: number) {
  if (Date.now() - lastCleanup < 300_000) return;
  lastCleanup = Date.now();
  const cutoff = Date.now() - windowMs;
  for (const [key, timestamps] of store) {
    const filtered = timestamps.filter(t => t > cutoff);
    if (filtered.length === 0) store.delete(key);
    else store.set(key, filtered);
  }
}

/**
 * Returns true if the request is allowed, false if rate-limited.
 * @param key      Unique identifier (e.g. IP + route)
 * @param max      Max requests in the window (default 30)
 * @param windowMs Window size in ms (default 60 000 = 1 minute)
 */
export function rateLimit(key: string, max = 30, windowMs = 60_000): boolean {
  maybeCleanup(windowMs);
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (store.get(key) ?? []).filter(t => t > cutoff);
  hits.push(now);
  store.set(key, hits);
  return hits.length <= max;
}

/** Convenience: extract IP from a Next.js Request (falls back to "unknown") */
export function getClientIp(req: Request): string {
  const headers = (req as { headers: Headers }).headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
