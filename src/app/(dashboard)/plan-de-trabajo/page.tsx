"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const AREA_LABELS: Record<string, string> = {
  DIRECCION:     "Dirección",
  ADMINISTRACION:"Administración",
  MARKETING:     "Marketing",
  VENTAS:        "Ventas",
  PRODUCCION:    "Producción",
};

const FRECUENCIA_LABELS: Record<string, string> = {
  DIARIO:         "Diario",
  LUNES_JUEVES:   "Lun y Jue",
  SEMANAL:        "Semanal",
  POR_EVENTO:     "Post-evento",
  MENSUAL:        "Mensual",
  TRIMESTRAL:     "Trimestral",
  SEMESTRAL:      "Semestral",
  SEGUN_NECESIDAD:"Según necesidad",
};

type Actividad = {
  id: string;
  area: string;
  titulo: string;
  descripcion: string | null;
  frecuencia: string;
  diasSemana: string | null;
  horaEspecifica: string | null;
  entregable: string;
  kpiVinculado: string | null;
  activa: boolean;
  generarTareas: boolean;
  responsable: { id: string; name: string };
};

type User = { id: string; name: string; area: string | null };

function FrecuenciaLabel({ actividad }: { actividad: Actividad }) {
  const dias = actividad.diasSemana ? (JSON.parse(actividad.diasSemana) as string[]).join(", ") : null;
  const label = FRECUENCIA_LABELS[actividad.frecuencia] ?? actividad.frecuencia;
  return (
    <span className="text-xs text-[#555]">
      {label}{dias ? ` (${dias})` : ""}{actividad.horaEspecifica ? ` · ${actividad.horaEspecifica}` : ""}
    </span>
  );
}

function ModalActividad({
  actividad, users, areaFiltro, onSave, onClose,
}: {
  actividad: Actividad | null;
  users: User[];
  areaFiltro: string;
  onSave: (a: Actividad) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    area:           actividad?.area          ?? areaFiltro,
    responsableId:  actividad?.responsable.id ?? "",
    titulo:         actividad?.titulo         ?? "",
    descripcion:    actividad?.descripcion    ?? "",
    frecuencia:     actividad?.frecuencia     ?? "SEMANAL",
    diasSemana:     actividad?.diasSemana ? (JSON.parse(actividad.diasSemana) as string[]) : [] as string[],
    horaEspecifica: actividad?.horaEspecifica ?? "",
    entregable:     actividad?.entregable     ?? "",
    kpiVinculado:   actividad?.kpiVinculado   ?? "",
    generarTareas:  actividad?.generarTareas  ?? true,
  });
  const [saving, setSaving] = useState(false);

  const DIAS = ["lunes","martes","miercoles","jueves","viernes"];

  async function handleSave() {
    if (!form.titulo || !form.entregable || !form.responsableId) return;
    setSaving(true);
    const method = actividad ? "PATCH" : "POST";
    const url    = actividad ? `/api/plan-trabajo/${actividad.id}` : "/api/plan-trabajo";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        diasSemana: form.diasSemana.length > 0 ? form.diasSemana : null,
        horaEspecifica: form.horaEspecifica || null,
        descripcion: form.descripcion || null,
        kpiVinculado: form.kpiVinculado || null,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      onSave(d.actividad);
    }
    setSaving(false);
  }

  function toggleDia(dia: string) {
    setForm(f => ({
      ...f,
      diasSemana: f.diasSemana.includes(dia)
        ? f.diasSemana.filter(d => d !== dia)
        : [...f.diasSemana, dia],
    }));
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-white font-semibold">{actividad ? "Editar actividad" : "Nueva actividad"}</h2>

        <div className="space-y-3">
          {/* Área */}
          <div>
            <label className="text-[11px] text-[#555] uppercase tracking-wider">Área</label>
            <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
              className="w-full mt-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white">
              {Object.entries(AREA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {/* Responsable */}
          <div>
            <label className="text-[11px] text-[#555] uppercase tracking-wider">Responsable</label>
            <select value={form.responsableId} onChange={e => setForm(f => ({ ...f, responsableId: e.target.value }))}
              className="w-full mt-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white">
              <option value="">Seleccionar...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          {/* Título */}
          <div>
            <label className="text-[11px] text-[#555] uppercase tracking-wider">Título *</label>
            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Nombre de la responsabilidad"
              className="w-full mt-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333]" />
          </div>

          {/* Entregable */}
          <div>
            <label className="text-[11px] text-[#555] uppercase tracking-wider">Entregable *</label>
            <input value={form.entregable} onChange={e => setForm(f => ({ ...f, entregable: e.target.value }))}
              placeholder="Qué produce esta actividad"
              className="w-full mt-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333]" />
          </div>

          {/* Frecuencia */}
          <div>
            <label className="text-[11px] text-[#555] uppercase tracking-wider">Frecuencia *</label>
            <select value={form.frecuencia} onChange={e => setForm(f => ({ ...f, frecuencia: e.target.value }))}
              className="w-full mt-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white">
              {Object.entries(FRECUENCIA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {/* Días específicos */}
          {["SEMANAL", "LUNES_JUEVES"].includes(form.frecuencia) && (
            <div>
              <label className="text-[11px] text-[#555] uppercase tracking-wider">Días</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {DIAS.map(d => (
                  <button key={d} onClick={() => toggleDia(d)}
                    className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                      form.diasSemana.includes(d)
                        ? "bg-[#B3985B] text-black font-medium"
                        : "bg-[#1a1a1a] text-[#666] hover:text-white"
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hora específica */}
          <div>
            <label className="text-[11px] text-[#555] uppercase tracking-wider">Hora de vencimiento (opcional)</label>
            <input type="time" value={form.horaEspecifica} onChange={e => setForm(f => ({ ...f, horaEspecifica: e.target.value }))}
              className="mt-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white" />
          </div>

          {/* KPI */}
          <div>
            <label className="text-[11px] text-[#555] uppercase tracking-wider">KPI vinculado (opcional)</label>
            <input value={form.kpiVinculado} onChange={e => setForm(f => ({ ...f, kpiVinculado: e.target.value }))}
              placeholder="KPI del SO v2.0"
              className="w-full mt-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333]" />
          </div>

          {/* Generar tareas */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.generarTareas} onChange={e => setForm(f => ({ ...f, generarTareas: e.target.checked }))}
              className="w-4 h-4 accent-[#B3985B]" />
            <span className="text-sm text-[#aaa]">Generar tareas automáticamente (cron diario)</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#555] hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.titulo || !form.entregable || !form.responsableId}
            className="px-4 py-2 bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold rounded-lg transition-colors disabled:opacity-40">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlanDeTrabajoPage() {
  const router = useRouter();
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [users, setUsers]             = useState<User[]>([]);
  const [loading, setLoading]         = useState(true);
  const [areaFiltro, setAreaFiltro]   = useState("TODOS");
  const [editando, setEditando]       = useState<Actividad | null | "nueva">(null);
  const [areaModal, setAreaModal]     = useState("DIRECCION");
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/plan-trabajo").then(r => r.json()),
      fetch("/api/usuarios").then(r => r.json()).catch(() => ({ users: [] })),
    ]).then(([d, u]) => {
      setActividades(d.actividades ?? []);
      setUsers(u.users ?? []);
      setLoading(false);
    });
  }, []);

  const filtradas = areaFiltro === "TODOS"
    ? actividades
    : actividades.filter(a => a.area === areaFiltro);

  const porArea: Record<string, Actividad[]> = {};
  for (const a of filtradas) {
    if (!porArea[a.area]) porArea[a.area] = [];
    porArea[a.area].push(a);
  }

  function handleSave(saved: Actividad) {
    setActividades(prev => {
      const idx = prev.findIndex(a => a.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setEditando(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/plan-trabajo/${id}`, { method: "DELETE" });
    setActividades(prev => prev.filter(a => a.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Operaciones</p>
          <h1 className="text-white text-2xl font-bold">Plan de trabajo</h1>
          <p className="text-[#555] text-sm mt-1">Responsabilidades fijas por rol — basado en el SO v2.0</p>
        </div>
        <button
          onClick={() => { setAreaModal(areaFiltro === "TODOS" ? "DIRECCION" : areaFiltro); setEditando("nueva"); }}
          className="shrink-0 bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Agregar actividad
        </button>
      </div>

      {/* Filtro áreas */}
      <div className="flex gap-2 flex-wrap">
        {["TODOS", ...Object.keys(AREA_LABELS)].map(k => (
          <button key={k} onClick={() => setAreaFiltro(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              areaFiltro === k
                ? "bg-[#B3985B] text-black"
                : "bg-[#111] border border-[#1a1a1a] text-[#666] hover:text-white"
            }`}>
            {k === "TODOS" ? "Todas las áreas" : AREA_LABELS[k]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[#444] text-sm">Cargando...</p>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#333] text-sm">Sin actividades registradas</p>
          <p className="text-[#222] text-xs mt-1">Agrega las responsabilidades del SO v2.0</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(porArea).map(([area, actvs]) => (
            <div key={area} className="bg-[#111] border border-[#1a1a1a] rounded-2xl overflow-hidden">
              {/* Header área */}
              <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">{AREA_LABELS[area] ?? area}</p>
                  <p className="text-[#555] text-xs">{actvs[0]?.responsable.name} · {actvs.length} actividad{actvs.length !== 1 ? "es" : ""}</p>
                </div>
                <button
                  onClick={() => { setAreaModal(area); setEditando("nueva"); }}
                  className="text-xs text-[#B3985B] hover:underline">
                  + Agregar
                </button>
              </div>

              {/* Tabla */}
              <div className="divide-y divide-[#0f0f0f]">
                {/* Cabecera */}
                <div className="grid grid-cols-[1fr_140px_1fr] gap-4 px-5 py-2">
                  <p className="text-[10px] text-[#333] uppercase tracking-wider">Actividad</p>
                  <p className="text-[10px] text-[#333] uppercase tracking-wider">Frecuencia</p>
                  <p className="text-[10px] text-[#333] uppercase tracking-wider">Entregable</p>
                </div>

                {actvs.map(a => (
                  <div key={a.id} className="group grid grid-cols-[1fr_140px_1fr] gap-4 px-5 py-3 hover:bg-[#0d0d0d] items-start">
                    <div className="min-w-0">
                      <p className="text-sm text-white leading-snug">{a.titulo}</p>
                      {a.kpiVinculado && (
                        <p className="text-[11px] text-[#444] mt-0.5 truncate" title={a.kpiVinculado}>KPI: {a.kpiVinculado}</p>
                      )}
                      {!a.generarTareas && (
                        <span className="text-[9px] text-[#555] bg-[#1a1a1a] px-1.5 py-0.5 rounded mt-0.5 inline-block">Sin auto-tarea</span>
                      )}
                    </div>
                    <FrecuenciaLabel actividad={a} />
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-[#666] leading-snug flex-1">{a.entregable}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => setEditando(a)} className="text-[#444] hover:text-[#B3985B] transition-colors p-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          disabled={deletingId === a.id}
                          className="text-[#444] hover:text-red-400 transition-colors p-1 disabled:opacity-40">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {editando !== null && (
        <ModalActividad
          actividad={editando === "nueva" ? null : editando}
          users={users}
          areaFiltro={areaModal}
          onSave={handleSave}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}
