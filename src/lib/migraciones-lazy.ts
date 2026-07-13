import { prisma } from "@/lib/prisma";

/**
 * Migraciones lazy para la operación técnica (patrón Neon: ADD COLUMN IF NOT EXISTS).
 * - roles_tecnicos.disciplina: categoría del rol para ligarlo con la BD de técnicos.
 * - proyecto_personal.esAdicional: marcador interno de técnico fuera de cotización.
 * - proyectos.evaluacionPostEvento: JSON del cierre operativo del coordinador.
 * Idempotente y seguro de correr múltiples veces; se guarda con un flag de módulo.
 */
let _ready = false;

export async function ensureOperacionTecnicaColumns() {
  if (_ready) return;
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE roles_tecnicos ADD COLUMN IF NOT EXISTS "disciplina" TEXT`
    );
  } catch { /* ya existe */ }
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE proyecto_personal ADD COLUMN IF NOT EXISTS "esAdicional" BOOLEAN NOT NULL DEFAULT false`
    );
  } catch { /* ya existe */ }
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "evaluacionPostEvento" JSONB`
    );
  } catch { /* ya existe */ }
  _ready = true;
}
