import { Prisma } from "@prisma/client";

const ESTADOS_GIRA_AVANZADOS = ["CONFIRMADA", "EN_CURSO", "CERRADA"];

/**
 * Al aprobarse una PropuestaServicio: confirma los GiraShow que cubren sus
 * líneas y, si la propuesta está ligada a una gira, la pasa a CONFIRMADA
 * (salvo que ya esté en un estado más avanzado). Idempotente.
 */
export async function confirmarGiraDesdePropuesta(
  tx: Prisma.TransactionClient,
  propuestaId: string,
): Promise<void> {
  const propuesta = await tx.propuestaServicio.findUnique({
    where: { id: propuestaId },
    select: {
      giraId: true,
      lineas: { select: { showId: true } },
    },
  });
  if (!propuesta) return;

  const showIds = [...new Set(propuesta.lineas.map((l) => l.showId).filter((id): id is string => !!id))];
  if (showIds.length) {
    await tx.giraShow.updateMany({
      where: { id: { in: showIds } },
      data: { estado: "CONFIRMADO" },
    });
  }

  if (propuesta.giraId) {
    const gira = await tx.gira.findUnique({ where: { id: propuesta.giraId }, select: { estado: true } });
    if (gira && !ESTADOS_GIRA_AVANZADOS.includes(gira.estado)) {
      await tx.gira.update({ where: { id: propuesta.giraId }, data: { estado: "CONFIRMADA" } });
    }
  }
}
