'use client';
import { useState, useEffect, useCallback } from 'react';
import { Target } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface KeyResultData {
  id: string;
  descripcion: string;
  tipo: string;
  meta: number | null;
  metaTexto: string | null;
  progreso: number;
  completado: boolean;
  conexionAuto: string | null;
  progresoAuto?: number;
}
interface ObjetivoData {
  id: string;
  area: string;
  trimestre: string;
  anio: number;
  objetivo: string;
  keyResults: KeyResultData[];
}
interface MetaGlobalData {
  ingresos2026: number;
  utilidadNeta2026: number;
  rentabilidad2026: number;
  ingresos2025: number;
  crecimientoYoY: number | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const AREA_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  VENTAS:         { label: 'Ventas',          color: '#3b82f6', icon: '💼' },
  MARKETING:      { label: 'Marketing',       color: '#a855f7', icon: '📣' },
  PRODUCCION:     { label: 'Producción',      color: '#f59e0b', icon: '🎯' },
  ADMINISTRACION: { label: 'Administración',  color: '#10b981', icon: '📊' },
  DIRECCION:      { label: 'Dirección',       color: '#B3985B', icon: '🧭' },
};

const TRIMESTRES = ['Q1', 'Q2', 'Q3', 'Q4'];
const AREAS_ORDER = ['VENTAS', 'MARKETING', 'PRODUCCION', 'ADMINISTRACION', 'DIRECCION'];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}

function pct(val: number, meta: number) { return Math.min(100, Math.round((val / meta) * 100)); }

// Semáforo: red < 50%, yellow 50-79%, green >= 80%
function semaforoColor(pctVal: number) {
  if (pctVal >= 80) return { bar: '#22c55e', text: 'text-green-400', bg: 'bg-green-900/20' };
  if (pctVal >= 50) return { bar: '#f59e0b', text: 'text-yellow-400', bg: 'bg-yellow-900/20' };
  return { bar: '#ef4444', text: 'text-red-400', bg: 'bg-red-900/20' };
}

// ── MetaCard ──────────────────────────────────────────────────────────────────
function MetaCard({ label, realVal, metaVal, formatVal, metaDisplay, unit }: {
  label: string;
  realVal: number;
  metaVal: number;
  formatVal: (n: number) => string;
  metaDisplay: string;
  unit?: string;
}) {
  const p = pct(realVal, metaVal);
  const sem = semaforoColor(p);
  return (
    <div className="flex-1 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl p-5 min-w-0">
      <p className="text-[11px] text-[#555] uppercase tracking-widest font-semibold mb-3">{label}</p>
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className={`text-2xl font-bold ${sem.text}`}>{formatVal(realVal)}{unit}</p>
          <p className="text-xs text-[#444] mt-0.5">meta: {metaDisplay}</p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${sem.text}`}>{p}%</p>
          <p className="text-[10px] text-[#444]">avance</p>
        </div>
      </div>
      <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${p}%`, backgroundColor: sem.bar }} />
      </div>
    </div>
  );
}

// ── KR Status badge ───────────────────────────────────────────────────────────
function KRStatus({ kr }: { kr: KeyResultData }) {
  if (kr.completado) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-900/30 text-green-400 border border-green-900/50">Logrado</span>
  );
  if (kr.tipo === 'booleano') return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#1a1a1a] text-[#444] border border-[#222]">No iniciado</span>
  );
  if (kr.progreso > 0 && kr.meta) {
    const p = pct(kr.progreso, kr.meta);
    if (p >= 80) return <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-900/30 text-green-400 border border-green-900/50">En camino</span>;
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-900/50">En progreso</span>;
  }
  return <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#1a1a1a] text-[#444] border border-[#222]">No iniciado</span>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ObjetivosPage() {
  const [me, setMe] = useState<{ id: string; name: string; role: string } | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [trimestre, setTrimestre] = useState('Q3');
  const [metaGlobal, setMetaGlobal] = useState<MetaGlobalData | null>(null);
  const [objetivos, setObjetivos] = useState<ObjetivoData[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingOKRs, setLoadingOKRs] = useState(true);
  const [editingKR, setEditingKR] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Auth
  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d || d.role !== 'ADMIN') { setAccessDenied(true); return; }
        setMe(d);
      })
      .catch(() => setAccessDenied(true));
  }, []);

  // Meta Global data
  useEffect(() => {
    if (!me) return;
    fetch('/api/objetivos/meta-global')
      .then(r => r.json())
      .then(d => setMetaGlobal(d))
      .finally(() => setLoadingMeta(false));
  }, [me]);

  // OKRs
  const loadOKRs = useCallback((q: string) => {
    if (!me) return;
    setLoadingOKRs(true);
    fetch(`/api/objetivos?trimestre=${q}&anio=2026`)
      .then(r => r.json())
      .then(d => setObjetivos(d.objetivos ?? []))
      .finally(() => setLoadingOKRs(false));
  }, [me]);

  useEffect(() => { loadOKRs(trimestre); }, [trimestre, loadOKRs]);

  async function saveKR(id: string, progreso: number) {
    setSaving(true);
    await fetch(`/api/objetivos/key-results/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progreso }),
    });
    setSaving(false);
    setEditingKR(null);
    loadOKRs(trimestre);
  }

  async function toggleKR(id: string, completado: boolean) {
    await fetch(`/api/objetivos/key-results/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completado }),
    });
    loadOKRs(trimestre);
  }

  if (accessDenied) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <p className="text-[#555] text-sm">Acceso restringido</p>
    </div>
  );
  if (!me) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-6 h-6 border border-[#333] border-t-[#B3985B] rounded-full animate-spin" />
    </div>
  );

  // Build area map for current trimestre
  const objByArea = AREAS_ORDER.reduce((acc, area) => {
    const obj = objetivos.find(o => o.area === area);
    acc[area] = obj ?? null;
    return acc;
  }, {} as Record<string, ObjetivoData | null>);

  // Crecimiento YoY display
  const yoy = metaGlobal?.crecimientoYoY;
  const yoyDisplay = yoy !== null && yoy !== undefined ? `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%` : '—';
  const yoyReal = yoy !== null && yoy !== undefined ? yoy : 0;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#B3985B]/10 border border-[#B3985B]/20 flex items-center justify-center">
            <Target size={18} className="text-[#B3985B]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Objetivos</h1>
            <p className="text-xs text-[#444]">Meta anual y OKRs trimestrales</p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECCIÓN 1 — META GLOBAL 2026
        ═══════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-[#0d0d0d] via-[#0a0a0a] to-[#080808] border border-[#1e1e1e] rounded-3xl p-8 relative overflow-hidden">
          {/* Background accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#B3985B]/3 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-[#B3985B] uppercase tracking-widest font-bold">Meta Global</span>
              <span className="text-[10px] text-[#333] uppercase tracking-widest font-semibold">2026</span>
            </div>

            <p className="text-xl md:text-2xl font-semibold text-white leading-snug mb-8 max-w-3xl">
              Construir un negocio rentable sostenido por un sistema de ventas predecible y una operación sólida que funcione sin depender de una sola persona.
            </p>

            {/* 3 metric cards */}
            {loadingMeta ? (
              <div className="flex gap-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex-1 h-28 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : metaGlobal && (
              <div className="flex flex-col md:flex-row gap-4">
                <MetaCard
                  label="Ingresos anuales"
                  realVal={metaGlobal.ingresos2026}
                  metaVal={6_000_000}
                  formatVal={formatCurrency}
                  metaDisplay="$6,000,000 MXN"
                />
                <MetaCard
                  label="Rentabilidad mínima"
                  realVal={metaGlobal.rentabilidad2026}
                  metaVal={30}
                  formatVal={n => n.toFixed(1)}
                  metaDisplay="30%"
                  unit="%"
                />
                <div className="flex-1 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl p-5 min-w-0">
                  <p className="text-[11px] text-[#555] uppercase tracking-widest font-semibold mb-3">Crecimiento en ventas</p>
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className={`text-2xl font-bold ${
                        yoyReal >= 30 ? 'text-green-400' : yoyReal >= 15 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{yoyDisplay}</p>
                      <p className="text-xs text-[#444] mt-0.5">meta: +30% YoY</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        yoyReal >= 30 ? 'text-green-400' : yoyReal >= 15 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{pct(Math.max(0, yoyReal), 30)}%</p>
                      <p className="text-[10px] text-[#444]">avance</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct(Math.max(0, yoyReal), 30)}%`,
                        backgroundColor: yoyReal >= 30 ? '#22c55e' : yoyReal >= 15 ? '#f59e0b' : '#ef4444',
                      }} />
                  </div>
                  {metaGlobal.ingresos2025 > 0 && (
                    <p className="text-[10px] text-[#333] mt-2">
                      2025: {formatCurrency(metaGlobal.ingresos2025)} → 2026: {formatCurrency(metaGlobal.ingresos2026)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECCIÓN 2 — OKRs TRIMESTRALES
        ═══════════════════════════════════════════════════════════ */}
        <div>
          {/* Tabs Q1-Q4 */}
          <div className="flex items-center gap-1 mb-8 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-1 w-fit">
            {TRIMESTRES.map(q => (
              <button key={q} onClick={() => setTrimestre(q)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  trimestre === q
                    ? 'bg-[#1a1a1a] text-white shadow-sm'
                    : 'text-[#444] hover:text-[#777]'
                }`}>
                {q}
                {q === 'Q3' && <span className="ml-1.5 text-[9px] text-[#B3985B] uppercase tracking-wider">Activo</span>}
              </button>
            ))}
          </div>

          {loadingOKRs ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border border-[#333] border-t-[#B3985B] rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {AREAS_ORDER.map(area => {
                const cfg = AREA_CONFIG[area];
                const obj = objByArea[area];

                if (!obj) {
                  // Empty state
                  return (
                    <div key={area} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-xl">{cfg.icon}</span>
                        <div>
                          <p className="text-xs font-semibold text-white">{cfg.label}</p>
                          <p className="text-[10px] text-[#333] uppercase tracking-wider">OKRs pendientes de definir</p>
                        </div>
                      </div>
                      <button
                        disabled
                        className="flex items-center gap-1.5 text-xs text-[#333] border border-[#1a1a1a] px-3 py-1.5 rounded-lg cursor-not-allowed">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Definir OKRs
                      </button>
                    </div>
                  );
                }

                const krs = obj.keyResults;

                return (
                  <div key={area} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
                    {/* Area header */}
                    <div className="px-6 pt-6 pb-4 border-b border-[#111]">
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">{cfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] uppercase tracking-widest font-bold"
                              style={{ color: cfg.color }}>{cfg.label}</p>
                            <span className="text-[10px] text-[#333]">—</span>
                            <p className="text-[10px] text-[#444] uppercase tracking-wider">Objective</p>
                          </div>
                          <p className="text-sm text-[#ccc] leading-snug">{obj.objetivo}</p>
                        </div>
                      </div>
                    </div>

                    {/* Key Results */}
                    <div className="px-6 py-4 space-y-4">
                      {krs.map((kr, i) => {
                        const isAuto = !!kr.conexionAuto;
                        const progrPct = kr.meta ? pct(kr.progreso, kr.meta) : 0;
                        const sem = semaforoColor(progrPct);

                        return (
                          <div key={kr.id} className="flex gap-3 group">
                            {/* KR number */}
                            <span className="w-5 h-5 rounded-full bg-[#1a1a1a] text-[10px] font-bold text-[#555] flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <p className="text-sm text-[#bbb] leading-snug flex-1">{kr.descripcion}</p>
                                <div className="flex items-center gap-2 shrink-0">
                                  {isAuto && (
                                    <span className="text-[9px] text-[#B3985B]/70 bg-[#B3985B]/10 border border-[#B3985B]/20 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
                                      Auto
                                    </span>
                                  )}
                                  <KRStatus kr={kr} />
                                </div>
                              </div>

                              {/* Progress */}
                              {kr.tipo !== 'booleano' && kr.meta && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-[#444]">
                                      {kr.metaTexto ?? `Meta: ${kr.meta}`}
                                      {isAuto && kr.progresoAuto !== undefined && (
                                        <span className="ml-2 text-[#555]">
                                          (total acumulado: {kr.progresoAuto})
                                        </span>
                                      )}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {!isAuto && editingKR === kr.id ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            className="w-16 bg-[#111] border border-[#2a2a2a] rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-[#B3985B]"
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') saveKR(kr.id, parseFloat(editValue) || 0);
                                              if (e.key === 'Escape') setEditingKR(null);
                                            }}
                                            autoFocus
                                          />
                                          <button onClick={() => saveKR(kr.id, parseFloat(editValue) || 0)}
                                            disabled={saving}
                                            className="text-[10px] text-[#B3985B] hover:underline">
                                            {saving ? '…' : 'OK'}
                                          </button>
                                          <button onClick={() => setEditingKR(null)}
                                            className="text-[10px] text-[#444] hover:text-white">
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <span className={`text-xs font-semibold ${sem.text}`}>
                                            {kr.progreso}{kr.tipo === 'porcentaje' ? '%' : ''}
                                            {' '}/ {kr.meta}{kr.tipo === 'porcentaje' ? '%' : ''}
                                          </span>
                                          {!isAuto && (
                                            <button
                                              onClick={() => { setEditingKR(kr.id); setEditValue(String(kr.progreso)); }}
                                              className="opacity-0 group-hover:opacity-100 text-[10px] text-[#444] hover:text-[#B3985B] transition-all">
                                              Editar
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="h-1 bg-[#161616] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500"
                                      style={{ width: `${progrPct}%`, backgroundColor: sem.bar }} />
                                  </div>
                                </div>
                              )}

                              {/* Boolean toggle */}
                              {kr.tipo === 'booleano' && (
                                <button
                                  onClick={() => toggleKR(kr.id, !kr.completado)}
                                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${
                                    kr.completado
                                      ? 'bg-green-900/20 border-green-900/50 text-green-400'
                                      : 'bg-[#111] border-[#222] text-[#555] hover:text-[#888]'
                                  }`}>
                                  <span className={`w-3 h-3 rounded-sm border flex items-center justify-center ${
                                    kr.completado ? 'bg-green-500 border-green-500' : 'border-[#333]'
                                  }`}>
                                    {kr.completado && (
                                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="black" strokeWidth="2.5">
                                        <path d="M2 6l3 3 5-5" />
                                      </svg>
                                    )}
                                  </span>
                                  {kr.completado ? 'Completado' : 'Marcar como completado'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
