"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Personal { id: string; nombre: string; puesto: string; departamento: string; diasLaborables: number[]; }
interface Asistencia {
  id: string; personalId: string; fecha: string; estado: string;
  minutosRetardo: number | null; horaEntrada: string | null; horaSalida: string | null;
  notas: string | null; justificada: boolean; documentoUrl: string | null;
}

// ─── Catálogos ───────────────────────────────────────────────────────────────
type EstadoAsist = "PRESENTE" | "FALTA" | "RETARDO" | "PERMISO" | "VACACIONES" | "INCAPACIDAD";

const ESTADOS: { value: EstadoAsist; label: string; code: string; btn: string; dot: string; text: string }[] = [
  { value: "PRESENTE",    label: "Presente",    code: "Pre", btn: "border-green-700  bg-green-900/30  text-green-300",  dot: "bg-green-500",  text: "text-green-400" },
  { value: "RETARDO",     label: "Retardo",     code: "Ret", btn: "border-yellow-700 bg-yellow-900/30 text-yellow-300", dot: "bg-yellow-500", text: "text-yellow-400" },
  { value: "FALTA",       label: "Falta",       code: "Fal", btn: "border-red-700    bg-red-900/30    text-red-300",    dot: "bg-red-500",    text: "text-red-400" },
  { value: "PERMISO",     label: "Permiso",     code: "Per", btn: "border-blue-700   bg-blue-900/30   text-blue-300",   dot: "bg-blue-500",   text: "text-blue-400" },
  { value: "VACACIONES",  label: "Vacaciones",  code: "Vac", btn: "border-purple-700 bg-purple-900/30 text-purple-300", dot: "bg-purple-500", text: "text-purple-400" },
  { value: "INCAPACIDAD", label: "Incapacidad", code: "Inc", btn: "border-orange-700 bg-orange-900/30 text-orange-300", dot: "bg-orange-500", text: "text-orange-400" },
];
const ESTADO_MAP = Object.fromEntries(ESTADOS.map(e => [e.value, e]));
const JUSTIFICABLES: EstadoAsist[] = ["FALTA", "INCAPACIDAD", "PERMISO"];
const DIAS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }
function toMes(d: Date) { return d.toISOString().slice(0, 7); }
function fmtFecha(s: string) {
  const d = new Date(s + "T12:00:00");
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function mxn(n: number) { return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" }); }

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AsistenciaPage() {
  const [tab, setTab] = useState<"hoy" | "historial" | "reporte" | "penalizaciones" | "config">("hoy");
  const [personal, setPersonal] = useState<Personal[]>([]);

  useEffect(() => {
    fetch("/api/rrhh/personal").then(r => r.json()).then(d => {
      setPersonal(d.personal?.filter((p: Personal & { activo: boolean }) => p.activo) ?? []);
    });
  }, []);

  const tabs = [
    { id: "hoy",            label: "Captura diaria" },
    { id: "historial",      label: "Historial" },
    { id: "reporte",        label: "Reporte" },
    { id: "penalizaciones", label: "Penalizaciones" },
    { id: "config",         label: "Configuración" },
  ] as const;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ms-h1">Asistencia</h1>
          <p className="text-gray-500 text-sm">{personal.length} empleados activos</p>
        </div>
        <Link href="/rrhh/personal" className="text-xs text-gray-600 hover:text-[#B3985B] transition-colors">
          Gestionar personal →
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 ms-card p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-white"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === "hoy"            && <TabHoy personal={personal} />}
      {tab === "historial"     && <TabHistorial personal={personal} />}
      {tab === "reporte"       && <TabReporte personal={personal} />}
      {tab === "penalizaciones" && <TabPenalizaciones />}
      {tab === "config"        && <TabConfig />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: CAPTURA DIARIA
// ══════════════════════════════════════════════════════════════════════════════
function TabHoy({ personal }: { personal: Personal[] }) {
  const toast = useToast();
  const [fecha, setFecha] = useState(toDateStr(new Date()));
  const [asistencias, setAsistencias] = useState<Record<string, Asistencia>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [retardoMin, setRetardoMin] = useState<Record<string, string>>({});
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [subiendo, setSubiendo] = useState<string | null>(null);

  const cargar = useCallback(async (f: string) => {
    const r = await fetch(`/api/rrhh/asistencia?mes=${f.slice(0, 7)}`, { cache: "no-store" });
    const d = await r.json();
    const map: Record<string, Asistencia> = {};
    (d.asistencias ?? []).forEach((a: Asistencia) => {
      if (a.fecha.slice(0, 10) === f) map[a.personalId] = a;
    });
    setAsistencias(map);
    const retMap: Record<string, string> = {};
    const notMap: Record<string, string> = {};
    Object.values(map).forEach(a => {
      if (a.minutosRetardo) retMap[a.personalId] = String(a.minutosRetardo);
      if (a.notas) notMap[a.personalId] = a.notas;
    });
    setRetardoMin(retMap);
    setNotas(notMap);
  }, []);

  useEffect(() => { cargar(fecha); }, [fecha, cargar]);

  async function guardar(personalId: string, patch: Partial<Asistencia> & { estado: EstadoAsist }) {
    setSaving(personalId);
    const prev = asistencias[personalId];
    const body: Record<string, unknown> = {
      personalId, fecha,
      estado: patch.estado,
      minutosRetardo: patch.estado === "RETARDO" ? (parseInt(retardoMin[personalId] || "0") || null) : null,
      notas: notas[personalId] || null,
      justificada: patch.justificada ?? prev?.justificada ?? false,
      documentoUrl: patch.documentoUrl !== undefined ? patch.documentoUrl : (prev?.documentoUrl ?? null),
    };
    const res = await fetch("/api/rrhh/asistencia", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al registrar asistencia"); setSaving(null); return; }
    await cargar(fecha);
    setSaving(null);
  }

  async function borrar(personalId: string) {
    setSaving(personalId);
    const res = await fetch(`/api/rrhh/asistencia?personalId=${personalId}&fecha=${fecha}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "No se pudo quitar el registro"); setSaving(null); return; }
    setRetardoMin(prev => { const n = { ...prev }; delete n[personalId]; return n; });
    setNotas(prev => { const n = { ...prev }; delete n[personalId]; return n; });
    await cargar(fecha);
    setSaving(null);
  }

  async function subirDoc(personalId: string, file: File) {
    setSubiendo(personalId);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) { toast.error("No se pudo subir el documento"); setSubiendo(null); return; }
    const { url } = await res.json();
    await guardar(personalId, { estado: (asistencias[personalId]?.estado as EstadoAsist) ?? "FALTA", justificada: true, documentoUrl: url });
    setSubiendo(null);
  }

  async function marcarTodos(estado: EstadoAsist) {
    const diaSemana = new Date(fecha + "T12:00:00").getDay();
    if (diaSemana === 0 || diaSemana === 6) return;
    setSaving("TODOS");
    const results = await Promise.all(personal.map(p =>
      fetch("/api/rrhh/asistencia", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalId: p.id, fecha, estado }),
      })
    ));
    if (results.some(r => !r.ok)) toast.error("Algunos registros no se guardaron");
    await cargar(fecha);
    setSaving(null);
  }

  const presentes = personal.filter(p => asistencias[p.id]?.estado === "PRESENTE").length;
  const pendientes = personal.filter(p => !asistencias[p.id]).length;
  const esFinde = [0, 6].includes(new Date(fecha + "T12:00:00").getDay());

  function navFecha(delta: number) {
    const d = new Date(fecha + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setFecha(toDateStr(d));
  }

  return (
    <div className="space-y-4">
      {/* Fecha nav + stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navFecha(-1)} className="w-8 h-8 ms-btn-icon">←</button>
          <div className="text-center min-w-[200px]">
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="bg-transparent text-white font-semibold text-sm text-center focus:outline-none cursor-pointer" />
            <p className="text-gray-600 text-[10px] capitalize">{fmtFecha(fecha)}</p>
          </div>
          <button onClick={() => navFecha(1)} className="w-8 h-8 ms-btn-icon">→</button>
          {fecha !== toDateStr(new Date()) && (
            <button onClick={() => setFecha(toDateStr(new Date()))} className="text-xs text-[#B3985B] hover:text-[#c9a96a] transition-colors">Hoy</button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-green-400 font-medium">{presentes} presentes</span>
          {pendientes > 0 && <span className="text-gray-500">{pendientes} pendientes</span>}
        </div>
      </div>

      {esFinde && (
        <div className="ms-stat-card text-center text-gray-500 text-sm">
          Es fin de semana — puedes registrar asistencia si aplica
        </div>
      )}

      {/* Acciones bulk */}
      {!esFinde && personal.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-600">Marcar todos:</span>
          {ESTADOS.slice(0, 3).map(e => (
            <button key={e.value} onClick={() => marcarTodos(e.value)} disabled={saving === "TODOS"}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${e.btn}`}>
              {e.label}
            </button>
          ))}
        </div>
      )}

      {/* Lista de empleados */}
      {personal.length === 0 ? (
        <div className="ms-card p-8 text-center">
          <p className="text-gray-500 text-sm">No hay empleados activos.</p>
          <Link href="/rrhh/personal" className="text-[#B3985B] text-sm hover:underline mt-2 block">
            Agregar personal →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {personal.map(p => {
            const asist = asistencias[p.id];
            const isSaving = saving === p.id;
            const esJustificable = asist && JUSTIFICABLES.includes(asist.estado as EstadoAsist);
            return (
              <div key={p.id} className={`bg-[#111] border rounded-xl p-4 transition-all ${
                asist ? "border-[#222]" : "border-[#2a2a2a] border-dashed"
              }`}>
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Empleado info */}
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <div className="w-8 h-8 rounded-full bg-[#B3985B]/20 flex items-center justify-center text-[#B3985B] text-xs font-bold shrink-0">
                      {p.nombre.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
                      <p className="text-gray-600 text-[10px] truncate">{p.puesto} · {p.departamento}</p>
                    </div>
                  </div>

                  {/* Estado actual */}
                  <div className="flex items-center gap-1.5">
                    {asist ? (
                      <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border ${ESTADO_MAP[asist.estado]?.btn ?? ""}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ESTADO_MAP[asist.estado]?.dot ?? "bg-gray-500"}`} />
                        {ESTADO_MAP[asist.estado]?.label ?? asist.estado}
                        {asist.minutosRetardo ? ` · ${asist.minutosRetardo}min` : ""}
                        {esJustificable && (asist.justificada && asist.documentoUrl ? " · justificada" : " · injustificada")}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-700 italic">Sin registrar</span>
                    )}
                  </div>

                  {/* Botones de estado */}
                  <div className="flex gap-1 flex-wrap ml-auto items-center">
                    {ESTADOS.map(e => (
                      <button key={e.value}
                        onClick={() => asist?.estado === e.value ? borrar(p.id) : guardar(p.id, { estado: e.value })}
                        disabled={isSaving}
                        title={asist?.estado === e.value ? `${e.label} — clic para quitar` : e.label}
                        className={`px-2 h-8 rounded-lg text-[11px] font-bold border transition-all disabled:opacity-40 ${
                          asist?.estado === e.value
                            ? e.btn + " ring-1 ring-white/20"
                            : "bg-[#1a1a1a] border-[#333] text-gray-500 hover:text-white hover:border-[#555]"
                        }`}>
                        {isSaving ? "…" : e.code}
                      </button>
                    ))}
                    {asist && (
                      <button onClick={() => borrar(p.id)} disabled={isSaving} title="Quitar registro"
                        className="px-2 h-8 rounded-lg text-[11px] font-bold border bg-[#1a1a1a] border-[#333] text-gray-600 hover:text-red-400 hover:border-red-800 transition-all disabled:opacity-40">
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Retardo: minutos */}
                {asist?.estado === "RETARDO" && (
                  <div className="mt-3 flex items-center gap-2 pl-11">
                    <label className="text-xs text-gray-500">Minutos de retardo:</label>
                    <input type="number" min="1" max="480"
                      value={retardoMin[p.id] ?? ""}
                      onChange={e => setRetardoMin(prev => ({ ...prev, [p.id]: e.target.value }))}
                      onBlur={() => guardar(p.id, { estado: "RETARDO" })}
                      className="w-20 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-yellow-600" />
                  </div>
                )}

                {/* Justificación con documento */}
                {esJustificable && (
                  <div className="mt-3 pl-11 flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                      <input type="checkbox" checked={!!asist.justificada}
                        onChange={e => guardar(p.id, { estado: asist.estado as EstadoAsist, justificada: e.target.checked, documentoUrl: e.target.checked ? asist.documentoUrl : null })}
                        className="accent-[#B3985B]" />
                      Justificada
                    </label>
                    {asist.justificada && (
                      asist.documentoUrl ? (
                        <a href={asist.documentoUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[#B3985B] hover:underline">Ver documento</a>
                      ) : (
                        <label className="text-xs text-gray-500 cursor-pointer hover:text-white">
                          {subiendo === p.id ? "Subiendo…" : "Adjuntar documento"}
                          <input type="file" className="hidden" accept="image/*,application/pdf"
                            onChange={e => { const f = e.target.files?.[0]; if (f) subirDoc(p.id, f); }} />
                        </label>
                      )
                    )}
                    {asist.justificada && !asist.documentoUrl && (
                      <span className="text-[10px] text-red-400">Sin documento cuenta como injustificada</span>
                    )}
                  </div>
                )}

                {/* Notas rápidas */}
                {asist && (
                  <div className="mt-2 pl-11">
                    <input value={notas[p.id] ?? ""}
                      onChange={e => setNotas(prev => ({ ...prev, [p.id]: e.target.value }))}
                      onBlur={() => guardar(p.id, { estado: asist.estado as EstadoAsist })}
                      placeholder="Nota opcional..."
                      className="w-full bg-transparent border-b border-[#2a2a2a] text-gray-500 text-xs py-0.5 focus:outline-none focus:border-[#444] placeholder:text-gray-700" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 pt-2">
        {ESTADOS.map(e => (
          <div key={e.value} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${e.dot}`} />
            <span className="text-[10px] text-gray-600">{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: HISTORIAL (calendario por empleado)
// ══════════════════════════════════════════════════════════════════════════════
function TabHistorial({ personal }: { personal: Personal[] }) {
  const toast = useToast();
  const [selId, setSelId] = useState<string | null>(null);
  const [mes, setMes] = useState(toMes(new Date()));
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { if (personal.length > 0 && !selId) setSelId(personal[0].id); }, [personal, selId]);

  const recargar = useCallback(() => {
    if (!selId) return;
    setLoading(true);
    fetch(`/api/rrhh/asistencia?personalId=${selId}&mes=${mes}`, { cache: "no-store" })
      .then(r => r.json()).then(d => { setAsistencias(d.asistencias ?? []); setLoading(false); });
  }, [selId, mes]);

  useEffect(() => { recargar(); }, [recargar]);

  const [year, month] = mes.split("-").map(Number);
  const diasEnMes = new Date(year, month, 0).getDate();
  const todayStr = toDateStr(new Date());

  const dias = Array.from({ length: diasEnMes }, (_, i) => {
    const d = new Date(year, month - 1, i + 1);
    const fechaStr = `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    const asist = asistencias.find(a => a.fecha.slice(0, 10) === fechaStr);
    return { dia: i + 1, fecha: fechaStr, diaSemana: d.getDay(), esFinDeSemana: d.getDay() === 0 || d.getDay() === 6, asist };
  });

  const presente    = asistencias.filter(a => a.estado === "PRESENTE").length;
  const faltas      = asistencias.filter(a => a.estado === "FALTA").length;
  const retardos    = asistencias.filter(a => a.estado === "RETARDO").length;
  const laborales   = dias.filter(d => !d.esFinDeSemana).length;
  const selPersonal = personal.find(p => p.id === selId);

  async function marcar(fecha: string, estado: EstadoAsist) {
    if (!selId) return;
    setSaving(fecha);
    const res = await fetch("/api/rrhh/asistencia", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalId: selId, fecha, estado }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al registrar"); setSaving(null); return; }
    recargar();
    setSaving(null);
  }

  async function borrar(fecha: string) {
    if (!selId) return;
    setSaving(fecha);
    const res = await fetch(`/api/rrhh/asistencia?personalId=${selId}&fecha=${fecha}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "No se pudo quitar"); setSaving(null); return; }
    recargar();
    setSaving(null);
  }

  return (
    <div className="flex gap-4 flex-col md:flex-row">
      {/* Sidebar: lista empleados */}
      <div className="md:w-48 shrink-0">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2 px-1">Empleados</p>
        <div className="space-y-0.5">
          {personal.map(p => (
            <button key={p.id} onClick={() => setSelId(p.id)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                selId === p.id ? "bg-[#B3985B]/20 text-[#B3985B] border border-[#B3985B]/30" : "text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
              }`}>
              <p className="font-medium truncate text-sm">{p.nombre}</p>
              <p className="text-[10px] text-gray-600 truncate">{p.puesto}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Calendario */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() - 1); setMes(toMes(d)); }}
              className="w-8 h-8 ms-btn-icon">←</button>
            <span className="text-white text-sm font-semibold min-w-[130px] text-center">{MESES[month - 1]} {year}</span>
            <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() + 1); setMes(toMes(d)); }}
              className="w-8 h-8 ms-btn-icon">→</button>
          </div>
          {selPersonal && (
            <div className="flex gap-3 text-xs flex-wrap">
              <span className="text-green-400">{presente} presente</span>
              <span className="text-yellow-400">{retardos} retardo</span>
              <span className="text-red-400">{faltas} falta</span>
              <span className="text-gray-600">{laborales} laborales</span>
              {laborales > 0 && <span className="text-[#B3985B] font-medium">{Math.round((presente / laborales) * 100)}%</span>}
            </div>
          )}
        </div>

        {loading ? <div className="py-8 text-center text-gray-600 text-sm">Cargando...</div> : (
          <div className="ms-card overflow-x-auto">
            <div className="min-w-[420px]">
            <div className="grid grid-cols-7 border-b border-[#1a1a1a]">
              {DIAS_ES.map(d => (
                <div key={d} className="py-2 text-center text-[10px] text-gray-600 font-medium">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: dias[0].diaSemana }).map((_, i) => (
                <div key={`e-${i}`} className="h-14 border-b border-r border-[#181818]" />
              ))}
              {dias.map(({ dia, fecha, esFinDeSemana, asist }) => {
                const esHoy = fecha === todayStr;
                const info = asist ? ESTADO_MAP[asist.estado] : null;
                return (
                  <div key={fecha}
                    className={`h-14 border-b border-r border-[#181818] relative p-1.5 ${esFinDeSemana ? "bg-[#0d0d0d]" : ""} ${esHoy ? "ring-1 ring-[#B3985B]/40 ring-inset" : ""}`}>
                    <p className={`text-[10px] font-medium mb-1 ${esHoy ? "text-[#B3985B]" : esFinDeSemana ? "text-gray-700" : "text-gray-500"}`}>{dia}</p>
                    {!esFinDeSemana && (
                      <Combobox
                        value={asist?.estado ?? ""}
                        onChange={v => v ? marcar(fecha, v as EstadoAsist) : (asist && borrar(fecha))}
                        disabled={saving === fecha}
                        options={[{ value: "", label: "—" }, ...ESTADOS.map(e => ({ value: e.value, label: e.label }))]}
                        className={`w-full text-[9px] rounded px-0.5 py-0.5 border-0 focus:outline-none cursor-pointer appearance-none text-center ${
                          info ? info.btn.split(" ").slice(0, 2).join(" ") + " " + info.text : "bg-[#1a1a1a] text-gray-600"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {ESTADOS.map(e => (
            <div key={e.value} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${e.dot}`} />
              <span className="text-[10px] text-gray-600">{e.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: REPORTE MENSUAL
// ══════════════════════════════════════════════════════════════════════════════
function TabReporte({ personal }: { personal: Personal[] }) {
  const [mes, setMes] = useState(toMes(new Date()));
  const [data, setData] = useState<Record<string, Asistencia[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (personal.length === 0) return;
    setLoading(true);
    fetch(`/api/rrhh/asistencia?mes=${mes}`)
      .then(r => r.json())
      .then(d => {
        const map: Record<string, Asistencia[]> = {};
        personal.forEach(p => { map[p.id] = []; });
        (d.asistencias ?? []).forEach((a: Asistencia) => {
          if (map[a.personalId]) map[a.personalId].push(a);
        });
        setData(map);
        setLoading(false);
      });
  }, [mes, personal]);

  const [year, month] = mes.split("-").map(Number);
  const diasEnMes = new Date(year, month, 0).getDate();
  const totalLaboralesEquipo = personal.reduce((acc, p) => {
    const diasLaborablesEmpleado = p.diasLaborables ?? [1, 2, 3, 4, 5];
    const laborales = Array.from({ length: diasEnMes }, (_, i) => {
      const dow = new Date(year, month - 1, i + 1).getDay();
      return diasLaborablesEmpleado.includes(dow);
    }).filter(Boolean).length;
    return acc + laborales;
  }, 0);

  function stat(asists: Asistencia[], estado: string) {
    return asists.filter(a => a.estado === estado).length;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() - 1); setMes(toMes(d)); }}
          className="w-8 h-8 ms-btn-icon">←</button>
        <span className="text-white text-sm font-semibold min-w-[130px] text-center">{MESES[month - 1]} {year}</span>
        <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() + 1); setMes(toMes(d)); }}
          className="w-8 h-8 ms-btn-icon">→</button>
        <a href={`/api/rrhh/asistencia/pdf?mes=${mes}`} target="_blank" rel="noopener noreferrer"
          className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-[#B3985B] text-black hover:bg-[#c9a96a] transition-colors">
          Descargar PDF
        </a>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-600 text-sm">Cargando...</div>
      ) : personal.length === 0 ? (
        <div className="ms-card p-8 text-center text-gray-500 text-sm">
          No hay empleados activos.
        </div>
      ) : (
        <div className="ms-card overflow-x-auto">
          <div className="min-w-[560px]">
          <div className="grid grid-cols-8 border-b border-[#1a1a1a] text-[10px] text-gray-600 uppercase tracking-wider">
            <div className="col-span-2 px-4 py-3">Empleado</div>
            <div className="px-2 py-3 text-center text-green-600">Pres.</div>
            <div className="px-2 py-3 text-center text-yellow-600">Ret.</div>
            <div className="px-2 py-3 text-center text-red-600">Falta</div>
            <div className="px-2 py-3 text-center text-blue-600">Perm.</div>
            <div className="px-2 py-3 text-center text-purple-600">Vac.</div>
            <div className="px-2 py-3 text-center text-[#B3985B]">% Asist.</div>
          </div>

          {personal.map((p, idx) => {
            const asists = data[p.id] ?? [];
            const presente   = stat(asists, "PRESENTE");
            const retardo    = stat(asists, "RETARDO");
            const falta      = stat(asists, "FALTA");
            const permiso    = stat(asists, "PERMISO");
            const vacaciones = stat(asists, "VACACIONES");
            
            const diasLaborablesEmpleado = p.diasLaborables ?? [1, 2, 3, 4, 5];
            const laborales = Array.from({ length: diasEnMes }, (_, i) => {
              const dow = new Date(year, month - 1, i + 1).getDay();
              return diasLaborablesEmpleado.includes(dow);
            }).filter(Boolean).length;
            
            const pct = laborales > 0 ? Math.round(((presente + retardo) / laborales) * 100) : 0;
            const total = asists.length;

            return (
              <div key={p.id} className={`grid grid-cols-8 items-center ${idx < personal.length - 1 ? "border-b border-[#1a1a1a]" : ""} hover:bg-[#1a1a1a]/40 transition-colors`}>
                <div className="col-span-2 px-4 py-3">
                  <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
                  <p className="text-gray-600 text-[10px] truncate">{p.departamento}</p>
                </div>
                <div className="px-2 py-3 text-center"><span className={`text-sm font-semibold ${presente > 0 ? "text-green-400" : "text-gray-700"}`}>{presente}</span></div>
                <div className="px-2 py-3 text-center"><span className={`text-sm font-semibold ${retardo > 0 ? "text-yellow-400" : "text-gray-700"}`}>{retardo}</span></div>
                <div className="px-2 py-3 text-center"><span className={`text-sm font-semibold ${falta > 0 ? "text-red-400" : "text-gray-700"}`}>{falta}</span></div>
                <div className="px-2 py-3 text-center"><span className={`text-sm font-semibold ${permiso > 0 ? "text-blue-400" : "text-gray-700"}`}>{permiso}</span></div>
                <div className="px-2 py-3 text-center"><span className={`text-sm font-semibold ${vacaciones > 0 ? "text-purple-400" : "text-gray-700"}`}>{vacaciones}</span></div>
                <div className="px-2 py-3 text-center">
                  {total === 0 ? (
                    <span className="text-gray-700 text-xs">—</span>
                  ) : (
                    <span className={`text-sm font-bold ${pct >= 90 ? "text-green-400" : pct >= 75 ? "text-yellow-400" : "text-red-400"}`}>{pct}%</span>
                  )}
                </div>
              </div>
            );
          })}

          <div className="grid grid-cols-8 border-t border-[#2a2a2a] bg-[#0d0d0d] items-center">
            <div className="col-span-2 px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider">Total equipo</div>
            {["PRESENTE","RETARDO","FALTA","PERMISO","VACACIONES"].map(est => {
              const total = personal.reduce((acc, p) => acc + (data[p.id] ?? []).filter(a => a.estado === est).length, 0);
              return (
                <div key={est} className="px-2 py-3 text-center">
                  <span className="text-xs text-gray-500 font-semibold">{total || "—"}</span>
                </div>
              );
            })}
            <div className="px-2 py-3 text-center">
              <span className="text-xs text-[#B3985B] font-semibold">
                {personal.length > 0 && totalLaboralesEquipo > 0
                  ? Math.round((personal.reduce((acc, p) => {
                      const a = data[p.id] ?? [];
                      return acc + a.filter(x => x.estado === "PRESENTE" || x.estado === "RETARDO").length;
                    }, 0) / totalLaboralesEquipo) * 100) + "%"
                  : "—"}
              </span>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: PENALIZACIONES (recálculo mensual + aprobación)
// ══════════════════════════════════════════════════════════════════════════════
interface Resumen {
  personalId: string; nombre: string; salarioDia: number; retardos: number;
  faltasInjustificadas: number; faltasJustificadas: number; faltasPorRetardo: number;
  diasDescontables: number; montoDescuento: number; causalBaja: boolean;
}
interface IncidenciaAuto {
  id: string; personalId: string; descripcion: string | null; montoCalculado: number | null;
  estado: string; aprobadaPor: string | null; aprobadaEn: string | null;
  personal: { id: string; nombre: string; puesto: string };
}

function TabPenalizaciones() {
  const toast = useToast();
  const [mes, setMes] = useState(toMes(new Date()));
  const [resumenes, setResumenes] = useState<Resumen[]>([]);
  const [incidencias, setIncidencias] = useState<IncidenciaAuto[]>([]);
  const [loading, setLoading] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [accion, setAccion] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/rrhh/asistencia/penalizaciones?mes=${mes}`, { cache: "no-store" });
    const d = await r.json();
    setIncidencias(d.incidencias ?? []);
    setLoading(false);
  }, [mes]);

  useEffect(() => { cargar(); }, [cargar]);

  async function recalcular() {
    setRecalculando(true);
    const r = await fetch("/api/rrhh/asistencia/penalizaciones", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes }),
    });
    if (!r.ok) { toast.error("No se pudo recalcular"); setRecalculando(false); return; }
    const d = await r.json();
    setResumenes(d.resumenes ?? []);
    toast.success(`Recálculo listo: ${d.propuestasGeneradas} propuesta(s)`);
    await cargar();
    setRecalculando(false);
  }

  async function decidir(id: string, estado: "APROBADA" | "RECHAZADA") {
    setAccion(id);
    const r = await fetch(`/api/rrhh/incidencias/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (!r.ok) { toast.error("No se pudo actualizar"); setAccion(null); return; }
    await cargar();
    setAccion(null);
  }

  const [year, month] = mes.split("-").map(Number);
  const totalPropuesto = incidencias.filter(i => i.estado === "PROPUESTA").reduce((a, i) => a + (i.montoCalculado ?? 0), 0);
  const totalAprobado = incidencias.filter(i => i.estado === "APROBADA").reduce((a, i) => a + (i.montoCalculado ?? 0), 0);
  const resById = Object.fromEntries(resumenes.map(r => [r.personalId, r]));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() - 1); setMes(toMes(d)); }}
          className="w-8 h-8 ms-btn-icon">←</button>
        <span className="text-white text-sm font-semibold min-w-[130px] text-center">{MESES[month - 1]} {year}</span>
        <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() + 1); setMes(toMes(d)); }}
          className="w-8 h-8 ms-btn-icon">→</button>
        <button onClick={recalcular} disabled={recalculando}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-[#B3985B] text-black hover:bg-[#c9a96a] transition-colors disabled:opacity-40">
          {recalculando ? "Recalculando…" : "Recalcular mes"}
        </button>
      </div>

      <div className="ms-stat-card text-xs text-gray-400 leading-relaxed">
        El recálculo genera propuestas de descuento por <b>días no laborados</b> (faltas injustificadas y retardos acumulados),
        conforme a los arts. 84/89 LFT. No son multas al salario (prohibidas por el art. 107 LFT). Cada propuesta debe
        <b> aprobarse</b> antes de aplicarse a la nómina. Las faltas con documento justificante no generan descuento.
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="ms-stat-card flex-1 min-w-[140px]">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">Propuesto</p>
          <p className="text-lg font-bold text-yellow-400">{mxn(totalPropuesto)}</p>
        </div>
        <div className="ms-stat-card flex-1 min-w-[140px]">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">Aprobado</p>
          <p className="text-lg font-bold text-green-400">{mxn(totalAprobado)}</p>
        </div>
      </div>

      {/* Resumen del último recálculo */}
      {resumenes.length > 0 && (
        <div className="ms-card overflow-x-auto">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-7 border-b border-[#1a1a1a] text-[10px] text-gray-600 uppercase tracking-wider">
              <div className="col-span-2 px-4 py-3">Empleado</div>
              <div className="px-2 py-3 text-center">Retardos</div>
              <div className="px-2 py-3 text-center">F. inj.</div>
              <div className="px-2 py-3 text-center">F. x ret.</div>
              <div className="px-2 py-3 text-center">Días desc.</div>
              <div className="px-2 py-3 text-right pr-4">Descuento</div>
            </div>
            {resumenes.filter(r => r.retardos > 0 || r.faltasInjustificadas > 0 || r.faltasJustificadas > 0).map(r => (
              <div key={r.personalId} className="grid grid-cols-7 items-center border-b border-[#1a1a1a] last:border-0">
                <div className="col-span-2 px-4 py-2.5">
                  <p className="text-white text-sm font-medium truncate">{r.nombre}</p>
                  {r.causalBaja && <p className="text-[10px] text-red-400">Posible causal de rescisión (art. 47 LFT)</p>}
                </div>
                <div className="px-2 py-2.5 text-center text-sm text-yellow-400">{r.retardos}</div>
                <div className="px-2 py-2.5 text-center text-sm text-red-400">{r.faltasInjustificadas}</div>
                <div className="px-2 py-2.5 text-center text-sm text-orange-400">{r.faltasPorRetardo}</div>
                <div className="px-2 py-2.5 text-center text-sm text-white">{r.diasDescontables}</div>
                <div className="px-2 py-2.5 text-right pr-4 text-sm font-semibold text-white">{r.montoDescuento > 0 ? mxn(r.montoDescuento) : "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Propuestas / aprobación */}
      <div>
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Penalizaciones del mes</p>
        {loading ? (
          <div className="py-8 text-center text-gray-600 text-sm">Cargando...</div>
        ) : incidencias.length === 0 ? (
          <div className="ms-card p-8 text-center text-gray-500 text-sm">
            No hay penalizaciones. Pulsa «Recalcular mes» para generarlas a partir de la asistencia.
          </div>
        ) : (
          <div className="space-y-2">
            {incidencias.map(i => {
              const r = resById[i.personalId];
              const estadoColor = i.estado === "APROBADA" ? "text-green-400 border-green-800 bg-green-900/20"
                : i.estado === "RECHAZADA" ? "text-gray-500 border-[#333] bg-[#1a1a1a]"
                : "text-yellow-400 border-yellow-800 bg-yellow-900/20";
              return (
                <div key={i.id} className="bg-[#111] border border-[#222] rounded-xl p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{i.personal.nombre}</p>
                      <p className="text-gray-600 text-[10px] truncate">{i.personal.puesto}</p>
                    </div>
                    <span className="text-sm font-bold text-white">{i.montoCalculado != null ? mxn(i.montoCalculado) : "—"}</span>
                    <span className={`text-[10px] px-2 py-1 rounded-lg border ${estadoColor}`}>{i.estado}</span>
                    {i.estado === "PROPUESTA" && (
                      <div className="flex gap-1">
                        <button onClick={() => decidir(i.id, "APROBADA")} disabled={accion === i.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-green-700 bg-green-900/30 text-green-300 hover:bg-green-900/50 transition-colors disabled:opacity-40">
                          Aprobar
                        </button>
                        <button onClick={() => decidir(i.id, "RECHAZADA")} disabled={accion === i.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-800 bg-red-900/20 text-red-300 hover:bg-red-900/40 transition-colors disabled:opacity-40">
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                  {i.descripcion && <p className="text-gray-500 text-xs mt-2">{i.descripcion}</p>}
                  {r && (
                    <p className="text-gray-600 text-[10px] mt-1">
                      {r.retardos} retardo(s) · {r.faltasInjustificadas} falta(s) injustificada(s) · salario/día {mxn(r.salarioDia)}
                    </p>
                  )}
                  {i.aprobadaPor && <p className="text-gray-600 text-[10px] mt-1">{i.estado === "APROBADA" ? "Aprobada" : "Rechazada"} por {i.aprobadaPor}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: CONFIGURACIÓN
// ══════════════════════════════════════════════════════════════════════════════
interface Config {
  horaEntrada: string; toleranciaMin: number; retardoMaxMin: number; retardosPorFalta: number;
  descuentaRetardo: boolean; descuentaFalta: boolean; requiereDocFalta: boolean; faltasCausalBaja: number;
}

function TabConfig() {
  const toast = useToast();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/rrhh/asistencia/config", { cache: "no-store" })
      .then(r => r.json()).then(d => setCfg(d.config));
  }, []);

  async function guardar() {
    if (!cfg) return;
    setSaving(true);
    const r = await fetch("/api/rrhh/asistencia/config", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    if (!r.ok) { toast.error("No se pudo guardar"); setSaving(false); return; }
    toast.success("Configuración guardada");
    setSaving(false);
  }

  if (!cfg) return <div className="py-8 text-center text-gray-600 text-sm">Cargando...</div>;

  const numField = (k: keyof Config, label: string, hint: string, min = 0, max = 999) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input type="number" min={min} max={max} value={cfg[k] as number}
        onChange={e => setCfg({ ...cfg, [k]: Math.max(min, Number(e.target.value) || 0) })}
        className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
      <p className="text-[10px] text-gray-600 mt-1">{hint}</p>
    </div>
  );

  const boolField = (k: keyof Config, label: string, hint: string) => (
    <label className="flex items-start gap-3 p-3 rounded-lg bg-[#0d0d0d] border border-[#222] cursor-pointer">
      <input type="checkbox" checked={cfg[k] as boolean}
        onChange={e => setCfg({ ...cfg, [k]: e.target.checked })}
        className="mt-0.5 accent-[#B3985B]" />
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-[10px] text-gray-600">{hint}</p>
      </div>
    </label>
  );

  return (
    <div className="max-w-2xl space-y-5">
      <div className="ms-card p-5 space-y-4">
        <p className="text-sm font-semibold text-white">Reglas de horario</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Hora de entrada</label>
            <input type="time" value={cfg.horaEntrada}
              onChange={e => setCfg({ ...cfg, horaEntrada: e.target.value })}
              className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
            <p className="text-[10px] text-gray-600 mt-1">Hora oficial de inicio de jornada.</p>
          </div>
          {numField("toleranciaMin", "Tolerancia (min)", "Minutos de gracia antes de contar retardo.", 0, 120)}
          {numField("retardoMaxMin", "Retardo máximo (min)", "Pasado esto, el retardo se considera falta.", 0, 480)}
          {numField("retardosPorFalta", "Retardos por falta", "Retardos acumulados que equivalen a 1 falta.", 1, 20)}
        </div>
      </div>

      <div className="ms-card p-5 space-y-3">
        <p className="text-sm font-semibold text-white">Penalización y ley</p>
        {boolField("descuentaRetardo", "Descontar retardos acumulados", "Los retardos acumulados generan una falta descontable (día no laborado).")}
        {boolField("descuentaFalta", "Descontar faltas injustificadas", "Descuenta el día no laborado por cada falta sin justificar (art. 84/89 LFT).")}
        {boolField("requiereDocFalta", "Exigir documento para justificar", "Sin documento adjunto, la falta se considera injustificada.")}
        {numField("faltasCausalBaja", "Faltas para causal de rescisión", "Faltas injustificadas en 30 días que marcan posible rescisión (art. 47 LFT). Solo informativo.", 1, 30)}
      </div>

      <button onClick={guardar} disabled={saving}
        className="ms-btn-primary disabled:opacity-40">
        {saving ? "Guardando…" : "Guardar configuración"}
      </button>
    </div>
  );
}
