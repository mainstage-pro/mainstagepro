import { prisma } from "@/lib/prisma";
import Link from "next/link";

// ── Constantes ───────────────────────────────────────────────────────────────

const AREA_LABELS: Record<string, string> = {
  VENTAS: "Ventas", ADMINISTRACION: "Administración",
  PRODUCCION: "Producción", MARKETING: "Marketing",
  RRHH: "RR.HH.", GENERAL: "General", DIRECCION: "Dirección",
};

const AREA_COLORS: Record<string, { bg: string; text: string; dot: string; badge: string }> = {
  VENTAS:        { bg: "bg-blue-900/20",   text: "text-blue-300",   dot: "bg-blue-500",   badge: "bg-blue-900/40 text-blue-300" },
  ADMINISTRACION:{ bg: "bg-purple-900/20", text: "text-purple-300", dot: "bg-purple-500", badge: "bg-purple-900/40 text-purple-300" },
  PRODUCCION:    { bg: "bg-orange-900/20", text: "text-orange-300", dot: "bg-orange-500", badge: "bg-orange-900/40 text-orange-300" },
  MARKETING:     { bg: "bg-pink-900/20",   text: "text-pink-300",   dot: "bg-pink-500",   badge: "bg-pink-900/40 text-pink-300" },
  RRHH:          { bg: "bg-teal-900/20",   text: "text-teal-300",   dot: "bg-teal-500",   badge: "bg-teal-900/40 text-teal-300" },
  GENERAL:       { bg: "bg-[#1a1a1a]",     text: "text-[#777]",    dot: "bg-[#555]",     badge: "bg-[#222] text-[#777]" },
  DIRECCION:     { bg: "bg-[#B3985B]/10",  text: "text-[#B3985B]", dot: "bg-[#B3985B]",  badge: "bg-[#B3985B]/20 text-[#B3985B]" },
};

const PRIO_DOT: Record<string, string> = {
  URGENTE: "bg-red-500", ALTA: "bg-orange-500", MEDIA: "bg-[#B3985B]", BAJA: "bg-[#333]",
};

const CEO_AREAS = ["VENTAS", "ADMINISTRACION", "PRODUCCION", "MARKETING", "RRHH", "GENERAL", "DIRECCION"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

function fechaChip(fecha: Date | null): { label: string; cls: string } | null {
  if (!fecha) return null;
  const iso = fecha.toISOString().substring(0, 10);
  const hoy = todayISO();
  if (iso < hoy) {
    const days = Math.round((new Date(hoy + "T12:00:00Z").getTime() - new Date(iso + "T12:00:00Z").getTime()) / 86400000);
    return { label: `${days}d vencida`, cls: "bg-red-950/50 text-red-400" };
  }
  if (iso === hoy) return { label: "Hoy", cls: "bg-emerald-950/50 text-emerald-400" };
  const mañana = new Date(hoy + "T12:00:00Z"); mañana.setDate(mañana.getDate() + 1);
  const fechaD = new Date(iso + "T12:00:00Z");
  const diff = Math.round((fechaD.getTime() - new Date(hoy + "T12:00:00Z").getTime()) / 86400000);
  if (diff === 1) return { label: "Mañana", cls: "bg-yellow-950/30 text-yellow-400" };
  return { label: fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" }), cls: "bg-[#1a1a1a] text-[#555]" };
}

function isOverdue(fecha: Date | null) {
  if (!fecha) return false;
  return fecha.toISOString().substring(0, 10) < todayISO();
}

type TareaRow = {
  id: string; titulo: string; prioridad: string; area: string;
  fecha: Date | null; estado: string;
  asignadoA: { id: string; name: string } | null;
};

const PRIO_ORD: Record<string, number> = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };

function sortTareas(arr: TareaRow[]) {
  return [...arr].sort((a, b) => {
    const oa = isOverdue(a.fecha) ? -1 : 0;
    const ob = isOverdue(b.fecha) ? -1 : 0;
    if (oa !== ob) return oa - ob;
    const pa = PRIO_ORD[a.prioridad] ?? 3;
    const pb = PRIO_ORD[b.prioridad] ?? 3;
    if (pa !== pb) return pa - pb;
    if (a.fecha && b.fecha) return a.fecha.getTime() - b.fecha.getTime();
    if (a.fecha) return -1; if (b.fecha) return 1;
    return 0;
  });
}

// ── Fila de tarea ─────────────────────────────────────────────────────────────

function TareaRow({ t }: { t: TareaRow }) {
  const chip    = fechaChip(t.fecha);
  const initial = t.asignadoA?.name?.charAt(0).toUpperCase() ?? "?";
  const nombre  = t.asignadoA?.name ?? null;
  return (
    <Link
      href={`/operaciones?open=${t.id}`}
      className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#151515] transition-colors group"
    >
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIO_DOT[t.prioridad] ?? "bg-[#333]"}`} />
      <p className="flex-1 text-[11px] text-white leading-snug truncate group-hover:text-[#ddd]">{t.titulo}</p>
      <div className="flex items-center gap-1.5 shrink-0">
        {chip && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${chip.cls}`}>
            {chip.label}
          </span>
        )}
        {nombre && (
          <span
            title={nombre}
            className="w-5 h-5 rounded-full bg-[#222] text-[#666] text-[9px] font-bold flex items-center justify-center border border-[#2a2a2a]"
          >
            {initial}
          </span>
        )}
      </div>
    </Link>
  );
}

// ── CEO Widget ────────────────────────────────────────────────────────────────

function CeoWidget({ tareas }: { tareas: TareaRow[] }) {
  const byArea: Record<string, TareaRow[]> = {};
  for (const t of tareas) {
    if (!byArea[t.area]) byArea[t.area] = [];
    byArea[t.area].push(t);
  }

  const areas    = CEO_AREAS.filter(a => (byArea[a]?.length ?? 0) > 0);
  const sinArea  = tareas.filter(t => !CEO_AREAS.includes(t.area));
  const urgentes = tareas.filter(t => t.prioridad === "URGENTE").length;
  const vencidas = tareas.filter(t => isOverdue(t.fecha)).length;

  if (tareas.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-10 text-center">
        <p className="text-2xl mb-2">🎉</p>
        <p className="text-[#555] text-sm">Sin tareas pendientes para hoy</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Barra de resumen */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-[11px] text-[#555]">{tareas.length} tarea{tareas.length !== 1 ? "s" : ""} pendientes</span>
        {urgentes > 0 && (
          <span className="text-[10px] bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full font-semibold">
            ⚡ {urgentes} urgente{urgentes !== 1 ? "s" : ""}
          </span>
        )}
        {vencidas > 0 && (
          <span className="text-[10px] bg-orange-900/30 text-orange-400 px-2 py-0.5 rounded-full font-semibold">
            ⚠ {vencidas} vencida{vencidas !== 1 ? "s" : ""}
          </span>
        )}
        <Link href="/operaciones/equipo" className="ml-auto text-[10px] text-[#444] hover:text-[#B3985B] transition-colors">
          Ver todo →
        </Link>
      </div>

      {/* Grid de áreas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {[...areas, ...(sinArea.length > 0 ? ["__SIN_AREA__"] : [])].map(areaKey => {
          const lista     = areaKey === "__SIN_AREA__" ? sinArea : (byArea[areaKey] ?? []);
          if (lista.length === 0) return null;

          const urg  = lista.filter(t => t.prioridad === "URGENTE").length;
          const venc = lista.filter(t => isOverdue(t.fecha)).length;
          const col  = AREA_COLORS[areaKey] ?? AREA_COLORS.GENERAL;
          const all  = sortTareas(lista);

          return (
            <div key={areaKey} className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-xl overflow-hidden">
              {/* Header */}
              <div className={`flex items-center gap-2 px-3 py-2 border-b border-[#181818] ${col.bg}`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${col.dot}`} />
                <p className={`text-[11px] font-bold uppercase tracking-wider flex-1 ${col.text}`}>
                  {AREA_LABELS[areaKey] ?? "Sin área"}
                </p>
                <div className="flex items-center gap-1">
                  {urg > 0 && (
                    <span className="text-[9px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded font-bold">
                      {urg}⚡
                    </span>
                  )}
                  {venc > 0 && (
                    <span className="text-[9px] bg-orange-900/40 text-orange-400 px-1.5 py-0.5 rounded font-bold">
                      {venc}⚠
                    </span>
                  )}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${col.badge}`}>
                    {lista.length}
                  </span>
                </div>
              </div>

              {/* Tareas — todas visibles, scroll si son muchas */}
              <div className="divide-y divide-[#131313] max-h-64 overflow-y-auto">
                {all.map(t => <TareaRow key={t.id} t={t} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Area Widget ───────────────────────────────────────────────────────────────

function AreaWidget({ tareas, area }: { tareas: TareaRow[]; area: string }) {
  const byUser: Record<string, { user: { id: string; name: string } | null; lista: TareaRow[] }> = {};

  for (const t of tareas) {
    const key = t.asignadoA?.id ?? "__sin_asignar__";
    if (!byUser[key]) byUser[key] = { user: t.asignadoA, lista: [] };
    byUser[key].lista.push(t);
  }

  const grupos = Object.values(byUser).sort((a, b) => {
    if (!a.user && b.user) return 1;
    if (a.user && !b.user) return -1;
    return (a.user?.name ?? "").localeCompare(b.user?.name ?? "");
  });

  if (tareas.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-8 text-center">
        <p className="text-2xl mb-2">✅</p>
        <p className="text-[#555] text-sm">Sin tareas para hoy en esta área</p>
      </div>
    );
  }

  const col = AREA_COLORS[area] ?? AREA_COLORS.GENERAL;

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
      {grupos.map(grupo => {
        const urgentes = grupo.lista.filter(t => t.prioridad === "URGENTE").length;
        const vencidas = grupo.lista.filter(t => isOverdue(t.fecha)).length;
        const nombre   = grupo.user?.name ?? "Sin asignar";
        const top      = sortTareas(grupo.lista).slice(0, 6);

        return (
          <div key={grupo.user?.id ?? "__sin__"} className="border-b border-[#141414] last:border-0">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0d0d0d]">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${col.bg} ${col.text}`}>
                {nombre === "Sin asignar" ? "?" : nombre.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{nombre}</p>
                <p className="text-[#444] text-[10px]">
                  {grupo.lista.length} tarea{grupo.lista.length !== 1 ? "s" : ""}
                  {urgentes > 0 && <span className="text-red-400 ml-1">· {urgentes} urgente{urgentes > 1 ? "s" : ""}</span>}
                  {vencidas > 0 && <span className="text-orange-400 ml-1">· {vencidas} vencida{vencidas > 1 ? "s" : ""}</span>}
                </p>
              </div>
            </div>
            <div className="divide-y divide-[#141414]">
              {top.map(t => <TareaRow key={t.id} t={t} />)}
              {grupo.lista.length > 6 && (
                <Link href="/operaciones" className="flex items-center justify-center px-4 py-2 text-[11px] text-[#444] hover:text-[#B3985B] transition-colors">
                  +{grupo.lista.length - 6} más →
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  area?: string;
}

export default async function TareasPendientesWidget({ area }: Props) {
  const finDeHoy = new Date();
  finDeHoy.setHours(23, 59, 59, 999);

  const tareas = await prisma.tarea.findMany({
    where: {
      estado: { notIn: ["COMPLETADA", "CANCELADA"] },
      parentId: null,
      fecha: { lte: finDeHoy },
      ...(area ? { area } : { area: { in: CEO_AREAS } }),
    },
    select: {
      id: true, titulo: true, prioridad: true, area: true,
      fecha: true, estado: true,
      asignadoA: { select: { id: true, name: true } },
    },
  });

  if (area) {
    return <AreaWidget tareas={sortTareas(tareas)} area={area} />;
  }
  return <CeoWidget tareas={sortTareas(tareas)} />;
}
