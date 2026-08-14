import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { syncPuestoKpis } from "@/lib/puesto-kpis";

// Auto-migración idempotente (patrón Neon): crea la tabla y las columnas puente
// la primera vez que corre, evitando una migración formal en producción.
export async function ensurePuestoSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS puestos (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      area TEXT NOT NULL DEFAULT 'GENERAL',
      objetivo_area TEXT,
      mision_puesto TEXT,
      responsabilidades TEXT,
      reporta_a_id TEXT,
      coordina_con TEXT,
      supervisa_a TEXT,
      estandares TEXT,
      color TEXT,
      activo BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
  // Puente de identidad y puesto principal en personal_interno
  await prisma.$executeRawUnsafe(`ALTER TABLE personal_interno ADD COLUMN IF NOT EXISTS user_id TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE personal_interno ADD COLUMN IF NOT EXISTS puesto_id TEXT`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS personal_interno_user_id_key ON personal_interno(user_id)`);
  // Posiciones en el lienzo del organigrama
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS pos_x DOUBLE PRECISION`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS pos_y DOUBLE PRECISION`);
  // Condiciones laborales migradas de puestos_ideales (fuente del acuerdo laboral)
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS funciones TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS prestaciones TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS tipo_contrato TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS modalidad TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS horario TEXT`);
  // Vínculo a la subárea del maestro (Áreas y organización)
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS sub_area_id TEXT`);
  // ── Rediseño del registro de puesto (§1–§9) ──
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS descripcion_puesto TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS objetivo_puesto TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS coordina_con_data TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS estandares_minimos TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS valores TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS aptitudes TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS conocimientos TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS prestaciones_otro TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS jornada TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS legacy_data TEXT`);
  // Configuración de onboarding por puesto (§ Onboarding)
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS onboarding_modulos TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS onboarding_capacitaciones TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS capacitacion_asignaciones TEXT`);
  // KPIs del puesto (§4)
  await prisma.$executeRawUnsafe(`ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS puesto_id TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS resultado_esperado TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS unidad TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS frecuencia TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS es_fijo_plan BOOLEAN NOT NULL DEFAULT false`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS pt_kpis_puesto_id_idx ON pt_kpis(puesto_id)`);
  // Evaluación reestructurada (§7/§8/§9)
  await prisma.$executeRawUnsafe(`ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS puesto_id TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS puesto_snapshot TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS puesto_version INTEGER`);
  await prisma.$executeRawUnsafe(`ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS mes_generado TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS resultados_data TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS estandares_min_data TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS perfil_competencias TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS calificacion_calculada TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS ajuste_justificacion TEXT`);
  // Catálogos de configuración del registro de puesto
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS catalogo_prestaciones (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, orden INTEGER NOT NULL DEFAULT 0, activo BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS valores_empresa (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, descripcion TEXT, orden INTEGER NOT NULL DEFAULT 0, activo BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS catalogo_aptitudes (id TEXT PRIMARY KEY, nombre TEXT NOT NULL UNIQUE, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS catalogo_conocimientos (id TEXT PRIMARY KEY, nombre TEXT NOT NULL UNIQUE, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`);
}

const arr = (v: unknown) => (Array.isArray(v) && v.length ? JSON.stringify(v) : null);
const jstr = (v: unknown) => (Array.isArray(v) ? (v.length ? JSON.stringify(v) : null) : (v ? JSON.stringify(v) : null));

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensurePuestoSchema();
  const puestos = await prisma.puesto.findMany({
    orderBy: [{ area: "asc" }, { nombre: "asc" }],
    include: {
      reportaA: { select: { id: true, nombre: true } },
      subArea: { select: { id: true, nombre: true } },
      ocupantes: { select: { id: true, nombre: true, userId: true }, where: { activo: true } },
    },
  });
  return NextResponse.json({ puestos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    await ensurePuestoSchema();
    const b = await req.json();
    if (!b.nombre) return NextResponse.json({ error: "El nombre del puesto es requerido" }, { status: 400 });
    const puesto = await prisma.puesto.create({
      data: {
        nombre: b.nombre,
        area: b.area || "GENERAL",
        subAreaId: b.subAreaId || null,
        objetivoArea: b.objetivoArea || null,
        descripcionPuesto: b.descripcionPuesto || null,
        objetivoPuesto: b.objetivoPuesto || null,
        misionPuesto: b.misionPuesto || null,
        responsabilidades: arr(b.responsabilidades),
        reportaAId: b.reportaAId || null,
        coordinaCon: arr(b.coordinaCon),
        supervisaA: arr(b.supervisaA),
        coordinaConData: jstr(b.coordinaConData),
        estandares: arr(b.estandares),
        estandaresMinimos: jstr(b.estandaresMinimos),
        valores: jstr(b.valores),
        aptitudes: jstr(b.aptitudes),
        conocimientos: jstr(b.conocimientos),
        funciones: arr(b.funciones),
        prestaciones: arr(b.prestaciones),
        prestacionesOtro: b.prestacionesOtro || null,
        tipoContrato: b.tipoContrato || null,
        modalidad: b.modalidad || null,
        horario: b.horario || null,
        jornada: jstr(b.jornada),
        onboardingModulos: arr(b.onboardingModulos),
        onboardingCapacitaciones: arr(b.onboardingCapacitaciones),
        capacitacionAsignaciones: arr(b.capacitacionAsignaciones),
        color: b.color || null,
      },
    });
    if (Array.isArray(b.kpis)) await syncPuestoKpis(puesto.id, puesto.area, b.kpis);
    if (Array.isArray(b.ocupantesIds) && b.ocupantesIds.length) {
      await prisma.personalInterno.updateMany({
        where: { id: { in: b.ocupantesIds } },
        data: { puestoId: puesto.id },
      });
    }
    return NextResponse.json({ puesto }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rrhh/puestos-operativos POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
