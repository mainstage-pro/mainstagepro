import { prisma } from "@/lib/prisma";
import { PLANTILLA_GIRA, PLANTILLA_SHOW } from "@/lib/gira-advance-checklist";
import { puntosDelRider, SELECT_PUNTOS_RIDER, type PuntoRider } from "@/lib/rider-puntos";

/// Los puntos del rider que esta gira tiene que cotejar fecha por fecha. Salen
/// del rider que la gira trae amarrado, o del rider activo del artista.
async function puntosDeLaGira(giraId: string): Promise<PuntoRider[]> {
  const gira = await prisma.gira.findUnique({
    where: { id: giraId },
    select: { riderId: true, artistaId: true },
  });
  if (!gira) return [];

  const rider = await prisma.artistaRider.findFirst({
    where: gira.riderId ? { id: gira.riderId } : { artistaId: gira.artistaId, esActivo: true, activo: true },
    orderBy: { version: "desc" },
    select: SELECT_PUNTOS_RIDER,
  });

  return rider ? puntosDelRider(rider) : [];
}

/**
 * Siembra los renglones de plantilla que le falten a la gira y devuelve el
 * checklist completo. Es idempotente: la `llave` identifica cada renglón de
 * plantilla por alcance (gira o show), así que correrlo de nuevo no duplica.
 *
 * Se llama en cada lectura a propósito: si se agrega una fecha a la gira, o si
 * la plantilla crece, los renglones nuevos aparecen sin tener que resembrar nada
 * a mano. Un renglón de plantilla no se borra — se marca NO_APLICA.
 *
 * Los puntos del rider se siembran igual pero el rider manda sobre ellos: si el
 * texto del rider cambió, el renglón se actualiza, y si el punto desapareció del
 * rider el renglón se retira — salvo que ya se haya trabajado, porque entonces
 * tiene respuesta del venue y esa no se pierde.
 */
export async function sembrarChecklistGira(giraId: string) {
  const [shows, existentes, puntos] = await Promise.all([
    prisma.giraShow.findMany({ where: { giraId }, orderBy: { fecha: "asc" }, select: { id: true } }),
    prisma.giraChecklistItem.findMany({
      where: { giraId },
      select: {
        id: true,
        llave: true,
        showId: true,
        item: true,
        detalle: true,
        estado: true,
        notas: true,
        responsable: true,
      },
    }),
    puntosDeLaGira(giraId),
  ]);

  const yaEsta = new Set(existentes.map((e) => `${e.showId ?? ""}|${e.llave ?? ""}`));
  const porLlave = new Map(puntos.map((p) => [p.llave, p]));

  const faltantes = [
    ...PLANTILLA_GIRA.filter((p) => !yaEsta.has(`|${p.llave}`)).map((p, i) => ({
      giraId,
      showId: null,
      frente: p.frente,
      item: p.item,
      detalle: p.detalle,
      llave: p.llave,
      orden: i,
    })),
    ...shows.flatMap((s) => [
      ...PLANTILLA_SHOW.filter((p) => !yaEsta.has(`${s.id}|${p.llave}`)).map((p, i) => ({
        giraId,
        showId: s.id,
        frente: p.frente,
        item: p.item,
        detalle: p.detalle,
        llave: p.llave,
        orden: i,
      })),
      ...puntos
        .filter((p) => !yaEsta.has(`${s.id}|${p.llave}`))
        .map((p, i) => ({
          giraId,
          showId: s.id,
          frente: "RIDER",
          item: p.titulo,
          detalle: p.contenido,
          llave: p.llave,
          orden: i,
        })),
    ]),
  ];

  if (faltantes.length > 0) {
    await prisma.giraChecklistItem.createMany({ data: faltantes });
  }

  const delRider = existentes.filter((e) => e.llave?.startsWith("rider-"));

  const cambiados = delRider.filter((e) => {
    const p = porLlave.get(e.llave!);
    return p && (e.item !== p.titulo || e.detalle !== p.contenido);
  });
  for (const e of cambiados) {
    const p = porLlave.get(e.llave!)!;
    await prisma.giraChecklistItem.update({
      where: { id: e.id },
      data: { item: p.titulo, detalle: p.contenido },
    });
  }

  // El punto que el rider ya no pide se retira, pero solo si nadie lo trabajó.
  const sobrantes = delRider.filter(
    (e) => !porLlave.has(e.llave!) && e.estado === "PENDIENTE" && !e.notas && !e.responsable,
  );
  if (sobrantes.length > 0) {
    await prisma.giraChecklistItem.deleteMany({ where: { id: { in: sobrantes.map((e) => e.id) } } });
  }

  return prisma.giraChecklistItem.findMany({
    where: { giraId },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });
}
