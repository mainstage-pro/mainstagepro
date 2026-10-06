import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { camposDeCanal, esTipoCanal, listasDelShow, riderMaestroDelShow } from "@/lib/show-canales";

/**
 * Meterse con un renglón del rider maestro SOLO en esta fecha.
 *
 * El rider es el mismo para toda la gira y cambiarlo desde una plaza lo movería
 * en todas, así que lo que esta fecha quiere distinto nace como ajuste: un
 * `ShowCanal` colgado del renglón del rider que sustituye. Cambiar el micrófono
 * porque el venue solo tiene otro, o sacar un canal que aquí no se usa, no toca
 * el rider — y borrar el ajuste (DELETE del canal) regresa el renglón a como lo
 * dice el rider.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const body = await req.json();

  const riderCanalId = typeof body.riderCanalId === "string" ? body.riderCanalId : "";
  if (!riderCanalId) return NextResponse.json({ error: "Falta el renglón del rider" }, { status: 400 });

  // El renglón tiene que ser del rider que esta fecha usa: con el id de otro
  // rider el ajuste quedaría colgando de algo que la lista nunca lee.
  const rider = await riderMaestroDelShow(showId);
  const maestro = rider?.canales.find((c) => c.id === riderCanalId);
  if (!maestro) {
    return NextResponse.json({ error: "Ese canal no es del rider de esta fecha" }, { status: 400 });
  }
  if (!esTipoCanal(maestro.tipo)) {
    return NextResponse.json({ error: "El canal del rider tiene un tipo inválido" }, { status: 409 });
  }

  const campos = camposDeCanal(body, maestro.tipo);
  if ("error" in campos) return NextResponse.json({ error: campos.error }, { status: 400 });

  const oculto = "oculto" in body ? body.oculto === true : undefined;
  if (!Object.keys(campos.data).length && oculto === undefined) {
    return NextResponse.json({ error: "Nada por ajustar" }, { status: 400 });
  }

  const existente = await prisma.showCanal.findUnique({
    where: { showId_riderCanalId: { showId, riderCanalId } },
    select: { id: true },
  });

  const canal = existente
    ? await prisma.showCanal.update({
        where: { id: existente.id },
        data: { ...campos.data, ...(oculto === undefined ? {} : { oculto }) },
        select: { id: true },
      })
    : await prisma.showCanal.create({
        // El ajuste nace como copia del renglón del rider y encima lo que se
        // acaba de capturar: así la fila no se vacía al tocar una sola celda.
        data: {
          showId,
          riderCanalId,
          oculto: oculto === true,
          tipo: maestro.tipo,
          numero: maestro.numero,
          nombre: maestro.nombre,
          instrumento: maestro.instrumento,
          microfono: maestro.microfono,
          soporte: maestro.soporte,
          phantom: maestro.phantom,
          tipoSalida: maestro.tipoSalida,
          estereo: maestro.estereo,
          notas: maestro.notas,
          ...campos.data,
        },
        select: { id: true },
      });

  await logActividad(
    session.id,
    existente ? "ACTUALIZAR" : "CREAR",
    "ShowCanal",
    canal.id,
    oculto === true
      ? `Quitó «${maestro.nombre}» del rider solo en esta fecha`
      : oculto === false
        ? `Regresó «${maestro.nombre}» del rider a esta fecha`
        : `Ajustó «${maestro.nombre}» del rider solo en esta fecha`,
    { showId, riderCanalId },
  );

  return NextResponse.json({ listas: await listasDelShow(showId) });
}
