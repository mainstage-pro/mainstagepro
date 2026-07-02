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
      ...(body.nombre      !== undefined && { nombre:           body.nombre.trim() }),
      ...(body.marca       !== undefined && { marca:            body.marca?.trim() || null }),
      ...(body.modelo      !== undefined && { modelo:           body.modelo?.trim() || null }),
      ...(body.descripcion !== undefined && { descripcion:      body.descripcion?.trim() || null }),
      ...(body.cantidad    !== undefined && { cantidad:         parseInt(body.cantidad) || 1 }),
      ...(body.categoria   !== undefined && { categoria:        body.categoria }),
      ...(body.propietario !== undefined && { propietario:      body.propietario }),
      ...(body.valorAdquisicion !== undefined && { valorAdquisicion: parseFloat(body.valorAdquisicion) || 0 }),
      ...(body.valorActual      !== undefined && { valorActual:      parseFloat(body.valorActual) || 0 }),
      ...(body.precioRenta      !== undefined && { precioRenta:      parseFloat(body.precioRenta) || 0 }),
      ...(body.fechaAdquisicion !== undefined && { fechaAdquisicion: body.fechaAdquisicion ? new Date(body.fechaAdquisicion) : null }),
      ...(body.notas       !== undefined && { notas:            body.notas?.trim() || null }),
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
