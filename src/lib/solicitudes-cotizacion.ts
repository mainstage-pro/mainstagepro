import { prisma } from "@/lib/prisma";

// Crea las tablas de forma idempotente (Neon no corre migraciones formales).
let _tablesReady = false;
export async function ensureSolicitudTables() {
  if (_tablesReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS solicitudes_cotizacion (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      folio SERIAL,
      "clienteNombre" TEXT NOT NULL,
      "fechaEvento" TIMESTAMP,
      "lugarEvento" TEXT,
      etapa TEXT,
      "tipoEvento" TEXT,
      "tipoServicio" TEXT,
      asistentes INTEGER,
      "requiereTransporte" BOOLEAN NOT NULL DEFAULT false,
      "transporteConcepto" TEXT,
      "llevaDescuento" BOOLEAN NOT NULL DEFAULT false,
      "descuentoDetalle" TEXT,
      "notaEspecial" TEXT,
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
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS solicitudes_cotizacion_equipos (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "solicitudId" TEXT NOT NULL REFERENCES solicitudes_cotizacion(id) ON DELETE CASCADE,
      categoria TEXT,
      equipo TEXT,
      cantidad INTEGER NOT NULL DEFAULT 1,
      notas TEXT,
      orden INTEGER NOT NULL DEFAULT 0
    );
  `);
  _tablesReady = true;
}
