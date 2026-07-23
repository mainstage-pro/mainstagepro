"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, User, ClipboardList } from "lucide-react";
import { ProyectoTaskModal, type TareaProyecto, type Usuario } from "./ProyectoTareas";

// ─── Tipos ────────────────────────────────────────────────────────────────────
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
  const [editId, setEditId]   = useState<string | null>(null);
  const [creando, setCreando] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/tareas`, { cache: "no-store" });
      if (res.ok) { const d = await res.json(); setTareas(d.tareas ?? []); }
    } finally { setLoading(false); }
  }, [proyectoId]);

  useEffect(() => { if (plantilla) load(); else setLoading(false); }, [load, plantilla]);

  // Mapa título normalizado → tarea (primera coincidencia)
  const porTitulo = useMemo(() => {
    const m = new Map<string, TareaProyecto>();
    for (const t of tareas) { const k = norm(t.titulo); if (!m.has(k)) m.set(k, t); }
    return m;
  }, [tareas]);

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

  // Click en la fila: abre el editor de detalle. Si la tarea aún no existe, la crea
  // al vuelo (con el título del checklist y su área) y abre el editor sobre ella.
  async function abrirFila(item: string, area: string, existente?: TareaProyecto) {
    if (existente) { setEditId(existente.id); return; }
    if (creando) return;
    setCreando(item);
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/tareas`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: item, area }),
      });
      if (res.ok) {
        const d = await res.json();
        setTareas(prev => [...prev, d.tarea]);
        setEditId(d.tarea.id);
      }
    } finally {
      setCreando(null);
    }
  }

  if (!plantilla) {
    return (
      <div className="ms-card rounded-2xl p-8 text-center text-gray-500">
        <ClipboardList strokeWidth={1.5} className="w-9 h-9 mx-auto mb-2 text-gray-600" />
        <p className="text-sm">El checklist de tareas está disponible por ahora para proyectos de <span className="text-[#B3985B]">Producción Técnica</span>.</p>
      </div>
    );
  }

  const pct = stats.total > 0 ? Math.round((stats.completadas / stats.total) * 100) : 0;

  return (
    <div className="space-y-4">
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
                  const isCreando = creando === item;
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
                        <span className={`mt-0.5 w-5 h-5 rounded-full border-2 border-dashed shrink-0 ${isCreando ? "border-[#B3985B] animate-pulse" : "border-[#2a2a2a] group-hover:border-[#B3985B]/50"} transition-colors`} />
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
                        {isCreando ? "Abriendo…" : tarea ? "Abrir →" : "Asignar →"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* ── Editor de detalle (mismo de Gestión Operativa / proyecto) ── */}
      {editId && (
        <ProyectoTaskModal
          tareaId={editId}
          proyectoId={proyectoId}
          proyectoNombre={proyectoNombre}
          usuarios={usuarios}
          onClose={() => { setEditId(null); load(); }}
          onSaved={(t) => setTareas(prev => prev.map(x => x.id === t.id ? { ...x, ...t } : x))}
          onDeleted={(id) => { setTareas(prev => prev.filter(x => x.id !== id)); setEditId(null); }}
        />
      )}
    </div>
  );
}
