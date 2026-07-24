import { prisma } from "@/lib/prisma";
import { PLANTILLAS_SUBETAPA_DEFAULT } from "@/lib/plantillas-tareas-subetapa";

// Migración lazy (patrón Neon del repo): crea la tabla si no existe y la siembra
// con las tareas por defecto de cada subetapa base la primera vez. Solo la tocan
// los endpoints nuevos, así que no afecta rutas de lectura existentes.
let _ready = false;

export async function ensurePlantillasTareaSubetapa() {
  if (_ready) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "plantillas_tareas_subetapa" (
      "id"           TEXT PRIMARY KEY,
      "etapaInterna" TEXT NOT NULL,
      "titulo"       TEXT NOT NULL,
      "area"         TEXT NOT NULL DEFAULT 'VENTAS',
      "prioridad"    TEXT NOT NULL DEFAULT 'MEDIA',
      "offsetDias"   INTEGER,
      "orden"        INTEGER NOT NULL DEFAULT 0,
      "activo"       BOOLEAN NOT NULL DEFAULT true,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "plantillas_tareas_subetapa_etapa_activo_idx" ON "plantillas_tareas_subetapa" ("etapaInterna", "activo")`
  );

  const count = await prisma.plantillaTareaSubetapa.count();
  if (count === 0) {
    const data: {
      etapaInterna: string;
      titulo: string;
      area: string;
      prioridad: string;
      offsetDias: number | null;
      orden: number;
    }[] = [];
    for (const [etapaInterna, items] of Object.entries(PLANTILLAS_SUBETAPA_DEFAULT)) {
      let orden = 0;
      for (const it of items) {
        data.push({
          etapaInterna,
          titulo: it.titulo,
          area: it.area ?? "VENTAS",
          prioridad: it.prioridad ?? "MEDIA",
          offsetDias: it.offsetDias ?? null,
          orden: orden++,
        });
      }
    }
    if (data.length) await prisma.plantillaTareaSubetapa.createMany({ data });
  }

  _ready = true;
}
