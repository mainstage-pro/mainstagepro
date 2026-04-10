import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const EQUIPO_SELECT = {
  id: true,
  descripcion: true,
  marca: true,
  modelo: true,
  tipo: true,
  precioRenta: true,
  costoProveedor: true,
  cantidadTotal: true,
  estado: true,
  proveedorDefaultId: true,
  proveedorDefault: { select: { id: true, nombre: true } },
  categoria: { select: { id: true, nombre: true, orden: true } },
  notas: true,
  activo: true,
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const todos = req.nextUrl.searchParams.get("todos") === "true";
  const tipo = req.nextUrl.searchParams.get("tipo"); // PROPIO | EXTERNO

  const where: Record<string, unknown> = todos ? {} : { activo: true };
  if (tipo) where.tipo = tipo;

  const equipos = await prisma.equipo.findMany({
    where,
    select: EQUIPO_SELECT,
    orderBy: [{ categoria: { orden: "asc" } }, { descripcion: "asc" }],
  });

  return NextResponse.json({ equipos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { descripcion, categoriaId, marca, modelo, tipo, precioRenta, costoProveedor, cantidadTotal, proveedorDefaultId, notas } = body;

  if (!descripcion || !categoriaId) {
    return NextResponse.json({ error: "descripcion y categoriaId son requeridos" }, { status: 400 });
  }

  const equipo = await prisma.equipo.create({
    data: {
      descripcion,
      categoriaId,
      marca: marca || null,
      modelo: modelo || null,
      tipo: tipo || "PROPIO",
      precioRenta: parseFloat(precioRenta) || 0,
      costoProveedor: costoProveedor !== "" && costoProveedor != null ? parseFloat(costoProveedor) : null,
      cantidadTotal: parseInt(cantidadTotal) || 1,
      proveedorDefaultId: proveedorDefaultId || null,
      notas: notas || null,
      activo: true,
    },
    select: EQUIPO_SELECT,
  });

  return NextResponse.json({ equipo }, { status: 201 });
}
