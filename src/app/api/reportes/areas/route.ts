import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/reportes/areas?semana=2026-05-04
// Si el usuario es ADMIN/DIRECCION devuelve todos los reportes de la semana.
// Si no, devuelve solo el reporte de su área.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const semana = searchParams.get("semana");

  if (!semana) return NextResponse.json({ error: "semana requerida (YYYY-MM-DD)" }, { status: 400 });

  const esDirector = session.role === "ADMIN" || session.area === "DIRECCION";
  const where = esDirector
    ? { semana }
    : { semana, area: session.area ?? "" };

  const reportes = await prisma.reporteAreaSemanal.findMany({
    where,
    include: { autor: { select: { id: true, name: true, area: true } } },
    orderBy: { area: "asc" },
  });

  return NextResponse.json({ reportes });
}

// POST /api/reportes/areas — crear o actualizar reporte del área del usuario autenticado
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { semana, resultados, kpis, compromisos, bloqueo } = body;

  if (!semana) return NextResponse.json({ error: "semana requerida" }, { status: 400 });

  const area = session.area ?? "GENERAL";

  const reporte = await prisma.reporteAreaSemanal.upsert({
    where: { area_semana: { area, semana } },
    update: {
      resultados: resultados ?? "",
      kpis: typeof kpis === "string" ? kpis : JSON.stringify(kpis ?? []),
      compromisos: compromisos ?? "",
      bloqueo: bloqueo || null,
      autorId: session.id,
    },
    create: {
      area,
      semana,
      autorId: session.id,
      resultados: resultados ?? "",
      kpis: typeof kpis === "string" ? kpis : JSON.stringify(kpis ?? []),
      compromisos: compromisos ?? "",
      bloqueo: bloqueo || null,
    },
    include: { autor: { select: { id: true, name: true, area: true } } },
  });

  return NextResponse.json({ reporte });
}

// PATCH /api/reportes/areas?id=xxx — marcar como revisado (solo ADMIN/DIRECCION)
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.area !== "DIRECCION")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const body = await req.json();
  const reporte = await prisma.reporteAreaSemanal.update({
    where: { id },
    data: { revisado: body.revisado ?? true },
  });

  return NextResponse.json({ reporte });
}
