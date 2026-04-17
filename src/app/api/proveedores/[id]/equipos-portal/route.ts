import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET — listar equipos del proveedor (vista interna con auth)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const equipos = await prisma.equipoProveedor.findMany({
    where: { proveedorId: id },
    orderBy: [{ categoria: "asc" }, { descripcion: "asc" }],
  });
  return NextResponse.json({ equipos });
}

// PATCH — aprobar / rechazar un equipo (uso interno)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { equipoId, aprobado } = body;

  const equipo = await prisma.equipoProveedor.update({
    where: { id: equipoId, proveedorId: id },
    data: { aprobado },
  });
  return NextResponse.json({ equipo });
}
