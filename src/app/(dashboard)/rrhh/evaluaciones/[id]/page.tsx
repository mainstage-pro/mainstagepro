"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";
import { BackButton } from "@/components/BackButton";

interface Evaluacion {
  id: string; personalId: string; periodo: string; evaluador: string | null; fecha: string;
  puntajeTotal: number | null; puntajeGeneral: number | null; puntajePuesto: number | null; estado: string;
  puntualidad: number; ordenLimpieza: number; actitud: number; comunicacion: number;
  resolucionProb: number; propuestasMejora: number; calidadTrabajo: number; trabajoEquipo: number;
  aspectosPositivos: string | null; areasMejora: string | null; incidentesNota: string | null; observaciones: string | null;
  criterios: string | null; acuerdos: string | null;
  objetivos: string | null; competenciaNotas: string | null; calificacionFinal: string | null;
  autoToken: string | null; autoEstado: string; autoData: string | null; autoEnviadaEn: string | null;
  firmada: boolean; firmadaNombre: string | null; firmadaEn: string | null;
  personal: { id: string; nombre: string; puesto: string; departamento: string; };
}
interface Criterio { subarea: string; responsabilidad: string; estandar: string; puntaje: number; nota?: string; evidencias?: string[] }
interface Objetivo { texto: string; resultado: string; comentario: string; evidencias: string[] }
interface Acuerdo { texto: string; estado: string; nota: string }
interface AutoData { metricas?: Record<string, number>; comentarios?: Record<string, string>; logros?: string; retos?: string }

const CALIF_FINAL: Record<string, { label: string; cls: string }> = {
  EXCEDE:        { label: "Excede expectativas", cls: "text-green-400 bg-green-900/20" },
  CUMPLE:        { label: "Cumple",              cls: "text-yellow-400 bg-yellow-900/20" },
  EN_DESARROLLO: { label: "En desarrollo",       cls: "text-orange-400 bg-orange-900/20" },
  NO_CUMPLE:     { label: "No cumple",           cls: "text-red-400 bg-red-900/20" },
};
const RESULTADO_OBJ: Record<string, { label: string; cls: string }> = {
  PENDIENTE:   { label: "Pendiente",   cls: "text-gray-400 bg-gray-800/50" },
  CUMPLIDO:    { label: "Cumplido",    cls: "text-green-400 bg-green-900/20" },
  PARCIAL:     { label: "Parcial",     cls: "text-yellow-400 bg-yellow-900/20" },
  NO_CUMPLIDO: { label: "No cumplido", cls: "text-red-400 bg-red-900/20" },
};

const ESTADO_ACUERDO: Record<string, { label: string; cls: string }> = {
  PENDIENTE:   { label: "Pendiente",   cls: "text-gray-400 bg-gray-800/50" },
  CUMPLIDO:    { label: "Cumplido",    cls: "text-green-400 bg-green-900/20" },
  PARCIAL:     { label: "Parcial",     cls: "text-yellow-400 bg-yellow-900/20" },
  NO_CUMPLIDO: { label: "No cumplido", cls: "text-red-400 bg-red-900/20" },
};

const METRICAS = [
  { key: "puntualidad",      label: "Puntualidad" },
  { key: "ordenLimpieza",    label: "Orden y limpieza" },
  { key: "actitud",          label: "Actitud" },
  { key: "comunicacion",     label: "Comunicación" },
  { key: "resolucionProb",   label: "Resolución de problemas" },
  { key: "propuestasMejora", label: "Propuestas de mejora" },
  { key: "calidadTrabajo",   label: "Calidad del trabajo" },
  { key: "trabajoEquipo",    label: "Trabajo en equipo" },
] as const;

type MetricaKey = typeof METRICAS[number]["key"];

function scoreColor(s: number) {
  if (s >= 4) return "text-green-400";
  if (s >= 3) return "text-yellow-400";
  if (s >= 2) return "text-orange-400";
  return "text-red-400";
}
function scoreLabel(s: number) { return ["","Deficiente","Regular","Bueno","Muy bueno","Excelente"][s] ?? ""; }
function ScoreRow({ label, value, nota }: { label: string; value: number; nota?: string }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm w-48 shrink-0">{label}</span>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(n => (
            <div key={n} className={`w-8 h-6 rounded text-xs font-bold flex items-center justify-center ${
              n === value
                ? (n>=4?"bg-green-600 text-white":n>=3?"bg-yellow-600 text-black":n>=2?"bg-orange-600 text-white":"bg-red-600 text-white")
                : n < value
                  ? (value>=4?"bg-green-900/40 text-green-700":value>=3?"bg-yellow-900/40 text-yellow-700":value>=2?"bg-orange-900/40 text-orange-700":"bg-red-900/40 text-red-700")
                  : "bg-[#1a1a1a] text-gray-700"
            }`}>{n}</div>
          ))}
        </div>
        {value > 0 && (
          <span className={`text-xs ${scoreColor(value)}`}>{scoreLabel(value)}</span>
        )}
      </div>
      {nota && <p className="text-gray-500 text-xs mt-1 ml-0 md:ml-[13rem] italic">“{nota}”</p>}
    </div>
  );
}

export default function EvaluacionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/rrhh/evaluaciones/${id}`)
      .then(r => r.json())
      .then(d => { setEvaluacion(d.evaluacion ?? null); setLoading(false); });
  }, [id]);

  async function deleteEval() {
    if (!await confirm({ message: "¿Eliminar esta evaluación?", danger: true, confirmText: "Eliminar" })) return;
    const res = await fetch(`/api/rrhh/evaluaciones/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      return;
    }
    toast.success("Evaluación eliminada");
    router.push("/rrhh/evaluaciones");
  }

  if (loading) return <SkeletonPage rows={4} cols={3} />;
  if (!evaluacion) return <div className="p-6 text-gray-600 text-sm">Evaluación no encontrada.</div>;

  const e = evaluacion;
  let criterios: Criterio[] = [];
  try { const v = JSON.parse(e.criterios ?? "[]"); if (Array.isArray(v)) criterios = v; } catch { criterios = []; }
  let acuerdos: Acuerdo[] = [];
  try { const v = JSON.parse(e.acuerdos ?? "[]"); if (Array.isArray(v)) acuerdos = v; } catch { acuerdos = []; }
  let objetivos: Objetivo[] = [];
  try { const v = JSON.parse(e.objetivos ?? "[]"); if (Array.isArray(v)) objetivos = v; } catch { objetivos = []; }
  let compNotas: Record<string, string> = {};
  try { const v = JSON.parse(e.competenciaNotas ?? "{}"); if (v && typeof v === "object") compNotas = v; } catch { compNotas = {}; }
  let autoData: AutoData | null = null;
  try { const v = JSON.parse(e.autoData ?? "null"); if (v && typeof v === "object") autoData = v; } catch { autoData = null; }
  const autoLink = e.autoToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/autoevaluacion/${e.autoToken}` : null;
  const [_fy, _fm, _fd] = e.fecha.substring(0, 10).split("-").map(Number);
  const fecha = new Date(_fy, _fm - 1, _fd).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="mb-2"><BackButton /></div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <button onClick={() => router.push("/rrhh/evaluaciones")} className="text-gray-600 hover:text-white text-xs mb-2 transition-colors">← Evaluaciones</button>
          <h1 className="ms-h1">{e.personal.nombre}</h1>
          <p className="ms-subtitle">{e.personal.puesto} · {e.personal.departamento}</p>
        </div>
        <div className="text-right">
          {e.puntajeTotal != null && (
            <p className={`text-4xl font-bold ${scoreColor(e.puntajeTotal)}`}>{e.puntajeTotal.toFixed(1)}</p>
          )}
          <p className="text-gray-600 text-xs">/5.0</p>
          <div className="flex flex-col items-end gap-1 mt-1">
            {e.calificacionFinal && CALIF_FINAL[e.calificacionFinal] && (
              <span className={`text-[10px] px-2 py-0.5 rounded ${CALIF_FINAL[e.calificacionFinal].cls}`}>{CALIF_FINAL[e.calificacionFinal].label}</span>
            )}
            {e.estado === "COMPLETADA"
              ? <span className="text-[10px] text-green-400 bg-green-900/20 px-2 py-0.5 rounded">Completada</span>
              : <span className="text-[10px] text-gray-400 bg-gray-800/50 px-2 py-0.5 rounded">Borrador</span>}
          </div>
        </div>
      </div>

      {/* Autoevaluación y firma */}
      {autoLink && (
        <div className="ms-card p-5 space-y-3">
          <p className="text-xs text-[#B3985B] uppercase tracking-wider">Autoevaluación y firma del colaborador</p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className={`px-2 py-0.5 rounded ${e.autoEstado === "ENVIADA" ? "text-green-400 bg-green-900/20" : "text-gray-400 bg-gray-800/50"}`}>
              Autoevaluación: {e.autoEstado === "ENVIADA" ? "recibida" : "pendiente"}
            </span>
            <span className={`px-2 py-0.5 rounded ${e.firmada ? "text-green-400 bg-green-900/20" : "text-gray-400 bg-gray-800/50"}`}>
              Firma: {e.firmada ? `firmada por ${e.firmadaNombre ?? "colaborador"}` : "pendiente"}
            </span>
          </div>
          <div className="flex gap-2">
            <input readOnly value={autoLink} className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-gray-400 text-xs focus:outline-none" />
            <button onClick={() => { navigator.clipboard.writeText(autoLink); toast.success("Enlace copiado"); }}
              className="bg-[#1a1a1a] hover:bg-[#222] text-white text-xs px-3 py-2 rounded-lg transition-colors">Copiar enlace</button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="ms-card p-5">
        <div className="flex flex-wrap gap-4 text-sm">
          <div><p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">Período</p><p className="text-[#B3985B] font-semibold">{e.periodo}</p></div>
          <div><p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">Fecha</p><p className="text-white">{fecha}</p></div>
          {e.evaluador && <div><p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">Evaluador</p><p className="text-white">{e.evaluador}</p></div>}
        </div>
      </div>

      {/* Objetivos del período */}
      {objetivos.length > 0 && (
        <div className="ms-card p-5 space-y-3">
          <p className="text-xs text-[#B3985B] uppercase tracking-wider">Objetivos del período</p>
          {objetivos.map((o, i) => {
            const res = RESULTADO_OBJ[o.resultado] ?? RESULTADO_OBJ.PENDIENTE;
            return (
              <div key={i} className="border-b border-[#1a1a1a] last:border-0 pb-3 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-gray-200 text-sm flex-1">{o.texto}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 ${res.cls}`}>{res.label}</span>
                </div>
                {o.comentario && <p className="text-gray-500 text-xs mt-1 italic">“{o.comentario}”</p>}
                {o.evidencias?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {o.evidencias.map((url, k) => (
                      <a key={k} href={url} target="_blank" rel="noreferrer" className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 px-2 py-0.5 rounded">Prueba {k+1}</a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Estándares del puesto evaluados */}
      {criterios.length > 0 && (
        <div className="ms-card p-5 space-y-4">
          <p className="text-xs text-[#B3985B] uppercase tracking-wider">Estándares del puesto</p>
          {criterios.map((c, i) => (
            <div key={i} className="border-b border-[#1a1a1a] last:border-0 pb-3 last:pb-0">
              {c.subarea && <span className="text-[10px] text-gray-600 uppercase tracking-wider">{c.subarea}</span>}
              <ScoreRow label={c.responsabilidad || c.estandar || "—"} value={c.puntaje} nota={c.nota} />
              {c.responsabilidad && c.estandar && <p className="text-gray-600 text-xs mt-1 ml-0">{c.estandar}</p>}
              {(c.evidencias?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {c.evidencias!.map((url, k) => (
                    <a key={k} href={url} target="_blank" rel="noreferrer" className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 px-2 py-0.5 rounded">Prueba {k+1}</a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Métricas */}
      <div className="ms-card p-5 space-y-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Competencias generales</p>
        {METRICAS.map(m => (
          <ScoreRow key={m.key} label={m.label} value={e[m.key as MetricaKey]} nota={compNotas[m.key]} />
        ))}
        {e.puntajeTotal != null && (
          <div className="pt-3 border-t border-[#1a1a1a] space-y-2">
            {(e.puntajeGeneral != null || e.puntajePuesto != null) && (
              <div className="flex gap-6 text-xs">
                {e.puntajeGeneral != null && (
                  <span className="text-gray-500">General (40%): <span className={scoreColor(e.puntajeGeneral)}>{e.puntajeGeneral.toFixed(1)}</span></span>
                )}
                {e.puntajePuesto != null && (
                  <span className="text-gray-500">Puesto (60%): <span className={scoreColor(e.puntajePuesto)}>{e.puntajePuesto.toFixed(1)}</span></span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm font-semibold">Puntaje total</span>
              <span className={`text-2xl font-bold ${scoreColor(e.puntajeTotal)}`}>{e.puntajeTotal.toFixed(2)} / 5.00</span>
            </div>
          </div>
        )}
      </div>

      {/* Autoevaluación del colaborador (180°) */}
      {autoData && (
        <div className="ms-card p-5 space-y-4">
          <p className="text-xs text-[#B3985B] uppercase tracking-wider">Autoevaluación del colaborador</p>
          <div className="space-y-2">
            {METRICAS.filter(m => (autoData!.metricas?.[m.key] ?? 0) > 0 || autoData!.comentarios?.[m.key]).map(m => {
              const self = autoData!.metricas?.[m.key] ?? 0;
              const boss = e[m.key as MetricaKey];
              const diff = self - boss;
              return (
                <div key={m.key} className="flex items-start justify-between gap-3 border-b border-[#1a1a1a] last:border-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <span className="text-gray-400 text-sm">{m.label}</span>
                    {autoData!.comentarios?.[m.key] && <p className="text-gray-500 text-xs italic mt-0.5">“{autoData!.comentarios[m.key]}”</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <span className="text-gray-500">Él: <span className={self>0?scoreColor(self):"text-gray-600"}>{self||"—"}</span></span>
                    <span className="text-gray-700">·</span>
                    <span className="text-gray-500">Tú: <span className={boss>0?scoreColor(boss):"text-gray-600"}>{boss||"—"}</span></span>
                    {self>0 && boss>0 && diff!==0 && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${diff>0?"text-orange-400 bg-orange-900/20":"text-blue-400 bg-blue-900/20"}`}>
                        {diff>0?`+${diff}`:diff}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {(autoData.logros || autoData.retos) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {autoData.logros && (
                <div>
                  <p className="text-[10px] text-green-400 uppercase tracking-wider mb-1">Sus logros</p>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{autoData.logros}</p>
                </div>
              )}
              {autoData.retos && (
                <div>
                  <p className="text-[10px] text-orange-400 uppercase tracking-wider mb-1">Quiere mejorar</p>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{autoData.retos}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Acuerdos y seguimiento */}
      {acuerdos.length > 0 && (
        <div className="ms-card p-5 space-y-3">
          <p className="text-xs text-[#B3985B] uppercase tracking-wider">Acuerdos y seguimiento</p>
          {acuerdos.map((a, i) => {
            const est = ESTADO_ACUERDO[a.estado] ?? ESTADO_ACUERDO.PENDIENTE;
            return (
              <div key={i} className="border-b border-[#1a1a1a] last:border-0 pb-3 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-gray-200 text-sm flex-1">{a.texto}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 ${est.cls}`}>{est.label}</span>
                </div>
                {a.nota && <p className="text-gray-600 text-xs mt-1">{a.nota}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Texto */}
      {(e.aspectosPositivos || e.areasMejora || e.incidentesNota || e.observaciones) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {e.aspectosPositivos && (
            <div className="ms-stat-card">
              <p className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-2">+ Aspectos positivos</p>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{e.aspectosPositivos}</p>
            </div>
          )}
          {e.areasMejora && (
            <div className="ms-stat-card">
              <p className="text-xs text-orange-400 font-semibold uppercase tracking-wider mb-2">Áreas de mejora</p>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{e.areasMejora}</p>
            </div>
          )}
          {e.incidentesNota && (
            <div className="ms-stat-card">
              <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-2">Incidentes / Negligencias</p>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{e.incidentesNota}</p>
            </div>
          )}
          {e.observaciones && (
            <div className="ms-stat-card">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Observaciones generales</p>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{e.observaciones}</p>
            </div>
          )}
        </div>
      )}

      {/* Eliminar */}
      <div className="flex justify-end">
        <button onClick={deleteEval} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Eliminar evaluación</button>
      </div>
    </div>
  );
}
