import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DISCIPLINAS } from "@/lib/giras";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const items = await prisma.venueInventario.findMany({
    where: { venueId: id },
    orderBy: [{ disciplina: "asc" }, { orden: "asc" }],
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const venue = await prisma.venue.findUnique({ where: { id }, select: { id: true } });
  if (!venue) return NextResponse.json({ error: "Venue no encontrado" }, { status: 404 });

  const body = await req.json();
  const concepto = typeof body.concepto === "string" ? body.concepto.trim() : "";
  if (!concepto) return NextResponse.json({ error: "El concepto es obligatorio" }, { status: 400 });

  const disciplina =
    typeof body.disciplina === "string" && DISCIPLINAS.includes(body.disciplina as (typeof DISCIPLINAS)[number])
      ? body.disciplina
      : "OTRO";

  const max = await prisma.venueInventario.aggregate({ where: { venueId: id }, _max: { orden: true } });

  const item = await prisma.venueInventario.create({
    data: {
      venueId: id,
      disciplina,
      concepto,
      cantidad: Number.isFinite(Number(body.cantidad)) ? Math.max(1, Math.trunc(Number(body.cantidad))) : 1,
      marca: typeof body.marca === "string" && body.marca.trim() ? body.marca.trim() : null,
      modelo: typeof body.modelo === "string" && body.modelo.trim() ? body.modelo.trim() : null,
      condicion: typeof body.condicion === "string" && body.condicion ? body.condicion : null,
      incluidoEnRenta: body.incluidoEnRenta === undefined ? true : !!body.incluidoEnRenta,
      costoExtra: Number.isFinite(Number(body.costoExtra)) && body.costoExtra !== "" && body.costoExtra !== null
        ? Number(body.costoExtra)
        : null,
      notas: typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null,
      orden: (max._max.orden ?? 0) + 10,
    },
  });

  return NextResponse.json({ item });
}
