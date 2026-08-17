// Helpers PUROS de la venta de equipo (sin prisma), seguros para servidor y cliente.

export const CONDICIONES = ["NUEVO", "COMO_NUEVO", "USADO"] as const;
export type CondicionVenta = (typeof CONDICIONES)[number];

export const CONDICION_LABEL: Record<string, string> = {
  NUEVO: "Nuevo",
  COMO_NUEVO: "Como nuevo",
  USADO: "Usado",
};

/**
 * Fotos publicables de un equipo. La galería se guarda como JSON: array de strings
 * (formato viejo) o de objetos { url, nombre, uso } (ver EquipoGaleria.tsx). Solo salen
 * las EXTERNO (las INTERNO son de montaje) y se descartan los data: URI, que pesan
 * megas y reventarían el HTML de la presentación.
 */
export function fotosPublicables(imagenUrl: string | null, imagenesUrls: string | null): string[] {
  const urls: string[] = [];
  const push = (u: unknown) => {
    if (typeof u !== "string") return;
    const url = u.trim();
    if (!url || url.startsWith("data:") || urls.includes(url)) return;
    urls.push(url);
  };
  push(imagenUrl);
  if (imagenesUrls) {
    try {
      const arr = JSON.parse(imagenesUrls);
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (typeof item === "string") push(item);
          else if (item && typeof item === "object" && item.uso !== "INTERNO") push(item.url);
        }
      }
    } catch { /* JSON inválido: sin galería */ }
  }
  return urls;
}

export function unidadesEnVenta(eq: { cantidadTotal: number; ventaCantidad: number | null }): number {
  const n = eq.ventaCantidad ?? eq.cantidadTotal;
  return Math.max(1, Math.min(n, eq.cantidadTotal));
}
