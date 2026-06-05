'use client';
import { useState, useEffect, useCallback } from 'react';
import { Target } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
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
const AREA_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  DIRECCION:      { label: 'Dirección',       color: '#B3985B', bg: 'rgba(179,152,91,0.08)',  icon: '🧭' },
  ADMINISTRACION: { label: 'Administración',  color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: '📊' },
  MARKETING:      { label: 'Marketing',       color: '#a855f7', bg: 'rgba(168,85,247,0.08)', icon: '📣' },
  VENTAS:         { label: 'Ventas',          color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: '💼' },
  PRODUCCION:     { label: 'Producción',      color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: '🎯' },
};

// Orden correcto: Dirección → Administración → Marketing → Ventas → Producción
const AREAS_ORDER = ['DIRECCION', 'ADMINISTRACION', 'MARKETING', 'VENTAS', 'PRODUCCION'];

const TRIMESTRES: { key: string; label: string; rango: string }[] = [
  { key: 'Q1', label: 'Q1', rango: 'Ene – Mar' },
  { key: 'Q2', label: 'Q2', rango: 'Abr – Jun' },
  { key: 'Q3', label: 'Q3', rango: 'Jul – Sep' },
  { key: 'Q4', label: 'Q4', rango: 'Oct – Dic' },
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}
function pct(val: number, meta: number) { return Math.min(100, Math.max(0, Math.round((val / meta) * 100))); }

function semaforoColor(p: number) {
  if (p >= 80) return { bar: '#22c55e', text: '#22c55e', badge: 'bg-green-900/20 text-green-400 border-green-800/30' };
  if (p >= 50) return { bar: '#f59e0b', text: '#f59e0b', badge: 'bg-yellow-900/20 text-yellow-400 border-yellow-800/30' };
  return { bar: '#ef4444', text: '#ef4444', badge: 'bg-red-900/20 text-red-400 border-red-800/30' };
}

// ── MetaCard ──────────────────────────────────────────────────────────────────
function MetaCard({ label, realVal, metaVal, formatVal, metaDisplay, unit, extra }: {
  label: string; realVal: number; metaVal: number;
  formatVal: (n: number) => string; metaDisplay: string; unit?: string; extra?: React.ReactNode;
}) {
  const p = pct(realVal, metaVal);
  const sem = semaforoColor(p);
  return (
    <div className="flex-1 min-w-0 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl p-5 flex flex-col gap-3">
      <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold">{label}</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold" style={{ color: sem.text }}>{formatVal(realVal)}{unit}</p>
          <p className="text-[11px] text-[#3a3a3a] mt-1">meta · {metaDisplay}</p>
        </div>
        <div className="text-right">
          <div className={`text-sm font-bold px-2 py-1 rounded-lg border ${sem.badge}`}>{p}%</div>
        </div>
      </div>
      <div className="h-1.5 bg-[#111] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, backgroundColor: sem.bar }} />
      </div>
      {extra}
    </div>
  );
}

// ── KRStatus ──────────────────────────────────────────────────────────────────
function KRStatus({ kr }: { kr: KeyResultData }) {
  if (kr.completado)
    return <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-green-900/25 text-green-400 border border-green-800/30 uppercase tracking-wider">Logrado</span>;
  if (kr.progreso > 0 && kr.meta) {
    const p = pct(kr.progreso, kr.meta);
    if (p >= 80) return <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-green-900/20 text-green-500 border border-green-800/20 uppercase tracking-wider">En camino</span>;
    return <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-yellow-900/20 text-yellow-400 border border-yellow-800/20 uppercase tracking-wider">En progreso</span>;
  }
  return <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-[#161616] text-[#444] border border-[#222] uppercase tracking-wider">No iniciado</span>;
}

// ── Main ──────────────────────────────────────────────────────────────────────
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

  // Admin guard
  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!d || d.role !== 'ADMIN') { setAccessDenied(true); return; } setMe(d); })
      .catch(() => setAccessDenied(true));
  }, []);

  useEffect(() => {
    if (!me) return;
    fetch('/api/objetivos/meta-global')
      .then(r => r.json())
      .then(d => setMetaGlobal(d))
      .finally(() => setLoadingMeta(false));
  }, [me]);

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
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progreso }),
    });
    setSaving(false); setEditingKR(null); loadOKRs(trimestre);
  }

  async function toggleKR(id: string, completado: boolean) {
    await fetch(`/api/objetivos/key-results/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completado }),
    });
    loadOKRs(trimestre);
  }

  if (accessDenied) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <p className="text-[#444] text-sm">Acceso restringido</p>
    </div>
  );
  if (!me) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-5 h-5 border border-[#333] border-t-[#B3985B] rounded-full animate-spin" />
    </div>
  );

  const objByArea = AREAS_ORDER.reduce((acc, area) => {
    acc[area] = objetivos.find(o => o.area === area) ?? null;
    return acc;
  }, {} as Record<string, ObjetivoData | null>);

  const yoy = metaGlobal?.crecimientoYoY;
  const yoyReal = yoy ?? 0;
  const yoyDisplay = yoy != null ? `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%` : '—';

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#B3985B]/10 border border-[#B3985B]/20 flex items-center justify-center">
            <Target size={15} className="text-[#B3985B]" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">Objetivos 2026</h1>
            <p className="text-[11px] text-[#3a3a3a]">Meta anual · OKRs por área</p>
          </div>
        </div>

        {/* ─── META GLOBAL ────────────────────────────────────────────────── */}
        <div className="relative bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl overflow-hidden">
          {/* Gold top strip */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#B3985B]/40 to-transparent" />
          <div className="p-6 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[9px] text-[#B3985B] font-bold uppercase tracking-[0.15em]">Meta Global 2026</span>
            </div>
            <p className="text-[15px] text-[#bbb] leading-relaxed mb-6 max-w-2xl font-light">
              "Construir un negocio rentable sostenido por un sistema de ventas predecible y una operación sólida que funcione sin depender de una sola persona."
            </p>

            {loadingMeta ? (
              <div className="flex gap-3">
                {[0,1,2].map(i => <div key={i} className="flex-1 h-24 bg-[#111] border border-[#1a1a1a] rounded-2xl animate-pulse" />)}
              </div>
            ) : metaGlobal && (
              <div className="flex flex-col sm:flex-row gap-3">
                <MetaCard
                  label="Ingresos anuales"
                  realVal={metaGlobal.ingresos2026}
                  metaVal={6_000_000}
                  formatVal={formatCurrency}
                  metaDisplay="$6,000,000"
                />
                <MetaCard
                  label="Rentabilidad neta"
                  realVal={metaGlobal.rentabilidad2026}
                  metaVal={30}
                  formatVal={n => n.toFixed(1)}
                  metaDisplay="30%"
                  unit="%"
                />
                <MetaCard
                  label="Crecimiento YoY"
                  realVal={Math.max(0, yoyReal)}
                  metaVal={30}
                  formatVal={() => yoyDisplay}
                  metaDisplay="+30%"
                  extra={metaGlobal.ingresos2025 > 0 ? (
                    <p className="text-[10px] text-[#333]">
                      2025 {formatCurrency(metaGlobal.ingresos2025)} → 2026 {formatCurrency(metaGlobal.ingresos2026)}
                    </p>
                  ) : undefined}
                />
              </div>
            )}
          </div>
        </div>

        {/* ─── OKRs TRIMESTRALES ──────────────────────────────────────────── */}
        <div>
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6">
            {TRIMESTRES.map(t => {
              const active = trimestre === t.key;
              const isCurrent = t.key === 'Q3';
              return (
                <button
                  key={t.key}
                  onClick={() => setTrimestre(t.key)}
                  className={`relative flex flex-col items-center px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    active
                      ? 'bg-[#111] border-[#2a2a2a] text-white'
                      : 'border-transparent text-[#3a3a3a] hover:text-[#666] hover:bg-[#0d0d0d]'
                  }`}
                >
                  <span>{t.key}</span>
                  <span className={`text-[9px] mt-0.5 ${active ? 'text-[#555]' : 'text-[#2a2a2a]'}`}>{t.rango}</span>
                  {isCurrent && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#B3985B]" />
                  )}
                </button>
              );
            })}
          </div>

          {loadingOKRs ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border border-[#333] border-t-[#B3985B] rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {AREAS_ORDER.map(area => {
                const cfg = AREA_CONFIG[area];
                const obj = objByArea[area];

                // Empty state
                if (!obj) {
                  return (
                    <div
                      key={area}
                      className="border border-dashed border-[#1a1a1a] rounded-2xl p-5 flex items-center justify-between group hover:border-[#252525] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                          style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}20` }}
                        >
                          {cfg.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#444]">{cfg.label}</p>
                          <p className="text-[10px] text-[#2a2a2a] mt-0.5">OKRs pendientes de definir para este trimestre</p>
                        </div>
                      </div>
                      <button
                        disabled
                        className="text-[11px] text-[#2a2a2a] border border-[#1a1a1a] px-3 py-1.5 rounded-lg cursor-not-allowed opacity-50"
                      >
                        + Definir OKRs
                      </button>
                    </div>
                  );
                }

                const krs = obj.keyResults;
                // Overall area progress
                const areaProgress = krs.length > 0
                  ? Math.round(krs.reduce((sum, kr) => {
                      if (kr.completado) return sum + 100;
                      if (kr.meta) return sum + pct(kr.progreso, kr.meta);
                      return sum;
                    }, 0) / krs.length)
                  : 0;
                const areaSem = semaforoColor(areaProgress);

                return (
                  <div
                    key={area}
                    className="bg-[#0a0a0a] rounded-2xl overflow-hidden border border-[#1a1a1a]"
                    style={{ borderLeft: `3px solid ${cfg.color}` }}
                  >
                    {/* Area header */}
                    <div className="px-5 pt-5 pb-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{cfg.icon}</span>
                          <span
                            className="text-[10px] font-bold uppercase tracking-[0.12em]"
                            style={{ color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-[10px] text-[#2a2a2a]">·</span>
                          <span className="text-[10px] text-[#444]">Objective</span>
                        </div>
                        {/* Area progress pill */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-16 h-1 bg-[#161616] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${areaProgress}%`, backgroundColor: areaSem.bar }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold" style={{ color: areaSem.text }}>{areaProgress}%</span>
                        </div>
                      </div>

                      {/* Objective text */}
                      <div
                        className="rounded-xl px-4 py-3"
                        style={{ backgroundColor: cfg.bg, borderLeft: `2px solid ${cfg.color}30` }}
                      >
                        <p className="text-[13px] text-[#ccc] leading-relaxed">{obj.objetivo}</p>
                      </div>
                    </div>

                    {/* Key Results */}
                    <div className="border-t border-[#111] divide-y divide-[#0f0f0f]">
                      {krs.map((kr, i) => {
                        const isAuto = !!kr.conexionAuto;
                        const progrPct = kr.meta ? pct(kr.progreso, kr.meta) : 0;
                        const sem = semaforoColor(progrPct);

                        return (
                          <div key={kr.id} className="px-5 py-4 group">
                            <div className="flex gap-3">
                              {/* KR number */}
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                                style={{ backgroundColor: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}25` }}
                              >
                                {i + 1}
                              </div>

                              <div className="flex-1 min-w-0">
                                {/* KR description + badges */}
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <p className="text-[13px] text-[#ccc] leading-snug flex-1">{kr.descripcion}</p>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isAuto && (
                                      <span
                                        className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                                        style={{ backgroundColor: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}25` }}
                                      >
                                        Auto
                                      </span>
                                    )}
                                    <KRStatus kr={kr} />
                                  </div>
                                </div>

                                {/* Progress (numerico/porcentaje) */}
                                {kr.tipo !== 'booleano' && kr.meta && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] text-[#3a3a3a]">
                                        {kr.metaTexto ?? `Meta: ${kr.meta}`}
                                        {isAuto && kr.progresoAuto !== undefined && (
                                          <span className="ml-2 text-[#2a2a2a]">· {kr.progresoAuto} acumulados</span>
                                        )}
                                      </span>
                                      {/* Editable value */}
                                      {!isAuto && editingKR === kr.id ? (
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="number"
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            className="w-16 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                                            style={{ borderColor: cfg.color + '50' }}
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') saveKR(kr.id, parseFloat(editValue) || 0);
                                              if (e.key === 'Escape') setEditingKR(null);
                                            }}
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => saveKR(kr.id, parseFloat(editValue) || 0)}
                                            disabled={saving}
                                            className="text-[10px] font-semibold px-2 py-1 rounded-md transition-colors"
                                            style={{ backgroundColor: cfg.color + '20', color: cfg.color }}
                                          >
                                            {saving ? '…' : 'OK'}
                                          </button>
                                          <button onClick={() => setEditingKR(null)} className="text-[10px] text-[#444] hover:text-white">✕</button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-semibold" style={{ color: sem.bar }}>
                                            {kr.progreso}{kr.tipo === 'porcentaje' ? '%' : ''} / {kr.meta}{kr.tipo === 'porcentaje' ? '%' : ''}
                                          </span>
                                          {!isAuto && (
                                            <button
                                              onClick={() => { setEditingKR(kr.id); setEditValue(String(kr.progreso)); }}
                                              className="text-[10px] text-[#2a2a2a] hover:text-[#B3985B] opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                              editar
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {/* Progress bar */}
                                    <div className="h-1.5 bg-[#111] rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${progrPct}%`, backgroundColor: sem.bar }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Boolean */}
                                {kr.tipo === 'booleano' && (
                                  <button
                                    onClick={() => toggleKR(kr.id, !kr.completado)}
                                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                                      kr.completado
                                        ? 'bg-green-900/20 border-green-800/30 text-green-400'
                                        : 'bg-[#0f0f0f] border-[#1e1e1e] text-[#444] hover:text-[#888]'
                                    }`}
                                  >
                                    <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                                      kr.completado ? 'bg-green-500 border-green-500' : 'border-[#2a2a2a]'
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
