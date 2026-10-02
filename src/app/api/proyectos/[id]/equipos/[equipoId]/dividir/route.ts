import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sincronizarProveedoresDeEquipos } from "@/lib/proveedor-equipos";
import { recortarPosicionesSobrantes } from "@/lib/posiciones-montaje";

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

    // El montaje no cambia porque cambie quién lo renta: las posiciones siguen
    // sumando lo mismo, solo se reparten entre las dos filas. Si no se movieran,
    // el layout contaría las de la fila original MÁS la cantidad de la nueva.
    const posiciones = await tx.proyectoEquipoPosicion.findMany({
      where: { proyectoEquipoId: original.id },
      orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    });
    const capturado = posiciones.reduce((s, p) => s + p.cantidad, 0);
    // Solo se mueve lo que ya no cabe en la fila original. Así, un montaje a medio
    // capturar sigue sumando lo mismo después de dividir.
    let porMover = Math.min(cantidad, Math.max(0, capturado - (original.cantidad - cantidad)));
    for (const p of posiciones) {
      if (porMover <= 0) break;
      if (p.cantidad <= porMover) {
        // La posición entera se va con la fila nueva conservando su id: las piezas
        // ya dibujadas en el plano la referencian y no deben quedar huérfanas.
        await tx.proyectoEquipoPosicion.update({
          where: { id: p.id },
          data: { proyectoEquipoId: nuevo.id },
        });
        porMover -= p.cantidad;
      } else {
        await tx.proyectoEquipoPosicion.update({
          where: { id: p.id },
          data: { cantidad: p.cantidad - porMover },
        });
        await tx.proyectoEquipoPosicion.create({
          data: {
            proyectoEquipoId: nuevo.id,
            cantidad: porMover,
            funcion: p.funcion,
            soporte: p.soporte,
            zona: p.zona,
            alturaM: p.alturaM,
            notas: p.notas,
            orden: p.orden,
          },
        });
        porMover = 0;
      }
    }

    await recortarPosicionesSobrantes(tx, original.id, original.cantidad - cantidad);

    await sincronizarProveedoresDeEquipos(tx, id, [original.proveedorId]);
    return nuevo;
  });

  return NextResponse.json({ item });
}
