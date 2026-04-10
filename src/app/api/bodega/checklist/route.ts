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

  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "12");

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

  const existe = await prisma.checklistBodega.findUnique({
    where: { semana },
    include: { _count: { select: { items: true } } },
  });
  // Si ya existe con items, devolver el existente
  if (existe && (existe as typeof existe & { _count: { items: number } })._count.items > 0) {
    return NextResponse.json({ checklist: existe, ya_existe: true }, { status: 200 });
  }
  // Si existe pero está vacío, eliminarlo para recrear con inventario actualizado
  if (existe) await prisma.checklistBodega.delete({ where: { semana } });

  const equipos = await prisma.equipo.findMany({
    where: { tipo: "PROPIO", activo: true, estado: { not: "PERDIDO" } },
    include: { categoria: { select: { nombre: true } } },
    orderBy: [{ categoriaId: "asc" }, { descripcion: "asc" }],
  });

  const checklist = await prisma.checklistBodega.create({
    data: {
      semana,
      fechaInicio: fecha,
      estado: "EN_PROGRESO",
      creadoPor: session.name,
      items: {
        create: equipos.map((e, idx) => ({
          equipoId: e.id,
          descripcion: [e.marca, e.modelo, e.descripcion].filter(Boolean).join(" — "),
          categoria: e.categoria.nombre,
          orden: idx,
          estado: "PENDIENTE",
        })),
      },
    },
    include: {
      items: {
        orderBy: [{ categoria: "asc" }, { orden: "asc" }],
        include: { equipo: { select: { id: true, descripcion: true, cantidadTotal: true, estado: true } } },
      },
    },
  });

  return NextResponse.json({ checklist }, { status: 201 });
}
