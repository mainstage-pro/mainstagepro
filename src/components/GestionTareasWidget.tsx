"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

// ── Constantes ────────────────────────────────────────────────────────────────

const AREA_META = {
  ADMINISTRACION: { label: "Administración", color: "#3b82f6" },
  MARKETING:      { label: "Marketing",      color: "#ec4899" },
  VENTAS:         { label: "Ventas",          color: "#10b981" },
  PRODUCCION:     { label: "Producción",      color: "#f59e0b" },
} as const;

type AreaKey = keyof typeof AREA_META;

const PRIO_DOT: Record<string, string> = {
  URGENTE: "bg-red-500",
  ALTA:    "bg-orange-500",
  MEDIA:   "bg-[#B3985B]",
  BAJA:    "bg-[#444]",
};

function getStatus(p: number) {
  if (p >= 60) return { label: "Excelente",   textCls: "text-emerald-400", barClr: "#10b981" };
  if (p >= 30) return { label: "Regular",     textCls: "text-yellow-400",  barClr: "#eab308" };
  return              { label: "En peligro",  textCls: "text-red-400",     barClr: "#ef4444" };
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface TareaR {
  id: string;
  titulo: string;
  prioridad: string;
  fecha: string | null;
  asignadoA:     { id: string; name: string } | null;
  proyectoTarea: { id: string; nombre: string; color: string | null } | null;
}

interface AreaData {
  area: string;
  counts: {
    hoy: number; vencidas: number; proximas: number;
    sinFecha: number; totalActivas: number; completadasMes: number;
  };
  progress: number;
  tareas: { hoy: TareaR[]; vencidas: TareaR[]; proximas: TareaR[]; sinFecha: TareaR[] };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fechaCorta(iso: string) {
  return new Date(iso.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", {
    timeZone: "UTC", day: "numeric", month: "short",
  });
}

// ── TareaRow ──────────────────────────────────────────────────────────────────

function TareaRow({ t }: { t: TareaR }) {
  return (
    <Link
      href={`/operaciones?open=${t.id}`}
      className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-xl hover:bg-[#111] transition-colors group"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${PRIO_DOT[t.prioridad] ?? PRIO_DOT.BAJA}`} />
      <span className="flex-1 text-sm text-[#bbb] group-hover:text-white truncate leading-snug">
        {t.titulo}
      </span>
      <div className="flex items-center gap-2.5 shrink-0">
        {t.proyectoTarea && (
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-[#444] truncate max-w-[120px]">
            <span className="w-1.5 h-1.5 rounded-full shrink-0 inline-block"
              style={{ backgroundColor: t.proyectoTarea.color ?? "#555" }} />
            {t.proyectoTarea.nombre}
          </span>
        )}
        {t.asignadoA && (
          <span className="group/av relative inline-flex">
            <span className="w-6 h-6 rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 text-[11px] text-[#B3985B] flex items-center justify-center font-bold select-none">
              {t.asignadoA.name.charAt(0).toUpperCase()}
            </span>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[11px] text-white whitespace-nowrap opacity-0 group-hover/av:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
              {t.asignadoA.name}
            </span>
          </span>
        )}
        {t.fecha && (
          <span className="text-[11px] text-[#555] tabular-nums">{fechaCorta(t.fecha)}</span>
        )}
      </div>
    </Link>
  );
}

// ── TaskSection ───────────────────────────────────────────────────────────────

function TaskSection({
  icon, label, count, tasks, badgeCls, emptyMsg,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  tasks: TareaR[];
  badgeCls: string;
  emptyMsg: string;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 mb-2 w-full group"
      >
        <span className="text-[#444] group-hover:text-[#666] transition-colors">{icon}</span>
        <span className="text-xs text-[#555] uppercase tracking-widest font-semibold group-hover:text-[#888] transition-colors">
          {label}
        </span>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeCls}`}>
          {count}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-[#333] ml-auto transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        count === 0
          ? <p className="text-sm text-[#2a2a2a] pl-1 pb-1">{emptyMsg}</p>
          : tasks.map(t => <TareaRow key={t.id} t={t} />)
      )}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-5">
      <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-28 bg-[#1a1a1a] rounded animate-pulse" />
            <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full animate-pulse" />
            <div className="h-3 w-10 bg-[#1a1a1a] rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-36 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GestionTareasWidget() {
  const [data, setData]         = useState<AreaData[] | null>(null);
  const [selected, setSelected] = useState<AreaKey>("ADMINISTRACION");

  useEffect(() => {
    fetch("/api/dashboard/tareas-areas")
      .then(r => r.json())
      .then(d => { if (d.areas) setData(d.areas); });
  }, []);

  if (!data) return <Skeleton />;

  const selData = data.find(d => d.area === selected);
  const selMeta = AREA_META[selected];

  return (
    <div className="space-y-5">

      {/* ── Barras de progreso comparativo ─────────────────────────────── */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 space-y-4">
        <p className="text-[11px] text-[#444] uppercase tracking-widest font-semibold mb-4">
          Avance este mes — tareas completadas
        </p>
        {data.map(d => {
          const meta   = AREA_META[d.area as AreaKey];
          const status = getStatus(d.progress);
          return (
            <button
              key={d.area}
              onClick={() => setSelected(d.area as AreaKey)}
              className="w-full flex items-center gap-4 group"
            >
              <span className="text-sm text-[#666] group-hover:text-white transition-colors w-32 text-left shrink-0 truncate">
                {meta.label}
              </span>
              <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${d.progress}%`, backgroundColor: status.barClr }}
                />
              </div>
              <span className="text-sm font-semibold text-white w-10 text-right shrink-0 tabular-nums">
                {d.progress}%
              </span>
              <span className={`text-xs font-medium w-20 text-left shrink-0 ${status.textCls}`}>
                {status.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 4 tarjetas indicadoras ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.map(d => {
          const meta    = AREA_META[d.area as AreaKey];
          const status  = getStatus(d.progress);
          const isSel   = selected === d.area;
          return (
            <button
              key={d.area}
              onClick={() => setSelected(d.area as AreaKey)}
              className={`text-left p-4 rounded-2xl border transition-all duration-150 ${
                isSel
                  ? "bg-[#111] border-[#2a2a2a] shadow-lg"
                  : "bg-[#0a0a0a] border-[#161616] hover:border-[#242424] hover:bg-[#0d0d0d]"
              }`}
              style={isSel ? { borderColor: meta.color + "40" } : undefined}
            >
              {/* Area header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                <span className="text-[13px] font-semibold text-white truncate">{meta.label}</span>
              </div>

              {/* Progress + status */}
              <p className={`text-3xl font-bold leading-none mb-1 ${status.textCls}`}>
                {d.progress}%
              </p>
              <p className={`text-xs font-medium mb-4 ${status.textCls}`}>{status.label}</p>

              {/* Counts */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#444]">Completadas mes</span>
                  <span className="text-[11px] font-semibold text-white">{d.counts.completadasMes}</span>
                </div>
                {d.counts.hoy > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#444]">Para hoy</span>
                    <span className="text-[11px] font-semibold text-emerald-400">{d.counts.hoy}</span>
                  </div>
                )}
                {d.counts.vencidas > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#444]">Vencidas</span>
                    <span className="text-[11px] font-semibold text-red-400">{d.counts.vencidas}</span>
                  </div>
                )}
                {d.counts.proximas > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#444]">Próximas</span>
                    <span className="text-[11px] font-semibold text-[#888]">{d.counts.proximas}</span>
                  </div>
                )}
                {d.counts.hoy === 0 && d.counts.vencidas === 0 && d.counts.proximas === 0 && (
                  <span className="text-[11px] text-[#2a2a2a]">Sin tareas programadas</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Detalle de área seleccionada ────────────────────────────────── */}
      {selData && (
        <div
          key={selected}
          className="bg-[#0a0a0a] border rounded-2xl overflow-hidden"
          style={{ borderColor: selMeta.color + "30" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#141414]">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selMeta.color }} />
              <span className="font-semibold text-white">{selMeta.label}</span>
              <span className="text-[#3a3a3a] text-sm">
                {selData.counts.totalActivas} activas · {selData.counts.completadasMes} completadas este mes
              </span>
            </div>
            <Link
              href="/operaciones"
              className="text-xs text-[#B3985B] hover:underline shrink-0"
            >
              Ver en Gestión operativa →
            </Link>
          </div>

          {/* Task sections */}
          <div className="px-6 py-5 space-y-7">

            {/* Hoy */}
            <TaskSection
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              }
              label="Para hoy"
              count={selData.counts.hoy}
              tasks={selData.tareas.hoy}
              badgeCls="bg-emerald-950/40 text-emerald-400"
              emptyMsg="Sin tareas para hoy"
            />

            {/* Vencidas */}
            <TaskSection
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              }
              label="Vencidas"
              count={selData.counts.vencidas}
              tasks={selData.tareas.vencidas}
              badgeCls="bg-red-950/40 text-red-400"
              emptyMsg="Sin tareas vencidas ✓"
            />

            {/* Próximas */}
            <TaskSection
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              }
              label="Próximas 14 días"
              count={selData.counts.proximas}
              tasks={selData.tareas.proximas}
              badgeCls="bg-[#1a1a1a] text-[#888]"
              emptyMsg="Sin tareas programadas en los próximos 14 días"
            />

            {/* Sin fecha */}
            {selData.counts.sinFecha > 0 && (
              <TaskSection
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                }
                label="Sin programar"
                count={selData.counts.sinFecha}
                tasks={selData.tareas.sinFecha}
                badgeCls="bg-[#1a1a1a] text-[#555]"
                emptyMsg=""
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
