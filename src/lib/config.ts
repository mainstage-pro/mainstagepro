import { prisma } from "@/lib/prisma";

const cache = new Map<string, string>();
let cacheLoadedAt = 0;
const TTL = 5 * 60 * 1000;

async function loadCache() {
  if (Date.now() - cacheLoadedAt < TTL) return;
  const rows = await prisma.appConfig.findMany({ select: { key: true, value: true } });
  cache.clear();
  for (const r of rows) cache.set(r.key, r.value);
  cacheLoadedAt = Date.now();
}

export function invalidateConfigCache() {
  cacheLoadedAt = 0;
}

export async function getConfig(key: string, fallback?: string): Promise<string | undefined> {
  await loadCache();
  const v = cache.get(key);
  if (v !== undefined) return v;
  return fallback;
}

export async function getConfigNumber(key: string, fallback = 0): Promise<number> {
  const v = await getConfig(key);
  if (v === undefined) return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

export async function getConfigJSON<T>(key: string, fallback?: T): Promise<T> {
  const v = await getConfig(key);
  if (v === undefined) return fallback as T;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback as T;
  }
}
