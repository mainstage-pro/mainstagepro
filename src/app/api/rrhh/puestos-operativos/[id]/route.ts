import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { syncPuestoKpis, loadPuestoKpis } from "@/lib/puesto-kpis";

const arr = (v: unknown) => (Array.isArray(v) && v.length ? JSON.stringify(v) : null);
const jstr = (v: unknown) => (Array.isArray(v) ? (v.length ? JSON.stringify(v) : null) : (v ? JSON.stringify(v) : null));

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const puesto = await prisma.puesto.findUnique({
    where: { id },
    include: {
      reportaA: { select: { id: true, nombre: true } },
      subArea: { select: { id: true, nombre: true } },
      subordinados: { select: { id: true, nombre: true } },
      ocupantes: { select: { id: true, nombre: true, userId: true }, where: { activo: true } },
    },
  });
  if (!puesto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const kpis = await loadPuestoKpis(id);
  return NextResponse.json({ puesto: { ...puesto, kpis } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const b = await req.json();
    // Registro previo: para preservar textos libres legado (§10) y saber si es edición
    // de contenido (que bumpea versión) vs. solo mover el nodo en el organigrama.
    const prev = await prisma.puesto.findUnique({ where: { id } });
    const data: Record<string, unknown> = {};
    if (b.nombre !== undefined) data.nombre = b.nombre;
    if (b.area !== undefined) data.area = b.area || "GENERAL";
    if (b.subAreaId !== undefined) data.subAreaId = b.subAreaId || null;
    if (b.objetivoArea !== undefined) data.objetivoArea = b.objetivoArea || null;
    if (b.descripcionPuesto !== undefined) data.descripcionPuesto = b.descripcionPuesto || null;
    if (b.objetivoPuesto !== undefined) data.objetivoPuesto = b.objetivoPuesto || null;
    if (b.misionPuesto !== undefined) data.misionPuesto = b.misionPuesto || null;
    if (b.responsabilidades !== undefined) data.responsabilidades = arr(b.responsabilidades);
    if (b.reportaAId !== undefined) data.reportaAId = b.reportaAId || null;
    if (b.coordinaCon !== undefined) data.coordinaCon = arr(b.coordinaCon);
    if (b.supervisaA !== undefined) data.supervisaA = arr(b.supervisaA);
    if (b.coordinaConData !== undefined) data.coordinaConData = jstr(b.coordinaConData);
    if (b.estandares !== undefined) data.estandares = arr(b.estandares);
    if (b.estandaresMinimos !== undefined) data.estandaresMinimos = jstr(b.estandaresMinimos);
    if (b.valores !== undefined) data.valores = jstr(b.valores);
    if (b.aptitudes !== undefined) data.aptitudes = jstr(b.aptitudes);
    if (b.conocimientos !== undefined) data.conocimientos = jstr(b.conocimientos);
    if (b.funciones !== undefined) data.funciones = arr(b.funciones);
    if (b.prestaciones !== undefined) data.prestaciones = arr(b.prestaciones);
    if (b.prestacionesOtro !== undefined) data.prestacionesOtro = b.prestacionesOtro || null;
    if (b.tipoContrato !== undefined) data.tipoContrato = b.tipoContrato || null;
    if (b.modalidad !== undefined) data.modalidad = b.modalidad || null;
    if (b.horario !== undefined) data.horario = b.horario || null;
    if (b.jornada !== undefined) data.jornada = jstr(b.jornada);
    if (b.color !== undefined) data.color = b.color || null;
    if (b.posX !== undefined) data.posX = b.posX === null ? null : Number(b.posX);
    if (b.posY !== undefined) data.posY = b.posY === null ? null : Number(b.posY);
    if (b.activo !== undefined) data.activo = b.activo;
    data.updatedAt = new Date();

    // §10: la primera vez que se guardan campos estructurados, congela los textos
    // libres legado en legacy_data por si la migración por coincidencia falla.
    const editaContenido = Object.keys(data).some(
      k => !["posX", "posY", "updatedAt", "activo"].includes(k),
    );
    if (prev && !prev.legacyData && editaContenido) {
      data.legacyData = JSON.stringify({
        reportaAId: prev.reportaAId, coordinaCon: prev.coordinaCon, supervisaA: prev.supervisaA,
        tipoContrato: prev.tipoContrato, modalidad: prev.modalidad, horario: prev.horario,
        prestaciones: prev.prestaciones,
      });
    }
    // Bumpea versión cuando cambia contenido (no cuando solo se reubica en organigrama).
    if (editaContenido) data.version = { increment: 1 };

    const puesto = await prisma.puesto.update({ where: { id }, data });
    if (Array.isArray(b.kpis)) await syncPuestoKpis(id, puesto.area, b.kpis);

    // Reasignar titulares (ocupantes) si viene el arreglo de IDs de personal
    if (Array.isArray(b.ocupantesIds)) {
      await prisma.personalInterno.updateMany({ where: { puestoId: id }, data: { puestoId: null } });
      if (b.ocupantesIds.length) {
        await prisma.personalInterno.updateMany({
          where: { id: { in: b.ocupantesIds } },
          data: { puestoId: id },
        });
      }
    }

    return NextResponse.json({ puesto });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rrhh/puestos-operativos PATCH]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    await prisma.personalInterno.updateMany({ where: { puestoId: id }, data: { puestoId: null } });
    await prisma.puesto.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rrhh/puestos-operativos DELETE]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
