import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  AREAS_SEED,
  IDENTIDAD_SEED,
  META_GLOBAL_SEED,
  VALORES_SEED,
  estadoObjetivo,
  progresoObjetivo,
  tacticaVencida,
} from "@/lib/estrategia";

// Migración lazy idempotente (patrón Neon del proyecto). El DDL también se aplica
// a mano antes del deploy; esto cubre entornos locales y branches nuevos.
export async function ensureEstrategiaSchema() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS "identidad_institucional" (
       "id" TEXT PRIMARY KEY,
       "proposito" TEXT NOT NULL,
       "mision" TEXT NOT NULL,
       "vision" TEXT NOT NULL,
       "frase" TEXT,
       "a_quien_no_servimos" TEXT,
       "version" INTEGER NOT NULL DEFAULT 1,
       "vigente" BOOLEAN NOT NULL DEFAULT false,
       "nota_cambio" TEXT,
       "publicada_en" TIMESTAMP(3),
       "autor_id" TEXT,
       "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
    `CREATE INDEX IF NOT EXISTS "identidad_institucional_vigente_idx" ON "identidad_institucional"("vigente")`,
    `CREATE TABLE IF NOT EXISTS "meta_global" (
       "id" TEXT PRIMARY KEY,
       "periodo" TEXT NOT NULL,
       "titulo" TEXT NOT NULL,
       "descripcion" TEXT,
       "fecha_inicio" TIMESTAMP(3) NOT NULL,
       "fecha_fin" TIMESTAMP(3) NOT NULL,
       "vigente" BOOLEAN NOT NULL DEFAULT false,
       "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
    `CREATE INDEX IF NOT EXISTS "meta_global_vigente_idx" ON "meta_global"("vigente")`,
    `CREATE TABLE IF NOT EXISTS "meta_global_indicadores" (
       "id" TEXT PRIMARY KEY,
       "meta_global_id" TEXT NOT NULL,
       "nombre" TEXT NOT NULL,
       "unidad" TEXT NOT NULL DEFAULT '%',
       "linea_base" DOUBLE PRECISION,
       "valor_meta" DOUBLE PRECISION,
       "valor_actual" DOUBLE PRECISION,
       "kpi_slug" TEXT,
       "orden" INTEGER NOT NULL DEFAULT 0,
       "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
    `CREATE INDEX IF NOT EXISTS "meta_global_indicadores_meta_global_id_idx" ON "meta_global_indicadores"("meta_global_id")`,
    `CREATE TABLE IF NOT EXISTS "areas_estrategicas" (
       "id" TEXT PRIMARY KEY,
       "codigo" TEXT NOT NULL UNIQUE,
       "nombre" TEXT NOT NULL,
       "proposito" TEXT,
       "area_permiso" TEXT NOT NULL,
       "responsable_id" TEXT,
       "orden" INTEGER NOT NULL DEFAULT 0,
       "activo" BOOLEAN NOT NULL DEFAULT true,
       "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
    `CREATE TABLE IF NOT EXISTS "objetivos_area" (
       "id" TEXT PRIMARY KEY,
       "area_id" TEXT NOT NULL,
       "meta_global_id" TEXT,
       "descripcion" TEXT NOT NULL,
       "metrica" TEXT NOT NULL,
       "unidad" TEXT NOT NULL DEFAULT 'número',
       "linea_base" DOUBLE PRECISION,
       "valor_meta" DOUBLE PRECISION,
       "valor_actual" DOUBLE PRECISION,
       "kpi_slug" TEXT,
       "fecha_limite" TIMESTAMP(3),
       "orden" INTEGER NOT NULL DEFAULT 0,
       "activo" BOOLEAN NOT NULL DEFAULT true,
       "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
    `CREATE INDEX IF NOT EXISTS "objetivos_area_area_id_idx" ON "objetivos_area"("area_id")`,
    `CREATE INDEX IF NOT EXISTS "objetivos_area_meta_global_id_idx" ON "objetivos_area"("meta_global_id")`,
    `CREATE TABLE IF NOT EXISTS "tacticas" (
       "id" TEXT PRIMARY KEY,
       "objetivo_id" TEXT NOT NULL,
       "descripcion" TEXT NOT NULL,
       "responsable_id" TEXT,
       "fecha_ejecucion" TIMESTAMP(3),
       "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
       "notas" TEXT,
       "completado_en" TIMESTAMP(3),
       "orden" INTEGER NOT NULL DEFAULT 0,
       "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
    `CREATE INDEX IF NOT EXISTS "tacticas_objetivo_id_idx" ON "tacticas"("objetivo_id")`,
    `ALTER TABLE "valores_empresa" ADD COLUMN IF NOT EXISTS "como_se_vive" TEXT`,
    `ALTER TABLE "valores_empresa" ADD COLUMN IF NOT EXISTS "conductas" TEXT`,
  ];
  for (const sql of stmts) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      // idempotente: si ya existe, seguimos
    }
  }
}

// Siembra la cascada la primera vez. Nunca sobreescribe lo que ya está capturado.
async function seedSiVacio() {
  const [nIdent, nMeta, nAreas, nVal] = await Promise.all([
    prisma.identidad.count(),
    prisma.metaGlobal.count(),
    prisma.areaEstrategica.count(),
    prisma.valorEmpresa.count(),
  ]);

  if (nIdent === 0) {
    await prisma.identidad.create({
      data: { ...IDENTIDAD_SEED, vigente: true, version: 1, publicadaEn: new Date() },
    });
  }

  if (nVal === 0) {
    for (const [orden, v] of VALORES_SEED.entries()) {
      await prisma.valorEmpresa.create({
        data: {
          nombre: v.nombre,
          descripcion: v.descripcion,
          comoSeVive: v.comoSeVive,
          conductas: JSON.stringify(v.conductas),
          orden,
        },
      });
    }
  }

  let metaId: string | null = null;
  if (nMeta === 0) {
    const meta = await prisma.metaGlobal.create({
      data: {
        periodo: META_GLOBAL_SEED.periodo,
        titulo: META_GLOBAL_SEED.titulo,
        descripcion: META_GLOBAL_SEED.descripcion,
        fechaInicio: new Date(META_GLOBAL_SEED.fechaInicio),
        fechaFin: new Date(META_GLOBAL_SEED.fechaFin),
        vigente: true,
        indicadores: {
          create: META_GLOBAL_SEED.indicadores.map((i, orden) => ({
            nombre: i.nombre,
            unidad: i.unidad,
            valorMeta: i.valorMeta,
            kpiSlug: i.kpiSlug || null,
            orden,
          })),
        },
      },
    });
    metaId = meta.id;
  }

  if (nAreas === 0) {
    for (const [orden, a] of AREAS_SEED.entries()) {
      await prisma.areaEstrategica.create({
        data: {
          codigo: a.codigo,
          nombre: a.nombre,
          areaPermiso: a.areaPermiso,
          proposito: a.proposito,
          orden,
          objetivos: {
            create: a.objetivos.map((o, io) => ({
              descripcion: o.descripcion,
              metrica: o.metrica,
              unidad: o.unidad,
              lineaBase: o.lineaBase,
              valorMeta: o.valorMeta,
              kpiSlug: o.kpiSlug || null,
              fechaLimite: new Date(o.fechaLimite),
              metaGlobalId: metaId,
              orden: io,
              tacticas: {
                create: o.tacticas.map((t, it) => ({ descripcion: t, orden: it })),
              },
            })),
          },
        },
      });
    }
  }
}

// Árbol completo de la cascada, con avance y alertas ya calculados.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureEstrategiaSchema();
  await seedSiVacio();

  const [identidad, historial, valores, meta, areas, usuarios] = await Promise.all([
    prisma.identidad.findFirst({ where: { vigente: true } }),
    prisma.identidad.findMany({ orderBy: { version: "desc" }, take: 20 }),
    prisma.valorEmpresa.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
    prisma.metaGlobal.findFirst({
      where: { vigente: true },
      include: { indicadores: { orderBy: { orden: "asc" } } },
    }),
    prisma.areaEstrategica.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
      include: {
        objetivos: {
          where: { activo: true },
          orderBy: { orden: "asc" },
          include: { tacticas: { orderBy: { orden: "asc" } } },
        },
      },
    }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, email: true } }),
  ]);

  const ahora = new Date();
  const areasCalc = areas.map(a => {
    const objetivos = a.objetivos.map(o => ({
      ...o,
      progreso: progresoObjetivo(o.tacticas),
      estadoCalc: estadoObjetivo(o.tacticas, o.fechaLimite, ahora),
      tacticas: o.tacticas.map(t => ({ ...t, vencida: tacticaVencida(t, ahora) })),
    }));
    const conTacticas = objetivos.filter(o => o.tacticas.length > 0);
    return {
      ...a,
      objetivos,
      progreso: conTacticas.length
        ? Math.round(conTacticas.reduce((s, o) => s + o.progreso, 0) / conTacticas.length)
        : 0,
      enRiesgo: objetivos.filter(o => o.estadoCalc === "EN_RIESGO").length,
    };
  });

  const todos = areasCalc.flatMap(a => a.objetivos);
  const resumen = {
    objetivos: todos.length,
    tacticas: todos.reduce((s, o) => s + o.tacticas.length, 0),
    tacticasVencidas: todos.reduce((s, o) => s + o.tacticas.filter(t => t.vencida).length, 0),
    objetivosEnRiesgo: todos.filter(o => o.estadoCalc === "EN_RIESGO").length,
    progreso: todos.length
      ? Math.round(todos.reduce((s, o) => s + o.progreso, 0) / todos.length)
      : 0,
  };

  return NextResponse.json({
    identidad,
    historial: historial.map(h => ({
      id: h.id,
      version: h.version,
      vigente: h.vigente,
      notaCambio: h.notaCambio,
      publicadaEn: h.publicadaEn,
      createdAt: h.createdAt,
    })),
    valores,
    meta,
    areas: areasCalc,
    usuarios,
    resumen,
  });
}
