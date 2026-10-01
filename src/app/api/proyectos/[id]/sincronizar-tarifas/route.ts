import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, puedeVerCostosTecnicos } from "@/lib/auth";

/**
 * POST /api/proyectos/[id]/sincronizar-tarifas
 * Copia el precioUnitario de cada línea OPERACION_TECNICA de la cotización
 * al tarifaAcordada del personal del proyecto (por rolTecnicoId + orden de aparición).
 *
 * Nunca toca un puesto ya pagado ni uno agregado a mano: detrás de esos montos
 * hay un movimiento financiero emitido o una tarifa negociada con la persona.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerCostosTecnicos(session)) {
    return NextResponse.json({ error: "Sin permiso para modificar tarifas de técnicos" }, { status: 403 });
  }

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
  if (lineas.length === 0) return NextResponse.json({ actualizados: 0, omitidos: 0 });

  // Expandir líneas igual que al aprobar: cantidad N → N slots
  const slotsPorRol: Record<string, number[]> = {};
  for (const l of lineas) {
    const rolId = l.rolTecnicoId!;
    if (!slotsPorRol[rolId]) slotsPorRol[rolId] = [];
    for (let i = 0; i < Math.max(1, Math.round(l.cantidad)); i++) {
      slotsPorRol[rolId].push(l.precioUnitario);
    }
  }

  // Emparejar personal del proyecto con slots por rolTecnicoId (en orden de creación)
  const contadores: Record<string, number> = {};
  let actualizados = 0;
  let omitidos = 0;

  for (const p of proyecto.personal) {
    if (!p.rolTecnicoId) continue;

    const tarifas = slotsPorRol[p.rolTecnicoId];
    if (!tarifas) continue;

    // El contador avanza aunque el puesto se omita: si no, el siguiente puesto
    // del mismo rol heredaría la tarifa del que acabamos de saltar.
    const idx = contadores[p.rolTecnicoId] ?? 0;
    if (idx >= tarifas.length) continue;
    contadores[p.rolTecnicoId] = idx + 1;

    if (p.estadoPago !== "PENDIENTE" || p.esAdicional) {
      omitidos++;
      continue;
    }

    const tarifa = tarifas[idx];
    if (tarifa > 0 && tarifa !== p.tarifaAcordada) {
      await prisma.proyectoPersonal.update({
        where: { id: p.id },
        data: { tarifaAcordada: tarifa },
      });
      actualizados++;
    }
  }

  return NextResponse.json({ actualizados, omitidos });
}
