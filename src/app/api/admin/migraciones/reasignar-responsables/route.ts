import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/migraciones/reasignar-responsables
 * Reasigna el responsableId y vendedorId de todos los tratos a Mauricio Hernández.
 * Requiere rol ADMIN. Idempotente.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dryRun !== false; // default: dry run, pasar dryRun:false para ejecutar

  // Buscar a Mauricio por área VENTAS (o por email exacto si se proporciona)
  const mauricio = await prisma.user.findFirst({
    where: {
      area: "VENTAS",
      active: true,
    },
    select: { id: true, name: true, email: true, area: true },
  });

  if (!mauricio) {
    return NextResponse.json(
      { error: "No se encontró ningún usuario con area=VENTAS activo" },
      { status: 404 }
    );
  }

  // Contar tratos que se actualizarían
  const totalTratos = await prisma.trato.count();
  const tratosSinResponsable = await prisma.trato.count({
    where: { responsableId: null },
  });
  const tratosConOtroResponsable = await prisma.trato.count({
    where: { responsableId: { not: mauricio.id } },
  });

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      mauricio: { id: mauricio.id, name: mauricio.name, email: mauricio.email },
      totales: {
        totalTratos,
        tratosSinResponsable,
        tratosConOtroResponsable,
        aActualizar: tratosConOtroResponsable + tratosSinResponsable,
      },
      mensaje: "Esto es un dry-run. Envía dryRun:false para ejecutar la migración.",
    });
  }

  // Ejecutar migración
  const updateResult = await prisma.trato.updateMany({
    where: { responsableId: { not: mauricio.id } },
    data: { responsableId: mauricio.id },
  });

  // También actualizar vendedorId donde sea null
  const updateVendedor = await prisma.trato.updateMany({
    where: { vendedorId: null },
    data: { vendedorId: mauricio.id },
  });

  return NextResponse.json({
    ok: true,
    mauricio: { id: mauricio.id, name: mauricio.name },
    responsableId: {
      actualizados: updateResult.count,
    },
    vendedorId: {
      actualizados: updateVendedor.count,
    },
  });
}
