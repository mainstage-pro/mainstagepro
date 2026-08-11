import { prisma } from "./prisma";

// Las tablas de productos se crean lazy (patrón Neon sin migración formal).
// ensureProductosTables() se llama al inicio de cada endpoint de productos.
let tablesEnsured = false;

export async function ensureProductosTables() {
  if (tablesEnsured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "productos" (
      "id" TEXT NOT NULL,
      "nombre" TEXT NOT NULL,
      "descripcion" TEXT,
      "categoria" TEXT,
      "tiposEvento" TEXT,
      "imagenUrl" TEXT,
      "equipoDominanteId" TEXT,
      "precioManual" DOUBLE PRECISION,
      "precioFinal" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "activo" BOOLEAN NOT NULL DEFAULT true,
      "orden" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "productos_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "productos_equipoDominanteId_fkey"
        FOREIGN KEY ("equipoDominanteId") REFERENCES "equipos"("id") ON DELETE SET NULL
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "producto_equipos" (
      "id" TEXT NOT NULL,
      "productoId" TEXT NOT NULL,
      "equipoId" TEXT NOT NULL,
      "cantidad" INTEGER NOT NULL DEFAULT 1,
      "orden" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "producto_equipos_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "producto_equipos_productoId_fkey"
        FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE,
      CONSTRAINT "producto_equipos_equipoId_fkey"
        FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "producto_equipos_productoId_idx" ON "producto_equipos"("productoId");`
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "producto_coberturas" (
      "id" TEXT NOT NULL,
      "productoId" TEXT NOT NULL,
      "tipoEvento" TEXT NOT NULL,
      "rangos" TEXT,
      "subtipos" TEXT,
      CONSTRAINT "producto_coberturas_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "producto_coberturas_productoId_fkey"
        FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "producto_coberturas_productoId_tipoEvento_key" ON "producto_coberturas"("productoId", "tipoEvento");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "producto_coberturas_productoId_idx" ON "producto_coberturas"("productoId");`
  );
  tablesEnsured = true;
}

export type ItemInput = { equipoId: string; cantidad: number };

export type CoberturaInput = { tipoEvento: string; rangos: string[]; subtipos: string[] };

const TIPOS_EVENTO_VALIDOS = new Set(["MUSICAL", "SOCIAL", "EMPRESARIAL"]);

// Depura la cobertura que llega del cliente: un registro por tipo de evento
// válido, con rangos/subtipos como arreglos de strings.
export function limpiarCoberturas(raw: unknown): CoberturaInput[] {
  if (!Array.isArray(raw)) return [];
  const porTipo = new Map<string, CoberturaInput>();
  for (const c of raw as CoberturaInput[]) {
    if (!c || !TIPOS_EVENTO_VALIDOS.has(c.tipoEvento)) continue;
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
