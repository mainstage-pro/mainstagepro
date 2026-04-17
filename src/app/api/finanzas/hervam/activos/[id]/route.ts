import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const activo = await prisma.hervamActivo.update({
    where: { id },
    data: {
      ...(body.nombre !== undefined && { nombre: body.nombre }),
      ...(body.descripcion !== undefined && { descripcion: body.descripcion || null }),
      ...(body.categoria !== undefined && { categoria: body.categoria }),
      ...(body.valorAdquisicion !== undefined && { valorAdquisicion: parseFloat(body.valorAdquisicion) }),
      ...(body.valorActual !== undefined && { valorActual: parseFloat(body.valorActual) }),
      ...(body.fechaAdquisicion !== undefined && { fechaAdquisicion: body.fechaAdquisicion ? new Date(body.fechaAdquisicion) : null }),
      ...(body.notas !== undefined && { notas: body.notas || null }),
    },
  });

  return NextResponse.json({ activo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.hervamActivo.update({ where: { id }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
