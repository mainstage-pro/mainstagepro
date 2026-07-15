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

/**
 * Migraciones lazy del proceso de ventas (patrón Neon: ADD COLUMN IF NOT EXISTS).
 * - tratos.modoDescubrimiento: "VENDEDOR" | "CLIENTE", define la rama del wizard.
 * - tratos.preferenciaContacto: "LLAMADA" | "PROPUESTA", elegida por el cliente al llenar el form.
 * Idempotente y seguro de correr múltiples veces.
 */
let _procesoVentaReady = false;

export async function ensureProcesoVentaColumns() {
  if (_procesoVentaReady) return;
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "modoDescubrimiento" TEXT`
    );
  } catch { /* ya existe */ }
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "preferenciaContacto" TEXT`
    );
  } catch { /* ya existe */ }
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
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "fechasEvento" TEXT`
    );
  } catch { /* ya existe */ }
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "fechasEvento" TEXT`
    );
  } catch { /* ya existe */ }
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "horariosEvento" TEXT`
    );
  } catch { /* ya existe */ }
  _multidiaReady = true;
}
