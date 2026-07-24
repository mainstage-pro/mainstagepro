import { prisma } from "@/lib/prisma";
import { PLANTILLAS_DEFAULT } from "@/lib/plantillas-tareas-evento";

// Migración lazy (patrón Neon del repo): crea la tabla si no existe y la siembra
// con los valores por defecto la primera vez. Solo la tocan los endpoints nuevos,
// así que no afecta rutas de lectura existentes.
let _ready = false;

export async function ensurePlantillasTareaEvento() {
  if (_ready) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "plantillas_tareas_evento" (
      "id"           TEXT PRIMARY KEY,
      "tipoServicio" TEXT NOT NULL,
      "grupo"        TEXT NOT NULL,
      "area"         TEXT NOT NULL,
      "titulo"       TEXT NOT NULL,
      "orden"        INTEGER NOT NULL DEFAULT 0,
      "activo"       BOOLEAN NOT NULL DEFAULT true,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "plantillas_tareas_evento_tipo_activo_idx" ON "plantillas_tareas_evento" ("tipoServicio", "activo")`
  );

  const count = await prisma.plantillaTareaEvento.count();
  if (count === 0) {
    const data: {
      tipoServicio: string;
      grupo: string;
      area: string;
      titulo: string;
      orden: number;
    }[] = [];
    for (const [tipoServicio, grupos] of Object.entries(PLANTILLAS_DEFAULT)) {
      let orden = 0;
      for (const g of grupos) {
        for (const titulo of g.items) {
          data.push({ tipoServicio, grupo: g.grupo, area: g.area, titulo, orden: orden++ });
        }
      }
    }
    if (data.length) await prisma.plantillaTareaEvento.createMany({ data });
  }

  _ready = true;
}
