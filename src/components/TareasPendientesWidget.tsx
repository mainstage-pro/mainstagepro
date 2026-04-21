import { prisma } from "@/lib/prisma";
import Link from "next/link";

// ── Constantes ───────────────────────────────────────────────────────────────

const AREA_LABELS: Record<string, string> = {
  VENTAS: "Ventas", ADMINISTRACION: "Administración",
  PRODUCCION: "Producción", MARKETING: "Marketing",
  RRHH: "RR.HH.", GENERAL: "General", DIRECCION: "Dirección",
};

const AREA_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  VENTAS:        { bg: "bg-blue-900/20",   text: "text-blue-300",   dot: "bg-blue-500" },
  ADMINISTRACION:{ bg: "bg-purple-900/20", text: "text-purple-300", dot: "bg-purple-500" },
  PRODUCCION:    { bg: "bg-orange-900/20", text: "text-orange-300", dot: "bg-orange-500" },
  MARKETING:     { bg: "bg-pink-900/20",   text: "text-pink-300",   dot: "bg-pink-500" },
  RRHH:          { bg: "bg-teal-900/20",   text: "text-teal-300",   dot: "bg-teal-500" },
  GENERAL:       { bg: "bg-[#1a1a1a]",     text: "text-[#777]",    dot: "bg-[#555]" },
  DIRECCION:     { bg: "bg-[#B3985B]/10",  text: "text-[#B3985B]", dot: "bg-[#B3985B]" },
};

const PRIO_DOT: Record<string, string> = {
  URGENTE: "bg-red-500", ALTA: "bg-orange-500",
  MEDIA: "bg-[#B3985B]", BAJA: "bg-[#444]",
};

const CEO_AREAS = ["VENTAS", "ADMINISTRACION", "PRODUCCION", "MARKETING"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function fechaStr(fecha: Date | null): string | null {
  if (!fecha) return null;
  const iso = fecha.toISOString().substring(0, 10);
  const hoy = todayISO();
  if (iso < hoy) {
    const d = Math.round((Date.now() - fecha.getTime()) / 86400000);
    return `Vencida ${d}d`;
  }
  if (iso === hoy) return "Hoy";
  return fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
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
    if (a.fecha) return -1;
    if (b.fecha) return 1;
    return 0;
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TareaRow({ t }: { t: TareaRow }) {
  const overdue = isOverdue(t.fecha);
  const ds = fechaStr(t.fecha);
  return (
    <Link
      href={`/operaciones?open=${t.id}`}
      className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-[#151515] transition-colors group"
    >
      <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${PRIO_DOT[t.prioridad] ?? "bg-[#444]"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white leading-snug truncate">{t.titulo}</p>
        {ds && (
          <p className={`text-[10px] mt-0.5 font-medium ${overdue ? "text-red-400" : ds === "Hoy" ? "text-[#B3985B]" : "text-[#555]"}`}>
            {overdue && "⚠ "}{ds}
          </p>
        )}
      </div>
      {(t.prioridad === "URGENTE" || t.prioridad === "ALTA") && (
        <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-semibold mt-0.5 ${
          t.prioridad === "URGENTE" ? "bg-red-900/40 text-red-400" : "bg-orange-900/40 text-orange-400"
        }`}>
          {t.prioridad === "URGENTE" ? "Urgente" : "Alta"}
        </span>
      )}
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

  const areas = CEO_AREAS.filter(a => (byArea[a]?.length ?? 0) > 0);
  const sinArea = tareas.filter(t => !CEO_AREAS.includes(t.area));

  if (tareas.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-10 text-center">
        <p className="text-2xl mb-2">🎉</p>
        <p className="text-[#555] text-sm">Sin tareas para hoy en ninguna área</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...areas, ...(sinArea.length > 0 ? ["__SIN_AREA__"] : [])].map(areaKey => {
        const lista = areaKey === "__SIN_AREA__" ? sinArea : (byArea[areaKey] ?? []);
        if (lista.length === 0) return null;

        const urgentes  = lista.filter(t => t.prioridad === "URGENTE").length;
        const vencidas  = lista.filter(t => isOverdue(t.fecha)).length;
        const completadas = lista.filter(t => t.estado === "COMPLETADA").length;
        const col = AREA_COLORS[areaKey] ?? AREA_COLORS.GENERAL;
        const label = AREA_LABELS[areaKey] ?? "Sin área";
        const top = sortTareas(lista).slice(0, 5);

        return (
          <div key={areaKey} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            {/* Header del área */}
            <div className={`flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] ${col.bg}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.dot}`} />
                <p className={`text-sm font-semibold ${col.text}`}>{label}</p>
              </div>
              <div className="flex items-center gap-2">
                {urgentes > 0 && (
                  <span className="text-[10px] bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded-full font-semibold">
                    {urgentes} urg.
                  </span>
                )}
                {vencidas > 0 && (
                  <span className="text-[10px] bg-orange-900/40 text-orange-400 px-1.5 py-0.5 rounded-full font-semibold">
                    {vencidas} venc.
                  </span>
                )}
                <span className="text-[11px] text-[#555] font-medium">{lista.length}</span>
              </div>
            </div>

            {/* Lista de tareas */}
            <div className="divide-y divide-[#141414]">
              {top.map(t => <TareaRow key={t.id} t={t} />)}
            </div>

            {/* Footer: ver más + barra de progreso */}
            <div className="px-4 py-2 border-t border-[#141414] flex items-center gap-3">
              <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${col.dot}`}
                  style={{ width: `${lista.length > 0 ? Math.round((completadas / lista.length) * 100) : 0}%`, opacity: 0.6 }}
                />
              </div>
              <Link
                href="/operaciones/equipo"
                className="text-[10px] text-[#444] hover:text-[#B3985B] transition-colors shrink-0"
              >
                Ver →
              </Link>
            </div>
          </div>
        );
      })}
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
            {/* User header */}
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

            {/* Tasks */}
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
  // Filtra igual que la vista "Hoy" del módulo de equipo:
  // tareas con fecha <= fin de hoy (incluye vencidas), estado pendiente/en progreso
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
