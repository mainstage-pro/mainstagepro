import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { puedeEditarCapacitacion } from "@/lib/capacitacion";

// GET /api/capacitacion/categorias — Áreas con conteo de capacitaciones y progreso del usuario.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const categorias = await prisma.categoriaCapacitacion.findMany({
    where: { activo: true },
    orderBy: { orden: "asc" },
    include: { sesiones: { select: { id: true } } },
  });

  const completados = await prisma.progresoCapacitacion.findMany({
    where: { usuarioId: session.id, estado: "completado" },
    select: { sesionId: true },
  });
  const completadosSet = new Set(completados.map((c) => c.sesionId));

  const result = categorias.map((c) => {
    const total = c.sesiones.length;
    const completadas = c.sesiones.filter((s) => completadosSet.has(s.id)).length;
    return {
      id: c.id,
      nombre: c.nombre,
      slug: c.slug,
      color: c.color,
      icono: c.icono,
      orden: c.orden,
      total,
      completadas,
    };
  });

  return NextResponse.json({ categorias: result, puedeEditar: puedeEditarCapacitacion(session) });
}

// POST /api/capacitacion/categorias — Crear área (auto-orden al final).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEditarCapacitacion(session)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { nombre, color, icono } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Falta nombre" }, { status: 400 });

  const slugBase = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Evita colisión de slug
  let slug = slugBase || "area";
  let i = 1;
  while (await prisma.categoriaCapacitacion.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${i++}`;
  }

  const max = await prisma.categoriaCapacitacion.aggregate({ _max: { orden: true } });

  const cat = await prisma.categoriaCapacitacion.create({
    data: {
      nombre: nombre.trim(),
      slug,
      color: color || "#c9a96a",
      icono: icono || "GraduationCap",
      orden: (max._max.orden ?? -1) + 1,
    },
  });

  return NextResponse.json(cat, { status: 201 });
}
