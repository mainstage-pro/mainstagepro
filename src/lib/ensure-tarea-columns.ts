import { prisma } from "@/lib/prisma";

// Migración lazy idempotente para columnas del hub de tareas que pueden no
// existir todavía en la BD de producción (Neon). Patrón establecido en el repo
// (ver ensureVendedorId en api/tratos). Se ejecuta una vez por instancia.
let ensured = false;

export async function ensureTareaColumns(): Promise<void> {
  if (ensured) return;
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "proyectoEventoId" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "evidenciaEnviadaAt" TIMESTAMP(3)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "evidenciaEnviadaPorId" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "evidenciaEnviadaCanal" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "tratoId" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "enBandeja" BOOLEAN NOT NULL DEFAULT false`);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "tareas_proyectoEventoId_idx" ON "tareas"("proyectoEventoId")`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "tareas_tratoId_idx" ON "tareas"("tratoId")`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "tareas_enBandeja_idx" ON "tareas"("enBandeja")`,
    );
    ensured = true;
  } catch {
    // Silencioso: si falla (permisos, etc.) las rutas siguen operando sobre
    // las columnas ya existentes. No debe tumbar el request.
  }
}
