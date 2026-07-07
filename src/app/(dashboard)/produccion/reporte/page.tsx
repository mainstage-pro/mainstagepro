"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";

// ─── TIPOS ───────────────────────────────────────────────────────────────────

type EquipoRef = {
  id: string; descripcion: string; marca?: string | null; modelo?: string | null;
  estado: string; categoria?: { nombre: string } | null;
};

interface ChecklistSemana {
  id: string; semana: string; fechaInicio: string; estado: string;
  notas: string | null; cerradoEn: string | null;
  stats: { total: number; enBodega: number; enRenta: number; pendientes: number; extraviados: number; perdidos: number; cumplimiento: number };
  alertas: Array<{ id: string; descripcion: string; estado: string; notas: string | null; equipo: EquipoRef | null; cantidadEsperada: number | null; cantidadContada: number | null }>;
}

interface Revision {
  id: string; fecha: string; tipo: string; accionRealizada: string;
  estadoEquipo: string | null; comentarios: string | null;
  costoReparacion: number | null; descripcionReparacion: string | null;
  proximoMantenimiento: string | null;
  equipo: EquipoRef;
  unidad: { id: string; codigo: string; estado: string } | null;
}

interface EquipoMantenimiento {
  id: string; descripcion: string; marca?: string | null; modelo?: string | null;
  estado: string; categoria?: { nombre: string } | null; notas?: string | null;
  mantenimientos: Array<{ id: string; fecha: string; tipo: string; accionRealizada: string; comentarios: string | null; costoReparacion: number | null; estadoEquipo: string | null }>;
  unidades: Array<{ id: string; codigo: string }>;
}

interface EquipoInventario {
  id: string; descripcion: string; marca?: string | null; modelo?: string | null;
  tipo: string; propietario: string; cantidadTotal: number;
  categoria?: { nombre: string } | null; createdAt?: string; fechaBaja?: string | null; updatedAt?: string;
}

interface MantenimientoVehiculo {
  id: string; fecha: string; tipoRegistro: string; servicio: string;
  costo?: number | null; km?: number | null; prioridad: string; estatus: string; comentarios?: string | null;
  vehiculo: { id: string; nombre: string; marca?: string | null; modelo?: string | null; placas?: string | null; color?: string | null };
}

interface Proyecto {
  id: string; numeroProyecto: string; nombre: string; estado: string;
  tipoServicio: string | null; tipoEvento: string; fechaEvento: string;
  lugarEvento?: string | null; zona: string; avance: number;
  planProduccionAprobado: boolean; recoleccionStatus: string;
  cliente?: { nombre: string; empresa?: string | null } | null;
  encargado?: { name: string } | null;
  checklist: { total: number; completados: number; porcentaje: number };
  evaluacionInterna?: {
    promedioCalculado?: number | null; resultadoGeneral?: number | null;
    planeacionPrevia?: number | null; cumplimientoTecnico?: number | null;
    puntualidad?: number | null; resolucionOperativa?: number | null; desempenoPersonal?: number | null;
  } | null;
  reportePostEvento?: { estado: string; calificacionEquipo?: number | null; seEjecutoSegunPlan?: string | null; equipoRegreso?: string | null } | null;
  cierreFinanciero?: { granTotalEstimado?: number | null; totalCobrado?: number | null; utilidadReal?: number | null; margenReal?: number | null } | null;
}

interface ReporteData {
  mes: string;
  checklistSemanal: {
    checklists: ChecklistSemana[];
    kpis: { semanasTotales: number; semanasCompletadas: number; semanasConAlertas: number };
  };
  mantenimientoEquipos: {
    revisiones: Revision[];
    equiposPorEquipo: Array<{ equipo: EquipoRef; revisiones: Revision[]; tuvoBajaFalla: boolean; costoTotal: number }>;
    equiposEnMantenimientoActual: EquipoMantenimiento[];
    kpis: { totalRevisiones: number; equiposRevisados: number; equiposConFalla: number; equiposEnMantenimiento: number; totalCostoReparaciones: number; metaRevisiones: number; cumplimientoMeta: number };
  };
  inventario: {
    altas: EquipoInventario[];
    bajas: EquipoInventario[];
    estadoActual: Record<string, number>;
    kpis: { altas: number; bajas: number; delta: number };
  };
  vehiculos: {
    vehiculos: Array<{ vehiculo: MantenimientoVehiculo["vehiculo"]; registros: MantenimientoVehiculo[]; costoTotal: number }>;
    totalRegistros: number; totalCosto: number;
  };
  proyectos: {
    lista: Proyecto[];
    kpis: { total: number; renta: number; produccion: number; completados: number; postEventoCompletado: number; conEvaluacion: number; promedioAvance: number; promedioCalificacion: number | null };
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function getMesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}

function fmtPeso(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 });
}

function fmtFecha(s: string) {
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function avanceColor(pct: number) {
  if (pct >= 80) return "#4ade80";
  if (pct >= 50) return "#facc15";
  return "#f87171";
}

function pct(v: number, total: number) {
  return total === 0 ? 0 : Math.round((v / total) * 100);
}

// ─── MICRO COMPONENTES ────────────────────────────────────────────────────────

function MiniBar({ value, max, color = "#B3985B" }: { value: number; max: number; color?: string }) {
  const w = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, backgroundColor: color }} />
    </div>
  );
}

function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: "green" | "amber" | "red" | "blue" | "gray" | "violet" | "sky" }) {
  const map = {
    green:  "bg-[#052e16] text-[#4ade80] border border-[#166534]",
    amber:  "bg-[#451a03] text-[#fbbf24] border border-[#92400e]",
    red:    "bg-[#450a0a] text-[#f87171] border border-[#991b1b]",
    blue:   "bg-[#0c1a2e] text-[#60a5fa] border border-[#1e40af]",
    gray:   "bg-[#1f2028] text-[#9ca3af] border border-[#3a3a4d]",
    violet: "bg-[#1e1030] text-[#a78bfa] border border-[#5b21b6]",
    sky:    "bg-[#0c2030] text-[#38bdf8] border border-[#0369a1]",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${map[color]}`}>
      {children}
    </span>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-semibold shrink-0" style={{ color }}>{value}%</span>
    </div>
  );
}

function Textarea({ storageKey, label, placeholder }: { storageKey: string; label: string; placeholder: string }) {
  const [val, setVal] = useState("");
  useEffect(() => { setVal(localStorage.getItem(storageKey) ?? ""); }, [storageKey]);
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">{label}</label>
      <textarea
        rows={3}
        value={val}
        onChange={e => { setVal(e.target.value); localStorage.setItem(storageKey, e.target.value); }}
        placeholder={placeholder}
        className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/40 resize-none leading-relaxed"
      />
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "checklist", label: "Checklist Semanal" },
  { key: "equipos",   label: "Mantenimiento" },
  { key: "inventario", label: "Altas / Bajas" },
  { key: "vehiculos", label: "Vehículos" },
  { key: "proyectos", label: "Proyectos" },
];

// ─── SECCIÓN 1: CHECKLIST SEMANAL ─────────────────────────────────────────────

function SeccionChecklist({ data, mes }: { data: ReporteData["checklistSemanal"]; mes: string }) {
  const { checklists, kpis } = data;
  const [selected, setSelected] = useState<string | null>(null);
  const allAlertas = checklists.flatMap(c => c.alertas.map(a => ({ ...a, semana: c.semana })));
  const selectedCl = checklists.find(c => c.id === selected);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Semanas totales",    value: kpis.semanasTotales,    color: "text-white" },
          { label: "Completadas",        value: kpis.semanasCompletadas, color: "text-[#4ade80]" },
          { label: "Con alertas",        value: kpis.semanasConAlertas,  color: allAlertas.length > 0 ? "text-[#fbbf24]" : "text-[#4ade80]" },
          { label: "Equipos faltantes",  value: allAlertas.length,       color: allAlertas.length > 0 ? "text-[#f87171]" : "text-[#4ade80]" },
        ].map(k => (
          <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#555] text-[10px] uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {checklists.length === 0 && (
        <p className="text-[#555] text-xs text-center py-8">No hay checklists en este mes</p>
      )}

      {/* Tarjetas de semanas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {checklists.map(cl => (
          <button
            key={cl.id}
            onClick={() => setSelected(selected === cl.id ? null : cl.id)}
            className={`bg-[#111] border rounded-xl p-4 text-left transition-colors hover:border-[#B3985B]/40 ${selected === cl.id ? "border-[#B3985B]/60" : cl.alertas.length > 0 ? "border-[#92400e]" : "border-[#1e1e1e]"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm font-semibold">{cl.semana}</span>
              <Badge color={cl.estado === "COMPLETADO" ? "green" : cl.estado === "CON_ALERTAS" ? "amber" : "gray"}>
                {cl.estado.replace("_", " ")}
              </Badge>
            </div>
            <ProgressBar value={cl.stats.cumplimiento} color={avanceColor(cl.stats.cumplimiento)} />
            <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-[#6b7280]">
              <span>✅ {cl.stats.enBodega} en bodega</span>
              <span>📦 {cl.stats.enRenta} en uso</span>
              {cl.stats.extraviados > 0 && <span className="text-[#fbbf24]">⚠ {cl.stats.extraviados} extraviados</span>}
              {cl.stats.perdidos > 0 && <span className="text-[#f87171]">🔴 {cl.stats.perdidos} perdidos</span>}
            </div>
            {cl.cerradoEn && <p className="text-[#444] text-[9px] mt-1">Cerrado: {fmtFecha(cl.cerradoEn)}</p>}
          </button>
        ))}
      </div>

      {/* Detalle semana seleccionada */}
      {selectedCl && selectedCl.alertas.length > 0 && (
        <div className="bg-[#111] border border-[#92400e] rounded-xl p-5">
          <p className="text-[#fbbf24] text-xs font-semibold uppercase tracking-wider mb-3">Faltantes · {selectedCl.semana}</p>
          <div className="space-y-2">
            {selectedCl.alertas.map(a => (
              <div key={a.id} className="flex items-start justify-between gap-3 py-2 border-b border-[#1a1a1a] last:border-0">
                <span className="text-gray-300 text-xs">{a.equipo ? `${a.equipo.marca ?? ""} ${a.equipo.descripcion}`.trim() : a.descripcion}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge color={a.estado === "PERDIDO" ? "red" : "amber"}>{a.estado}</Badge>
                  {a.notas && <span className="text-[#555] text-[10px]">{a.notas}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen global de faltantes */}
      {allAlertas.length > 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <p className="text-white text-sm font-semibold mb-3">Todos los faltantes del mes</p>
          <div className="space-y-2">
            {allAlertas.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-[#1a1a1a] last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-[#555] text-[10px] w-24 shrink-0">{a.semana}</span>
                  <span className="text-gray-300 text-xs">{a.equipo ? `${a.equipo.marca ?? ""} ${a.equipo.descripcion}`.trim() : a.descripcion}</span>
                </div>
                <Badge color={a.estado === "PERDIDO" ? "red" : "amber"}>{a.estado}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notas de bodega */}
      {checklists.some(c => c.notas) && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <p className="text-white text-sm font-semibold mb-3">Notas de bodega</p>
          <div className="space-y-2">
            {checklists.filter(c => c.notas).map(c => (
              <div key={c.id} className="flex gap-3 text-xs py-2 border-b border-[#1a1a1a] last:border-0">
                <span className="text-[#B3985B] font-semibold shrink-0 w-24">{c.semana}</span>
                <span className="text-gray-400">{c.notas}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comentarios */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#B3985B]">Análisis y comentarios</h3>
        </div>
        <div className="p-5 space-y-4">
        <Textarea storageKey={`rp-checklist-analisis-${mes}`} label="Análisis de cumplimiento" placeholder="Estado general del checklist semanal…" />
        <Textarea storageKey={`rp-checklist-propuesta-${mes}`} label="Propuestas de mejora" placeholder="¿Qué ajustar en el proceso de bodega?" />
        <Textarea storageKey={`rp-checklist-comentarios-${mes}`} label="Comentarios finales" placeholder="Observaciones adicionales…" />
        </div>
      </div>
    </div>
  );
}

// ─── SECCIÓN 2: MANTENIMIENTO ─────────────────────────────────────────────────

function SeccionMantenimiento({ data, mes, onActualizar }: { data: ReporteData["mantenimientoEquipos"]; mes: string; onActualizar: () => void }) {
  const { equiposPorEquipo, equiposEnMantenimientoActual, kpis } = data;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [costoEdit, setCostoEdit] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const patch = async (id: string, body: object) => {
    setSaving(id);
    try {
      await fetch(`/api/mantenimiento/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      onActualizar();
    } finally { setSaving(null); }
  };

  const TIPO_COLOR: Record<string, string> = {
    PREVENTIVO: "text-[#38bdf8]", CORRECTIVO: "text-[#f87171]",
    ESTETICO: "text-[#c084fc]", FUNCIONAL: "text-[#fbbf24]",
  };

  return (
    <div className="space-y-4">
      {/* KPIs simples — sin meta ni cumplimiento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Revisiones del mes", value: kpis.totalRevisiones,      color: "text-white" },
          { label: "Equipos revisados",  value: kpis.equiposRevisados,      color: "text-white" },
          { label: "Con falla",          value: kpis.equiposConFalla,        color: kpis.equiposConFalla > 0 ? "text-[#f87171]" : "text-[#4ade80]" },
          { label: "En reparación",      value: kpis.equiposEnMantenimiento, color: kpis.equiposEnMantenimiento > 0 ? "text-[#fbbf24]" : "text-[#4ade80]" },
        ].map(k => (
          <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#555] text-[10px] uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Registro de revisiones */}
      {equiposPorEquipo.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-8 text-center">
          <p className="text-[#555] text-sm">No hay revisiones registradas en este mes</p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <p className="text-white text-sm font-semibold mb-3">Revisiones del mes</p>
          <div className="space-y-1">
            {equiposPorEquipo.map(({ equipo, revisiones, tuvoBajaFalla, costoTotal }) => (
              <div key={equipo.id} className={`border rounded-lg overflow-hidden ${tuvoBajaFalla ? "border-[#991b1b]/50" : "border-[#1e1e1e]"}`}>
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1a] transition-colors text-left"
                  onClick={() => setExpanded(expanded === equipo.id ? null : equipo.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${tuvoBajaFalla ? "bg-[#f87171]" : "bg-[#4ade80]"}`} />
                    <span className="text-gray-200 text-xs font-medium truncate">{equipo.descripcion}</span>
                    {equipo.marca && <span className="text-[#555] text-[10px] hidden md:block">{equipo.marca} {equipo.modelo}</span>}
                    {equipo.categoria && <Badge color="gray">{equipo.categoria.nombre}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {tuvoBajaFalla && <Badge color="red">Falla</Badge>}
                    <span className="text-[#555] text-[10px]">{revisiones.length} {revisiones.length === 1 ? "revisión" : "revisiones"}</span>
                    {costoTotal > 0 && <span className="text-[#fb923c] text-[10px]">{fmtPeso(costoTotal)}</span>}
                    <span className="text-[#333] text-xs">{expanded === equipo.id ? "▲" : "▼"}</span>
                  </div>
                </button>
                {expanded === equipo.id && (
                  <div className="px-4 pb-3 border-t border-[#1a1a1a] space-y-2 pt-3">
                    {revisiones.map(r => (
                      <div key={r.id} className="pb-2 border-b border-[#111] last:border-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-[10px] font-bold ${TIPO_COLOR[r.tipo] ?? "text-gray-400"}`}>{r.tipo}</span>
                          <span className="text-[#555] text-[10px]">{fmtFecha(r.fecha)}</span>
                          {r.costoReparacion && <span className="text-[#fb923c] text-[10px]">{fmtPeso(r.costoReparacion)}</span>}
                        </div>
                        <p className="text-gray-300 text-xs">{r.accionRealizada}</p>
                        {r.comentarios && <p className="text-[#555] text-[10px] italic mt-0.5">{r.comentarios}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {kpis.totalCostoReparaciones > 0 && (
            <div className="mt-3 pt-3 border-t border-[#1a1a1a] flex justify-between items-center">
              <span className="text-[#555] text-[10px] uppercase tracking-wider">Costo total de reparaciones</span>
              <span className="text-[#fb923c] text-sm font-bold">{fmtPeso(kpis.totalCostoReparaciones)}</span>
            </div>
          )}
        </div>
      )}

      {/* Equipos en reparación activa */}
      {equiposEnMantenimientoActual.length > 0 && (
        <div className="bg-[#111] border border-[#92400e] rounded-xl p-5">
          <p className="text-[#fbbf24] text-xs font-semibold uppercase tracking-wider mb-3">⚠ En reparación actualmente</p>
          <div className="space-y-3">
            {equiposEnMantenimientoActual.map(eq => {
              const ultimo = eq.mantenimientos[0];
              return (
                <div key={eq.id} className="flex items-start justify-between gap-4 pb-3 border-b border-[#1a1a1a] last:border-0 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-xs font-medium">{eq.descripcion}</span>
                      {eq.categoria && <Badge color="gray">{eq.categoria.nombre}</Badge>}
                      {eq.unidades.length > 0 && <span className="text-[#555] text-[10px]">[{eq.unidades.map(u => u.codigo).join(", ")}]</span>}
                    </div>
                    {ultimo && <p className="text-[#555] text-[10px] mt-0.5">{fmtFecha(ultimo.fecha)}: {ultimo.accionRealizada}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <input
                      type="number" placeholder="Costo $"
                      value={costoEdit[ultimo?.id ?? ""] ?? ""}
                      onChange={e => setCostoEdit(p => ({ ...p, [ultimo?.id ?? ""]: e.target.value }))}
                      className="w-20 bg-[#0d0d0d] border border-[#1e1e1e] text-gray-300 text-xs px-2 py-1 rounded-lg outline-none focus:border-[#B3985B]"
                    />
                    <button
                      onClick={() => ultimo && patch(ultimo.id, { costoReparacion: parseFloat(costoEdit[ultimo.id] ?? "0") })}
                      disabled={saving === ultimo?.id}
                      className="text-[10px] px-2 py-1 rounded-lg bg-[#1a1a1a] border border-[#333] text-[#9ca3af] hover:text-white transition-colors disabled:opacity-50"
                    >💰</button>
                    <button
                      onClick={() => ultimo && patch(ultimo.id, { nuevoEstadoEquipo: "ACTIVO" })}
                      disabled={saving === ultimo?.id}
                      className="text-[10px] px-3 py-1 rounded-lg bg-[#052e16] border border-[#166534] text-[#4ade80] hover:opacity-80 transition-opacity disabled:opacity-50"
                    >✅ Devuelto</button>
                    <button
                      onClick={() => ultimo && patch(ultimo.id, { nuevoEstadoEquipo: "DADO_DE_BAJA" })}
                      disabled={saving === ultimo?.id}
                      className="text-[10px] px-3 py-1 rounded-lg bg-[#450a0a] border border-[#991b1b] text-[#f87171] hover:opacity-80 transition-opacity disabled:opacity-50"
                    >🗑 Dar de baja</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#B3985B]">Análisis y comentarios</h3>
        </div>
        <div className="p-5 space-y-4">
        <Textarea storageKey={`rp-mant-analisis-${mes}`} label="Análisis de mantenimiento" placeholder="Estado general de los equipos, tendencias de fallas…" />
        <Textarea storageKey={`rp-mant-propuestas-${mes}`} label="Propuestas de mejora" placeholder="Acciones preventivas, compras sugeridas…" />
        <Textarea storageKey={`rp-mant-comentarios-${mes}`} label="Comentarios finales" placeholder="Observaciones adicionales…" />
        </div>
      </div>
    </div>
  );
}

// ─── SECCIÓN 3: INVENTARIO ────────────────────────────────────────────────────

function SeccionInventario({ data, mes }: { data: ReporteData["inventario"]; mes: string }) {
  const { altas, bajas, estadoActual, kpis } = data;
  const totalActivo = estadoActual["ACTIVO"] ?? 0;
  const totalMant   = estadoActual["EN_MANTENIMIENTO"] ?? 0;
  const totalBaja   = estadoActual["DADO_DE_BAJA"] ?? 0;
  const totalGeneral = totalActivo + totalMant + totalBaja;

  const pieData = [
    { name: "Activo",          value: totalActivo, color: "#4ade80" },
    { name: "En mantenimiento", value: totalMant,  color: "#fbbf24" },
    { name: "Dado de baja",    value: totalBaja,   color: "#f87171" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Altas",            value: `+${kpis.altas}`,  color: "text-[#4ade80]" },
          { label: "Bajas",            value: `-${kpis.bajas}`,  color: "text-[#f87171]" },
          { label: "Balance",          value: kpis.delta >= 0 ? `+${kpis.delta}` : `${kpis.delta}`, color: kpis.delta >= 0 ? "text-[#4ade80]" : "text-[#f87171]" },
          { label: "Activos",          value: totalActivo,       color: "text-[#4ade80]" },
          { label: "En mantenimiento", value: totalMant,         color: "text-[#fbbf24]" },
          { label: "Dados de baja",    value: totalBaja,         color: "text-[#f87171]" },
        ].map(k => (
          <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#555] text-[10px] uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gráfica */}
        {pieData.length > 0 && (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
            <p className="text-white text-sm font-semibold mb-3">Estado del inventario</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.85} />)}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    return (
                      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs">
                        <p className="text-gray-300">{d.name}: <span className="text-white font-bold">{d.value}</span></p>
                        <p className="text-[#555]">{pct(d.value as number, totalGeneral)}%</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: d.color }} />
                    <span className="text-[#6b7280]">{d.name}</span>
                  </div>
                  <span className="text-white font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Altas */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 md:col-span-1">
          <p className="text-[#4ade80] text-xs font-semibold uppercase tracking-wider mb-3">📦 Altas ({altas.length})</p>
          {altas.length === 0 && <p className="text-[#555] text-xs text-center py-4">Sin altas en este mes</p>}
          <div className="space-y-2">
            {altas.map(e => (
              <div key={e.id} className="pb-2 border-b border-[#1a1a1a] last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-gray-200 text-xs font-medium">{e.descripcion}</p>
                    {e.marca && <p className="text-[#555] text-[10px]">{e.marca} {e.modelo}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge color={e.tipo === "PROPIO" ? "green" : "blue"}>{e.tipo}</Badge>
                    <span className="text-[#555] text-[10px]">×{e.cantidadTotal}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bajas */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 md:col-span-1">
          <p className="text-[#f87171] text-xs font-semibold uppercase tracking-wider mb-3">🗑 Bajas ({bajas.length})</p>
          {bajas.length === 0 && <p className="text-[#555] text-xs text-center py-4">Sin bajas en este mes</p>}
          <div className="space-y-2">
            {bajas.map(e => (
              <div key={e.id} className="pb-2 border-b border-[#1a1a1a] last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-gray-200 text-xs font-medium">{e.descripcion}</p>
                    {e.marca && <p className="text-[#555] text-[10px]">{e.marca} {e.modelo}</p>}
                    {(e.fechaBaja || e.updatedAt) && <p className="text-[#444] text-[9px]">{fmtFecha(e.fechaBaja ?? e.updatedAt!)}</p>}
                  </div>
                  <Badge color={e.tipo === "PROPIO" ? "green" : "blue"}>{e.tipo}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#B3985B]">Análisis y comentarios</h3>
        </div>
        <div className="p-5 space-y-4">
        <Textarea storageKey={`rp-inv-analisis-${mes}`} label="Análisis de movimientos" placeholder="Contexto de las altas y bajas, adquisiciones, mermas…" />
        <Textarea storageKey={`rp-inv-comentarios-${mes}`} label="Comentarios finales" placeholder="Observaciones adicionales…" />
        </div>
      </div>
    </div>
  );
}

// ─── SECCIÓN 4: VEHÍCULOS ─────────────────────────────────────────────────────

function SeccionVehiculos({ data, mes }: { data: ReporteData["vehiculos"]; mes: string }) {
  const { vehiculos, totalRegistros, totalCosto } = data;
  const barData = vehiculos.map(v => ({ nombre: v.vehiculo.nombre, costo: v.costoTotal, registros: v.registros.length }));

  const TIPO_COLOR: Record<string, "green" | "red" | "blue" | "gray"> = {
    SERVICIO: "green", REPARACION: "red", REVISION: "blue", ACCIDENTE: "red", OTRO: "gray",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Registros del mes", value: totalRegistros, color: "text-white" },
          { label: "Vehículos",         value: vehiculos.length, color: "text-white" },
          { label: "Costo total",        value: fmtPeso(totalCosto), color: "text-[#fb923c]" },
        ].map(k => (
          <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#555] text-[10px] uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {vehiculos.length === 0 && <p className="text-[#555] text-xs text-center py-8">No hay mantenimientos de vehículos en este mes</p>}

      {/* Gráfica de costos */}
      {barData.length > 1 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <p className="text-white text-sm font-semibold mb-4">Costo por vehículo</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
              <XAxis dataKey="nombre" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs">
                      <p className="text-gray-400 mb-1">{label}</p>
                      <p className="text-white font-bold">{fmtPeso(payload[0].value as number)}</p>
                    </div>
                  );
                }}
                cursor={{ fill: "#ffffff06" }}
              />
              <Bar dataKey="costo" fill="#fb923c" opacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Por vehículo */}
      {vehiculos.map(({ vehiculo, registros, costoTotal }) => (
        <div key={vehiculo.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-semibold">{vehiculo.nombre}</span>
              {vehiculo.marca && <span className="text-[#555] text-xs">{vehiculo.marca} {vehiculo.modelo}</span>}
              {vehiculo.placas && <Badge color="gray">{vehiculo.placas}</Badge>}
            </div>
            {costoTotal > 0 && <span className="text-[#fb923c] text-sm font-bold">{fmtPeso(costoTotal)}</span>}
          </div>
          <div className="space-y-2">
            {registros.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-2 border-b border-[#1a1a1a] last:border-0 flex-wrap">
                <div className="flex items-center gap-3">
                  <Badge color={TIPO_COLOR[r.tipoRegistro] ?? "gray"}>{r.tipoRegistro}</Badge>
                  <span className="text-gray-300 text-xs">{r.servicio}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#555]">
                  <span>{fmtFecha(r.fecha)}</span>
                  {r.km && <span>{r.km.toLocaleString()} km</span>}
                  {r.costo && <span className="text-[#fb923c]">{fmtPeso(r.costo)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#B3985B]">Análisis y comentarios</h3>
        </div>
        <div className="p-5 space-y-4">
        <Textarea storageKey={`rp-vehiculos-analisis-${mes}`} label="Análisis de flota" placeholder="Estado de los vehículos, servicios próximos…" />
        <Textarea storageKey={`rp-vehiculos-comentarios-${mes}`} label="Comentarios finales" placeholder="Observaciones adicionales…" />
        </div>
      </div>
    </div>
  );
}

// ─── SECCIÓN 5: PROYECTOS ─────────────────────────────────────────────────────

function SeccionProyectos({ data, mes }: { data: ReporteData["proyectos"]; mes: string }) {
  const { lista, kpis } = data;
  const [expanded, setExpanded] = useState<string | null>(null);

  function estadoBadgeColor(estado: string): "green" | "blue" | "amber" | "gray" {
    if (estado === "COMPLETADO") return "green";
    if (estado === "CONFIRMADO") return "blue";
    if (estado === "EN_CURSO")   return "amber";
    return "gray";
  }

  const barData = lista.map(p => ({ nombre: p.numeroProyecto, avance: p.avance }));

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Proyectos",     value: kpis.total, color: "text-white" },
          { label: "Renta",         value: kpis.renta, color: "text-[#a78bfa]" },
          { label: "Prod. técnica", value: kpis.produccion, color: "text-[#38bdf8]" },
          { label: "Avance prom.",  value: `${kpis.promedioAvance}%`, color: avanceColor(kpis.promedioAvance) === "#4ade80" ? "text-[#4ade80]" : avanceColor(kpis.promedioAvance) === "#facc15" ? "text-[#facc15]" : "text-[#f87171]" },
          { label: "Post-evento",   value: `${kpis.postEventoCompletado}/${kpis.total}`, color: kpis.postEventoCompletado === kpis.total ? "text-[#4ade80]" : "text-[#fbbf24]" },
          { label: "Calif. prom.",  value: kpis.promedioCalificacion != null ? `${kpis.promedioCalificacion}/10` : "—", color: "text-[#60a5fa]" },
        ].map(k => (
          <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#555] text-[10px] uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Gráfica de avance */}
      {barData.length > 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <p className="text-white text-sm font-semibold mb-4">Avance por proyecto</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
              <XAxis dataKey="nombre" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs">
                      <p className="text-gray-400 mb-1">{label}</p>
                      <p className="text-white font-bold">{payload[0].value}% avance</p>
                    </div>
                  );
                }}
                cursor={{ fill: "#ffffff06" }}
              />
              <Bar dataKey="avance" radius={[3, 3, 0, 0]} maxBarSize={40}>
                {barData.map((entry, i) => <Cell key={i} fill={avanceColor(entry.avance)} opacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {lista.length === 0 && <p className="text-[#555] text-xs text-center py-8">No hay proyectos en este mes</p>}

      {/* Lista de proyectos */}
      <div className="space-y-2">
        {lista.map(p => (
          <div key={p.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden hover:border-[#B3985B]/30 transition-colors">
            <button className="w-full px-4 py-3 text-left" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-[#B3985B] text-[10px] font-bold font-mono">{p.numeroProyecto}</span>
                  <span className="text-white text-xs font-medium truncate">{p.nombre}</span>
                  {p.tipoServicio && <Badge color={p.tipoServicio === "RENTA" ? "violet" : "sky"}>{p.tipoServicio === "PRODUCCION_TECNICA" ? "Prod. Técnica" : p.tipoServicio}</Badge>}
                  <Badge color={estadoBadgeColor(p.estado)}>{p.estado.replace("_", " ")}</Badge>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[#555] text-[10px]">{fmtFecha(p.fechaEvento)}</span>
                  <span className="text-[#333] text-xs">{expanded === p.id ? "▲" : "▼"}</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1">
                  <ProgressBar value={p.avance} color={avanceColor(p.avance)} />
                </div>
                {p.reportePostEvento ? (
                  <Badge color={p.reportePostEvento.estado === "completado" ? "green" : "amber"}>
                    Post: {p.reportePostEvento.estado === "completado" ? "✓" : "⏳"}
                  </Badge>
                ) : (
                  <Badge color="gray">Sin post</Badge>
                )}
                {p.evaluacionInterna?.promedioCalculado != null && (
                  <Badge color="blue">⭐ {p.evaluacionInterna.promedioCalculado}/10</Badge>
                )}
              </div>
            </button>

            {expanded === p.id && (
              <div className="px-4 pb-4 border-t border-[#1a1a1a] pt-3 space-y-3">
                {/* Datos generales */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Cliente",     value: p.cliente ? `${p.cliente.nombre}${p.cliente.empresa ? ` / ${p.cliente.empresa}` : ""}` : "—" },
                    { label: "Encargado",   value: p.encargado?.name ?? "—" },
                    { label: "Lugar",       value: p.lugarEvento ?? "—" },
                    { label: "Recolección", value: p.recoleccionStatus.replace("_", " ") },
                  ].map(d => (
                    <div key={d.label}>
                      <p className="text-[#555] text-[10px] uppercase tracking-wider">{d.label}</p>
                      <p className="text-gray-300 text-xs mt-0.5">{d.value}</p>
                    </div>
                  ))}
                </div>

                {/* Checklist */}
                <div>
                  <p className="text-[#555] text-[10px] uppercase tracking-wider mb-1">Checklist operativo ({p.checklist.completados}/{p.checklist.total})</p>
                  <ProgressBar value={p.checklist.porcentaje} color={avanceColor(p.checklist.porcentaje)} />
                </div>

                {/* Evaluación interna */}
                {p.evaluacionInterna && (
                  <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-3">
                    <p className="text-[#555] text-[10px] uppercase tracking-wider mb-2">Evaluación interna</p>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {[
                        { label: "Planeación",  value: p.evaluacionInterna.planeacionPrevia },
                        { label: "Técnico",     value: p.evaluacionInterna.cumplimientoTecnico },
                        { label: "Puntualidad", value: p.evaluacionInterna.puntualidad },
                        { label: "Resolución",  value: p.evaluacionInterna.resolucionOperativa },
                        { label: "Personal",    value: p.evaluacionInterna.desempenoPersonal },
                        { label: "PROMEDIO",    value: p.evaluacionInterna.promedioCalculado, highlight: true },
                      ].map(d => (
                        <div key={d.label} className="text-center">
                          <p className={`font-bold text-sm ${d.highlight ? "text-[#60a5fa]" : "text-white"}`}>{d.value?.toFixed(1) ?? "—"}</p>
                          <p className="text-[#555] text-[9px]">{d.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cierre financiero */}
                {p.cierreFinanciero && (
                  <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-3">
                    <p className="text-[#555] text-[10px] uppercase tracking-wider mb-2">Cierre financiero</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { label: "Estimado",  value: p.cierreFinanciero.granTotalEstimado ? fmtPeso(p.cierreFinanciero.granTotalEstimado) : "—", color: "text-white" },
                        { label: "Cobrado",   value: p.cierreFinanciero.totalCobrado ? fmtPeso(p.cierreFinanciero.totalCobrado) : "—", color: "text-white" },
                        { label: "Utilidad",  value: p.cierreFinanciero.utilidadReal ? fmtPeso(p.cierreFinanciero.utilidadReal) : "—", color: (p.cierreFinanciero.utilidadReal ?? 0) > 0 ? "text-[#4ade80]" : "text-[#f87171]" },
                        { label: "Margen",    value: p.cierreFinanciero.margenReal != null ? `${p.cierreFinanciero.margenReal.toFixed(1)}%` : "—", color: (p.cierreFinanciero.margenReal ?? 0) > 0 ? "text-[#4ade80]" : "text-[#f87171]" },
                      ].map(d => (
                        <div key={d.label}>
                          <p className="text-[#555] text-[10px]">{d.label}</p>
                          <p className={`text-sm font-bold ${d.color}`}>{d.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Post-evento */}
                {p.reportePostEvento && (
                  <div className="flex flex-wrap gap-2">
                    {p.reportePostEvento.seEjecutoSegunPlan && (
                      <Badge color={p.reportePostEvento.seEjecutoSegunPlan === "si" ? "green" : p.reportePostEvento.seEjecutoSegunPlan === "ajustes" ? "amber" : "red"}>
                        Ejecución: {p.reportePostEvento.seEjecutoSegunPlan === "si" ? "Según plan" : p.reportePostEvento.seEjecutoSegunPlan === "ajustes" ? "Con ajustes" : "Fuera de plan"}
                      </Badge>
                    )}
                    {p.reportePostEvento.equipoRegreso && (
                      <Badge color={p.reportePostEvento.equipoRegreso === "completo" ? "green" : "red"}>
                        Equipo: {p.reportePostEvento.equipoRegreso === "completo" ? "Completo" : "Con faltantes"}
                      </Badge>
                    )}
                    {p.reportePostEvento.calificacionEquipo != null && (
                      <Badge color="blue">Equipo: {p.reportePostEvento.calificacionEquipo}/10</Badge>
                    )}
                  </div>
                )}

                <Link href={`/proyectos/${p.id}`} className="inline-block text-[#B3985B] text-xs font-semibold hover:underline">
                  Ver proyecto completo →
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#B3985B]">Análisis y comentarios</h3>
        </div>
        <div className="p-5 space-y-4">
        <Textarea storageKey={`rp-proy-analisis-${mes}`} label="Análisis de resultados del mes" placeholder="Desempeño general, proyectos destacados, áreas de mejora…" />
        <Textarea storageKey={`rp-proy-propuestas-${mes}`} label="Propuestas de mejora operativa" placeholder="Acciones para mejorar coordinación, entrega, post-evento…" />
        <Textarea storageKey={`rp-proy-comentarios-${mes}`} label="Comentarios finales del mes" placeholder="Cierre y perspectiva para el próximo mes…" />
        </div>
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function ReporteProduccionPage() {
  const [mes, setMes] = useState(getMesActual());
  const [data, setData]     = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState("checklist");
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/produccion/reporte?mes=${mes}`);
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [mes]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Pasa las notas de localStorage al PDF para incluirlas en el documento
  async function handleDescargarPDF() {
    setDownloadingPDF(true);
    try {
      const NOTA_KEYS: Record<string, { analisis: string; propuesta: string; comentarios: string }> = {
        checklist:  { analisis: `rp-checklist-analisis-${mes}`,  propuesta: `rp-checklist-propuesta-${mes}`,  comentarios: `rp-checklist-comentarios-${mes}` },
        equipos:    { analisis: `rp-mant-analisis-${mes}`,        propuesta: `rp-mant-propuestas-${mes}`,       comentarios: `rp-mant-comentarios-${mes}` },
        inventario: { analisis: `rp-inv-analisis-${mes}`,         propuesta: `rp-inv-propuesta-${mes}`,         comentarios: `rp-inv-comentarios-${mes}` },
        vehiculos:  { analisis: `rp-veh-analisis-${mes}`,         propuesta: `rp-veh-propuesta-${mes}`,         comentarios: `rp-veh-comentarios-${mes}` },
        proyectos:  { analisis: `rp-proy-analisis-${mes}`,        propuesta: `rp-proy-propuesta-${mes}`,        comentarios: `rp-proy-comentarios-${mes}` },
      };
      const keys = NOTA_KEYS[tab];
      const PREFIX: Record<string, string> = { checklist: "rp-checklist", equipos: "rp-mant", inventario: "rp-inv", vehiculos: "rp-veh", proyectos: "rp-proy" };
      const p = PREFIX[tab];
      const params = new URLSearchParams({ mes, seccion: tab });
      const analisis    = localStorage.getItem(keys.analisis);
      const propuesta   = localStorage.getItem(keys.propuesta);
      const comentarios = localStorage.getItem(keys.comentarios);
      if (analisis)    params.set(`${p}-analisis`,    analisis);
      if (propuesta)   params.set(`${p}-propuesta`,   propuesta);
      if (comentarios) params.set(`${p}-comentarios`, comentarios);

      const r = await fetch(`/api/produccion/reporte/pdf?${params.toString()}`);
      if (!r.ok) { alert("Error al generar el PDF"); return; }
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      const cd = r.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `Reporte-Produccion-${tab}-${mes}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert("Error al generar el PDF"); }
    finally { setDownloadingPDF(false); }
  }

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Reporte de Producción</h1>
          <p className="text-[#555] text-xs mt-0.5">Informe mensual operativo · {data ? formatMes(data.mes) : formatMes(mes)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="month"
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="bg-[#111] border border-[#1e1e1e] text-gray-300 text-xs px-3 py-2 rounded-lg outline-none focus:border-[#B3985B] cursor-pointer"
          />
          <button
            onClick={handleDescargarPDF}
            disabled={downloadingPDF || loading || !data}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#B3985B] hover:bg-[#c9a96e] disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-colors"
          >
            {downloadingPDF ? (
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            )}
            {downloadingPDF ? "Generando…" : "Descargar PDF"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1a1a1a] flex gap-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'border-[#B3985B] text-white font-medium'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="py-16 text-center text-[#555] text-sm">Cargando reporte…</div>
      ) : !data ? (
        <div className="py-16 text-center text-[#555] text-sm">Sin datos para este mes</div>
      ) : (
        <>
          {tab === "checklist"  && <SeccionChecklist   data={data.checklistSemanal}      mes={mes} />}
          {tab === "equipos"    && <SeccionMantenimiento data={data.mantenimientoEquipos} mes={mes} onActualizar={fetchData} />}
          {tab === "inventario" && <SeccionInventario   data={data.inventario}            mes={mes} />}
          {tab === "vehiculos"  && <SeccionVehiculos    data={data.vehiculos}             mes={mes} />}
          {tab === "proyectos"  && <SeccionProyectos    data={data.proyectos}             mes={mes} />}
        </>
      )}
    </div>
  );
}
