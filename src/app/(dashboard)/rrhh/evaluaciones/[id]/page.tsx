"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";

interface Evaluacion {
  id: string; personalId: string; periodo: string; evaluador: string | null; fecha: string;
  puntajeTotal: number | null; estado: string;
  puntualidad: number; ordenLimpieza: number; actitud: number; comunicacion: number;
  resolucionProb: number; propuestasMejora: number; calidadTrabajo: number; trabajoEquipo: number;
  aspectosPositivos: string | null; areasMejora: string | null; incidentesNota: string | null; observaciones: string | null;
  personal: { id: string; nombre: string; puesto: string; departamento: string; };
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
function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
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
    await fetch(`/api/rrhh/evaluaciones/${id}`, { method: "DELETE" });
    toast.success("Evaluación eliminada");
    router.push("/rrhh/evaluaciones");
  }

  if (loading) return <SkeletonPage rows={4} cols={3} />;
  if (!evaluacion) return <div className="p-6 text-gray-600 text-sm">Evaluación no encontrada.</div>;

  const e = evaluacion;
  const fecha = new Date(e.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <button onClick={() => router.push("/rrhh/evaluaciones")} className="text-gray-600 hover:text-white text-xs mb-2 transition-colors">← Evaluaciones</button>
          <h1 className="text-xl font-semibold text-white">{e.personal.nombre}</h1>
          <p className="text-[#6b7280] text-sm">{e.personal.puesto} · {e.personal.departamento}</p>
        </div>
        <div className="text-right">
          {e.puntajeTotal != null && (
            <p className={`text-4xl font-bold ${scoreColor(e.puntajeTotal)}`}>{e.puntajeTotal.toFixed(1)}</p>
          )}
          <p className="text-gray-600 text-xs">/5.0</p>
          {e.estado === "COMPLETADA" && <span className="text-[10px] text-green-400 bg-green-900/20 px-2 py-0.5 rounded">Completada</span>}
        </div>
      </div>

      {/* Info */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
        <div className="flex flex-wrap gap-4 text-sm">
          <div><p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">Período</p><p className="text-[#B3985B] font-semibold">{e.periodo}</p></div>
          <div><p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">Fecha</p><p className="text-white">{fecha}</p></div>
          {e.evaluador && <div><p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">Evaluador</p><p className="text-white">{e.evaluador}</p></div>}
        </div>
      </div>

      {/* Métricas */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Calificaciones</p>
        {METRICAS.map(m => (
          <ScoreRow key={m.key} label={m.label} value={e[m.key as MetricaKey]} />
        ))}
        {e.puntajeTotal != null && (
          <div className="pt-3 border-t border-[#1a1a1a] flex items-center justify-between">
            <span className="text-gray-400 text-sm font-semibold">Puntaje total</span>
            <span className={`text-2xl font-bold ${scoreColor(e.puntajeTotal)}`}>{e.puntajeTotal.toFixed(2)} / 5.00</span>
          </div>
        )}
      </div>

      {/* Texto */}
      {(e.aspectosPositivos || e.areasMejora || e.incidentesNota || e.observaciones) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {e.aspectosPositivos && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
              <p className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-2">+ Aspectos positivos</p>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{e.aspectosPositivos}</p>
            </div>
          )}
          {e.areasMejora && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
              <p className="text-xs text-orange-400 font-semibold uppercase tracking-wider mb-2">Áreas de mejora</p>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{e.areasMejora}</p>
            </div>
          )}
          {e.incidentesNota && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
              <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-2">Incidentes / Negligencias</p>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{e.incidentesNota}</p>
            </div>
          )}
          {e.observaciones && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
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
