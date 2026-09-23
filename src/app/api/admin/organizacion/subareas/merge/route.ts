import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST: fusiona una subárea (fromId) dentro de otra (toId) de la MISMA área.
// Reasigna al destino todo lo que colgaba del origen —templates de tareas,
// secciones del plan y puestos— y luego borra el origen (ya vacío). No hay
// pérdida: los templates se mueven antes de borrar (su relación es Cascade).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { fromId, toId } = await req.json();
  if (!fromId || !toId) return NextResponse.json({ error: "fromId y toId requeridos" }, { status: 400 });
  if (fromId === toId) return NextResponse.json({ error: "Origen y destino no pueden ser iguales" }, { status: 400 });

  const [from, to] = await Promise.all([
    prisma.pTSubArea.findUnique({ where: { id: fromId }, select: { id: true, areaId: true, nombre: true } }),
    prisma.pTSubArea.findUnique({ where: { id: toId }, select: { id: true, areaId: true, nombre: true } }),
  ]);
  if (!from || !to) return NextResponse.json({ error: "Subárea no encontrada" }, { status: 404 });
  if (from.areaId !== to.areaId) {
    return NextResponse.json({ error: "Solo se pueden fusionar subáreas de la misma área" }, { status: 400 });
  }

  const [templates, secciones, puestos] = await prisma.$transaction(async (tx) => {
    const t = await tx.pTTareaTemplate.updateMany({ where: { subAreaId: fromId }, data: { subAreaId: toId } });
    const s = await tx.tareaSeccion.updateMany({ where: { subAreaId: fromId }, data: { subAreaId: toId } });
    // Tabla puente: un puesto que ya tenga la subárea destino no puede duplicarla
    // (@@unique puestoId+subAreaId) — ese vínculo se borra en vez de moverse.
    const origen = await tx.puestoSubArea.findMany({ where: { subAreaId: fromId }, select: { id: true, puestoId: true } });
    const destino = await tx.puestoSubArea.findMany({ where: { subAreaId: toId }, select: { puestoId: true } });
    const yaTienen = new Set(destino.map((d) => d.puestoId));
    const duplicados = origen.filter((o) => yaTienen.has(o.puestoId)).map((o) => o.id);
    const movibles = origen.filter((o) => !yaTienen.has(o.puestoId)).map((o) => o.id);
    if (duplicados.length) await tx.puestoSubArea.deleteMany({ where: { id: { in: duplicados } } });
    if (movibles.length) await tx.puestoSubArea.updateMany({ where: { id: { in: movibles } }, data: { subAreaId: toId } });
    await tx.pTSubArea.delete({ where: { id: fromId } });
    return [t.count, s.count, movibles.length];
  });

  return NextResponse.json({ ok: true, templates, secciones, puestos });
}
