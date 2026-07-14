import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const registro = await prisma.mantenimientoEquipo.findUnique({
    where: { id },
    select: { id: true, equipoId: true, unidadId: true },
  });
  if (!registro) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (body.costoReparacion !== undefined) updateData.costoReparacion = body.costoReparacion ? parseFloat(body.costoReparacion) : null;
  if (body.descripcionReparacion !== undefined) updateData.descripcionReparacion = body.descripcionReparacion || null;
  if (body.comentarios !== undefined) updateData.comentarios = body.comentarios || null;

  const updated = await prisma.mantenimientoEquipo.update({
    where: { id },
    data: updateData,
    include: {
      equipo: { select: { id: true, descripcion: true, estado: true } },
    },
  });

  // Si se indica cambio de estado del equipo (devuelto o dado de baja)
  if (body.nuevoEstadoEquipo) {
    const estadoEquipo = body.nuevoEstadoEquipo; // "ACTIVO" | "DADO_DE_BAJA"

    if (registro.unidadId) {
      // Actualizar unidad específica
      await prisma.equipoUnidad.update({
        where: { id: registro.unidadId },
        data: { estado: estadoEquipo },
      });
      // Recalcular estado del equipo padre
      const unidades = await prisma.equipoUnidad.findMany({
        where: { equipoId: registro.equipoId },
        select: { estado: true },
      });
      const algEnReparacion = unidades.some((u) => u.estado === "EN_REPARACION");
      const algEnMant = unidades.some((u) => u.estado === "EN_MANTENIMIENTO");
      const todasBaja = unidades.every((u) => u.estado === "DADO_DE_BAJA");
      const estadoPadre = todasBaja
        ? "DADO_DE_BAJA"
        : algEnReparacion
          ? "EN_REPARACION"
          : algEnMant
            ? "EN_MANTENIMIENTO"
            : "ACTIVO";
      await prisma.equipo.update({
        where: { id: registro.equipoId },
        data: {
          estado: estadoPadre,
          ...(estadoPadre === "DADO_DE_BAJA" ? { activo: false, fechaBaja: new Date() } : {}),
        },
      });
    } else {
      // Actualizar equipo directamente
      await prisma.equipo.update({
        where: { id: registro.equipoId },
        data: {
          estado: estadoEquipo,
          ...(estadoEquipo === "DADO_DE_BAJA"
            ? { activo: false, fechaBaja: new Date() }
            : { activo: true }),
        },
      });
    }
  }

  return NextResponse.json({ registro: updated });
}
