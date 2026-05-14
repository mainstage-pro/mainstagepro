"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";

const CRITERIOS = [
  { key: "planeacionPrevia",     label: "Planeación previa",       desc: "¿Qué tan bien se planificó el evento?" },
  { key: "cumplimientoTecnico",  label: "Cumplimiento técnico",    desc: "¿Se montó todo lo que estaba en el rider?" },
  { key: "puntualidad",          label: "Puntualidad",             desc: "¿El equipo llegó y montó a tiempo?" },
  { key: "resolucionOperativa",  label: "Resolución de problemas", desc: "¿Cómo se manejaron los imprevistos?" },
  { key: "desempenoPersonal",    label: "Desempeño del personal",  desc: "¿Cómo respondió el equipo en general?" },
  { key: "comunicacionInterna",  label: "Comunicación interna",    desc: "¿La coordinación entre áreas funcionó?" },
  { key: "comunicacionCliente",  label: "Comunicación con cliente",desc: "¿El cliente estuvo informado y satisfecho?" },
  { key: "usoEquipo",            label: "Uso del equipo",          desc: "¿Los equipos funcionaron correctamente?" },
  { key: "rentabilidadReal",     label: "Rentabilidad real",       desc: "¿Se controló el costo operativo?" },
  { key: "resultadoGeneral",     label: "Resultado general",       desc: "¿Cómo calificarías el evento en general?" },
] as const;

type CriterioKey = typeof CRITERIOS[number]["key"];

type ReporteItem = { area: string; problema: string; causa: string; solucion: string };

function ScoreButton({ value, selected, onClick }: { value: number; selected: boolean; onClick: () => void }) {
  const colors: Record<number, string> = {
    1: "border-red-800/60 hover:bg-red-900/30",
    2: "border-red-700/50 hover:bg-red-900/20",
    3: "border-orange-800/50 hover:bg-orange-900/20",
    4: "border-orange-700/40 hover:bg-orange-900/20",
    5: "border-yellow-800/40 hover:bg-yellow-900/20",
    6: "border-yellow-700/30 hover:bg-yellow-900/20",
    7: "border-lime-800/30 hover:bg-lime-900/20",
    8: "border-green-700/40 hover:bg-green-900/20",
    9: "border-green-600/40 hover:bg-green-900/30",
    10: "border-green-500/50 hover:bg-green-900/30",
  };
  const selColors: Record<number, string> = {
    1: "bg-red-900/60 border-red-700 text-red-300",
    2: "bg-red-900/50 border-red-600 text-red-300",
    3: "bg-orange-900/60 border-orange-700 text-orange-300",
    4: "bg-orange-900/40 border-orange-600 text-orange-300",
    5: "bg-yellow-900/50 border-yellow-600 text-yellow-300",
    6: "bg-yellow-900/40 border-yellow-500 text-yellow-300",
    7: "bg-lime-900/40 border-lime-600 text-lime-300",
    8: "bg-green-900/40 border-green-600 text-green-300",
    9: "bg-green-900/50 border-green-500 text-green-300",
    10: "bg-green-800/60 border-green-400 text-green-200",
  };
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-lg border text-sm font-bold transition-all ${selected ? selColors[value] : `border-[#2a2a2a] text-[#555] ${colors[value]}`}`}
    >
      {value}
    </button>
  );
}

export default function PostEventoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [proyecto, setProyecto] = useState<{
    nombre: string; numeroProyecto: string; fechaEvento: string;
    lugarEvento?: string | null; estado: string;
    cliente: { nombre: string };
  } | null>(null);

  const [scores, setScores] = useState<Record<string, number>>({});
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [notas, setNotas] = useState("");
  const [reporte, setReporte] = useState<ReporteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const [resP, resE] = await Promise.all([
      fetch(`/api/proyectos/${id}`),
      fetch(`/api/proyectos/${id}/evaluacion`),
    ]);
    const dp = await resP.json();
    const de = await resE.json();
    setProyecto(dp.proyecto);
    if (de.evaluacion) {
      const e = de.evaluacion;
      const s: Record<string, number> = {};
      for (const c of CRITERIOS) {
        if (e[c.key] != null) s[c.key] = e[c.key];
      }
      setScores(s);
      setNotas(e.notas ?? "");
      try { setComentarios(e.comentariosCriterios ? JSON.parse(e.comentariosCriterios) : {}); } catch { setComentarios({}); }
      try { setReporte(e.reportePostEvento ? JSON.parse(e.reportePostEvento) : []); } catch { setReporte([]); }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    setSaving(true);
    const r = await fetch(`/api/proyectos/${id}/evaluacion`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...scores,
        notas,
        comentariosCriterios: JSON.stringify(comentarios),
        reportePostEvento: JSON.stringify(reporte),
      }),
    });
    if (r.ok) {
      toast.success("Reporte guardado");
      await cargar();
    } else {
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const addReporte = () => {
    setReporte(prev => [...prev, { area: "", problema: "", causa: "", solucion: "" }]);
  };

  const updateReporte = (i: number, field: keyof ReporteItem, value: string) => {
    setReporte(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const removeReporte = (i: number) => {
    setReporte(prev => prev.filter((_, idx) => idx !== i));
  };

  if (loading) return <div className="p-6 text-center text-[#444] text-sm">Cargando...</div>;
  if (!proyecto) return <div className="p-6 text-center text-[#444]">Proyecto no encontrado</div>;

  const totalScores = Object.values(scores).filter(v => v > 0);
  const promedio = totalScores.length > 0
    ? (totalScores.reduce((a, b) => a + b, 0) / totalScores.length).toFixed(1)
    : null;
  const promedioNum = promedio ? parseFloat(promedio) : 0;
  const promedioColor = promedioNum >= 8 ? "text-green-400" : promedioNum >= 6 ? "text-yellow-400" : promedioNum > 0 ? "text-red-400" : "text-[#555]";

  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.substring(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/proyectos/${id}`} className="text-[#555] hover:text-white text-xs">
              ← {proyecto.numeroProyecto}
            </Link>
            <span className="text-[#333]">/</span>
            <span className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider">Reporte Post-Evento</span>
          </div>
          <h1 className="text-white text-2xl font-bold">{proyecto.nombre}</h1>
          <p className="text-[#555] text-sm mt-0.5">{proyecto.cliente.nombre} · {fmtDate(proyecto.fechaEvento)}</p>
        </div>
        {promedio && (
          <div className="shrink-0 text-center bg-[#111] border border-[#1e1e1e] rounded-xl px-5 py-3">
            <p className={`text-3xl font-bold ${promedioColor}`}>{promedio}</p>
            <p className="text-[#444] text-[10px] mt-0.5">Promedio</p>
          </div>
        )}
      </div>

      {/* Criterios de evaluación */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">EVALUACIÓN · 1–10</p>
          <div className="flex-1 h-px bg-[#1a1a1a]" />
          <p className="text-[11px] text-[#444]">{totalScores.length}/{CRITERIOS.length} criterios</p>
        </div>

        <div className="space-y-5">
          {CRITERIOS.map(c => (
            <div key={c.key} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-white text-sm font-semibold">{c.label}</p>
                  <p className="text-[#555] text-xs mt-0.5">{c.desc}</p>
                </div>
                {scores[c.key] && (
                  <span className={`shrink-0 text-lg font-bold ${
                    scores[c.key] >= 8 ? "text-green-400" : scores[c.key] >= 6 ? "text-yellow-400" : "text-red-400"
                  }`}>{scores[c.key]}</span>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <ScoreButton
                    key={n}
                    value={n}
                    selected={scores[c.key] === n}
                    onClick={() => setScores(prev => ({ ...prev, [c.key]: n }))}
                  />
                ))}
              </div>
              {scores[c.key] != null && scores[c.key] <= 6 && (
                <input
                  value={comentarios[c.key] ?? ""}
                  onChange={e => setComentarios(prev => ({ ...prev, [c.key]: e.target.value }))}
                  placeholder="¿Qué falló exactamente? (opcional)"
                  className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Reporte de incidencias */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">INCIDENCIAS / PROBLEMAS</p>
          <div className="flex-1 h-px bg-[#1a1a1a]" />
          <button onClick={addReporte} className="text-[10px] text-[#B3985B] hover:underline shrink-0">
            + Agregar
          </button>
        </div>

        {reporte.length === 0 ? (
          <div className="bg-[#0d0d0d] border border-dashed border-[#1e1e1e] rounded-xl p-6 text-center">
            <p className="text-[#444] text-sm">Sin incidencias registradas</p>
            <button onClick={addReporte} className="text-[#B3985B] text-xs mt-1 hover:underline">
              Registrar un problema →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reporte.map((item, i) => (
              <div key={i} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[#555] text-xs font-bold uppercase tracking-wider">Incidencia #{i + 1}</p>
                  <button onClick={() => removeReporte(i)} className="text-[#333] hover:text-red-400 text-xs">Eliminar</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#444] mb-1">Área afectada</label>
                    <input value={item.area} onChange={e => updateReporte(i, "area", e.target.value)}
                      placeholder="Técnica, Logística, Personal..."
                      className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#444] mb-1">Problema</label>
                    <input value={item.problema} onChange={e => updateReporte(i, "problema", e.target.value)}
                      placeholder="¿Qué ocurrió?"
                      className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#444] mb-1">Causa raíz</label>
                    <input value={item.causa} onChange={e => updateReporte(i, "causa", e.target.value)}
                      placeholder="¿Por qué ocurrió?"
                      className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#444] mb-1">Solución / prevención</label>
                    <input value={item.solucion} onChange={e => updateReporte(i, "solucion", e.target.value)}
                      placeholder="¿Cómo se resolvió o cómo evitarlo?"
                      className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notas generales */}
      <div>
        <label className="block text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest mb-3">
          NOTAS Y OBSERVACIONES GENERALES
        </label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          placeholder="Observaciones finales del evento: qué funcionó muy bien, qué mejorar para la próxima vez, aprendizajes del equipo..."
          rows={5}
          className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50 resize-none"
        />
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#1a1a1a]">
        <button onClick={() => router.push(`/proyectos/${id}`)} className="text-[#555] hover:text-white text-sm">
          ← Volver al proyecto
        </button>
        <button
          onClick={guardar}
          disabled={saving}
          className="bg-[#B3985B] hover:bg-[#c9aa6a] disabled:opacity-40 text-black text-sm font-semibold px-6 py-2.5 rounded-xl transition-all"
        >
          {saving ? "Guardando..." : "Guardar reporte"}
        </button>
      </div>

    </div>
  );
}
