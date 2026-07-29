import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Módulo maestro "Áreas y organización": fuente única de las áreas de la empresa
// y sus subáreas. Administra las tablas PTArea / PTSubArea (mismas que consume el
// Plan de Trabajo). El `codigo` es estable; el `nombre` es la etiqueta editable.

// GET: lista de áreas con sus subáreas.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const areas = await prisma.pTArea.findMany({
    orderBy: { orden: "asc" },
    include: {
      subareas: {
        orderBy: { orden: "asc" },
        select: {
          id: true, nombre: true, descripcion: true, orden: true,
          _count: { select: { secciones: true, puestos: true } },
          // Tareas reales que cuelgan de las secciones de la subárea (Gestión
          // Operativa). Es el número que debe cuadrar con el plan de trabajo.
          secciones: { select: { _count: { select: { tareas: true } } } },
        },
      },
    },
  });

  const shaped = areas.map((a) => ({
    ...a,
    subareas: a.subareas.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      descripcion: s.descripcion,
      orden: s.orden,
      _count: {
        secciones: s._count.secciones,
        puestos: s._count.puestos,
        tareas: s.secciones.reduce((acc, sec) => acc + sec._count.tareas, 0),
      },
    })),
  }));

  return NextResponse.json({ areas: shaped });
}

// POST: crea un área nueva (código opcional; el nombre es la etiqueta).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { nombre, color, objetivo, codigo } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  const last = await prisma.pTArea.findFirst({ orderBy: { orden: "desc" }, select: { orden: true } });
  const area = await prisma.pTArea.create({
    data: {
      nombre: nombre.trim(),
      color: color?.trim() || "#1a1a2e",
      objetivo: objetivo?.trim() || null,
      codigo: codigo?.trim()?.toUpperCase() || null,
      orden: (last?.orden ?? 0) + 1,
    },
  });
  return NextResponse.json({ area }, { status: 201 });
}
