import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sincronizarProveedoresDeEquipos } from "@/lib/proveedor-equipos";

// Parte un renglón del rider en dos para cubrirlo desde varios orígenes: 6
// polipastos = 2 nuestros + 2 del proveedor A + 2 del proveedor B. La fila nueva
// nace como renta sin proveedor, que es la razón por la que se parte.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; equipoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, equipoId } = await params;
  const body = await req.json();
  const cantidad = Math.floor(Number(body.cantidad));

  const original = await prisma.proyectoEquipo.findFirst({
    where: { id: equipoId, proyectoId: id },
  });
  if (!original) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
  if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad >= original.cantidad) {
    return NextResponse.json(
      { error: `La cantidad a separar debe estar entre 1 y ${original.cantidad - 1}` },
      { status: 400 },
    );
  }

  const item = await prisma.$transaction(async (tx) => {
    await tx.proyectoEquipo.update({
      where: { id: original.id },
      data: { cantidad: original.cantidad - cantidad },
    });

    const nuevo = await tx.proyectoEquipo.create({
      data: {
        proyectoId: id,
        equipoId: original.equipoId,
        cotizacionId: original.cotizacionId,
        escenarioId: original.escenarioId,
        voltajeUso: original.voltajeUso,
        dias: original.dias,
        cantidad,
        tipo: "EXTERNO",
      },
    });

    await sincronizarProveedoresDeEquipos(tx, id, [original.proveedorId]);
    return nuevo;
  });

  return NextResponse.json({ item });
}
