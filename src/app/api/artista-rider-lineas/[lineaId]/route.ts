import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * El interruptor de curaduría del advance, sobre la línea del rider maestro.
 *
 * La decisión se toma una vez y alcanza a todas las fechas: el rider es la
 * transcripción literal del documento del artista y trae renglones que no se
 * cotejan con el jefe técnico del foro (entarimado con faldón, toallas, agua,
 * "posición de FOH centrada"). Marcarlos fecha por fecha obliga a repetir la
 * misma curaduría en cada show y en cada gira.
 *
 * Apagarlo solo lo saca del cotejo: el renglón de reparto que ya se haya escrito
 * en una fecha se queda, porque eso es trabajo hecho al teléfono. Por eso se
 * devuelve cuántas fechas ya lo tienen repartido — para avisar que ese renglón
 * sigue vivo aunque el punto del rider deje de aparecer en el cotejo.
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
    select: { id: true },
  });
  if (!linea) return NextResponse.json({ error: "Concepto del rider no encontrado" }, { status: 404 });

  await prisma.artistaRiderLinea.update({ where: { id: lineaId }, data: { enAdvance } });

  const repartidas = await prisma.showAdvanceReparto.findMany({
    where: { riderLineaId: lineaId },
    select: { showId: true },
    distinct: ["showId"],
  });

  return NextResponse.json({ enAdvance, fechasRepartidas: repartidas.length });
}
