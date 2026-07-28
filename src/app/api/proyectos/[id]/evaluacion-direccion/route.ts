import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureOperacionTecnicaColumns } from "@/lib/migraciones-lazy";
import {
  emptyDireccionData,
  getDireccionConfig,
  type EvaluacionDireccionData,
} from "@/lib/evaluacion-direccion";
import { emptyEvalData, type EvalPostEventoData } from "@/lib/evaluacion-post-evento";

// Sólo dirección (o admin) evalúa. El coordinador reporta; dirección juzga.
function esDireccion(session: { role?: string | null; area?: string | null } | null): boolean {
  if (!session) return false;
  return session.role === "ADMIN" || session.area === "DIRECCION";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!esDireccion(session)) return NextResponse.json({ error: "Solo dirección" }, { status: 403 });

  await ensureOperacionTecnicaColumns();
  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      nombre: true,
      numeroProyecto: true,
      fechaEvento: true,
      lugarEvento: true,
      tipoServicio: true,
      evaluacionDireccion: true,
      evaluacionPostEvento: true,
      encargado: { select: { id: true, name: true } },
      cliente: { select: { nombre: true, empresa: true } },
    },
  });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  return NextResponse.json({
    proyecto: {
      nombre: proyecto.nombre,
      numeroProyecto: proyecto.numeroProyecto,
      fechaEvento: proyecto.fechaEvento,
      lugarEvento: proyecto.lugarEvento,
      tipoServicio: proyecto.tipoServicio,
      coordinador: proyecto.encargado?.name ?? null,
      cliente: proyecto.cliente,
    },
    evaluacion: (proyecto.evaluacionDireccion as EvaluacionDireccionData | null) ?? null,
    reporte: { ...emptyEvalData(), ...((proyecto.evaluacionPostEvento as EvalPostEventoData | null) ?? {}) },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!esDireccion(session)) return NextResponse.json({ error: "Solo dirección" }, { status: 403 });

  await ensureOperacionTecnicaColumns();
  const { id } = await params;
  const body = await request.json();

  const existente = await prisma.proyecto.findUnique({
    where: { id },
    select: { evaluacionDireccion: true, tipoServicio: true },
  });
  if (!existente) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const prev = { ...emptyDireccionData(), ...((existente.evaluacionDireccion as EvaluacionDireccionData | null) ?? {}) };
  const ahora = new Date().toISOString();

  const data: EvaluacionDireccionData = {
    evaluadorId: prev.evaluadorId ?? session.id,
    evaluadorNombre: prev.evaluadorNombre ?? session.name,
    evaluadoEn: prev.evaluadoEn ?? ahora,
    actualizadoEn: ahora,
    calificaciones:
      body.calificaciones && typeof body.calificaciones === "object" ? body.calificaciones : prev.calificaciones ?? {},
    notas: body.notas && typeof body.notas === "object" ? body.notas : prev.notas ?? {},
    comentario: typeof body.comentario === "string" ? body.comentario : prev.comentario ?? "",
    repetiriamos:
      ["si", "con_ajustes", "no"].includes(body.repetiriamos) ? body.repetiriamos : body.repetiriamos === null ? null : prev.repetiriamos ?? null,
    finalizada: prev.finalizada ?? false,
    finalizadaEn: prev.finalizadaEn ?? null,
  };

  // Finalizar sólo si al menos hay calificaciones registradas.
  if (body.finalizada === true) {
    const config = getDireccionConfig(existente.tipoServicio);
    const calificadas = config.dimensiones.filter((d) => {
      const v = data.calificaciones?.[d.id];
      return typeof v === "number" && v > 0;
    }).length;
    if (calificadas === 0) {
      return NextResponse.json({ error: "Califica al menos una dimensión antes de finalizar." }, { status: 400 });
    }
    data.finalizada = true;
    data.finalizadaEn = prev.finalizadaEn ?? ahora;
  } else if (body.finalizada === false) {
    data.finalizada = false;
    data.finalizadaEn = null;
  }

  await prisma.proyecto.update({
    where: { id },
    data: { evaluacionDireccion: data },
  });

  return NextResponse.json({ evaluacion: data });
}
