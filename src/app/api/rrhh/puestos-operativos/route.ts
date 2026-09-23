import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { syncPuestoKpis } from "@/lib/puesto-kpis";
import { subAreasCreate } from "@/lib/puesto";

// Migración lazy YA APLICADA en prod (verificado 2026-08-19: la tabla puestos,
// todas sus columnas, personal_interno.user_id/puesto_id, pt_kpis, las columnas
// de evaluaciones_empleado y los catálogos ya existen). No-op: antes corría
// ~30 ALTER/CREATE incondicionales en CADA request (sin ningún flag/chequeo),
// y ALTER TABLE ... ADD COLUMN IF NOT EXISTS toma un lock ACCESS EXCLUSIVE
// aunque la columna ya exista, bloqueando lecturas concurrentes de la tabla.
export async function ensurePuestoSchema() {}

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
      subAreas: {
        orderBy: [{ principal: "desc" }, { orden: "asc" }],
        include: { subArea: { select: { id: true, nombre: true, areaId: true } } },
      },
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
        misionPuesto: b.misionPuesto || null,
        responsabilidades: arr(b.responsabilidades),
        reportaAId: b.reportaAId || null,
        coordinaConData: jstr(b.coordinaConData),
        reportes: jstr(b.reportes),
        estandares: arr(b.estandares),
        valores: jstr(b.valores),
        aptitudes: jstr(b.aptitudes),
        conocimientos: jstr(b.conocimientos),
        prestaciones: arr(b.prestaciones),
        prestacionesOtro: b.prestacionesOtro || null,
        tipoContrato: b.tipoContrato || null,
        modalidad: b.modalidad || null,
        jornada: jstr(b.jornada),
        onboardingModulos: arr(b.onboardingModulos),
        capacitacionAsignaciones: arr(b.capacitacionAsignaciones),
        origenIA: jstr(b.origenIA),
        subAreas: { create: subAreasCreate(b.subAreaIds) },
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
