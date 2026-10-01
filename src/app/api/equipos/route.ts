import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { imagenDeModeloExistente } from "@/lib/equipo-imagen";

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
  createdAt: true,
  proveedorDefaultId: true,
  proveedorDefault: { select: { id: true, nombre: true, empresa: true } },
  categoria: { select: { id: true, nombre: true, orden: true, disciplina: true } },
  notas: true,
  descripcionInterna: true,
  activo: true,
  amperajeRequerido: true,
  amperajeRequerido220: true,
  voltajeRequerido: true,
  pesoKg: true,
  huellaAnchoM: true,
  huellaLargoM: true,
  imagenUrl: true,
  imagenesUrls: true,
  tiposEvento: true,
  noCotizable: true,
  proveedoresPrecios: {
    where: { activo: true },
    select: {
      precio: true,
      proveedor: { select: { id: true, nombre: true, empresa: true, prioridad: true } },
    },
    orderBy: { proveedor: { prioridad: 'desc' as const } },
  },
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const todos = req.nextUrl.searchParams.get("todos") === "true";
  const tipo = req.nextUrl.searchParams.get("tipo"); // PROPIO | EXTERNO

  const where: Record<string, unknown> = todos ? {} : { activo: true };
  if (tipo) where.tipo = tipo;
  // Los equipos promovidos a Accesorio se ocultan de los selectores (siguen
  // resolviéndose por id en referencias históricas).
  where.estadoMigracion = null;

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
  const { descripcion, categoriaId, marca, modelo, tipo, precioRenta, costoProveedor, costoInternoEstimado, cantidadTotal, proveedorDefaultId, notas, amperajeRequerido, amperajeRequerido220, voltajeRequerido, imagenUrl, descripcionInterna, pesoKg, huellaAnchoM, huellaLargoM } = body;

  if (!descripcion || !categoriaId) {
    return NextResponse.json({ error: "descripcion y categoriaId son requeridos" }, { status: 400 });
  }

  const imagen = imagenUrl || (await imagenDeModeloExistente(marca, modelo));

  const equipo = await prisma.equipo.create({
    data: {
      descripcion,
      categoriaId,
      marca: marca || null,
      modelo: modelo || null,
      tipo: tipo || "PROPIO",
      precioRenta: parseFloat(precioRenta) || 0,
      costoProveedor: costoProveedor !== "" && costoProveedor != null ? parseFloat(costoProveedor) : null,
      costoInternoEstimado: costoInternoEstimado !== "" && costoInternoEstimado != null ? parseFloat(costoInternoEstimado) : null,
      cantidadTotal: parseInt(cantidadTotal) || 1,
      proveedorDefaultId: proveedorDefaultId || null,
      notas: notas || null,
      amperajeRequerido: amperajeRequerido !== "" && amperajeRequerido != null ? parseFloat(amperajeRequerido) : null,
      amperajeRequerido220: amperajeRequerido220 !== "" && amperajeRequerido220 != null ? parseFloat(amperajeRequerido220) : null,
      voltajeRequerido: voltajeRequerido !== "" && voltajeRequerido != null ? String(voltajeRequerido) : null,
      pesoKg: pesoKg !== "" && pesoKg != null ? parseFloat(pesoKg) : null,
      huellaAnchoM: huellaAnchoM !== "" && huellaAnchoM != null ? parseFloat(huellaAnchoM) : null,
      huellaLargoM: huellaLargoM !== "" && huellaLargoM != null ? parseFloat(huellaLargoM) : null,
      imagenUrl: imagen,
      descripcionInterna: descripcionInterna || null,
      activo: true,
    },
    select: EQUIPO_SELECT,
  });

  return NextResponse.json({ equipo }, { status: 201 });
}
