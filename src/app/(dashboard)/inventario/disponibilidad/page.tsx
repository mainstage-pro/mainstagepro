"use client";

import { useState, useCallback } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface EquipoDisp {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  categoria: string;
  cantidadTotal: number;
  comprometido: number;
  disponible: number;
  sobredemanda: number;
  eventos: Array<{ tipo: "COT" | "PROY"; ref: string; nombre: string; estado: string; fecha: string | null }>;
}

interface EventoResumen {
  tipo: "COT" | "PROY";
  ref: string;
  nombre: string;
  empresa: string | null;
  estado: string;
  fecha: string | null;
}

interface Resultado {
  equipos: EquipoDisp[];
  eventos: EventoResumen[];
  fechas: string[];
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: "bg-gray-800 text-gray-400",
  ENVIADA: "bg-blue-900/40 text-blue-300",
  EN_REVISION: "bg-yellow-900/30 text-yellow-400",
  APROBADA: "bg-green-900/40 text-green-300",
  PLANEACION: "bg-blue-900/40 text-blue-300",
  CONFIRMADO: "bg-green-900/40 text-green-300",
  EN_CURSO: "bg-yellow-900/30 text-yellow-400",
  COMPLETADO: "bg-gray-700 text-gray-400",
};

function hoy() {
  return new Date().toISOString().split("T")[0];
}

function fmtFecha(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

const MAX_FECHAS = 3;

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DisponibilidadPage() {
  const [fechas, setFechas] = useState<string[]>([hoy()]);
  const [inputFecha, setInputFecha] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [loading, setLoading] = useState(false);
  const [soloConflictos, setSoloConflictos] = useState(false);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  function agregarFecha() {
    if (!inputFecha) return;
    if (fechas.includes(inputFecha)) return; // no duplicar
    if (fechas.length >= MAX_FECHAS) return;
    setFechas(prev => [...prev, inputFecha].sort());
    setInputFecha("");
  }

  function quitarFecha(f: string) {
    setFechas(prev => prev.filter(x => x !== f));
    setResultado(null);
  }

  const consultar = useCallback(async () => {
    if (fechas.length === 0) return;
    setLoading(true);
    setResultado(null);
    setExpandidoId(null);
    try {
      const qs = new URLSearchParams({ fechas: fechas.join(",") });
      const res = await fetch(`/api/inventario/disponibilidad?${qs}`);
      const d = await res.json();
      setResultado(d);
    } finally {
      setLoading(false);
    }
  }, [fechas]);

  // Agrupado por categoría
  const porCategoria = resultado
    ? resultado.equipos.reduce<Record<string, EquipoDisp[]>>((acc, eq) => {
        if (!acc[eq.categoria]) acc[eq.categoria] = [];
        acc[eq.categoria].push(eq);
        return acc;
      }, {})
    : {};

  const equiposFiltrados: Record<string, EquipoDisp[]> = soloConflictos
    ? Object.fromEntries(
        Object.entries(porCategoria)
          .map(([cat, eqs]) => [cat, eqs.filter((e) => e.comprometido > 0)] as [string, EquipoDisp[]])
          .filter(([, eqs]) => eqs.length > 0)
      )
    : porCategoria;

  const totalEquipos = resultado?.equipos.length ?? 0;
  const totalComprometidos = resultado?.equipos.filter((e) => e.comprometido > 0).length ?? 0;
  const totalSobredemanda = resultado?.equipos.filter((e) => e.sobredemanda > 0).length ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Disponibilidad de equipos</h1>
        <p className="text-gray-500 text-sm mt-1">
          Consulta qué equipos propios están comprometidos en cotizaciones y proyectos activos para fechas específicas.
        </p>
      </div>

      {/* Selector de fechas */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
          Fechas a consultar <span className="text-gray-700">(máx. {MAX_FECHAS})</span>
        </p>

        {/* Chips de fechas seleccionadas */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {fechas.map((f) => (
            <div key={f} className="flex items-center gap-1.5 bg-[#B3985B]/10 border border-[#B3985B]/40 text-[#B3985B] rounded-lg px-3 py-1.5 text-sm">
              <span>{fmtFecha(f)}</span>
              <button
                onClick={() => quitarFecha(f)}
                className="text-[#B3985B]/60 hover:text-white transition-colors ml-1 leading-none"
              >×</button>
            </div>
          ))}
          {fechas.length === 0 && (
            <p className="text-gray-600 text-sm italic">Sin fechas seleccionadas</p>
          )}
        </div>

        {/* Input para agregar fecha */}
        <div className="flex items-end gap-3 flex-wrap">
          {fechas.length < MAX_FECHAS && (
            <div className="flex items-end gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">
                  {fechas.length === 0 ? "Selecciona una fecha" : "Agregar otra fecha"}
                </label>
                <input
                  type="date"
                  value={inputFecha}
                  onChange={e => setInputFecha(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && agregarFecha()}
                  className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <button
                onClick={agregarFecha}
                disabled={!inputFecha || fechas.includes(inputFecha)}
                className="bg-[#1a1a1a] border border-[#333] hover:border-[#B3985B] disabled:opacity-30 text-gray-300 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                + Agregar
              </button>
            </div>
          )}

          <button
            onClick={consultar}
            disabled={loading || fechas.length === 0}
            className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold text-sm px-6 py-2 rounded-lg transition-colors"
          >
            {loading ? "Consultando..." : "Consultar disponibilidad"}
          </button>

          {resultado && (
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox" checked={soloConflictos}
                onChange={e => setSoloConflictos(e.target.checked)}
                className="accent-[#B3985B] w-4 h-4"
              />
              Solo equipos comprometidos
            </label>
          )}
        </div>
      </div>

      {/* Resultados */}
      {resultado && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">

          {/* Panel izquierdo: tabla de equipos */}
          <div className="xl:col-span-3 space-y-4">

            {/* Subtítulo con fechas consultadas */}
            <p className="text-xs text-gray-500 uppercase tracking-wider px-1">
              Resultado para: {resultado.fechas.map(f => fmtFecha(f)).join(" · ")}
            </p>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
                <p className="text-gray-500 text-xs mb-1">Equipos propios</p>
                <p className="text-white text-2xl font-bold">{totalEquipos}</p>
              </div>
              <div className={`border rounded-xl p-4 text-center ${totalComprometidos > 0 ? "bg-yellow-950/30 border-yellow-800/40" : "bg-[#111] border-[#222]"}`}>
                <p className="text-gray-500 text-xs mb-1">Con compromiso</p>
                <p className={`text-2xl font-bold ${totalComprometidos > 0 ? "text-yellow-400" : "text-white"}`}>{totalComprometidos}</p>
              </div>
              <div className={`border rounded-xl p-4 text-center ${totalSobredemanda > 0 ? "bg-red-950/30 border-red-800/40" : "bg-[#111] border-[#222]"}`}>
                <p className="text-gray-500 text-xs mb-1">Sobredemanda</p>
                <p className={`text-2xl font-bold ${totalSobredemanda > 0 ? "text-red-400" : "text-white"}`}>{totalSobredemanda}</p>
              </div>
            </div>

            {/* Tabla por categoría */}
            {Object.keys(equiposFiltrados).length === 0 ? (
              <div className="bg-[#111] border border-[#222] rounded-xl p-10 text-center">
                <p className="text-gray-500 text-sm">
                  {soloConflictos ? "Ningún equipo comprometido en las fechas seleccionadas." : "Sin equipos propios registrados."}
                </p>
              </div>
            ) : (
              Object.entries(equiposFiltrados).map(([categoria, equipos]) => (
                <div key={categoria} className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  <div className="px-5 py-3 bg-[#1a1a1a] border-b border-[#222]">
                    <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">{categoria}</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-600 text-xs uppercase tracking-wider border-b border-[#1a1a1a]">
                        <th className="text-left px-5 py-2 font-medium">Equipo</th>
                        <th className="text-center px-3 py-2 font-medium w-20">Total</th>
                        <th className="text-center px-3 py-2 font-medium w-28">Comprometido</th>
                        <th className="text-center px-3 py-2 font-medium w-24">Disponible</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {equipos.map((eq) => {
                        const pct = eq.cantidadTotal > 0 ? (eq.comprometido / eq.cantidadTotal) * 100 : 0;
                        const esConflicto = eq.sobredemanda > 0;
                        const expandido = expandidoId === eq.id;
                        return (
                          <>
                            <tr
                              key={eq.id}
                              onClick={() => eq.eventos.length > 0 && setExpandidoId(expandido ? null : eq.id)}
                              className={`border-b border-[#0d0d0d] last:border-0 transition-colors ${
                                eq.eventos.length > 0 ? "cursor-pointer hover:bg-[#1a1a1a]" : ""
                              } ${esConflicto ? "bg-red-950/10" : ""}`}
                            >
                              <td className="px-5 py-3">
                                <p className="text-white font-medium leading-tight">{eq.descripcion}</p>
                                {(eq.marca || eq.modelo) && (
                                  <p className="text-gray-600 text-xs">{[eq.marca, eq.modelo].filter(Boolean).join(" ")}</p>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center text-gray-300">{eq.cantidadTotal}</td>
                              <td className="px-3 py-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={eq.comprometido > 0 ? "text-yellow-400 font-semibold" : "text-gray-600"}>
                                    {eq.comprometido}
                                  </span>
                                  {eq.comprometido > 0 && (
                                    <div className="w-16 h-1 bg-[#333] rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${pct > 100 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-[#B3985B]"}`}
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center">
                                {esConflicto ? (
                                  <span className="text-red-400 font-bold">−{eq.sobredemanda} ⚠</span>
                                ) : (
                                  <span className={eq.disponible === eq.cantidadTotal ? "text-green-400" : "text-white"}>
                                    {eq.disponible}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-3 text-center text-gray-600 text-xs">
                                {eq.eventos.length > 0 && (expandido ? "▲" : "▼")}
                              </td>
                            </tr>
                            {expandido && eq.eventos.length > 0 && (
                              <tr key={`${eq.id}-det`} className="bg-[#0d0d0d]">
                                <td colSpan={5} className="px-5 py-3">
                                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Comprometido en:</p>
                                  <div className="space-y-1.5">
                                    {eq.eventos.map((ev, i) => (
                                      <div key={i} className="flex items-center gap-3 text-xs">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                                          ev.tipo === "COT" ? "bg-blue-900/30 text-blue-400" : "bg-green-900/30 text-green-400"
                                        }`}>
                                          {ev.tipo === "COT" ? "Cot. pend." : "Proyecto"}
                                        </span>
                                        {ev.fecha && (
                                          <span className="text-gray-600 shrink-0">{fmtFecha(ev.fecha)}</span>
                                        )}
                                        <span className="text-gray-400 font-mono shrink-0">{ev.ref}</span>
                                        <span className="text-gray-300 truncate">{ev.nombre}</span>
                                        <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] shrink-0 ${ESTADO_BADGE[ev.estado] ?? "bg-gray-800 text-gray-400"}`}>
                                          {ev.estado}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>

          {/* Panel derecho: eventos en esas fechas */}
          <div className="xl:col-span-1 space-y-4">
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1a1a1a]">
                <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Eventos encontrados</p>
                <p className="text-gray-600 text-xs mt-0.5">{resultado.eventos.length} en las fechas seleccionadas</p>
              </div>
              {resultado.eventos.length === 0 ? (
                <p className="text-gray-600 text-xs text-center py-6">Sin eventos en esas fechas</p>
              ) : (
                <div className="divide-y divide-[#1a1a1a]">
                  {resultado.eventos.map((ev, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                          ev.tipo === "COT" ? "bg-blue-900/30 text-blue-400" : "bg-green-900/30 text-green-400"
                        }`}>
                          {ev.tipo === "COT" ? "Cot." : "Proy."}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${ESTADO_BADGE[ev.estado] ?? "bg-gray-800 text-gray-400"}`}>
                          {ev.estado}
                        </span>
                      </div>
                      <p className="text-white text-xs font-medium leading-snug">{ev.nombre}</p>
                      {ev.empresa && <p className="text-gray-600 text-[10px]">{ev.empresa}</p>}
                      <p className="text-gray-700 text-[10px] font-mono mt-0.5">{ev.ref}</p>
                      {ev.fecha && <p className="text-gray-600 text-[10px] mt-0.5">{fmtFecha(ev.fecha)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leyenda */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-xs space-y-2">
              <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-2">Leyenda</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500 shrink-0" />
                <span className="text-gray-400">Todo disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#B3985B] shrink-0" />
                <span className="text-gray-400">Parcialmente comprometido</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-500 shrink-0" />
                <span className="text-gray-400">Alta demanda (&gt;70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500 shrink-0" />
                <span className="text-gray-400">Sobredemanda — necesitas subrentar</span>
              </div>
              <p className="text-gray-700 text-[10px] mt-3 leading-relaxed">
                Si consultas varias fechas, la disponibilidad muestra el acumulado combinado de todas las fechas.
              </p>
            </div>
          </div>

        </div>
      )}

      {!resultado && !loading && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-12 text-center">
          <p className="text-3xl mb-3">📦</p>
          <p className="text-gray-400 text-sm">Agrega hasta {MAX_FECHAS} fechas y presiona <strong className="text-white">Consultar disponibilidad</strong></p>
          <p className="text-gray-600 text-xs mt-1">
            Verás todos tus equipos propios con cuántos están comprometidos en cotizaciones pendientes y proyectos activos.
          </p>
        </div>
      )}

    </div>
  );
}
