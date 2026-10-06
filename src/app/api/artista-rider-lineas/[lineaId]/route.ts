import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { decisionInicial } from "@/lib/advance-gira";

/**
 * El interruptor de curaduría del advance, sobre la línea del rider maestro.
 *
 * La decisión se toma una vez y alcanza a todas las fechas: el rider es la
 * transcripción literal del documento del artista y trae renglones que no se
 * cotejan con el jefe técnico del foro (entarimado con faldón, toallas, agua,
 * "posición de FOH centrada"). Marcarlos fecha por fecha con «no aplica» obliga
 * a repetir la misma curaduría en cada show y en cada gira.
 *
 * Apagarlo borra el renglón de trabajo de todas las fechas en lugar de esconderlo:
 * así el semáforo, los PDF y el advance consolidado siguen cuadrando sin que cada
 * uno tenga que acordarse de filtrar. Prenderlo lo vuelve a sembrar vacío.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ lineaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { lineaId } = await params;

  const body = await req.json().catch(() => ({}));
  if (typeof body.enAdvance !== "boolean") {
    return NextResponse.json({ error: "enAdvance debe ser booleano" }, { status: 400 });
  }
  const enAdvance: boolean = body.enAdvance;

  const linea = await prisma.artistaRiderLinea.findUnique({
    where: { id: lineaId },
    select: {
      id: true,
      riderId: true,
      disciplina: true,
      concepto: true,
      cantidad: true,
      prioridad: true,
      provistoPor: true,
      equipoId: true,
    },
  });
  if (!linea) return NextResponse.json({ error: "Concepto del rider no encontrado" }, { status: 404 });

  await prisma.artistaRiderLinea.update({ where: { id: lineaId }, data: { enAdvance } });

  if (!enAdvance) {
    // Se avisa cuánto trabajo capturado se va con el renglón: la decisión es
    // reversible en estructura, pero el texto de la llamada no se recupera.
    const afectadas = await prisma.showRiderLinea.findMany({
      where: { riderLineaId: lineaId },
      select: { ofrecidoCasa: true, notas: true, cantidadCasa: true },
    });
    const conCaptura = afectadas.filter(
      (l) => l.ofrecidoCasa?.trim() || l.notas?.trim() || l.cantidadCasa > 0,
    ).length;
    await prisma.showRiderLinea.deleteMany({ where: { riderLineaId: lineaId } });
    return NextResponse.json({ enAdvance, fechas: afectadas.length, conCaptura });
  }

  // Al prenderlo se siembra en las fechas que ya están trabajando este rider.
  const conEsteRider = await prisma.showRiderLinea.findMany({
    where: { riderLinea: { riderId: linea.riderId } },
    select: { showId: true },
    distinct: ["showId"],
  });
  const yaTienen = new Set(
    (
      await prisma.showRiderLinea.findMany({
        where: { riderLineaId: lineaId },
        select: { showId: true },
      })
    ).map((l) => l.showId),
  );

  let fechas = 0;
  for (const { showId } of conEsteRider) {
    if (yaTienen.has(showId)) continue;
    const max = await prisma.showRiderLinea.aggregate({ where: { showId }, _max: { orden: true } });
    await prisma.showRiderLinea.create({
      data: {
        showId,
        riderLineaId: linea.id,
        disciplina: linea.disciplina,
        concepto: linea.concepto,
        cantidadPedida: linea.cantidad,
        prioridad: linea.prioridad,
        equipoId: linea.equipoId,
        orden: (max._max.orden ?? 0) + 10,
        ...decisionInicial(linea.provistoPor),
      },
    });
    fechas++;
  }

  return NextResponse.json({ enAdvance, fechas });
}
