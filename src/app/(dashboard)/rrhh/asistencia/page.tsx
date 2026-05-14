"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Personal { id: string; nombre: string; puesto: string; departamento: string; }
interface Asistencia {
  id: string; personalId: string; fecha: string; estado: string;
  minutosRetardo: number | null; horaEntrada: string | null; horaSalida: string | null; notas: string | null;
}

// ─── Catálogos ───────────────────────────────────────────────────────────────
type EstadoAsist = "PRESENTE" | "FALTA" | "RETARDO" | "PERMISO" | "VACACIONES" | "INCAPACIDAD";

const ESTADOS: { value: EstadoAsist; label: string; icon: string; btn: string; dot: string }[] = [
  { value: "PRESENTE",    label: "Presente",    icon: "✓", btn: "border-green-700  bg-green-900/30  text-green-300  hover:bg-green-900/50",  dot: "bg-green-500" },
  { value: "RETARDO",     label: "Retardo",     icon: "⏱", btn: "border-yellow-700 bg-yellow-900/30 text-yellow-300 hover:bg-yellow-900/50", dot: "bg-yellow-500" },
  { value: "FALTA",       label: "Falta",       icon: "✗", btn: "border-red-700    bg-red-900/30    text-red-300    hover:bg-red-900/50",    dot: "bg-red-500" },
  { value: "PERMISO",     label: "Permiso",     icon: "📝", btn: "border-blue-700   bg-blue-900/30   text-blue-300   hover:bg-blue-900/50",   dot: "bg-blue-500" },
  { value: "VACACIONES",  label: "Vacaciones",  icon: "🌴", btn: "border-purple-700 bg-purple-900/30 text-purple-300 hover:bg-purple-900/50", dot: "bg-purple-500" },
  { value: "INCAPACIDAD", label: "Incapacidad", icon: "🏥", btn: "border-orange-700 bg-orange-900/30 text-orange-300 hover:bg-orange-900/50", dot: "bg-orange-500" },
];
const ESTADO_MAP = Object.fromEntries(ESTADOS.map(e => [e.value, e]));
const DIAS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }
function toMes(d: Date) { return d.toISOString().slice(0, 7); }
function fmtFecha(s: string) {
  const d = new Date(s + "T12:00:00");
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AsistenciaPage() {
  const [tab, setTab] = useState<"hoy" | "historial" | "reporte">("hoy");
  const [personal, setPersonal] = useState<Personal[]>([]);

  useEffect(() => {
    fetch("/api/rrhh/personal").then(r => r.json()).then(d => {
      setPersonal(d.personal?.filter((p: Personal & { activo: boolean }) => p.activo) ?? []);
    });
  }, []);

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Asistencia</h1>
          <p className="text-gray-500 text-sm">{personal.length} empleados activos</p>
        </div>
        <Link href="/rrhh/personal" className="text-xs text-gray-600 hover:text-[#B3985B] transition-colors">
          Gestionar personal →
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1">
        {([
          { id: "hoy",      label: "📋 Captura diaria" },
          { id: "historial", label: "📅 Historial" },
          { id: "reporte",  label: "📊 Reporte" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-white"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === "hoy"      && <TabHoy personal={personal} />}
      {tab === "historial" && <TabHistorial personal={personal} />}
      {tab === "reporte"  && <TabReporte personal={personal} />}
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

  const cargar = useCallback(async (f: string) => {
    const r = await fetch(`/api/rrhh/asistencia?mes=${f.slice(0, 7)}`, { cache: "no-store" });
    const d = await r.json();
    const map: Record<string, Asistencia> = {};
    (d.asistencias ?? []).forEach((a: Asistencia) => {
      if (a.fecha.slice(0, 10) === f) map[a.personalId] = a;
    });
    setAsistencias(map);
    // Pre-llenar retardos y notas
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

  async function marcar(personalId: string, estado: EstadoAsist) {
    setSaving(personalId);
    const body: Record<string, unknown> = {
      personalId, fecha, estado,
      minutosRetardo: estado === "RETARDO" ? (parseInt(retardoMin[personalId] || "0") || null) : null,
      notas: notas[personalId] || null,
    };
    const res = await fetch("/api/rrhh/asistencia", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al registrar asistencia"); setSaving(null); return; }
    await cargar(fecha);
    setSaving(null);
  }

  async function marcarTodos(estado: EstadoAsist) {
    const diasSemana = new Date(fecha + "T12:00:00").getDay();
    if (diasSemana === 0 || diasSemana === 6) return;
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
          <button onClick={() => navFecha(-1)} className="w-8 h-8 rounded-lg bg-[#111] border border-[#222] text-gray-400 hover:text-white text-sm transition-colors">←</button>
          <div className="text-center min-w-[200px]">
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="bg-transparent text-white font-semibold text-sm text-center focus:outline-none cursor-pointer" />
            <p className="text-gray-600 text-[10px] capitalize">{fmtFecha(fecha)}</p>
          </div>
          <button onClick={() => navFecha(1)} className="w-8 h-8 rounded-lg bg-[#111] border border-[#222] text-gray-400 hover:text-white text-sm transition-colors">→</button>
          {fecha !== toDateStr(new Date()) && (
            <button onClick={() => setFecha(toDateStr(new Date()))} className="text-xs text-[#B3985B] hover:text-[#c9a96a] transition-colors">Hoy</button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-green-400 font-medium">{presentes} presentes</span>
          {pendientes > 0 && <span className="text-gray-500">{pendientes} pendientes</span>}
        </div>
      </div>

      {/* Fin de semana aviso */}
      {esFinde && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center text-gray-500 text-sm">
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
              {e.icon} {e.label}
            </button>
          ))}
        </div>
      )}

      {/* Lista de empleados */}
      {personal.length === 0 ? (
        <div className="bg-[#111] border border-[#222] rounded-xl p-8 text-center">
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
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-700 italic">Sin registrar</span>
                    )}
                  </div>

                  {/* Botones de estado */}
                  <div className="flex gap-1 flex-wrap ml-auto">
                    {ESTADOS.map(e => (
                      <button key={e.value} onClick={() => marcar(p.id, e.value)} disabled={isSaving}
                        title={e.label}
                        className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all disabled:opacity-40 ${
                          asist?.estado === e.value
                            ? e.btn + " ring-1 ring-white/20"
                            : "bg-[#1a1a1a] border-[#333] text-gray-500 hover:text-white hover:border-[#555]"
                        }`}>
                        {isSaving ? "…" : e.icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Retardo: minutos */}
                {asist?.estado === "RETARDO" && (
                  <div className="mt-3 flex items-center gap-2 pl-11">
                    <label className="text-xs text-gray-500">Minutos de retardo:</label>
                    <input type="number" min="1" max="480"
                      value={retardoMin[p.id] ?? ""}
                      onChange={e => setRetardoMin(prev => ({ ...prev, [p.id]: e.target.value }))}
                      onBlur={() => marcar(p.id, "RETARDO")}
                      className="w-20 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-yellow-600" />
                  </div>
                )}

                {/* Notas rápidas */}
                {asist && (
                  <div className="mt-2 pl-11">
                    <input value={notas[p.id] ?? ""}
                      onChange={e => setNotas(prev => ({ ...prev, [p.id]: e.target.value }))}
                      onBlur={() => marcar(p.id, asist.estado as EstadoAsist)}
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

  useEffect(() => {
    if (!selId) return;
    setLoading(true);
    fetch(`/api/rrhh/asistencia?personalId=${selId}&mes=${mes}`)
      .then(r => r.json()).then(d => { setAsistencias(d.asistencias ?? []); setLoading(false); });
  }, [selId, mes]);

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
    const r = await fetch(`/api/rrhh/asistencia?personalId=${selId}&mes=${mes}`, { cache: "no-store" });
    const d = await r.json();
    setAsistencias(d.asistencias ?? []);
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
        {/* Nav mes + stats */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() - 1); setMes(toMes(d)); }}
              className="w-8 h-8 rounded-lg bg-[#111] border border-[#222] text-gray-400 hover:text-white text-sm transition-colors">←</button>
            <span className="text-white text-sm font-semibold min-w-[130px] text-center">{MESES[month - 1]} {year}</span>
            <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() + 1); setMes(toMes(d)); }}
              className="w-8 h-8 rounded-lg bg-[#111] border border-[#222] text-gray-400 hover:text-white text-sm transition-colors">→</button>
          </div>
          {selPersonal && (
            <div className="flex gap-3 text-xs flex-wrap">
              <span className="text-green-400">{presente} ✓</span>
              <span className="text-yellow-400">{retardos} ⏱</span>
              <span className="text-red-400">{faltas} ✗</span>
              <span className="text-gray-600">{laborales} laborales</span>
              {laborales > 0 && <span className="text-[#B3985B] font-medium">{Math.round((presente / laborales) * 100)}%</span>}
            </div>
          )}
        </div>

        {loading ? <div className="py-8 text-center text-gray-600 text-sm">Cargando...</div> : (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
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
                        onChange={v => v && marcar(fecha, v as EstadoAsist)}
                        disabled={saving === fecha}
                        options={[{ value: "", label: "—" }, ...ESTADOS.map(e => ({ value: e.value, label: `${e.icon} ${e.label}` }))]}
                        className={`w-full text-[9px] rounded px-0.5 py-0.5 border-0 focus:outline-none cursor-pointer appearance-none text-center ${
                          info ? `${info.dot.replace("bg-", "bg-")} ${info.btn.split(" ").slice(0, 2).join(" ")}` : "bg-[#1a1a1a] text-gray-600"
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
    // Fetch asistencias de todos para el mes
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
  const laborales = Array.from({ length: diasEnMes }, (_, i) => {
    const dow = new Date(year, month - 1, i + 1).getDay();
    return dow !== 0 && dow !== 6;
  }).filter(Boolean).length;

  function stat(asists: Asistencia[], estado: string) {
    return asists.filter(a => a.estado === estado).length;
  }

  return (
    <div className="space-y-4">
      {/* Nav mes */}
      <div className="flex items-center gap-2">
        <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() - 1); setMes(toMes(d)); }}
          className="w-8 h-8 rounded-lg bg-[#111] border border-[#222] text-gray-400 hover:text-white text-sm transition-colors">←</button>
        <span className="text-white text-sm font-semibold min-w-[130px] text-center">{MESES[month - 1]} {year}</span>
        <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() + 1); setMes(toMes(d)); }}
          className="w-8 h-8 rounded-lg bg-[#111] border border-[#222] text-gray-400 hover:text-white text-sm transition-colors">→</button>
        <span className="text-gray-600 text-xs ml-2">{laborales} días laborales</span>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-600 text-sm">Cargando...</div>
      ) : personal.length === 0 ? (
        <div className="bg-[#111] border border-[#222] rounded-xl p-8 text-center text-gray-500 text-sm">
          No hay empleados activos.
        </div>
      ) : (
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-x-auto">
          <div className="min-w-[560px]">
          {/* Header tabla */}
          <div className="grid grid-cols-8 border-b border-[#1a1a1a] text-[10px] text-gray-600 uppercase tracking-wider">
            <div className="col-span-2 px-4 py-3">Empleado</div>
            <div className="px-2 py-3 text-center text-green-600">✓ Pres.</div>
            <div className="px-2 py-3 text-center text-yellow-600">⏱ Ret.</div>
            <div className="px-2 py-3 text-center text-red-600">✗ Falta</div>
            <div className="px-2 py-3 text-center text-blue-600">📝 Perm.</div>
            <div className="px-2 py-3 text-center text-purple-600">🌴 Vac.</div>
            <div className="px-2 py-3 text-center text-[#B3985B]">% Asist.</div>
          </div>

          {personal.map((p, idx) => {
            const asists = data[p.id] ?? [];
            const presente   = stat(asists, "PRESENTE");
            const retardo    = stat(asists, "RETARDO");
            const falta      = stat(asists, "FALTA");
            const permiso    = stat(asists, "PERMISO");
            const vacaciones = stat(asists, "VACACIONES");
            const pct = laborales > 0 ? Math.round(((presente + retardo) / laborales) * 100) : 0;
            const total = asists.length;

            return (
              <div key={p.id} className={`grid grid-cols-8 items-center ${idx < personal.length - 1 ? "border-b border-[#1a1a1a]" : ""} hover:bg-[#1a1a1a]/40 transition-colors`}>
                <div className="col-span-2 px-4 py-3">
                  <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
                  <p className="text-gray-600 text-[10px] truncate">{p.departamento}</p>
                </div>
                <div className="px-2 py-3 text-center">
                  <span className={`text-sm font-semibold ${presente > 0 ? "text-green-400" : "text-gray-700"}`}>{presente}</span>
                </div>
                <div className="px-2 py-3 text-center">
                  <span className={`text-sm font-semibold ${retardo > 0 ? "text-yellow-400" : "text-gray-700"}`}>{retardo}</span>
                </div>
                <div className="px-2 py-3 text-center">
                  <span className={`text-sm font-semibold ${falta > 0 ? "text-red-400" : "text-gray-700"}`}>{falta}</span>
                </div>
                <div className="px-2 py-3 text-center">
                  <span className={`text-sm font-semibold ${permiso > 0 ? "text-blue-400" : "text-gray-700"}`}>{permiso}</span>
                </div>
                <div className="px-2 py-3 text-center">
                  <span className={`text-sm font-semibold ${vacaciones > 0 ? "text-purple-400" : "text-gray-700"}`}>{vacaciones}</span>
                </div>
                <div className="px-2 py-3 text-center">
                  {total === 0 ? (
                    <span className="text-gray-700 text-xs">—</span>
                  ) : (
                    <span className={`text-sm font-bold ${pct >= 90 ? "text-green-400" : pct >= 75 ? "text-yellow-400" : "text-red-400"}`}>
                      {pct}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Totales */}
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
                {personal.length > 0 && laborales > 0
                  ? Math.round((personal.reduce((acc, p) => {
                      const a = data[p.id] ?? [];
                      return acc + a.filter(x => x.estado === "PRESENTE" || x.estado === "RETARDO").length;
                    }, 0) / (personal.length * laborales)) * 100) + "%"
                  : "—"
                }
              </span>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
