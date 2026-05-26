import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { pid } = await params;
  const body = await req.json();
  const proveedor = await prisma.proveedorEvento.update({
    where: { id: pid },
    data: {
      nombreProveedor: body.nombreProveedor?.trim() || undefined,
      servicioEquipo: body.servicioEquipo !== undefined ? (body.servicioEquipo?.trim() || null) : undefined,
      telefonoProveedor: body.telefonoProveedor !== undefined ? (body.telefonoProveedor?.trim() || null) : undefined,
    },
  });
  return NextResponse.json({ proveedor });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { pid } = await params;
  await prisma.proveedorEvento.delete({ where: { id: pid } });
  return NextResponse.json({ ok: true });
}
