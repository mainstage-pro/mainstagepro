import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const INCLUDE = {
  proveedor: { select: { id: true, nombre: true, empresa: true } },
  equipo: { select: { id: true, descripcion: true, marca: true, modelo: true } },
  riderLinea: { select: { id: true, concepto: true, cantidad: true, prioridad: true, preferido: true, aceptables: true } },
} as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { showId } = await params;

  const lineas = await prisma.showRiderLinea.findMany({
    where: { showId },
    orderBy: [{ disciplina: "asc" }, { orden: "asc" }],
    include: INCLUDE,
  });

  return NextResponse.json({ lineas });
}

/// Renglón libre: lo que aparece en sitio y no venía en el rider maestro.
export async function POST(req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { showId } = await params;

  const show = await prisma.giraShow.findUnique({ where: { id: showId }, select: { id: true } });
  if (!show) return NextResponse.json({ error: "Show no encontrado" }, { status: 404 });

  const body = await req.json();
  const concepto = typeof body.concepto === "string" ? body.concepto.trim() : "";
  if (!concepto) return NextResponse.json({ error: "El concepto es obligatorio" }, { status: 400 });

  const max = await prisma.showRiderLinea.aggregate({ where: { showId }, _max: { orden: true } });

  const linea = await prisma.showRiderLinea.create({
    data: {
      showId,
      disciplina: typeof body.disciplina === "string" ? body.disciplina : "OTRO",
      concepto,
      cantidadPedida: Number.isFinite(Number(body.cantidadPedida)) ? Math.max(1, Number(body.cantidadPedida)) : 1,
      prioridad: typeof body.prioridad === "string" ? body.prioridad : "IMPORTANTE",
      notas: typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null,
      orden: (max._max.orden ?? 0) + 10,
    },
    include: INCLUDE,
  });

  return NextResponse.json({ linea });
}
