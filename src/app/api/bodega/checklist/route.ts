import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "8");

  const checklists = await prisma.checklistBodega.findMany({
    orderBy: { fechaInicio: "desc" },
    take: limit,
    include: {
      _count: { select: { items: true } },
      items: { select: { estado: true } },
    },
  });

  return NextResponse.json({ checklists });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const fecha = body.fechaInicio ? new Date(body.fechaInicio) : new Date();
  const semana = body.semana ?? isoWeek(fecha);

  // No duplicar semana
  const existe = await prisma.checklistBodega.findUnique({ where: { semana } });
  if (existe) return NextResponse.json({ error: "Ya existe un checklist para esta semana" }, { status: 409 });

  // Obtener templates activos para poblar el checklist
  const templates = await prisma.itemTemplateBodega.findMany({
    where: { activo: true },
    orderBy: [{ categoria: "asc" }, { orden: "asc" }],
  });

  const checklist = await prisma.checklistBodega.create({
    data: {
      semana,
      fechaInicio: fecha,
      estado: "EN_PROGRESO",
      creadoPor: session.name,
      items: {
        create: templates.map(t => ({
          descripcion: t.descripcion,
          categoria: t.categoria,
          orden: t.orden,
          estado: "PENDIENTE",
        })),
      },
    },
    include: {
      items: { orderBy: [{ categoria: "asc" }, { orden: "asc" }] },
    },
  });

  return NextResponse.json({ checklist });
}
