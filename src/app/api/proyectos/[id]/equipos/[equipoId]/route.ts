import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sincronizarProveedoresDeEquipos } from "@/lib/proveedor-equipos";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; equipoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, equipoId } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("cantidad" in body) data.cantidad = body.cantidad;
  if ("dias" in body) data.dias = body.dias;
  if ("costoExterno" in body) data.costoExterno = body.costoExterno != null ? parseFloat(body.costoExterno) : null;
  if ("proveedorId" in body) data.proveedorId = body.proveedorId || null;
  if ("tipo" in body) data.tipo = body.tipo;
  if ("confirmado" in body) data.confirmado = body.confirmado;
  if ("notas" in body) data.notas = body.notas || null;
  if ("voltajeUso" in body) data.voltajeUso = body.voltajeUso || null;
  if ("escenarioId" in body) data.escenarioId = body.escenarioId || null;

  const item = await prisma.$transaction(async (tx) => {
    // El proveedor que lo traía antes también se recalcula: si le quitaron el
    // equipo, su renglón y su cuenta tienen que reflejarlo.
    const previo = await tx.proyectoEquipo.findUnique({
      where: { id: equipoId },
      select: { proveedorId: true },
    });

    const actualizado = await tx.proyectoEquipo.update({
      where: { id: equipoId },
      data,
      include: {
        equipo: { include: { categoria: { select: { nombre: true } } } },
        proveedor: { select: { nombre: true } },
      },
    });

    await sincronizarProveedoresDeEquipos(tx, id, [previo?.proveedorId, actualizado.proveedorId]);
    return actualizado;
  });

  return NextResponse.json({ item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; equipoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, equipoId } = await params;
  await prisma.$transaction(async (tx) => {
    const previo = await tx.proyectoEquipo.findUnique({
      where: { id: equipoId },
      select: { proveedorId: true },
    });
    await tx.proyectoEquipo.delete({ where: { id: equipoId } });
    await sincronizarProveedoresDeEquipos(tx, id, [previo?.proveedorId]);
  });
  return NextResponse.json({ ok: true });
}
