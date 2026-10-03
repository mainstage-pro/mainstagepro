import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { FRENTES } from "@/lib/gira-advance-checklist";
import { sembrarChecklistGira } from "@/lib/gira-checklist";

const FRENTES_VALIDOS = FRENTES.map(f => f.key) as string[];

/** Checklist de advance de la gira. La plantilla que falte se siembra al leer. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true } });
  if (!gira) return NextResponse.json({ error: "La gira no existe" }, { status: 404 });

  const items = await sembrarChecklistGira(id);
  return NextResponse.json({ items });
}

/** Renglón manual: lo que este advance necesita y la plantilla no trae. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const texto = typeof body.item === "string" ? body.item.trim() : "";
  if (!texto) return NextResponse.json({ error: "Falta el texto del renglón" }, { status: 400 });

  const frente = FRENTES_VALIDOS.includes(body.frente) ? body.frente : "INTERNO";
  const showId = typeof body.showId === "string" && body.showId ? body.showId : null;

  if (showId) {
    const show = await prisma.giraShow.findFirst({ where: { id: showId, giraId: id }, select: { id: true } });
    if (!show) return NextResponse.json({ error: "El show no es de esta gira" }, { status: 400 });
  } else {
    const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true } });
    if (!gira) return NextResponse.json({ error: "La gira no existe" }, { status: 404 });
  }

  const item = await prisma.giraChecklistItem.create({
    data: {
      giraId: id,
      showId,
      frente,
      item: texto,
      detalle: typeof body.detalle === "string" && body.detalle.trim() ? body.detalle.trim() : null,
      responsable: typeof body.responsable === "string" && body.responsable.trim() ? body.responsable.trim() : null,
      orden: 900,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
