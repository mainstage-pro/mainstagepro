"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";

type Personal = { id: string; nombre: string; puesto: string };
type Participante = { id: string; personalId: string; asistio: boolean; calificacion?: number | null; personal: Personal };

type Capacitacion = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  area: string;
  tipo: string;
  modalidad: string;
  fechaInicio: string;
  fechaFin?: string | null;
  duracionHrs?: number | null;
  instructor?: string | null;
  material?: string | null;
  estado: string;
  obligatoria: boolean;
  participantes: Participante[];
};

const TIPO_LABEL: Record<string, string> = {
  TECNICA: "Técnica", SEGURIDAD: "Seguridad", PROCEDIMIENTOS: "Procedimientos",
  DESARROLLO: "Desarrollo", INDUCCION: "Inducción",
};
const MODALIDAD_LABEL: Record<string, string> = {
  PRESENCIAL: "Presencial", VIRTUAL: "Virtual", AUTOAPRENDIZAJE: "Autoaprendizaje",
};
const ESTADO_COLORS: Record<string, string> = {
  PROGRAMADA: "text-blue-400 bg-blue-900/20",
  EN_CURSO: "text-yellow-400 bg-yellow-900/20",
  COMPLETADA: "text-green-400 bg-green-900/20",
  CANCELADA: "text-[#444] bg-[#1a1a1a]",
};
const AREA_LABEL: Record<string, string> = {
  GENERAL: "General", BODEGA: "Bodega", COORDINACION: "Coordinación",
  PRODUCCION: "Producción", ADMINISTRACION: "Administración", VENTAS: "Ventas", MARKETING: "Marketing",
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

const FORM_DEFAULT = {
  titulo: "", descripcion: "", area: "GENERAL", tipo: "TECNICA", modalidad: "PRESENCIAL",
  fechaInicio: "", fechaFin: "", duracionHrs: "", instructor: "", material: "",
  estado: "PROGRAMADA", obligatoria: false, participanteIds: [] as string[],
};

export default function CapacitacionesPage() {
  const toast = useToast();
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const estado = filtroEstado !== "todos" ? `?estado=${filtroEstado}` : "";
    const r = await fetch(`/api/rrhh/capacitaciones${estado}`);
    const d = await r.json();
    setCapacitaciones(d.capacitaciones ?? []);
    setLoading(false);
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    fetch("/api/rrhh/personal").then(r => r.json()).then(d =>
      setPersonal((d.personal ?? []).filter((p: Personal & { activo?: boolean }) => p.activo !== false))
    );
  }, []);

  const crear = async () => {
    setSaving(true);
    const r = await fetch("/api/rrhh/capacitaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        duracionHrs: form.duracionHrs ? Number(form.duracionHrs) : null,
        fechaFin: form.fechaFin || null,
      }),
    });
    if (r.ok) {
      toast.success("Capacitación creada");
      setShowForm(false);
      setForm(FORM_DEFAULT);
      await cargar();
    } else {
      toast.error("Error al crear");
    }
    setSaving(false);
  };

  const cambiarEstado = async (id: string, estado: string) => {
    const r = await fetch(`/api/rrhh/capacitaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (r.ok) await cargar();
  };

  const marcarAsistencia = async (capacitacionId: string, personalId: string, asistio: boolean) => {
    await fetch(`/api/rrhh/capacitaciones/${capacitacionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalId, asistio }),
    });
    await cargar();
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta capacitación?")) return;
    const r = await fetch(`/api/rrhh/capacitaciones/${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Eliminada"); await cargar(); }
  };

  const filtradas = capacitaciones;
  const programadas = capacitaciones.filter(c => c.estado === "PROGRAMADA").length;
  const enCurso = capacitaciones.filter(c => c.estado === "EN_CURSO").length;
  const completadas = capacitaciones.filter(c => c.estado === "COMPLETADA").length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">RR.HH. · Capacitaciones</p>
          <h1 className="text-white text-2xl font-bold">Ciclo de Capacitaciones</h1>
          <p className="text-[#555] text-sm mt-1">Programación y seguimiento de formación del equipo</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="shrink-0 bg-[#B3985B] hover:bg-[#c9aa6a] text-black text-sm font-semibold px-4 py-2 rounded-xl mt-1"
        >
          + Nueva capacitación
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-blue-400">{programadas}</p>
          <p className="text-[#555] text-xs mt-0.5">Programadas</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-yellow-400">{enCurso}</p>
          <p className="text-[#555] text-xs mt-0.5">En curso</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-green-400">{completadas}</p>
          <p className="text-[#555] text-xs mt-0.5">Completadas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {["todos", "PROGRAMADA", "EN_CURSO", "COMPLETADA"].map(e => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filtroEstado === e ? "bg-[#B3985B] text-black" : "bg-[#111] border border-[#1e1e1e] text-[#555] hover:text-white"
            }`}
          >
            {e === "todos" ? "Todas" : e === "PROGRAMADA" ? "Programadas" : e === "EN_CURSO" ? "En curso" : "Completadas"}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-[#444] text-sm">Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-12 text-[#444]">
          <p className="text-sm mb-2">Sin capacitaciones registradas</p>
          <button onClick={() => setShowForm(true)} className="text-[#B3985B] text-xs hover:underline">Crear la primera →</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(c => {
            const asistieron = c.participantes.filter(p => p.asistio).length;
            return (
              <div key={c.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div
                  className="flex items-start gap-3 px-4 py-4 cursor-pointer hover:bg-[#141414] transition-colors"
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white text-sm font-semibold truncate">{c.titulo}</p>
                      {c.obligatoria && <span className="text-[9px] font-bold text-orange-400 bg-orange-900/20 px-1.5 py-0.5 rounded shrink-0">OBLIGATORIA</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#555]">
                      <span>{fmtDate(c.fechaInicio)}</span>
                      <span>{TIPO_LABEL[c.tipo] ?? c.tipo}</span>
                      <span>{MODALIDAD_LABEL[c.modalidad] ?? c.modalidad}</span>
                      <span>{AREA_LABEL[c.area] ?? c.area}</span>
                      {c.duracionHrs && <span>{c.duracionHrs}h</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {c.participantes.length > 0 && (
                      <span className="text-xs text-[#555]">{asistieron}/{c.participantes.length}</span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ESTADO_COLORS[c.estado] ?? "text-[#444]"}`}>
                      {c.estado}
                    </span>
                  </div>
                </div>

                {expandedId === c.id && (
                  <div className="border-t border-[#1a1a1a] px-4 pb-4 pt-3 space-y-4">
                    {c.descripcion && <p className="text-[#777] text-sm">{c.descripcion}</p>}
                    {c.instructor && <p className="text-xs text-[#555]">Instructor: <span className="text-white">{c.instructor}</span></p>}

                    {/* Participantes */}
                    {c.participantes.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-[#555] uppercase tracking-wider mb-2">Participantes</p>
                        <div className="space-y-1.5">
                          {c.participantes.map(p => (
                            <div key={p.id} className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-white text-xs">{p.personal.nombre}</p>
                                <p className="text-[#444] text-[10px]">{p.personal.puesto}</p>
                              </div>
                              <button
                                onClick={() => marcarAsistencia(c.id, p.personalId, !p.asistio)}
                                className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${
                                  p.asistio
                                    ? "bg-green-900/30 text-green-400 hover:bg-red-900/30 hover:text-red-400"
                                    : "bg-[#1a1a1a] text-[#555] hover:bg-green-900/30 hover:text-green-400"
                                }`}
                              >
                                {p.asistio ? "Asistió ✓" : "No asistió"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex items-center gap-4 flex-wrap pt-1">
                      {c.estado === "PROGRAMADA" && (
                        <button onClick={() => cambiarEstado(c.id, "EN_CURSO")}
                          className="text-xs text-[#B3985B] hover:underline">Iniciar →</button>
                      )}
                      {c.estado === "EN_CURSO" && (
                        <button onClick={() => cambiarEstado(c.id, "COMPLETADA")}
                          className="text-xs text-green-400 hover:underline">Marcar completada ✓</button>
                      )}
                      <button onClick={() => eliminar(c.id)} className="text-xs text-[#333] hover:text-red-400">Eliminar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nueva capacitación */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
              <h2 className="text-white font-bold">Nueva capacitación</h2>
              <button onClick={() => setShowForm(false)} className="text-[#555] hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] text-[#555] uppercase tracking-wider mb-1">Título *</label>
                <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                  className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50"
                  placeholder="Nombre de la capacitación" />
              </div>

              <div>
                <label className="block text-[11px] text-[#555] uppercase tracking-wider mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  rows={2} placeholder="Objetivos, contenido..."
                  className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#333] focus:outline-none resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#555] uppercase tracking-wider mb-1">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                    {Object.entries(TIPO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#555] uppercase tracking-wider mb-1">Modalidad</label>
                  <select value={form.modalidad} onChange={e => setForm(p => ({ ...p, modalidad: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                    {Object.entries(MODALIDAD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#555] uppercase tracking-wider mb-1">Área</label>
                  <select value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                    {Object.entries(AREA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#555] uppercase tracking-wider mb-1">Duración (horas)</label>
                  <input type="number" value={form.duracionHrs} onChange={e => setForm(p => ({ ...p, duracionHrs: e.target.value }))}
                    placeholder="2.5"
                    className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#333] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] text-[#555] uppercase tracking-wider mb-1">Fecha inicio *</label>
                  <input type="date" value={form.fechaInicio} onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] text-[#555] uppercase tracking-wider mb-1">Fecha fin</label>
                  <input type="date" value={form.fechaFin} onChange={e => setForm(p => ({ ...p, fechaFin: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#555] uppercase tracking-wider mb-1">Instructor</label>
                <input value={form.instructor} onChange={e => setForm(p => ({ ...p, instructor: e.target.value }))}
                  placeholder="Nombre del instructor"
                  className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#333] focus:outline-none" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.obligatoria}
                  onChange={e => setForm(p => ({ ...p, obligatoria: e.target.checked }))}
                  className="w-4 h-4 accent-[#B3985B]" />
                <span className="text-sm text-white">Capacitación obligatoria</span>
              </label>

              {/* Participantes */}
              {personal.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11px] text-[#555] uppercase tracking-wider">Participantes</label>
                    <button
                      onClick={() => setForm(p => ({ ...p, participanteIds: personal.map(x => x.id) }))}
                      className="text-[10px] text-[#B3985B] hover:underline"
                    >
                      Todos
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {personal.map(p => (
                      <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-[#141414]">
                        <input type="checkbox"
                          checked={form.participanteIds.includes(p.id)}
                          onChange={e => setForm(prev => ({
                            ...prev,
                            participanteIds: e.target.checked
                              ? [...prev.participanteIds, p.id]
                              : prev.participanteIds.filter(id => id !== p.id)
                          }))}
                          className="w-3.5 h-3.5 accent-[#B3985B]" />
                        <span className="text-sm text-white">{p.nombre}</span>
                        <span className="text-[#444] text-xs">{p.puesto}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-[#1e1e1e] flex items-center justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="text-[#555] text-sm">Cancelar</button>
              <button
                onClick={crear}
                disabled={saving || !form.titulo || !form.fechaInicio}
                className="bg-[#B3985B] hover:bg-[#c9aa6a] disabled:opacity-40 text-black text-sm font-semibold px-5 py-2 rounded-xl"
              >
                {saving ? "Guardando..." : "Crear capacitación"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
