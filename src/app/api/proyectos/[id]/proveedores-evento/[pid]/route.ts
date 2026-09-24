import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { proveedorEventoInclude } from "../route";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { pid } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.nombreProveedor?.trim()) data.nombreProveedor = body.nombreProveedor.trim();
  for (const campo of ["servicioEquipo", "telefonoProveedor", "responsable", "notas"] as const) {
    if (body[campo] !== undefined) data[campo] = body[campo]?.trim() || null;
  }
  if (body.costoAcordado !== undefined) {
    data.costoAcordado = body.costoAcordado === null || body.costoAcordado === "" ? null : parseFloat(body.costoAcordado);
  }

  // Alta rápida al catálogo desde un bloque que nació como nombre suelto.
  if (!body.proveedorId && body.crearEnCatalogo) {
    const actual = await prisma.proveedorEvento.findUnique({ where: { id: pid } });
    if (!actual) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    const nombre = (body.nombreProveedor?.trim() || actual.nombreProveedor).trim();
    const telefono = body.telefonoProveedor !== undefined ? body.telefonoProveedor?.trim() || null : actual.telefonoProveedor;
    const creado = await prisma.proveedor.create({ data: { nombre, telefono } });
    data.proveedorId = creado.id;
  } else if (body.proveedorId !== undefined) {
    data.proveedorId = body.proveedorId || null;
  }

  const proveedor = await prisma.proveedorEvento.update({
    where: { id: pid },
    data,
    include: proveedorEventoInclude,
  });

  // El costo cambió y ya hay CxP: mantenerla al día en vez de dejarla desfasada.
  if (data.costoAcordado !== undefined && proveedor.cuentaPagarId && proveedor.costoAcordado) {
    await prisma.cuentaPagar.update({
      where: { id: proveedor.cuentaPagarId },
      data: { monto: proveedor.costoAcordado },
    });
  }

  return NextResponse.json({ proveedor });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { pid } = await params;
  // Los equipos vuelven a quedar sin proveedor asignado (FK con SET NULL); los bloques
  // de tiempo del proveedor se van en cascada.
  await prisma.proveedorEvento.delete({ where: { id: pid } });
  return NextResponse.json({ ok: true });
}
