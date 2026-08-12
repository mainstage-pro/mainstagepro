import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { METRICAS, normalizarCriterios, normalizarAcuerdos, normalizarObjetivos, normalizarCompetenciaNotas, calcularPuntajes, safeParseCriterios, CALIFICACIONES_FINALES } from "@/lib/evaluaciones";
import { calcularEvaluacion, perfilPorcentaje, type CompetenciaItem, type EstMinCheck, type ResultadosBloque } from "@/lib/puesto-evaluacion";

const parse = <T,>(s: string | null | undefined, fb: T): T => { if (!s) return fb; try { return (JSON.parse(s) ?? fb) as T; } catch { return fb; } };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const evaluacion = await prisma.evaluacionEmpleado.findUnique({
    where: { id },
    include: { personal: { select: { id: true, nombre: true, puesto: true, departamento: true } } },
  });
  if (!evaluacion) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ evaluacion });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const allowed = [...METRICAS,"periodo","evaluador","aspectosPositivos","areasMejora","incidentesNota","observaciones","estado"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k] === "" ? null : body[k];

  if ("calificacionFinal" in body) {
    data.calificacionFinal = (CALIFICACIONES_FINALES as readonly string[]).includes(body.calificacionFinal) ? body.calificacionFinal : null;
  }

  const criteriosCambia = "criterios" in body;
  const criterios = criteriosCambia ? normalizarCriterios(body.criterios) : null;
  if (criteriosCambia) data.criterios = criterios!.length > 0 ? JSON.stringify(criterios) : null;

  if ("acuerdos" in body) {
    const acuerdos = normalizarAcuerdos(body.acuerdos);
    data.acuerdos = acuerdos.length > 0 ? JSON.stringify(acuerdos) : null;
  }

  if ("objetivos" in body) {
    const objetivos = normalizarObjetivos(body.objetivos);
    data.objetivos = objetivos.length > 0 ? JSON.stringify(objetivos) : null;
  }

  if ("competenciaNotas" in body) {
    const notas = normalizarCompetenciaNotas(body.competenciaNotas);
    data.competenciaNotas = Object.keys(notas).length > 0 ? JSON.stringify(notas) : null;
  }

  if (METRICAS.some(m => m in body) || criteriosCambia) {
    const current = await prisma.evaluacionEmpleado.findUnique({ where: { id } });
    if (current) {
      const merged = { ...current, ...data };
      const metricas: Record<string, number> = {};
      for (const m of METRICAS) metricas[m] = Number(merged[m]) || 0;
      const crit = criteriosCambia ? criterios! : safeParseCriterios(current.criterios);
      const { general, puesto, total } = calcularPuntajes(metricas, crit);
      data.puntajeGeneral = general;
      data.puntajePuesto = puesto;
      data.puntajeTotal = total;
    }
  }

  // ── Evaluación reestructurada (§7/§8): perfil calificado + estándares mínimos como
  // filtro. Recalcula la calificación derivada y la lleva a puntajeTotal (columna Eval.).
  if ("ajusteJustificacion" in body) data.ajusteJustificacion = body.ajusteJustificacion || null;
  const nuevoEstilo = "perfilCompetencias" in body || "estandaresMinData" in body || "resultadosData" in body;
  if (nuevoEstilo) {
    const current = await prisma.evaluacionEmpleado.findUnique({ where: { id } });
    const perfil = "perfilCompetencias" in body
      ? (body.perfilCompetencias as CompetenciaItem[])
      : parse<CompetenciaItem[]>(current?.perfilCompetencias, []);
    const estMin = "estandaresMinData" in body
      ? (body.estandaresMinData as EstMinCheck[])
      : parse<EstMinCheck[]>(current?.estandaresMinData, []);
    const resultados = "resultadosData" in body
      ? (body.resultadosData as ResultadosBloque)
      : parse<ResultadosBloque>(current?.resultadosData, { planPct: null, kpiPct: null, kpis: [] });

    if ("perfilCompetencias" in body) data.perfilCompetencias = JSON.stringify(perfil);
    if ("estandaresMinData" in body) data.estandaresMinData = JSON.stringify(estMin);
    if ("resultadosData" in body) data.resultadosData = JSON.stringify(resultados);

    const calc = calcularEvaluacion({
      planPct: resultados.planPct ?? null,
      kpiPct: resultados.kpiPct ?? null,
      perfilPct: perfilPorcentaje(perfil),
      estMinFallidos: estMin.filter(e => e.cumple === false).length,
    });
    data.calificacionCalculada = calc.label;
    // El evaluador puede sobrescribir la calificación nombrada (requiere justificación),
    // pero el puntaje numérico que alimenta el tablero es siempre el derivado.
    data.puntajeTotal = calc.puntaje1a5;
  }

  const evaluacion = await prisma.evaluacionEmpleado.update({ where: { id }, data });
  return NextResponse.json({ evaluacion });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.evaluacionEmpleado.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
