import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const equipo = await prisma.equipo.findUnique({
    where: { id },
    include: {
      categoria: { select: { id: true, nombre: true } },
      proveedorDefault: { select: { id: true, nombre: true, correo: true, telefono: true } },
      mantenimientos: {
        orderBy: { fecha: "desc" },
        take: 10,
        select: { id: true, fecha: true, tipo: true, accionRealizada: true, estadoEquipo: true, comentarios: true, proximoMantenimiento: true },
      },
      proyectoEquipos: {
        include: { proyecto: { select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true, estado: true, cliente: { select: { nombre: true } } } } },
        orderBy: { id: "desc" },
        take: 20,
      },
      unidades: { orderBy: { id: "asc" } },
      accesorios: { orderBy: [{ categoria: "asc" }, { nombre: "asc" }] },
    },
  });
  if (!equipo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ equipo });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "descripcion", "marca", "modelo", "tipo", "precioRenta", "costoProveedor",
    "cantidadTotal", "proveedorDefaultId", "notas", "activo", "estado",
    "categoriaId", "subcategoria", "imagenUrl", "imagenesUrls",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if (["precioRenta", "costoProveedor"].includes(key)) {
        data[key] = body[key] !== null && body[key] !== "" ? parseFloat(body[key]) : null;
      } else if (key === "cantidadTotal") {
        data[key] = body[key] !== null && body[key] !== "" ? parseInt(body[key]) : 1;
      } else {
        data[key] = body[key] ?? null;
      }
    }
  }
  if ("amperajeRequerido" in body) data.amperajeRequerido = body.amperajeRequerido !== "" && body.amperajeRequerido != null ? parseFloat(body.amperajeRequerido) : null;
  if ("voltajeRequerido" in body) data.voltajeRequerido = body.voltajeRequerido !== "" && body.voltajeRequerido != null ? parseInt(body.voltajeRequerido) : null;

  const equipo = await prisma.equipo.update({
    where: { id },
    data,
    include: {
      categoria: { select: { id: true, nombre: true } },
      proveedorDefault: { select: { id: true, nombre: true } },
    },
  });
  return NextResponse.json({ equipo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.equipo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
