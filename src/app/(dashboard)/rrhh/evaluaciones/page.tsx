"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Personal { id: string; nombre: string; puesto: string; departamento: string; }
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
});

export default function EvaluacionesPage() {
  const router = useRouter();
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM());
  const [saving, setSaving] = useState(false);
  const [filtroPersonal, setFiltroPersonal] = useState("");

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

  async function save() {
    if (!form.personalId || !form.periodo) return;
    setSaving(true);
    await fetch("/api/rrhh/evaluaciones", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    await load();
    setShowForm(false);
    setForm(EMPTY_FORM());
    setSaving(false);
  }

  async function deleteEval(id: string) {
    if (!confirm("¿Eliminar esta evaluación?")) return;
    await fetch(`/api/rrhh/evaluaciones/${id}`, { method: "DELETE" });
    await load();
  }

  const promedio = evaluaciones.length > 0
    ? evaluaciones.filter(e=>e.puntajeTotal!=null).reduce((s,e)=>s+(e.puntajeTotal??0),0) / evaluaciones.filter(e=>e.puntajeTotal!=null).length
    : 0;

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Evaluaciones de desempeño</h1>
          <p className="text-[#6b7280] text-sm">Seguimiento del rendimiento del equipo</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Nueva evaluación
        </button>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <select value={filtroPersonal} onChange={e=>setFiltroPersonal(e.target.value)}
          className="bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
          <option value="">Todos los empleados</option>
          {personal.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        {evaluaciones.length > 0 && promedio > 0 && (
          <span className={`text-sm font-semibold ${scoreColor(promedio)}`}>
            Promedio: {promedio.toFixed(1)}/5
          </span>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-5">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Nueva evaluación</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Empleado</label>
              <select value={form.personalId} onChange={e=>setForm(p=>({...p,personalId:e.target.value}))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="">Seleccionar...</option>
                {personal.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Período</label>
              <input value={form.periodo} onChange={e=>setForm(p=>({...p,periodo:e.target.value}))}
                placeholder="Ej: Abril 2026, Q1 2026..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Evaluador</label>
              <input value={form.evaluador} onChange={e=>setForm(p=>({...p,evaluador:e.target.value}))}
                placeholder="Nombre del evaluador..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" /></div>
          </div>

          {/* Métricas */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Calificación (1=Deficiente · 5=Excelente)</p>
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
                </div>
              ))}
            </div>
          </div>

          {/* Texto libre */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-green-400 mb-1 block font-semibold">+ Aspectos positivos</label>
              <textarea value={form.aspectosPositivos} onChange={e=>setForm(p=>({...p,aspectosPositivos:e.target.value}))} rows={3}
                placeholder="Logros, fortalezas, actitudes destacadas..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/50 resize-none" />
            </div>
            <div>
              <label className="text-xs text-orange-400 mb-1 block font-semibold">⚠ Áreas de mejora</label>
              <textarea value={form.areasMejora} onChange={e=>setForm(p=>({...p,areasMejora:e.target.value}))} rows={3}
                placeholder="Qué debe mejorar, habilidades a desarrollar..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50 resize-none" />
            </div>
            <div>
              <label className="text-xs text-red-400 mb-1 block font-semibold">⛔ Incidentes / Negligencias</label>
              <textarea value={form.incidentesNota} onChange={e=>setForm(p=>({...p,incidentesNota:e.target.value}))} rows={2}
                placeholder="Situaciones que requieren atención..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-semibold">Observaciones generales</label>
              <textarea value={form.observaciones} onChange={e=>setForm(p=>({...p,observaciones:e.target.value}))} rows={2}
                placeholder="Notas adicionales..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={save} disabled={saving||!form.personalId||!form.periodo}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving?"Guardando...":"Guardar evaluación"}
            </button>
            <button onClick={()=>{setShowForm(false);setForm(EMPTY_FORM());}} className="text-gray-500 hover:text-white text-sm px-3">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {evaluaciones.length === 0 ? (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-14 text-center">
            <p className="text-gray-500 text-sm">Sin evaluaciones registradas</p>
          </div>
        ) : evaluaciones.map(e => (
          <div key={e.id} className="bg-[#111] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-xl p-5 transition-colors cursor-pointer"
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
