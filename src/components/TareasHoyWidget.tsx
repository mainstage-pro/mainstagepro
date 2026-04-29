"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface TareaR {
  id: string;
  titulo: string;
  prioridad: string;
  fecha: string | null;
  asignadoA: { id: string; name: string } | null;
}

interface AreaData {
  area: string;
  counts: { hoy: number; vencidas: number; proximas: number; sinFecha: number; totalActivas: number; completadasMes: number };
  progress: number;
  tareas: { hoy: TareaR[]; vencidas: TareaR[] };
}

interface UsuarioStat {
  id: string;
  name: string;
  asignadas: number;
  completadas: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const AREA_CFG: Record<string, { label: string; color: string }> = {
  ADMINISTRACION: { label: "Admin",      color: "#6366f1" },
  MARKETING:      { label: "Marketing",  color: "#ec4899" },
  VENTAS:         { label: "Ventas",     color: "#B3985B" },
  PRODUCCION:     { label: "Producción", color: "#10b981" },
};

const PRIO_DOT: Record<string, string> = {
  URGENTE: "bg-red-500", ALTA: "bg-orange-500", MEDIA: "bg-yellow-600", BAJA: "bg-[#444]",
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => (
          <div key={i} className="h-48 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-32 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl animate-pulse" />
    </div>
  );
}

// ── AreaCard ──────────────────────────────────────────────────────────────────

function AreaCard({ data }: { data: AreaData }) {
  const cfg    = AREA_CFG[data.area] ?? { label: data.area, color: "#555" };
  const tareas = data.tareas.hoy.slice(0, 5);
  const extra  = data.counts.hoy - tareas.length;
  const pct    = data.progress;

  return (
    <div className="flex flex-col bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]"
           style={{ borderLeftWidth: 3, borderLeftColor: cfg.color }}>
        <span className="text-xs font-semibold uppercase tracking-wider text-white">{cfg.label}</span>
        <div className="flex items-center gap-2">
          {data.counts.vencidas > 0 && (
            <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">
              {data.counts.vencidas} venc.
            </span>
          )}
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ color: cfg.color, backgroundColor: cfg.color + "15" }}>
            {data.counts.hoy} hoy
          </span>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 px-4 py-3 space-y-2 min-h-[100px]">
        {tareas.length === 0 ? (
          <p className="text-[12px] text-[#333] mt-2">Sin tareas para hoy</p>
        ) : (
          tareas.map(t => (
            <Link
              key={t.id}
              href={`/operaciones?open=${t.id}`}
              className="flex items-center gap-2 group"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIO_DOT[t.prioridad] ?? PRIO_DOT.BAJA}`} />
              <span className="text-[12px] text-[#999] group-hover:text-white transition-colors truncate leading-snug">
                {t.titulo}
              </span>
              {t.asignadoA && (
                <span className="ml-auto shrink-0 w-5 h-5 rounded-full bg-[#1a1a1a] text-[10px] text-[#666] flex items-center justify-center font-bold">
                  {t.asignadoA.name.charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
          ))
        )}
        {extra > 0 && (
          <Link href="/operaciones" className="text-[11px] text-[#444] hover:text-[#666] transition-colors">
            +{extra} más
          </Link>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#444]">Efectividad del mes</span>
          <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>{pct}%</span>
        </div>
        <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
               style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
        </div>
      </div>
    </div>
  );
}

// ── UserEfectividad ───────────────────────────────────────────────────────────

function UserEfectividad({ usuarios }: { usuarios: UsuarioStat[] }) {
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#555]">Efectividad por usuario</span>
        <span className="text-[10px] text-[#333]">mes actual</span>
      </div>
      <div className="divide-y divide-[#111]">
        {usuarios.map(u => {
          const pct  = u.asignadas > 0 ? Math.round((u.completadas / u.asignadas) * 100) : 0;
          const clr  = pct >= 70 ? "#10b981" : pct >= 40 ? "#B3985B" : "#ef4444";
          const initials = u.name.split(" ").slice(0,2).map(n => n[0]).join("").toUpperCase();
          return (
            <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-7 h-7 rounded-full bg-[#1a1a1a] text-[11px] text-[#666] flex items-center justify-center font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] text-[#bbb] truncate">{u.name}</span>
                  <span className="text-[11px] text-[#444] shrink-0 ml-3">
                    {u.completadas}/{u.asignadas}
                  </span>
                </div>
                <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                       style={{ width: `${pct}%`, backgroundColor: clr }} />
                </div>
              </div>
              <span className="text-[12px] font-semibold shrink-0 w-9 text-right" style={{ color: clr }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TareasHoyWidget() {
  const [areas,    setAreas]    = useState<AreaData[] | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioStat[]>([]);

  useEffect(() => {
    fetch("/api/dashboard/tareas-areas")
      .then(r => r.json())
      .then(d => {
        if (d.areas)    setAreas(d.areas);
        if (d.usuarios) setUsuarios(d.usuarios);
      });
  }, []);

  if (!areas) return <Skeleton />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {areas.map(a => <AreaCard key={a.area} data={a} />)}
      </div>
      {usuarios.length > 0 && <UserEfectividad usuarios={usuarios} />}
    </div>
  );
}
