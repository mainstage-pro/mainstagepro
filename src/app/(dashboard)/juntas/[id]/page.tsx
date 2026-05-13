"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AREA_LABELS, AREA_COLORS, TIPO_AGENDA_LABELS, TIPO_AGENDA_COLORS, type AreaJunta, type TipoAgenda } from "@/lib/junta-templates";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgendaItem = {
  id: string;
  orden: number;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  placeholder: string | null;
  respuesta: string | null;
  completado: boolean;
};

type TareaJunta = {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  estado: string;
  fechaVencimiento: string | null;
  asignadoA: { id: string; name: string } | null;
  proyectoTarea: { id: string; nombre: string } | null;
};

type Junta = {
  id: string;
  titulo: string;
  area: string;
  tipo: string;
  fecha: string;
  duracionMin: number;
  estado: string;
  notas: string | null;
  resumen: string | null;
  facilitador: { id: string; name: string };
  agendaItems: AgendaItem[];
  participantes: { user: { id: string; name: string } }[];
  tareas: TareaJunta[];
};

type Usuario = { id: string; name: string; area: string | null };
type Proyecto = { id: string; nombre: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long",
  });
}
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}
function fmtVencimiento(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - hoy.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff < 0)  return `Hace ${Math.abs(diff)}d`;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

const PRIORIDAD_COLORS: Record<string, string> = {
  URGENTE: "text-red-400",
  ALTA:    "text-orange-400",
  MEDIA:   "text-[#B3985B]",
  BAJA:    "text-gray-500",
};

// ─── Modal Agregar Tarea ──────────────────────────────────────────────────────

function ModalAgregarTarea({
  junta,
  usuarios,
  proyectos,
  onClose,
  onCreated,
}: {
  junta: Junta;
  usuarios: Usuario[];
  proyectos: Proyecto[];
  onClose: () => void;
  onCreated: (t: TareaJunta) => void;
}) {
  const [titulo, setTitulo]   = useState("");
  const [desc, setDesc]       = useState("");
  const [prioridad, setPrioridad] = useState("ALTA");
  const [asignadoId, setAsignadoId] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [proyectoId, setProyectoId]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Pre-llenar proyecto según área de la junta
  useEffect(() => {
    const areaMap: Record<string, string> = {
      ADMINISTRACION: "administración",
      MARKETING:      "marketing",
      VENTAS:         "ventas",
      PRODUCCION:     "producción",
      DIRECCION:      "dirección",
    };
    const keyword = areaMap[junta.area];
    if (keyword) {
      const match = proyectos.find((p) =>
        p.nombre.toLowerCase().includes(keyword)
      );
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
        titulo:           titulo.trim(),
        descripcion:      desc || null,
        prioridad,
        asignadoAId:      asignadoId || null,
        fechaVencimiento: vencimiento || null,
        proyectoTareaId:  proyectoId || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const { tarea } = await res.json();
      onCreated(tarea);
    } else {
      setError("Error al crear la tarea");
    }
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
            <input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="¿Qué hay que hacer?"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#B3985B]"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Descripción / contexto</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="Contexto o detalle adicional"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#B3985B] resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Prioridad</label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              >
                <option value="URGENTE">Urgente</option>
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Asignado a</label>
              <select
                value={asignadoId}
                onChange={(e) => setAsignadoId(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              >
                <option value="">— Sin asignar —</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Fecha</label>
              <input
                type="date"
                value={vencimiento}
                onChange={(e) => setVencimiento(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Proyecto en Gestión Operativa</label>
            <select
              value={proyectoId}
              onChange={(e) => setProyectoId(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            >
              <option value="">— Sin proyecto —</option>
              {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm hover:border-[#444] transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-50 transition-colors"
            >
              {saving ? "Agregando..." : "Agregar tarea"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Agenda Item ──────────────────────────────────────────────────────────────

function ItemAgenda({
  item,
  onUpdate,
}: {
  item: AgendaItem;
  onUpdate: (id: string, changes: Partial<AgendaItem>) => void;
}) {
  const [expanded, setExpanded]     = useState(true);
  const [respuesta, setRespuesta]   = useState(item.respuesta ?? "");
  const [completado, setCompletado] = useState(item.completado);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tipoColor = TIPO_AGENDA_COLORS[item.tipo as TipoAgenda] ?? "text-gray-500";
  const tipoLabel = TIPO_AGENDA_LABELS[item.tipo as TipoAgenda] ?? item.tipo;

  function handleRespuestaChange(val: string) {
    setRespuesta(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onUpdate(item.id, { respuesta: val });
    }, 800);
  }

  function handleToggleCompletado() {
    const next = !completado;
    setCompletado(next);
    onUpdate(item.id, { completado: next });
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      completado ? "border-[#1a1a1a] bg-[#0a0a0a]" : "border-[#222] bg-[#111]"
    }`}>
      {/* Item header */}
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleCompletado(); }}
          className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
            completado
              ? "bg-green-500 border-green-500"
              : "border-[#333] hover:border-[#B3985B]"
          }`}
        >
          {completado && <span className="text-white text-[10px] leading-none">✓</span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${tipoColor}`}>{tipoLabel}</span>
            <span className="text-gray-700 text-[9px]">·</span>
            <span className="text-gray-600 text-[9px]">{item.orden}</span>
          </div>
          <p className={`text-sm font-medium ${completado ? "text-gray-600 line-through" : "text-white"}`}>
            {item.titulo}
          </p>
          {item.descripcion && !expanded && (
            <p className="text-[11px] text-gray-600 mt-0.5 truncate">{item.descripcion}</p>
          )}
        </div>

        <span className="text-gray-600 text-sm mt-0.5">{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Item body */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#1a1a1a]">
          {item.descripcion && (
            <p className="text-xs text-gray-500 pt-3 pb-2">{item.descripcion}</p>
          )}
          <textarea
            value={respuesta}
            onChange={(e) => handleRespuestaChange(e.target.value)}
            rows={4}
            placeholder={item.placeholder ?? "Escribe las notas de este punto..."}
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50 resize-none transition-colors"
          />
        </div>
      )}
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

  async function patchJunta(data: Record<string, unknown>) {
    const res = await fetch(`/api/juntas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { junta: updated } = await res.json();
      setJunta(updated);
    }
  }

  async function handleIniciar() {
    await patchJunta({ estado: "EN_CURSO" });
  }

  async function handleCerrar() {
    if (!confirm("¿Cerrar esta junta? Se generará el resumen automático.")) return;
    setCerrando(true);
    // Generate summary (also sets estado=COMPLETADA)
    await fetch(`/api/juntas/${id}/resumen`, { method: "POST" });
    setCerrando(false);
    router.push(`/juntas/${id}/reporte`);
  }

  function handleNotasChange(val: string) {
    setJunta((prev) => prev ? { ...prev, notas: val } : prev);
    if (notasTimer.current) clearTimeout(notasTimer.current);
    notasTimer.current = setTimeout(() => {
      fetch(`/api/juntas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas: val }),
      });
    }, 800);
  }

  async function handleAgendaUpdate(itemId: string, changes: Partial<AgendaItem>) {
    // Optimistic update
    setJunta((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        agendaItems: prev.agendaItems.map((it) =>
          it.id === itemId ? { ...it, ...changes } : it
        ),
      };
    });
    await fetch(`/api/juntas/${id}/agenda/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-600 text-sm">
        Cargando junta...
      </div>
    );
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

  const colors    = AREA_COLORS[junta.area as AreaJunta] ?? AREA_COLORS.GLOBAL;
  const areaLabel = AREA_LABELS[junta.area as AreaJunta] ?? junta.area;
  const esCerrada = junta.estado === "COMPLETADA" || junta.estado === "CANCELADA";
  const itemsCubiertos = junta.agendaItems.filter((i) => i.completado).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center gap-3 flex-wrap">
        <Link href="/juntas" className="text-gray-600 hover:text-white text-sm transition-colors shrink-0">
          ← Juntas
        </Link>
        <span className="text-gray-700">·</span>
        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
          {areaLabel}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{junta.titulo}</p>
          <p className="text-gray-500 text-xs">
            {fmtFecha(junta.fecha)} · {fmtHora(junta.fecha)} · {junta.duracionMin} min · {junta.facilitador.name}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Progress */}
          {junta.agendaItems.length > 0 && (
            <span className="text-xs text-gray-500">
              {itemsCubiertos}/{junta.agendaItems.length}
            </span>
          )}

          {!esCerrada && junta.estado === "PROGRAMADA" && (
            <button
              onClick={handleIniciar}
              className="px-3 py-1.5 rounded-lg bg-[#B3985B]/15 border border-[#B3985B]/30 text-[#B3985B] text-xs font-semibold hover:bg-[#B3985B]/25 transition-colors"
            >
              ▶ Iniciar
            </button>
          )}

          {!esCerrada && (
            <button
              onClick={handleCerrar}
              disabled={cerrando}
              className="px-3 py-1.5 rounded-lg bg-green-900/30 border border-green-800/40 text-green-400 text-xs font-semibold hover:bg-green-900/50 disabled:opacity-50 transition-colors"
            >
              {cerrando ? "Cerrando..." : "✓ Cerrar junta"}
            </button>
          )}

          {esCerrada && (
            <Link
              href={`/juntas/${id}/reporte`}
              className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 text-xs hover:border-[#444] transition-colors"
            >
              Ver reporte →
            </Link>
          )}
        </div>
      </div>

      {/* ── Main content: 2 panels ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* ── Panel izquierdo: Agenda ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 lg:border-r border-[#1a1a1a]">
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-4">Agenda</p>

          {junta.agendaItems.map((item) => (
            <ItemAgenda
              key={item.id}
              item={item}
              onUpdate={handleAgendaUpdate}
            />
          ))}

          {/* Notas generales */}
          <div className="border border-[#222] rounded-xl overflow-hidden mt-4">
            <div className="px-4 py-3 bg-[#111] border-b border-[#1a1a1a]">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notas generales de la junta</p>
            </div>
            <div className="bg-[#0d0d0d] p-4">
              <textarea
                value={junta.notas ?? ""}
                onChange={(e) => handleNotasChange(e.target.value)}
                rows={5}
                placeholder="Notas libres, observaciones, contexto adicional..."
                className="w-full bg-transparent text-sm text-white placeholder-[#333] focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* ── Panel derecho: Tareas ── */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col border-t lg:border-t-0 border-[#1a1a1a]">
          <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Tareas de esta junta
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                Se crean en Gestión Operativa
              </p>
            </div>
            {!esCerrada && (
              <button
                onClick={() => setModalTarea(true)}
                className="text-xs bg-[#B3985B]/15 border border-[#B3985B]/30 text-[#B3985B] px-2.5 py-1 rounded-lg hover:bg-[#B3985B]/25 transition-colors font-semibold"
              >
                + Agregar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {junta.tareas.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 text-sm">Sin tareas aún</p>
                {!esCerrada && (
                  <button
                    onClick={() => setModalTarea(true)}
                    className="mt-2 text-xs text-[#B3985B] hover:underline"
                  >
                    + Agregar primera tarea
                  </button>
                )}
              </div>
            ) : (
              junta.tareas.map((t) => (
                <div
                  key={t.id}
                  className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3 hover:border-[#2a2a2a] transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 w-3 h-3 rounded-full border flex-shrink-0 ${
                      t.estado === "COMPLETADA" ? "bg-green-500 border-green-500" : "border-[#333]"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${
                        t.estado === "COMPLETADA" ? "text-gray-600 line-through" : "text-white"
                      }`}>{t.titulo}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {t.asignadoA && (
                          <span className="text-[10px] text-gray-500">{t.asignadoA.name}</span>
                        )}
                        <span className={`text-[10px] font-semibold ${PRIORIDAD_COLORS[t.prioridad] ?? "text-gray-500"}`}>
                          {t.prioridad}
                        </span>
                        {t.fechaVencimiento && (
                          <span className="text-[10px] text-gray-600">
                            {fmtVencimiento(t.fechaVencimiento)}
                          </span>
                        )}
                      </div>
                      {t.proyectoTarea && (
                        <p className="text-[10px] text-gray-600 mt-1 truncate">{t.proyectoTarea.nombre}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {!esCerrada && (
            <div className="p-4 border-t border-[#1a1a1a]">
              <button
                onClick={() => setModalTarea(true)}
                className="w-full py-2 rounded-xl border border-dashed border-[#2a2a2a] text-gray-600 text-xs hover:border-[#B3985B]/30 hover:text-[#B3985B] transition-colors"
              >
                + Agregar tarea
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal agregar tarea */}
      {modalTarea && (
        <ModalAgregarTarea
          junta={junta}
          usuarios={usuarios}
          proyectos={proyectos}
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
