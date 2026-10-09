import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { fechasConAjuste } from "@/lib/show-canales";

/**
 * Las fechas que tenían su propia versión de este renglón vuelven a leer el
 * rider.
 *
 * Editar el rider no mueve a la plaza que ya ajustó el renglón: se queda con lo
 * suyo en silencio, y eso es lo correcto casi siempre —el venue solo tenía otro
 * micrófono—. Pero cuando el cambio del rider es justo la corrección que todas
 * esperaban, respetarlas sería dejarlas mintiendo. Esto borra sus ajustes, que
 * es devolverlas al rider; lo que la plaza había capturado se pierde.
 *
 * Solo se tocan las fechas que de verdad divergen y que leen este rider: el
 * ajuste de una gira que ya cambió de rider es huérfano, no se parcha, y se
 * descarta desde su propia fecha.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ riderId: string; canalId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { riderId, canalId } = await params;

  const canal = await prisma.artistaRiderCanal.findFirst({
    where: { id: canalId, riderId },
    select: { id: true, nombre: true },
  });
  if (!canal) return NextResponse.json({ error: "Ese canal no es de este rider" }, { status: 404 });

  const fechas = (await fechasConAjuste(riderId))[canalId] ?? [];
  if (!fechas.length) {
    return NextResponse.json({ error: "Ninguna fecha tiene este renglón distinto" }, { status: 400 });
  }

  // Borrar el ajuste no mueve ningún número: la cola de la fecha arranca después
  // del rider, y el rider no cambió de tamaño.
  await prisma.showCanal.deleteMany({
    where: { riderCanalId: canalId, showId: { in: fechas.map((f) => f.showId) } },
  });

  await logActividad(
    session.id,
    "ACTUALIZAR",
    "ArtistaRider",
    riderId,
    `Realineó «${canal.nombre}» al rider en ${fechas.length} fecha${fechas.length === 1 ? "" : "s"}`,
    { canalId, shows: fechas.map((f) => f.showId) },
  );

  return NextResponse.json({ divergencias: await fechasConAjuste(riderId) });
}
