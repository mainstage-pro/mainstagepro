import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const isAdmin = session.role === "ADMIN";

  // Para no-admin, obtener proyectos permitidos
  let proyectosPermitidos: string[] | null = null;
  if (!isAdmin) {
    const accesos = await prisma.proyectoAcceso.findMany({
      where: { userId: session.id },
      select: { proyectoId: true },
    });
    proyectosPermitidos = accesos.map((a: { proyectoId: string }) => a.proyectoId);
  }

  const carpetas = await prisma.tareaCarpeta.findMany({
    include: {
      proyectos: {
        where: {
          archivado: false,
          ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}),
        },
        orderBy: { orden: "asc" },
        select: { id: true, nombre: true, color: true, icono: true, orden: true },
      },
    },
    orderBy: { orden: "asc" },
  });

  // Filtrar carpetas vacías para no-admin
  const result = isAdmin ? carpetas : carpetas.filter(c => c.proyectos.length > 0);
  return NextResponse.json({ carpetas: result });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre, color, icono } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const carpeta = await prisma.tareaCarpeta.create({
    data: { nombre: nombre.trim(), color: color ?? null, icono: icono ?? null, creadoPorId: session.id },
  });

  return NextResponse.json({ carpeta }, { status: 201 });
}
