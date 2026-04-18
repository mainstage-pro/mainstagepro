"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/Confirm";

interface MetaResultado {
  id: string;
  fecha: string;
  impresiones: number;
  alcance: number;
  clics: number;
  leads: number;
  gastado: number;
  cpm: number | null;
  cpc: number | null;
  cpl: number | null;
  frecuencia: number | null;
  notas: string | null;
}

interface MetaCampana {
  id: string;
  nombre: string;
  objetivo: string;
  estado: string;
  presupuesto: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  audiencia: string | null;
  ubicaciones: string | null;
  notas: string | null;
  createdAt: string;
  resultados: MetaResultado[];
  anuncios: Array<{ id: string; nombre: string; formato: string; estado: string }>;
}

const OBJETIVO_LABELS: Record<string, string> = {
  LEADS: "Generación de leads", AWARENESS: "Reconocimiento de marca",
  CONVERSIONES: "Conversiones", TRAFICO: "Tráfico al sitio",
};
const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-700 text-gray-300", ACTIVA: "bg-green-900/50 text-green-300",
  PAUSADA: "bg-yellow-900/50 text-yellow-300", FINALIZADA: "bg-gray-800 text-gray-500",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtN(n: number) {
  return new Intl.NumberFormat("es-MX").format(n);
}

const EMPTY_CAMPANA = {
  nombre: "", objetivo: "LEADS", estado: "BORRADOR", presupuesto: "",
  fechaInicio: "", fechaFin: "", audiencia: "", ubicaciones: "", notas: "",
};
const EMPTY_RESULTADO = {
  fecha: new Date().toISOString().split("T")[0],
  impresiones: "", alcance: "", clics: "", leads: "", gastado: "", notas: "",
};

export default function MetaAdsPage() {
  const confirm = useConfirm();
  const [campanas, setCampanas] = useState<MetaCampana[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MetaCampana | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_CAMPANA);
  const [saving, setSaving] = useState(false);
  const [showResultForm, setShowResultForm] = useState(false);
  const [resultForm, setResultForm] = useState(EMPTY_RESULTADO);
  const [savingResult, setSavingResult] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/meta-ads/campanas").then(r => r.json()).then(d => {
      setCampanas(d.campanas || []);
      setLoading(false);
    });
  }, []);

  async function crearCampana() {
    setSaving(true);
    const res = await fetch("/api/meta-ads/campanas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, presupuesto: parseFloat(form.presupuesto) || 0 }),
    });
    const d = await res.json();
    if (res.ok) {
      const nueva = { ...d.campana, resultados: [], anuncios: [] };
      setCampanas(p => [nueva, ...p]);
      setSelected(nueva);
      setShowNew(false);
      setForm(EMPTY_CAMPANA);
    }
    setSaving(false);
  }

  async function guardarEstado(campanaId: string, estado: string) {
    await fetch(`/api/meta-ads/campanas/${campanaId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    const updated = campanas.map(c => c.id === campanaId ? { ...c, estado } : c);
    setCampanas(updated);
    if (selected?.id === campanaId) setSelected(s => s ? { ...s, estado } : s);
  }

  async function eliminarCampana(campanaId: string) {
    if (!await confirm({ message: "¿Eliminar esta campaña y todos sus resultados?", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/meta-ads/campanas/${campanaId}`, { method: "DELETE" });
    setCampanas(p => p.filter(c => c.id !== campanaId));
    if (selected?.id === campanaId) setSelected(null);
  }

  async function agregarResultado() {
    if (!selected) return;
    setSavingResult(true);
    const res = await fetch(`/api/meta-ads/campanas/${selected.id}/resultados`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resultForm),
    });
    const d = await res.json();
    if (res.ok) {
      const updatedSelected = { ...selected, resultados: [...selected.resultados, d.resultado] };
      setSelected(updatedSelected);
      setCampanas(p => p.map(c => c.id === selected.id ? updatedSelected : c));
      setResultForm(EMPTY_RESULTADO);
      setShowResultForm(false);
    }
    setSavingResult(false);
  }

  async function eliminarResultado(resultadoId: string) {
    if (!selected) return;
    await fetch(`/api/meta-ads/campanas/${selected.id}/resultados`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultadoId }),
    });
    const updatedSelected = { ...selected, resultados: selected.resultados.filter(r => r.id !== resultadoId) };
    setSelected(updatedSelected);
    setCampanas(p => p.map(c => c.id === selected.id ? updatedSelected : c));
  }

  // Métricas acumuladas de una campaña
  function metricas(c: MetaCampana) {
    const r = c.resultados;
    const gastado = r.reduce((a, b) => a + b.gastado, 0);
    const leads = r.reduce((a, b) => a + b.leads, 0);
    const clics = r.reduce((a, b) => a + b.clics, 0);
    const alcance = r.reduce((a, b) => a + b.alcance, 0);
    const impresiones = r.reduce((a, b) => a + b.impresiones, 0);
    return {
      gastado, leads, clics, alcance, impresiones,
      cpl: leads > 0 ? gastado / leads : null,
      cpc: clics > 0 ? gastado / clics : null,
      cpm: impresiones > 0 ? (gastado / impresiones) * 1000 : null,
      presupuestoUsado: c.presupuesto > 0 ? (gastado / c.presupuesto) * 100 : null,
    };
  }

  if (loading) return <div className="text-gray-400 text-sm p-6">Cargando...</div>;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Panel izquierdo: lista de campañas ── */}
      <div className="w-80 shrink-0 border-r border-[#1a1a1a] flex flex-col bg-[#060606]">
        <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
          <div>
            <h1 className="text-white font-semibold">Meta Ads</h1>
            <p className="text-gray-600 text-xs">{campanas.length} campaña{campanas.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            + Nueva
          </button>
        </div>

        {/* Stats globales */}
        {campanas.length > 0 && (() => {
          const total = campanas.reduce((acc, c) => {
            const m = metricas(c);
            return { gastado: acc.gastado + m.gastado, leads: acc.leads + m.leads };
          }, { gastado: 0, leads: 0 });
          return (
            <div className="grid grid-cols-2 gap-px border-b border-[#1a1a1a] bg-[#1a1a1a]">
              <div className="bg-[#060606] p-3">
                <p className="text-gray-600 text-[10px] uppercase tracking-wide">Inversión total</p>
                <p className="text-white text-sm font-semibold">{fmt(total.gastado)}</p>
              </div>
              <div className="bg-[#060606] p-3">
                <p className="text-gray-600 text-[10px] uppercase tracking-wide">Leads totales</p>
                <p className="text-white text-sm font-semibold">{total.leads}</p>
                {total.leads > 0 && <p className="text-gray-500 text-[10px]">CPL: {fmt(total.gastado / total.leads)}</p>}
              </div>
            </div>
          );
        })()}

        <div className="flex-1 overflow-y-auto divide-y divide-[#111]">
          {campanas.length === 0 && (
            <div className="p-6 text-center text-gray-600 text-sm">Sin campañas todavía</div>
          )}
          {campanas.map(c => {
            const m = metricas(c);
            return (
              <button key={c.id} onClick={() => setSelected(c)}
                className={`w-full text-left px-4 py-3 hover:bg-[#0d0d0d] transition-colors ${selected?.id === c.id ? "bg-[#111] border-l-2 border-[#B3985B]" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white text-sm font-medium truncate">{c.nombre}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-2 shrink-0 ${ESTADO_COLORS[c.estado] || "bg-gray-800 text-gray-400"}`}>{c.estado}</span>
                </div>
                <div className="flex gap-3 text-[10px] text-gray-500">
                  <span>{OBJETIVO_LABELS[c.objetivo] || c.objetivo}</span>
                  {m.gastado > 0 && <span>{fmt(m.gastado)}</span>}
                  {m.leads > 0 && <span>{m.leads} leads</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Panel derecho: detalle ── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!selected && !showNew && (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Selecciona una campaña o crea una nueva
          </div>
        )}

        {/* ── Formulario nueva campaña ── */}
        {showNew && (
          <div className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-4">
            <p className="text-white font-semibold">Nueva campaña</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Nombre de la campaña</label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Verano 2026 — Eventos Musicales"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Objetivo</label>
                <select value={form.objetivo} onChange={e => setForm(p => ({ ...p, objetivo: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                  {Object.entries(OBJETIVO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Presupuesto total ($)</label>
                <input type="number" value={form.presupuesto} onChange={e => setForm(p => ({ ...p, presupuesto: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Fecha de inicio</label>
                <input type="date" value={form.fechaInicio} onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Fecha de fin</label>
                <input type="date" value={form.fechaFin} onChange={e => setForm(p => ({ ...p, fechaFin: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Audiencia / segmentación</label>
                <input value={form.audiencia} onChange={e => setForm(p => ({ ...p, audiencia: e.target.value }))}
                  placeholder="Ej: Hombres/mujeres 25-45, intereses en eventos, Querétaro"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                  rows={2} placeholder="Descripción, objetivos específicos, estrategia..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={crearCampana} disabled={saving || !form.nombre}
                className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-6 py-2 rounded-lg transition-colors">
                {saving ? "Guardando..." : "Crear campaña"}
              </button>
              <button onClick={() => { setShowNew(false); setForm(EMPTY_CAMPANA); }}
                className="text-gray-400 hover:text-white text-sm px-4 py-2 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── Detalle de campaña ── */}
        {selected && (() => {
          const m = metricas(selected);
          return (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-white text-xl font-semibold">{selected.nombre}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[selected.estado]}`}>{selected.estado}</span>
                    <span className="text-gray-500 text-xs">{OBJETIVO_LABELS[selected.objetivo]}</span>
                    {selected.presupuesto > 0 && <span className="text-gray-500 text-xs">Presupuesto: {fmt(selected.presupuesto)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={selected.estado} onChange={e => guardarEstado(selected.id, e.target.value)}
                    className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]">
                    {["BORRADOR", "ACTIVA", "PAUSADA", "FINALIZADA"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => eliminarCampana(selected.id)}
                    className="text-gray-600 hover:text-red-400 text-xs px-2 py-1.5 transition-colors">Eliminar</button>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: "Inversión", value: fmt(m.gastado), sub: m.presupuestoUsado != null ? `${m.presupuestoUsado.toFixed(0)}% del presupuesto` : null },
                  { label: "Leads", value: String(m.leads), sub: m.cpl != null ? `CPL ${fmt(m.cpl)}` : null },
                  { label: "Clics", value: fmtN(m.clics), sub: m.cpc != null ? `CPC ${fmt(m.cpc)}` : null },
                  { label: "Alcance", value: fmtN(m.alcance), sub: m.impresiones > 0 ? `${fmtN(m.impresiones)} imp.` : null },
                  { label: "CPM", value: m.cpm != null ? fmt(m.cpm) : "—", sub: "Costo por mil imp." },
                ].map(k => (
                  <div key={k.label} className="bg-[#111] border border-[#222] rounded-xl p-4">
                    <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-1">{k.label}</p>
                    <p className="text-white text-lg font-semibold">{k.value}</p>
                    {k.sub && <p className="text-gray-600 text-[10px] mt-0.5">{k.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Progreso de presupuesto */}
              {m.presupuestoUsado != null && (
                <div className="bg-[#111] border border-[#222] rounded-xl p-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>Presupuesto utilizado</span>
                    <span>{fmt(m.gastado)} / {fmt(selected.presupuesto)}</span>
                  </div>
                  <div className="w-full bg-[#222] rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${m.presupuestoUsado > 90 ? "bg-red-500" : m.presupuestoUsado > 70 ? "bg-yellow-500" : "bg-[#B3985B]"}`}
                      style={{ width: `${Math.min(100, m.presupuestoUsado)}%` }} />
                  </div>
                </div>
              )}

              {/* Notas de la campaña */}
              {selected.notas && (
                <div className="bg-[#111] border border-[#222] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Notas</p>
                  <p className="text-gray-300 text-sm">{selected.notas}</p>
                </div>
              )}
              {selected.audiencia && (
                <div className="bg-[#111] border border-[#222] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Audiencia</p>
                  <p className="text-gray-300 text-sm">{selected.audiencia}</p>
                </div>
              )}

              {/* Tabla de resultados */}
              <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Resultados por período</p>
                  <button onClick={() => setShowResultForm(!showResultForm)}
                    className="text-xs text-[#B3985B] hover:text-white transition-colors">
                    {showResultForm ? "Cancelar" : "+ Agregar resultado"}
                  </button>
                </div>

                {/* Formulario nuevo resultado */}
                {showResultForm && (
                  <div className="p-4 bg-[#0d0d0d] border-b border-[#1a1a1a]">
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Fecha</label>
                        <input type="date" value={resultForm.fecha} onChange={e => setResultForm(p => ({ ...p, fecha: e.target.value }))}
                          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Gastado ($)</label>
                        <input type="number" value={resultForm.gastado} onChange={e => setResultForm(p => ({ ...p, gastado: e.target.value }))}
                          placeholder="0" className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Leads</label>
                        <input type="number" value={resultForm.leads} onChange={e => setResultForm(p => ({ ...p, leads: e.target.value }))}
                          placeholder="0" className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Clics</label>
                        <input type="number" value={resultForm.clics} onChange={e => setResultForm(p => ({ ...p, clics: e.target.value }))}
                          placeholder="0" className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Alcance</label>
                        <input type="number" value={resultForm.alcance} onChange={e => setResultForm(p => ({ ...p, alcance: e.target.value }))}
                          placeholder="0" className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Impresiones</label>
                        <input type="number" value={resultForm.impresiones} onChange={e => setResultForm(p => ({ ...p, impresiones: e.target.value }))}
                          placeholder="0" className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-gray-500 block mb-1">Notas</label>
                        <input value={resultForm.notas} onChange={e => setResultForm(p => ({ ...p, notas: e.target.value }))}
                          placeholder="Observaciones del período..."
                          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                      </div>
                    </div>
                    <button onClick={agregarResultado} disabled={savingResult}
                      className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors">
                      {savingResult ? "Guardando..." : "Guardar resultado"}
                    </button>
                  </div>
                )}

                {/* Tabla */}
                {selected.resultados.length === 0 ? (
                  <div className="p-6 text-center text-gray-600 text-sm">Sin resultados registrados</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1a1a1a]">
                        {["Fecha", "Gastado", "Leads", "CPL", "Clics", "CPC", "Alcance", "CPM", "Frec.", ""].map(h => (
                          <th key={h} className="text-left text-gray-600 font-medium px-3 py-2 uppercase tracking-wide text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#111]">
                      {selected.resultados.map(r => (
                        <tr key={r.id} className="hover:bg-[#0d0d0d]">
                          <td className="px-3 py-2 text-gray-400">{new Date(r.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</td>
                          <td className="px-3 py-2 text-white font-medium">{fmt(r.gastado)}</td>
                          <td className="px-3 py-2 text-white">{r.leads}</td>
                          <td className="px-3 py-2 text-gray-400">{r.cpl != null ? fmt(r.cpl) : "—"}</td>
                          <td className="px-3 py-2 text-white">{fmtN(r.clics)}</td>
                          <td className="px-3 py-2 text-gray-400">{r.cpc != null ? fmt(r.cpc) : "—"}</td>
                          <td className="px-3 py-2 text-gray-400">{fmtN(r.alcance)}</td>
                          <td className="px-3 py-2 text-gray-400">{r.cpm != null ? fmt(r.cpm) : "—"}</td>
                          <td className="px-3 py-2 text-gray-500">{r.frecuencia != null ? r.frecuencia.toFixed(1) : "—"}</td>
                          <td className="px-3 py-2">
                            <button onClick={() => {
                              if (!editingId) eliminarResultado(r.id);
                            }} className="text-gray-600 hover:text-red-400 transition-colors">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
