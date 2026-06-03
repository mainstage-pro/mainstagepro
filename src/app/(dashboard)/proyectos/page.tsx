"use client";

import { useEffect, useState, Fragment } from "react";
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
  PLANEACION:        "text-blue-500/60",
  CONFIRMADO:        "text-emerald-500/60",
  EN_CURSO:          "text-yellow-500/60",
  PENDIENTE_CIERRE:  "text-orange-500/70",
  COMPLETADO:        "text-gray-500/50",
  CANCELADO:         "text-red-500/40",
};

// Prioridad de estado dentro de cada grupo — igual que etapa en tratos
const ESTADO_ORDEN: Record<string, number> = {
  EN_CURSO: 0, CONFIRMADO: 1, PLANEACION: 2, PENDIENTE_CIERRE: 3, COMPLETADO: 4, CANCELADO: 5,
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

function grupoMesFn(fechaIso: string) {
  const [y, m] = fechaIso.slice(0, 7).split("-");
  return { key: fechaIso.slice(0, 7), label: `${MESES_ES[parseInt(m) - 1]} ${y}` };
}

function grupoSemanaFn(fechaIso: string) {
  const d = new Date(fechaIso + "T12:00:00");
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
  const lunes = new Date(d); lunes.setDate(d.getDate() - dow);
  const dom   = new Date(lunes); dom.setDate(lunes.getDate() + 6);
  const key = lunes.toISOString().slice(0, 10);
  const fmt = (x: Date) => x.toLocaleDateString("es-MX", { timeZone: "UTC", day: "numeric", month: "short" });
  return { key, label: `${fmt(lunes)} – ${fmt(dom)}` };
}

// ── Fila compacta ─────────────────────────────────────────────────────────────
function ProyectoRow({ p, deletingId, eliminar }: {
  p: Proyecto;
  deletingId: string | null;
  eliminar: (id: string, nombre: string, e: React.MouseEvent) => void;
}) {
  return (
    <Link href={`/proyectos/${p.id}`} className="block">
      <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#0a0a0a] group cursor-pointer transition-colors">

        <span className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: TIPO_EVENTO_COLORS[p.tipoEvento] ?? "#333" }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-white text-sm font-medium leading-snug">{p.cliente?.nombre ?? p.nombre}</span>
            {p.cliente?.nombre && (
              <span className="text-gray-600 text-xs truncate max-w-[160px]">{p.nombre}</span>
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
          {typeof p.avance === 'number' && p.avance > 0 && (
            <div className="mt-1 h-0.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#B3985B] transition-all"
                style={{ width: `${p.avance}%` }}
              />
            </div>
          )}
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
  const [busqueda, setBusqueda] = useState("");
  const [agrupacion, setAgrupacion] = useState<"todos" | "mes" | "semana">("mes");
  const [gruposOpen, setGruposOpen] = useState<Record<string, boolean>>({});
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);

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

  const hoy = new Date().toISOString().split("T")[0];

  // Próximos = fecha de evento >= hoy o sin fecha
  const proximos = proyectos
    .filter(p => !p.fechaEvento || p.fechaEvento.substring(0, 10) >= hoy)
    .sort((a, b) => new Date(a.fechaEvento ?? "9999").getTime() - new Date(b.fechaEvento ?? "9999").getTime());

  // Pasados = fecha de evento ya ocurrió, más reciente primero
  const pasados = proyectos
    .filter(p => !!p.fechaEvento && p.fechaEvento.substring(0, 10) < hoy)
    .sort((a, b) => new Date(b.fechaEvento).getTime() - new Date(a.fechaEvento).getTime());

  const q = busqueda.toLowerCase();
  function filtrar(list: Proyecto[]) {
    return !q ? list : list.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.numeroProyecto?.toLowerCase().includes(q) ||
      p.cliente?.nombre?.toLowerCase().includes(q)
    );
  }

  const proximosFiltrados = filtrar(proximos);
  const pasadosFiltrados  = filtrar(pasados);

  const pendientesCierreCount = proyectos.filter(p => p.estado === 'PENDIENTE_CIERRE').length;

  // Agrupación con orden de estado dentro de cada grupo
  type Grupo = { key: string; label: string; items: Proyecto[] };

  function agrupar(list: Proyecto[]): Grupo[] {
    if (agrupacion === "todos") return [{ key: "todos", label: "", items: list }];
    const map = new Map<string, Grupo>();
    const sinFecha: Proyecto[] = [];
    for (const p of list) {
      if (!p.fechaEvento) { sinFecha.push(p); continue; }
      const g = agrupacion === "mes"
        ? grupoMesFn(p.fechaEvento.substring(0, 10))
        : grupoSemanaFn(p.fechaEvento.substring(0, 10));
      if (!map.has(g.key)) map.set(g.key, { ...g, items: [] });
      map.get(g.key)!.items.push(p);
    }
    const sorted = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
    // Ordenar dentro de cada grupo: EN_CURSO → CONFIRMADO → PLANEACION
    for (const g of sorted) {
      g.items.sort((a, b) => (ESTADO_ORDEN[a.estado] ?? 9) - (ESTADO_ORDEN[b.estado] ?? 9));
    }
    if (sinFecha.length) sorted.push({ key: "sin-fecha", label: "Sin fecha", items: sinFecha });
    return sorted;
  }

  const grupos = agrupar(proximosFiltrados);

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Proyectos de evento</h1>
          <p className="text-[#6b7280] text-sm">
            {loading ? "Cargando..." : `${proximos.length} próximos · ${pasados.length} pasados`}
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

          {/* Búsqueda — línea propia, igual que tratos */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
            </svg>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, número o cliente..."
              className="w-full bg-[#111] border border-[#1e1e1e] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50" />
            {busqueda && (
              <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white text-xs">✕</button>
            )}
          </div>

          {/* Filtro rápido PENDIENTE_CIERRE */}
          {pendientesCierreCount > 0 && (
            <button
              onClick={() => setFiltroEstado(filtroEstado === 'PENDIENTE_CIERRE' ? null : 'PENDIENTE_CIERRE')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                filtroEstado === 'PENDIENTE_CIERRE'
                  ? 'bg-orange-500/15 text-orange-400 border-orange-500/40'
                  : 'bg-transparent text-orange-400/60 border-orange-500/20 hover:border-orange-500/40 hover:text-orange-400'
              }`}
            >
              <span>⚠</span>
              <span>Pendiente cierre</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filtroEstado === 'PENDIENTE_CIERRE' ? 'bg-orange-500/30' : 'bg-orange-500/10'
              }`}>{pendientesCierreCount}</span>
            </button>
          )}

          {/* Barra de controles — igual estructura que tratos */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Agrupación */}
            <div className="flex items-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-0.5 shrink-0">
              {(["todos","mes","semana"] as const).map(ag => (
                <button key={ag} onClick={() => setAgrupacion(ag)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${agrupacion === ag ? "bg-[#2a2a2a] text-white" : "text-[#555] hover:text-white"}`}>
                  {ag === "todos" ? "Todo" : ag === "mes" ? "Por mes" : "Por semana"}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido */}
          {loading ? (
            <SkeletonPage rows={6} cols={3} />
          ) : filtroEstado ? (
            <div className="space-y-2">
              <div className="px-4 py-2 text-xs text-orange-400/70 font-medium flex items-center gap-2">
                <span>Mostrando solo: {ESTADO_PROYECTO_LABELS[filtroEstado] ?? filtroEstado} ({proyectos.filter(p => p.estado === filtroEstado).length})</span>
                <button onClick={() => setFiltroEstado(null)} className="text-gray-500 hover:text-white">✕ Quitar filtro</button>
              </div>
              {proyectos.filter(p => p.estado === filtroEstado).length === 0 ? (
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl text-center py-12">
                  <p className="text-gray-600 text-sm">No hay proyectos con este estado</p>
                </div>
              ) : (
                <div className="rounded-xl border border-[#1a1a1a] overflow-hidden">
                  <div className="divide-y divide-[#111]">
                    {proyectos.filter(p => p.estado === filtroEstado).map(p => <ProyectoRow key={p.id} p={p} deletingId={deletingId} eliminar={eliminar} />)}
                  </div>
                </div>
              )}
            </div>
          ) : proximosFiltrados.length === 0 && pasadosFiltrados.length === 0 ? (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl text-center py-12">
              <p className="text-gray-600 text-sm">{busqueda ? "Sin resultados" : "No hay proyectos"}</p>
              {!busqueda && <p className="text-[#444] text-xs mt-1">Los proyectos se crean al aprobar una cotización</p>}
            </div>
          ) : (
            <div className="space-y-5">

              {/* Próximos agrupados */}
              {proximosFiltrados.length > 0 && (agrupacion === "todos" ? (
                <div className="rounded-xl border border-[#1a1a1a] overflow-hidden">
                  <div className="divide-y divide-[#111]">
                    {proximosFiltrados.map(p => <ProyectoRow key={p.id} p={p} deletingId={deletingId} eliminar={eliminar} />)}
                  </div>
                </div>
              ) : (
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
                              {grupo.items.map(p => <ProyectoRow key={p.id} p={p} deletingId={deletingId} eliminar={eliminar} />)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Pasados — mismo separador que tratos */}
              {pasadosFiltrados.length > 0 && (
                <div>
                  <div className="flex items-center gap-4 py-3">
                    <div className="flex-1 h-px bg-[#161616]" />
                    <span className="text-[10px] text-gray-700 uppercase tracking-widest">Pasados · {pasadosFiltrados.length}</span>
                    <div className="flex-1 h-px bg-[#161616]" />
                  </div>
                  <div className="rounded-xl border border-[#1a1a1a] overflow-hidden">
                    {(() => {
                      let lastMonth = "";
                      return pasadosFiltrados.map(p => {
                        const monthKey = p.fechaEvento?.substring(0, 7) ?? "";
                        const showHeader = !!monthKey && monthKey !== lastMonth;
                        if (showHeader) lastMonth = monthKey;
                        const [y, m] = monthKey.split("-");
                        const monthLabel = monthKey
                          ? new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" })
                          : "";
                        return (
                          <Fragment key={p.id}>
                            {showHeader && (
                              <div className="px-4 py-2 bg-[#0a0a0a] border-b border-[#161616]">
                                <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-semibold capitalize">{monthLabel}</span>
                              </div>
                            )}
                            <div className="opacity-50 border-b border-[#111] last:border-0">
                              <ProyectoRow p={p} deletingId={deletingId} eliminar={eliminar} />
                            </div>
                          </Fragment>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}
