import { prisma } from "@/lib/prisma";

// Crea/actualiza las tablas de forma idempotente (Neon no corre migraciones formales).
let _tablesReady = false;
export async function ensureSolicitudTables() {
  if (_tablesReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS solicitudes_cotizacion (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      folio SERIAL,
      "clienteNombre" TEXT NOT NULL,
      "contactoTelefono" TEXT,
      "clienteId" TEXT REFERENCES clientes(id) ON DELETE SET NULL,
      "fechaEvento" TIMESTAMP,
      "lugarEvento" TEXT,
      etapa TEXT,
      "tipoEvento" TEXT,
      "tipoServicio" TEXT,
      asistentes INTEGER,
      "equiposDescripcion" TEXT,
      "requiereTransporte" BOOLEAN NOT NULL DEFAULT false,
      "transporteConcepto" TEXT,
      "llevaDescuento" BOOLEAN NOT NULL DEFAULT false,
      "descuentoDetalle" TEXT,
      "notaEspecial" TEXT,
      observaciones TEXT,
      "sumaComision" BOOLEAN NOT NULL DEFAULT false,
      entregable TEXT NOT NULL DEFAULT 'SOLO_PDF',
      estado TEXT NOT NULL DEFAULT 'NUEVA',
      "vendedorId" TEXT REFERENCES users(id) ON DELETE SET NULL,
      "creadoPorId" TEXT REFERENCES users(id) ON DELETE SET NULL,
      "tratoId" TEXT UNIQUE REFERENCES tratos(id) ON DELETE SET NULL,
      activo BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  // Columnas agregadas después de la creación inicial (para tablas ya existentes en prod)
  const cols = [
    `"contactoTelefono" TEXT`,
    `"clienteId" TEXT`,
    `"equiposDescripcion" TEXT`,
    `observaciones TEXT`,
  ];
  for (const c of cols) {
    await prisma.$executeRawUnsafe(`ALTER TABLE solicitudes_cotizacion ADD COLUMN IF NOT EXISTS ${c};`);
  }
  _tablesReady = true;
}
