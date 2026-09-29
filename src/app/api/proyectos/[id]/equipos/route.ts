import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sincronizarProveedoresDeEquipos } from "@/lib/proveedor-equipos";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { equipoId, tipo, cantidad, dias, costoExterno, proveedorId, notas } = body;

  if (!equipoId) return NextResponse.json({ error: "equipoId requerido" }, { status: 400 });

  const item = await prisma.$transaction(async (tx) => {
    const creado = await tx.proyectoEquipo.create({
      data: {
        proyectoId: id,
        equipoId,
        tipo: tipo ?? "PROPIO",
        cantidad: cantidad ?? 1,
        dias: dias ?? 1,
        costoExterno: costoExterno ? parseFloat(costoExterno) : null,
        proveedorId: proveedorId || null,
        notas: notas || null,
        confirmado: false,
      },
      include: {
        equipo: { include: { categoria: { select: { nombre: true } } } },
        proveedor: { select: { nombre: true } },
      },
    });

    // El equipo de tercero abre el renglón de su proveedor; la cuenta por pagar
    // se confirma después en finanzas, no al vuelo desde el rider.
    await sincronizarProveedoresDeEquipos(tx, id, [creado.proveedorId]);
    return creado;
  });

  return NextResponse.json({ item });
}
