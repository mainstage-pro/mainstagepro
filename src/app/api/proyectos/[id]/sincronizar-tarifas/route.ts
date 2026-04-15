import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * POST /api/proyectos/[id]/sincronizar-tarifas
 * Copia el precioUnitario de cada línea OPERACION_TECNICA de la cotización
 * al tarifaAcordada del personal del proyecto (por rolTecnicoId + orden de aparición).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      cotizacion: {
        include: {
          lineas: {
            where: { tipo: "OPERACION_TECNICA", rolTecnicoId: { not: null } },
            orderBy: { orden: "asc" },
          },
        },
      },
      personal: { orderBy: { id: "asc" } },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (!proyecto.cotizacion) return NextResponse.json({ error: "Sin cotización asociada" }, { status: 400 });

  const lineas = proyecto.cotizacion.lineas;
  if (lineas.length === 0) return NextResponse.json({ actualizados: 0 });

  // Expandir líneas igual que al aprobar: cantidad N → N slots
  const slots = lineas.flatMap(l =>
    Array.from({ length: Math.max(1, Math.round(l.cantidad)) }, () => ({
      rolTecnicoId: l.rolTecnicoId!,
      tarifa: l.precioUnitario,
    }))
  );

  // Emparejar personal del proyecto con slots por rolTecnicoId (en orden de creación)
  // Para cada rol, llevar un contador de cuántos ya se emparejaron
  const contadores: Record<string, number> = {};
  const slotsPorRol: Record<string, number[]> = {};

  for (const slot of slots) {
    if (!slotsPorRol[slot.rolTecnicoId]) slotsPorRol[slot.rolTecnicoId] = [];
    slotsPorRol[slot.rolTecnicoId].push(slot.tarifa);
  }

  let actualizados = 0;
  for (const p of proyecto.personal) {
    if (!p.rolTecnicoId) continue;
    const idx = contadores[p.rolTecnicoId] ?? 0;
    const tarifas = slotsPorRol[p.rolTecnicoId];
    if (!tarifas || idx >= tarifas.length) continue;

    const tarifa = tarifas[idx];
    if (tarifa > 0) {
      await prisma.proyectoPersonal.update({
        where: { id: p.id },
        data: { tarifaAcordada: tarifa },
      });
      actualizados++;
    }
    contadores[p.rolTecnicoId] = idx + 1;
  }

  return NextResponse.json({ actualizados });
}
