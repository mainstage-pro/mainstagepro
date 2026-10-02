import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { SIEMBRA_BLOQUES } from "@/lib/giras";

/**
 * Arma el day sheet con los horarios gruesos que ya tiene la plaza (load in,
 * montaje, soundcheck, doors, show, load out, curfew). Es idempotente: un bloque
 * con el mismo título no se duplica y nunca se sobrescribe lo capturado a mano,
 * porque el minuto a minuto es más fino que los horarios de la plaza.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const show = await prisma.giraShow.findUnique({ where: { id: showId } });
  if (!show) return NextResponse.json({ error: "La plaza no existe" }, { status: 404 });

  const existentesFilas = await prisma.giraShowBloque.findMany({
    where: { showId },
    select: { titulo: true },
  });
  const yaEstan = new Set(existentesFilas.map((b) => b.titulo.trim().toLowerCase()));

  const max = await prisma.giraShowBloque.aggregate({ where: { showId }, _max: { orden: true } });
  let orden = max._max.orden ?? 0;

  const registro = show as unknown as Record<string, string | null>;
  let agregados = 0;
  let existentes = 0;
  let sinHora = 0;

  for (const plantilla of SIEMBRA_BLOQUES) {
    const hora = registro[plantilla.campo];
    if (!hora) {
      sinHora++;
      continue;
    }
    if (yaEstan.has(plantilla.titulo.trim().toLowerCase())) {
      existentes++;
      continue;
    }
    orden += 10;
    await prisma.giraShowBloque.create({
      data: {
        showId,
        titulo: plantilla.titulo,
        tipo: plantilla.tipo,
        hora,
        horaFin: plantilla.campoFin ? (registro[plantilla.campoFin] ?? null) : null,
        orden,
      },
    });
    agregados++;
  }

  await logActividad(
    session.id,
    "SEMBRAR_DIA_SHOW",
    "GiraShow",
    showId,
    `Armó el día del show desde los horarios de la plaza: ${agregados} bloques nuevos`,
    { agregados, existentes, sinHora },
  );

  return NextResponse.json({ agregados, existentes, sinHora });
}
