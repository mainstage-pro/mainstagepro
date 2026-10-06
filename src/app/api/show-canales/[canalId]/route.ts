import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { SELECT_CANAL, camposDeCanal, esTipoCanal, listasDelShow, renumerarCola } from "@/lib/show-canales";

/**
 * Edición canal por canal, lo mismo si el canal nació en esta fecha que si es el
 * ajuste de un renglón del rider. El `tipo` y el `numero` no se tocan desde
 * aquí: el tipo decide en qué lista vive (y qué columnas tienen sentido) y el
 * número lo deriva la lista unificada. Para cambiar de lista se quita el canal y
 * se agrega del otro lado.
 *
 * Volver estéreo una salida sí se puede, y por eso se recorre la cola: el mix
 * estéreo se lleva dos canales de consola y lo que viene después se mueve.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ canalId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { canalId } = await params;

  const existente = await prisma.showCanal.findUnique({
    where: { id: canalId },
    select: { id: true, showId: true, tipo: true, estereo: true },
  });
  if (!existente) return NextResponse.json({ error: "El canal no existe" }, { status: 404 });
  if (!esTipoCanal(existente.tipo)) {
    return NextResponse.json({ error: "El canal tiene un tipo inválido" }, { status: 409 });
  }

  const body = await req.json();
  const campos = camposDeCanal(body, existente.tipo);
  if ("error" in campos) return NextResponse.json({ error: campos.error }, { status: 400 });
  if (!Object.keys(campos.data).length) {
    return NextResponse.json({ error: "Nada por actualizar" }, { status: 400 });
  }

  const cambiaEstereo = "estereo" in campos.data && campos.data.estereo !== existente.estereo;

  const canal = await prisma.showCanal.update({ where: { id: canalId }, data: campos.data, select: SELECT_CANAL });
  if (cambiaEstereo) await renumerarCola(existente.showId, existente.tipo);

  return NextResponse.json({ canal, listas: await listasDelShow(existente.showId) });
}

/**
 * Borra el `ShowCanal`. Significa dos cosas distintas según de dónde salió:
 * en un canal propio de la plaza es quitarlo de la lista, y en un ajuste es
 * devolver el renglón del rider a como el rider lo dice.
 *
 * `ShowCanal` no tiene bandera `activo`: un canal que no se parcha, no existe
 * (sacar un renglón del rider solo en esta fecha es `oculto`, no un borrado). Al
 * quitarlo se recorre la cola para que la lista no quede con huecos.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ canalId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { canalId } = await params;
  const existente = await prisma.showCanal.findUnique({
    where: { id: canalId },
    select: { id: true, showId: true, tipo: true, numero: true, nombre: true, riderCanalId: true },
  });
  if (!existente) return NextResponse.json({ error: "El canal no existe" }, { status: 404 });

  await prisma.showCanal.delete({ where: { id: canalId } });
  if (esTipoCanal(existente.tipo)) await renumerarCola(existente.showId, existente.tipo);

  await logActividad(
    session.id,
    "ELIMINAR",
    "ShowCanal",
    canalId,
    existente.riderCanalId
      ? `Dejó «${existente.nombre}» como lo dice el rider de la gira`
      : `Quitó ${existente.tipo === "INPUT" ? "la entrada" : "la salida"} ${existente.numero} «${existente.nombre}» de esta fecha`,
    { showId: existente.showId, riderCanalId: existente.riderCanalId },
  );

  return NextResponse.json({ ok: true, listas: await listasDelShow(existente.showId) });
}
