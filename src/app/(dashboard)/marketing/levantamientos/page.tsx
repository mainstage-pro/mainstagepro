"use client";
import { useEffect, useState, useCallback } from "react";

const GOLD = "#B3985B";
const PLANES: Record<string, { label: string; color: string }> = {
  BASICO:   { label: "Básico",   color: "#6b7280" },
  ESTANDAR: { label: "Estándar", color: "#3b82f6" },
  PLUS:     { label: "Plus",     color: "#8b5cf6" },
  INTEGRAL: { label: "Integral", color: "#B3985B" },
  OTRO:     { label: "Otro",     color: "#9ca3af" },
};
const TIPOS_ACTIVO = ["FOTO", "VIDEO", "LOGO", "COPY", "OTRO"];
const ESTADOS_ACTIVO: Record<string, { label: string; color: string }> = {
  PENDIENTE:  { label: "Pendiente",  color: "#6b7280" },
  EN_EDICION: { label: "En edición", color: "#f59e0b" },
  ENTREGADO:  { label: "Entregado",  color: "#3b82f6" },
  APROBADO:   { label: "Aprobado",   color: "#10b981" },
};

interface Activo {
  id: string; tipo: string; nombre: string; url: string;
  descripcion: string | null; estado: string; createdAt: string;
}
interface Levantamiento {
  id: string; tratoId: string; nombreEvento: string | null; tipoEvento: string | null;
  fecha: string | null; horarioEvento: string | null; horarioCobertura: string | null;
  lugar: string | null; nombreCliente: string | null; planCobertura: string | null;
  colaboradoresCamara: boolean | null; colaboradoresNombres: string | null;
  objetivosContenido: string | null; temasSugeridos: string | null;
  redesSocialesCliente: string | null; notasAdicionales: string | null;
  trato: {
    id: string; etapa: string; tipoEvento: string; tipoServicio: string | null;
    cliente: { nombre: string; empresa: string | null; telefono: string | null };
    responsable: { name: string } | null;
  };
  activos: Activo[];
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}
function fmtMes(s: string) {
  const [y, m] = s.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}
function mesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function diasRestantes(fecha: string | null) {
  if (!fecha) return null;
  const diff = Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
  return diff;
}

export default function LevantamientosPage() {
  const [mes, setMes] = useState(mesActual());
  const [levantamientos, setLevantamientos] = useState<Levantamiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Levantamiento | null>(null);
  const [activos, setActivos] = useState<Activo[]>([]);
  const [loadingActivos, setLoadingActivos] = useState(false);

  // Form nuevo activo
  const [showForm, setShowForm] = useState(false);
  const [formActivo, setFormActivo] = useState({ tipo: "FOTO", nombre: "", url: "", descripcion: "", estado: "ENTREGADO" });
  const [savingActivo, setSavingActivo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/marketing/levantamientos?mes=${mes}`);
    const d = await r.json();
    setLevantamientos(d.levantamientos ?? []);
    setLoading(false);
  }, [mes]);

  useEffect(() => { load(); }, [load]);

  async function loadActivos(lev: Levantamiento) {
    setSelected(lev);
    setLoadingActivos(true);
    const r = await fetch(`/api/activos-evento?levantamientoId=${lev.id}`);
    const d = await r.json();
    setActivos(d.activos ?? []);
    setLoadingActivos(false);
  }

  async function saveActivo() {
    if (!selected || !formActivo.nombre || !formActivo.url) return;
    setSavingActivo(true);
    const r = await fetch("/api/activos-evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ levantamientoId: selected.id, ...formActivo }),
    });
    const d = await r.json();
    setSavingActivo(false);
    if (r.ok) {
      setActivos(prev => [d.activo, ...prev]);
      setFormActivo({ tipo: "FOTO", nombre: "", url: "", descripcion: "", estado: "ENTREGADO" });
      setShowForm(false);
    }
  }

  async function patchActivo(id: string, estado: string) {
    await fetch(`/api/activos-evento/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    setActivos(prev => prev.map(a => a.id === id ? { ...a, estado } : a));
  }

  async function deleteActivo(id: string) {
    await fetch(`/api/activos-evento/${id}`, { method: "DELETE" });
    setActivos(prev => prev.filter(a => a.id !== id));
  }

  function prevMes() {
    const [y, m] = mes.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function nextMes() {
    const [y, m] = mes.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const inputCls = "w-full bg-black/40 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/60 placeholder-white/20";

  return (
    <div className="flex h-full" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>

      {/* ── Lista principal ── */}
      <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-white font-bold text-xl">Levantamientos de contenido</h1>
            <p className="text-white/40 text-xs mt-0.5">Shoots agendados desde el CRM · haz clic en un evento para ver sus activos</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMes} className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white text-sm transition-colors">‹</button>
            <span className="text-white font-semibold text-sm capitalize px-2">{fmtMes(mes)}</span>
            <button onClick={nextMes} className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white text-sm transition-colors">›</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", val: levantamientos.length, color: "text-white" },
            { label: "Con fecha", val: levantamientos.filter(l => l.fecha).length, color: "text-[#B3985B]" },
            { label: "Esta semana", val: levantamientos.filter(l => { const d = diasRestantes(l.fecha); return d != null && d >= 0 && d <= 7; }).length, color: "text-amber-400" },
            { label: "Activos entregados", val: levantamientos.reduce((s, l) => s + l.activos.length, 0), color: "text-emerald-400" },
          ].map(k => (
            <div key={k.label} className="bg-white/[0.025] border border-white/8 rounded-xl p-4">
              <p className="text-white/40 text-xs mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.val}</p>
            </div>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : levantamientos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📷</p>
            <p className="text-white/50">No hay levantamientos en {fmtMes(mes)}</p>
            <p className="text-white/25 text-xs mt-1">Los levantamientos se crean desde la etapa de Descubrimiento en el CRM</p>
          </div>
        ) : (
          <div className="space-y-3">
            {levantamientos.map(lev => {
              const plan = PLANES[lev.planCobertura ?? ""] ?? PLANES.OTRO;
              const dias = diasRestantes(lev.fecha);
              const isSelected = selected?.id === lev.id;
              return (
                <div
                  key={lev.id}
                  onClick={() => loadActivos(lev)}
                  className="bg-white/[0.025] border rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:bg-white/[0.04]"
                  style={{ borderColor: isSelected ? `${GOLD}50` : "rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: `${plan.color}20`, color: plan.color, border: `1px solid ${plan.color}40` }}>
                          {plan.label}
                        </span>
                        {lev.trato.tipoEvento && (
                          <span className="text-[10px] text-white/30 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">
                            {lev.trato.tipoEvento}
                          </span>
                        )}
                        {dias !== null && dias >= 0 && dias <= 7 && (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                            {dias === 0 ? "¡Hoy!" : `en ${dias} día${dias !== 1 ? "s" : ""}`}
                          </span>
                        )}
                        {dias !== null && dias < 0 && (
                          <span className="text-[10px] text-white/25 px-2 py-0.5 rounded-full bg-white/5">Realizado</span>
                        )}
                      </div>
                      <p className="text-white font-semibold text-base leading-tight">{lev.nombreEvento || "Sin nombre"}</p>
                      <p className="text-white/40 text-xs mt-1">{lev.trato.cliente.nombre}{lev.trato.cliente.empresa ? ` · ${lev.trato.cliente.empresa}` : ""}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-white/70 text-sm font-medium">{fmtDate(lev.fecha)}</p>
                      {lev.horarioCobertura && <p className="text-white/30 text-xs">{lev.horarioCobertura}</p>}
                      {lev.lugar && <p className="text-white/25 text-xs truncate max-w-[180px]">{lev.lugar}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                    {lev.trato.responsable && (
                      <span className="text-white/30 text-xs">Vendedor: {lev.trato.responsable.name}</span>
                    )}
                    {lev.colaboradoresCamara && (
                      <span className="text-[#B3985B] text-xs">+ Colaboradores: {lev.colaboradoresNombres || "sí"}</span>
                    )}
                    {lev.activos.length > 0 && (
                      <span className="ml-auto text-emerald-400 text-xs">{lev.activos.length} activo{lev.activos.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Panel lateral: activos ── */}
      {selected && (
        <div className="w-96 shrink-0 border-l border-white/8 bg-[#0a0a0a] overflow-y-auto flex flex-col">
          {/* Header panel */}
          <div className="sticky top-0 bg-[#0a0a0a] border-b border-white/8 px-5 py-4 z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-widest mb-1">Activos del evento</p>
                <p className="text-white font-semibold text-sm leading-tight truncate">{selected.nombreEvento}</p>
                <p className="text-white/30 text-xs mt-0.5">{fmtDate(selected.fecha)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white text-xl shrink-0 mt-0.5">×</button>
            </div>
            {selected.temasSugeridos && (
              <p className="text-white/40 text-xs mt-3 p-2 bg-white/[0.03] rounded-lg border border-white/5 leading-relaxed">
                💡 {selected.temasSugeridos}
              </p>
            )}
            <button
              onClick={() => setShowForm(f => !f)}
              className="mt-3 w-full py-2 rounded-xl text-xs font-semibold transition-colors"
              style={{ background: showForm ? "rgba(255,255,255,0.05)" : GOLD, color: showForm ? "rgba(255,255,255,0.6)" : "#000" }}
            >
              {showForm ? "Cancelar" : "+ Agregar activo"}
            </button>
          </div>

          {/* Form nuevo activo */}
          {showForm && (
            <div className="px-5 py-4 border-b border-white/8 space-y-3 bg-white/[0.02]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white/30 block mb-1">Tipo</label>
                  <select value={formActivo.tipo} onChange={e => setFormActivo(f => ({ ...f, tipo: e.target.value }))}
                    className={inputCls}>
                    {TIPOS_ACTIVO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/30 block mb-1">Estado</label>
                  <select value={formActivo.estado} onChange={e => setFormActivo(f => ({ ...f, estado: e.target.value }))}
                    className={inputCls}>
                    {Object.entries(ESTADOS_ACTIVO).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-white/30 block mb-1">Nombre *</label>
                <input value={formActivo.nombre} onChange={e => setFormActivo(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Fotos ceremonia edición final" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] text-white/30 block mb-1">URL / Link *</label>
                <input value={formActivo.url} onChange={e => setFormActivo(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://drive.google.com/..." className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] text-white/30 block mb-1">Descripción</label>
                <input value={formActivo.descripcion} onChange={e => setFormActivo(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Notas adicionales..." className={inputCls} />
              </div>
              <button onClick={saveActivo} disabled={savingActivo || !formActivo.nombre || !formActivo.url}
                className="w-full py-2 rounded-xl text-xs font-bold text-black disabled:opacity-40 transition-colors"
                style={{ background: GOLD }}>
                {savingActivo ? "Guardando..." : "Guardar activo"}
              </button>
            </div>
          )}

          {/* Lista activos */}
          <div className="flex-1 px-5 py-4 space-y-3">
            {loadingActivos ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activos.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-2">📂</p>
                <p className="text-white/30 text-xs">Sin activos registrados</p>
              </div>
            ) : (
              activos.map(a => {
                const est = ESTADOS_ACTIVO[a.estado] ?? ESTADOS_ACTIVO.ENTREGADO;
                return (
                  <div key={a.id} className="bg-white/[0.025] border border-white/8 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{a.tipo}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                style={{ color: est.color, background: `${est.color}15` }}>{est.label}</span>
                        </div>
                        <p className="text-white text-xs font-semibold leading-snug">{a.nombre}</p>
                        {a.descripcion && <p className="text-white/30 text-[10px] mt-0.5">{a.descripcion}</p>}
                      </div>
                      <button onClick={() => deleteActivo(a.id)} className="text-white/20 hover:text-red-400 text-xs shrink-0 transition-colors">✕</button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <a href={a.url} target="_blank" rel="noopener noreferrer"
                         className="text-[#B3985B] text-[10px] hover:underline truncate">
                        🔗 Ver archivo →
                      </a>
                      <select value={a.estado} onChange={e => patchActivo(a.id, e.target.value)}
                        className="text-[10px] bg-transparent border border-white/10 text-white/50 rounded px-1 py-0.5 focus:outline-none">
                        {Object.entries(ESTADOS_ACTIVO).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
