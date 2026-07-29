import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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
      puesto_ideal_id TEXT,
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
  // Funciones del perfil de reclutamiento
  await prisma.$executeRawUnsafe(`ALTER TABLE puestos_ideales ADD COLUMN IF NOT EXISTS funciones TEXT`);
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
}

const arr = (v: unknown) => (Array.isArray(v) && v.length ? JSON.stringify(v) : null);

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensurePuestoSchema();
  const puestos = await prisma.puesto.findMany({
    orderBy: [{ area: "asc" }, { nombre: "asc" }],
    include: {
      reportaA: { select: { id: true, nombre: true } },
      subArea: { select: { id: true, nombre: true } },
      puestoIdeal: { select: { id: true, titulo: true } },
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
        misionPuesto: b.misionPuesto || null,
        responsabilidades: arr(b.responsabilidades),
        reportaAId: b.reportaAId || null,
        coordinaCon: arr(b.coordinaCon),
        supervisaA: arr(b.supervisaA),
        estandares: arr(b.estandares),
        funciones: arr(b.funciones),
        prestaciones: arr(b.prestaciones),
        tipoContrato: b.tipoContrato || null,
        modalidad: b.modalidad || null,
        horario: b.horario || null,
        puestoIdealId: b.puestoIdealId || null,
        color: b.color || null,
      },
    });
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
