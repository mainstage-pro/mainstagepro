// Cálculo de la evaluación mensual derivada del registro de puesto (§7/§8).
// La evaluación NO se juzga a mano: se jala del sistema.
//   Resultados 60% = Plan de trabajo 30% + KPIs del puesto 30% (automáticos).
//   Perfil/competencias 40% = calificación 1–5 de valores/aptitudes/conocimientos del puesto.
//   Filtro: si falla un estándar mínimo, la calificación final se topa en "En desarrollo".

import { prisma } from "@/lib/prisma";
import { computeRendimiento } from "@/lib/rendimiento";
import { jparse, PESOS_EVAL, type ValorPerfil, type AptitudPerfil, type ConocimientoPerfil, type EstandarMinimo } from "@/lib/puesto";

export type CalifLabel = "EXCEDE" | "CUMPLE" | "EN_DESARROLLO" | "NO_CUMPLE";

// Umbrales de la calificación nombrada a partir del porcentaje total.
export function labelDePorcentaje(pct: number): CalifLabel {
  if (pct >= 90) return "EXCEDE";
  if (pct >= 75) return "CUMPLE";
  if (pct >= 60) return "EN_DESARROLLO";
  return "NO_CUMPLE";
}
const ORDEN: CalifLabel[] = ["NO_CUMPLE", "EN_DESARROLLO", "CUMPLE", "EXCEDE"];
export function topar(label: CalifLabel, maximo: CalifLabel): CalifLabel {
  return ORDEN.indexOf(label) > ORDEN.indexOf(maximo) ? maximo : label;
}

function rangoMes(mes: string): { desde: string; hasta: string; y: number; m: number } {
  const [y, m] = mes.split("-").map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, "0")}`, y, m };
}

const numMeta = (meta: string): number | null => {
  const n = parseFloat(String(meta).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export interface ResultadoKpi {
  kpiId: string;
  nombre: string;
  meta: string;
  unidad: string | null;
  esFijoPlan: boolean;
  valor: number | null;
  cumplida: boolean | null;
}
export interface ResultadosBloque {
  planPct: number | null;   // % de cumplimiento del plan de trabajo (Rendimiento)
  kpiPct: number | null;    // % de KPIs cumplidos del puesto
  kpis: ResultadoKpi[];
}

// Bloque 1 de la evaluación: resultados objetivos del mes (automáticos, no editables).
export async function computeResultados(opts: {
  userId: string | null;
  puestoId: string | null;
  mes: string;
}): Promise<ResultadosBloque> {
  const { userId, puestoId, mes } = opts;
  const { desde, hasta, y, m } = rangoMes(mes);

  let planPct: number | null = null;
  if (userId) {
    const rd = await computeRendimiento({ desde, hasta, soloUsuarioId: userId });
    const u = rd.usuarios.find(x => x.id === userId) ?? rd.usuarios[0];
    planPct = u ? u.cumplimiento : null;
  }

  const kpis: ResultadoKpi[] = [];
  if (puestoId) {
    const defs = await prisma.pTKPI.findMany({ where: { puestoId }, orderBy: { orden: "asc" } });
    const registros = defs.length
      ? await prisma.pTRegistroKPI.findMany({
          where: { kpiId: { in: defs.map(d => d.id) }, mes: m, anio: y },
          orderBy: { fechaFin: "desc" },
        })
      : [];
    const ultimoPorKpi = new Map<string, (typeof registros)[number]>();
    for (const r of registros) if (r.kpiId && !ultimoPorKpi.has(r.kpiId)) ultimoPorKpi.set(r.kpiId, r);

    for (const d of defs) {
      if (d.esFijoPlan) {
        const meta = numMeta(d.meta) ?? 95;
        kpis.push({
          kpiId: d.id, nombre: d.nombre, meta: d.meta, unidad: d.unidad ?? "%", esFijoPlan: true,
          valor: planPct, cumplida: planPct == null ? null : planPct >= meta,
        });
        continue;
      }
      const reg = ultimoPorKpi.get(d.id);
      kpis.push({
        kpiId: d.id, nombre: d.nombre, meta: d.meta, unidad: d.unidad ?? null, esFijoPlan: false,
        valor: reg?.valor ?? null,
        cumplida: reg ? reg.cumplida : null,
      });
    }
  }

  const determinables = kpis.filter(k => k.cumplida != null);
  const kpiPct = determinables.length
    ? Math.round((determinables.filter(k => k.cumplida).length / determinables.length) * 100)
    : null;

  return { planPct: planPct == null ? null : Math.round(planPct), kpiPct, kpis };
}

// Item del perfil a calificar (1–5) en la evaluación (§7 bloque 3).
export interface CompetenciaItem {
  tipo: "valor" | "aptitud" | "conocimiento";
  nombre: string;
  referencia?: string | null; // "cómo se ve" (valor) o nivel esperado
  indispensable?: boolean;
  puntaje: number | null;     // 1–5, lo llena el evaluador
}

// Deriva la checklist de competencias del perfil del puesto (sin calificar todavía).
export function competenciasDesdePuesto(raw: {
  valores?: string | null;
  aptitudes?: string | null;
  conocimientos?: string | null;
}): CompetenciaItem[] {
  const valores = jparse<ValorPerfil[]>(raw.valores ?? null, []);
  const aptitudes = jparse<AptitudPerfil[]>(raw.aptitudes ?? null, []);
  const conocimientos = jparse<ConocimientoPerfil[]>(raw.conocimientos ?? null, []);
  return [
    ...valores.map<CompetenciaItem>(v => ({ tipo: "valor", nombre: v.nombre, referencia: v.comoSeVe ?? null, puntaje: null })),
    ...aptitudes.map<CompetenciaItem>(a => ({ tipo: "aptitud", nombre: a.nombre, referencia: a.nivel, puntaje: null })),
    ...conocimientos.map<CompetenciaItem>(c => ({ tipo: "conocimiento", nombre: c.nombre, referencia: c.nivel, indispensable: c.indispensable, puntaje: null })),
  ];
}

// Item del checklist de estándares mínimos en la evaluación (§7 bloque 2).
export interface EstMinCheck {
  enunciado: string;
  frecuencia: string;
  evidencia: string;
  cumple: boolean | null; // sí/no; null = sin evaluar
}
export function estMinDesdePuesto(raw: { estandaresMinimos?: string | null }): EstMinCheck[] {
  return jparse<EstandarMinimo[]>(raw.estandaresMinimos ?? null, []).map(e => ({
    enunciado: e.enunciado, frecuencia: e.frecuencia, evidencia: e.evidencia, cumple: null,
  }));
}

// Promedio de perfil (1–5) → porcentaje 0–100.
export function perfilPorcentaje(items: CompetenciaItem[]): number | null {
  const v = items.map(i => i.puntaje).filter((p): p is number => p != null && p > 0);
  if (!v.length) return null;
  return Math.round((v.reduce((s, x) => s + x, 0) / v.length) / 5 * 100);
}

export interface EvaluacionCalculada {
  totalPct: number;
  puntaje1a5: number;   // para la columna Eval. (puntajeTotal * 20)
  label: CalifLabel;
  topado: boolean;      // topado por estándar mínimo fallido
  desglose: { planPct: number | null; kpiPct: number | null; perfilPct: number | null };
}

// Calificación final auto-calculada con los pesos (§8) y el filtro de estándares mínimos.
export function calcularEvaluacion(input: {
  planPct: number | null;
  kpiPct: number | null;
  perfilPct: number | null;
  estMinFallidos: number;
}): EvaluacionCalculada {
  const { planPct, kpiPct, perfilPct, estMinFallidos } = input;
  const comps: { peso: number; val: number }[] = [];
  if (planPct != null) comps.push({ peso: PESOS_EVAL.plan, val: planPct });
  if (kpiPct != null) comps.push({ peso: PESOS_EVAL.kpis, val: kpiPct });
  if (perfilPct != null) comps.push({ peso: PESOS_EVAL.perfil, val: perfilPct });
  const sumPeso = comps.reduce((s, c) => s + c.peso, 0) || 1;
  const totalPct = comps.reduce((s, c) => s + c.peso * c.val, 0) / sumPeso;

  let label = labelDePorcentaje(totalPct);
  const topado = estMinFallidos > 0;
  if (topado) label = topar(label, "EN_DESARROLLO");

  return {
    totalPct: Math.round(totalPct),
    puntaje1a5: Math.round((totalPct / 20) * 100) / 100,
    label,
    topado,
    desglose: { planPct, kpiPct, perfilPct },
  };
}
