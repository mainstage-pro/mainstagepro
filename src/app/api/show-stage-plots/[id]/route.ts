import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";

export const dynamic = "force-dynamic";

const SELECT_PLOT = {
  id: true,
  showId: true,
  nombre: true,
  anchoM: true,
  largoM: true,
  alturaM: true,
  layout: true,
  notas: true,
  orden: true,
  updatedAt: true,
} as const;

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const plot = await prisma.showStagePlot.findUnique({ where: { id }, select: SELECT_PLOT });
  if (!plot) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ plot });
}

/**
 * Las medidas de la plaza y el dibujo. El editor manda PATCH parciales cada pocos
 * segundos: se copia campo por campo para que un `undefined` de la pantalla no
 * borre lo que esa pantalla ni siquiera mostró.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if ("nombre" in body) {
    const nombre = String(body.nombre ?? "").trim();
    if (!nombre) return NextResponse.json({ error: "El stage plot necesita nombre" }, { status: 400 });
    data.nombre = nombre;
  }
  for (const campo of ["anchoM", "largoM", "alturaM"] as const) {
    if (campo in body) {
      const v = body[campo];
      const n = v === null || v === "" ? null : parseFloat(String(v));
      data[campo] = n !== null && Number.isFinite(n) && n > 0 ? n : null;
    }
  }
  if ("notas" in body) data.notas = body.notas ? String(body.notas) : null;
  if ("orden" in body) data.orden = parseInt(String(body.orden)) || 0;
  if ("layout" in body) {
    data.layout =
      body.layout == null
        ? null
        : typeof body.layout === "string"
          ? body.layout
          : JSON.stringify(body.layout);
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true });

  const existe = await prisma.showStagePlot.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const plot = await prisma.showStagePlot.update({ where: { id }, data, select: SELECT_PLOT });

  // El dibujo se autoguarda a cada rato: registrar cada PATCH del lienzo llenaría
  // la bitácora de ruido. Solo se anota cuando cambia la ficha de la plaza.
  if (!("layout" in body) || Object.keys(data).length > 1) {
    await logActividad(
      session.id,
      "ACTUALIZAR",
      "ShowStagePlot",
      plot.id,
      `Actualizó el stage plot «${plot.nombre}»`,
      { showId: plot.showId },
    );
  }

  return NextResponse.json({ plot });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const plot = await prisma.showStagePlot.findUnique({
    where: { id },
    select: { id: true, nombre: true, showId: true },
  });
  if (!plot) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // El modelo no lleva `activo`: un plano de una plaza que no se usó no deja rastro
  // que valga la pena conservar, y conservarlo ensuciaría la lista de la fecha.
  await prisma.showStagePlot.delete({ where: { id } });

  await logActividad(
    session.id,
    "ELIMINAR",
    "ShowStagePlot",
    plot.id,
    `Quitó el stage plot «${plot.nombre}» de la fecha`,
    { showId: plot.showId },
  );

  return NextResponse.json({ ok: true });
}
