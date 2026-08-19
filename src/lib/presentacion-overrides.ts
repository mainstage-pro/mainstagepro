import { prisma } from "./prisma";

// Store genérico clave→valor para que un admin pueda sobrescribir textos e
// imágenes de la capa comercial de presentaciones (heros, portadas, imagen de
// inventario, etc.) sin tocar código. Patrón de tabla lazy (igual que
// proyectos.ts) para no arriesgar el schema de Prisma en producción (ver
// incidentes de migración lazy en la memoria del proyecto).
//
// Convención de claves (texto libre, pero por consistencia):
//   home.hero.eyebrow            → texto
//   home.inventario.img          → URL de imagen
//   servicio.renta.hero          → URL de imagen
//   evento.musical.hero          → URL de imagen
// El valor SIEMPRE es string. Para imágenes guardamos la URL del blob.

// Migración lazy YA APLICADA en prod (verificado 2026-08-19: la tabla
// presentacion_overrides ya existe). No-op: esta función se llama en cada carga
// de las páginas públicas de presentación (sin auth, alto tráfico potencial).
export async function ensureOverridesTable() {}

export type OverridesMap = Record<string, string>;

// Devuelve todos los overrides como un mapa { key: value }.
export async function getOverrides(): Promise<OverridesMap> {
  await ensureOverridesTable();
  const rows = await prisma.$queryRawUnsafe<{ key: string; value: string }[]>(
    `SELECT "key", "value" FROM "presentacion_overrides";`
  );
  const map: OverridesMap = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

// Inserta o actualiza un override. Si value es "" o null, borra la clave
// (para volver al valor por defecto del código).
export async function setOverride(key: string, value: string | null): Promise<void> {
  await ensureOverridesTable();
  const k = key.trim();
  if (!k) return;
  if (value === null || value === "") {
    await prisma.$executeRawUnsafe(`DELETE FROM "presentacion_overrides" WHERE "key" = $1;`, k);
    return;
  }
  await prisma.$executeRawUnsafe(
    `INSERT INTO "presentacion_overrides" ("key","value","updatedAt")
     VALUES ($1,$2,CURRENT_TIMESTAMP)
     ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = CURRENT_TIMESTAMP;`,
    k, value
  );
}
