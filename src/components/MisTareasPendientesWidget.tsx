"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ClipboardList, PartyPopper, Zap, AlertTriangle, ChevronDown } from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface TareaMia {
  id: string;
  titulo: string;
  prioridad: string;
  area: string;
  estado: string;
  fecha: string | null;
  asignadoA: { id: string; name: string } | null;
  proyectoEvento: { id: string; nombre: string } | null;
  trato: { id: string; nombreEvento: string | null } | null;
  cliente: { id: string; nombre: string } | null;
}

// ── Config ───────────────────────────────────────────────────────────────────

const AREA_LABELS: Record<string, string> = {
  VENTAS: "Ventas", ADMINISTRACION: "Administración", PRODUCCION: "Producción",
  MARKETING: "Marketing", RRHH: "RR.HH.", GENERAL: "General",
};
const AREA_ORDEN = ["VENTAS", "ADMINISTRACION", "PRODUCCION", "MARKETING", "RRHH", "GENERAL"];
const AREA_DOT: Record<string, string> = {
  VENTAS: "bg-blue-500", ADMINISTRACION: "bg-purple-500", PRODUCCION: "bg-orange-500",
  MARKETING: "bg-pink-500", RRHH: "bg-teal-500", GENERAL: "bg-[#555]",
};
const PRIO_DOT: Record<string, string> = {
  URGENTE: "bg-red-500", ALTA: "bg-orange-500", MEDIA: "bg-[#B3985B]", BAJA: "bg-[#333]",
};

type Rango = "ACTIVAS" | "VENCIDAS" | "HOY" | "TODAS";

// ── Helpers de fecha ─────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

function diasDesde(iso: string) {
  const hoy = todayISO();
  return Math.round((new Date(hoy + "T12:00:00Z").getTime() - new Date(iso + "T12:00:00Z").getTime()) / 86400000);
}

function fechaChip(fecha: string | null): { label: string; cls: string; vencida: boolean } | null {
  if (!fecha) return { label: "Sin fecha", cls: "bg-[#1a1a1a] text-[#555]", vencida: false };
  const iso = fecha.substring(0, 10);
  const hoy = todayISO();
  if (iso < hoy) {
    const d = diasDesde(iso);
    return { label: `${d}d vencida`, cls: "bg-red-950/50 text-red-400", vencida: true };
  }
  if (iso === hoy) return { label: "Hoy", cls: "bg-emerald-950/50 text-emerald-400", vencida: false };
  const diff = -diasDesde(iso);
  if (diff === 1) return { label: "Mañana", cls: "bg-yellow-950/30 text-yellow-400", vencida: false };
  return {
    label: new Date(iso + "T12:00:00Z").toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" }),
    cls: "bg-[#1a1a1a] text-[#666]",
    vencida: false,
  };
}

function contexto(t: TareaMia): string | null {
  return t.proyectoEvento?.nombre ?? t.trato?.nombreEvento ?? t.cliente?.nombre ?? null;
}

// ── Fila ─────────────────────────────────────────────────────────────────────

function Fila({ t, onCompletar }: { t: TareaMia; onCompletar: (id: string) => void }) {
  const chip = fechaChip(t.fecha);
  const ctx  = contexto(t);
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#151515] transition-colors group">
      <button
        onClick={() => onCompletar(t.id)}
        title="Marcar como completada"
        className="shrink-0 w-4 h-4 rounded-full border border-[#333] hover:border-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center transition-colors"
      >
        <Check strokeWidth={2.5} className="w-2.5 h-2.5 text-transparent group-hover:text-emerald-500 transition-colors" />
      </button>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIO_DOT[t.prioridad] ?? "bg-[#333]"}`} />
      <Link href={`/operaciones?open=${t.id}`} className="flex-1 min-w-0">
        <p className="text-[12px] text-white leading-snug truncate group-hover:text-[#ddd]">{t.titulo}</p>
        {ctx && <p className="text-[10px] text-[#555] truncate">{ctx}</p>}
      </Link>
      {chip && (
        <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded font-medium ${chip.cls}`}>{chip.label}</span>
      )}
    </div>
  );
}

// ── Widget principal ─────────────────────────────────────────────────────────

export default function MisTareasPendientesWidget() {
  const [tareas, setTareas]   = useState<TareaMia[] | null>(null);
  const [area, setArea]       = useState<string>("TODAS");
  const [rango, setRango]     = useState<Rango>("ACTIVAS");

  useEffect(() => {
    fetch("/api/tareas/mis-pendientes")
      .then(r => r.ok ? r.json() : null)
      .then(d => setTareas(d?.tareas ?? []))
      .catch(() => setTareas([]));
  }, []);

  function onCompletar(id: string) {
    setTareas(prev => (prev ?? []).filter(t => t.id !== id));
    fetch(`/api/tareas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "COMPLETADA" }),
    }).catch(() => {});
  }

  const filtradas = useMemo(() => {
    if (!tareas) return [];
    const hoy = todayISO();
    return tareas.filter(t => {
      if (area !== "TODAS" && t.area !== area) return false;
      if (rango === "TODAS") return true;
      const iso = t.fecha?.substring(0, 10) ?? null;
      if (rango === "VENCIDAS") return !!iso && iso < hoy;
      if (rango === "HOY") return iso === hoy;
      if (rango === "ACTIVAS") {
        if (!iso) return false; // sin fecha: solo visible en "Todas"
        const diff = Math.round((new Date(iso).getTime() - new Date(hoy).getTime()) / 86400000);
        return diff <= 7; // vencidas + hoy + próximos 7 días
      }
      return true;
    });
  }, [tareas, area, rango]);

  const porArea = useMemo(() => {
    const map: Record<string, TareaMia[]> = {};
    for (const t of filtradas) (map[t.area] ??= []).push(t);
    return map;
  }, [filtradas]);

  const areasConDatos = useMemo(() => {
    const presentes = new Set((tareas ?? []).map(t => t.area));
    return AREA_ORDEN.filter(a => presentes.has(a));
  }, [tareas]);

  if (tareas === null) {
    return <div className="h-40 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl animate-pulse" />;
  }

  const vencidas = tareas.filter(t => t.fecha && t.fecha.substring(0, 10) < todayISO()).length;
  const urgentes = tareas.filter(t => t.prioridad === "URGENTE").length;

  return (
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 border-b border-[#1a1a1a]">
        <ClipboardList strokeWidth={1.75} className="w-4 h-4 text-[#B3985B]" />
        <p className="text-[11px] font-bold text-[#B3985B] uppercase tracking-widest">Mis tareas pendientes</p>
        <span className="text-[10px] text-gray-500">{tareas.length} en total</span>
        {urgentes > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full font-semibold">
            <Zap strokeWidth={1.75} className="w-3 h-3" /> {urgentes}
          </span>
        )}
        {vencidas > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] bg-orange-900/30 text-orange-400 px-2 py-0.5 rounded-full font-semibold">
            <AlertTriangle strokeWidth={1.75} className="w-3 h-3" /> {vencidas} vencida{vencidas !== 1 ? "s" : ""}
          </span>
        )}
        <div className="flex-1" />
        <Link href="/operaciones" className="text-[#B3985B] text-xs hover:underline shrink-0">Gestión operativa →</Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-[#141414]">
        {(["ACTIVAS", "VENCIDAS", "HOY", "TODAS"] as Rango[]).map(r => (
          <button
            key={r}
            onClick={() => setRango(r)}
            className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${
              rango === r ? "bg-[#B3985B] text-black" : "bg-[#1a1a1a] text-gray-500 hover:text-gray-300"
            }`}
          >
            {r === "ACTIVAS" ? "Próximos 7 días" : r === "VENCIDAS" ? "Vencidas" : r === "HOY" ? "Hoy" : "Todas"}
          </button>
        ))}
        <div className="w-px h-4 bg-[#222] mx-1" />
        <div className="relative inline-block">
          <select
            value={area}
            onChange={e => setArea(e.target.value)}
            className="appearance-none text-[10px] bg-[#1a1a1a] text-gray-400 pl-2 pr-6 py-1 rounded-full font-medium cursor-pointer outline-none hover:text-gray-200"
          >
            <option value="TODAS">Todas las áreas</option>
            {areasConDatos.map(a => <option key={a} value={a}>{AREA_LABELS[a] ?? a}</option>)}
          </select>
          <ChevronDown strokeWidth={2} className="w-3 h-3 text-gray-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Contenido */}
      {filtradas.length === 0 ? (
        <div className="py-10 text-center">
          <PartyPopper strokeWidth={1.75} className="w-6 h-6 mx-auto mb-2 text-[#B3985B]" />
          <p className="text-[#555] text-sm">
            {tareas.length === 0 ? "Sin tareas pendientes asignadas" : "Nada en este filtro"}
          </p>
        </div>
      ) : area !== "TODAS" ? (
        <div className="divide-y divide-[#131313]">
          {filtradas.map(t => <Fila key={t.id} t={t} onCompletar={onCompletar} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-[#141414]">
          {AREA_ORDEN.filter(a => (porArea[a]?.length ?? 0) > 0).map(a => (
            <div key={a} className="bg-[#0f0f0f]">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0a]">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${AREA_DOT[a]}`} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex-1">{AREA_LABELS[a] ?? a}</p>
                <span className="text-[9px] text-gray-600">{porArea[a].length}</span>
              </div>
              <div className="divide-y divide-[#131313] max-h-56 overflow-y-auto">
                {porArea[a].map(t => <Fila key={t.id} t={t} onCompletar={onCompletar} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
