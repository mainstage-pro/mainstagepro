import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre, descripcion, proyectoId, orden, tipoModulo } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  if (!proyectoId) return NextResponse.json({ error: "proyectoId requerido" }, { status: 400 });

  const seccion = await prisma.tareaSeccion.create({
    data: {
      nombre:      nombre.trim(),
      descripcion: typeof descripcion === "string" && descripcion.trim() ? descripcion.trim() : null,
      proyectoId,
      orden:       orden ?? 0,
      tipoModulo:  tipoModulo === "PLAN" ? "PLAN" : "TAREA",
    },
  });

  return NextResponse.json({ seccion }, { status: 201 });
}
