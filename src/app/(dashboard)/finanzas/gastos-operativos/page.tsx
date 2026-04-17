"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SkeletonTable } from "@/components/Skeleton";

interface GastoRow {
  id: string;
  proyectoId: string;
  tipo: string;
  concepto: string;
  monto: number;
  cantidad: number;
  entregado: boolean;
  fechaEntrega: string | null;
  notas: string | null;
  createdAt: string;
  proyectoNombre?: string;
  fechaEvento?: string;
  numeroProyecto?: string;
}

const TIPO_LABELS: Record<string, string> = {
  COMIDA: "Comida",
  TRANSPORTE: "Transporte",
  HOSPEDAJE: "Hospedaje",
  OTRO: "Otro",
};
const TIPO_COLORS: Record<string, string> = {
  COMIDA:     "bg-orange-900/30 text-orange-300",
  TRANSPORTE: "bg-blue-900/30 text-blue-300",
  HOSPEDAJE:  "bg-purple-900/30 text-purple-300",
  OTRO:       "bg-gray-800 text-gray-400",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}
function getDayOfWeek(s?: string | null) {
  if (!s) return null;
  return new Date(s).getDay(); // 0=dom, 1=lun ... 4=jue
}

// Agrupa gastos pendientes por semana (lunes–domingo) para la vista de admin
function groupByWeek(gastos: GastoRow[]) {
  const weeks: Map<string, GastoRow[]> = new Map();
  for (const g of gastos) {
    if (!g.fechaEvento) continue;
    const d = new Date(g.fechaEvento);
    // Lunes de esa semana
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const lunes = new Date(d.setDate(diff));
    const key = lunes.toISOString().slice(0, 10);
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key)!.push(g);
  }
  return [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default function GastosOperativosPage() {
  const [gastos, setGastos] = useState<GastoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState("TODOS");
  const [showEntregados, setShowEntregados] = useState(false);

  async function load() {
    const r = await fetch("/api/proyectos/gastos-operativos");
    const d = await r.json();
    setGastos(d.gastos ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleEntregado(g: GastoRow) {
    setToggling(g.id);
    await fetch("/api/proyectos/gastos-operativos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: g.id, entregado: !g.entregado }),
    });
    await load();
    setToggling(null);
  }

  const pendientes = gastos.filter(g => !g.entregado && (filterTipo === "TODOS" || g.tipo === filterTipo));
  const entregados = gastos.filter(g =>  g.entregado && (filterTipo === "TODOS" || g.tipo === filterTipo));

  const totalPendiente = pendientes.reduce((s, g) => s + g.monto * g.cantidad, 0);
  const weeks = groupByWeek(pendientes);

  // Resaltar semana donde el jueves ya pasó o es esta semana
  const today = new Date();
  const thisMonday = (() => {
    const d = new Date(today);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Gastos Operativos</h1>
          <p className="text-[#6b7280] text-sm">
            Efectivo para coordinación · {pendientes.length} pendientes ·{" "}
            <span className="text-[#B3985B] font-medium">{fmt(totalPendiente)}</span> por entregar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
            className="bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none">
            <option value="TODOS">Todos los tipos</option>
            <option value="COMIDA">Comida</option>
            <option value="TRANSPORTE">Transporte</option>
            <option value="HOSPEDAJE">Hospedaje</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : pendientes.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm">Sin gastos operativos pendientes</p>
          <p className="text-gray-700 text-xs mt-1">Los gastos de comida, transporte y hospedaje de los proyectos aparecen aquí</p>
        </div>
      ) : (
        <div className="space-y-6">
          {weeks.map(([weekKey, items]) => {
            const lunesDate = new Date(weekKey + "T12:00:00");
            const juevesDate = new Date(lunesDate);
            juevesDate.setDate(lunesDate.getDate() + 3);
            const isThisWeek = weekKey === thisMonday;
            const juevesYaPaso = juevesDate < today;
            const totalSemana = items.reduce((s, g) => s + g.monto * g.cantidad, 0);

            // Agrupa por proyecto dentro de la semana
            const porProyecto = new Map<string, { nombre: string; numero: string; fecha: string | null | undefined; items: GastoRow[] }>();
            for (const g of items) {
              if (!porProyecto.has(g.proyectoId)) {
                porProyecto.set(g.proyectoId, { nombre: g.proyectoNombre ?? g.proyectoId, numero: g.numeroProyecto ?? "", fecha: g.fechaEvento, items: [] });
              }
              porProyecto.get(g.proyectoId)!.items.push(g);
            }

            return (
              <div key={weekKey} className={`rounded-xl border overflow-hidden ${isThisWeek ? "border-[#B3985B]/40" : "border-[#1e1e1e]"}`}>
                {/* Semana header */}
                <div className={`flex items-center justify-between px-5 py-3 ${isThisWeek ? "bg-[#B3985B]/10" : "bg-[#0d0d0d]"}`}>
                  <div className="flex items-center gap-3">
                    {isThisWeek && (
                      <span className="text-[10px] bg-[#B3985B] text-black font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Esta semana</span>
                    )}
                    <p className="text-white text-sm font-semibold">
                      Semana del {lunesDate.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
                    </p>
                    <p className={`text-xs ${juevesYaPaso && isThisWeek ? "text-red-400" : "text-gray-500"}`}>
                      · Preparar antes del jueves {juevesDate.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                      {juevesYaPaso && isThisWeek && " ⚠"}
                    </p>
                  </div>
                  <p className="text-[#B3985B] font-semibold text-sm">{fmt(totalSemana)}</p>
                </div>

                {/* Proyectos de la semana */}
                {[...porProyecto.entries()].map(([proyId, proy]) => {
                  const totalProy = proy.items.reduce((s, g) => s + g.monto * g.cantidad, 0);
                  return (
                    <div key={proyId} className="border-t border-[#1a1a1a]">
                      {/* Proyecto subheader */}
                      <div className="flex items-center justify-between px-5 py-2.5 bg-[#111]">
                        <div className="flex items-center gap-3">
                          <Link href={`/proyectos/${proyId}`} className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors">
                            {proy.nombre}
                          </Link>
                          <span className="text-gray-600 text-xs">{proy.numero}</span>
                          <span className="text-gray-500 text-xs">{fmtDate(proy.fecha)}</span>
                        </div>
                        <p className="text-gray-400 text-xs">{fmt(totalProy)}</p>
                      </div>

                      {/* Líneas de gasto */}
                      {proy.items.map(g => (
                        <div key={g.id}
                          className="flex items-center gap-4 px-5 py-3 border-t border-[#1a1a1a] hover:bg-[#0d0d0d] transition-colors">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${TIPO_COLORS[g.tipo] ?? TIPO_COLORS.OTRO}`}>
                            {TIPO_LABELS[g.tipo] ?? g.tipo}
                          </span>
                          <p className="flex-1 text-white/80 text-sm">{g.concepto}</p>
                          {g.cantidad > 1 && (
                            <span className="text-gray-600 text-xs shrink-0">×{g.cantidad}</span>
                          )}
                          <p className="text-white text-sm font-medium w-24 text-right shrink-0">
                            {fmt(g.monto * g.cantidad)}
                          </p>
                          <button
                            onClick={() => toggleEntregado(g)}
                            disabled={toggling === g.id}
                            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                              toggling === g.id ? "opacity-50 cursor-wait" :
                              "border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B] hover:text-black"
                            }`}
                          >
                            Entregar
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Entregados */}
      {entregados.length > 0 && (
        <div>
          <button onClick={() => setShowEntregados(v => !v)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            {showEntregados ? "▾" : "▸"} Entregados ({entregados.length})
          </button>
          {showEntregados && (
            <div className="mt-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
              {entregados.map(g => (
                <div key={g.id}
                  className="flex items-center gap-4 px-5 py-3 border-b border-[#1a1a1a] last:border-0 opacity-50">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${TIPO_COLORS[g.tipo] ?? TIPO_COLORS.OTRO}`}>
                    {TIPO_LABELS[g.tipo] ?? g.tipo}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-sm truncate">{g.concepto}</p>
                    {g.proyectoNombre && <p className="text-gray-600 text-xs">{g.proyectoNombre}</p>}
                  </div>
                  <p className="text-gray-500 text-sm w-24 text-right shrink-0">{fmt(g.monto * g.cantidad)}</p>
                  <button onClick={() => toggleEntregado(g)} disabled={toggling === g.id}
                    className="shrink-0 text-xs text-gray-600 hover:text-white transition-colors px-2 py-1">
                    Deshacer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
