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

// ── Constantes ────────────────────────────────────────────────────────────────

const PRIO_BAR: Record<string, string> = {
  URGENTE: "bg-red-500", ALTA: "bg-orange-500", MEDIA: "bg-[#B3985B]", BAJA: "bg-[#2a2a2a]",
};
const PRIO_BADGE: Record<string, string> = {
  URGENTE: "bg-red-900/40 text-red-400",
  ALTA:    "bg-orange-900/40 text-orange-400",
};
const AREA_CHIP: Record<string, string> = {
  VENTAS:        "bg-blue-900/30 text-blue-400",
  ADMINISTRACION:"bg-purple-900/30 text-purple-400",
  PRODUCCION:    "bg-orange-900/30 text-orange-400",
  MARKETING:     "bg-pink-900/30 text-pink-400",
  RRHH:          "bg-teal-900/30 text-teal-400",
  GENERAL:       "bg-[#1a1a1a] text-[#666]",
  DIRECCION:     "bg-[#B3985B]/15 text-[#B3985B]",
};
const AREA_LABELS: Record<string, string> = {
  VENTAS: "Ventas", ADMINISTRACION: "Administración", PRODUCCION: "Producción",
  MARKETING: "Marketing", RRHH: "RR.HH.", GENERAL: "General", DIRECCION: "Dirección",
};
const AVATAR_COLOR: Record<string, string> = {
  VENTAS: "bg-blue-900/40 text-blue-300",
  ADMINISTRACION: "bg-purple-900/40 text-purple-300",
  PRODUCCION: "bg-orange-900/40 text-orange-300",
  MARKETING: "bg-pink-900/40 text-pink-300",
  RRHH: "bg-teal-900/40 text-teal-300",
  GENERAL: "bg-[#1a1a1a] text-[#666]",
  DIRECCION: "bg-[#B3985B]/20 text-[#B3985B]",
};

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function isOverdue(fecha: string | null) {
  if (!fecha) return false;
  return fecha.substring(0, 10) < todayStr();
}
function isToday(fecha: string | null) {
  if (!fecha) return false;
  return fecha.substring(0, 10) === todayStr();
}
function fechaChip(fecha: string | null): { label: string; cls: string } | null {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d   = new Date(fecha.substring(0, 10) + "T00:00:00");
  if (d < hoy) return { label: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }), cls: "bg-red-950/60 text-red-400" };
  if (isToday(fecha)) return { label: "Hoy", cls: "bg-emerald-950/50 text-emerald-400" };
  const diff = Math.round((d.getTime() - hoy.getTime()) / 86400000);
  if (diff === 1) return { label: "Mañana", cls: "bg-yellow-950/40 text-yellow-400" };
  if (diff <= 7)  return { label: d.toLocaleDateString("es-MX", { weekday: "short" }), cls: "bg-[#1a1a1a] text-[#555]" };
  return { label: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }), cls: "bg-[#1a1a1a] text-[#444]" };
}

// ── Componente tarea ──────────────────────────────────────────────────────────

function TareaCard({ t, showArea }: { t: TareaEquipo; showArea?: boolean }) {
  const chip    = fechaChip(t.fecha);
  const overdue = isOverdue(t.fecha);
  const prioBadge = PRIO_BADGE[t.prioridad];

  return (
    <Link
      href={`/operaciones?open=${t.id}`}
      className={`flex items-stretch gap-0 hover:bg-[#141414] transition-colors group rounded-lg overflow-hidden border ${overdue ? "border-red-900/20" : "border-transparent hover:border-[#1e1e1e]"}`}
    >
      {/* Barra de prioridad */}
      <div className={`w-1 shrink-0 rounded-l-lg ${PRIO_BAR[t.prioridad] ?? "bg-[#2a2a2a]"}`} />

      <div className="flex-1 min-w-0 px-3 py-2.5">
        {/* Título */}
        <p className="text-[12px] text-white leading-snug font-medium group-hover:text-[#ddd] truncate">
          {t.titulo}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {showArea && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${AREA_CHIP[t.area] ?? "bg-[#1a1a1a] text-[#555]"}`}>
              {AREA_LABELS[t.area] ?? t.area}
            </span>
          )}
          {t.proyectoTarea && (
            <span className="flex items-center gap-1 text-[10px] text-[#555]">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.proyectoTarea.color ?? "#555" }} />
              <span className="truncate max-w-[120px]">{t.proyectoTarea.nombre}</span>
            </span>
          )}
          {chip && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${chip.cls}`}>
              {chip.label}
            </span>
          )}
          {t._count.subtareas > 0 && (
            <span className="text-[10px] text-[#3a3a3a]">◫ {t._count.subtareas}</span>
          )}
          {t._count.comentarios > 0 && (
            <span className="text-[10px] text-[#3a3a3a]">💬 {t._count.comentarios}</span>
          )}
        </div>
      </div>

      {/* Badge prioridad alta/urgente */}
      {prioBadge && (
        <div className="flex items-center pr-2.5">
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${prioBadge}`}>
            {t.prioridad === "URGENTE" ? "⚡ Urg." : "Alta"}
          </span>
        </div>
      )}
    </Link>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function EquipoPage() {
  const [usuarios, setUsuarios]         = useState<Usuario[]>([]);
  const [tareas, setTareas]             = useState<TareaEquipo[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filtroArea, setFiltroArea]     = useState<string>("");
  const [filtroFecha, setFiltroFecha]   = useState<"hoy" | "proximas" | "todas">("todas");
  const [filtroUsuario, setFiltroUsuario] = useState<string>("");

  useEffect(() => {
    fetch("/api/usuarios")
      .then(r => r.json())
      .then(d => setUsuarios(d.usuarios ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroFecha === "hoy")      params.set("vista", "hoy_equipo");
    else if (filtroFecha === "proximas") params.set("vista", "proximas_equipo");
    fetch(`/api/tareas/equipo?${params}`)
      .then(r => r.json())
      .then(d => { setTareas(d.tareas ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filtroFecha]);

  // Filtros
  const tareasFiltradas = tareas.filter(t =>
    (!filtroArea    || t.area === filtroArea) &&
    (!filtroUsuario || (t.asignadoA?.id ?? "__sin_asignar__") === filtroUsuario)
  );

  // Agrupar por usuario
  const byUser: Record<string, TareaEquipo[]> = {};
  for (const t of tareasFiltradas) {
    const uid = t.asignadoA?.id ?? "__sin_asignar__";
    if (!byUser[uid]) byUser[uid] = [];
    byUser[uid].push(t);
  }

  // Orden: usuarios registrados con tareas primero, sin asignar al final
  const orderedUsers: { id: string; name: string }[] = [
    ...usuarios.filter(u => byUser[u.id]).map(u => ({ id: u.id, name: u.name })),
    ...(byUser["__sin_asignar__"] ? [{ id: "__sin_asignar__", name: "Sin asignar" }] : []),
  ];

  const areas           = [...new Set(tareas.map(t => t.area))].sort();
  const totalVencidas   = tareasFiltradas.filter(t => isOverdue(t.fecha)).length;
  const totalHoy        = tareasFiltradas.filter(t => isToday(t.fecha)).length;
  const totalUrgentes   = tareasFiltradas.filter(t => t.prioridad === "URGENTE").length;

  // Determinar si mostrar chip de área por tarea (cuando no hay filtro de área)
  const showAreaChip = !filtroArea;

  return (
    <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/operaciones" className="text-[#444] hover:text-[#777] text-xs transition-colors">
              ← Operaciones
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">Equipo</h1>
          {!loading && (
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-[#555] text-sm">{tareasFiltradas.length} tarea{tareasFiltradas.length !== 1 ? "s" : ""}</span>
              {totalVencidas > 0 && (
                <span className="text-[11px] bg-red-950/50 text-red-400 px-2 py-0.5 rounded-full font-medium">
                  ⚠ {totalVencidas} vencida{totalVencidas !== 1 ? "s" : ""}
                </span>
              )}
              {totalUrgentes > 0 && (
                <span className="text-[11px] bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full font-medium">
                  ⚡ {totalUrgentes} urgente{totalUrgentes !== 1 ? "s" : ""}
                </span>
              )}
              {totalHoy > 0 && (
                <span className="text-[11px] bg-[#B3985B]/15 text-[#B3985B] px-2 py-0.5 rounded-full font-medium">
                  {totalHoy} para hoy
                </span>
              )}
            </div>
          )}
        </div>
        <Link
          href="/operaciones"
          className="bg-[#B3985B] hover:bg-[#c9aa6a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0 self-start"
        >
          + Nueva tarea
        </Link>
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Vista */}
        <div className="flex items-center bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
          {([
            { key: "todas",    label: "Todas" },
            { key: "hoy",      label: "Hoy" },
            { key: "proximas", label: "Próximas 7d" },
          ] as const).map(opt => (
            <button
              key={opt.key}
              onClick={() => setFiltroFecha(opt.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filtroFecha === opt.key
                  ? "bg-[#1e1e1e] text-white"
                  : "text-[#444] hover:text-[#777]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Área */}
        {areas.length > 1 && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setFiltroArea("")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                !filtroArea ? "bg-[#1e1e1e] text-white border-[#2a2a2a]" : "text-[#444] hover:text-[#777] border-transparent"
              }`}
            >
              Todas las áreas
            </button>
            {areas.map(a => (
              <button
                key={a}
                onClick={() => setFiltroArea(filtroArea === a ? "" : a)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                  filtroArea === a
                    ? `${AREA_CHIP[a] ?? ""} border-transparent`
                    : "text-[#444] hover:text-[#777] border-transparent"
                }`}
              >
                {AREA_LABELS[a] ?? a}
              </button>
            ))}
          </div>
        )}

        {/* Persona */}
        {usuarios.length > 1 && (
          <div className="flex flex-wrap items-center gap-1 ml-auto">
            <button
              onClick={() => setFiltroUsuario("")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors border ${
                !filtroUsuario ? "bg-[#1e1e1e] text-white border-[#2a2a2a]" : "text-[#444] hover:text-[#666] border-[#1a1a1a]"
              }`}
            >
              Todos
            </button>
            {usuarios.map(u => (
              <button
                key={u.id}
                onClick={() => setFiltroUsuario(filtroUsuario === u.id ? "" : u.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors border ${
                  filtroUsuario === u.id
                    ? "bg-[#B3985B]/20 text-[#B3985B] border-[#B3985B]/30"
                    : "text-[#444] hover:text-[#666] border-[#1a1a1a]"
                }`}
              >
                {u.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Contenido ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-64 bg-[#111] border border-[#1a1a1a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : orderedUsers.length === 0 ? (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl text-center py-24">
          <p className="text-4xl mb-4">🎉</p>
          <p className="text-white font-semibold text-base">Sin tareas pendientes</p>
          <p className="text-[#444] text-sm mt-1">Todo el equipo está al día</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orderedUsers.map(usuario => {
            const userTareas  = byUser[usuario.id] ?? [];
            const urgentes    = userTareas.filter(t => t.prioridad === "URGENTE").length;
            const vencidas    = userTareas.filter(t => isOverdue(t.fecha)).length;
            const hoy         = userTareas.filter(t => isToday(t.fecha)).length;

            // Ordenar: vencidas primero, luego prioridad, luego fecha
            const sorted = [...userTareas].sort((a, b) => {
              const oa = isOverdue(a.fecha) ? -1 : 0;
              const ob = isOverdue(b.fecha) ? -1 : 0;
              if (oa !== ob) return oa - ob;
              const PRIO: Record<string, number> = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
              if ((PRIO[a.prioridad]??3) !== (PRIO[b.prioridad]??3)) return (PRIO[a.prioridad]??3) - (PRIO[b.prioridad]??3);
              if (a.fecha && b.fecha) return a.fecha.localeCompare(b.fecha);
              if (a.fecha) return -1; if (b.fecha) return 1;
              return 0;
            });

            // Áreas representadas
            const areasUser = [...new Set(userTareas.map(t => t.area))];
            const mainArea  = areasUser.length === 1 ? areasUser[0] : null;
            const avatarCls = mainArea ? (AVATAR_COLOR[mainArea] ?? "bg-[#1e1e1e] text-[#B3985B]") : "bg-[#1e1e1e] text-[#B3985B]";

            return (
              <div
                key={usuario.id}
                className={`bg-[#0e0e0e] border rounded-xl overflow-hidden flex flex-col ${
                  vencidas > 0 ? "border-red-900/25" : urgentes > 0 ? "border-orange-900/20" : "border-[#1c1c1c]"
                }`}
              >
                {/* ── Header persona ─────────────────────────────────────── */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[#181818] bg-[#0a0a0a]">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${avatarCls}`}>
                    {usuario.name === "Sin asignar" ? "?" : usuario.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{usuario.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[#444] text-[10px]">{userTareas.length} tarea{userTareas.length !== 1 ? "s" : ""}</span>
                      {vencidas > 0 && (
                        <span className="text-[10px] text-red-400 font-medium">⚠ {vencidas} vencida{vencidas !== 1 ? "s" : ""}</span>
                      )}
                      {urgentes > 0 && (
                        <span className="text-[10px] text-red-400 font-medium">⚡ {urgentes} urgente{urgentes !== 1 ? "s" : ""}</span>
                      )}
                      {hoy > 0 && !vencidas && (
                        <span className="text-[10px] text-[#B3985B] font-medium">{hoy} para hoy</span>
                      )}
                    </div>
                  </div>
                  {/* Mini chips de área */}
                  <div className="flex items-center gap-1 shrink-0">
                    {areasUser.slice(0, 3).map(a => (
                      <span key={a} className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${AREA_CHIP[a] ?? "bg-[#1a1a1a] text-[#555]"}`}>
                        {AREA_LABELS[a]?.substring(0, 4) ?? a.substring(0, 4)}
                      </span>
                    ))}
                    {areasUser.length > 3 && (
                      <span className="text-[9px] text-[#444]">+{areasUser.length - 3}</span>
                    )}
                  </div>
                </div>

                {/* ── Lista de tareas ─────────────────────────────────────── */}
                <div className="flex-1 divide-y divide-[#131313] px-1 py-1">
                  {sorted.map(t => (
                    <TareaCard key={t.id} t={t} showArea={showAreaChip} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
