"use client";

import { useEffect, useState, useCallback } from "react";
import { Modal } from "@/components/Modal";

// ─── Tipos (espejo de src/lib/cumplimiento.ts) ────────────────────────────────
type Banda = "EXCELENTE" | "CUMPLE" | "RIESGO" | "CRITICO" | "SIN_DATOS";
interface DimPlan { score: number; total: number; completadas: number; vencidas: number; pendientesVigentes: number; }
interface DimAsistencia { score: number; diasLaborales: number; presentes: number; retardos: number; faltasInjustificadas: number; faltasJustificadas: number; diasDescontables: number; montoDescuento: number; causalBaja: boolean; }
interface DimDisciplina { score: number; leves: number; graves: number; muyGraves: number; reconocimientos: number; nivelMax: number; sinAcuse: number; }
interface DimEvaluacion { score: number; periodo: string; fecha: string; }
interface Persona {
  personalId: string; nombre: string; puesto: string; area: string | null;
  scoreGlobal: number | null; banda: Banda;
  plan: DimPlan | null; asistencia: DimAsistencia | null; disciplina: DimDisciplina; evaluacion: DimEvaluacion | null;
  alertas: string[];
}
interface ActaResumen { id: string; folio: string; fecha: string; gravedad: string; categoria: string | null; nivelEscalon: number; estado: string; aceptada: boolean; montoDescuento: number | null; tipoNombre: string | null; hechos: string; }
interface EvaluacionResumen { id: string; periodo: string; fecha: string; puntajeTotal: number | null; estado: string; evaluador: string | null; }
interface EstandarPuesto { subarea?: string; responsabilidad?: string; estandar?: string; }
interface TareaCritica { id: string; titulo: string; estado: string; vencida: boolean; fechaCompromiso: string | null; diasAtraso: number; }
interface Detalle extends Persona { estandares: EstandarPuesto[]; actas: ActaResumen[]; evaluaciones: EvaluacionResumen[]; tareasCriticas: TareaCritica[]; }

// ─── Estilos por banda ────────────────────────────────────────────────────────
const BANDA: Record<Banda, { label: string; ring: string; text: string; bar: string; dot: string }> = {
  EXCELENTE: { label: "Excelente", ring: "border-green-700",  text: "text-green-400",  bar: "bg-green-500",  dot: "bg-green-500" },
  CUMPLE:    { label: "Cumple",    ring: "border-[#B3985B]",  text: "text-[#B3985B]",  bar: "bg-[#B3985B]",  dot: "bg-[#B3985B]" },
  RIESGO:    { label: "En riesgo", ring: "border-orange-700", text: "text-orange-400", bar: "bg-orange-500", dot: "bg-orange-500" },
  CRITICO:   { label: "Crítico",   ring: "border-red-700",    text: "text-red-400",    bar: "bg-red-500",    dot: "bg-red-500" },
  SIN_DATOS: { label: "Sin datos", ring: "border-[#333]",     text: "text-gray-500",   bar: "bg-gray-600",   dot: "bg-gray-600" },
};
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function toMes(d: Date) { return d.toISOString().slice(0, 7); }
function fmtFecha(s: string) { return new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }); }
function mxn(n: number) { return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" }); }
function bandaDe(score: number | null): Banda {
  if (score == null) return "SIN_DATOS";
  if (score >= 85) return "EXCELENTE"; if (score >= 70) return "CUMPLE"; if (score >= 50) return "RIESGO"; return "CRITICO";
}

// ══════════════════════════════════════════════════════════════════════════════
export default function CumplimientoPage() {
  const [mes, setMes] = useState(toMes(new Date()));
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/rrhh/cumplimiento?mes=${mes}`, { cache: "no-store" });
    const d = await r.json();
    setPersonas(d.personas ?? []);
    setLoading(false);
  }, [mes]);
  useEffect(() => { cargar(); }, [cargar]);

  const [year, month] = mes.split("-").map(Number);
  const conScore = personas.filter(p => p.scoreGlobal != null);
  const promedio = conScore.length ? Math.round(conScore.reduce((s, p) => s + (p.scoreGlobal ?? 0), 0) / conScore.length) : null;
  const distrib = (["EXCELENTE","CUMPLE","RIESGO","CRITICO"] as Banda[]).map(b => ({ b, n: personas.filter(p => p.banda === b).length }));
  const enRiesgo = personas.filter(p => p.banda === "RIESGO" || p.banda === "CRITICO");

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ms-h1">Tablero de cumplimiento</h1>
          <p className="text-gray-500 text-sm">Score consolidado por colaborador: plan de trabajo, asistencia, disciplina y evaluación</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() - 1); setMes(toMes(d)); }} className="w-8 h-8 ms-btn-icon">←</button>
          <span className="text-white text-sm font-semibold min-w-[130px] text-center">{MESES[month - 1]} {year}</span>
          <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() + 1); setMes(toMes(d)); }} className="w-8 h-8 ms-btn-icon">→</button>
        </div>
      </div>

      {/* Resumen del equipo */}
      <div className="flex gap-3 flex-wrap">
        <div className="ms-stat-card flex-1 min-w-[130px]">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">Promedio equipo</p>
          <p className={`text-2xl font-bold ${BANDA[bandaDe(promedio)].text}`}>{promedio ?? "—"}</p>
        </div>
        {distrib.map(({ b, n }) => (
          <div key={b} className="ms-stat-card flex-1 min-w-[110px]">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">{BANDA[b].label}</p>
            <p className={`text-2xl font-bold ${n > 0 ? BANDA[b].text : "text-gray-700"}`}>{n}</p>
          </div>
        ))}
      </div>

      {enRiesgo.length > 0 && (
        <div className="ms-stat-card border-orange-900/50">
          <p className="text-[10px] text-orange-500 uppercase tracking-wider mb-1">Requieren atención</p>
          <p className="text-sm text-gray-300">{enRiesgo.map(p => p.nombre).join(" · ")}</p>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="py-8 text-center text-gray-600 text-sm">Cargando...</div>
      ) : personas.length === 0 ? (
        <div className="ms-card p-8 text-center text-gray-500 text-sm">No hay colaboradores activos.</div>
      ) : (
        <div className="space-y-2">
          {personas.map(p => <PersonaFila key={p.personalId} p={p} onClick={() => setSelId(p.personalId)} />)}
        </div>
      )}

      {selId && <ExpedienteModal personalId={selId} mes={mes} onClose={() => setSelId(null)} />}
    </div>
  );
}

// ─── Fila de persona ──────────────────────────────────────────────────────────
function PersonaFila({ p, onClick }: { p: Persona; onClick: () => void }) {
  const b = BANDA[p.banda];
  const dims: { label: string; score: number | null }[] = [
    { label: "Plan", score: p.plan?.score ?? null },
    { label: "Asist.", score: p.asistencia?.score ?? null },
    { label: "Disc.", score: p.disciplina.score },
    { label: "Eval.", score: p.evaluacion?.score ?? null },
  ];
  return (
    <button onClick={onClick} className={`w-full text-left bg-[#111] border rounded-xl p-4 transition-colors hover:border-[#333] ${b.ring}/40 border-[#222]`}>
      <div className="flex items-center gap-4 flex-wrap">
        {/* Score */}
        <div className={`w-14 h-14 rounded-xl border ${b.ring} flex flex-col items-center justify-center shrink-0`}>
          <span className={`text-lg font-bold leading-none ${b.text}`}>{p.scoreGlobal ?? "—"}</span>
          <span className="text-[8px] text-gray-600 uppercase tracking-wide mt-0.5">{b.label}</span>
        </div>
        {/* Nombre */}
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
          <p className="text-gray-600 text-[11px] truncate">{p.puesto}{p.area ? ` · ${p.area}` : ""}</p>
          {p.alertas.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {p.alertas.map((a, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded border border-orange-800 bg-orange-900/20 text-orange-300">{a}</span>
              ))}
            </div>
          )}
        </div>
        {/* Mini barras por dimensión */}
        <div className="flex gap-3">
          {dims.map(d => (
            <div key={d.label} className="w-12">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] text-gray-600">{d.label}</span>
                <span className={`text-[9px] ${d.score == null ? "text-gray-700" : BANDA[bandaDe(d.score)].text}`}>{d.score ?? "—"}</span>
              </div>
              <div className="h-1 rounded-full bg-[#222] overflow-hidden">
                {d.score != null && <div className={`h-full ${BANDA[bandaDe(d.score)].bar}`} style={{ width: `${d.score}%` }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}

// ─── Expediente ───────────────────────────────────────────────────────────────
function ExpedienteModal({ personalId, mes, onClose }: { personalId: string; mes: string; onClose: () => void }) {
  const [d, setD] = useState<Detalle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rrhh/cumplimiento?personalId=${personalId}&mes=${mes}`, { cache: "no-store" })
      .then(r => r.json()).then(res => { setD(res.detalle ?? null); setLoading(false); });
  }, [personalId, mes]);

  return (
    <Modal open onClose={onClose} title={d ? `Expediente · ${d.nombre}` : "Expediente"} maxWidth="max-w-3xl">
      {loading || !d ? (
        <div className="py-8 text-center text-gray-600 text-sm">Cargando...</div>
      ) : (
        <div className="space-y-5">
          {/* Cabecera con score */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className={`w-16 h-16 rounded-xl border ${BANDA[d.banda].ring} flex flex-col items-center justify-center shrink-0`}>
              <span className={`text-2xl font-bold leading-none ${BANDA[d.banda].text}`}>{d.scoreGlobal ?? "—"}</span>
              <span className="text-[8px] text-gray-600 uppercase mt-0.5">{BANDA[d.banda].label}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium">{d.puesto}</p>
              <p className="text-gray-600 text-xs">{d.area ?? ""}</p>
            </div>
          </div>

          {d.alertas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {d.alertas.map((a, i) => <span key={i} className="text-[11px] px-2 py-1 rounded-lg border border-orange-800 bg-orange-900/20 text-orange-300">{a}</span>)}
            </div>
          )}

          {/* Dimensiones */}
          <div className="grid grid-cols-2 gap-3">
            <DimCard titulo="Plan de trabajo" score={d.plan?.score ?? null}>
              {d.plan ? <>
                <Kv k="Tareas" v={`${d.plan.completadas}/${d.plan.total} completadas`} />
                {d.plan.vencidas > 0 && <Kv k="Vencidas" v={String(d.plan.vencidas)} alerta />}
                {d.plan.pendientesVigentes > 0 && <Kv k="Pendientes" v={String(d.plan.pendientesVigentes)} />}
              </> : <SinDatos texto="Sin tareas de plan en el periodo o sin usuario ligado." />}
            </DimCard>

            <DimCard titulo="Asistencia" score={d.asistencia?.score ?? null}>
              {d.asistencia ? <>
                <Kv k="Presentes" v={`${d.asistencia.presentes}/${d.asistencia.diasLaborales} días`} />
                {d.asistencia.retardos > 0 && <Kv k="Retardos" v={String(d.asistencia.retardos)} />}
                {d.asistencia.faltasInjustificadas > 0 && <Kv k="Faltas injust." v={String(d.asistencia.faltasInjustificadas)} alerta />}
                {d.asistencia.montoDescuento > 0 && <Kv k="Descuento" v={mxn(d.asistencia.montoDescuento)} />}
              </> : <SinDatos texto="Sin registros de asistencia en el mes." />}
            </DimCard>

            <DimCard titulo="Disciplina" score={d.disciplina.score}>
              {(d.disciplina.leves + d.disciplina.graves + d.disciplina.muyGraves + d.disciplina.reconocimientos) === 0
                ? <p className="text-xs text-green-400">Sin actas en el periodo.</p>
                : <>
                  {d.disciplina.leves > 0 && <Kv k="Leves" v={String(d.disciplina.leves)} />}
                  {d.disciplina.graves > 0 && <Kv k="Graves" v={String(d.disciplina.graves)} alerta />}
                  {d.disciplina.muyGraves > 0 && <Kv k="Muy graves" v={String(d.disciplina.muyGraves)} alerta />}
                  {d.disciplina.reconocimientos > 0 && <Kv k="Reconocimientos" v={String(d.disciplina.reconocimientos)} />}
                </>}
              {d.disciplina.sinAcuse > 0 && <Kv k="Sin firmar" v={String(d.disciplina.sinAcuse)} alerta />}
            </DimCard>

            <DimCard titulo="Evaluación" score={d.evaluacion?.score ?? null}>
              {d.evaluacion
                ? <Kv k="Periodo" v={d.evaluacion.periodo} />
                : <SinDatos texto="Sin evaluación de desempeño registrada." />}
            </DimCard>
          </div>

          {/* Tareas críticas */}
          {d.tareasCriticas.length > 0 && (
            <Seccion titulo="Tareas del plan por atender">
              <div className="space-y-1.5">
                {d.tareasCriticas.map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.vencida ? "bg-red-500" : "bg-yellow-500"}`} />
                    <span className="text-gray-300 truncate flex-1">{t.titulo}</span>
                    <span className={t.vencida ? "text-red-400" : "text-gray-600"}>
                      {t.vencida ? `${t.diasAtraso}d atraso` : t.fechaCompromiso ? fmtFecha(t.fechaCompromiso) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </Seccion>
          )}

          {/* Actas */}
          {d.actas.length > 0 && (
            <Seccion titulo="Historial de actas">
              <div className="space-y-1.5">
                {d.actas.slice(0, 8).map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-600 shrink-0">{a.folio}</span>
                    <span className="text-gray-300 truncate flex-1">{a.tipoNombre ?? a.hechos.slice(0, 60)}</span>
                    <span className="text-gray-600">{fmtFecha(a.fecha)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${a.estado === "ANULADA" ? "border-[#333] text-gray-500" : a.aceptada ? "border-green-800 text-green-400" : "border-yellow-800 text-yellow-400"}`}>
                      {a.estado === "ANULADA" ? "Anulada" : a.aceptada ? "Firmada" : "Sin firmar"}
                    </span>
                  </div>
                ))}
              </div>
            </Seccion>
          )}

          {/* Evaluaciones */}
          {d.evaluaciones.length > 0 && (
            <Seccion titulo="Evaluaciones">
              <div className="space-y-1.5">
                {d.evaluaciones.slice(0, 6).map(e => (
                  <div key={e.id} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-300 flex-1">{e.periodo}</span>
                    <span className="text-gray-600">{fmtFecha(e.fecha)}</span>
                    <span className={`font-semibold ${e.puntajeTotal != null ? BANDA[bandaDe(e.puntajeTotal)].text : "text-gray-600"}`}>
                      {e.puntajeTotal != null ? Math.round(e.puntajeTotal) : "—"}
                    </span>
                    <span className="text-[10px] text-gray-600">{e.estado === "COMPLETADA" ? "" : "Borrador"}</span>
                  </div>
                ))}
              </div>
            </Seccion>
          )}

          {/* Estándares del puesto */}
          {d.estandares.length > 0 && (
            <Seccion titulo="Estándares del puesto (referencia)">
              <div className="space-y-2">
                {d.estandares.map((e, i) => (
                  <div key={i} className="text-xs">
                    {e.responsabilidad && <p className="text-gray-300">{e.responsabilidad}</p>}
                    {e.estandar && <p className="text-gray-600 mt-0.5">{e.estandar}</p>}
                  </div>
                ))}
              </div>
            </Seccion>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <a href={`/personal/actas`} className="px-3 py-2 rounded-lg text-xs font-medium bg-[#1a1a1a] border border-[#333] text-gray-300 hover:text-white transition-colors">Ver faltas y actas</a>
            <a href={`/personal/evaluaciones`} className="px-3 py-2 rounded-lg text-xs font-medium bg-[#1a1a1a] border border-[#333] text-gray-300 hover:text-white transition-colors">Ver evaluaciones</a>
          </div>
        </div>
      )}
    </Modal>
  );
}

function DimCard({ titulo, score, children }: { titulo: string; score: number | null; children: React.ReactNode }) {
  const b = BANDA[bandaDe(score)];
  return (
    <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-white">{titulo}</p>
        <span className={`text-sm font-bold ${b.text}`}>{score ?? "—"}</span>
      </div>
      <div className="h-1 rounded-full bg-[#222] overflow-hidden mb-2">
        {score != null && <div className={`h-full ${b.bar}`} style={{ width: `${score}%` }} />}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
function Kv({ k, v, alerta }: { k: string; v: string; alerta?: boolean }) {
  return <div className="flex items-center justify-between text-[11px]"><span className="text-gray-600">{k}</span><span className={alerta ? "text-orange-400" : "text-gray-300"}>{v}</span></div>;
}
function SinDatos({ texto }: { texto: string }) { return <p className="text-[11px] text-gray-600 italic">{texto}</p>; }
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">{titulo}</p>
      {children}
    </div>
  );
}
