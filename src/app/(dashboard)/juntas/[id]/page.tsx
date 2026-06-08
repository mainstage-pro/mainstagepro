"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AREA_LABELS, AREA_COLORS, TIPO_AGENDA_LABELS, TIPO_AGENDA_COLORS, type AreaJunta, type TipoAgenda } from "@/lib/junta-templates";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgendaItem = {
  id: string; orden: number; tipo: string; titulo: string;
  descripcion: string | null; placeholder: string | null;
  respuesta: string | null; completado: boolean;
};

type TemaAdicional = {
  id: string; titulo: string; descripcion: string | null;
  cubierto: boolean; notas: string | null;
  pasadoSiguienteSemana: boolean; agregadoEnJunta: boolean;
  autor: { id: string; name: string };
};

type TareaJunta = {
  id: string; titulo: string; descripcion: string | null;
  prioridad: string; estado: string; fechaVencimiento: string | null;
  asignadoA: { id: string; name: string } | null;
  proyectoTarea: { id: string; nombre: string } | null;
};

type TareaPendiente = {
  id: string; titulo: string; prioridad: string; estado: string;
  fecha: string | null; fechaVencimiento: string | null;
  asignadoA: { id: string; name: string } | null;
};

type Junta = {
  id: string; titulo: string; area: string; tipo: string;
  fecha: string; duracionMin: number; estado: string;
  notas: string | null; resumen: string | null;
  facilitador: { id: string; name: string };
  agendaItems: AgendaItem[];
  participantes: { user: { id: string; name: string } }[];
  tareas: TareaJunta[];
  temasAdicionales: TemaAdicional[];
};

type EventoProximo = {
  id: string; tipo: "CONFIRMADO" | "EN_PROCESO" | "SIN_CERRAR";
  nombre: string; fecha: string; lugar: string | null;
  cliente: string | null; responsable: string | null;
  etapaActual?: string; urgente: boolean; linkHref: string;
};

type ProyectoAgenda = {
  id: string;
  nombre: string;
  estado: string;
  numeroProyecto?: string | null;
  fechaEvento: string | null;
  lugarEvento: string | null;
  cliente: { nombre: string; empresa: string | null } | null;
  sinProyecto?: boolean;
};

type Usuario = { id: string; name: string; area: string | null };
type Proyecto = { id: string; nombre: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function fmtFechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}
function fmtVenc(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso); const hoy = new Date(); hoy.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - hoy.getTime()) / 86400000);
  if (diff < 0)  return { label: `Hace ${Math.abs(diff)}d`, cls: "text-red-400" };
  if (diff === 0) return { label: "Hoy",    cls: "text-emerald-400" };
  if (diff === 1) return { label: "Mañana", cls: "text-yellow-400" };
  return { label: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }), cls: "text-gray-500" };
}

const PRIO_COLOR: Record<string, string> = {
  URGENTE: "text-red-400", ALTA: "text-orange-400", MEDIA: "text-[#B3985B]", BAJA: "text-gray-500",
};

// ─── parseRespuesta helper ────────────────────────────────────────────────────

function parseRespuesta(tipo: string, respuesta: string | null) {
  if (!respuesta) return null;
  try {
    if (tipo === "RECONOCIMIENTO") {
      return JSON.parse(respuesta);
    }
  } catch {}
  return respuesta;
}

// ─── Modal Agregar Tarea ──────────────────────────────────────────────────────

function ModalAgregarTarea({ junta, usuarios, proyectos, onClose, onCreated }: {
  junta: Junta; usuarios: Usuario[]; proyectos: Proyecto[];
  onClose: () => void; onCreated: (t: TareaJunta) => void;
}) {
  const [titulo, setTitulo]       = useState("");
  const [desc, setDesc]           = useState("");
  const [prioridad, setPrioridad] = useState("ALTA");
  const [asignadoId, setAsignadoId] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [proyectoId, setProyectoId]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    const areaMap: Record<string, string> = {
      ADMINISTRACION: "administración", MARKETING: "marketing",
      VENTAS: "ventas", PRODUCCION: "producción", DIRECCION: "dirección",
    };
    const keyword = areaMap[junta.area];
    if (keyword) {
      const match = proyectos.find((p) => p.nombre.toLowerCase().includes(keyword));
      if (match) setProyectoId(match.id);
    }
  }, [junta.area, proyectos]);

  async function handleSave() {
    if (!titulo.trim()) { setError("El título es requerido"); return; }
    setSaving(true);
    const res = await fetch(`/api/juntas/${junta.id}/tareas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: titulo.trim(), descripcion: desc || null, prioridad,
        asignadoAId: asignadoId || null, fechaVencimiento: vencimiento || null,
        proyectoTareaId: proyectoId || null,
      }),
    });
    setSaving(false);
    if (res.ok) { const { tarea } = await res.json(); onCreated(tarea); }
    else setError("Error al crear la tarea");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
          <p className="text-white font-semibold text-sm">Agregar tarea desde junta</p>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Título *</label>
            <input autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="¿Qué hay que hacer?"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Descripción / contexto</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
              placeholder="Contexto o detalle adicional"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#B3985B] resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Prioridad", el: <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                  <option value="URGENTE">Urgente</option><option value="ALTA">Alta</option>
                  <option value="MEDIA">Media</option><option value="BAJA">Baja</option>
                </select> },
              { label: "Asignado a", el: <select value={asignadoId} onChange={(e) => setAsignadoId(e.target.value)} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                  <option value="">— Sin asignar —</option>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select> },
              { label: "Fecha", el: <input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" /> },
            ].map(({ label, el }) => (
              <div key={label}><label className="text-xs text-gray-400 block mb-1">{label}</label>{el}</div>
            ))}
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Proyecto en Gestión Operativa</label>
            <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
              <option value="">— Sin proyecto —</option>
              {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm hover:border-[#444] transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-50 transition-colors">
              {saving ? "Agregando..." : "Agregar tarea"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Agenda Item ──────────────────────────────────────────────────────────────

function ItemAgenda({ item, juntaId, onUpdate }: {
  item: AgendaItem;
  juntaId: string;
  onUpdate: (id: string, changes: Partial<AgendaItem>) => void;
}) {
  const [expanded, setExpanded]     = useState(true);
  const [respuesta, setRespuesta]   = useState(item.respuesta ?? "");
  const [completado, setCompletado] = useState(item.completado);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tipoColor = TIPO_AGENDA_COLORS[item.tipo as TipoAgenda] ?? "text-gray-500";
  const tipoLabel = TIPO_AGENDA_LABELS[item.tipo as TipoAgenda] ?? item.tipo;

  // For PRIORIDADES_SEMANA and RECONOCIMIENTO — structured state
  const parsedInitial = parseRespuesta(item.tipo, item.respuesta);
  const [structured, setStructured] = useState<Record<string, string>>(
    typeof parsedInitial === "object" && parsedInitial !== null && !Array.isArray(parsedInitial)
      ? (parsedInitial as Record<string, string>)
      : {}
  );

  // Proyectos for EVENTOS_SEMANA and PRIORIDADES_SEMANA
  const [proyectosAgenda, setProyectosAgenda] = useState<{ proximos: ProyectoAgenda[]; recientes: ProyectoAgenda[] } | null>(null);

  useEffect(() => {
    if ((item.tipo === "EVENTOS_SEMANA" || item.tipo === "PRIORIDADES_SEMANA") && expanded && !proyectosAgenda) {
      fetch("/api/proyectos/agenda")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setProyectosAgenda(d); })
        .catch(() => {});
    }
  }, [item.tipo, expanded, proyectosAgenda]);

  function handleRespuestaChange(val: string) {
    setRespuesta(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { onUpdate(item.id, { respuesta: val }); }, 800);
  }

  function handleToggleCompletado() {
    const next = !completado;
    setCompletado(next);
    if (next) setExpanded(false);
    onUpdate(item.id, { completado: next });
  }

  function saveStructured(next: Record<string, string>) {
    setStructured(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/juntas/${juntaId}/agenda/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respuesta: JSON.stringify(next) }),
      });
      onUpdate(item.id, { respuesta: JSON.stringify(next) });
    }, 800);
  }

  function updateStructuredField(field: string, val: string) {
    const next = { ...structured, [field]: val };
    saveStructured(next);
  }

  const inputCls = "w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50 transition-colors";
  const textareaCls = `${inputCls} resize-none`;

  function renderBody() {
    switch (item.tipo) {
      case "APERTURA":
      case "CIERRE":
        return (
          <textarea
            value={respuesta}
            onChange={(e) => handleRespuestaChange(e.target.value)}
            rows={2}
            placeholder={item.placeholder ?? "Escribe aquí..."}
            className={textareaCls}
          />
        );

      case "AVISO":
        return (
          <textarea
            value={respuesta}
            onChange={(e) => handleRespuestaChange(e.target.value)}
            rows={4}
            placeholder={item.placeholder ?? "Escribe las notas de este punto..."}
            className={textareaCls}
          />
        );

      case "EVENTOS_SEMANA":
        return (
          <div className="space-y-3">
            {/* Read-only recent events list */}
            <div className="border border-[#1a1a1a] rounded-lg overflow-hidden">
              {!proyectosAgenda ? (
                <div className="p-3 space-y-2">
                  {[1,2,3].map((i) => <div key={i} className="h-8 bg-[#111] rounded animate-pulse" />)}
                </div>
              ) : proyectosAgenda.recientes.length === 0 ? (
                <p className="text-gray-600 text-[11px] text-center py-4">Sin eventos cerrados esta semana</p>
              ) : (
                proyectosAgenda.recientes.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2 border-b border-[#1a1a1a] last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">{p.nombre}</p>
                      {p.lugarEvento && <p className="text-[10px] text-gray-600 truncate">{p.lugarEvento}</p>}
                    </div>
                    <p className="text-[10px] text-gray-600 shrink-0">
                      {p.fechaEvento ? new Date(p.fechaEvento).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
            {/* Notes textarea */}
            <textarea
              value={respuesta}
              onChange={(e) => handleRespuestaChange(e.target.value)}
              rows={3}
              placeholder={item.placeholder ?? "Notas sobre eventos de la semana..."}
              className={textareaCls}
            />
          </div>
        );

      case "PRIORIDADES_SEMANA": {
        return (
          <div className="space-y-3">
            {/* Próximos eventos */}
            {proyectosAgenda?.proximos && proyectosAgenda.proximos.length > 0 && (
              <div>
                <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Eventos próximos</p>
                <div className="space-y-1.5">
                  {proyectosAgenda.proximos.slice(0, 6).map((p) => (
                    <div key={p.id} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs leading-snug">{p.nombre}</p>
                        {p.cliente && (
                          <p className="text-gray-500 text-[10px]">{p.cliente.nombre}{p.cliente.empresa ? ` · ${p.cliente.empresa}` : ''}</p>
                        )}
                        <p className="text-[#C9A84C] text-[10px]">
                          {new Date(p.fechaEvento!).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Mexico_City' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {proyectosAgenda?.proximos?.length === 0 && (
              <p className="text-gray-600 text-xs">Sin eventos próximos</p>
            )}
            {/* Notas */}
            <textarea
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-700 resize-none focus:outline-none focus:border-[#C9A84C]/40"
              rows={3}
              placeholder={item.placeholder ?? 'Notas sobre eventos próximos:'}
              value={respuesta}
              onChange={(e) => handleRespuestaChange(e.target.value)}
            />
          </div>
        );
      }

      case "RECONOCIMIENTO":
        return (
          <div className="space-y-2">
            <input
              placeholder="Reconocimiento 1 — Nombre + logro"
              value={structured.rec1 ?? ""}
              onChange={(e) => updateStructuredField("rec1", e.target.value)}
              className={inputCls}
            />
            <input
              placeholder="Reconocimiento 2 — Nombre + logro"
              value={structured.rec2 ?? ""}
              onChange={(e) => updateStructuredField("rec2", e.target.value)}
              className={inputCls}
            />
          </div>
        );

      default:
        return (
          <textarea
            value={respuesta}
            onChange={(e) => handleRespuestaChange(e.target.value)}
            rows={4}
            placeholder={item.placeholder ?? "Escribe las notas de este punto..."}
            className={textareaCls}
          />
        );
    }
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${completado ? "border-[#1a1a1a] bg-[#0a0a0a]" : "border-[#222] bg-[#111]"}`}>
      <div className="flex items-start gap-3 px-4 py-3 cursor-pointer select-none" onClick={() => setExpanded((v) => !v)}>
        <button onClick={(e) => { e.stopPropagation(); handleToggleCompletado(); }}
          className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${completado ? "bg-green-500 border-green-500" : "border-[#333] hover:border-[#B3985B]"}`}>
          {completado && <span className="text-white text-[10px] leading-none">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${tipoColor}`}>{tipoLabel}</span>
            <span className="text-gray-700 text-[9px]">·</span>
            <span className="text-gray-600 text-[9px]">{item.orden}</span>
          </div>
          <p className={`text-sm font-medium ${completado ? "text-gray-600 line-through" : "text-white"}`}>{item.titulo}</p>
          {item.descripcion && !expanded && (
            <p className="text-[11px] text-gray-600 mt-0.5 truncate">{item.descripcion}</p>
          )}
        </div>
        <span className="text-gray-600 text-sm mt-0.5">{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#1a1a1a]">
          {item.descripcion && <p className="text-xs text-gray-500 pt-3 pb-2">{item.descripcion}</p>}
          {renderBody()}
        </div>
      )}
    </div>
  );
}

// ─── Sección de Temas Adicionales ────────────────────────────────────────────

function SeccionTemasAdicionales({ juntaId, temas, esCerrada, onTemasChange }: {
  juntaId: string;
  temas: TemaAdicional[];
  esCerrada: boolean;
  onTemasChange: (temas: TemaAdicional[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaDesc, setNuevaDesc]     = useState("");
  const [saving, setSaving] = useState(false);

  async function agregarTema() {
    if (!nuevoTitulo.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/juntas/${juntaId}/temas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: nuevoTitulo.trim(), descripcion: nuevaDesc || null, agregadoEnJunta: true }),
    });
    setSaving(false);
    if (res.ok) {
      const { tema } = await res.json();
      onTemasChange([...temas, tema]);
      setNuevoTitulo(""); setNuevaDesc(""); setShowForm(false);
    }
  }

  async function toggleCubierto(tema: TemaAdicional) {
    const next = !tema.cubierto;
    const res = await fetch(`/api/juntas/${juntaId}/temas/${tema.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cubierto: next }),
    });
    if (res.ok) {
      onTemasChange(temas.map((t) => t.id === tema.id ? { ...t, cubierto: next } : t));
    }
  }

  async function togglePasar(tema: TemaAdicional) {
    const next = !tema.pasadoSiguienteSemana;
    const res = await fetch(`/api/juntas/${juntaId}/temas/${tema.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pasadoSiguienteSemana: next }),
    });
    if (res.ok) {
      onTemasChange(temas.map((t) => t.id === tema.id ? { ...t, pasadoSiguienteSemana: next } : t));
    }
  }

  async function eliminarTema(id: string) {
    await fetch(`/api/juntas/${juntaId}/temas/${id}`, { method: "DELETE" });
    onTemasChange(temas.filter((t) => t.id !== id));
  }

  return (
    <div className="border border-[#222] rounded-xl overflow-hidden mt-4">
      <div className="px-4 py-3 bg-[#111] border-b border-[#1a1a1a] flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Temas adicionales esta semana</p>
          {temas.length > 0 && (
            <p className="text-[10px] text-gray-600 mt-0.5">
              {temas.filter((t) => t.cubierto).length}/{temas.length} cubiertos
            </p>
          )}
        </div>
        {!esCerrada && (
          <button onClick={() => setShowForm((v) => !v)}
            className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 px-2.5 py-1 rounded-lg hover:border-[#444] hover:text-white transition-colors">
            + Agregar
          </button>
        )}
      </div>

      <div className="bg-[#0d0d0d]">
        {temas.length === 0 && !showForm && (
          <p className="text-gray-700 text-xs text-center py-5">
            {esCerrada ? "Sin temas adicionales en esta junta" : "Sin temas adicionales — agrégalos antes o durante la junta"}
          </p>
        )}

        {temas.map((tema) => (
          <div key={tema.id} className={`px-4 py-3 border-b border-[#1a1a1a] last:border-0 ${tema.cubierto ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-2">
              <button onClick={() => !esCerrada && toggleCubierto(tema)}
                className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${tema.cubierto ? "bg-green-500 border-green-500" : "border-[#333] hover:border-[#B3985B]"}`}>
                {tema.cubierto && <span className="text-white text-[10px]">✓</span>}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm ${tema.cubierto ? "line-through text-gray-600" : "text-white"}`}>{tema.titulo}</p>
                  {tema.agregadoEnJunta && (
                    <span className="text-[9px] text-[#B3985B] border border-[#B3985B]/30 px-1.5 py-0.5 rounded-full">En junta</span>
                  )}
                  {tema.pasadoSiguienteSemana && (
                    <span className="text-[9px] text-blue-400 border border-blue-800/40 px-1.5 py-0.5 rounded-full">→ Siguiente semana</span>
                  )}
                </div>
                {tema.descripcion && <p className="text-[11px] text-gray-600 mt-0.5">{tema.descripcion}</p>}
                <p className="text-[10px] text-gray-700 mt-0.5">{tema.autor.name}</p>
              </div>
              {!esCerrada && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => togglePasar(tema)}
                    title={tema.pasadoSiguienteSemana ? "Quitar de siguiente semana" : "Pasar a siguiente semana"}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${tema.pasadoSiguienteSemana ? "border-blue-800/40 text-blue-400 bg-blue-900/20" : "border-[#2a2a2a] text-gray-600 hover:text-blue-400 hover:border-blue-800/40"}`}>
                    →
                  </button>
                  <button onClick={() => eliminarTema(tema.id)}
                    className="text-[10px] px-2 py-0.5 rounded border border-[#2a2a2a] text-gray-700 hover:text-red-400 hover:border-red-900/40 transition-colors">
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {showForm && (
          <div className="px-4 py-3 border-t border-[#1a1a1a] space-y-2">
            <input autoFocus value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && agregarTema()}
              placeholder="Título del tema *"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#B3985B]" />
            <input value={nuevaDesc} onChange={(e) => setNuevaDesc(e.target.value)}
              placeholder="Descripción / contexto (opcional)"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#B3985B]" />
            <div className="flex gap-2">
              <button onClick={() => { setShowForm(false); setNuevoTitulo(""); setNuevaDesc(""); }}
                className="flex-1 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-500 text-xs hover:border-[#444] transition-colors">Cancelar</button>
              <button onClick={agregarTema} disabled={saving || !nuevoTitulo.trim()}
                className="flex-1 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs hover:bg-[#222] disabled:opacity-40 transition-colors">
                {saving ? "Agregando..." : "Agregar tema"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panel Tareas Pendientes del Área ─────────────────────────────────────────

function PanelTareasPendientes({ proyectos, area }: { proyectos: Proyecto[]; area: string }) {
  const [tareas, setTareas]       = useState<TareaPendiente[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filtro, setFiltro]       = useState<"todas" | "vencidas" | "hoy" | "semana">("vencidas");

  useEffect(() => {
    const areaMap: Record<string, string> = {
      ADMINISTRACION: "administración", MARKETING: "marketing",
      VENTAS: "ventas", PRODUCCION: "producción", DIRECCION: "dirección",
      GLOBAL: "",
    };
    const keyword = areaMap[area] ?? "";
    const proyecto = keyword
      ? proyectos.find((p) => p.nombre.toLowerCase().includes(keyword))
      : null;

    const url = proyecto
      ? `/api/tareas?proyectoId=${proyecto.id}&estado=PENDIENTE&parentId=null`
      : area === "GLOBAL"
        ? `/api/tareas?estado=PENDIENTE&parentId=null`
        : null;

    if (!url) { setLoading(false); return; }

    fetch(url).then((r) => r.json()).then((d) => {
      setTareas(d.tareas ?? []);
      setLoading(false);
    });
  }, [area, proyectos]);

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const en7 = new Date(hoy); en7.setDate(hoy.getDate() + 7);

  const filtradas = tareas.filter((t) => {
    if (filtro === "todas") return true;
    if (!t.fecha && !t.fechaVencimiento) return false;
    const d = new Date((t.fechaVencimiento ?? t.fecha)!);
    if (filtro === "vencidas") return d < hoy;
    if (filtro === "hoy")      return d.getTime() === hoy.getTime();
    if (filtro === "semana")   return d >= hoy && d <= en7;
    return true;
  });

  const vencidasCount = tareas.filter((t) => {
    const d = t.fechaVencimiento ?? t.fecha;
    return d && new Date(d) < hoy;
  }).length;

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2.5 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Pendientes del área</p>
          {vencidasCount > 0 && (
            <span className="text-[9px] font-bold bg-red-900/30 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded-full">
              {vencidasCount} vencidas
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {(["vencidas", "hoy", "semana", "todas"] as const).map((f) => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${filtro === f ? "bg-[#1a1a1a] text-white" : "text-gray-600 hover:text-gray-400"}`}>
              {f === "vencidas" ? "Venc." : f === "semana" ? "Semana" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-gray-700 text-xs text-center py-6">Cargando...</p>
        ) : filtradas.length === 0 ? (
          <p className="text-gray-700 text-xs text-center py-6">
            {filtro === "vencidas" ? "Sin tareas vencidas 🎉" : "Sin tareas en este filtro"}
          </p>
        ) : (
          filtradas.map((t) => {
            const venc = fmtVenc(t.fechaVencimiento ?? t.fecha);
            return (
              <div key={t.id} className="flex items-start gap-2 px-3 py-2.5 border-b border-[#0d0d0d] last:border-0">
                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                  t.prioridad === "URGENTE" ? "bg-red-500" : t.prioridad === "ALTA" ? "bg-orange-400" : "bg-[#333]"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{t.titulo}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {t.asignadoA && <span className="text-[10px] text-gray-600">{t.asignadoA.name}</span>}
                    {venc && <span className={`text-[10px] ${venc.cls}`}>{venc.label}</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Panel Eventos Próximos (solo junta Global) ───────────────────────────────

function PanelEventosGlobal() {
  type EventosData = { estaSemana: EventoProximo[]; siguienteSemana: EventoProximo[] };
  const [data, setData]     = useState<EventosData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/juntas/eventos-proximos").then((r) => r.json()).then((d) => {
      setData(d); setLoading(false);
    });
  }, []);

  const TIPO_CONFIG = {
    CONFIRMADO: { label: "Confirmado", cls: "bg-green-900/30 text-green-400 border-green-800/40" },
    EN_PROCESO:  { label: "En proceso", cls: "bg-yellow-900/30 text-yellow-400 border-yellow-800/40" },
    SIN_CERRAR:  { label: "Sin cerrar", cls: "bg-red-900/30 text-red-400 border-red-800/40" },
  };

  function EventoRow({ e }: { e: EventoProximo }) {
    const cfg = TIPO_CONFIG[e.tipo];
    return (
      <div className={`px-3 py-2.5 border-b border-[#0d0d0d] last:border-0 ${e.urgente && e.tipo !== "CONFIRMADO" ? "bg-red-950/10" : ""}`}>
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${cfg.cls}`}>{cfg.label}</span>
              {e.urgente && e.tipo !== "CONFIRMADO" && (
                <span className="text-[9px] font-bold text-red-400">URGENTE</span>
              )}
            </div>
            <p className="text-xs text-white truncate">{e.nombre}</p>
            <p className="text-[10px] text-gray-500">
              {fmtFechaCorta(e.fecha)}{e.lugar ? ` · ${e.lugar}` : ""}
            </p>
            {e.tipo !== "CONFIRMADO" && e.etapaActual && (
              <p className="text-[10px] text-gray-600">{e.etapaActual}</p>
            )}
          </div>
          <a href={e.linkHref} className="text-[10px] text-[#B3985B] hover:underline shrink-0 mt-0.5">Ver →</a>
        </div>
      </div>
    );
  }

  if (loading) return <p className="text-gray-700 text-xs text-center py-6">Cargando eventos...</p>;

  const urgentes = (data?.estaSemana ?? []).filter((e) => e.tipo !== "CONFIRMADO" && e.urgente);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2.5 border-b border-[#1a1a1a] flex items-center justify-between">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Eventos — 2 semanas</p>
        {urgentes.length > 0 && (
          <span className="text-[9px] font-bold bg-red-900/30 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded-full">
            {urgentes.length} sin cerrar esta semana
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {(data?.estaSemana.length ?? 0) + (data?.siguienteSemana.length ?? 0) === 0 ? (
          <p className="text-gray-700 text-xs text-center py-8">Sin eventos en las próximas 2 semanas</p>
        ) : (
          <>
            {(data?.estaSemana.length ?? 0) > 0 && (
              <>
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider px-3 py-2 bg-[#0a0a0a]">Esta semana</p>
                {data!.estaSemana.map((e) => <EventoRow key={e.id + e.tipo} e={e} />)}
              </>
            )}
            {(data?.siguienteSemana.length ?? 0) > 0 && (
              <>
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider px-3 py-2 bg-[#0a0a0a]">Siguiente semana</p>
                {data!.siguienteSemana.map((e) => <EventoRow key={e.id + e.tipo} e={e} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Panel Global — Proyectos Activos ─────────────────────────────────────────

function PanelProyectosGlobal({
  proyectosAgenda,
}: {
  proyectosAgenda: { proximos: ProyectoAgenda[]; recientes: ProyectoAgenda[] } | null;
}) {
  if (!proyectosAgenda) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-600 text-xs">Cargando eventos...</p>
      </div>
    );
  }

  const { proximos, recientes } = proyectosAgenda;

  function fmtFechaEvento(d: string | Date) {
    return new Date(d).toLocaleDateString('es-MX', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      timeZone: 'America/Mexico_City',
    });
  }

  function estadoBadge(estado: string, sinProyecto?: boolean) {
    if (sinProyecto) return <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400">Sin proyecto</span>;
    const map: Record<string, string> = {
      PLANEACION: 'bg-[#1e1e1e] text-gray-400',
      CONFIRMADO: 'bg-[#C9A84C]/15 text-[#C9A84C]',
      EN_CURSO: 'bg-green-900/30 text-green-400',
      COMPLETADO: 'bg-green-900/20 text-green-600',
      VENTA_CERRADA: 'bg-amber-900/30 text-amber-400',
    };
    const cls = map[estado] ?? 'bg-[#1e1e1e] text-gray-500';
    const labels: Record<string, string> = {
      PLANEACION: 'Planeación', CONFIRMADO: 'Confirmado', EN_CURSO: 'En curso',
      COMPLETADO: 'Realizado', VENTA_CERRADA: 'Cerrado',
    };
    return <span className={`text-[9px] px-1.5 py-0.5 rounded ${cls}`}>{labels[estado] ?? estado}</span>;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#1a1a1a]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Eventos / Servicios</p>
      </div>

      {/* Próximos */}
      {proximos.length > 0 && (
        <div>
          <p className="px-4 pt-2.5 pb-1 text-[9px] text-gray-600 uppercase tracking-wider font-semibold">Próximos 30 días</p>
          <div className="divide-y divide-[#141414]">
            {proximos.map((p) => (
              <div key={p.id} className="px-4 py-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white text-xs font-medium leading-snug flex-1">{p.nombre}</p>
                  {estadoBadge(p.estado, p.sinProyecto)}
                </div>
                {p.cliente && (
                  <p className="text-gray-500 text-[10px] mt-0.5">
                    {p.cliente.nombre}{p.cliente.empresa ? ` · ${p.cliente.empresa}` : ''}
                  </p>
                )}
                {p.fechaEvento && <p className="text-[#C9A84C] text-[10px] mt-0.5">{fmtFechaEvento(p.fechaEvento)}</p>}
                {p.lugarEvento && <p className="text-gray-600 text-[10px]">{p.lugarEvento}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recientes */}
      {recientes.length > 0 && (
        <div className={proximos.length > 0 ? 'border-t border-[#1a1a1a]' : ''}>
          <p className="px-4 pt-2.5 pb-1 text-[9px] text-gray-600 uppercase tracking-wider font-semibold">Recientes (14 días)</p>
          <div className="divide-y divide-[#141414]">
            {recientes.map((p) => (
              <div key={p.id} className="px-4 py-2 opacity-70">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-gray-300 text-xs font-medium leading-snug flex-1">{p.nombre}</p>
                  {estadoBadge(p.estado)}
                </div>
                {p.cliente && (
                  <p className="text-gray-500 text-[10px] mt-0.5">
                    {p.cliente.nombre}{p.cliente.empresa ? ` · ${p.cliente.empresa}` : ''}
                  </p>
                )}
                {p.fechaEvento && <p className="text-gray-600 text-[10px] mt-0.5">{fmtFechaEvento(p.fechaEvento)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {proximos.length === 0 && recientes.length === 0 && (
        <div className="px-4 py-6 text-center">
          <p className="text-gray-600 text-xs">Sin eventos activos</p>
        </div>
      )}
    </div>
  );
}

// ─── Panel Global — Quick Task Form ──────────────────────────────────────────

function PanelQuickTarea({ juntaId, participantes }: { juntaId: string; participantes: { user: { id: string; name: string } }[] }) {
  const [quickTarea, setQuickTarea] = useState({ titulo: "", descripcion: "", prioridad: "MEDIA", fechaVencimiento: "" });
  const [asignadoAId, setAsignadoAId] = useState("");
  const [savingQuickTarea, setSavingQuickTarea] = useState(false);
  const [tareasCreadas, setTareasCreadas] = useState<{ id: string; titulo: string }[]>([]);

  const crearTareaRapida = async () => {
    if (!quickTarea.titulo.trim()) return;
    setSavingQuickTarea(true);
    try {
      const res = await fetch(`/api/juntas/${juntaId}/tareas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: quickTarea.titulo.trim(),
          descripcion: quickTarea.descripcion || undefined,
          prioridad: quickTarea.prioridad,
          fechaVencimiento: quickTarea.fechaVencimiento || undefined,
          asignadoAId: asignadoAId || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTareasCreadas((prev) => [...prev, { id: data.tarea.id, titulo: data.tarea.titulo }]);
        setQuickTarea({ titulo: "", descripcion: "", prioridad: "MEDIA", fechaVencimiento: "" });
      }
    } finally {
      setSavingQuickTarea(false);
    }
  };

  return (
    <div className="border-t border-[#1a1a1a] flex flex-col" style={{ minHeight: "280px" }}>
      <div className="px-4 py-3 border-b border-[#1a1a1a]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Nueva tarea</p>
      </div>
      <div className="p-3 space-y-2 flex-1 overflow-y-auto">
        <input
          value={quickTarea.titulo}
          onChange={(e) => setQuickTarea((p) => ({ ...p, titulo: e.target.value }))}
          onKeyDown={(e) => { if (e.key === "Enter") crearTareaRapida(); }}
          placeholder="Título de la tarea *"
          className="w-full border border-[#1e1e1e] bg-[#0d0d0d] focus:border-[#C9A84C]/50 focus:outline-none rounded-lg px-3 py-2 text-sm text-white placeholder-gray-700"
        />
        <textarea
          value={quickTarea.descripcion}
          onChange={(e) => setQuickTarea((p) => ({ ...p, descripcion: e.target.value }))}
          placeholder="Descripción (opcional)"
          rows={2}
          className="w-full border border-[#1e1e1e] bg-[#0d0d0d] focus:border-[#C9A84C]/50 focus:outline-none rounded-lg px-3 py-2 text-sm text-white placeholder-gray-700 resize-none"
        />
        <select
          value={asignadoAId}
          onChange={(e) => setAsignadoAId(e.target.value)}
          className="w-full border border-[#1e1e1e] bg-[#0d0d0d] focus:border-[#C9A84C]/50 focus:outline-none rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">— Sin asignar —</option>
          {participantes.map((p) => (
            <option key={p.user.id} value={p.user.id}>{p.user.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            value={quickTarea.fechaVencimiento}
            onChange={(e) => setQuickTarea((p) => ({ ...p, fechaVencimiento: e.target.value }))}
            className="flex-1 border border-[#1e1e1e] bg-[#0d0d0d] focus:border-[#C9A84C]/50 focus:outline-none rounded-lg px-2 py-1.5 text-sm text-white [color-scheme:dark]"
          />
          <select
            value={quickTarea.prioridad}
            onChange={(e) => setQuickTarea((p) => ({ ...p, prioridad: e.target.value }))}
            className="border border-[#1e1e1e] bg-[#0d0d0d] focus:border-[#C9A84C]/50 focus:outline-none rounded-lg px-2 py-1.5 text-sm text-white"
          >
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
            <option value="URGENTE">Urgente</option>
          </select>
        </div>
        <button
          onClick={crearTareaRapida}
          disabled={savingQuickTarea || !quickTarea.titulo.trim()}
          className="w-full bg-[#B3985B] hover:bg-[#c9a96e] text-black font-semibold text-xs px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
        >
          {savingQuickTarea ? "Guardando..." : "+ Agregar tarea"}
        </button>

        {tareasCreadas.length > 0 && (
          <div className="mt-2">
            <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Creadas en esta junta</p>
            <div className="space-y-1">
              {tareasCreadas.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-green-500 shrink-0">✓</span>
                  <span className="truncate">{t.titulo}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JuntaActivaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [junta, setJunta]           = useState<Junta | null>(null);
  const [usuarios, setUsuarios]     = useState<Usuario[]>([]);
  const [proyectos, setProyectos]   = useState<Proyecto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modalTarea, setModalTarea] = useState(false);
  const [cerrando, setCerrando]     = useState(false);
  const notasTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global-panel proyectos state
  const [proyectosAgenda, setProyectosAgenda] = useState<{ proximos: ProyectoAgenda[]; recientes: ProyectoAgenda[] } | null>(null);

  const cargar = useCallback(async () => {
    const [jRes, uRes, pRes] = await Promise.all([
      fetch(`/api/juntas/${id}`).then((r) => r.json()),
      fetch("/api/usuarios-activos").then((r) => r.json()),
      fetch("/api/operaciones/proyectos").then((r) => r.json()),
    ]);
    setJunta(jRes.junta ?? null);
    setUsuarios(uRes.usuarios ?? []);
    setProyectos(pRes.proyectos ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  // Fetch proyectos agenda once for global junta
  useEffect(() => {
    if (!junta || junta.tipo !== "GLOBAL_SEMANAL") return;
    fetch("/api/proyectos/agenda")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setProyectosAgenda(d); })
      .catch(() => {});
  }, [junta?.tipo]);

  async function patchJunta(data: Record<string, unknown>) {
    const res = await fetch(`/api/juntas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { junta: updated } = await res.json();
      setJunta((prev) => prev ? { ...prev, ...updated } : updated);
    }
  }

  async function handleCerrar() {
    const temasSinCubrir = junta?.temasAdicionales.filter((t) => !t.cubierto && !t.pasadoSiguienteSemana) ?? [];
    const msg = temasSinCubrir.length > 0
      ? `¿Cerrar la junta? Hay ${temasSinCubrir.length} tema(s) sin cubrir. Se generará el resumen automático.`
      : "¿Cerrar esta junta? Se generará el resumen automático.";
    if (!confirm(msg)) return;
    setCerrando(true);
    await fetch(`/api/juntas/${id}/resumen`, { method: "POST" });
    setCerrando(false);
    router.push(`/juntas/${id}/reporte`);
  }

  function handleNotasChange(val: string) {
    setJunta((prev) => prev ? { ...prev, notas: val } : prev);
    if (notasTimer.current) clearTimeout(notasTimer.current);
    notasTimer.current = setTimeout(() => {
      fetch(`/api/juntas/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas: val }),
      });
    }, 800);
  }

  async function handleAgendaUpdate(itemId: string, changes: Partial<AgendaItem>) {
    setJunta((prev) => {
      if (!prev) return prev;
      return { ...prev, agendaItems: prev.agendaItems.map((it) => it.id === itemId ? { ...it, ...changes } : it) };
    });
    await fetch(`/api/juntas/${id}/agenda/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-600 text-sm">Cargando junta...</div>;
  }
  if (!junta) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-2">Junta no encontrada</p>
          <Link href="/juntas" className="text-[#B3985B] text-sm hover:underline">← Volver a juntas</Link>
        </div>
      </div>
    );
  }

  const colors      = AREA_COLORS[junta.area as AreaJunta] ?? AREA_COLORS.GLOBAL;
  const areaLabel   = AREA_LABELS[junta.area as AreaJunta] ?? junta.area;
  const esCerrada   = junta.estado === "COMPLETADA" || junta.estado === "CANCELADA";
  const esGlobal    = junta.tipo === "GLOBAL_SEMANAL";
  const itemsCubiertos = junta.agendaItems.filter((i) => i.completado).length;

  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center gap-3 flex-wrap shrink-0">
        <Link href="/juntas" className="text-gray-600 hover:text-white text-sm transition-colors shrink-0">← Juntas</Link>
        <span className="text-gray-700">·</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>{areaLabel}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{junta.titulo}</p>
          <p className="text-gray-500 text-xs">{fmtFecha(junta.fecha)} · {fmtHora(junta.fecha)} · {junta.duracionMin} min · {junta.facilitador.name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {junta.agendaItems.length > 0 && (
            <span className="text-xs text-gray-500">{itemsCubiertos}/{junta.agendaItems.length} agenda</span>
          )}
          {!esCerrada && junta.estado === "PROGRAMADA" && (
            <button onClick={() => patchJunta({ estado: "EN_CURSO" })}
              className="px-3 py-1.5 rounded-lg bg-[#B3985B]/15 border border-[#B3985B]/30 text-[#B3985B] text-xs font-semibold hover:bg-[#B3985B]/25 transition-colors">
              ▶ Iniciar
            </button>
          )}
          {!esCerrada && (
            <button onClick={handleCerrar} disabled={cerrando}
              className="px-3 py-1.5 rounded-lg bg-green-900/30 border border-green-800/40 text-green-400 text-xs font-semibold hover:bg-green-900/50 disabled:opacity-50 transition-colors">
              {cerrando ? "Cerrando..." : "✓ Cerrar junta"}
            </button>
          )}
          {esCerrada && (
            <Link href={`/juntas/${id}/reporte`}
              className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 text-xs hover:border-[#444] transition-colors">
              Ver reporte →
            </Link>
          )}
        </div>
      </div>

      {/* ── 3-zone layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Panel izquierdo — Agenda + Temas adicionales ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 lg:border-r border-[#1a1a1a] min-w-0">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Agenda estructurada</p>

          {junta.agendaItems.map((item) => (
            <ItemAgenda key={item.id} item={item} juntaId={id} onUpdate={handleAgendaUpdate} />
          ))}

          {/* Notas generales */}
          <div className="border border-[#222] rounded-xl overflow-hidden mt-4">
            <div className="px-4 py-3 bg-[#111] border-b border-[#1a1a1a]">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notas generales</p>
            </div>
            <div className="bg-[#0d0d0d] p-4">
              <textarea value={junta.notas ?? ""} onChange={(e) => handleNotasChange(e.target.value)} rows={4}
                placeholder="Notas libres, observaciones, contexto adicional..."
                className="w-full bg-transparent text-sm text-white placeholder-[#333] focus:outline-none resize-none" />
            </div>
          </div>

          {/* Temas adicionales */}
          <SeccionTemasAdicionales
            juntaId={id}
            temas={junta.temasAdicionales}
            esCerrada={esCerrada}
            onTemasChange={(temas) => setJunta((prev) => prev ? { ...prev, temasAdicionales: temas } : prev)}
          />
        </div>

        {/* ── Panel derecho — dividido en dos mitades ── */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col border-t lg:border-t-0 border-[#1a1a1a] shrink-0">

          {/* ── Mitad superior: Proyectos activos (Global) o Tareas de esta junta ── */}
          <div className="flex-1 flex flex-col border-b border-[#1a1a1a] overflow-hidden">
            {esGlobal ? (
              <PanelProyectosGlobal proyectosAgenda={proyectosAgenda} />
            ) : (
              <>
                <div className="px-4 py-2.5 border-b border-[#1a1a1a] flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Tareas de esta junta</p>
                    <p className="text-[9px] text-gray-700 mt-0.5">→ Gestión Operativa</p>
                  </div>
                  {!esCerrada && (
                    <button onClick={() => setModalTarea(true)}
                      className="text-xs bg-[#B3985B]/15 border border-[#B3985B]/30 text-[#B3985B] px-2.5 py-1 rounded-lg hover:bg-[#B3985B]/25 transition-colors font-semibold">
                      + Agregar
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {junta.tareas.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-gray-600 text-xs">Sin tareas aún</p>
                      {!esCerrada && (
                        <button onClick={() => setModalTarea(true)} className="mt-1.5 text-[10px] text-[#B3985B] hover:underline">+ Agregar primera tarea</button>
                      )}
                    </div>
                  ) : (
                    junta.tareas.map((t) => {
                      const venc = fmtVenc(t.fechaVencimiento);
                      return (
                        <div key={t.id} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-2.5 hover:border-[#2a2a2a] transition-colors">
                          <div className="flex items-start gap-2">
                            <div className={`mt-0.5 w-2.5 h-2.5 rounded-full border flex-shrink-0 ${t.estado === "COMPLETADA" ? "bg-green-500 border-green-500" : "border-[#333]"}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-snug ${t.estado === "COMPLETADA" ? "text-gray-600 line-through" : "text-white"}`}>{t.titulo}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {t.asignadoA && <span className="text-[10px] text-gray-500">{t.asignadoA.name}</span>}
                                <span className={`text-[10px] font-semibold ${PRIO_COLOR[t.prioridad] ?? "text-gray-500"}`}>{t.prioridad}</span>
                                {venc && <span className={`text-[10px] ${venc.cls}`}>{venc.label}</span>}
                              </div>
                              {t.proyectoTarea && <p className="text-[9px] text-gray-600 mt-0.5 truncate">{t.proyectoTarea.nombre}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {!esCerrada && junta.tareas.length > 0 && (
                  <div className="p-3 border-t border-[#1a1a1a] shrink-0">
                    <button onClick={() => setModalTarea(true)}
                      className="w-full py-1.5 rounded-lg border border-dashed border-[#2a2a2a] text-gray-600 text-xs hover:border-[#B3985B]/30 hover:text-[#B3985B] transition-colors">
                      + Agregar tarea
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Mitad inferior: Quick task form (Global) or Tareas pendientes del área ── */}
          <div className="flex-1 overflow-hidden">
            {esGlobal ? (
              <PanelQuickTarea juntaId={id} participantes={junta.participantes} />
            ) : (
              <PanelTareasPendientes proyectos={proyectos} area={junta.area} />
            )}
          </div>
        </div>
      </div>

      {/* Modal agregar tarea */}
      {modalTarea && (
        <ModalAgregarTarea
          junta={junta} usuarios={usuarios} proyectos={proyectos}
          onClose={() => setModalTarea(false)}
          onCreated={(t) => {
            setJunta((prev) => prev ? { ...prev, tareas: [...prev.tareas, t] } : prev);
            setModalTarea(false);
          }}
        />
      )}
    </div>
  );
}
