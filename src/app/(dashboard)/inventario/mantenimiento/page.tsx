"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type Equipo = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  estado: string;
  cantidadTotal: number;
  tipo: string;
  categoria: { id: string; nombre: string; orden: number };
  activo: boolean;
};

type Registro = {
  id: string;
  fecha: string;
  tipo: string;
  accionRealizada: string;
  estadoEquipo: string | null;
  comentarios: string | null;
  proximoMantenimiento: string | null;
  equipo: { id: string; descripcion: string; marca: string | null; modelo: string | null; estado: string; categoria: { nombre: string } };
};

type MaintSummary = {
  lastDate: string | null;
  nextDate: string | null;
  totalRecords: number;
};

const TIPOS = ["PREVENTIVO", "CORRECTIVO", "ESTETICO", "FUNCIONAL"];
const TIPOS_LABEL: Record<string, string> = {
  PREVENTIVO: "Preventivo", CORRECTIVO: "Correctivo", ESTETICO: "Estético", FUNCIONAL: "Funcional",
};
const ESTADOS_EQUIPO = ["ACTIVO", "EN_MANTENIMIENTO", "DADO_DE_BAJA"];
const TIPO_COLORS: Record<string, string> = {
  PREVENTIVO: "bg-blue-900/40 text-blue-300",
  CORRECTIVO: "bg-red-900/40 text-red-300",
  ESTETICO: "bg-purple-900/40 text-purple-300",
  FUNCIONAL: "bg-green-900/40 text-green-300",
};
const ESTADO_COLORS: Record<string, string> = {
  ACTIVO: "text-green-400",
  EN_MANTENIMIENTO: "text-yellow-400",
  DADO_DE_BAJA: "text-red-400",
};
const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: "bg-green-900/30 text-green-400 border-green-900/50",
  EN_MANTENIMIENTO: "bg-yellow-900/30 text-yellow-400 border-yellow-900/50",
  DADO_DE_BAJA: "bg-red-900/30 text-red-400 border-red-900/50",
};

function fmtDate(s: string | null) {
  if (!s) return null;
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function diasDesde(s: string | null): number | null {
  if (!s) return null;
  return Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
}

function diasHasta(s: string | null): number | null {
  if (!s) return null;
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86400000);
}

function MaintDot({ summary }: { summary: MaintSummary | undefined }) {
  if (!summary || summary.totalRecords === 0) {
    return <span className="w-2 h-2 rounded-full bg-gray-700 shrink-0 inline-block" title="Sin registros" />;
  }
  const hasta = diasHasta(summary.nextDate);
  if (hasta !== null && hasta < 0) {
    return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 inline-block" title="Mantenimiento vencido" />;
  }
  if (hasta !== null && hasta <= 30) {
    return <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0 inline-block" title="Próximo mantenimiento" />;
  }
  return <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 inline-block" title="Al día" />;
}

function MaintSummaryText({ summary, equipoId }: { summary: MaintSummary | undefined; equipoId: string }) {
  if (!summary || summary.totalRecords === 0) {
    return <span className="text-gray-700 text-[10px]">Sin registros</span>;
  }
  const desde = diasDesde(summary.lastDate);
  const hasta = diasHasta(summary.nextDate);

  return (
    <span className="text-[10px] space-x-2">
      {desde !== null && (
        <span className="text-gray-600">
          hace {desde}d
        </span>
      )}
      {hasta !== null && (
        <span className={hasta < 0 ? "text-red-400 font-semibold" : hasta <= 30 ? "text-yellow-400" : "text-gray-600"}>
          {hasta < 0 ? `⚠ vencido hace ${Math.abs(hasta)}d` : `próx: ${fmtDate(summary.nextDate)}`}
        </span>
      )}
    </span>
  );
  void equipoId;
}

const FORM_EMPTY = {
  fecha: new Date().toISOString().split("T")[0],
  tipo: "PREVENTIVO", accionRealizada: "", estadoEquipo: "",
  comentarios: "", proximoMantenimiento: "",
};

function MantenimientoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlEquipoId = searchParams.get("equipoId");

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [allRegistros, setAllRegistros] = useState<Registro[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(urlEquipoId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [eqRes, regRes] = await Promise.all([
      fetch("/api/equipos?todos=true&tipo=PROPIO"),
      fetch("/api/mantenimiento"),
    ]);
    const [eqData, regData] = await Promise.all([eqRes.json(), regRes.json()]);
    setEquipos(eqData.equipos ?? []);
    setAllRegistros(regData.registros ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Build per-equipment summary
  const maintMap: Record<string, MaintSummary> = {};
  for (const r of allRegistros) {
    const eid = r.equipo.id;
    if (!maintMap[eid]) {
      maintMap[eid] = { lastDate: null, nextDate: null, totalRecords: 0 };
    }
    maintMap[eid].totalRecords++;
    // allRegistros ordered by fecha DESC, so first occurrence = most recent
    if (!maintMap[eid].lastDate) maintMap[eid].lastDate = r.fecha;
    if (r.proximoMantenimiento && !maintMap[eid].nextDate) {
      maintMap[eid].nextDate = r.proximoMantenimiento;
    }
  }

  // Group by category
  const cats = Array.from(
    new Map(equipos.map(e => [e.categoria.id, e.categoria])).values()
  ).sort((a, b) => a.orden - b.orden);

  const selectedEquipo = equipos.find(e => e.id === selectedId);
  const selectedRegistros = allRegistros.filter(r => r.equipo.id === selectedId);

  // Global stats (PROPIO only)
  const propios = equipos.filter(e => e.activo);
  const vencidos = propios.filter(e => {
    const s = maintMap[e.id];
    if (!s) return false;
    return s.nextDate && diasHasta(s.nextDate)! < 0;
  }).length;
  const proximos = propios.filter(e => {
    const s = maintMap[e.id];
    if (!s) return false;
    const h = diasHasta(s.nextDate);
    return h !== null && h >= 0 && h <= 30;
  }).length;
  const sinRegistros = propios.filter(e => !maintMap[e.id] || maintMap[e.id].totalRecords === 0).length;

  function selectEquipo(id: string) {
    setSelectedId(id);
    setShowForm(false);
    setForm(FORM_EMPTY);
    router.replace(`/inventario/mantenimiento?equipoId=${id}`, { scroll: false });
  }

  async function guardar() {
    if (!selectedId || !form.accionRealizada.trim()) return;
    setSaving(true);
    const res = await fetch("/api/mantenimiento", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipoId: selectedId,
        fecha: form.fecha,
        tipo: form.tipo,
        accionRealizada: form.accionRealizada.trim(),
        estadoEquipo: form.estadoEquipo || null,
        comentarios: form.comentarios || null,
        proximoMantenimiento: form.proximoMantenimiento || null,
      }),
    });
    if (res.ok) {
      await loadData();
      setShowForm(false);
      setForm(FORM_EMPTY);
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500 text-sm">Cargando...</div>;
  }

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Mantenimiento de equipos</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {propios.length} equipos propios
            {vencidos > 0 && <> · <span className="text-red-400 font-medium">{vencidos} vencido{vencidos !== 1 ? "s" : ""}</span></>}
            {proximos > 0 && <> · <span className="text-yellow-400">{proximos} próximo{proximos !== 1 ? "s" : ""}</span></>}
            {sinRegistros > 0 && <> · <span className="text-gray-600">{sinRegistros} sin historial</span></>}
          </p>
        </div>
        <Link href="/catalogo/equipos"
          className="text-xs text-gray-500 hover:text-gray-300 border border-[#222] px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
          Inv. equipos
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Equipos propios", value: propios.length, color: "text-white" },
          { label: "Vencidos", value: vencidos, color: vencidos > 0 ? "text-red-400" : "text-gray-600" },
          { label: "Próximos 30d", value: proximos, color: proximos > 0 ? "text-yellow-400" : "text-gray-600" },
          { label: "Sin historial", value: sinRegistros, color: sinRegistros > 0 ? "text-gray-400" : "text-gray-600" },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
            <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-4 items-start">

        {/* ── LEFT: Equipment directory ── */}
        <div className="w-full md:w-72 shrink-0 space-y-3">
          {cats.map(cat => {
            const catEquipos = equipos.filter(e => e.categoria.id === cat.id && e.activo);
            if (!catEquipos.length) return null;
            return (
              <div key={cat.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-[#1a1a1a]">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">{cat.nombre}</p>
                </div>
                <div className="divide-y divide-[#1a1a1a]">
                  {catEquipos.map(e => {
                    const isSelected = selectedId === e.id;
                    const summary = maintMap[e.id];
                    const overdue = summary?.nextDate && diasHasta(summary.nextDate)! < 0;
                    const soonDue = summary?.nextDate && diasHasta(summary.nextDate)! >= 0 && diasHasta(summary.nextDate)! <= 30;

                    return (
                      <button key={e.id}
                        onClick={() => selectEquipo(e.id)}
                        className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-2 ${
                          isSelected ? "bg-[#1a1a1a]" : "hover:bg-[#141414]"
                        }`}>
                        <MaintDot summary={summary} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate leading-tight ${isSelected ? "text-[#B3985B]" : "text-white"}`}>
                            {e.descripcion}
                          </p>
                          {(e.marca || e.modelo) && (
                            <p className="text-gray-600 text-[10px] truncate">{[e.marca, e.modelo].filter(Boolean).join(" ")}</p>
                          )}
                          <MaintSummaryText summary={summary} equipoId={e.id} />
                          {(overdue || soonDue) && (
                            <span className={`text-[9px] font-semibold ${overdue ? "text-red-500" : "text-yellow-500"}`}>
                              {overdue ? "● vencido" : "● próximo"}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Inactive equipment section */}
          {(() => {
            const inactivos = equipos.filter(e => !e.activo);
            if (!inactivos.length) return null;
            return (
              <details>
                <summary className="text-gray-700 text-xs cursor-pointer hover:text-gray-500 px-1 py-1 select-none">
                  {inactivos.length} equipo{inactivos.length !== 1 ? "s" : ""} dado{inactivos.length !== 1 ? "s" : ""} de baja
                </summary>
                <div className="mt-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden divide-y divide-[#1a1a1a]">
                  {inactivos.map(e => (
                    <button key={e.id} onClick={() => selectEquipo(e.id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#141414] transition-colors opacity-50">
                      <p className="text-xs text-gray-500 truncate">{e.descripcion}</p>
                    </button>
                  ))}
                </div>
              </details>
            );
          })()}
        </div>

        {/* ── RIGHT: Equipment detail ── */}
        <div className="flex-1 min-w-0">
          {!selectedEquipo ? (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-12 text-center">
              <p className="text-gray-500 text-sm">Selecciona un equipo</p>
              <p className="text-gray-700 text-xs mt-1">para ver su historial de mantenimiento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Equipment header */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-white font-semibold text-base">{selectedEquipo.descripcion}</h2>
                    {(selectedEquipo.marca || selectedEquipo.modelo) && (
                      <p className="text-gray-500 text-sm">{[selectedEquipo.marca, selectedEquipo.modelo].filter(Boolean).join(" ")}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${ESTADO_BADGE[selectedEquipo.estado] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
                        {selectedEquipo.estado.replace(/_/g, " ")}
                      </span>
                      <span className="text-gray-600 text-xs">{selectedEquipo.cantidadTotal} unidad{selectedEquipo.cantidadTotal !== 1 ? "es" : ""}</span>
                      <span className="text-gray-600 text-xs">· {selectedEquipo.categoria.nombre}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowForm(v => !v); setForm(FORM_EMPTY); }}
                    className="bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-xs px-4 py-2 rounded-lg transition-colors shrink-0">
                    {showForm ? "Cancelar" : "+ Registrar mantenimiento"}
                  </button>
                </div>

                {/* Maint summary */}
                {maintMap[selectedEquipo.id] && maintMap[selectedEquipo.id].totalRecords > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#1a1a1a]">
                    <div>
                      <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-0.5">Último</p>
                      <p className="text-white text-sm font-medium">{fmtDate(maintMap[selectedEquipo.id].lastDate)}</p>
                      {maintMap[selectedEquipo.id].lastDate && (
                        <p className="text-gray-600 text-[10px]">hace {diasDesde(maintMap[selectedEquipo.id].lastDate)} días</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-0.5">Próximo</p>
                      {maintMap[selectedEquipo.id].nextDate ? (
                        <>
                          <p className={`text-sm font-medium ${diasHasta(maintMap[selectedEquipo.id].nextDate)! < 0 ? "text-red-400" : diasHasta(maintMap[selectedEquipo.id].nextDate)! <= 30 ? "text-yellow-400" : "text-white"}`}>
                            {fmtDate(maintMap[selectedEquipo.id].nextDate)}
                          </p>
                          <p className={`text-[10px] ${diasHasta(maintMap[selectedEquipo.id].nextDate)! < 0 ? "text-red-500" : "text-gray-600"}`}>
                            {diasHasta(maintMap[selectedEquipo.id].nextDate)! < 0
                              ? `vencido hace ${Math.abs(diasHasta(maintMap[selectedEquipo.id].nextDate)!)} días`
                              : `en ${diasHasta(maintMap[selectedEquipo.id].nextDate)} días`
                            }
                          </p>
                        </>
                      ) : (
                        <p className="text-gray-600 text-sm">Sin programar</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-0.5">Total registros</p>
                      <p className="text-white text-sm font-medium">{maintMap[selectedEquipo.id].totalRecords}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* New record form */}
              {showForm && (
                <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-4">
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Nuevo registro de mantenimiento</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Fecha *</label>
                      <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                        className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Tipo *</label>
                      <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                        className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]">
                        {TIPOS.map(t => <option key={t} value={t}>{TIPOS_LABEL[t]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Estado resultante</label>
                      <select value={form.estadoEquipo} onChange={e => setForm(p => ({ ...p, estadoEquipo: e.target.value }))}
                        className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]">
                        <option value="">Sin cambio</option>
                        {ESTADOS_EQUIPO.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-gray-500 text-xs mb-1 block">Acción realizada *</label>
                      <textarea value={form.accionRealizada} onChange={e => setForm(p => ({ ...p, accionRealizada: e.target.value }))} rows={2}
                        placeholder="Describe detalladamente lo que se hizo..."
                        className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] resize-none" />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Próximo mantenimiento</label>
                      <input type="date" value={form.proximoMantenimiento} onChange={e => setForm(p => ({ ...p, proximoMantenimiento: e.target.value }))}
                        className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-gray-500 text-xs mb-1 block">Comentarios adicionales</label>
                      <input value={form.comentarios} onChange={e => setForm(p => ({ ...p, comentarios: e.target.value }))}
                        placeholder="Observaciones, piezas cambiadas, costo..."
                        className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={guardar} disabled={saving || !form.accionRealizada.trim()}
                      className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
                      {saving ? "Guardando..." : "Guardar registro"}
                    </button>
                    <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-sm px-3 transition-colors">Cancelar</button>
                  </div>
                </div>
              )}

              {/* History */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1a1a1a]">
                  <p className="text-white font-medium text-sm">Historial de mantenimiento</p>
                  <p className="text-gray-600 text-xs">{selectedRegistros.length} registro{selectedRegistros.length !== 1 ? "s" : ""}</p>
                </div>

                {selectedRegistros.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-gray-500 text-sm">Sin registros aún</p>
                    <button onClick={() => setShowForm(true)}
                      className="mt-2 text-[#B3985B] text-xs hover:underline">
                      Registrar el primer mantenimiento
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#1a1a1a]">
                    {selectedRegistros.map(r => {
                      const diasProx = diasHasta(r.proximoMantenimiento);
                      const vencido = diasProx !== null && diasProx < 0;
                      const alerta = diasProx !== null && diasProx >= 0 && diasProx <= 30;

                      return (
                        <div key={r.id} className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TIPO_COLORS[r.tipo] ?? "bg-[#222] text-gray-400"}`}>
                                {TIPOS_LABEL[r.tipo] ?? r.tipo}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm">{r.accionRealizada}</p>
                              {r.comentarios && <p className="text-gray-500 text-xs mt-1">{r.comentarios}</p>}
                              <div className="flex flex-wrap items-center gap-3 mt-2">
                                <span className="text-gray-600 text-xs">{fmtDate(r.fecha)}</span>
                                {r.estadoEquipo && (
                                  <span className={`text-xs font-medium ${ESTADO_COLORS[r.estadoEquipo] ?? "text-gray-400"}`}>
                                    → {r.estadoEquipo.replace(/_/g, " ")}
                                  </span>
                                )}
                                {r.proximoMantenimiento && (
                                  <span className={`text-xs ${vencido ? "text-red-400 font-semibold" : alerta ? "text-yellow-400" : "text-gray-500"}`}>
                                    {vencido ? "⚠ Próximo vencido: " : alerta ? "⚡ Próximo: " : "Siguiente: "}
                                    {fmtDate(r.proximoMantenimiento)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MantenimientoPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-500 text-sm">Cargando...</div>}>
      <MantenimientoContent />
    </Suspense>
  );
}
