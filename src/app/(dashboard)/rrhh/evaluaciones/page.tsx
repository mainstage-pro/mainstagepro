"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";
import { Modal } from "@/components/Modal";
import { AlertTriangle, Ban, Plus, X, Sparkles, Paperclip, Copy, Target } from "lucide-react";
import { calcularPuntajes, PESO_GENERAL, PESO_PUESTO } from "@/lib/evaluaciones";

interface Personal { id: string; nombre: string; puesto: string; departamento: string; }
interface Criterio { subarea: string; responsabilidad: string; estandar: string; puntaje: number; nota: string; evidencias: string[] }
interface ObjetivoForm { texto: string; resultado: string; comentario: string; evidencias: string[] }
interface AcuerdoForm { texto: string; estado: string; nota: string; seguimiento: boolean }

const RESULTADOS_OBJETIVO = [
  { key: "PENDIENTE",   label: "Pendiente",   cls: "bg-gray-700 text-white" },
  { key: "CUMPLIDO",    label: "Cumplido",    cls: "bg-green-600 text-white" },
  { key: "PARCIAL",     label: "Parcial",     cls: "bg-yellow-600 text-black" },
  { key: "NO_CUMPLIDO", label: "No cumplido", cls: "bg-red-600 text-white" },
] as const;

const CALIFICACIONES_FINALES = [
  { key: "EXCEDE",        label: "Excede expectativas", cls: "bg-green-600 text-white" },
  { key: "CUMPLE",        label: "Cumple",              cls: "bg-yellow-600 text-black" },
  { key: "EN_DESARROLLO", label: "En desarrollo",       cls: "bg-orange-600 text-white" },
  { key: "NO_CUMPLE",     label: "No cumple",           cls: "bg-red-600 text-white" },
] as const;

const ESTADOS_ACUERDO = [
  { key: "PENDIENTE",   label: "Pendiente",   cls: "bg-gray-700 text-white" },
  { key: "CUMPLIDO",    label: "Cumplido",    cls: "bg-green-600 text-white" },
  { key: "PARCIAL",     label: "Parcial",     cls: "bg-yellow-600 text-black" },
  { key: "NO_CUMPLIDO", label: "No cumplido", cls: "bg-red-600 text-white" },
] as const;
interface Evaluacion {
  id: string; personalId: string; periodo: string; evaluador: string | null; fecha: string;
  puntajeTotal: number | null; estado: string;
  puntualidad: number; ordenLimpieza: number; actitud: number; comunicacion: number;
  resolucionProb: number; propuestasMejora: number; calidadTrabajo: number; trabajoEquipo: number;
  personal: { id: string; nombre: string; puesto: string; };
}

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
function ScoreBar({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <div key={n} className={`w-4 h-1.5 rounded-sm ${n<=value ? (value>=4?"bg-green-500":value>=3?"bg-yellow-500":value>=2?"bg-orange-500":"bg-red-500") : "bg-[#1a1a1a]"}`} />
      ))}
    </div>
  );
}

const EMPTY_FORM = () => ({
  personalId:"", periodo:"", evaluador:"",
  puntualidad:0, ordenLimpieza:0, actitud:0, comunicacion:0,
  resolucionProb:0, propuestasMejora:0, calidadTrabajo:0, trabajoEquipo:0,
  aspectosPositivos:"", areasMejora:"", incidentesNota:"", observaciones:"", estado:"COMPLETADA",
  criterios: [] as Criterio[],
  acuerdos: [] as AcuerdoForm[],
  objetivos: [] as ObjetivoForm[],
  competenciaNotas: {} as Record<string, string>,
  calificacionFinal: "",
});

export default function EvaluacionesPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM());
  const [saving, setSaving] = useState(false);
  const [filtroPersonal, setFiltroPersonal] = useState("");
  const [cargandoEst, setCargandoEst] = useState(false);
  const [puestoNombre, setPuestoNombre] = useState<string | null>(null);
  const [periodoPrevio, setPeriodoPrevio] = useState<string | null>(null);
  const [sugiriendo, setSugiriendo] = useState(false);
  const [autoLink, setAutoLink] = useState<string | null>(null);

  async function load() {
    const [pRes, eRes] = await Promise.all([
      fetch("/api/rrhh/personal"),
      fetch("/api/rrhh/evaluaciones" + (filtroPersonal ? `?personalId=${filtroPersonal}` : "")),
    ]);
    const [pD, eD] = await Promise.all([pRes.json(), eRes.json()]);
    setPersonal(pD.personal?.filter((p: Personal & {activo:boolean}) => p.activo) ?? []);
    setEvaluaciones(eD.evaluaciones ?? []);
  }

  useEffect(() => { load(); }, [filtroPersonal]);

  function setMetrica(key: MetricaKey, val: number) {
    setForm(p => ({ ...p, [key]: val }));
  }

  function setCriterio(idx: number, patch: Partial<Criterio>) {
    setForm(p => ({ ...p, criterios: p.criterios.map((c, i) => i === idx ? { ...c, ...patch } : c) }));
  }

  function setCompNota(key: string, val: string) {
    setForm(p => ({ ...p, competenciaNotas: { ...p.competenciaNotas, [key]: val } }));
  }

  function setObjetivo(idx: number, patch: Partial<ObjetivoForm>) {
    setForm(p => ({ ...p, objetivos: p.objetivos.map((o, i) => i === idx ? { ...o, ...patch } : o) }));
  }
  function addObjetivo() {
    setForm(p => ({ ...p, objetivos: [...p.objetivos, { texto: "", resultado: "PENDIENTE", comentario: "", evidencias: [] }] }));
  }
  function removeObjetivo(idx: number) {
    setForm(p => ({ ...p, objetivos: p.objetivos.filter((_, i) => i !== idx) }));
  }

  async function sugerir() {
    if (!form.personalId) return;
    setSugiriendo(true);
    try {
      const r = await fetch("/api/rrhh/evaluaciones/sugerir-objetivos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalId: form.personalId, periodo: form.periodo }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? "No se pudo sugerir"); return; }
      if (!d.ok || !(d.objetivos?.length)) { toast.error(d.mensaje ?? "Sin objetivos para sugerir"); return; }
      setForm(p => ({
        ...p,
        objetivos: [
          ...p.objetivos,
          ...d.objetivos.map((o: { texto: string }) => ({ texto: o.texto, resultado: "PENDIENTE", comentario: "", evidencias: [] })),
        ],
      }));
      toast.success(`${d.objetivos.length} objetivos sugeridos`);
    } finally {
      setSugiriendo(false);
    }
  }

  async function subirEvidencia(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    if (!r.ok) { toast.error("No se pudo subir el archivo"); return null; }
    const d = await r.json();
    return d.url ?? null;
  }

  async function addEvidenciaObjetivo(idx: number, file: File) {
    const url = await subirEvidencia(file);
    if (url) setObjetivo(idx, { evidencias: [...form.objetivos[idx].evidencias, url] });
  }
  async function addEvidenciaCriterio(idx: number, file: File) {
    const url = await subirEvidencia(file);
    if (url) setCriterio(idx, { evidencias: [...form.criterios[idx].evidencias, url] });
  }

  function setAcuerdo(idx: number, patch: Partial<AcuerdoForm>) {
    setForm(p => ({ ...p, acuerdos: p.acuerdos.map((a, i) => i === idx ? { ...a, ...patch } : a) }));
  }
  function addAcuerdo() {
    setForm(p => ({ ...p, acuerdos: [...p.acuerdos, { texto: "", estado: "PENDIENTE", nota: "", seguimiento: false }] }));
  }
  function removeAcuerdo(idx: number) {
    setForm(p => ({ ...p, acuerdos: p.acuerdos.filter((_, i) => i !== idx) }));
  }

  async function selectPersona(id: string) {
    setForm(p => ({ ...p, personalId: id, criterios: [], acuerdos: [] }));
    setPuestoNombre(null);
    setPeriodoPrevio(null);
    if (!id) return;
    setCargandoEst(true);
    try {
      const r = await fetch(`/api/rrhh/evaluaciones/estandares?personalId=${id}`);
      const d = await r.json();
      setPuestoNombre(d.puestoNombre ?? null);
      setPeriodoPrevio(d.periodoPrevio ?? null);
      setForm(p => ({
        ...p,
        criterios: (d.estandares ?? []).map((e: { subarea: string; responsabilidad: string; estandar: string }) => ({ ...e, puntaje: 0, nota: "", evidencias: [] })),
        acuerdos: (d.acuerdosPrevios ?? []).map((a: { texto: string }) => ({ texto: a.texto, estado: "PENDIENTE", nota: "", seguimiento: true })),
      }));
    } finally {
      setCargandoEst(false);
    }
  }

  const puntajes = calcularPuntajes(
    Object.fromEntries(METRICAS.map(m => [m.key, form[m.key]])),
    form.criterios,
  );

  async function save(estado: "BORRADOR" | "COMPLETADA") {
    if (!form.personalId || !form.periodo) return;
    setSaving(true);
    const r = await fetch("/api/rrhh/evaluaciones", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, estado }),
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); toast.error(d.error ?? "Error al guardar"); setSaving(false); return; }
    const d = await r.json().catch(() => ({}));
    await load();
    setSaving(false);
    const tok = d.evaluacion?.autoToken;
    if (tok) {
      setAutoLink(`${window.location.origin}/autoevaluacion/${tok}`);
    } else {
      setShowForm(false);
      setForm(EMPTY_FORM());
    }
  }

  function cerrarForm() {
    setShowForm(false);
    setForm(EMPTY_FORM());
    setAutoLink(null);
  }

  async function deleteEval(id: string) {
    if (!await confirm({ message: "¿Eliminar esta evaluación?", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/rrhh/evaluaciones/${id}`, { method: "DELETE" });
    toast.success("Evaluación eliminada");
    await load();
  }

  const promedio = evaluaciones.length > 0
    ? evaluaciones.filter(e=>e.puntajeTotal!=null).reduce((s,e)=>s+(e.puntajeTotal??0),0) / evaluaciones.filter(e=>e.puntajeTotal!=null).length
    : 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="ms-h1">Evaluaciones de desempeño</h1>
          <p className="ms-subtitle">Seguimiento del rendimiento del equipo</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="ms-btn-primary">
          + Nueva evaluación
        </button>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <Combobox
          value={filtroPersonal}
          onChange={v => setFiltroPersonal(v)}
          options={[{ value: "", label: "Todos los empleados" }, ...personal.map(p => ({ value: p.id, label: p.nombre }))]}
          className="ms-input-inline"
        />
        {evaluaciones.length > 0 && promedio > 0 && (
          <span className={`text-sm font-semibold ${scoreColor(promedio)}`}>
            Promedio: {promedio.toFixed(1)}/5
          </span>
        )}
      </div>

      {/* Formulario */}
      <Modal open={showForm} onClose={cerrarForm} title="Nueva evaluación">
        {autoLink ? (
          <div className="space-y-4 py-2">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-white font-semibold">Evaluación guardada</p>
              <p className="text-gray-500 text-sm">Comparte este enlace con el colaborador para que haga su <span className="text-[#B3985B]">autoevaluación</span> y luego firme de enterado.</p>
            </div>
            <div className="flex gap-2">
              <input readOnly value={autoLink} className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-gray-300 text-xs focus:outline-none" />
              <button onClick={() => { navigator.clipboard.writeText(autoLink); toast.success("Enlace copiado"); }}
                className="bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5">
                <Copy className="w-4 h-4" /> Copiar
              </button>
            </div>
            <button onClick={cerrarForm} className="w-full text-gray-500 hover:text-white text-sm py-2 transition-colors">Cerrar</button>
          </div>
        ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Empleado</label>
              <Combobox
                value={form.personalId}
                onChange={v => selectPersona(v)}
                options={[{ value: "", label: "Seleccionar..." }, ...personal.map(p => ({ value: p.id, label: p.nombre }))]}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Período</label>
              <input value={form.periodo} onChange={e=>setForm(p=>({...p,periodo:e.target.value}))}
                placeholder="Ej: Abril 2026, Q1 2026..."
                className="ms-input" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Evaluador</label>
              <input value={form.evaluador} onChange={e=>setForm(p=>({...p,evaluador:e.target.value}))}
                placeholder="Nombre del evaluador..."
                className="ms-input" /></div>
          </div>

          {/* Objetivos del período (IA) */}
          <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#B3985B] uppercase tracking-wider flex items-center gap-1.5">
                  <Target strokeWidth={1.75} className="w-3.5 h-3.5" /> Objetivos del período
                </p>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={sugerir} disabled={sugiriendo||!form.personalId}
                    className="text-[11px] text-[#B3985B] hover:text-[#c9a96a] disabled:opacity-50 flex items-center gap-1 transition-colors">
                    <Sparkles strokeWidth={2} className="w-3.5 h-3.5" /> {sugiriendo ? "Sugiriendo…" : "Sugerir con IA"}
                  </button>
                  <button type="button" onClick={addObjetivo}
                    className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                    <Plus strokeWidth={2} className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
              </div>
              {form.objetivos.length === 0 ? (
                <p className="text-xs text-gray-600 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2">
                  Define objetivos medibles del período. Usa <span className="text-[#B3985B]">Sugerir con IA</span> para generarlos desde el plan de trabajo y las responsabilidades del puesto.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {form.objetivos.map((o, i) => (
                    <div key={i} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <textarea value={o.texto} onChange={e=>setObjetivo(i,{texto:e.target.value})} rows={2}
                          placeholder="Objetivo SMART del período…"
                          className="flex-1 bg-transparent text-gray-200 text-sm focus:outline-none placeholder:text-gray-700 resize-none" />
                        <button type="button" onClick={()=>removeObjetivo(i)}
                          className="text-gray-700 hover:text-red-400 shrink-0 mt-0.5 transition-colors">
                          <X strokeWidth={2} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {RESULTADOS_OBJETIVO.map(s => (
                          <button key={s.key} type="button" onClick={()=>setObjetivo(i,{resultado:s.key})}
                            className={`text-[10px] px-2 py-1 rounded transition-all ${o.resultado===s.key ? s.cls : "bg-[#1a1a1a] text-gray-600 hover:text-white"}`}>
                            {s.label}
                          </button>
                        ))}
                        <label className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 cursor-pointer transition-colors ml-auto">
                          <Paperclip strokeWidth={2} className="w-3 h-3" /> Evidencia
                          <input type="file" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) addEvidenciaObjetivo(i,f); e.target.value=""; }} />
                        </label>
                      </div>
                      <input value={o.comentario} onChange={e=>setObjetivo(i,{comentario:e.target.value})}
                        placeholder="Comentario del resultado (opcional)…"
                        className="w-full mt-2 bg-transparent text-gray-400 text-xs focus:outline-none placeholder:text-gray-700 border-b border-[#1a1a1a] focus:border-[#2a2a2a] pb-1" />
                      {o.evidencias.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {o.evidencias.map((url, k) => (
                            <a key={k} href={url} target="_blank" rel="noreferrer"
                              className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 px-2 py-0.5 rounded flex items-center gap-1">
                              <Paperclip className="w-3 h-3" /> Prueba {k+1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          {/* Estándares del puesto */}
          <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#B3985B] uppercase tracking-wider">
                  Estándares del puesto{puestoNombre ? ` · ${puestoNombre}` : ""}
                </p>
                {cargandoEst && <span className="text-[10px] text-gray-600">Cargando…</span>}
              </div>
              {!form.personalId ? (
                <p className="text-xs text-gray-600 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2">
                  Selecciona un empleado para cargar los estándares de su puesto.
                </p>
              ) : !cargandoEst && form.criterios.length === 0 ? (
                <p className="text-xs text-gray-600 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2">
                  Este puesto no tiene estándares definidos. Puedes capturarlos en Puestos para evaluarlos aquí.
                </p>
              ) : (
                <div className="space-y-3">
                  {form.criterios.map((c, i) => (
                    <div key={i} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          {c.subarea && <span className="text-[10px] text-gray-500 uppercase tracking-wider">{c.subarea}</span>}
                          <p className="text-gray-200 text-sm">{c.responsabilidad || c.estandar || "—"}</p>
                          {c.responsabilidad && c.estandar && <p className="text-gray-600 text-xs mt-0.5">{c.estandar}</p>}
                        </div>
                        <span className={`text-xs shrink-0 ${c.puntaje>0?scoreColor(c.puntaje):"text-gray-700"}`}>
                          {c.puntaje>0?scoreLabel(c.puntaje):"Sin calificar"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(n => (
                          <button key={n} onClick={() => setCriterio(i, { puntaje: c.puntaje===n?0:n })}
                            className={`flex-1 h-8 rounded text-sm font-bold transition-all ${c.puntaje===n
                              ? (n>=4?"bg-green-600 text-white":n>=3?"bg-yellow-600 text-black":n>=2?"bg-orange-600 text-white":"bg-red-600 text-white")
                              : "bg-[#1a1a1a] text-gray-600 hover:bg-[#222] hover:text-white"}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input value={c.nota} onChange={e=>setCriterio(i,{nota:e.target.value})}
                          placeholder="Justificación de la calificación (opcional)…"
                          className="flex-1 bg-transparent text-gray-400 text-xs focus:outline-none placeholder:text-gray-700 border-b border-[#1a1a1a] focus:border-[#2a2a2a] pb-1" />
                        <label className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 cursor-pointer transition-colors shrink-0">
                          <Paperclip strokeWidth={2} className="w-3 h-3" /> Evidencia
                          <input type="file" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) addEvidenciaCriterio(i,f); e.target.value=""; }} />
                        </label>
                      </div>
                      {c.evidencias.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {c.evidencias.map((url, k) => (
                            <a key={k} href={url} target="_blank" rel="noreferrer"
                              className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 px-2 py-0.5 rounded flex items-center gap-1">
                              <Paperclip className="w-3 h-3" /> Prueba {k+1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          {/* Métricas */}
          <div className="mt-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Competencias generales (1=Deficiente · 5=Excelente)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {METRICAS.map(m => (
                <div key={m.key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-300 text-sm">{m.label}</label>
                    <span className={`text-xs ${form[m.key]>0?scoreColor(form[m.key]):"text-gray-700"}`}>
                      {form[m.key]>0?scoreLabel(form[m.key]):"Sin calificar"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setMetrica(m.key, form[m.key]===n?0:n)}
                        className={`flex-1 h-8 rounded text-sm font-bold transition-all ${form[m.key]===n
                          ? (n>=4?"bg-green-600 text-white":n>=3?"bg-yellow-600 text-black":n>=2?"bg-orange-600 text-white":"bg-red-600 text-white")
                          : "bg-[#1a1a1a] text-gray-600 hover:bg-[#222] hover:text-white"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <input value={form.competenciaNotas[m.key] ?? ""} onChange={e=>setCompNota(m.key, e.target.value)}
                    placeholder="Comentario (opcional)…"
                    className="w-full mt-1.5 bg-transparent text-gray-400 text-xs focus:outline-none placeholder:text-gray-700 border-b border-[#1a1a1a] focus:border-[#2a2a2a] pb-1" />
                </div>
              ))}
            </div>
          </div>

          {/* Texto libre */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
            <div>
              <label className="text-xs text-green-400 mb-1 block font-semibold">+ Aspectos positivos</label>
              <textarea value={form.aspectosPositivos} onChange={e=>setForm(p=>({...p,aspectosPositivos:e.target.value}))} rows={3}
                placeholder="Logros, fortalezas, actitudes destacadas..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/50 resize-none" />
            </div>
            <div>
              <label className="text-xs text-orange-400 mb-1 flex items-center gap-1.5 font-semibold"><AlertTriangle strokeWidth={1.75} className="w-3.5 h-3.5" />Áreas de mejora</label>
              <textarea value={form.areasMejora} onChange={e=>setForm(p=>({...p,areasMejora:e.target.value}))} rows={3}
                placeholder="Qué debe mejorar, habilidades a desarrollar..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50 resize-none" />
            </div>
            <div>
              <label className="text-xs text-red-400 mb-1 flex items-center gap-1.5 font-semibold"><Ban strokeWidth={1.75} className="w-3.5 h-3.5" />Incidentes / Negligencias</label>
              <textarea value={form.incidentesNota} onChange={e=>setForm(p=>({...p,incidentesNota:e.target.value}))} rows={2}
                placeholder="Situaciones que requieren atención..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-semibold">Observaciones generales</label>
              <textarea value={form.observaciones} onChange={e=>setForm(p=>({...p,observaciones:e.target.value}))} rows={2}
                placeholder="Notas adicionales..."
                className="ms-input resize-none" />
            </div>
          </div>

          {/* Acuerdos y seguimiento */}
          <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#B3985B] uppercase tracking-wider">Acuerdos y seguimiento</p>
                <button type="button" onClick={addAcuerdo}
                  className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                  <Plus strokeWidth={2} className="w-3.5 h-3.5" /> Agregar acuerdo
                </button>
              </div>
              {form.acuerdos.length === 0 ? (
                <p className="text-xs text-gray-600 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2">
                  Sin acuerdos. Agrega compromisos para el siguiente periodo; se arrastrarán al próximo mes hasta cumplirse.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.acuerdos.map((a, i) => (
                    <div key={i} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          {a.seguimiento && (
                            <span className="text-[9px] text-[#B3985B] uppercase tracking-wider">
                              Seguimiento{periodoPrevio ? ` · ${periodoPrevio}` : ""}
                            </span>
                          )}
                          <input value={a.texto} onChange={e=>setAcuerdo(i,{texto:e.target.value})}
                            placeholder="Compromiso o acuerdo..."
                            className="w-full bg-transparent text-gray-200 text-sm focus:outline-none placeholder:text-gray-700" />
                        </div>
                        <button type="button" onClick={()=>removeAcuerdo(i)}
                          className="text-gray-700 hover:text-red-400 shrink-0 mt-0.5 transition-colors">
                          <X strokeWidth={2} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {ESTADOS_ACUERDO.map(s => (
                          <button key={s.key} type="button" onClick={()=>setAcuerdo(i,{estado:s.key})}
                            className={`text-[10px] px-2 py-1 rounded transition-all ${a.estado===s.key ? s.cls : "bg-[#1a1a1a] text-gray-600 hover:text-white"}`}>
                            {s.label}
                          </button>
                        ))}
                        <input value={a.nota} onChange={e=>setAcuerdo(i,{nota:e.target.value})}
                          placeholder="Nota (opcional)…"
                          className="flex-1 min-w-[120px] bg-transparent text-gray-400 text-xs focus:outline-none placeholder:text-gray-700 border-b border-[#1a1a1a] focus:border-[#2a2a2a]" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          {/* Resumen de puntaje ponderado */}
          {(puntajes.general != null || puntajes.puesto != null) && (
            <div className="mt-5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-5 text-sm">
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">General ({Math.round(PESO_GENERAL*100)}%)</p>
                  <p className={puntajes.general!=null?scoreColor(puntajes.general):"text-gray-700"}>{puntajes.general!=null?puntajes.general.toFixed(1):"—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">Puesto ({Math.round(PESO_PUESTO*100)}%)</p>
                  <p className={puntajes.puesto!=null?scoreColor(puntajes.puesto):"text-gray-700"}>{puntajes.puesto!=null?puntajes.puesto.toFixed(1):"—"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Total ponderado</p>
                <p className={`text-2xl font-bold ${puntajes.total!=null?scoreColor(puntajes.total):"text-gray-700"}`}>{puntajes.total!=null?puntajes.total.toFixed(2):"—"}<span className="text-xs text-gray-600 font-normal"> /5</span></p>
              </div>
            </div>
          )}

          {/* Calificación final */}
          <div className="mt-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Calificación final</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CALIFICACIONES_FINALES.map(c => (
                <button key={c.key} type="button" onClick={()=>setForm(p=>({...p, calificacionFinal: p.calificacionFinal===c.key ? "" : c.key}))}
                  className={`text-xs px-3 py-2 rounded-lg font-semibold transition-all ${form.calificacionFinal===c.key ? c.cls : "bg-[#1a1a1a] text-gray-500 hover:text-white"}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 items-center">
            <button onClick={()=>save("COMPLETADA")} disabled={saving||!form.personalId||!form.periodo}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving?"Guardando...":"Guardar y cerrar"}
            </button>
            <button onClick={()=>save("BORRADOR")} disabled={saving||!form.personalId||!form.periodo}
              className="text-gray-400 hover:text-white disabled:opacity-50 text-sm px-4 py-2 rounded-lg border border-[#2a2a2a] transition-colors">
              Guardar borrador
            </button>
            <span className="text-[11px] text-gray-600">Usa borrador si el colaborador se autoevalúa primero.</span>
          </div>
        </>
        )}
      </Modal>

      {/* Lista */}
      <div className="space-y-3">
        {evaluaciones.length === 0 ? (
          <div className="ms-empty-state">
            <p className="text-gray-500 text-sm">Sin evaluaciones registradas</p>
          </div>
        ) : evaluaciones.map(e => (
          <div key={e.id} className="ms-card-hover p-5 transition-colors cursor-pointer"
            onClick={() => router.push(`/rrhh/evaluaciones/${e.id}`)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-white font-semibold text-sm">{e.personal.nombre}</span>
                  <span className="text-gray-500 text-xs">{e.personal.puesto}</span>
                  <span className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 px-2 py-0.5 rounded">{e.periodo}</span>
                  {e.estado === "COMPLETADA" && <span className="text-[10px] text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded">Completada</span>}
                </div>
                {/* Mini barras de métricas */}
                <div className="flex flex-wrap gap-3">
                  {METRICAS.filter(m=>e[m.key]>0).map(m=>(
                    <div key={m.key} className="flex items-center gap-1.5">
                      <span className="text-[9px] text-gray-600">{m.label.split(" ")[0]}</span>
                      <ScoreBar value={e[m.key]} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0" onClick={ev=>ev.stopPropagation()}>
                {e.puntajeTotal != null && (
                  <p className={`text-2xl font-bold ${scoreColor(e.puntajeTotal)}`}>{e.puntajeTotal.toFixed(1)}</p>
                )}
                <p className="text-gray-600 text-[10px]">/5.0</p>
                <button onClick={()=>deleteEval(e.id)} className="text-[10px] text-gray-700 hover:text-red-400 transition-colors mt-1">Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
