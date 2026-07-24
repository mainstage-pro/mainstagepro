"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, User, ClipboardList } from "lucide-react";
import NuevaTareaModal from "../../operaciones/components/NuevaTareaModal";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface TareaProyecto {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  area: string;
  estado: string;
  fecha: string | null;
  fechaVencimiento: string | null;
  notas: string | null;
  asignadoA: { id: string; name: string } | null;
  creadoPor: { id: string; name: string } | null;
  _count: { subtareas: number; comentarios: number; archivos: number };
}

export interface Usuario { id: string; name: string; }

interface GrupoChecklist { grupo: string; area: string; items: string[] }

// ─── Plantillas por tipo de servicio ────────────────────────────────────────────
// Cada ítem se corresponde 1:1 con una tarea del proyecto que se abre/edita con el
// mismo editor de detalle. El emparejamiento checklist ↔ tarea se hace por título
// normalizado.
const CHECKLIST_PRODUCCION_TECNICA: GrupoChecklist[] = [
  {
    grupo: "Resumen",
    area: "PRODUCCION",
    items: [
      "Llenar información general del evento",
      "Llenar información del venue",
      "Llenar logística de montaje",
      "Llenar logística de desmontaje",
      "Llenar notas del proyecto",
    ],
  },
  {
    grupo: "Operación",
    area: "PRODUCCION",
    items: [
      "Llenar sección de traslado",
      "Llenar sección de personal técnico",
      "Hacer invitación a colaborar a técnicos",
      "Asignar técnico al rol técnico definido",
      "Confirmar técnicos",
      "Hacer cronología del evento",
      "Agregar documentos operativos al proyecto",
    ],
  },
  {
    grupo: "Producción",
    area: "PRODUCCION",
    items: [
      "Conseguir proveedores externos faltantes",
      "Agregar accesorios de cada equipo para el rider de carga",
      "Agregar equipos adicionales al rider de carga",
      "Agregar información de llegada de proveedores",
      "Llenar evaluación post evento",
      "Enviar evaluación del servicio a cliente",
    ],
  },
  {
    grupo: "Finanzas",
    area: "ADMINISTRACION",
    items: [
      "Confirmar pagos a personal técnico",
      "Registrar los gastos generados del proyecto",
      "Generar cierre de proyecto (una vez teniendo todos los ingresos y gastos del proyecto registrados)",
      "Generar CXP a inversionistas",
      "Hacer cobro pendiente a cliente del servicio",
      "Hacer pago a proveedores del proyecto",
    ],
  },
];

const PLANTILLAS: Record<string, GrupoChecklist[]> = {
  PRODUCCION_TECNICA: CHECKLIST_PRODUCCION_TECNICA,
};

const PRIO_COLOR: Record<string, string> = {
  URGENTE: "#f87171", ALTA: "#fb923c", MEDIA: "#B3985B", BAJA: "#555",
};

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,;:()]/g, "");
}

function fechaCorta(iso: string): string {
  return new Date(iso.substring(0, 10) + "T00:00:00").toLocaleDateString("es-MX", { month: "short", day: "numeric" });
}

// ─── Componente principal ───────────────────────────────────────────────────────
export default function ChecklistEventoTab({
  proyectoId, proyectoNombre, tipoServicio, usuarios,
}: {
  proyectoId: string;
  proyectoNombre: string;
  tipoServicio: string | null;
  usuarios: Usuario[];
}) {
  const plantilla = tipoServicio ? PLANTILLAS[tipoServicio] : undefined;

  const [tareas, setTareas]   = useState<TareaProyecto[]>([]);
  const [loading, setLoading] = useState(true);
  // Modal: crear (título + área opcionalmente precargados) o editar (tarea existente).
  // Mismo modal "Tarea de proyecto de evento" que en Gestión Operativa.
  const [modal, setModal] = useState<
    | { mode: "crear"; item: string | null; area: string | null }
    | { mode: "editar"; tareaId: string }
    | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/tareas`, { cache: "no-store" });
      if (res.ok) { const d = await res.json(); setTareas(d.tareas ?? []); }
    } finally { setLoading(false); }
  }, [proyectoId]);

  useEffect(() => { load(); }, [load]);

  // Mapa título normalizado → tarea (primera coincidencia)
  const porTitulo = useMemo(() => {
    const m = new Map<string, TareaProyecto>();
    for (const t of tareas) { const k = norm(t.titulo); if (!m.has(k)) m.set(k, t); }
    return m;
  }, [tareas]);

  // Títulos que pertenecen al checklist de plantilla (para separar tareas manuales)
  const titulosPlantilla = useMemo(() => {
    const s = new Set<string>();
    if (plantilla) for (const g of plantilla) for (const it of g.items) s.add(norm(it));
    return s;
  }, [plantilla]);

  // Tareas manuales/extra: las que no corresponden a un ítem del checklist
  const extras = useMemo(
    () => tareas.filter(t => !titulosPlantilla.has(norm(t.titulo))),
    [tareas, titulosPlantilla]
  );

  const stats = useMemo(() => {
    if (!plantilla) return { total: 0, creadas: 0, completadas: 0 };
    let total = 0, creadas = 0, completadas = 0;
    for (const g of plantilla) for (const it of g.items) {
      total++;
      const t = porTitulo.get(norm(it));
      if (t) { creadas++; if (t.estado === "COMPLETADA") completadas++; }
    }
    return { total, creadas, completadas };
  }, [plantilla, porTitulo]);

  async function toggle(e: React.MouseEvent, t: TareaProyecto) {
    e.stopPropagation();
    const next = t.estado === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA";
    setTareas(prev => prev.map(x => x.id === t.id ? { ...x, estado: next } : x));
    const res = await fetch(`/api/tareas/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: next }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setTareas(prev => prev.map(x => x.id === t.id ? { ...x, estado: t.estado } : x));
      if (d?.error) alert(d.error);
    }
  }

  // Click en la fila: abre el mismo modal de "Tarea de proyecto de evento". Si la
  // tarea ya existe se abre en modo edición; si no, en modo creación con el título y
  // el área precargados (el evento queda fijo a este proyecto).
  function abrirFila(item: string, area: string, existente?: TareaProyecto) {
    if (existente) setModal({ mode: "editar", tareaId: existente.id });
    else setModal({ mode: "crear", item, area });
  }

  // Alta/edición confirmada en el modal → refleja la tarea en la lista.
  function upsertTarea(t: TareaProyecto) {
    setTareas(prev => {
      const i = prev.findIndex(x => x.id === t.id);
      if (i >= 0) { const c = [...prev]; c[i] = { ...c[i], ...t }; return c; }
      return [...prev, t];
    });
  }

  const pct = stats.total > 0 ? Math.round((stats.completadas / stats.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ── Nuevo registro (idéntico a Gestión Operativa) ── */}
      <button
        onClick={() => setModal({ mode: "crear", item: null, area: null })}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-all text-sm font-medium"
      >
        <span className="w-5 h-5 rounded-full bg-[#B3985B]/15 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </span>
        Nuevo registro
      </button>

      {/* ── Tareas manuales / extra (no pertenecen al checklist guiado) ── */}
      {extras.length > 0 && (
        <div className="ms-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[#60a5fa] uppercase tracking-wider">Tareas manuales</h4>
            <span className="text-[11px] text-gray-600">{extras.length}</span>
          </div>
          <div className="divide-y divide-[#141414]">
            {extras.map(t => {
              const done = t.estado === "COMPLETADA";
              return (
                <div
                  key={t.id}
                  onClick={() => setModal({ mode: "editar", tareaId: t.id })}
                  className="group flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-[#0f0f0f] transition-colors"
                >
                  <button
                    onClick={(e) => toggle(e, t)}
                    title={done ? "Marcar como pendiente" : "Marcar como completada"}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      done ? "border-green-500 bg-green-500/20 text-green-400 text-[10px]"
                           : "border-[#333] hover:border-[#B3985B] text-transparent"
                    }`}
                  >
                    {done ? "✓" : ""}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${done ? "line-through text-gray-600" : "text-white"} transition-colors`}>
                      {t.titulo}
                    </p>
                    <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                      <span
                        className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md max-w-[180px] truncate"
                        style={{ color: "#60a5fa", backgroundColor: "rgba(59,130,246,0.14)", border: "1px solid rgba(59,130,246,0.35)" }}
                        title={proyectoNombre}
                      >
                        {proyectoNombre}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ color: PRIO_COLOR[t.prioridad] ?? "#555", background: (PRIO_COLOR[t.prioridad] ?? "#555") + "18" }}>
                        {t.prioridad.charAt(0) + t.prioridad.slice(1).toLowerCase()}
                      </span>
                      {t.asignadoA ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-[#1a1a1a] font-medium">
                          <User strokeWidth={1.75} className="w-3 h-3" /> {t.asignadoA.name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-yellow-500/70 px-2 py-0.5 rounded-full bg-yellow-950/20 font-medium">Sin asignar</span>
                      )}
                      {t.fecha && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-[#111] font-medium">
                          <Calendar strokeWidth={1.75} className="w-3 h-3" /> {fechaCorta(t.fecha)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 self-center text-[11px] text-[#555] opacity-0 group-hover:opacity-100 transition-opacity">Abrir →</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Aviso cuando no hay checklist guiado para este tipo de servicio ── */}
      {!plantilla && (
        <div className="ms-card rounded-2xl p-8 text-center text-gray-500">
          <ClipboardList strokeWidth={1.5} className="w-9 h-9 mx-auto mb-2 text-gray-600" />
          <p className="text-sm">El checklist guiado está disponible por ahora para proyectos de <span className="text-[#B3985B]">Producción Técnica</span>. Puedes agregar tareas manuales con el recuadro de arriba.</p>
        </div>
      )}

      {/* ── Checklist guiado (solo con plantilla) ── */}
      {plantilla && (
      <>
      {/* ── Encabezado + progreso ── */}
      <div className="ms-card rounded-2xl p-5">
        <div className="mb-3">
          <h3 className="text-white font-semibold text-base">Tareas del proyecto</h3>
          <p className="text-gray-500 text-xs mt-0.5">
            Checklist del proceso de producción técnica. Haz clic en una tarea para abrirla y editarla (responsable, fecha, evidencia). Aparece para su responsable en Gestión Operativa por proyecto.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{stats.completadas}/{stats.total} completadas · {stats.creadas} asignadas</span>
            <span className={pct === 100 ? "text-green-400 font-semibold" : "text-[#B3985B]"}>{pct}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-green-500" : "bg-[#B3985B]"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Grupos ── */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 ms-card animate-pulse rounded-2xl" />)}</div>
      ) : (
        plantilla.map(grupo => {
          const creadasGrupo = grupo.items.filter(it => porTitulo.has(norm(it))).length;
          return (
            <div key={grupo.grupo} className="ms-card rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">{grupo.grupo}</h4>
                <span className="text-[11px] text-gray-600">{creadasGrupo}/{grupo.items.length}</span>
              </div>
              <div className="divide-y divide-[#141414]">
                {grupo.items.map(item => {
                  const tarea = porTitulo.get(norm(item));
                  const done  = tarea?.estado === "COMPLETADA";
                  return (
                    <div
                      key={item}
                      onClick={() => abrirFila(item, grupo.area, tarea)}
                      className="group flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-[#0f0f0f] transition-colors"
                    >
                      {/* Casilla */}
                      {tarea ? (
                        <button
                          onClick={(e) => toggle(e, tarea)}
                          title={done ? "Marcar como pendiente" : "Marcar como completada"}
                          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            done ? "border-green-500 bg-green-500/20 text-green-400 text-[10px]"
                                 : "border-[#333] hover:border-[#B3985B] text-transparent"
                          }`}
                        >
                          {done ? "✓" : ""}
                        </button>
                      ) : (
                        <span className="mt-0.5 w-5 h-5 rounded-full border-2 border-dashed shrink-0 border-[#2a2a2a] group-hover:border-[#B3985B]/50 transition-colors" />
                      )}

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${done ? "line-through text-gray-600" : tarea ? "text-white" : "text-gray-300 group-hover:text-white"} transition-colors`}>
                          {item}
                        </p>
                        {tarea && (
                          <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{ color: PRIO_COLOR[tarea.prioridad] ?? "#555", background: (PRIO_COLOR[tarea.prioridad] ?? "#555") + "18" }}>
                              {tarea.prioridad.charAt(0) + tarea.prioridad.slice(1).toLowerCase()}
                            </span>
                            {tarea.asignadoA ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-[#1a1a1a] font-medium">
                                <User strokeWidth={1.75} className="w-3 h-3" /> {tarea.asignadoA.name}
                              </span>
                            ) : (
                              <span className="text-[10px] text-yellow-500/70 px-2 py-0.5 rounded-full bg-yellow-950/20 font-medium">Sin asignar</span>
                            )}
                            {tarea.fecha && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-[#111] font-medium">
                                <Calendar strokeWidth={1.75} className="w-3 h-3" /> {fechaCorta(tarea.fecha)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Hint de acción */}
                      <span className="shrink-0 self-center text-[11px] text-[#555] opacity-0 group-hover:opacity-100 transition-opacity">
                        {tarea ? "Abrir →" : "Asignar →"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
      </>
      )}

      {/* ── Mismo modal "Tarea de proyecto de evento" de Gestión Operativa ── */}
      {modal && (
        <NuevaTareaModal
          open
          onClose={() => { setModal(null); load(); }}
          usuarios={usuarios}
          tipoInicial="EVENTO"
          proyectoEventoIdInicial={proyectoId}
          proyectoEventoNombre={proyectoNombre}
          tituloInicial={modal.mode === "crear" ? modal.item : null}
          defaultArea={modal.mode === "crear" ? modal.area : null}
          tareaIdEdicion={modal.mode === "editar" ? modal.tareaId : null}
          onCreated={(t) => upsertTarea(t as TareaProyecto)}
        />
      )}
    </div>
  );
}
