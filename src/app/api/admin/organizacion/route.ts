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
          _count: { select: { templates: true, secciones: true, puestos: true } },
        },
      },
    },
  });
  return NextResponse.json({ areas });
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
