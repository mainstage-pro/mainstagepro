import { prisma } from "@/lib/prisma";
import { computeRendimiento, type RendUsuario } from "@/lib/rendimiento";
import {
  getConfigAsistencia,
  salarioDiario,
  resumirPersona,
  type ConfigAsist,
} from "@/lib/asistencia-penalizaciones";

// ─────────────────────────────────────────────────────────────────────────────
// Tablero de Cumplimiento por colaborador.
//
// Consolida en un solo score, con datos REALES de la plataforma, cuatro
// dimensiones del desempeño de cada persona en un mes:
//   · Plan de trabajo  → cumplimiento de tareas (módulo Rendimiento)
//   · Asistencia       → días efectivos vs. descontables (módulo Asistencia)
//   · Disciplina       → actas administrativas por gravedad y reincidencia
//   · Evaluación       → última evaluación de desempeño registrada
//
// Cada dimensión puede quedar "sin datos" (N/A) y el score global se
// renormaliza sobre las dimensiones disponibles. La disciplina siempre tiene
// dato: la ausencia de actas es, en sí misma, buena conducta.
// ─────────────────────────────────────────────────────────────────────────────

export type Banda = "EXCELENTE" | "CUMPLE" | "RIESGO" | "CRITICO" | "SIN_DATOS";

const PESOS = { plan: 0.30, asistencia: 0.25, disciplina: 0.25, evaluacion: 0.20 } as const;

// Penalización por acta según gravedad (base, antes del factor de reincidencia).
const PENAL_GRAVEDAD: Record<string, number> = { LEVE: 6, GRAVE: 18, MUY_GRAVE: 40 };
const BONO_RECONOCIMIENTO = 8;

export interface DimPlan {
  score: number; total: number; completadas: number; vencidas: number; pendientesVigentes: number;
}
export interface DimAsistencia {
  score: number; diasLaborales: number; presentes: number; retardos: number;
  faltasInjustificadas: number; faltasJustificadas: number; diasDescontables: number;
  montoDescuento: number; causalBaja: boolean;
}
export interface DimDisciplina {
  score: number; leves: number; graves: number; muyGraves: number;
  reconocimientos: number; nivelMax: number; sinAcuse: number;
}
export interface DimEvaluacion {
  score: number; periodo: string; fecha: string;
}

export interface CumplimientoPersona {
  personalId: string;
  nombre: string;
  puesto: string;
  area: string | null;
  scoreGlobal: number | null;
  banda: Banda;
  plan: DimPlan | null;
  asistencia: DimAsistencia | null;
  disciplina: DimDisciplina;
  evaluacion: DimEvaluacion | null;
  alertas: string[];
}

export interface ActaResumen {
  id: string; folio: string; fecha: string; gravedad: string; categoria: string | null;
  nivelEscalon: number; estado: string; aceptada: boolean; montoDescuento: number | null;
  tipoNombre: string | null; hechos: string;
}
export interface EvaluacionResumen {
  id: string; periodo: string; fecha: string; puntajeTotal: number | null; estado: string; evaluador: string | null;
}
export interface EstandarPuesto { subarea?: string; responsabilidad?: string; estandar?: string }

export interface TareaCritica {
  id: string; titulo: string; estado: string; vencida: boolean; fechaCompromiso: string | null; diasAtraso: number;
}

export interface CumplimientoDetalle extends CumplimientoPersona {
  estandares: EstandarPuesto[];
  actas: ActaResumen[];
  evaluaciones: EvaluacionResumen[];
  tareasCriticas: TareaCritica[];
}

// ─── Utilidades de periodo ────────────────────────────────────────────────────
function rangoMes(mes: string): { desde: string; hasta: string; diasLaborales: number } {
  const [y, m] = mes.split("-").map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  const desde = `${mes}-01`;
  const hasta = `${mes}-${String(ultimo).padStart(2, "0")}`;
  let diasLaborales = 0;
  for (let d = 1; d <= ultimo; d++) {
    const dow = new Date(y, m - 1, d).getDay();
    if (dow !== 0 && dow !== 6) diasLaborales++;
  }
  return { desde, hasta, diasLaborales };
}

function bandaDe(score: number | null): Banda {
  if (score == null) return "SIN_DATOS";
  if (score >= 85) return "EXCELENTE";
  if (score >= 70) return "CUMPLE";
  if (score >= 50) return "RIESGO";
  return "CRITICO";
}

function clamp(n: number, lo = 0, hi = 100): number { return Math.max(lo, Math.min(hi, n)); }

function parseEstandares(raw: string | null): EstandarPuesto[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

// ─── Dimensión: plan de trabajo ───────────────────────────────────────────────
function dimPlan(rend: RendUsuario | undefined): DimPlan | null {
  if (!rend || rend.total === 0) return null;
  return {
    score: clamp(rend.cumplimiento),
    total: rend.total,
    completadas: rend.completadas,
    vencidas: rend.vencidas,
    pendientesVigentes: rend.pendientesVigentes,
  };
}

// ─── Dimensión: asistencia ────────────────────────────────────────────────────
interface AsistLite { personalId: string; estado: string; justificada: boolean; documentoUrl: string | null }
function dimAsistencia(
  personalId: string, nombre: string, salarioDia: number,
  asistencias: AsistLite[], cfg: ConfigAsist, diasLaborales: number,
): DimAsistencia | null {
  if (asistencias.length === 0) return null;
  const r = resumirPersona(personalId, nombre, salarioDia, asistencias, cfg);
  const presentes = asistencias.filter(a => a.estado === "PRESENTE").length;
  const base = diasLaborales > 0 ? diasLaborales : Math.max(asistencias.length, 1);
  const score = clamp(Math.round(((base - r.diasDescontables) / base) * 100));
  return {
    score,
    diasLaborales: base,
    presentes,
    retardos: r.retardos,
    faltasInjustificadas: r.faltasInjustificadas,
    faltasJustificadas: r.faltasJustificadas,
    diasDescontables: r.diasDescontables,
    montoDescuento: r.montoDescuento,
    causalBaja: r.causalBaja,
  };
}

// ─── Dimensión: disciplina (actas) ────────────────────────────────────────────
interface ActaLite {
  gravedad: string; categoria: string | null; nivelEscalon: number; estado: string; aceptada: boolean;
}
function dimDisciplina(actasMes: ActaLite[], sinAcuse: number): DimDisciplina {
  let penal = 0, bono = 0, leves = 0, graves = 0, muyGraves = 0, reconocimientos = 0, nivelMax = 0;
  for (const a of actasMes) {
    if (a.estado === "ANULADA") continue;
    if (a.categoria === "RECONOCIMIENTO") { reconocimientos++; bono += BONO_RECONOCIMIENTO; continue; }
    nivelMax = Math.max(nivelMax, a.nivelEscalon);
    const factor = 1 + Math.max(0, a.nivelEscalon - 1) * 0.5;
    penal += (PENAL_GRAVEDAD[a.gravedad] ?? PENAL_GRAVEDAD.LEVE) * factor;
    if (a.gravedad === "MUY_GRAVE") muyGraves++;
    else if (a.gravedad === "GRAVE") graves++;
    else leves++;
  }
  return {
    score: clamp(100 - penal + bono),
    leves, graves, muyGraves, reconocimientos, nivelMax, sinAcuse,
  };
}

// ─── Score global (renormalizado sobre dimensiones disponibles) ───────────────
function scoreGlobal(p: { plan: DimPlan | null; asistencia: DimAsistencia | null; disciplina: DimDisciplina; evaluacion: DimEvaluacion | null }): number | null {
  const partes: [number, number][] = [];
  if (p.plan) partes.push([p.plan.score, PESOS.plan]);
  if (p.asistencia) partes.push([p.asistencia.score, PESOS.asistencia]);
  partes.push([p.disciplina.score, PESOS.disciplina]);
  if (p.evaluacion) partes.push([p.evaluacion.score, PESOS.evaluacion]);
  const pesoTotal = partes.reduce((s, [, w]) => s + w, 0);
  if (pesoTotal === 0) return null;
  return Math.round(partes.reduce((s, [v, w]) => s + v * w, 0) / pesoTotal);
}

function armarAlertas(p: CumplimientoPersona): string[] {
  const a: string[] = [];
  if (p.disciplina.sinAcuse > 0) a.push(`${p.disciplina.sinAcuse} acta(s) sin firmar`);
  if (p.disciplina.nivelMax >= 3) a.push("Reincidencia en 3er escalón");
  if (p.asistencia?.causalBaja) a.push("Posible causal de rescisión (art. 47 LFT)");
  if (p.plan && p.plan.vencidas > 0) a.push(`${p.plan.vencidas} tarea(s) del plan vencidas`);
  return a;
}

// ─── Composición por persona ──────────────────────────────────────────────────
type PersonaBase = {
  id: string; nombre: string; puestoTexto: string; puestoNombre: string | null;
  area: string | null; salario: number | null; periodoPago: string;
};

function componer(
  base: PersonaBase,
  rendUsuario: RendUsuario | undefined,
  asistencias: AsistLite[],
  actasMes: ActaLite[],
  sinAcuse: number,
  evalUlt: DimEvaluacion | null,
  cfg: ConfigAsist,
  diasLaborales: number,
): CumplimientoPersona {
  const plan = dimPlan(rendUsuario);
  const asistencia = dimAsistencia(base.id, base.nombre, salarioDiario(base.salario, base.periodoPago), asistencias, cfg, diasLaborales);
  const disciplina = dimDisciplina(actasMes, sinAcuse);
  const evaluacion = evalUlt;
  const score = scoreGlobal({ plan, asistencia, disciplina, evaluacion });
  const persona: CumplimientoPersona = {
    personalId: base.id,
    nombre: base.nombre,
    puesto: base.puestoNombre ?? base.puestoTexto,
    area: base.area,
    scoreGlobal: score,
    banda: bandaDe(score),
    plan, asistencia, disciplina, evaluacion,
    alertas: [],
  };
  persona.alertas = armarAlertas(persona);
  return persona;
}

// ─── Modo lista (tablero completo) ────────────────────────────────────────────
export async function computeCumplimientoLista(mes: string): Promise<CumplimientoPersona[]> {
  const { desde, hasta, diasLaborales } = rangoMes(mes);

  const [personal, cfg, rend, asistencias, actas, evaluaciones] = await Promise.all([
    prisma.personalInterno.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, puesto: true, departamento: true, salario: true, periodoPago: true, userId: true,
        puestoRef: { select: { nombre: true, area: true } } },
      orderBy: { nombre: "asc" },
    }),
    getConfigAsistencia(),
    computeRendimiento({ desde, hasta }),
    prisma.asistencia.findMany({
      where: { fecha: { gte: new Date(desde + "T00:00:00"), lte: new Date(hasta + "T23:59:59") } },
      select: { personalId: true, estado: true, justificada: true, documentoUrl: true },
    }),
    prisma.actaAdministrativa.findMany({
      where: { fecha: { gte: new Date(desde + "T00:00:00"), lte: new Date(hasta + "T23:59:59") } },
      select: { personalId: true, gravedad: true, nivelEscalon: true, estado: true, aceptada: true,
        tipo: { select: { categoria: true } } },
    }),
    prisma.evaluacionEmpleado.findMany({
      where: { estado: "COMPLETADA" },
      orderBy: { fecha: "desc" },
      select: { personalId: true, periodo: true, fecha: true, puntajeTotal: true },
    }),
  ]);

  const rendPorUser = new Map(rend.usuarios.map(u => [u.id, u]));
  const asistPorPersona = new Map<string, AsistLite[]>();
  for (const a of asistencias) {
    const arr = asistPorPersona.get(a.personalId) ?? [];
    arr.push(a); asistPorPersona.set(a.personalId, arr);
  }
  const actasPorPersona = new Map<string, ActaLite[]>();
  for (const a of actas) {
    const arr = actasPorPersona.get(a.personalId) ?? [];
    arr.push({ gravedad: a.gravedad, categoria: a.tipo?.categoria ?? null, nivelEscalon: a.nivelEscalon, estado: a.estado, aceptada: a.aceptada });
    actasPorPersona.set(a.personalId, arr);
  }
  const evalPorPersona = new Map<string, DimEvaluacion>();
  for (const e of evaluaciones) {
    if (evalPorPersona.has(e.personalId)) continue; // ya ordenado desc → primero es el más reciente
    if (e.puntajeTotal == null || e.puntajeTotal <= 0) continue;
    evalPorPersona.set(e.personalId, { score: clamp(Math.round(e.puntajeTotal)), periodo: e.periodo, fecha: e.fecha.toISOString() });
  }

  // Actas sin acuse (vigentes) — cuenta global, no solo del mes.
  const sinAcuseRows = await prisma.actaAdministrativa.groupBy({
    by: ["personalId"],
    where: { estado: { notIn: ["ANULADA", "ACEPTADA"] }, aceptada: false },
    _count: { _all: true },
  });
  const sinAcusePorPersona = new Map(sinAcuseRows.map(r => [r.personalId, r._count._all]));

  return personal.map(p => componer(
    {
      id: p.id, nombre: p.nombre, puestoTexto: p.puesto, puestoNombre: p.puestoRef?.nombre ?? null,
      area: p.puestoRef?.area ?? p.departamento ?? null, salario: p.salario, periodoPago: p.periodoPago,
    },
    p.userId ? rendPorUser.get(p.userId) : undefined,
    asistPorPersona.get(p.id) ?? [],
    actasPorPersona.get(p.id) ?? [],
    sinAcusePorPersona.get(p.id) ?? 0,
    evalPorPersona.get(p.id) ?? null,
    cfg, diasLaborales,
  ));
}

// ─── Modo detalle (expediente de una persona) ─────────────────────────────────
export async function computeCumplimientoPersona(personalId: string, mes: string): Promise<CumplimientoDetalle | null> {
  const { desde, hasta, diasLaborales } = rangoMes(mes);

  const persona = await prisma.personalInterno.findUnique({
    where: { id: personalId },
    select: {
      id: true, nombre: true, puesto: true, departamento: true, salario: true, periodoPago: true, userId: true,
      puestoRef: { select: { nombre: true, area: true, estandares: true } },
    },
  });
  if (!persona) return null;

  const [cfg, asistencias, actasRows, evaluacionesRows] = await Promise.all([
    getConfigAsistencia(),
    prisma.asistencia.findMany({
      where: { personalId, fecha: { gte: new Date(desde + "T00:00:00"), lte: new Date(hasta + "T23:59:59") } },
      select: { personalId: true, estado: true, justificada: true, documentoUrl: true },
    }),
    prisma.actaAdministrativa.findMany({
      where: { personalId },
      orderBy: { fecha: "desc" },
      select: { id: true, folio: true, fecha: true, gravedad: true, nivelEscalon: true, estado: true, aceptada: true,
        montoDescuento: true, hechos: true, tipo: { select: { nombre: true, categoria: true } } },
    }),
    prisma.evaluacionEmpleado.findMany({
      where: { personalId },
      orderBy: { fecha: "desc" },
      select: { id: true, periodo: true, fecha: true, puntajeTotal: true, estado: true, evaluador: true },
    }),
  ]);

  const rend = persona.userId
    ? await computeRendimiento({ desde, hasta, soloUsuarioId: persona.userId })
    : null;
  const rendUsuario = rend?.usuarios[0];

  const actasMes: ActaLite[] = actasRows
    .filter(a => new Date(a.fecha) >= new Date(desde + "T00:00:00") && new Date(a.fecha) <= new Date(hasta + "T23:59:59"))
    .map(a => ({ gravedad: a.gravedad, categoria: a.tipo?.categoria ?? null, nivelEscalon: a.nivelEscalon, estado: a.estado, aceptada: a.aceptada }));
  const sinAcuse = actasRows.filter(a => a.estado !== "ANULADA" && a.estado !== "ACEPTADA" && !a.aceptada).length;

  const evalUlt: DimEvaluacion | null = (() => {
    const e = evaluacionesRows.find(x => x.estado === "COMPLETADA" && x.puntajeTotal != null && x.puntajeTotal > 0);
    return e ? { score: clamp(Math.round(e.puntajeTotal!)), periodo: e.periodo, fecha: e.fecha.toISOString() } : null;
  })();

  const cumpl = componer(
    {
      id: persona.id, nombre: persona.nombre, puestoTexto: persona.puesto, puestoNombre: persona.puestoRef?.nombre ?? null,
      area: persona.puestoRef?.area ?? persona.departamento ?? null, salario: persona.salario, periodoPago: persona.periodoPago,
    },
    rendUsuario,
    asistencias,
    actasMes,
    sinAcuse,
    evalUlt,
    cfg, diasLaborales,
  );

  const tareasCriticas: TareaCritica[] = rendUsuario
    ? [...rendUsuario.criticas, ...rendUsuario.pendientes].slice(0, 12).map(t => ({
        id: t.id, titulo: t.titulo, estado: t.estado, vencida: t.diasAtraso > 0, fechaCompromiso: t.fechaCompromiso ?? null, diasAtraso: t.diasAtraso,
      }))
    : [];

  return {
    ...cumpl,
    estandares: parseEstandares(persona.puestoRef?.estandares ?? null),
    actas: actasRows.map(a => ({
      id: a.id, folio: a.folio, fecha: a.fecha.toISOString(), gravedad: a.gravedad, categoria: a.tipo?.categoria ?? null,
      nivelEscalon: a.nivelEscalon, estado: a.estado, aceptada: a.aceptada, montoDescuento: a.montoDescuento,
      tipoNombre: a.tipo?.nombre ?? null, hechos: a.hechos,
    })),
    evaluaciones: evaluacionesRows.map(e => ({
      id: e.id, periodo: e.periodo, fecha: e.fecha.toISOString(), puntajeTotal: e.puntajeTotal, estado: e.estado, evaluador: e.evaluador,
    })),
    tareasCriticas,
  };
}
