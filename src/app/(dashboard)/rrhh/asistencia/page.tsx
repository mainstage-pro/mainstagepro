"use client";

import { useEffect, useState } from "react";

interface Personal { id: string; nombre: string; puesto: string; departamento: string; }
interface Asistencia { id: string; personalId: string; fecha: string; estado: string; minutosRetardo: number | null; notas: string | null; }

type EstadoAsist = "PRESENTE" | "FALTA" | "RETARDO" | "PERMISO" | "VACACIONES" | "INCAPACIDAD";
const ESTADOS: { value: EstadoAsist; label: string; color: string; bg: string }[] = [
  { value: "PRESENTE",    label: "Presente",    color: "text-green-400",  bg: "bg-green-900/40" },
  { value: "RETARDO",     label: "Retardo",     color: "text-yellow-400", bg: "bg-yellow-900/40" },
  { value: "FALTA",       label: "Falta",       color: "text-red-400",    bg: "bg-red-900/40" },
  { value: "PERMISO",     label: "Permiso",     color: "text-blue-400",   bg: "bg-blue-900/40" },
  { value: "VACACIONES",  label: "Vacaciones",  color: "text-purple-400", bg: "bg-purple-900/40" },
  { value: "INCAPACIDAD", label: "Incapacidad", color: "text-orange-400", bg: "bg-orange-900/40" },
];
const ESTADO_MAP = Object.fromEntries(ESTADOS.map(e => [e.value, e]));
const DIAS_ES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function toMes(d: Date) { return d.toISOString().slice(0,7); }

export default function AsistenciaPage() {
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [mes, setMes] = useState(toMes(new Date()));
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rrhh/personal").then(r=>r.json()).then(d => {
      const p = d.personal?.filter((p: Personal & { activo: boolean }) => p.activo) ?? [];
      setPersonal(p);
      if (p.length > 0) setSelId(p[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selId) return;
    setLoading(true);
    fetch(`/api/rrhh/asistencia?personalId=${selId}&mes=${mes}`)
      .then(r=>r.json()).then(d => { setAsistencias(d.asistencias ?? []); setLoading(false); });
  }, [selId, mes]);

  const selPersonal = personal.find(p => p.id === selId);
  const [year, month] = mes.split("-").map(Number);
  const diasEnMes = new Date(year, month, 0).getDate();
  const dias = Array.from({ length: diasEnMes }, (_, i) => {
    const d = new Date(year, month-1, i+1);
    const fechaStr = `${year}-${String(month).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`;
    const asist = asistencias.find(a => a.fecha.slice(0,10) === fechaStr);
    return { dia: i+1, fecha: fechaStr, diaSemana: d.getDay(), esFinDeSemana: d.getDay()===0||d.getDay()===6, asist };
  });

  const presente = asistencias.filter(a=>a.estado==="PRESENTE").length;
  const faltas   = asistencias.filter(a=>a.estado==="FALTA").length;
  const retardos = asistencias.filter(a=>a.estado==="RETARDO").length;
  const laborales = dias.filter(d=>!d.esFinDeSemana).length;

  async function marcar(fecha: string, estado: EstadoAsist) {
    if (!selId) return;
    setSaving(fecha);
    await fetch("/api/rrhh/asistencia", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalId: selId, fecha, estado }),
    });
    const r = await fetch(`/api/rrhh/asistencia?personalId=${selId}&mes=${mes}`);
    const d = await r.json();
    setAsistencias(d.asistencias ?? []);
    setSaving(null);
  }

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Asistencia</h1>
          <p className="text-[#6b7280] text-sm">Registro diario por empleado</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { const d=new Date(`${mes}-15`); d.setMonth(d.getMonth()-1); setMes(toMes(d)); }}
            className="text-gray-500 hover:text-white w-8 h-8 rounded hover:bg-[#1a1a1a] transition-colors text-sm">←</button>
          <span className="text-white text-sm font-semibold min-w-[130px] text-center">{MESES[month-1]} {year}</span>
          <button onClick={() => { const d=new Date(`${mes}-15`); d.setMonth(d.getMonth()+1); setMes(toMes(d)); }}
            className="text-gray-500 hover:text-white w-8 h-8 rounded hover:bg-[#1a1a1a] transition-colors text-sm">→</button>
        </div>
      </div>

      <div className="flex gap-4 flex-col md:flex-row">
        {/* Panel izquierdo: lista de personal */}
        <div className="md:w-52 shrink-0 space-y-1">
          {personal.map(p => (
            <button key={p.id} onClick={() => setSelId(p.id)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${selId===p.id?"bg-[#B3985B]/20 text-[#B3985B] border border-[#B3985B]/30":"text-gray-400 hover:bg-[#1a1a1a] hover:text-white"}`}>
              <p className="font-medium truncate">{p.nombre}</p>
              <p className="text-[10px] text-gray-600 truncate">{p.puesto}</p>
            </button>
          ))}
        </div>

        {/* Panel derecho: calendario del mes */}
        <div className="flex-1 space-y-4">
          {selPersonal && (
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-white font-semibold">{selPersonal.nombre}</p>
              <div className="flex gap-3 text-xs">
                <span className="text-green-400">{presente} presente</span>
                <span className="text-red-400">{faltas} falta{faltas!==1?"s":""}</span>
                <span className="text-yellow-400">{retardos} retardo{retardos!==1?"s":""}</span>
                <span className="text-gray-600">{laborales} días laborales</span>
              </div>
            </div>
          )}

          {loading ? <div className="py-8 text-center text-gray-600 text-sm">Cargando...</div> : (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              {/* Encabezado días */}
              <div className="grid grid-cols-7 border-b border-[#1a1a1a]">
                {DIAS_ES.map(d => (
                  <div key={d} className="py-2 text-center text-[10px] text-gray-600 font-medium">{d}</div>
                ))}
              </div>
              {/* Grid del mes */}
              <div className="grid grid-cols-7">
                {/* Espaciado inicial */}
                {Array.from({ length: dias[0].diaSemana }).map((_,i) => (
                  <div key={`empty-${i}`} className="h-16 border-b border-r border-[#181818]" />
                ))}
                {dias.map(({ dia, fecha, diaSemana, esFinDeSemana, asist }) => (
                  <div key={fecha}
                    className={`h-16 border-b border-r border-[#181818] relative p-1 ${esFinDeSemana ? "bg-[#0d0d0d]" : ""} ${fecha === toMes(new Date()).slice(0,7)+"-"+String(new Date().getDate()).padStart(2,"0") ? "ring-1 ring-[#B3985B]/40 ring-inset" : ""}`}>
                    <p className={`text-[10px] mb-1 ${esFinDeSemana?"text-gray-700":"text-gray-500"}`}>{dia}</p>
                    {!esFinDeSemana && (
                      <select
                        value={asist?.estado ?? ""}
                        onChange={e => { if (e.target.value) marcar(fecha, e.target.value as EstadoAsist); }}
                        disabled={saving === fecha}
                        className={`w-full text-[9px] rounded px-0.5 py-0.5 border-0 focus:outline-none cursor-pointer ${
                          asist ? (ESTADO_MAP[asist.estado]?.bg ?? "bg-[#1a1a1a]") + " " + (ESTADO_MAP[asist.estado]?.color ?? "text-gray-400") : "bg-[#1a1a1a] text-gray-600"
                        }`}>
                        <option value="">--</option>
                        {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                      </select>
                    )}
                    {diaSemana === 6 && dias[dia-1+1] && <>{/* no rompemos grid */}</>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leyenda */}
          <div className="flex flex-wrap gap-3">
            {ESTADOS.map(e => (
              <div key={e.value} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${e.bg}`} />
                <span className="text-[10px] text-gray-500">{e.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
