"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ESTADO_PROYECTO_LABELS, TIPO_EVENTO_LABELS, TIPO_EVENTO_COLORS } from "@/lib/constants";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Proyecto = any;

const TIPO_SERVICIO_LABELS: Record<string, string> = {
  PRODUCCION_TECNICA: "Producción",
  RENTA: "Renta",
  DIRECCION_TECNICA: "Dirección",
};

const ESTADO_TEXT: Record<string, string> = {
  PLANEACION: "text-blue-500/60",
  CONFIRMADO: "text-emerald-500/60",
  EN_CURSO:   "text-yellow-500/60",
  COMPLETADO: "text-gray-500/50",
  CANCELADO:  "text-red-500/40",
};

const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fmtFecha(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", {
      timeZone: "UTC", day: "numeric", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

function grupoMes(fechaIso: string) {
  const [y, m] = fechaIso.slice(0, 7).split("-");
  return { key: fechaIso.slice(0, 7), label: `${MESES_ES[parseInt(m) - 1]} ${y}` };
}

// ── Fila compacta ─────────────────────────────────────────────────────────────
function ProyectoRow({ p, deletingId, eliminar }: {
  p: Proyecto;
  deletingId: string | null;
  eliminar: (id: string, nombre: string, e: React.MouseEvent) => void;
}) {
  return (
    <Link href={`/proyectos/${p.id}`}>
      <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#0a0a0a] group cursor-pointer transition-colors">

        <span className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: TIPO_EVENTO_COLORS[p.tipoEvento] ?? "#333" }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-white text-sm font-medium leading-snug">{p.nombre}</span>
            {p.cliente?.nombre && (
              <span className="text-gray-600 text-xs truncate max-w-[160px]">{p.cliente.nombre}</span>
            )}
            <span className={`text-[10px] font-medium uppercase tracking-wide ${ESTADO_TEXT[p.estado] ?? "text-gray-700"}`}>
              {ESTADO_PROYECTO_LABELS[p.estado] ?? p.estado}
            </span>
          </div>
          <p className="text-gray-600 text-[11px] mt-0.5 truncate">
            {p.numeroProyecto}
            {p.tipoServicio && ` · ${TIPO_SERVICIO_LABELS[p.tipoServicio] ?? p.tipoServicio}`}
            {p.lugarEvento && ` · ${p.lugarEvento}`}
          </p>
        </div>

        <div className="shrink-0 text-right min-w-[72px] hidden sm:block">
          <span className="text-xs text-gray-500">{fmtFecha(p.fechaEvento)}</span>
        </div>

        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => eliminar(p.id, p.nombre, e)}
            disabled={deletingId === p.id}
            className="text-[#252525] hover:text-red-500/60 transition-colors disabled:opacity-40">
            {deletingId === p.id ? (
              <span className="text-[10px] text-gray-600">...</span>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  const [view, setView] = useState<"list" | "timeline">("list");
  const [tab, setTab] = useState<"proximos" | "pasados">("proximos");
  const [busqueda, setBusqueda] = useState("");
  const [gruposOpen, setGruposOpen] = useState<Record<string, boolean>>({});

  // timeline
  const [timelineMes, setTimelineMes] = useState(() => {
    const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  useEffect(() => {
    fetch("/api/proyectos")
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setProyectos(data.proyectos ?? []);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  async function eliminar(id: string, nombre: string, e: React.MouseEvent) {
    e.preventDefault();
    const ok = await confirm({ message: `¿Eliminar el proyecto "${nombre}"? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/proyectos/${id}`, { method: "DELETE" });
      if (res.ok) { setProyectos(prev => prev.filter(p => p.id !== id)); toast.success("Proyecto eliminado"); }
      else { const d = await res.json(); toast.error(d.error ?? "Error al eliminar"); }
    } finally { setDeletingId(null); }
  }

  // Próximos = activos (no completado/cancelado), orden cronológico
  const proximos = proyectos
    .filter(p => p.estado !== "COMPLETADO" && p.estado !== "CANCELADO")
    .sort((a, b) => new Date(a.fechaEvento ?? "9999").getTime() - new Date(b.fechaEvento ?? "9999").getTime());

  // Pasados = completados/cancelados, más reciente primero
  const pasados = proyectos
    .filter(p => p.estado === "COMPLETADO" || p.estado === "CANCELADO")
    .sort((a, b) => new Date(b.fechaEvento ?? "0").getTime() - new Date(a.fechaEvento ?? "0").getTime());

  const lista = tab === "proximos" ? proximos : pasados;
  const listaFiltrada = lista.filter(p => {
    const q = busqueda.toLowerCase();
    return !q ||
      p.nombre.toLowerCase().includes(q) ||
      p.numeroProyecto?.toLowerCase().includes(q) ||
      p.cliente?.nombre?.toLowerCase().includes(q);
  });

  // Agrupar próximos por mes
  function agrupar(list: Proyecto[]) {
    const map = new Map<string, { key: string; label: string; items: Proyecto[] }>();
    const sinFecha: Proyecto[] = [];
    for (const p of list) {
      if (!p.fechaEvento) { sinFecha.push(p); continue; }
      const g = grupoMes(p.fechaEvento.substring(0, 10));
      if (!map.has(g.key)) map.set(g.key, { ...g, items: [] });
      map.get(g.key)!.items.push(p);
    }
    const sorted = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
    if (sinFecha.length) sorted.push({ key: "sin-fecha", label: "Sin fecha", items: sinFecha });
    return sorted;
  }

  const grupos = agrupar(listaFiltrada);

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Proyectos</h1>
          <p className="text-gray-600 text-sm">
            {loading ? "Cargando..." : `${proximos.length} próximos · ${pasados.length} completados`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-0.5">
            <button onClick={() => setView("list")}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${view === "list" ? "bg-[#2a2a2a] text-white" : "text-[#555] hover:text-white"}`}>
              Lista
            </button>
            <button onClick={() => setView("timeline")}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${view === "timeline" ? "bg-[#2a2a2a] text-white" : "text-[#555] hover:text-white"}`}>
              Calendario
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
          <p className="font-semibold mb-1">Error al cargar proyectos:</p>
          <pre className="text-xs whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {/* ── TIMELINE / CALENDARIO ── */}
      {view === "timeline" && !loading && (() => {
        const year = timelineMes.getFullYear();
        const month = timelineMes.getMonth();
        const diasEnMes = new Date(year, month + 1, 0).getDate();
        const primerDia = new Date(year, month, 1).getDay();
        const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

        const proyectosMes = proyectos.filter(p => {
          if (!p.fechaEvento) return false;
          const f = new Date(p.fechaEvento.substring(0, 10) + "T12:00:00Z");
          return f.getUTCFullYear() === year && f.getUTCMonth() === month;
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const diaMap: Record<number, any[]> = {};
        for (const p of proyectosMes) {
          const d = new Date(p.fechaEvento.substring(0, 10) + "T12:00:00Z").getUTCDate();
          if (!diaMap[d]) diaMap[d] = [];
          diaMap[d].push(p);
        }

        return (
          <div className="overflow-x-auto">
            <div className="min-w-[320px]">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setTimelineMes(new Date(year, month - 1, 1))} className="text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-[#222] hover:border-[#333] text-sm transition-colors">← Anterior</button>
                <div className="text-center">
                  <p className="text-white font-semibold">{MESES_ES[month]} {year}</p>
                  <p className="text-gray-600 text-xs">{proyectosMes.length} proyecto{proyectosMes.length !== 1 ? "s" : ""} este mes</p>
                </div>
                <button onClick={() => setTimelineMes(new Date(year, month + 1, 1))} className="text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-[#222] hover:border-[#333] text-sm transition-colors">Siguiente →</button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DIAS.map(d => <div key={d} className="text-center text-[10px] text-gray-600 font-semibold py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: primerDia }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: diasEnMes }).map((_, i) => {
                  const dia = i + 1;
                  const psDia = diaMap[dia] ?? [];
                  const hoy = new Date();
                  const esHoy = hoy.getFullYear() === year && hoy.getMonth() === month && hoy.getDate() === dia;
                  return (
                    <div key={dia} className={`min-h-[60px] rounded-lg p-1.5 border transition-colors ${psDia.length > 0 ? "bg-[#111] border-[#B3985B]/30" : esHoy ? "bg-[#1a1a1a] border-[#B3985B]/20" : "bg-[#0a0a0a] border-[#1a1a1a]"}`}>
                      <p className={`text-[10px] font-semibold mb-1 ${esHoy ? "text-[#B3985B]" : "text-gray-600"}`}>{dia}</p>
                      {psDia.map((p: Proyecto) => (
                        <a key={p.id} href={`/proyectos/${p.id}`}
                          className="block text-[9px] leading-tight px-1 py-0.5 rounded mb-0.5 truncate hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: `${TIPO_EVENTO_COLORS[p.tipoEvento] ?? "#333"}20`, color: TIPO_EVENTO_COLORS[p.tipoEvento] ?? "#888", border: `1px solid ${TIPO_EVENTO_COLORS[p.tipoEvento] ?? "#333"}40` }}
                          title={p.nombre}>
                          {p.nombre}
                        </a>
                      ))}
                    </div>
                  );
                })}
              </div>
              {proyectosMes.length > 0 && (
                <div className="mt-6 space-y-1">
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-3">Proyectos en {MESES_ES[month]}</p>
                  {proyectosMes.sort((a: Proyecto, b: Proyecto) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime()).map((p: Proyecto) => (
                    <Link key={p.id} href={`/proyectos/${p.id}`} className="flex items-center gap-3 bg-[#111] border border-[#1e1e1e] hover:border-[#333] rounded-xl px-4 py-3 transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TIPO_EVENTO_COLORS[p.tipoEvento] ?? "#333" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
                        <p className="text-gray-600 text-xs">{p.cliente?.nombre}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white text-xs">{new Date(p.fechaEvento).toLocaleDateString("es-MX", { timeZone: "UTC", weekday: "short", day: "numeric" })}</p>
                        <span className={`text-[10px] ${ESTADO_TEXT[p.estado] ?? "text-gray-500"}`}>{ESTADO_PROYECTO_LABELS[p.estado] ?? p.estado}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── LISTA ── */}
      {view === "list" && (
        <div className="space-y-4">

          {/* Tabs + búsqueda */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-0.5">
              <button onClick={() => setTab("proximos")}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 ${tab === "proximos" ? "bg-[#2a2a2a] text-white" : "text-[#555] hover:text-white"}`}>
                Próximos
                <span className={`text-[10px] ${tab === "proximos" ? "text-gray-400" : "text-gray-700"}`}>{proximos.length}</span>
              </button>
              <button onClick={() => setTab("pasados")}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 ${tab === "pasados" ? "bg-[#2a2a2a] text-white" : "text-[#555] hover:text-white"}`}>
                Pasados
                <span className={`text-[10px] ${tab === "pasados" ? "text-gray-400" : "text-gray-700"}`}>{pasados.length}</span>
              </button>
            </div>

            <div className="relative flex-1 min-w-[180px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
              </svg>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar proyecto, número o cliente..."
                className="w-full bg-[#111] border border-[#1e1e1e] rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50" />
              {busqueda && (
                <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white text-xs">✕</button>
              )}
            </div>
          </div>

          {/* Contenido */}
          {loading ? (
            <SkeletonPage rows={6} cols={3} />
          ) : listaFiltrada.length === 0 ? (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl text-center py-12">
              <p className="text-gray-600 text-sm">
                {busqueda ? "Sin resultados" : tab === "proximos" ? "No hay proyectos próximos" : "No hay proyectos pasados"}
              </p>
              {tab === "proximos" && !busqueda && (
                <p className="text-[#444] text-xs mt-1">Los proyectos se crean al aprobar una cotización</p>
              )}
            </div>
          ) : tab === "proximos" ? (
            <div className="space-y-5">
              {grupos.map(grupo => {
                const isOpen = gruposOpen[grupo.key] ?? true;
                return (
                  <div key={grupo.key}>
                    <button
                      onClick={() => setGruposOpen(o => ({ ...o, [grupo.key]: !isOpen }))}
                      className="flex items-center gap-3 mb-2 w-full text-left">
                      <svg className={`w-3 h-3 text-gray-600 transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                      </svg>
                      <h2 className="text-xs font-semibold text-gray-300">{grupo.label}</h2>
                      <span className="text-[10px] text-gray-600">{grupo.items.length}</span>
                      <div className="flex-1 h-px bg-[#1a1a1a]" />
                    </button>
                    {isOpen && (
                      <div className="rounded-xl border border-[#1a1a1a] overflow-hidden">
                        <div className="divide-y divide-[#111]">
                          {grupo.items.map(p => (
                            <ProyectoRow key={p.id} p={p} deletingId={deletingId} eliminar={eliminar} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-[#1a1a1a] overflow-hidden">
              <div className="divide-y divide-[#111]">
                {listaFiltrada.map(p => (
                  <ProyectoRow key={p.id} p={p} deletingId={deletingId} eliminar={eliminar} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
