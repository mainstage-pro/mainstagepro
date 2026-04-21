import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_LEN = 24;

export function generarTokenPresentacion(cotizacionId: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET no configurado");
  return createHmac("sha256", secret).update(cotizacionId).digest("hex").slice(0, TOKEN_LEN);
}

export function validarTokenPresentacion(cotizacionId: string, token: string | null | undefined): boolean {
  if (!token || token.length !== TOKEN_LEN) return false;
  try {
    const expected = generarTokenPresentacion(cotizacionId);
    const a = Buffer.from(token, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
