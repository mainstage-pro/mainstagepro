import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ensureTablaActividades, fechaValida, horaValida, textoLimpio } from "@/lib/itinerario-actividades";

/** Edita un campo de una actividad suelta (se guarda al salir de cada campo). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, string | null> = {};
  if ("fecha" in body) {
    const f = fechaValida(body.fecha);
    if (!f) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    data.fecha = f;
  }
  if ("titulo" in body) {
    const t = textoLimpio(body.titulo);
    if (!t) return NextResponse.json({ error: "La actividad no puede quedar vacía" }, { status: 400 });
    data.titulo = t;
  }
  if ("horaInicio" in body) data.horaInicio = horaValida(body.horaInicio);
  if ("horaFin" in body) data.horaFin = horaValida(body.horaFin);
  if ("nota" in body) data.nota = textoLimpio(body.nota);
  if ("responsable" in body) data.responsable = textoLimpio(body.responsable);
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada que guardar" }, { status: 400 });

  await ensureTablaActividades();
  const r = await prisma.itinerarioActividad.updateMany({ where: { id, activo: true }, data });
  if (!r.count) return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** Quita una actividad suelta (soft delete). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await ensureTablaActividades();
  await prisma.itinerarioActividad.updateMany({ where: { id }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
