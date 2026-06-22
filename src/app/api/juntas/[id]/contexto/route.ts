import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ─── Area name → search keyword for section matching ─────────────────────────
const AREA_SECTION_KEYWORDS: Record<string, string> = {
  ADMINISTRACION: "administraci",
  MARKETING:      "marketing",
  VENTAS:         "ventas",
  PRODUCCION:     "producci",
  DIRECCION:      "direcci",
};

// Flexible case-insensitive match for section names
function sectionMatchesArea(sectionName: string, area: string): boolean {
  const keyword = AREA_SECTION_KEYWORDS[area];
  if (!keyword) return false;
  return sectionName.toLowerCase().includes(keyword.toLowerCase());
}

export type TareaContexto = {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  estado: string;
  fechaVencimiento: string | null;
  asignadoA: { id: string; name: string } | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Load junta to get its area
  const junta = await prisma.junta.findUnique({
    where: { id },
    select: { area: true },
  });

  if (!junta) return NextResponse.json({ error: "Junta no encontrada" }, { status: 404 });

  const { area } = junta;

  // ── 1. Temas a tocar ───────────────────────────────────────────────────────
  // Find TareaProyecto whose name contains "Temas a tocar"
  const proyectoTemas = await prisma.tareaProyecto.findFirst({
    where: {
      archivado: false,
      nombre: { contains: "Temas a tocar", mode: "insensitive" },
    },
    include: {
      secciones: {
        include: {
          tareas: {
            where: { estado: { not: "COMPLETADA" }, parentId: null },
            orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
            select: {
              id: true, titulo: true, descripcion: true,
              prioridad: true, estado: true, fechaVencimiento: true,
              asignadoA: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  let temasJunta: TareaContexto[] = [];
  if (proyectoTemas) {
    const seccion = proyectoTemas.secciones.find((s) =>
      sectionMatchesArea(s.nombre, area)
    );
    if (seccion) {
      temasJunta = seccion.tareas.map((t) => ({
        ...t,
        fechaVencimiento: t.fechaVencimiento?.toISOString() ?? null,
        asignadoA: t.asignadoA ?? null,
      }));
    }
  }

  // ── 2. Observaciones Operativas ────────────────────────────────────────────
  const proyectoObs = await prisma.tareaProyecto.findFirst({
    where: {
      archivado: false,
      nombre: { contains: "Observaciones", mode: "insensitive" },
    },
    include: {
      secciones: {
        include: {
          tareas: {
            where: { estado: { not: "COMPLETADA" }, parentId: null },
            orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
            select: {
              id: true, titulo: true, descripcion: true,
              prioridad: true, estado: true, fechaVencimiento: true,
              asignadoA: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  let observaciones: TareaContexto[] = [];
  if (proyectoObs) {
    const seccion = proyectoObs.secciones.find((s) =>
      sectionMatchesArea(s.nombre, area)
    );
    if (seccion) {
      observaciones = seccion.tareas.map((t) => ({
        ...t,
        fechaVencimiento: t.fechaVencimiento?.toISOString() ?? null,
        asignadoA: t.asignadoA ?? null,
      }));
    }
  }

  // ── 3. Tareas pendientes del área ──────────────────────────────────────────
  // Tasks from this area that have an assignee and due date, not yet completed
  const PRIORIDAD_ORDER: Record<string, number> = {
    URGENTE: 0, ALTA: 1, MEDIA: 2, BAJA: 3,
  };

  const rawTareas = await prisma.tarea.findMany({
    where: {
      area,
      parentId: null,
      estado: { notIn: ["COMPLETADA", "CANCELADA"] },
      asignadoAId: { not: null },
    },
    orderBy: [{ fechaVencimiento: "asc" }, { orden: "asc" }],
    select: {
      id: true, titulo: true, descripcion: true,
      prioridad: true, estado: true, fechaVencimiento: true,
      asignadoA: { select: { id: true, name: true } },
    },
    take: 50,
  });

  // Secondary sort by priority within same day groups
  const tareasPendientes: TareaContexto[] = rawTareas
    .sort((a, b) => {
      // First by date (nulls last)
      if (a.fechaVencimiento && b.fechaVencimiento) {
        const diff = new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime();
        if (diff !== 0) return diff;
      } else if (a.fechaVencimiento) return -1;
      else if (b.fechaVencimiento) return 1;
      // Then by priority
      return (PRIORIDAD_ORDER[a.prioridad] ?? 99) - (PRIORIDAD_ORDER[b.prioridad] ?? 99);
    })
    .map((t) => ({
      ...t,
      fechaVencimiento: t.fechaVencimiento?.toISOString() ?? null,
      asignadoA: t.asignadoA ?? null,
    }));

  return NextResponse.json({ temasJunta, observaciones, tareasPendientes });
}
