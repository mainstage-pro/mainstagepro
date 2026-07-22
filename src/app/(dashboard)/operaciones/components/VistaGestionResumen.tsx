"use client";

import { useEffect, useState } from "react";

// ── Dashboard de Gestión Operativa ───────────────────────────────────────────
// Resumen por usuario, orientado a la ejecución. Muestra, en columnas
// horizontales, los pendientes de los 4 sistemas operativos:
//   TAREA · PLAN · EVENTO · PROYECTO
// Cada usuario ve lo suyo; el admin ve a todos en orden fijo.

const SISTEMAS: { key: string; label: string; color: string }[] = [
  { key: "TAREA",    label: "Tareas",              color: "#9ca3af" },
  { key: "EVENTO",   label: "Proyectos de evento", color: "#60a5fa" },
  { key: "PROYECTO", label: "Proyectos de empresa",color: "#818cf8" },
];

interface Pendiente {
  id: string;
  titulo: string;
  prioridad: string;
  estado: string;
  fecha: string | null;
  vencimiento: string | null;
  vencida: boolean;
  contexto: string | null;
}
interface SistemaData { key: string; pendientes: Pendiente[] }
interface UsuarioResumen {
  id: string;
  name: string;
  area: string | null;
  asignadas: number;
  completadas: number;
  pendientes: number;
  vencidas: number;
  pct: number;
  sistemas: SistemaData[];
}
interface RespData { isAdmin: boolean; currentUserId: string; usuarios: UsuarioResumen[] }

function prioColor(p: string) {
  if (p === "URGENTE") return "#ef4444";
  if (p === "ALTA")    return "#f97316";
  if (p === "MEDIA")   return "#eab308";
  return "#6b7280";
}

function fmtFecha(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${parseInt(d, 10)} ${meses[parseInt(m, 10) - 1]}`;
}

export function VistaGestionResumen() {
  const [data, setData]       = useState<RespData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch("/api/operaciones/gestion-resumen")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { if (vivo) { setData(d); setLoading(false); } })
      .catch(() => { if (vivo) { setError(true); setLoading(false); } });
    return () => { vivo = false; };
  }, []);

  if (loading) {
    return <div className="p-8 text-sm text-[#555]">Cargando resumen…</div>;
  }
  if (error || !data) {
    return <div className="p-8 text-sm text-red-400">No se pudo cargar el resumen.</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto h-full" style={{ scrollbarWidth: "thin" }}>
      <div>
        <h1 className="text-lg font-semibold text-white">Resumen de gestión</h1>
        <p className="text-xs text-[#666] mt-0.5">
          {data.isAdmin
            ? "Avance de cada persona y sus pendientes por sistema operativo."
            : "Tu avance y tus pendientes por sistema operativo."}
        </p>
      </div>

      {data.usuarios.map(u => (
        <UsuarioCard key={u.id} u={u} esYo={u.id === data.currentUserId} />
      ))}

      {data.usuarios.length === 0 && (
        <div className="text-sm text-[#555]">Sin usuarios para mostrar.</div>
      )}
    </div>
  );
}

function UsuarioCard({ u, esYo }: { u: UsuarioResumen; esYo: boolean }) {
  return (
    <section className="rounded-xl border border-white/[0.06] bg-[#0d0d0d] overflow-hidden">
      {/* Header con métricas */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.015]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-white truncate">{u.name}</span>
          {esYo && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#B3985B]/15 text-[#B3985B] font-medium">Tú</span>
          )}
          {u.area && <span className="text-[10px] text-[#555] uppercase tracking-wide">{u.area}</span>}
        </div>

        <div className="flex items-center gap-4 ml-auto text-xs">
          <Metric label="Asignadas"   value={u.asignadas} color="#9ca3af" />
          <Metric label="Completadas" value={u.completadas} color="#34d399" />
          <Metric label="Pendientes"  value={u.pendientes} color="#eab308" />
          <Metric label="Vencidas"    value={u.vencidas} color={u.vencidas > 0 ? "#ef4444" : "#555"} />
          <div className="flex items-center gap-2 pl-2">
            <div className="w-24 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${u.pct}%`, background: "#B3985B" }} />
            </div>
            <span className="text-[#B3985B] font-semibold tabular-nums">{u.pct}%</span>
          </div>
        </div>
      </div>

      {/* 4 columnas horizontales — pendientes de corrido */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.05]">
        {SISTEMAS.map(sis => {
          const bloque = u.sistemas.find(s => s.key === sis.key);
          const items = bloque?.pendientes ?? [];
          return (
            <div key={sis.key} className="p-3 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sis.color }} />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#888]">{sis.label}</span>
                <span className="text-[11px] text-[#555] ml-auto tabular-nums">{items.length}</span>
              </div>

              {items.length === 0 ? (
                <p className="text-[11px] text-[#3a3a3a] italic py-1">Sin pendientes</p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map(t => (
                    <li key={t.id} className="group">
                      <div className="flex items-start gap-1.5">
                        <span
                          className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: prioColor(t.prioridad) }}
                          title={t.prioridad}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[12px] leading-tight text-[#d4d4d4] block">{t.titulo}</span>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            {t.contexto && (
                              <span className="text-[10px] text-[#555] truncate max-w-[140px]">{t.contexto}</span>
                            )}
                            {(t.vencimiento || t.fecha) && (
                              <span className={`text-[10px] ${t.vencida ? "text-red-400 font-medium" : "text-[#555]"}`}>
                                {t.vencida ? "⚠ " : ""}{fmtFecha(t.vencimiento ?? t.fecha)}
                              </span>
                            )}
                            {t.estado === "EN_PROGRESO" && (
                              <span className="text-[10px] text-blue-400">En progreso</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center leading-tight">
      <span className="font-semibold tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[9px] uppercase tracking-wide text-[#555]">{label}</span>
    </div>
  );
}
