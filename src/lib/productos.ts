import { prisma } from "./prisma";

// Las tablas y columnas de productos (productos, producto_equipos, producto_coberturas,
// producto_accesorios + columnas de clasificación) ya están confirmadas en prod desde hace
// tiempo. La migración lazy que las creaba/alteraba en cada cold start quedaba, causaba
// hasta 18 DDL secuenciales (varios ALTER TABLE con lock ACCESS EXCLUSIVE) antes de poder
// responder cualquier request a /api/productos — eso hacía que el módulo Comercial no
// cargara. Se retira; si algún día se necesita provisión lazy real, usar el patrón
// columnExists() de src/lib/migraciones-lazy.ts.
export async function ensureProductosTables() {}

export type ItemInput = { equipoId: string; cantidad: number };

export type AccesorioInput = { accesorioId: string; cantidad: number };

// Depura los accesorios que llegan del cliente para la composición del producto.
export function limpiarAccesorios(raw: unknown): AccesorioInput[] {
  if (!Array.isArray(raw)) return [];
  const porId = new Map<string, AccesorioInput>();
  for (const a of raw as AccesorioInput[]) {
    if (!a || typeof a.accesorioId !== "string" || !a.accesorioId) continue;
    porId.set(a.accesorioId, { accesorioId: a.accesorioId, cantidad: Math.max(1, Number(a.cantidad) || 1) });
  }
  return [...porId.values()];
}

export type CoberturaInput = { tipoEvento: string; rangos: string[]; subtipos: string[] };

// Depura la cobertura que llega del cliente: un registro por tipo de evento
// (cualquier slug legacy del catálogo), con rangos/subtipos como arreglos.
export function limpiarCoberturas(raw: unknown): CoberturaInput[] {
  if (!Array.isArray(raw)) return [];
  const porTipo = new Map<string, CoberturaInput>();
  for (const c of raw as CoberturaInput[]) {
    if (!c || typeof c.tipoEvento !== "string" || !c.tipoEvento.trim()) continue;
    const rangos = Array.isArray(c.rangos) ? [...new Set(c.rangos.filter((x) => typeof x === "string" && x))] : [];
    const subtipos = Array.isArray(c.subtipos) ? [...new Set(c.subtipos.filter((x) => typeof x === "string" && x))] : [];
    porTipo.set(c.tipoEvento, { tipoEvento: c.tipoEvento, rangos, subtipos });
  }
  return [...porTipo.values()];
}

/** Precio de un producto: override manual, o suma de rentas del inventario. */
export function calcularPrecioProducto(
  items: { cantidad: number; equipo: { precioRenta: number } }[],
  precioManual: number | null | undefined
): number {
  if (precioManual != null && precioManual > 0) return precioManual;
  return items.reduce((sum, it) => sum + it.cantidad * (it.equipo?.precioRenta ?? 0), 0);
}

/** Recalcula y persiste precioFinal de un producto a partir de sus items. */
export async function recalcularPrecioFinal(productoId: string): Promise<number> {
  const [items, producto] = await Promise.all([
    prisma.productoEquipo.findMany({
      where: { productoId },
      include: { equipo: { select: { precioRenta: true } } },
    }),
    prisma.producto.findUnique({ where: { id: productoId }, select: { precioManual: true } }),
  ]);
  const precioFinal = calcularPrecioProducto(items, producto?.precioManual);
  await prisma.producto.update({ where: { id: productoId }, data: { precioFinal } });
  return precioFinal;
}
