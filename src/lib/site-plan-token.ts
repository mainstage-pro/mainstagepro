import { createHmac, timingSafeEqual } from "crypto";

const LARGO = 24;

/**
 * Token del site plan público. Se deriva del id con HMAC en vez de guardarse:
 * el link es estable, no hace falta columna y revocarlo todo es rotar
 * `NEXTAUTH_SECRET`. Mismo criterio que `layout-token.ts`.
 */
export function generarTokenSitePlan(planId: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET no configurado");
  return createHmac("sha256", secret).update(`siteplan:${planId}`).digest("hex").slice(0, LARGO);
}

export function validarTokenSitePlan(planId: string, token: string | null | undefined): boolean {
  if (!token || token.length !== LARGO) return false;
  try {
    const a = Buffer.from(token, "hex");
    const b = Buffer.from(generarTokenSitePlan(planId), "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
