import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { ensurePaquetesTables } from "@/lib/paquetes";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensurePaquetesTables();

  const { id } = await params;
  const body = await req.json();

  const actual = await prisma.paqueteRango.findUnique({ where: { id } });
  if (!actual) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const data: { label?: string; orden?: number } = {};
  if (body.label !== undefined) {
    const label = String(body.label).trim();
    if (!label) return NextResponse.json({ error: "El rango no puede estar vacío" }, { status: 400 });
    const dup = await prisma.paqueteRango.findUnique({ where: { label } });
    if (dup && dup.id !== id) return NextResponse.json({ error: "Ese rango ya existe" }, { status: 409 });
    data.label = label;
  }
  if (body.orden !== undefined) data.orden = Math.max(0, Number(body.orden) || 0);

  const rango = await prisma.paqueteRango.update({ where: { id }, data });

  // Si se renombró, arrastrar el cambio a los paquetes que usaban la etiqueta anterior.
  if (data.label && data.label !== actual.label) {
    await prisma.paquete.updateMany({
      where: { rangoPersonas: actual.label },
      data: { rangoPersonas: data.label },
    });
  }

  await logActividad(session.id, "EDITAR", "PaqueteRango", id, `Editó el rango de personas "${rango.label}"`);
  return NextResponse.json({ rango });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensurePaquetesTables();

  const { id } = await params;
  const rango = await prisma.paqueteRango.update({ where: { id }, data: { activo: false } });
  await logActividad(session.id, "ELIMINAR", "PaqueteRango", id, `Eliminó el rango de personas "${rango.label}"`);
  return NextResponse.json({ ok: true });
}
