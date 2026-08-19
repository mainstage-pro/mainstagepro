import { prisma } from "./prisma";
import { slugTemporada, tipoEventoDeSlug } from "./constants";
import { ensureCalendariosTabla } from "./migraciones-lazy";

// Las tablas de paquetes se crean lazy (patrón Neon sin migración formal).
// ensurePaquetesTables() se llama al inicio de cada endpoint de paquetes.
let tablesEnsured = false;

// NOTA (verificado 2026-08-19): las tablas paquetes, paquete_items,
// paquete_conceptos, paquete_imagenes, paquete_rangos (con sus índices) y las
// columnas paquete_imagenes.tipo, paquetes.adicionalesSugeridos, paquetes.esBase
// y paquetes.temporada YA EXISTEN en producción. El bloque de CREATE TABLE/INDEX
// y ALTER TABLE que corría aquí en cada cold start de los endpoints de paquetes
// se quitó: ALTER TABLE ... ADD COLUMN IF NOT EXISTS toma un lock ACCESS
// EXCLUSIVE aunque la columna ya exista, y "paquetes" se lee en presentaciones
// públicas de alto tráfico. Se conserva la lógica de reconciliación de datos
// (rangos, temporadas) que sigue abajo, que no es DDL de schema.
export async function ensurePaquetesTables() {
  if (tablesEnsured) return;
  // Seed inicial de rangos (solo la primera vez, si la tabla está vacía).
  const total = await prisma.paqueteRango.count();
  if (total === 0) {
    await prisma.paqueteRango.createMany({
      data: RANGOS_PERSONAS_DEFAULT.map((label, orden) => ({ label, orden })),
    });
  }
  // Reconciliación idempotente de rangos (corre en cada deploy):
  // fusiona "0-50"/"50-100" en "0-100" y agrega tramos altos hasta 3000.
  // Migra las referencias como string antes de borrar las filas de opción.
  await prisma.$executeRawUnsafe(
    `UPDATE "producto_coberturas" SET "rangos" = REPLACE("rangos", '"50-100"', '"0-100"') WHERE "rangos" LIKE '%"50-100"%';`
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "producto_coberturas" SET "rangos" = REPLACE("rangos", '"0-50"', '"0-100"') WHERE "rangos" LIKE '%"0-50"%';`
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "paquetes" SET "rangoPersonas" = '0-100' WHERE "rangoPersonas" IN ('0-50', '50-100');`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM "paquete_rangos" WHERE "label" IN ('0-50', '50-100');`
  );
  await prisma.paqueteRango.upsert({
    where: { label: "0-100" },
    update: { activo: true, orden: 0 },
    create: { label: "0-100", orden: 0 },
  });
  await prisma.paqueteRango.upsert({
    where: { label: "2000-2500" },
    update: {},
    create: { label: "2000-2500", orden: 8 },
  });
  await prisma.paqueteRango.upsert({
    where: { label: "2500-3000" },
    update: {},
    create: { label: "2500-3000", orden: 9 },
  });
  tablesEnsured = true;
}

export type TemporadaPaqueteLive = { key: string; label: string; emoji: string; tipoEvento: string };

// Temporadas EN VIVO: derivadas de las entradas del calendario comercial
// (tabla calendario_entradas). Cada fecha/temporalidad comercial es una temporada.
// Así, al agregar una fecha nueva en el calendario, aparece aquí sin tocar código.
export async function getTemporadasComercial(): Promise<TemporadaPaqueteLive[]> {
  await ensureCalendariosTabla();
  const rows = await prisma.$queryRawUnsafe<
    { titulo: string; icono: string | null; tipo_evento_slug: string | null }[]
  >(
    `SELECT titulo, icono, tipo_evento_slug FROM calendario_entradas
       WHERE calendario = 'COMERCIAL' AND activo = true
       ORDER BY mes_inicio ASC, COALESCE(dia_inicio, 0) ASC, orden ASC`,
  );
  const vistas = new Set<string>();
  const out: TemporadaPaqueteLive[] = [];
  for (const r of rows) {
    const key = slugTemporada(r.titulo);
    if (!key || vistas.has(key)) continue;
    vistas.add(key);
    out.push({ key, label: r.titulo, emoji: r.icono || "📅", tipoEvento: tipoEventoDeSlug(r.tipo_evento_slug) });
  }
  return out;
}

// Deja una plantilla en blanco por cada temporada del calendario comercial.
// Idempotente: solo crea la plantilla si NO existe ningún paquete (activo o no)
// para esa temporada, así respeta las que el usuario haya borrado (soft delete).
// Devuelve la lista de temporadas en vivo para que la UI pinte las pestañas.
export async function ensurePlantillasTemporada(): Promise<TemporadaPaqueteLive[]> {
  await ensurePaquetesTables();
  const temporadas = await getTemporadasComercial();
  const existentes = await prisma.paquete.findMany({
    where: { temporada: { not: null } },
    select: { temporada: true },
  });
  const conParte = new Set(existentes.map((p) => p.temporada));
  const faltantes = temporadas.filter((t) => !conParte.has(t.key));
  if (faltantes.length) {
    const maxOrden = await prisma.paquete.aggregate({ _max: { orden: true } });
    let orden = (maxOrden._max.orden ?? 0) + 1;
    for (const t of faltantes) {
      await prisma.paquete.create({
        data: { nombre: `Paquete ${t.label}`, tipoEvento: t.tipoEvento, temporada: t.key, esBase: false, orden: orden++ },
      });
    }
  }
  return temporadas;
}

// Crea la plantilla en blanco de UNA temporada recién dada de alta en el
// calendario comercial. Idempotente por key. Se llama desde el alta de entradas.
export async function crearPlantillaTemporada(
  titulo: string,
  icono?: string | null,
  tipoEventoSlug?: string | null,
): Promise<void> {
  const key = slugTemporada(titulo);
  if (!key) return;
  await ensurePaquetesTables();
  const existe = await prisma.paquete.count({ where: { temporada: key } });
  if (existe > 0) return;
  const maxOrden = await prisma.paquete.aggregate({ _max: { orden: true } });
  await prisma.paquete.create({
    data: {
      nombre: `Paquete ${titulo.trim()}`,
      tipoEvento: tipoEventoDeSlug(tipoEventoSlug),
      temporada: key,
      esBase: false,
      orden: (maxOrden._max.orden ?? 0) + 1,
    },
  });
}

// Lista base con la que se siembra el catálogo la primera vez.
// Después es editable desde la UI (tabla paquete_rangos).
export const RANGOS_PERSONAS_DEFAULT = [
  "0-100",
  "100-200",
  "200-300",
  "300-500",
  "500-800",
  "800-1000",
  "1000-1500",
  "1500-2000",
  "2000-2500",
  "2500-3000",
] as const;

// Devuelve los rangos activos, ordenados. Requiere ensurePaquetesTables() previo.
export async function getRangosPersonas(): Promise<{ id: string; label: string; orden: number }[]> {
  return prisma.paqueteRango.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { label: "asc" }],
    select: { id: true, label: true, orden: true },
  });
}

export type PaqueteItemInput = {
  tipo: "EQUIPO" | "PRODUCTO";
  equipoId?: string | null;
  productoId?: string | null;
  cantidad: number;
};

export type PaqueteConceptoInput = {
  tipo: string;
  descripcion: string;
  rolTecnicoId?: string | null;
  nivel?: string | null;
  jornada?: string | null;
  cantidad: number;
  dias: number;
  precioUnitario: number;
};

export const PAQUETE_INCLUDE = {
  items: {
    orderBy: { orden: "asc" as const },
    include: {
      equipo: {
        select: {
          id: true,
          descripcion: true,
          marca: true,
          modelo: true,
          precioRenta: true,
          imagenUrl: true,
          imagenesUrls: true,
          categoria: { select: { id: true, nombre: true } },
        },
      },
      producto: {
        select: {
          id: true,
          nombre: true,
          categoria: true,
          imagenUrl: true,
          precioFinal: true,
          items: {
            orderBy: { orden: "asc" as const },
            select: {
              cantidad: true,
              equipo: {
                select: {
                  id: true,
                  descripcion: true,
                  marca: true,
                  modelo: true,
                  imagenUrl: true,
                  imagenesUrls: true,
                  categoria: { select: { nombre: true } },
                },
              },
            },
          },
        },
      },
    },
  },
  conceptos: {
    orderBy: { orden: "asc" as const },
    include: { rolTecnico: { select: { id: true, nombre: true } } },
  },
  imagenes: { orderBy: { orden: "asc" as const } },
};
