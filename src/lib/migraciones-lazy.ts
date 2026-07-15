import { prisma } from "@/lib/prisma";

/**
 * Helper: verifica si una columna ya existe en la tabla antes de hacer ALTER TABLE.
 * ALTER TABLE ... ADD COLUMN IF NOT EXISTS adquiere ACCESS EXCLUSIVE lock aunque la
 * columna ya exista, lo que bloquea todas las queries a esa tabla. Verificar primero
 * en information_schema evita ese lock innecesario en producción.
 */
async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = ${table} AND column_name = ${column}
    ) as exists
  `;
  return rows[0]?.exists === true;
}

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
  if (!await columnExists('roles_tecnicos', 'disciplina')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE roles_tecnicos ADD COLUMN IF NOT EXISTS "disciplina" TEXT`
      );
    } catch { /* ya existe */ }
  }
  if (!await columnExists('proyecto_personal', 'esAdicional')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE proyecto_personal ADD COLUMN IF NOT EXISTS "esAdicional" BOOLEAN NOT NULL DEFAULT false`
      );
    } catch { /* ya existe */ }
  }
  if (!await columnExists('proyectos', 'evaluacionPostEvento')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "evaluacionPostEvento" JSONB`
      );
    } catch { /* ya existe */ }
  }
  _ready = true;
}

/**
 * Migraciones lazy del proceso de ventas (patrón Neon: ADD COLUMN IF NOT EXISTS).
 * - tratos.modoDescubrimiento: "VENDEDOR" | "CLIENTE", define la rama del wizard.
 * - tratos.preferenciaContacto: "LLAMADA" | "PROPUESTA", elegida por el cliente al llenar el form.
 * Idempotente y seguro de correr múltiples veces.
 */
let _procesoVentaReady = false;

export async function ensureProcesoVentaColumns() {
  if (_procesoVentaReady) return;
  if (!await columnExists('tratos', 'modoDescubrimiento')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "modoDescubrimiento" TEXT`
      );
    } catch { /* ya existe */ }
  }
  if (!await columnExists('tratos', 'preferenciaContacto')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "preferenciaContacto" TEXT`
      );
    } catch { /* ya existe */ }
  }
  _procesoVentaReady = true;
}

/**
 * Migraciones lazy para servicios de varios días (patrón Neon: ADD COLUMN IF NOT EXISTS).
 * - tratos.fechasEvento / proyectos.fechasEvento: JSON con las fechas explícitas del evento
 *   cuando dura más de un día. El día 1 sigue en fechaEventoEstimada / fechaEvento.
 * Idempotente y seguro de correr múltiples veces.
 */
let _multidiaReady = false;

export async function ensureMultidiaColumns() {
  if (_multidiaReady) return;
  if (!await columnExists('tratos', 'fechasEvento')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "fechasEvento" TEXT`
      );
    } catch { /* ya existe */ }
  }
  if (!await columnExists('proyectos', 'fechasEvento')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "fechasEvento" TEXT`
      );
    } catch { /* ya existe */ }
  }
  if (!await columnExists('proyectos', 'horariosEvento')) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "horariosEvento" TEXT`
      );
    } catch { /* ya existe */ }
  }
  _multidiaReady = true;
}

