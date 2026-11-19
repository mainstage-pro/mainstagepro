/**
 * Patrocinios: una cotización que no es una venta normal.
 *
 * Antes se marcaban con un descuento manual del 100% sobre el equipo. Eso dejaba
 * la CxC en cero, pero escondía el dato: no se sabía qué fue patrocinio, en qué
 * modalidad, ni cuánto se regaló, y ensuciaba el descuento promedio y el ticket
 * de ventas. Ahora el patrocinio es la naturaleza de la cotización y su valor
 * vive aparte (montoPatrocinio), nunca en montoDescuento.
 *
 * Este archivo es seguro para el cliente (sin Prisma).
 */

export const NATURALEZAS = ["VENTA", "PATROCINIO"] as const;
export type Naturaleza = (typeof NATURALEZAS)[number];

export const MODALIDADES_PATROCINIO = ["TOTAL", "COSTO_OPERATIVO", "INTERCAMBIO"] as const;
export type ModalidadPatrocinio = (typeof MODALIDADES_PATROCINIO)[number];

export const MODALIDAD_PATROCINIO_LABEL: Record<ModalidadPatrocinio, string> = {
  TOTAL: "Patrocinio total",
  COSTO_OPERATIVO: "Cubren costo operativo",
  INTERCAMBIO: "Intercambio",
};

export const MODALIDAD_PATROCINIO_HINT: Record<ModalidadPatrocinio, string> = {
  TOTAL: "No se cobra nada. No genera cuenta por cobrar.",
  COSTO_OPERATIVO: "Equipo y paquetes van en $0; el cliente paga operación, logística y terceros.",
  INTERCAMBIO: "No se cobra en efectivo; a cambio recibimos algo en especie (publicidad, producto, espacios).",
};

export function esModalidadPatrocinio(v: unknown): v is ModalidadPatrocinio {
  return typeof v === "string" && (MODALIDADES_PATROCINIO as readonly string[]).includes(v);
}

/** ¿La cotización es un patrocinio con modalidad válida? */
export function esPatrocinio(c: { naturaleza?: string | null; patrocinioModalidad?: string | null }): boolean {
  return c.naturaleza === "PATROCINIO" && esModalidadPatrocinio(c.patrocinioModalidad);
}

/** ¿Con esta modalidad el cliente sí paga la parte operativa? */
export function cobraOperativo(modalidad: string | null | undefined): boolean {
  return modalidad === "COSTO_OPERATIVO";
}

/**
 * Normaliza lo que llega del cliente para guardar. Una venta limpia los campos
 * de patrocinio; un patrocinio sin modalidad válida se vuelve venta.
 */
export function normalizarPatrocinio(body: {
  naturaleza?: unknown;
  patrocinioModalidad?: unknown;
  patrocinioContraprestacion?: unknown;
  patrocinioValorRecibido?: unknown;
  montoPatrocinio?: unknown;
}) {
  const modalidad = esModalidadPatrocinio(body.patrocinioModalidad) ? body.patrocinioModalidad : null;
  if (body.naturaleza !== "PATROCINIO" || !modalidad) {
    return {
      naturaleza: "VENTA",
      patrocinioModalidad: null,
      patrocinioContraprestacion: null,
      patrocinioValorRecibido: 0,
      montoPatrocinio: 0,
    };
  }
  const texto = typeof body.patrocinioContraprestacion === "string" ? body.patrocinioContraprestacion.trim() : "";
  return {
    naturaleza: "PATROCINIO",
    patrocinioModalidad: modalidad,
    patrocinioContraprestacion: texto || null,
    patrocinioValorRecibido: modalidad === "INTERCAMBIO" ? Math.max(0, Number(body.patrocinioValorRecibido) || 0) : 0,
    montoPatrocinio: Math.max(0, Number(body.montoPatrocinio) || 0),
  };
}
