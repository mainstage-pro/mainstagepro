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
  tablesEnsured = true;
}

export type ItemInput = { equipoId: string; cantidad: number };

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
