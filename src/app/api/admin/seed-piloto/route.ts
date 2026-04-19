import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  if (req.headers.get("x-seed-secret") !== "mainstage-piloto-2025")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Todos los clientes Rodrigo Villanueva / Nexo Eventos
  const clientes = await prisma.cliente.findMany({
    where: { correo: "rodrigo@nexoeventos.mx" },
  });
  const clienteIds = clientes.map(c => c.id);

  if (clienteIds.length === 0)
    return NextResponse.json({ ok: true, eliminados: 0, mensaje: "Nada que limpiar." });

  const tratos = await prisma.trato.findMany({ where: { clienteId: { in: clienteIds } }, select: { id: true } });
  const tratoIds = tratos.map(t => t.id);
  const cots = await prisma.cotizacion.findMany({ where: { clienteId: { in: clienteIds } }, select: { id: true } });
  const cotIds = cots.map(c => c.id);
  const proyectos = await prisma.proyecto.findMany({ where: { clienteId: { in: clienteIds } }, select: { id: true } });
  const proyIds = proyectos.map(p => p.id);

  await prisma.$transaction(async (tx) => {
    if (proyIds.length) {
      await tx.cuentaCobrar.updateMany({ where: { proyectoId: { in: proyIds } }, data: { movimientoId: null } });
      await tx.cuentaPagar.updateMany({ where: { proyectoId: { in: proyIds } }, data: { movimientoId: null } });
      await tx.movimientoFinanciero.deleteMany({ where: { proyectoId: { in: proyIds } } });
      await tx.cuentaCobrar.deleteMany({ where: { proyectoId: { in: proyIds } } });
      await tx.cuentaPagar.deleteMany({ where: { proyectoId: { in: proyIds } } });
      await tx.proyectoPersonal.deleteMany({ where: { proyectoId: { in: proyIds } } });
      await tx.proyectoEquipo.deleteMany({ where: { proyectoId: { in: proyIds } } });
      await tx.proyectoChecklist.deleteMany({ where: { proyectoId: { in: proyIds } } });
      await tx.proyectoBitacora.deleteMany({ where: { proyectoId: { in: proyIds } } });
      await tx.proyecto.deleteMany({ where: { id: { in: proyIds } } });
    }
    if (cotIds.length) {
      await tx.cotizacionLinea.deleteMany({ where: { cotizacionId: { in: cotIds } } });
      await tx.cotizacion.deleteMany({ where: { id: { in: cotIds } } });
    }
    if (tratoIds.length) await tx.trato.deleteMany({ where: { id: { in: tratoIds } } });
    await tx.cliente.deleteMany({ where: { id: { in: clienteIds } } });
  });

  return NextResponse.json({
    ok: true,
    eliminados: { clientes: clienteIds.length, tratos: tratoIds.length, cotizaciones: cotIds.length },
  });
}
