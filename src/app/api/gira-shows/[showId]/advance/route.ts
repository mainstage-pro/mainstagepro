import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CUBIERTO_POR, DISCIPLINAS, ESTADOS_ADVANCE, PRIORIDADES, UNIDADES_RIDER } from "@/lib/giras";
import { panelDelShow } from "@/lib/advance-gira";

/// El panel completo de la fecha: por departamento, lo que pide el rider, lo que
/// el foro tiene registrado y el reparto que se está armando.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { showId } = await params;

  const panel = await panelDelShow(showId);
  if (!panel) return NextResponse.json({ error: "Show no encontrado" }, { status: 404 });

  return NextResponse.json(panel);
}

function deLista(valor: unknown, validos: readonly string[], porDefecto: string | null): string | null {
  return typeof valor === "string" && validos.includes(valor) ? valor : porDefecto;
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

/// Un renglón nuevo de reparto. Nace libre: lo que se negoció al teléfono y no
/// venía desglosado en el rider también se anota aquí.
export async function POST(req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { showId } = await params;

  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { id: true, gira: { select: { artistaId: true } } },
  });
  if (!show) return NextResponse.json({ error: "Show no encontrado" }, { status: 404 });

  const body = await req.json();

  const descripcion = texto(body.descripcion);
  if (!descripcion) return NextResponse.json({ error: "La descripción es obligatoria" }, { status: 400 });

  const n = Number(body.cantidad);
  const cantidad = body.cantidad === null || body.cantidad === "" || !Number.isFinite(n)
    ? null
    : Math.max(0, Math.trunc(n));

  // El punto del rider que este renglón cubre, acotado al artista de la gira para
  // que un id prestado no ligue el reparto al rider de alguien más.
  let riderLineaId: string | null = null;
  if (typeof body.riderLineaId === "string" && body.riderLineaId) {
    const linea = await prisma.artistaRiderLinea.findUnique({
      where: { id: body.riderLineaId },
      select: { id: true, rider: { select: { artistaId: true } } },
    });
    if (linea?.rider.artistaId === show.gira.artistaId) riderLineaId = linea.id;
  }

  const max = await prisma.showAdvanceReparto.aggregate({ where: { showId }, _max: { orden: true } });

  const reparto = await prisma.showAdvanceReparto.create({
    data: {
      showId,
      disciplina: deLista(body.disciplina, DISCIPLINAS, "OTRO") as string,
      riderLineaId,
      descripcion,
      cantidad,
      unidad: deLista(body.unidad, UNIDADES_RIDER, null),
      especificaciones: texto(body.especificaciones),
      prioridad: deLista(body.prioridad, PRIORIDADES, "IMPORTANTE") as string,
      cubiertoPor: deLista(body.cubiertoPor, CUBIERTO_POR, "POR_DEFINIR") as string,
      estado: deLista(body.estado, ESTADOS_ADVANCE, "PENDIENTE") as string,
      porConseguir: texto(body.porConseguir),
      notas: texto(body.notas),
      orden: (max._max.orden ?? 0) + 10,
    },
  });

  return NextResponse.json({ reparto });
}

/// Quitar varios renglones de un jalón. Acotado al show para que una lista de ids
/// prestada no pueda tocar el advance de otra fecha.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { showId } = await params;

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
  if (!ids.length) return NextResponse.json({ error: "No llegó ningún renglón" }, { status: 400 });

  const { count } = await prisma.showAdvanceReparto.deleteMany({ where: { showId, id: { in: ids } } });
  return NextResponse.json({ eliminadas: count });
}
