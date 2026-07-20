import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureOperacionTecnicaColumns } from "@/lib/migraciones-lazy";
import { emptyEvalData, type EvalPostEventoData, type ItemResp, type FotoReporte } from "@/lib/evaluacion-post-evento";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureOperacionTecnicaColumns();
  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      evaluacionPostEvento: true,
      equipos: { select: { cantidad: true, equipo: { select: { descripcion: true } } } },
      cotizacion: { select: { lineas: { select: { tipo: true, descripcion: true, cantidad: true, marca: true } } } },
    },
  });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  // Contexto de equipos (sin candado de finanzas): primero los del proyecto; si no
  // hay (típico en renta), se toman de las líneas de equipo de la cotización.
  type Eq = { nombre: string; cantidad: number };
  let equiposFuente: Eq[] = (proyecto.equipos ?? [])
    .map((pe) => ({ nombre: (pe.equipo?.descripcion ?? "").trim(), cantidad: pe.cantidad ?? 1 }))
    .filter((e) => e.nombre);
  if (equiposFuente.length === 0 && proyecto.cotizacion) {
    const tiposEquipo = ["EQUIPO_PROPIO", "EQUIPO_EXTERNO", "PAQUETE", "OTRO"];
    equiposFuente = (proyecto.cotizacion.lineas ?? [])
      .filter((l) => tiposEquipo.includes(l.tipo))
      .map((l) => ({ nombre: `${l.marca ? `${l.marca} ` : ""}${l.descripcion ?? ""}`.trim(), cantidad: l.cantidad ?? 1 }))
      .filter((e) => e.nombre);
  }
  const agrupados = new Map<string, number>();
  for (const e of equiposFuente) agrupados.set(e.nombre, (agrupados.get(e.nombre) ?? 0) + e.cantidad);
  const equipos = [...agrupados.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad }));

  return NextResponse.json({ evaluacion: proyecto.evaluacionPostEvento ?? null, contexto: { equipos } });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureOperacionTecnicaColumns();
  const { id } = await params;
  const body = await request.json();

  const existente = await prisma.proyecto.findUnique({
    where: { id },
    select: { evaluacionPostEvento: true },
  });
  if (!existente) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const prev = (existente.evaluacionPostEvento as EvalPostEventoData | null) ?? emptyEvalData();
  const ahora = new Date().toISOString();

  // El servidor administra los timestamps; el cliente sólo envía las respuestas.
  const items: Record<string, ItemResp> =
    body.items && typeof body.items === "object" ? body.items : prev.items;

  const data: EvalPostEventoData = {
    llenadoPorId: body.llenadoPorId ?? prev.llenadoPorId ?? null,
    llenadoPorNombre: body.llenadoPorNombre ?? prev.llenadoPorNombre ?? null,
    respondidoEn: prev.respondidoEn ?? ahora,
    actualizadoEn: ahora,
    items,
    calificaciones:
      body.calificaciones && typeof body.calificaciones === "object" ? body.calificaciones : prev.calificaciones ?? {},
    calificacionFinal:
      typeof body.calificacionFinal === "number" || body.calificacionFinal === null
        ? body.calificacionFinal
        : prev.calificacionFinal ?? null,
    propuestasMejora: Array.isArray(body.propuestasMejora) ? body.propuestasMejora : prev.propuestasMejora ?? [],
    comentariosFinales:
      typeof body.comentariosFinales === "string" ? body.comentariosFinales : prev.comentariosFinales ?? "",
    fotos: Array.isArray(body.fotos) ? (body.fotos as FotoReporte[]) : prev.fotos ?? [],
  };

  await prisma.proyecto.update({
    where: { id },
    data: { evaluacionPostEvento: data },
  });

  return NextResponse.json({ evaluacion: data });
}
