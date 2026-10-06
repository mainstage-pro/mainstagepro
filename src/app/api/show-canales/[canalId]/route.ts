import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import {
  SELECT_CANAL,
  esSoporte,
  esTipoCanal,
  esTipoSalida,
  listasDelShow,
  renumerarCola,
} from "@/lib/show-canales";

const TEXTO = ["instrumento", "microfono", "notas"] as const;

/**
 * Edición canal por canal. El `tipo` y el `numero` no se tocan desde aquí: el
 * tipo decide en qué lista vive (y qué columnas tienen sentido) y el número lo
 * pone el servidor a continuación del rider maestro. Para cambiar de lista se
 * quita el canal y se agrega del otro lado.
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

  const esInput = existente.tipo === "INPUT";
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("nombre" in body) {
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    if (!nombre) return NextResponse.json({ error: "El canal necesita un nombre" }, { status: 400 });
    data.nombre = nombre;
  }

  for (const campo of TEXTO) {
    if (!(campo in body)) continue;
    // Micrófono e instrumento solo existen en una entrada: en una salida no se
    // escriben ni por error.
    if (campo !== "notas" && !esInput) continue;
    const v = body[campo];
    data[campo] = typeof v === "string" && v.trim() ? v.trim() : null;
  }

  if ("soporte" in body && esInput) {
    const v = body.soporte;
    if (v === null || v === "") data.soporte = null;
    else if (esSoporte(v)) data.soporte = v;
    else return NextResponse.json({ error: "Ese soporte no existe" }, { status: 400 });
  }

  if ("phantom" in body && esInput) data.phantom = body.phantom === true;

  if ("tipoSalida" in body && !esInput) {
    const v = body.tipoSalida;
    if (v === null || v === "") data.tipoSalida = null;
    else if (esTipoSalida(v)) data.tipoSalida = v;
    else return NextResponse.json({ error: "Ese tipo de salida no existe" }, { status: 400 });
  }

  const cambiaEstereo = "estereo" in body && !esInput && (body.estereo === true) !== existente.estereo;
  if ("estereo" in body && !esInput) data.estereo = body.estereo === true;

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada por actualizar" }, { status: 400 });

  const canal = await prisma.showCanal.update({ where: { id: canalId }, data, select: SELECT_CANAL });
  if (cambiaEstereo) await renumerarCola(existente.showId, existente.tipo);

  return NextResponse.json({ canal, listas: await listasDelShow(existente.showId) });
}

/// `ShowCanal` no tiene bandera `activo`: un canal que no se parcha, no existe.
/// Al quitarlo se recorre la cola para que la lista no quede con huecos.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ canalId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { canalId } = await params;
  const existente = await prisma.showCanal.findUnique({
    where: { id: canalId },
    select: { id: true, showId: true, tipo: true, numero: true, nombre: true },
  });
  if (!existente) return NextResponse.json({ error: "El canal no existe" }, { status: 404 });

  await prisma.showCanal.delete({ where: { id: canalId } });
  if (esTipoCanal(existente.tipo)) await renumerarCola(existente.showId, existente.tipo);

  await logActividad(
    session.id,
    "ELIMINAR",
    "ShowCanal",
    canalId,
    `Quitó ${existente.tipo === "INPUT" ? "la entrada" : "la salida"} ${existente.numero} «${existente.nombre}» de esta fecha`,
    { showId: existente.showId },
  );

  return NextResponse.json({ ok: true, listas: await listasDelShow(existente.showId) });
}
