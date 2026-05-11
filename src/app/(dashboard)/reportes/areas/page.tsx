"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";

const AREAS = ["VENTAS", "PRODUCCION", "MARKETING", "ADMINISTRACION", "RRHH"] as const;
type Area = typeof AREAS[number];

const AREA_LABEL: Record<string, string> = {
  VENTAS: "Ventas", PRODUCCION: "Producción", MARKETING: "Marketing",
  ADMINISTRACION: "Administración", RRHH: "RR.HH.", DIRECCION: "Dirección", GENERAL: "General",
};

type KPI = { nombre: string; valor: string; meta?: string; unidad?: string };

type Reporte = {
  id: string;
  area: string;
  semana: string;
  resultados: string;
  kpis: string;
  compromisos: string;
  bloqueo: string | null;
  revisado: boolean;
  autor: { id: string; name: string; area: string | null };
  updatedAt?: string;
};

// Lunes de la semana actual
function getLunes(offset = 0): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day) + offset * 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function formatSemana(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const lunes = new Date(y, m - 1, d);
  const domingo = new Date(y, m - 1, d + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${lunes.toLocaleDateString("es-MX", opts)} – ${domingo.toLocaleDateString("es-MX", opts)}, ${y}`;
}

function EmptySlot({ area, onFill }: { area: string; onFill: () => void }) {
  return (
    <div className="bg-[#0d0d0d] border border-dashed border-[#222] rounded-xl p-5 flex items-center justify-between gap-3">
      <div>
        <p className="text-[#444] text-sm font-semibold">{AREA_LABEL[area]}</p>
        <p className="text-[#333] text-xs mt-0.5">Sin reporte esta semana</p>
      </div>
      <button onClick={onFill} className="text-[10px] text-[#B3985B] hover:underline shrink-0">Llenar →</button>
    </div>
  );
}

function ReporteCard({ reporte, isDirector, onMarkRevisado }: {
  reporte: Reporte;
  isDirector: boolean;
  onMarkRevisado: (id: string) => void;
}) {
  let kpis: KPI[] = [];
  try { kpis = JSON.parse(reporte.kpis); } catch { kpis = []; }

  return (
    <div className={`bg-[#111] border rounded-xl overflow-hidden transition-all ${
      reporte.revisado ? "border-[#1e1e1e]" : reporte.bloqueo ? "border-red-900/50" : "border-[#B3985B]/20"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <p className="text-white text-sm font-semibold">{AREA_LABEL[reporte.area]}</p>
          {reporte.bloqueo && (
            <span className="text-[10px] bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full font-bold">BLOQUEO</span>
          )}
          {reporte.revisado && (
            <span className="text-[10px] bg-green-900/30 text-green-500 px-2 py-0.5 rounded-full">Revisado</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <p className="text-[#444] text-[11px]">{reporte.autor.name}</p>
          {isDirector && !reporte.revisado && (
            <button
              onClick={() => onMarkRevisado(reporte.id)}
              className="text-[10px] text-[#B3985B] hover:underline"
            >
              Marcar revisado
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Bloqueo primero si existe */}
        {reporte.bloqueo && (
          <div className="bg-red-950/30 border border-red-900/40 rounded-lg p-3">
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Bloqueo / Necesita dirección</p>
            <p className="text-red-200 text-sm leading-relaxed whitespace-pre-wrap">{reporte.bloqueo}</p>
          </div>
        )}

        {/* Resultados */}
        {reporte.resultados && (
          <div>
            <p className="text-[10px] font-bold text-[#555] uppercase tracking-wider mb-1.5">Resultados de la semana</p>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{reporte.resultados}</p>
          </div>
        )}

        {/* KPIs */}
        {kpis.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-[#555] uppercase tracking-wider mb-2">KPIs</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {kpis.map((k, i) => (
                <div key={i} className="bg-[#0d0d0d] rounded-lg p-3">
                  <p className="text-[10px] text-[#555] mb-0.5 truncate">{k.nombre}</p>
                  <p className="text-white text-lg font-bold leading-none">
                    {k.valor}{k.unidad ? <span className="text-xs text-[#555] ml-1">{k.unidad}</span> : null}
                  </p>
                  {k.meta && <p className="text-[10px] text-[#444] mt-0.5">Meta: {k.meta}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compromisos */}
        {reporte.compromisos && (
          <div>
            <p className="text-[10px] font-bold text-[#555] uppercase tracking-wider mb-1.5">Compromisos para la próxima semana</p>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{reporte.compromisos}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Formulario para llenar reporte ─────────────────────────────────────────

function KPIRow({ kpi, onChange, onRemove }: {
  kpi: KPI;
  onChange: (k: KPI) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        placeholder="Nombre del KPI"
        value={kpi.nombre}
        onChange={e => onChange({ ...kpi, nombre: e.target.value })}
        className="flex-1 min-w-[120px] bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50"
      />
      <input
        placeholder="Valor"
        value={kpi.valor}
        onChange={e => onChange({ ...kpi, valor: e.target.value })}
        className="w-24 bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50"
      />
      <input
        placeholder="Meta"
        value={kpi.meta ?? ""}
        onChange={e => onChange({ ...kpi, meta: e.target.value || undefined })}
        className="w-24 bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50"
      />
      <input
        placeholder="Unidad"
        value={kpi.unidad ?? ""}
        onChange={e => onChange({ ...kpi, unidad: e.target.value || undefined })}
        className="w-20 bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50"
      />
      <button onClick={onRemove} className="text-[#444] hover:text-red-400 text-sm px-1">✕</button>
    </div>
  );
}

export default function ReportesAreasPage() {
  const toast = useToast();
  const [semana, setSemana] = useState(getLunes(0));
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [esDirector, setEsDirector] = useState(false);
  const [miArea, setMiArea] = useState<string | null>(null);

  // Formulario
  const [showForm, setShowForm] = useState(false);
  const [formArea, setFormArea] = useState<string>("");
  const [formResultados, setFormResultados] = useState("");
  const [formKpis, setFormKpis] = useState<KPI[]>([]);
  const [formCompromisos, setFormCompromisos] = useState("");
  const [formBloqueo, setFormBloqueo] = useState("");
  const [saving, setSaving] = useState(false);

  // Cargar sesión y reportes
  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(d => {
      const area = d?.area ?? null;
      const role = d?.role ?? "USER";
      setMiArea(area);
      setEsDirector(role === "ADMIN" || area === "DIRECCION");
    }).catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/reportes/areas?semana=${semana}`);
    const d = await r.json();
    setReportes(d.reportes ?? []);
    setLoading(false);
  }, [semana]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirForm = (area?: string) => {
    const a = area ?? miArea ?? "";
    const existente = reportes.find(r => r.area === a);
    setFormArea(a);
    setFormResultados(existente?.resultados ?? "");
    try { setFormKpis(JSON.parse(existente?.kpis ?? "[]")); } catch { setFormKpis([]); }
    setFormCompromisos(existente?.compromisos ?? "");
    setFormBloqueo(existente?.bloqueo ?? "");
    setShowForm(true);
  };

  const guardar = async () => {
    setSaving(true);
    const r = await fetch("/api/reportes/areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        semana,
        resultados: formResultados,
        kpis: formKpis,
        compromisos: formCompromisos,
        bloqueo: formBloqueo || null,
      }),
    });
    if (r.ok) {
      toast.success("Reporte guardado");
      setShowForm(false);
      await cargar();
    } else {
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const marcarRevisado = async (id: string) => {
    const r = await fetch(`/api/reportes/areas?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revisado: true }),
    });
    if (r.ok) {
      toast.success("Marcado como revisado");
      await cargar();
    }
  };

  const areasConReporte = new Set(reportes.map(r => r.area));
  const areasVisibles = esDirector ? AREAS : (miArea ? [miArea] : []);

  const cambiarSemana = (delta: number) => {
    const [y, m, d] = semana.split("-").map(Number);
    const base = new Date(y, m - 1, d);
    base.setDate(base.getDate() + delta * 7);
    setSemana(base.toISOString().slice(0, 10));
  };

  const bloqueados = reportes.filter(r => r.bloqueo);
  const noRevisados = reportes.filter(r => !r.revisado);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Reportes · Áreas</p>
          <h1 className="text-white text-2xl font-bold">Reportes Semanales de Área</h1>
          <p className="text-[#555] text-sm mt-1">
            {esDirector ? "Vista consolidada de todas las áreas" : `Tu reporte de ${AREA_LABEL[miArea ?? ""] ?? miArea}`}
          </p>
        </div>
        {!esDirector && miArea && (
          <button
            onClick={() => abrirForm()}
            className="shrink-0 bg-[#B3985B] hover:bg-[#c9aa6a] active:scale-95 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-all mt-1"
          >
            {areasConReporte.has(miArea) ? "Editar reporte" : "+ Llenar reporte"}
          </button>
        )}
      </div>

      {/* Selector de semana */}
      <div className="flex items-center gap-3 bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
        <button onClick={() => cambiarSemana(-1)} className="text-[#555] hover:text-white transition-colors text-lg">‹</button>
        <div className="flex-1 text-center">
          <p className="text-white text-sm font-semibold">{formatSemana(semana)}</p>
          <p className="text-[#444] text-[11px]">Semana del {semana}</p>
        </div>
        <button onClick={() => cambiarSemana(1)} className="text-[#555] hover:text-white transition-colors text-lg">›</button>
        <button
          onClick={() => setSemana(getLunes(0))}
          className="text-[10px] text-[#555] hover:text-[#B3985B] transition-colors ml-2"
        >
          Hoy
        </button>
      </div>

      {/* Alertas director */}
      {esDirector && bloqueados.length > 0 && (
        <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-4">
          <p className="text-red-400 text-sm font-bold mb-1">
            {bloqueados.length} área{bloqueados.length > 1 ? "s" : ""} con bloqueo
          </p>
          <p className="text-red-300/70 text-xs">
            {bloqueados.map(r => AREA_LABEL[r.area]).join(", ")} requieren atención de dirección.
          </p>
        </div>
      )}

      {esDirector && noRevisados.length > 0 && !loading && (
        <div className="flex items-center gap-2 text-xs text-[#555]">
          <span className="w-2 h-2 rounded-full bg-[#B3985B]" />
          {noRevisados.length} reporte{noRevisados.length > 1 ? "s" : ""} sin revisar esta semana
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="text-center py-16 text-[#444] text-sm">Cargando reportes...</div>
      ) : (
        <div className="space-y-4">
          {areasVisibles.map(area => {
            const reporte = reportes.find(r => r.area === area);
            if (reporte) {
              return (
                <div key={area}>
                  <ReporteCard
                    reporte={reporte}
                    isDirector={esDirector}
                    onMarkRevisado={marcarRevisado}
                  />
                  {(!esDirector && miArea === area) && (
                    <button
                      onClick={() => abrirForm(area)}
                      className="text-[10px] text-[#555] hover:text-[#B3985B] mt-2 ml-1"
                    >
                      Editar reporte →
                    </button>
                  )}
                </div>
              );
            }
            return (
              <EmptySlot
                key={area}
                area={area}
                onFill={() => abrirForm(area)}
              />
            );
          })}

          {areasVisibles.length === 0 && (
            <div className="text-center py-12 text-[#444] text-sm">
              Tu usuario no tiene área asignada. Contacta al administrador.
            </div>
          )}
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div
            className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
              <h2 className="text-white font-bold">
                Reporte semanal · {AREA_LABEL[formArea] ?? formArea}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-[#555] hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Semana info */}
              <p className="text-[#555] text-xs">Semana: {formatSemana(semana)}</p>

              {/* Resultados */}
              <div>
                <label className="block text-[11px] font-bold text-[#555] uppercase tracking-wider mb-2">
                  Resultados de la semana *
                </label>
                <textarea
                  value={formResultados}
                  onChange={e => setFormResultados(e.target.value)}
                  placeholder="¿Qué logramos esta semana? Eventos realizados, ventas cerradas, campañas lanzadas, pagos procesados..."
                  rows={4}
                  className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50 resize-none"
                />
              </div>

              {/* KPIs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold text-[#555] uppercase tracking-wider">KPIs</label>
                  <button
                    onClick={() => setFormKpis(prev => [...prev, { nombre: "", valor: "" }])}
                    className="text-[10px] text-[#B3985B] hover:underline"
                  >
                    + Agregar KPI
                  </button>
                </div>
                {formKpis.length === 0 ? (
                  <p className="text-[#333] text-xs">Sin KPIs — agrega métricas clave de tu área esta semana.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2 text-[10px] text-[#444] px-0.5">
                      <span>Nombre</span><span>Valor</span><span>Meta</span><span>Unidad</span>
                    </div>
                    {formKpis.map((k, i) => (
                      <KPIRow
                        key={i}
                        kpi={k}
                        onChange={updated => setFormKpis(prev => prev.map((x, j) => j === i ? updated : x))}
                        onRemove={() => setFormKpis(prev => prev.filter((_, j) => j !== i))}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Compromisos */}
              <div>
                <label className="block text-[11px] font-bold text-[#555] uppercase tracking-wider mb-2">
                  Compromisos para la próxima semana *
                </label>
                <textarea
                  value={formCompromisos}
                  onChange={e => setFormCompromisos(e.target.value)}
                  placeholder="¿Qué nos comprometemos a entregar/lograr la próxima semana?"
                  rows={3}
                  className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50 resize-none"
                />
              </div>

              {/* Bloqueo */}
              <div>
                <label className="block text-[11px] font-bold text-[#555] uppercase tracking-wider mb-2">
                  Bloqueo / Necesito apoyo de dirección
                  <span className="ml-2 text-[#333] font-normal normal-case">(opcional)</span>
                </label>
                <textarea
                  value={formBloqueo}
                  onChange={e => setFormBloqueo(e.target.value)}
                  placeholder="¿Hay algo que nos está bloqueando y que requiere decisión o apoyo de dirección?"
                  rows={2}
                  className="w-full bg-red-950/10 border border-[#222] focus:border-red-900/50 rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#1e1e1e] flex items-center justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="text-[#555] hover:text-white text-sm px-4 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={saving || !formResultados.trim() || !formCompromisos.trim()}
                className="bg-[#B3985B] hover:bg-[#c9aa6a] disabled:opacity-40 text-black text-sm font-semibold px-6 py-2 rounded-xl transition-all"
              >
                {saving ? "Guardando..." : "Guardar reporte"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
