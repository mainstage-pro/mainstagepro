import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import {
  REQUERIMIENTO_POR_CLAVE,
  SELECT_CANAL,
  SELECT_INVITADO,
  aInvitadoFila,
  datosDeRequerimiento,
  listasDelShow,
  renumerarCola,
  riderMaestroDelShow,
  siguienteNumero,
} from "@/lib/show-canales";

const INCLUDE = { ...SELECT_INVITADO, canales: { select: SELECT_CANAL } } as const;

/**
 * Prende o apaga un requerimiento del invitado, y con él su canal de consola.
 *
 * Prenderlo hace nacer un `ShowCanal` con la plantilla de
 * `REQUERIMIENTOS_INVITADO`, numerado a continuación del rider maestro: si el
 * rider llega al input 32, el micrófono del telonero es el 33. Las entradas y
 * las salidas llevan secuencias separadas. Apagarlo se lleva el canal.
 *
 * Es idempotente: pedir dos veces lo mismo no duplica el canal.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ invitadoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { invitadoId } = await params;
  const body = await req.json();

  const clave = typeof body.clave === "string" ? body.clave : "";
  const req0 = REQUERIMIENTO_POR_CLAVE[clave];
  if (!req0) return NextResponse.json({ error: "Ese requerimiento no existe" }, { status: 400 });
  if (typeof body.activo !== "boolean") {
    return NextResponse.json({ error: "activo debe ser true o false" }, { status: 400 });
  }

  const invitado = await prisma.showInvitado.findUnique({
    where: { id: invitadoId },
    select: { id: true, showId: true, nombre: true, canales: { select: SELECT_CANAL } },
  });
  if (!invitado) return NextResponse.json({ error: "El invitado no existe" }, { status: 404 });

  const yaEstan = invitado.canales.filter((c) => c.requerimiento === clave);

  if (body.activo) {
    if (yaEstan.length === 0) {
      const [rider, delShow, max] = await Promise.all([
        riderMaestroDelShow(invitado.showId),
        prisma.showCanal.findMany({
          where: { showId: invitado.showId },
          select: { tipo: true, numero: true, estereo: true },
        }),
        prisma.showCanal.aggregate({ where: { showId: invitado.showId }, _max: { orden: true } }),
      ]);

      const numero = siguienteNumero(req0.tipo, rider?.canales ?? [], delShow);
      const canal = await prisma.showCanal.create({
        data: {
          showId: invitado.showId,
          ...datosDeRequerimiento(req0, invitado, numero, (max._max.orden ?? 0) + 10),
        },
        select: { id: true },
      });

      await logActividad(
        session.id,
        "CREAR",
        "ShowCanal",
        canal.id,
        `${req0.label} para «${invitado.nombre}»: ${req0.tipo === "INPUT" ? "entrada" : "salida"} ${numero}`,
        { showId: invitado.showId, invitadoId, clave },
      );
    }
  } else if (yaEstan.length > 0) {
    await prisma.showCanal.deleteMany({ where: { id: { in: yaEstan.map((c) => c.id) } } });
    await renumerarCola(invitado.showId, req0.tipo);
    await logActividad(
      session.id,
      "ELIMINAR",
      "ShowCanal",
      yaEstan[0].id,
      `Quitó ${req0.label.toLowerCase()} de «${invitado.nombre}»`,
      { showId: invitado.showId, invitadoId, clave, quitados: yaEstan.length },
    );
  }

  const [fresco, listas] = await Promise.all([
    prisma.showInvitado.findUnique({ where: { id: invitadoId }, select: INCLUDE }),
    listasDelShow(invitado.showId),
  ]);
  if (!fresco) return NextResponse.json({ error: "El invitado no existe" }, { status: 404 });

  return NextResponse.json({ invitado: aInvitadoFila(fresco), listas });
}
