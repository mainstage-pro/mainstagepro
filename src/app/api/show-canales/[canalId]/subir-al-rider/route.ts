import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { esTipoCanal, listasDelShow, renumerarCola, riderMaestroDelShow, topeDeCanales } from "@/lib/show-canales";

/**
 * Lo que esta fecha capturó pasa a ser lo que dice el rider maestro.
 *
 * Es el único lugar del módulo de fechas que escribe el rider, y solo cuando
 * quien captura lo pide: resulta que el cambio no era de la plaza —el micrófono
 * nuevo es el bueno para toda la gira— así que en vez de repetirlo fecha por
 * fecha se sube una vez y el ajuste desaparece. Las plazas que tienen SU PROPIA
 * versión de ese renglón la conservan: ajustar es una decisión de esa plaza y
 * subir esto no la pisa.
 *
 * El renglón que nació en la fecha se agrega al final de la lista del rider, así
 * que la cola de la fecha se recorre: el rider creció un canal.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ canalId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { canalId } = await params;

  const canal = await prisma.showCanal.findUnique({
    where: { id: canalId },
    select: {
      id: true,
      showId: true,
      riderCanalId: true,
      invitadoId: true,
      oculto: true,
      tipo: true,
      nombre: true,
      instrumento: true,
      microfono: true,
      soporte: true,
      phantom: true,
      tipoSalida: true,
      estereo: true,
      notas: true,
    },
  });
  if (!canal) return NextResponse.json({ error: "El canal no existe" }, { status: 404 });
  if (!esTipoCanal(canal.tipo)) {
    return NextResponse.json({ error: "El canal tiene un tipo inválido" }, { status: 409 });
  }
  if (canal.oculto) {
    return NextResponse.json(
      { error: "Esto está fuera de la lista solo aquí. Para quitarlo de toda la gira, bórralo del rider maestro." },
      { status: 400 },
    );
  }
  if (canal.invitadoId) {
    return NextResponse.json(
      { error: "Este canal es de un invitado de esta fecha, no del artista: no puede subir al rider." },
      { status: 400 },
    );
  }

  const rider = await riderMaestroDelShow(canal.showId);
  if (!rider) {
    return NextResponse.json({ error: "Esta fecha no lee ningún rider maestro" }, { status: 400 });
  }

  const esInput = canal.tipo === "INPUT";
  const campos = {
    nombre: canal.nombre,
    instrumento: esInput ? canal.instrumento : null,
    microfono: esInput ? canal.microfono : null,
    soporte: esInput ? canal.soporte : null,
    phantom: esInput ? canal.phantom : false,
    tipoSalida: esInput ? null : canal.tipoSalida,
    estereo: esInput ? false : canal.estereo,
    notas: canal.notas,
  };

  if (canal.riderCanalId) {
    const maestro = rider.canales.find((c) => c.id === canal.riderCanalId);
    if (!maestro) {
      return NextResponse.json(
        { error: "Ese renglón es de un rider que esta fecha ya no usa: vuelve a capturarlo sobre el renglón nuevo." },
        { status: 409 },
      );
    }
    await prisma.$transaction([
      prisma.artistaRiderCanal.update({ where: { id: canal.riderCanalId }, data: campos }),
      prisma.showCanal.delete({ where: { id: canal.id } }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.artistaRiderCanal.create({
        data: { riderId: rider.riderId, tipo: canal.tipo, numero: topeDeCanales(canal.tipo, rider.canales) + 1, ...campos },
      }),
      prisma.showCanal.delete({ where: { id: canal.id } }),
    ]);
    await renumerarCola(canal.showId, canal.tipo);
  }

  await logActividad(
    session.id,
    "ACTUALIZAR",
    "ArtistaRider",
    rider.riderId,
    canal.riderCanalId
      ? `Subió al rider «${canal.nombre}» como lo capturó una fecha`
      : `Agregó al rider ${esInput ? "la entrada" : "la salida"} «${canal.nombre}» que nació en una fecha`,
    { showId: canal.showId, riderCanalId: canal.riderCanalId },
  );

  return NextResponse.json({ listas: await listasDelShow(canal.showId) });
}
