"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";

type PersonalOption = { id: string; nombre: string; puesto: string; departamento: string; tipo: string };

type Encuesta = {
  id: string;
  periodo: string;
  token: string;
  enviada: boolean;
  respondida: boolean;
  respondidaEn?: string | null;
  promedioCalculado?: number | null;
  probabilidadRecomendar?: number | null;
  loMejor?: string | null;
  loMejorable?: string | null;
  personal: { id: string; nombre: string; puesto: string; departamento: string; tipo: string };
};

const DEPT_LABEL: Record<string, string> = {
  BODEGA: "Bodega", COORDINACION: "Coordinación", PRODUCCION: "Producción",
  ADMINISTRACION: "Administración", VENTAS: "Ventas", GENERAL: "General",
};

function periodoActual() {
  const d = new Date();
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q}-${d.getFullYear()}`;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? "text-green-400 bg-green-900/20 border-green-900/40"
    : score >= 6 ? "text-yellow-400 bg-yellow-900/20 border-yellow-900/40"
    : "text-red-400 bg-red-900/20 border-red-900/40";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

export default function SatisfaccionPage() {
  const toast = useToast();
  const [periodo, setPeriodo] = useState(periodoActual);
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [personal, setPersonal] = useState<PersonalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/rrhh/encuestas-satisfaccion?periodo=${encodeURIComponent(periodo)}`);
    const d = await r.json();
    setEncuestas(d.encuestas ?? []);
    setLoading(false);
  }, [periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    fetch("/api/rrhh/personal").then(r => r.json()).then(d =>
      setPersonal((d.personal ?? []).filter((p: PersonalOption & { activo?: boolean }) => p.activo !== false))
    );
  }, []);

  const crearEncuestas = async () => {
    setCreating(true);
    let ok = 0;
    for (const id of selectedIds) {
      const r = await fetch("/api/rrhh/encuestas-satisfaccion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalId: id, periodo }),
      });
      if (r.ok) ok++;
    }
    toast.success(`${ok} encuesta(s) creada(s)`);
    setShowNew(false);
    setSelectedIds([]);
    await cargar();
    setCreating(false);
  };

  const copiarLink = (token: string) => {
    const url = `${window.location.origin}/satisfaccion/${token}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copiado al portapapeles"));
  };

  const eliminar = async (id: string) => {
    const r = await fetch(`/api/rrhh/encuestas-satisfaccion?id=${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Eliminada"); await cargar(); }
  };

  const respondidas = encuestas.filter(e => e.respondida);
  const pendientes = encuestas.filter(e => !e.respondida);
  const promedioGlobal = respondidas.length > 0 && respondidas.some(e => e.promedioCalculado != null)
    ? respondidas.filter(e => e.promedioCalculado != null).reduce((s, e) => s + (e.promedioCalculado ?? 0), 0) / respondidas.filter(e => e.promedioCalculado != null).length
    : null;

  // Personal sin encuesta en este período
  const idsConEncuesta = new Set(encuestas.map(e => e.personal.id));
  const personalSinEncuesta = personal.filter(p => !idsConEncuesta.has(p.id));

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">RR.HH. · Satisfacción</p>
          <h1 className="text-white text-2xl font-bold">Encuestas de Satisfacción</h1>
          <p className="text-[#555] text-sm mt-1">Pulso del equipo por período</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="shrink-0 bg-[#B3985B] hover:bg-[#c9aa6a] text-black text-sm font-semibold px-4 py-2 rounded-xl mt-1 transition-all"
        >
          + Crear encuestas
        </button>
      </div>

      {/* Selector período */}
      <div className="flex items-center gap-3 bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
        <label className="text-[#555] text-xs uppercase tracking-wider font-bold">Período</label>
        <input
          type="text"
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
          placeholder="Q1-2026"
          className="flex-1 bg-transparent text-white text-sm focus:outline-none"
        />
        {promedioGlobal != null && <ScoreBadge score={promedioGlobal} />}
        <span className="text-[#444] text-xs">{respondidas.length}/{encuestas.length} respondidas</span>
      </div>

      {/* Stats */}
      {respondidas.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${promedioGlobal != null && promedioGlobal >= 8 ? "text-green-400" : promedioGlobal != null && promedioGlobal >= 6 ? "text-yellow-400" : "text-red-400"}`}>
              {promedioGlobal?.toFixed(1) ?? "—"}
            </p>
            <p className="text-[#555] text-[11px] mt-0.5 uppercase tracking-wider">Promedio</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{respondidas.length}/{encuestas.length}</p>
            <p className="text-[#555] text-[11px] mt-0.5 uppercase tracking-wider">Respondidas</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 text-center">
            {(() => {
              const nps = respondidas.filter(e => e.probabilidadRecomendar != null);
              const avg = nps.length > 0 ? nps.reduce((s, e) => s + (e.probabilidadRecomendar ?? 0), 0) / nps.length : null;
              return (
                <>
                  <p className={`text-2xl font-bold ${avg != null && avg >= 8 ? "text-green-400" : avg != null && avg >= 6 ? "text-yellow-400" : "text-[#555]"}`}>
                    {avg?.toFixed(1) ?? "—"}
                  </p>
                  <p className="text-[#555] text-[11px] mt-0.5 uppercase tracking-wider">NPS promedio</p>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-[#444] text-sm">Cargando...</div>
      ) : encuestas.length === 0 ? (
        <div className="text-center py-12 text-[#444]">
          <p className="text-sm mb-2">Sin encuestas para el período {periodo}</p>
          <button onClick={() => setShowNew(true)} className="text-[#B3985B] text-xs hover:underline">Crear encuestas →</button>
        </div>
      ) : (
        <div className="space-y-2">
          {encuestas.map(e => (
            <div key={e.id} className={`bg-[#111] border rounded-xl overflow-hidden transition-all ${e.respondida ? "border-[#1e1e1e]" : "border-[#B3985B]/15"}`}>
              <div
                className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-[#141414]"
                onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${e.respondida ? "bg-green-500" : "bg-yellow-400"}`} />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{e.personal.nombre}</p>
                    <p className="text-[#555] text-xs">{e.personal.puesto} · {DEPT_LABEL[e.personal.departamento] ?? e.personal.departamento}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {e.respondida && e.promedioCalculado != null && <ScoreBadge score={e.promedioCalculado} />}
                  {!e.respondida && (
                    <button onClick={ev => { ev.stopPropagation(); copiarLink(e.token); }}
                      className="text-[10px] text-[#B3985B] hover:underline">
                      Copiar link
                    </button>
                  )}
                  <span className={`text-[10px] font-bold ${e.respondida ? "text-green-500" : "text-yellow-500"}`}>
                    {e.respondida ? "Respondida" : "Pendiente"}
                  </span>
                </div>
              </div>

              {/* Detalle expandido */}
              {expandedId === e.id && e.respondida && (
                <div className="px-4 pb-4 border-t border-[#1a1a1a] pt-3 space-y-3">
                  {e.loMejor && (
                    <div>
                      <p className="text-[10px] text-[#555] font-bold uppercase tracking-wider mb-1">Lo que más valora</p>
                      <p className="text-gray-300 text-sm">{e.loMejor}</p>
                    </div>
                  )}
                  {e.loMejorable && (
                    <div>
                      <p className="text-[10px] text-[#555] font-bold uppercase tracking-wider mb-1">Lo que cambiaría</p>
                      <p className="text-gray-300 text-sm">{e.loMejorable}</p>
                    </div>
                  )}
                  {e.respondidaEn && (
                    <p className="text-[#444] text-xs">
                      Respondida el {new Date(e.respondidaEn).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                  <button onClick={() => eliminar(e.id)} className="text-[10px] text-[#333] hover:text-red-400">Eliminar</button>
                </div>
              )}
              {expandedId === e.id && !e.respondida && (
                <div className="px-4 pb-4 border-t border-[#1a1a1a] pt-3 space-y-2">
                  <p className="text-[#555] text-xs break-all">
                    Link: {typeof window !== "undefined" ? `${window.location.origin}/satisfaccion/${e.token}` : `/satisfaccion/${e.token}`}
                  </p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => copiarLink(e.token)} className="text-[10px] text-[#B3985B] hover:underline">Copiar link</button>
                    <button onClick={() => eliminar(e.id)} className="text-[10px] text-[#333] hover:text-red-400">Eliminar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
              <h2 className="text-white font-bold">Crear encuestas — {periodo}</h2>
              <button onClick={() => setShowNew(false)} className="text-[#555] hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[#555] text-xs">{personalSinEncuesta.length} personas sin encuesta en este período</p>
                <button
                  onClick={() => setSelectedIds(personalSinEncuesta.map(p => p.id))}
                  className="text-[10px] text-[#B3985B] hover:underline"
                >
                  Seleccionar todos
                </button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {personalSinEncuesta.map(p => (
                  <label key={p.id} className="flex items-center gap-3 p-3 bg-[#0d0d0d] rounded-xl cursor-pointer hover:bg-[#141414]">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                      className="w-4 h-4 accent-[#B3985B]"
                    />
                    <div className="min-w-0">
                      <p className="text-white text-sm">{p.nombre}</p>
                      <p className="text-[#555] text-xs">{p.puesto} · {DEPT_LABEL[p.departamento] ?? p.departamento}</p>
                    </div>
                  </label>
                ))}
                {personalSinEncuesta.length === 0 && (
                  <p className="text-center text-[#444] text-sm py-4">Todo el personal ya tiene encuesta en este período</p>
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#1e1e1e] flex items-center justify-end gap-3">
              <button onClick={() => setShowNew(false)} className="text-[#555] text-sm">Cancelar</button>
              <button
                onClick={crearEncuestas}
                disabled={creating || selectedIds.length === 0}
                className="bg-[#B3985B] hover:bg-[#c9aa6a] disabled:opacity-40 text-black text-sm font-semibold px-5 py-2 rounded-xl"
              >
                {creating ? "Creando..." : `Crear ${selectedIds.length} encuesta(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
