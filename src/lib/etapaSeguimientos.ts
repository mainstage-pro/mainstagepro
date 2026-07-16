// Helpers de migración lazy (Neon) para columnas usadas por los seguimientos.
// Los seguimientos automáticos por etapa se eliminaron: los seguimientos ahora
// se agendan 100% de forma manual. Solo quedan aquí los aseguradores de columnas.
import { ensureSeguimientoColumns } from "@/lib/migraciones-lazy";

// Asegura la columna "etapa" en seguimientos (centralizada en migraciones-lazy.ts).
export async function ensureSeguimientoEtapaCol() {
  await ensureSeguimientoColumns();
}

// Asegura la columna "tratoId" en presentaciones_venta (sin FK a propósito).
export async function ensurePresentacionTratoCol() {
  await ensureSeguimientoColumns();
}
