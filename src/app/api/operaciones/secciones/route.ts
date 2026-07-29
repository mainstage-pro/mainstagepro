import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { vincularSeccionConSubarea } from "@/lib/organizacion";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre, descripcion, proyectoId, orden, tipoModulo } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  if (!proyectoId) return NextResponse.json({ error: "proyectoId requerido" }, { status: 400 });

  const esPlan = tipoModulo === "PLAN";

  const seccion = await prisma.tareaSeccion.create({
    data: {
      nombre:      nombre.trim(),
      descripcion: typeof descripcion === "string" && descripcion.trim() ? descripcion.trim() : null,
      proyectoId,
      orden:       orden ?? 0,
      tipoModulo:  esPlan ? "PLAN" : "TAREA",
    },
  });

  // Las secciones del plan operativo son el spine de la organización: se vinculan
  // (o crean) como subárea del maestro para mantener la estructura sin pasos manuales.
  if (esPlan) {
    try { await vincularSeccionConSubarea(seccion.id); } catch { /* no bloquear la creación */ }
  }

  return NextResponse.json({ seccion }, { status: 201 });
}
