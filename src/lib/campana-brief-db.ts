import { prisma } from "@/lib/prisma";
import { ensureMarketingColumns } from "@/lib/migraciones-lazy";

// Migración lazy de las columnas del brief. Centralizada en migraciones-lazy.ts
// (también corre al arranque) para que ninguna lectura tope con una columna inexistente.
export async function ensureCampanaBriefColumns() {
  await ensureMarketingColumns();
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
