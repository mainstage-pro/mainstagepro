"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface TareaEquipo {
  id: string;
  titulo: string;
  prioridad: string;
  area: string;
  estado: string;
  fecha: string | null;
  fechaVencimiento: string | null;
  proyectoTarea: { id: string; nombre: string; color: string | null } | null;
  asignadoA: { id: string; name: string } | null;
  _count: { subtareas: number; comentarios: number };
}

interface Usuario {
  id: string;
  name: string;
  image: string | null;
}

const PRIO_COLOR: Record<string, string> = {
  URGENTE: "#f87171", ALTA: "#fb923c", MEDIA: "#eab308", BAJA: "#6b7280",
};
const PRIO_LABEL: Record<string, string> = {
  URGENTE: "Urgente", ALTA: "Alta", MEDIA: "Media", BAJA: "Baja",
};

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

function isOverdue(fecha: string | null) {
  if (!fecha) return false;
  return fecha.substring(0, 10) < todayStr();
}

function isToday(fecha: string | null) {
  if (!fecha) return false;
  return fecha.substring(0, 10) === todayStr();
}

function formatDate(fecha: string | null) {
  if (!fecha) return null;
  const d = new Date(fecha.substring(0, 10) + "T00:00:00");
  if (isToday(fecha)) return "Hoy";
  const diff = Math.round((d.getTime() - Date.now()) / 86400000);
  if (diff === 1) return "Mañana";
  if (diff > 1 && diff <= 7) return d.toLocaleDateString("es-MX", { weekday: "short" });
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export default function EquipoPage() {
  const [usuarios, setUsuarios]     = useState<Usuario[]>([]);
  const [tareas, setTareas]         = useState<TareaEquipo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filtroArea, setFiltroArea] = useState<string>("");
  const [filtroFecha, setFiltroFecha] = useState<"hoy" | "proximas" | "todas">("hoy");

  useEffect(() => {
    fetch("/api/usuarios")
      .then(r => r.json())
      .then(d => setUsuarios(d.usuarios ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroFecha === "hoy") params.set("vista", "hoy_equipo");
    else if (filtroFecha === "proximas") params.set("vista", "proximas_equipo");
    fetch(`/api/tareas/equipo?${params}`)
      .then(r => r.json())
      .then(d => { setTareas(d.tareas ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filtroFecha]);

  const tareasFiltradas = tareas.filter(t =>
    !filtroArea || t.area === filtroArea
  );

  // Group by user
  const byUser: Record<string, TareaEquipo[]> = {};
  for (const t of tareasFiltradas) {
    const uid = t.asignadoA?.id ?? "__sin_asignar__";
    if (!byUser[uid]) byUser[uid] = [];
    byUser[uid].push(t);
  }

  const orderedUsers = [
    ...usuarios.filter(u => byUser[u.id]),
    ...(byUser["__sin_asignar__"] ? [{ id: "__sin_asignar__", name: "Sin asignar", image: null }] : []),
  ];

  const areas = [...new Set(tareas.map(t => t.area))].sort();
  const AREA_LABELS: Record<string, string> = {
    VENTAS: "Ventas", ADMINISTRACION: "Administración", PRODUCCION: "Producción",
    MARKETING: "Marketing", RRHH: "RR.HH.", GENERAL: "General",
  };

  const totalHoy = tareas.filter(t => isToday(t.fecha)).length;
  const totalVencidas = tareas.filter(t => isOverdue(t.fecha)).length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/operaciones" className="text-[#444] hover:text-white text-xs transition-colors">
              ← Operaciones
            </Link>
          </div>
          <h1 className="text-xl font-semibold text-white">Tareas del equipo</h1>
          <p className="text-[#555] text-sm mt-0.5">
            {loading ? "Cargando…" : (
              <>
                {tareasFiltradas.length} tareas
                {totalVencidas > 0 && <span className="text-red-400 ml-2">· {totalVencidas} vencidas</span>}
                {totalHoy > 0 && <span className="text-[#B3985B] ml-2">· {totalHoy} para hoy</span>}
              </>
            )}
          </p>
        </div>
        <Link
          href="/operaciones"
          className="bg-[#B3985B] hover:bg-[#c9aa6a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          + Nueva tarea
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Fecha */}
        <div className="flex rounded-lg overflow-hidden border border-[#1e1e1e]">
          {([
            { key: "hoy", label: "Hoy" },
            { key: "proximas", label: "Próximas 7d" },
            { key: "todas", label: "Todas" },
          ] as const).map(opt => (
            <button
              key={opt.key}
              onClick={() => setFiltroFecha(opt.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filtroFecha === opt.key ? "bg-[#1a1a1a] text-white" : "text-[#444] hover:text-[#777]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Área */}
        {areas.length > 1 && (
          <div className="flex rounded-lg overflow-hidden border border-[#1e1e1e]">
            <button
              onClick={() => setFiltroArea("")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                !filtroArea ? "bg-[#1a1a1a] text-white" : "text-[#444] hover:text-[#777]"
              }`}
            >
              Todas las áreas
            </button>
            {areas.map(a => (
              <button
                key={a}
                onClick={() => setFiltroArea(filtroArea === a ? "" : a)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filtroArea === a ? "bg-[#1a1a1a] text-white" : "text-[#444] hover:text-[#777]"
                }`}
              >
                {AREA_LABELS[a] ?? a}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-48 bg-[#111] border border-[#1a1a1a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : orderedUsers.length === 0 ? (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl text-center py-20">
          <p className="text-3xl mb-3">🎉</p>
          <p className="text-white font-medium text-sm">Sin tareas pendientes</p>
          <p className="text-[#444] text-xs mt-1">Todo el equipo está al día</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orderedUsers.map(usuario => {
            const userTareas = byUser[usuario.id] ?? [];
            const urgentes = userTareas.filter(t => t.prioridad === "URGENTE").length;
            const vencidas = userTareas.filter(t => isOverdue(t.fecha)).length;

            return (
              <div key={usuario.id} className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
                {/* User header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a]">
                  <div className="w-8 h-8 rounded-full bg-[#1e1e1e] flex items-center justify-center shrink-0 text-sm font-semibold text-[#B3985B]">
                    {usuario.name === "Sin asignar" ? "?" : usuario.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{usuario.name}</p>
                    <p className="text-[#555] text-xs">
                      {userTareas.length} tarea{userTareas.length !== 1 ? "s" : ""}
                      {urgentes > 0 && <span className="text-red-400 ml-1">· {urgentes} urgente{urgentes > 1 ? "s" : ""}</span>}
                      {vencidas > 0 && <span className="text-orange-400 ml-1">· {vencidas} vencida{vencidas > 1 ? "s" : ""}</span>}
                    </p>
                  </div>
                </div>

                {/* Task list */}
                <div className="divide-y divide-[#141414] max-h-72 overflow-y-auto">
                  {userTareas.map(t => {
                    const overdue = isOverdue(t.fecha);
                    const hoy = isToday(t.fecha);
                    const dateStr = formatDate(t.fecha);
                    return (
                      <Link
                        key={t.id}
                        href={`/operaciones?open=${t.id}`}
                        className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-[#151515] transition-colors group"
                      >
                        {/* Priority dot */}
                        <div
                          className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                          style={{ background: PRIO_COLOR[t.prioridad] ?? "#555" }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-snug ${
                            t.estado === "COMPLETADA" ? "line-through text-[#444]" : "text-white"
                          }`}>
                            {t.titulo}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            {t.proyectoTarea && (
                              <span className="text-[10px] text-[#555] flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full" style={{ background: t.proyectoTarea.color ?? "#555" }} />
                                {t.proyectoTarea.nombre}
                              </span>
                            )}
                            {dateStr && (
                              <span className={`text-[10px] font-medium ${
                                overdue ? "text-red-400" : hoy ? "text-[#B3985B]" : "text-[#555]"
                              }`}>
                                {overdue ? "⚠ " : ""}{dateStr}
                              </span>
                            )}
                            {t._count.comentarios > 0 && (
                              <span className="text-[10px] text-[#444]">💬 {t._count.comentarios}</span>
                            )}
                            {t._count.subtareas > 0 && (
                              <span className="text-[10px] text-[#444]">◫ {t._count.subtareas}</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${
                          t.prioridad === "URGENTE" ? "bg-red-900/40 text-red-400" :
                          t.prioridad === "ALTA" ? "bg-orange-900/40 text-orange-400" :
                          "hidden"
                        }`}>
                          {PRIO_LABEL[t.prioridad]}
                        </span>
                      </Link>
                    );
                  })}
                </div>

                {/* Footer: progress bar */}
                {userTareas.length > 0 && (
                  <div className="px-4 py-2 border-t border-[#141414]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#B3985B] rounded-full transition-all"
                          style={{
                            width: `${Math.round((userTareas.filter(t => t.estado === "COMPLETADA").length / userTareas.length) * 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-[#444] shrink-0">
                        {userTareas.filter(t => t.estado === "COMPLETADA").length}/{userTareas.length}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
