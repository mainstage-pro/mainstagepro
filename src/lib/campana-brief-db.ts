import { prisma } from "@/lib/prisma";

// Migración lazy (patrón Neon del proyecto): añade las columnas del brief la
// primera vez que corre un endpoint de campañas, sin migración formal.
let _colsReady = false;

export async function ensureCampanaBriefColumns() {
  if (_colsReady) return;
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE tipos_campana ADD COLUMN IF NOT EXISTS "categoria" TEXT NOT NULL DEFAULT 'base'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tipos_campana ADD COLUMN IF NOT EXISTS "vigenciaDesde" TIMESTAMP(3)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tipos_campana ADD COLUMN IF NOT EXISTS "vigenciaHasta" TIMESTAMP(3)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tipos_campana ADD COLUMN IF NOT EXISTS "briefTemplate" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE ejecuciones_campana ADD COLUMN IF NOT EXISTS "brief" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE ejecuciones_campana ADD COLUMN IF NOT EXISTS "briefCompleto" BOOLEAN NOT NULL DEFAULT false`);
  } catch {
    /* columnas ya existen */
  }
  _colsReady = true;
}

// Archiva (activo=false) los tipos "eventual" cuya vigencia ya venció. La fila
// se conserva para reusarse. Idempotente.
export async function archivarEventualesVencidos() {
  await prisma.tipoCampana.updateMany({
    where: {
      categoria: "eventual",
      activo: true,
      vigenciaHasta: { not: null, lt: new Date() },
    },
    data: { activo: false },
  });
}
