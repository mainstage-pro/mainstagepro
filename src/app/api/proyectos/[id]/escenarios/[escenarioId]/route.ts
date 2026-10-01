import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string; escenarioId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, escenarioId } = await params;
  const escenario = await prisma.proyectoEscenario.findFirst({
    where: { id: escenarioId, proyectoId: id },
  });
  if (!escenario) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // El banco del layout se arma con las POSICIONES de montaje, no con el equipo plano:
  // un mismo modelo puede ir cuatro veces como PA principal y dos como sidefill, y en
  // el plano eso son seis piezas con rótulos distintos.
  //
  // Entra el equipo de ESTE escenario más el que todavía no tiene escenario: en un evento
  // de un solo escenario nadie asigna nada, así que el rider completo es su banco.
  const equipos = await prisma.proyectoEquipo.findMany({
    where: { proyectoId: id, OR: [{ escenarioId }, { escenarioId: null }] },
    include: {
      equipo: {
        select: {
          id: true, marca: true, modelo: true, descripcion: true, pesoKg: true,
          imagenUrl: true, huellaAnchoM: true, huellaLargoM: true,
          amperajeRequerido: true, amperajeRequerido220: true, voltajeRequerido: true,
          categoria: { select: { nombre: true, disciplina: true } },
        },
      },
      posiciones: { orderBy: { orden: "asc" } },
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ escenario: { ...escenario, equipos } });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, escenarioId } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("nombre" in body) {
    const nombre = String(body.nombre ?? "").trim();
    if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    data.nombre = nombre;
  }
  for (const f of ["anchoM", "largoM", "alturaM"]) {
    if (f in body) data[f] = body[f] !== null && body[f] !== "" ? parseFloat(body[f]) : null;
  }
  if ("notas" in body) data.notas = body.notas || null;
  if ("orden" in body) data.orden = parseInt(body.orden) || 0;
  if ("layout" in body) {
    data.layout = body.layout == null
      ? null
      : typeof body.layout === "string" ? body.layout : JSON.stringify(body.layout);
  }

  const { count } = await prisma.proyectoEscenario.updateMany({
    where: { id: escenarioId, proyectoId: id },
    data,
  });
  if (!count) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const escenario = await prisma.proyectoEscenario.findUnique({
    where: { id: escenarioId },
    include: { _count: { select: { equipos: true, personal: true, bloques: true, proveedores: true } } },
  });
  return NextResponse.json({ escenario });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // El equipo y el crew asignados NO se borran: el onDelete SetNull los devuelve al
  // rider sin escenario para poder reasignarlos.
  const { id, escenarioId } = await params;
  const { count } = await prisma.proyectoEscenario.deleteMany({
    where: { id: escenarioId, proyectoId: id },
  });
  if (!count) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
