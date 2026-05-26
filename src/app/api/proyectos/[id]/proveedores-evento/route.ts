import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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
  const { nombreProveedor, servicioEquipo, telefonoProveedor } = await req.json();
  if (!nombreProveedor?.trim()) {
    return NextResponse.json({ error: "El nombre del proveedor es requerido" }, { status: 400 });
  }
  const proveedor = await prisma.proveedorEvento.create({
    data: {
      proyectoId: id,
      nombreProveedor: nombreProveedor.trim(),
      servicioEquipo: servicioEquipo?.trim() || null,
      telefonoProveedor: telefonoProveedor?.trim() || null,
    },
  });
  return NextResponse.json({ proveedor });
}
