import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/formularios/reporte-semanal — historial del usuario en sesión (o todos si es ADMIN)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  // ADMIN sin userId = todos los reportes | ADMIN con userId = filtrar por ese usuario | no-admin = solo propios
  const where =
    session.role === "ADMIN"
      ? userId
        ? { userId }
        : {} // sin filtro → todos
      : { userId: session.id }; // no-admin → solo propios

  const reportes = await prisma.reporteFormulario.findMany({
    where,
    orderBy: [{ anio: "desc" }, { semana: "desc" }],
    include: {
      user: { select: { id: true, name: true, area: true } },
    },
  });

  return NextResponse.json({ reportes });
}

// POST /api/formularios/reporte-semanal — crear reporte y las tareas comprometidas
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const {
    semana,
    anio,
    logros,
    pendientes,
    tareas,
    incidencias,
    mejoras,
    compromisos,
    sugerencias,
    bienestar,
    tareasOperaciones,
    compromisosPlan,
  } = body;

  if (!semana || !anio || bienestar === undefined) {
    return NextResponse.json(
      { error: "semana, anio y bienestar son requeridos" },
      { status: 400 }
    );
  }

  // Guard: prevent duplicate reports for same user+semana+anio
  const existing = await prisma.reporteFormulario.findFirst({
    where: {
      userId: session.id,
      semana: Number(semana),
      anio: Number(anio),
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un reporte para esta semana", reporteId: existing.id },
      { status: 409 }
    );
  }

  // Crear el reporte
  const reporte = await prisma.reporteFormulario.create({
    data: {
      userId: session.id,
      semana: Number(semana),
      anio: Number(anio),
      logros: logros ?? "",
      pendientes: pendientes ?? "",
      tareas: tareas ?? [],
      incidencias: incidencias ?? [],
      mejoras: mejoras ?? "",
      compromisos: compromisos ?? "",
      sugerencias: sugerencias ?? "",
      bienestar: Number(bienestar),
      estado: "enviado",
      tareasOperaciones: tareasOperaciones ?? [],
      compromisosPlan:   compromisosPlan   ?? [],
    },
    include: {
      user: { select: { id: true, name: true, area: true } },
    },
  });

  // Only create tasks that don't already exist (no tareaId — tasks with tareaId were already created via QuickAdd)
  const tareasArr = Array.isArray(tareas) ? tareas : [];
  const tareasNuevas = tareasArr.filter((t: { tareaId?: string; titulo?: string }) => !t.tareaId && t.titulo?.trim());
  if (tareasNuevas.length > 0) {
    const tareasData = tareasNuevas
      .map((t: { titulo: string; fechaVencimiento?: string | null }) => ({
        titulo: t.titulo.trim(),
        descripcion: `Tarea comprometida en Reporte Semanal — Semana ${semana}/${anio}`,
        area: session.area ?? "GENERAL",
        prioridad: "MEDIA",
        estado: "PENDIENTE",
        asignadoAId: session.id,
        creadoPorId: session.id,
        fechaVencimiento: t.fechaVencimiento ? new Date(t.fechaVencimiento) : null,
      }));

    await prisma.tarea.createMany({ data: tareasData });
  }

  return NextResponse.json({ reporte }, { status: 201 });
}
