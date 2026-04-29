"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonalSlot {
  id: string;
  tecnicoId: string | null;
  tecnicoNombre: string | null;
  rolNombre: string | null;
  participacion: string | null;
  fechaJornada: string | null;
  nivel: string | null;
  jornada: string | null;
  tarifaAcordada: number | null;
  estadoPago: string;
}

interface ProyectoCiclo {
  id: string;
  nombre: string;
  cliente: string;
  fechaEvento: string;
  presupuestoOp: number;
  personal: PersonalSlot[];
}

interface NominaPago {
  proyectoId: string;
  proyectoNombre: string;
  monto: number;
  estadoPago: string;
}

interface NominaRow {
  tecnicoId: string;
  tecnicoNombre: string;
  pagos: NominaPago[];
  total: number;
  todosPagados: boolean;
}

interface CicloData {
  ciclo: string;
  desde: string;
  hasta: string;
  proyectos: ProyectoCiclo[];
  nomina: NominaRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("es-MX", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...opts,
  });
}

function cicloActual(): string {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
  return d.toISOString().slice(0, 10);
}

function prevCiclo(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function nextCiclo(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

const TIPO_LABELS: Record<string, string> = {
  MONTAJE: "Montaje",
  OPERACION: "Operación",
  DESMONTAJE: "Desmontaje",
  TRANSPORTE: "Transporte",
  OTRO: "Otro",
};

const TIPO_COLORS: Record<string, string> = {
  MONTAJE: "text-blue-400",
  OPERACION: "text-[#B3985B]",
  DESMONTAJE: "text-purple-400",
  TRANSPORTE: "text-cyan-400",
  OTRO: "text-gray-400",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PagosPersonalPage() {
  const [ciclo, setCiclo] = useState(cicloActual);
  const [data, setData] = useState<CicloData | null>(null);
  const [loading, setLoading] = useState(true);
  const [marcando, setMarcando] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/pagos-personal?ciclo=${ciclo}`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, [ciclo]);

  useEffect(() => { load(); }, [load]);

  async function marcarPagado(row: NominaRow) {
    setMarcando((prev) => new Set([...prev, row.tecnicoId]));
    await fetch("/api/pagos-personal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tecnicoId: row.tecnicoId, proyectoIds: row.pagos.map((p) => p.proyectoId) }),
    });
    await load();
    setMarcando((prev) => { const s = new Set(prev); s.delete(row.tecnicoId); return s; });
  }

  // Totals
  const totalPresupuestado = data?.proyectos.reduce((s, p) => s + p.presupuestoOp, 0) ?? 0;
  const totalAsignado = data?.proyectos.reduce(
    (s, p) => s + p.personal.reduce((ss, pp) => ss + (pp.tarifaAcordada ?? 0), 0), 0
  ) ?? 0;
  const totalPendiente = data?.nomina.filter((r) => !r.todosPagados).reduce((s, r) => s + r.total, 0) ?? 0;
  const totalPagado = data?.nomina.filter((r) => r.todosPagados).reduce((s, r) => s + r.total, 0) ?? 0;

  // All project names for nomina columns
  const proyectosEnCiclo = data?.proyectos ?? [];

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Pagos a Personal</h1>
          <p className="text-gray-500 text-sm mt-0.5">Ciclo semanal · miércoles de pago</p>
        </div>
        {/* Cycle navigation */}
        <div className="flex items-center gap-2 bg-[#111] border border-[#222] rounded-xl px-3 py-2">
          <button onClick={() => setCiclo(prevCiclo(ciclo))} className="text-gray-400 hover:text-white px-1 transition-colors">‹</button>
          <div className="text-center">
            <p className="text-xs text-gray-500">Ciclo de pago</p>
            <input
              type="date"
              value={ciclo}
              onChange={e => setCiclo(e.target.value)}
              className="bg-transparent text-white text-sm font-semibold focus:outline-none text-center"
            />
          </div>
          <button onClick={() => setCiclo(nextCiclo(ciclo))} className="text-gray-400 hover:text-white px-1 transition-colors">›</button>
        </div>
      </div>

      {/* ── Summary band ── */}
      {data && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Proyectos</p>
            <p className="text-2xl font-bold text-white">{data.proyectos.length}</p>
            <p className="text-xs text-gray-600 mt-0.5">{fmtDate(data.desde, { weekday: undefined })} – {fmtDate(data.hasta, { weekday: undefined })}</p>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Presupuesto operación</p>
            <p className="text-2xl font-bold text-white">{fmt(totalPresupuestado)}</p>
            <p className="text-xs text-gray-600 mt-0.5">cotizado</p>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total asignado</p>
            <p className={`text-2xl font-bold ${totalAsignado > totalPresupuestado ? "text-red-400" : "text-[#B3985B]"}`}>{fmt(totalAsignado)}</p>
            <p className={`text-xs mt-0.5 ${totalAsignado > totalPresupuestado ? "text-red-500" : "text-gray-600"}`}>
              {totalPresupuestado > 0 ? `${Math.round((totalAsignado / totalPresupuestado) * 100)}% del presupuesto` : "sin presupuesto"}
            </p>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Por pagar</p>
            <p className="text-2xl font-bold text-yellow-400">{fmt(totalPendiente)}</p>
            {totalPagado > 0 && <p className="text-xs text-green-500 mt-0.5">{fmt(totalPagado)} ya pagado</p>}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-gray-500">Cargando ciclo...</div>
      )}

      {!loading && data && data.proyectos.length === 0 && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-10 text-center">
          <p className="text-gray-400 text-sm">No hay proyectos en este ciclo</p>
          <p className="text-gray-600 text-xs mt-1">{fmtDate(data.desde)} al {fmtDate(data.hasta)}</p>
        </div>
      )}

      {!loading && data && data.proyectos.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 items-start">

          {/* ── Left: Per-project breakdown ── */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Desglose por proyecto</h2>

            {proyectosEnCiclo.map((p) => {
              const totalPersonal = p.personal.reduce((s, pp) => s + (pp.tarifaAcordada ?? 0), 0);
              const sinAsignar = p.personal.filter((pp) => !pp.tecnicoId).length;
              const sinTarifa = p.personal.filter((pp) => pp.tecnicoId && pp.tarifaAcordada == null).length;
              const diff = totalPersonal - p.presupuestoOp;

              // Group by participacion + fechaJornada
              const grupos = new Map<string, PersonalSlot[]>();
              for (const pp of p.personal) {
                const key = `${pp.participacion ?? "OTRO"}|${pp.fechaJornada ?? ""}`;
                if (!grupos.has(key)) grupos.set(key, []);
                grupos.get(key)!.push(pp);
              }

              return (
                <div key={p.id} className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  {/* Project header */}
                  <div className="px-5 py-3 bg-[#1a1a1a] flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <Link href={`/proyectos/${p.id}`} className="text-white font-semibold hover:text-[#B3985B] transition-colors text-sm">
                        {p.nombre}
                      </Link>
                      <p className="text-gray-500 text-xs">{p.cliente} · {fmtDate(p.fechaEvento, { weekday: "long", day: "numeric", month: "long" })}</p>
                    </div>
                    <div className="text-right">
                      {p.presupuestoOp > 0 && (
                        <p className="text-xs text-gray-500">Presupuesto: <span className="text-gray-300">{fmt(p.presupuestoOp)}</span></p>
                      )}
                      {sinAsignar > 0 && <p className="text-xs text-yellow-500">{sinAsignar} sin asignar</p>}
                      {sinTarifa > 0 && <p className="text-xs text-orange-400">{sinTarifa} sin tarifa</p>}
                    </div>
                  </div>

                  {/* Personal table */}
                  {p.personal.length === 0 ? (
                    <p className="text-gray-600 text-xs text-center py-4">Sin personal registrado</p>
                  ) : (
                    <div>
                      {/* Column headers */}
                      <div className="grid grid-cols-[1fr_1fr_90px_80px_72px] gap-2 px-4 py-1.5 border-b border-[#0d0d0d]">
                        {["Técnico", "Rol", "Tipo · Fecha", "Tarifa", "Estado"].map((h) => (
                          <p key={h} className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">{h}</p>
                        ))}
                      </div>

                      {Array.from(grupos.entries()).map(([key, slots]) => {
                        const [tipo, fecha] = key.split("|");
                        return (
                          <div key={key}>
                            {/* Group sub-header */}
                            <div className="px-4 py-1 bg-[#0d0d0d] flex items-center gap-2">
                              <span className={`text-[10px] font-semibold uppercase tracking-wider ${TIPO_COLORS[tipo] ?? "text-gray-400"}`}>
                                {TIPO_LABELS[tipo] ?? tipo}
                              </span>
                              {fecha && <span className="text-[10px] text-gray-600">{fmtDate(fecha)}</span>}
                              <span className="text-[10px] text-gray-700 ml-auto">{slots.length} técnico{slots.length !== 1 ? "s" : ""}</span>
                            </div>

                            {slots.map((pp) => (
                              <div key={pp.id} className="grid grid-cols-[1fr_1fr_90px_80px_72px] gap-2 px-4 py-2 border-b border-[#0d0d0d] last:border-0 items-center">
                                <p className={`text-sm truncate ${pp.tecnicoNombre ? "text-white" : "text-yellow-500 italic"}`}>
                                  {pp.tecnicoNombre ?? "Sin asignar"}
                                </p>
                                <p className="text-xs text-gray-400 truncate">{pp.rolNombre ?? "—"}</p>
                                <p className="text-xs text-gray-500">{pp.jornada ?? "—"}</p>
                                <p className={`text-sm font-medium text-right ${pp.tarifaAcordada != null ? "text-white" : "text-gray-600"}`}>
                                  {pp.tarifaAcordada != null ? fmt(pp.tarifaAcordada) : "—"}
                                </p>
                                <div className="flex justify-end">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                    pp.estadoPago === "PAGADO"
                                      ? "bg-green-900/40 text-green-400"
                                      : pp.tarifaAcordada != null
                                        ? "bg-yellow-900/30 text-yellow-400"
                                        : "text-gray-700"
                                  }`}>
                                    {pp.tecnicoId ? (pp.estadoPago === "PAGADO" ? "Pagado" : "Pend.") : "—"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Project footer */}
                  <div className="px-5 py-3 bg-[#0d0d0d] flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex gap-4 text-xs">
                      <span className="text-gray-500">Total personal: <span className="text-white font-semibold">{fmt(totalPersonal)}</span></span>
                      {p.presupuestoOp > 0 && (
                        <span className={`${Math.abs(diff) < 1 ? "text-gray-500" : diff > 0 ? "text-red-400" : "text-green-400"}`}>
                          {diff > 0 ? `+${fmt(diff)} sobre presupuesto` : diff < 0 ? `${fmt(diff)} bajo presupuesto` : "= presupuesto"}
                        </span>
                      )}
                    </div>
                    <Link href={`/proyectos/${p.id}`} className="text-xs text-gray-600 hover:text-[#B3985B] transition-colors">
                      Editar en proyecto →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Right: Nómina semanal ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden sticky top-6">
            <div className="px-5 py-3 bg-[#1a1a1a] border-b border-[#222]">
              <p className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Nómina de la semana</p>
              <p className="text-xs text-gray-600 mt-0.5">
                {data.nomina.length} técnico{data.nomina.length !== 1 ? "s" : ""}
                {" · "}miércoles {fmtDate(ciclo, { weekday: undefined, day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            {data.nomina.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">Sin técnicos asignados en este ciclo</p>
            ) : (
              <div>
                {data.nomina.map((row) => (
                  <div key={row.tecnicoId} className={`border-b border-[#0d0d0d] last:border-0 ${row.todosPagados ? "opacity-60" : ""}`}>
                    <div className="px-5 py-3">
                      {/* Technician name + total */}
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white text-sm font-medium">{row.tecnicoNombre}</p>
                        <p className={`text-base font-bold ${row.todosPagados ? "text-green-400" : "text-[#B3985B]"}`}>
                          {fmt(row.total)}
                        </p>
                      </div>

                      {/* Per-project breakdown */}
                      <div className="space-y-0.5 mb-3">
                        {row.pagos.map((pago) => (
                          <div key={pago.proyectoId} className="flex items-center justify-between">
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{pago.proyectoNombre}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-300">{fmt(pago.monto)}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                pago.estadoPago === "PAGADO"
                                  ? "bg-green-900/30 text-green-400"
                                  : "bg-yellow-900/20 text-yellow-500"
                              }`}>
                                {pago.estadoPago === "PAGADO" ? "✓" : "Pend."}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Action button */}
                      {!row.todosPagados ? (
                        <button
                          onClick={() => marcarPagado(row)}
                          disabled={marcando.has(row.tecnicoId)}
                          className="w-full py-1.5 rounded-lg bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold transition-colors"
                        >
                          {marcando.has(row.tecnicoId) ? "Marcando..." : `Marcar pagado ${fmt(row.total)}`}
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 py-1.5 text-xs text-green-500">
                          <span>✓</span>
                          <span>Pagado</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Nómina footer */}
                <div className="px-5 py-3 bg-[#0d0d0d] border-t border-[#222]">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Pendiente de pago</span>
                    <span className="text-yellow-400 font-semibold">{fmt(totalPendiente)}</span>
                  </div>
                  {totalPagado > 0 && (
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Ya pagado</span>
                      <span className="text-green-500">{fmt(totalPagado)}</span>
                    </div>
                  )}
                  {/* Pay all button */}
                  {totalPendiente > 0 && (
                    <button
                      onClick={async () => {
                        const pendientes = data.nomina.filter((r) => !r.todosPagados);
                        for (const row of pendientes) {
                          setMarcando((prev) => new Set([...prev, row.tecnicoId]));
                          await fetch("/api/pagos-personal", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ tecnicoId: row.tecnicoId, proyectoIds: row.pagos.map((p) => p.proyectoId) }),
                          });
                        }
                        await load();
                        setMarcando(new Set());
                      }}
                      className="w-full mt-3 py-2 rounded-lg border border-[#B3985B]/40 hover:bg-[#B3985B]/10 text-[#B3985B] text-xs font-medium transition-colors"
                    >
                      Marcar todos como pagados
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
