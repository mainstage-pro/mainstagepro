import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { TIPOS_VIAJE, TIPO_VIAJE_LABEL, parseFechaHoraGira } from "@/lib/giras";
import { INCLUDE_VIAJE } from "@/lib/logistica-gira";

const TEXTO = ["concepto", "origen", "destino", "operador", "identificador", "reserva", "notas"] as const;

/// Vuelos y traslados de la gira, en orden de salida.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const showId = req.nextUrl.searchParams.get("showId");

  const viajes = await prisma.giraViaje.findMany({
    where: { giraId: id, ...(showId ? { showId } : {}) },
    orderBy: [{ salida: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
    include: INCLUDE_VIAJE,
  });

  return NextResponse.json({ viajes });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true, nombre: true } });
  if (!gira) return NextResponse.json({ error: "La gira no existe" }, { status: 404 });

  const body = await req.json();
  const tipo = typeof body.tipo === "string" && TIPOS_VIAJE.includes(body.tipo) ? body.tipo : "VUELO";
  const costo = Number(body.costo);

  const max = await prisma.giraViaje.aggregate({ where: { giraId: id }, _max: { orden: true } });

  const viaje = await prisma.giraViaje.create({
    data: {
      giraId: id,
      showId: typeof body.showId === "string" && body.showId ? body.showId : null,
      crewId: typeof body.crewId === "string" && body.crewId ? body.crewId : null,
      tipo,
      ...Object.fromEntries(
        TEXTO.map((campo) => {
          const v = body[campo];
          return [campo, typeof v === "string" && v.trim() ? v.trim() : null];
        }),
      ),
      salida: parseFechaHoraGira(body.salida),
      llegada: parseFechaHoraGira(body.llegada),
      costo: body.costo === null || body.costo === "" || !Number.isFinite(costo) ? null : costo,
      // Un traslado grupal es el de la van que lleva a todos: no se repite un
      // renglón por persona.
      esGrupal: body.esGrupal === undefined ? true : !!body.esGrupal,
      orden: (max._max.orden ?? 0) + 10,
    },
    include: INCLUDE_VIAJE,
  });

  await logActividad(
    session.id,
    "CREAR",
    "GiraViaje",
    viaje.id,
    `Agregó un traslado (${TIPO_VIAJE_LABEL[tipo] ?? tipo}) a la gira ${gira.nombre}`,
  );

  return NextResponse.json({ viaje });
}
