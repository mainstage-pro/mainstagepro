import { prisma } from "@/lib/prisma";
import { PLANTILLA_GIRA, PLANTILLA_SHOW } from "@/lib/gira-advance-checklist";

/**
 * Siembra los renglones de plantilla que le falten a la gira y devuelve el
 * checklist completo. Es idempotente: la `llave` identifica cada renglón de
 * plantilla por alcance (gira o show), así que correrlo de nuevo no duplica.
 *
 * Se llama en cada lectura a propósito: si se agrega una fecha a la gira, o si
 * la plantilla crece, los renglones nuevos aparecen sin tener que resembrar nada
 * a mano. Un renglón de plantilla no se borra — se marca NO_APLICA.
 */
export async function sembrarChecklistGira(giraId: string) {
  const shows = await prisma.giraShow.findMany({
    where: { giraId },
    orderBy: { fecha: "asc" },
    select: { id: true },
  });

  const existentes = await prisma.giraChecklistItem.findMany({
    where: { giraId },
    select: { llave: true, showId: true },
  });
  const yaEsta = new Set(existentes.map(e => `${e.showId ?? ""}|${e.llave ?? ""}`));

  const faltantes = [
    ...PLANTILLA_GIRA.filter(p => !yaEsta.has(`|${p.llave}`)).map((p, i) => ({
      giraId,
      showId: null,
      frente: p.frente,
      item: p.item,
      detalle: p.detalle,
      llave: p.llave,
      orden: i,
    })),
    ...shows.flatMap(s =>
      PLANTILLA_SHOW.filter(p => !yaEsta.has(`${s.id}|${p.llave}`)).map((p, i) => ({
        giraId,
        showId: s.id,
        frente: p.frente,
        item: p.item,
        detalle: p.detalle,
        llave: p.llave,
        orden: i,
      })),
    ),
  ];

  if (faltantes.length > 0) {
    await prisma.giraChecklistItem.createMany({ data: faltantes });
  }

  return prisma.giraChecklistItem.findMany({
    where: { giraId },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });
}
