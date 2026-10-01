import { createHmac, timingSafeEqual } from "crypto";

const LARGO = 24;

/**
 * Token del layout público de un escenario. Se deriva del id con HMAC en vez de
 * guardarse en la BD: el link es estable, no hace falta columna nueva y revocarlo
 * es cuestión de rotar `NEXTAUTH_SECRET`. Mismo criterio que la presentación de
 * cotizaciones (`presentacion-token.ts`).
 */
export function generarTokenLayout(escenarioId: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET no configurado");
  return createHmac("sha256", secret).update(`layout:${escenarioId}`).digest("hex").slice(0, LARGO);
}

export function validarTokenLayout(escenarioId: string, token: string | null | undefined): boolean {
  if (!token || token.length !== LARGO) return false;
  try {
    const a = Buffer.from(token, "hex");
    const b = Buffer.from(generarTokenLayout(escenarioId), "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
