import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureEvaluacionAreaTabla } from "@/lib/migraciones-lazy";
import {
  AREAS_EVALUABLES,
  DIMENSIONES_AREA,
  emptyEvaluacionArea,
  evaluacionCompleta,
  mesActual,
  type EvaluacionAreaData,
} from "@/lib/evaluacion-area";

// Solo dirección (o admin) evalúa a los responsables de área.
function esDireccion(session: { role: string; area?: string | null }) {
  return session.role === "ADMIN" || session.area === "DIRECCION";
}

type Row = {
  id: string;
  area: string;
  mes: string;
  evaluadorId: string | null;
  evaluadorNombre: string | null;
  responsableId: string | null;
  responsableNombre: string | null;
  calificaciones: string;
  notas: string;
  comentario: string;
  finalizada: boolean;
  finalizadaEn: Date | null;
  updatedAt: Date;
};

function parseJson<T>(raw: string, fallback: T): T {
  try {
    const v = JSON.parse(raw || "");
    return v && typeof v === "object" ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function rowToData(r: Row): EvaluacionAreaData {
  return {
    id: r.id,
    area: r.area,
    mes: r.mes,
    evaluadorId: r.evaluadorId,
    evaluadorNombre: r.evaluadorNombre,
    responsableId: r.responsableId,
    responsableNombre: r.responsableNombre,
    calificaciones: parseJson<Record<string, number | null>>(r.calificaciones, {}),
    notas: parseJson<Record<string, string>>(r.notas, {}),
    comentario: r.comentario ?? "",
    finalizada: r.finalizada,
    finalizadaEn: r.finalizadaEn ? r.finalizadaEn.toISOString() : null,
    actualizadoEn: r.updatedAt ? r.updatedAt.toISOString() : null,
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!esDireccion(session)) return NextResponse.json({ error: "Solo dirección" }, { status: 403 });

  await ensureEvaluacionAreaTabla();

  const mes = req.nextUrl.searchParams.get("mes") || mesActual();
  const area = req.nextUrl.searchParams.get("area");

  const rows = (await prisma.evaluacionAreaDireccion.findMany({
    where: area ? { area, mes } : { mes },
  })) as unknown as Row[];

  const porArea = new Map(rows.map((r) => [r.area, rowToData(r)]));

  // Devuelve una entrada por cada área evaluable (vacía si aún no existe),
  // para que el tablero muestre todas aunque no se hayan iniciado.
  const evaluaciones = AREAS_EVALUABLES.map((a) => porArea.get(a.id) ?? emptyEvaluacionArea(a.id, mes));

  return NextResponse.json({ mes, evaluaciones, dimensiones: DIMENSIONES_AREA });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!esDireccion(session)) return NextResponse.json({ error: "Solo dirección" }, { status: 403 });

  await ensureEvaluacionAreaTabla();

  const body = await request.json();
  const area = String(body.area || "");
  const mes = String(body.mes || "");
  if (!AREAS_EVALUABLES.some((a) => a.id === area)) {
    return NextResponse.json({ error: "Área inválida" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    return NextResponse.json({ error: "Mes inválido" }, { status: 400 });
  }

  const calificaciones =
    body.calificaciones && typeof body.calificaciones === "object" ? body.calificaciones : {};
  const notas = body.notas && typeof body.notas === "object" ? body.notas : {};
  const comentario = typeof body.comentario === "string" ? body.comentario : "";

  const dataParcial: EvaluacionAreaData = {
    ...emptyEvaluacionArea(area, mes),
    calificaciones,
    notas,
    comentario,
  };

  // Finalizar solo si todas las dimensiones están calificadas (fuente de verdad en servidor).
  let finalizada = false;
  let finalizadaEn: Date | null = null;
  if (body.finalizar === true) {
    if (!evaluacionCompleta(dataParcial)) {
      return NextResponse.json({ error: "Faltan dimensiones por calificar" }, { status: 400 });
    }
    finalizada = true;
    finalizadaEn = new Date();
  }

  const existente = (await prisma.evaluacionAreaDireccion.findUnique({
    where: { area_mes: { area, mes } },
    select: { id: true, finalizada: true, finalizadaEn: true },
  })) as { id: string; finalizada: boolean; finalizadaEn: Date | null } | null;

  const finalizadaFinal = body.finalizar === false ? false : finalizada || existente?.finalizada || false;
  const finalizadaEnFinal =
    body.finalizar === false ? null : finalizadaEn ?? existente?.finalizadaEn ?? null;

  const payload = {
    area,
    mes,
    evaluadorId: session.id,
    evaluadorNombre: session.name,
    responsableId: typeof body.responsableId === "string" ? body.responsableId : null,
    responsableNombre: typeof body.responsableNombre === "string" ? body.responsableNombre : null,
    calificaciones: JSON.stringify(calificaciones),
    notas: JSON.stringify(notas),
    comentario,
    finalizada: finalizadaFinal,
    finalizadaEn: finalizadaEnFinal,
  };

  const guardada = (await prisma.evaluacionAreaDireccion.upsert({
    where: { area_mes: { area, mes } },
    create: payload,
    update: payload,
  })) as unknown as Row;

  return NextResponse.json({ evaluacion: rowToData(guardada) });
}
