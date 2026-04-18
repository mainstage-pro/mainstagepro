"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ESTADO_PROYECTO_LABELS, ESTADO_PROYECTO_COLORS, TIPO_EVENTO_LABELS, TIPO_EVENTO_COLORS } from "@/lib/constants";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Proyecto = any;

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

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

  const activos = proyectos.filter(p => ["PLANEACION", "CONFIRMADO", "EN_CURSO"].includes(p.estado));
  const completados = proyectos.filter(p => p.estado === "COMPLETADO");
  const [view, setView] = useState<"list" | "timeline">("list");
  const [timelineMes, setTimelineMes] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");

  async function eliminar(id: string, nombre: string, e: React.MouseEvent) {
    e.preventDefault();
    const ok = await confirm({ message: `¿Eliminar el proyecto "${nombre}"? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/proyectos/${id}`, { method: "DELETE" });
      if (res.ok) { setProyectos(prev => prev.filter(p => p.id !== id)); toast.success("Proyecto eliminado"); }
      else { const d = await res.json(); toast.error(d.error ?? "Error al eliminar"); }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Proyectos</h1>
          <p className="text-[#6b7280] text-sm">
            {loading ? "Cargando..." : `${activos.length} activos · ${completados.length} completados`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-0.5">
            <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded-md text-xs transition-colors ${view === "list" ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-gray-300"}`}>Lista</button>
            <button onClick={() => setView("timeline")} className={`px-3 py-1.5 rounded-md text-xs transition-colors ${view === "timeline" ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-gray-300"}`}>Calendario</button>
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
        const primerDia = new Date(year, month, 1).getDay(); // 0=dom
        const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
        const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

        // Proyectos con fecha en este mes
        const proyectosMes = proyectos.filter(p => {
          if (!p.fechaEvento) return false;
          const f = new Date(p.fechaEvento);
          return f.getFullYear() === year && f.getMonth() === month;
        });

        // Map day → proyectos
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const diaMap: Record<number, any[]> = {};
        for (const p of proyectosMes) {
          const d = new Date(p.fechaEvento).getDate();
          if (!diaMap[d]) diaMap[d] = [];
          diaMap[d].push(p);
        }

        return (
          <div className="overflow-x-auto">
            <div className="min-w-[320px]">
            {/* Nav mes */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setTimelineMes(new Date(year, month - 1, 1))} className="text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-[#222] hover:border-[#333] text-sm transition-colors">← Anterior</button>
              <div className="text-center">
                <p className="text-white font-semibold">{MESES_ES[month]} {year}</p>
                <p className="text-gray-600 text-xs">{proyectosMes.length} proyecto{proyectosMes.length !== 1 ? "s" : ""} este mes</p>
              </div>
              <button onClick={() => setTimelineMes(new Date(year, month + 1, 1))} className="text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-[#222] hover:border-[#333] text-sm transition-colors">Siguiente →</button>
            </div>

            {/* Cabeceras días */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DIAS.map(d => <div key={d} className="text-center text-[10px] text-gray-600 font-semibold py-1">{d}</div>)}
            </div>

            {/* Celdas */}
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
                    {psDia.map(p => (
                      <a key={p.id} href={`/proyectos/${p.id}`}
                        className="block text-[9px] leading-tight px-1 py-0.5 rounded mb-0.5 truncate hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: `${TIPO_EVENTO_COLORS[p.tipoEvento] ?? "#333"}20`, color: TIPO_EVENTO_COLORS[p.tipoEvento] ?? "#888", border: `1px solid ${TIPO_EVENTO_COLORS[p.tipoEvento] ?? "#333"}40` }}
                        title={p.nombre}
                      >
                        {p.nombre}
                      </a>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Lista del mes */}
            {proyectosMes.length > 0 && (
              <div className="mt-6 space-y-2">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-3">Proyectos en {MESES_ES[month]}</p>
                {proyectosMes.sort((a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime()).map(p => (
                  <Link key={p.id} href={`/proyectos/${p.id}`} className="flex items-center gap-3 bg-[#111] border border-[#1e1e1e] hover:border-[#333] rounded-xl px-4 py-3 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TIPO_EVENTO_COLORS[p.tipoEvento] ?? "#333" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
                      <p className="text-gray-600 text-xs">{p.cliente?.nombre}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white text-xs">{new Date(p.fechaEvento).toLocaleDateString("es-MX", { weekday: "short", day: "numeric" })}</p>
                      <span className={`text-[10px] ${ESTADO_PROYECTO_COLORS[p.estado] ?? "text-gray-500"}`}>{ESTADO_PROYECTO_LABELS[p.estado] ?? p.estado}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            </div>
          </div>
        );
      })()}

      {view === "list" && loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : view === "list" && proyectos.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl text-center py-16">
          <p className="text-[#6b7280] text-sm">No hay proyectos aún</p>
          <p className="text-[#444] text-xs mt-1">Los proyectos se crean automáticamente al aprobar una cotización</p>
        </div>
      ) : view === "list" ? (() => {
        const tiposDisponibles = [...new Set(proyectos.map((p: Proyecto) => p.tipoEvento).filter(Boolean))];
        const proyectosFiltrados = proyectos.filter((p: Proyecto) => {
          const matchBusqueda = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.numeroProyecto?.toLowerCase().includes(busqueda.toLowerCase()) || p.cliente?.nombre?.toLowerCase().includes(busqueda.toLowerCase());
          const matchEstado = filtroEstado === "TODOS" || p.estado === filtroEstado;
          const matchTipo = filtroTipo === "TODOS" || p.tipoEvento === filtroTipo;
          return matchBusqueda && matchEstado && matchTipo;
        });
        return (
        <div className="space-y-3">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Buscar proyecto, número o cliente..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="flex-1 min-w-[200px] bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#B3985B]/50"
            />
            <div className="flex gap-1">
              {(["TODOS","PLANEACION","CONFIRMADO","EN_CURSO","COMPLETADO","CANCELADO"] as const).map(e => (
                <button key={e} onClick={() => setFiltroEstado(e)}
                  className={`text-[10px] px-2 py-1 rounded transition-colors ${filtroEstado === e ? "bg-[#B3985B] text-black font-semibold" : "bg-[#1a1a1a] text-gray-500 hover:text-white border border-[#222]"}`}>
                  {e === "TODOS" ? "Todos" : e === "PLANEACION" ? "Prep." : e === "EN_CURSO" ? "En curso" : e === "COMPLETADO" ? "Completado" : e === "CANCELADO" ? "Cancelado" : e.charAt(0) + e.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            {tiposDisponibles.length > 1 && (
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                className="bg-[#111] border border-[#222] rounded-lg px-2 py-1.5 text-[11px] text-gray-400 focus:outline-none focus:border-[#B3985B]/50">
                <option value="TODOS">Tipo: Todos</option>
                {tiposDisponibles.map((t: string) => (
                  <option key={t} value={t}>{TIPO_EVENTO_LABELS[t] ?? t}</option>
                ))}
              </select>
            )}
            {(busqueda || filtroEstado !== "TODOS" || filtroTipo !== "TODOS") && (
              <button onClick={() => { setBusqueda(""); setFiltroEstado("TODOS"); setFiltroTipo("TODOS"); }}
                className="text-[10px] text-gray-600 hover:text-white transition-colors px-2 py-1 rounded border border-[#222] bg-[#1a1a1a]">
                ✕ Limpiar
              </button>
            )}
          </div>
          {proyectosFiltrados.length === 0 && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl text-center py-12">
              <p className="text-gray-600 text-sm">Sin resultados para los filtros aplicados</p>
            </div>
          )}
          {proyectosFiltrados.map((proyecto: Proyecto) => {
            const checklistTotal = proyecto.checklist?.length ?? 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const checklistDone = proyecto.checklist?.filter((c: any) => c.completado).length ?? 0;
            const pct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const personalConfirmado = proyecto.personal?.filter((p: any) => p.confirmado).length ?? 0;
            const personalTotal = proyecto.personal?.length ?? 0;

            return (
              <Link key={proyecto.id} href={`/proyectos/${proyecto.id}`}>
                <div className="bg-[#111] border border-[#1e1e1e] hover:border-[#333] rounded-xl p-5 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: TIPO_EVENTO_COLORS[proyecto.tipoEvento] ?? "#333" }}
                        />
                        <span className="text-[10px] text-[#6b7280] uppercase tracking-wider">
                          {TIPO_EVENTO_LABELS[proyecto.tipoEvento] ?? proyecto.tipoEvento}
                        </span>
                        <span className="text-[#333] text-[10px]">·</span>
                        <span className="text-[10px] text-[#555]">{proyecto.numeroProyecto}</span>
                      </div>
                      <h3 className="text-white font-medium">{proyecto.nombre}</h3>
                      <Link href={`/crm/clientes/${proyecto.cliente?.id}`} onClick={e => e.stopPropagation()} className="text-[#6b7280] text-sm hover:text-[#B3985B] transition-colors">
                        {proyecto.cliente?.nombre}
                      </Link>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white text-sm font-medium">
                        {new Date(proyecto.fechaEvento).toLocaleDateString("es-MX", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      {proyecto.lugarEvento && (
                        <p className="text-[#6b7280] text-xs">{proyecto.lugarEvento}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#1a1a1a]">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_PROYECTO_COLORS[proyecto.estado] ?? "bg-gray-800 text-gray-400"}`}>
                      {ESTADO_PROYECTO_LABELS[proyecto.estado] ?? proyecto.estado}
                    </span>

                    {checklistTotal > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#B3985B] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#6b7280]">{pct}% checklist</span>
                      </div>
                    )}

                    {personalTotal > 0 && (
                      <span className="text-[10px] text-[#6b7280]">
                        Staff: {personalConfirmado}/{personalTotal}
                        {personalConfirmado < personalTotal && (
                          <span className="text-yellow-400 ml-1">⚠</span>
                        )}
                      </span>
                    )}

                    {proyecto.trato?.responsable && (
                      <span className="text-[10px] text-[#B3985B] ml-auto">
                        {proyecto.trato.responsable.name}
                      </span>
                    )}
                    <button
                      onClick={(e) => eliminar(proyecto.id, proyecto.nombre, e)}
                      disabled={deletingId === proyecto.id}
                      className="text-[#333] hover:text-red-400 text-xs transition-colors disabled:opacity-50 ml-auto"
                      title="Eliminar proyecto"
                    >
                      {deletingId === proyecto.id ? "..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        );
      })() : null}
    </div>
  );
}
