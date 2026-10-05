import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { textoOpcional, numero, booleano, soloDefinidos } from "../../propuestas-servicio/recalcular";

// PATCH: edita un servicio del catálogo (precio sugerido, textos, activo, orden)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const servicio = await prisma.servicioPM.findUnique({ where: { id }, select: { id: true, clave: true } });
  if (!servicio) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const data = soloDefinidos({
    nombre: typeof body.nombre === "string" && body.nombre.trim() ? body.nombre.trim() : undefined,
    categoria: textoOpcional(body.categoria),
    subcategoria: textoOpcional(body.subcategoria),
    descripcion: textoOpcional(body.descripcion),
    entregables: textoOpcional(body.entregables),
    incluye: textoOpcional(body.incluye),
    noIncluye: textoOpcional(body.noIncluye),
    unidadDefault: typeof body.unidadDefault === "string" ? body.unidadDefault : undefined,
    tipoLinea: typeof body.tipoLinea === "string" ? body.tipoLinea : undefined,
    icono: typeof body.icono === "string" && body.icono.trim() ? body.icono.trim() : undefined,
    nivelServicio: typeof body.nivelServicio === "string" ? body.nivelServicio : undefined,
    precioSugerido: body.precioSugerido === null ? null : numero(body.precioSugerido),
    costoSugerido: body.costoSugerido === null ? null : numero(body.costoSugerido),
    activo: booleano(body.activo),
    orden: numero(body.orden),
  });

  const actualizado = await prisma.servicioPM.update({ where: { id }, data });

  await logActividad(session.id, "EDITAR", "servicio_pm", id, `Servicio ${servicio.clave} actualizado`);

  return NextResponse.json({ servicio: actualizado });
}

// DELETE: baja lógica (el servicio pudo usarse en propuestas ya enviadas)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const servicio = await prisma.servicioPM.findUnique({ where: { id }, select: { clave: true } });
  if (!servicio) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.servicioPM.update({ where: { id }, data: { activo: false } });
  await logActividad(session.id, "ELIMINAR", "servicio_pm", id, `Servicio ${servicio.clave} desactivado`);

  return NextResponse.json({ ok: true });
}
