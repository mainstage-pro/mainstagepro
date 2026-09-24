import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const proveedorEventoInclude: Prisma.ProveedorEventoInclude = {
  proveedor: { select: { id: true, nombre: true, telefono: true } },
  cuentaPagar: { select: { id: true, monto: true, montoPagado: true, estado: true, fechaCompromiso: true } },
  bloques: { orderBy: [{ orden: "asc" }, { horaInicio: "asc" }] },
  lineas: {
    select: { id: true, descripcion: true, marca: true, modelo: true, cantidad: true, dias: true, tipo: true },
    orderBy: { orden: "asc" },
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const proveedores = await prisma.proveedorEvento.findMany({
    where: { proyectoId: id },
    orderBy: { createdAt: "asc" },
    include: proveedorEventoInclude,
  });
  return NextResponse.json({ proveedores });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  let proveedorId: string | null = body.proveedorId || null;
  let nombre: string = body.nombreProveedor?.trim() || "";
  let telefono: string | null = body.telefonoProveedor?.trim() || null;

  // Alta rápida al catálogo: nombre y celular, nada más.
  if (!proveedorId && body.crearEnCatalogo) {
    if (!nombre) return NextResponse.json({ error: "El nombre del proveedor es requerido" }, { status: 400 });
    const creado = await prisma.proveedor.create({ data: { nombre, telefono } });
    proveedorId = creado.id;
  } else if (proveedorId) {
    const cat = await prisma.proveedor.findUnique({ where: { id: proveedorId } });
    if (!cat) return NextResponse.json({ error: "El proveedor no existe" }, { status: 400 });
    nombre = nombre || cat.nombre;
    telefono = telefono ?? cat.telefono;
  }

  if (!nombre) {
    return NextResponse.json({ error: "El nombre del proveedor es requerido" }, { status: 400 });
  }

  const proveedor = await prisma.proveedorEvento.create({
    data: {
      proyectoId: id,
      proveedorId,
      nombreProveedor: nombre,
      servicioEquipo: body.servicioEquipo?.trim() || null,
      telefonoProveedor: telefono,
      responsable: body.responsable?.trim() || null,
      notas: body.notas?.trim() || null,
      costoAcordado: body.costoAcordado != null && body.costoAcordado !== "" ? parseFloat(body.costoAcordado) : null,
    },
    include: proveedorEventoInclude,
  });
  return NextResponse.json({ proveedor });
}
