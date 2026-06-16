import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/** GET — preview cuántos registros necesitan corrección */
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const count = await prisma.cotizacionLinea.count({
    where: { equipoId: { not: null }, modelo: null, tipo: "EQUIPO_PROPIO" },
  });

  const sample = await prisma.cotizacionLinea.findMany({
    where: { equipoId: { not: null }, modelo: null, tipo: "EQUIPO_PROPIO" },
    select: {
      id: true,
      descripcion: true,
      marca: true,
      modelo: true,
      equipo: { select: { marca: true, modelo: true, descripcion: true } },
    },
    take: 5,
  });

  return NextResponse.json({ pendientes: count, muestra: sample });
}

/** POST — ejecuta el backfill */
export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const lineas = await prisma.cotizacionLinea.findMany({
    where: { equipoId: { not: null }, modelo: null, tipo: "EQUIPO_PROPIO" },
    select: {
      id: true,
      equipoId: true,
      marca: true,
      equipo: { select: { marca: true, modelo: true } },
    },
  });

  let actualizadas = 0;
  let sinDatos = 0;

  for (const linea of lineas) {
    const equipo = linea.equipo;
    if (!equipo) { sinDatos++; continue; }

    const nuevaMarca = linea.marca || equipo.marca || null;
    const nuevoModelo = equipo.modelo || null;

    if (!nuevoModelo && !nuevaMarca) { sinDatos++; continue; }

    await prisma.cotizacionLinea.update({
      where: { id: linea.id },
      data: { marca: nuevaMarca, modelo: nuevoModelo },
    });
    actualizadas++;
  }

  return NextResponse.json({
    ok: true,
    total: lineas.length,
    actualizadas,
    sinDatos,
    mensaje: `Backfill completado. ${actualizadas} líneas corregidas, ${sinDatos} sin datos en inventario.`,
  });
}
