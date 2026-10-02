import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { TIPOS_VIAJE, TIPO_VIAJE_LABEL, parseFechaHoraGira } from "@/lib/giras";
import { INCLUDE_VIAJE } from "@/lib/logistica-gira";

const TEXTO = ["concepto", "origen", "destino", "operador", "identificador", "reserva", "notas"] as const;
const FECHAS = ["salida", "llegada"] as const;
const RELACIONES = ["showId", "crewId"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ viajeId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { viajeId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("tipo" in body) {
    if (typeof body.tipo !== "string" || !TIPOS_VIAJE.includes(body.tipo)) {
      return NextResponse.json({ error: "Tipo de traslado inválido" }, { status: 400 });
    }
    data.tipo = body.tipo;
  }

  for (const campo of TEXTO) {
    if (!(campo in body)) continue;
    const v = body[campo];
    data[campo] = typeof v === "string" && v.trim() ? v.trim() : null;
  }

  for (const campo of FECHAS) {
    if (!(campo in body)) continue;
    data[campo] = parseFechaHoraGira(body[campo]);
  }

  for (const campo of RELACIONES) {
    if (!(campo in body)) continue;
    const v = body[campo];
    data[campo] = typeof v === "string" && v ? v : null;
  }

  if ("costo" in body) {
    const n = Number(body.costo);
    data.costo = body.costo === null || body.costo === "" || !Number.isFinite(n) ? null : n;
  }

  if ("esGrupal" in body) data.esGrupal = !!body.esGrupal;

  if ("orden" in body) {
    const n = Number(body.orden);
    data.orden = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada por actualizar" }, { status: 400 });

  try {
    const viaje = await prisma.giraViaje.update({ where: { id: viajeId }, data, include: INCLUDE_VIAJE });
    return NextResponse.json({ viaje });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el traslado" }, { status: 404 });
  }
}

/// GiraViaje no tiene bandera `activo`: un traslado cancelado se quita de la
/// logística. Lo que se cobró vive en su costo, no en el renglón.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ viajeId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { viajeId } = await params;
  const existente = await prisma.giraViaje.findUnique({
    where: { id: viajeId },
    select: { id: true, giraId: true, tipo: true, origen: true, destino: true },
  });
  if (!existente) return NextResponse.json({ error: "El traslado no existe" }, { status: 404 });

  await prisma.giraViaje.delete({ where: { id: viajeId } });

  await logActividad(
    session.id,
    "ELIMINAR",
    "GiraViaje",
    viajeId,
    `Quitó un traslado (${TIPO_VIAJE_LABEL[existente.tipo] ?? existente.tipo})` +
      `${existente.origen || existente.destino ? ` ${existente.origen ?? "?"} → ${existente.destino ?? "?"}` : ""}`,
    { giraId: existente.giraId },
  );

  return NextResponse.json({ ok: true });
}
