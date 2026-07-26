"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, User, Flag, MessageCircle, Ban, ChevronDown } from "lucide-react";
import NuevaTareaModal from "../../../operaciones/components/NuevaTareaModal";
import { etapaInternaLabel } from "@/lib/proceso/valores";

// Tareas del proceso comercial de un trato. Al abrir el trato se instancian DE
// GOLPE todas las tareas del proceso (una por paso), agrupadas por subetapa. Nacen
// sin fecha ("estacionadas"): solo aparecen en Gestión Operativa cuando el vendedor
// les pone fecha. Las tareas-hito (con la etiqueta `hito`) avanzan la etapa al
// completarse. "No fue necesario" marca una tarea como hecha pero señalada.
export interface TareaTrato {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  area: string;
  estado: string;
  fecha: string | null;
  fechaVencimiento: string | null;
  notas: string | null;
  etiquetas: string | null;
  asignadoA: { id: string; name: string } | null;
  creadoPor: { id: string; name: string } | null;
  _count: { subtareas: number; comentarios: number; archivos: number };
}

function parseTags(etiquetas: string | null): string[] {
  if (!etiquetas) return [];
  try {
    const arr = JSON.parse(etiquetas) as unknown;
    return Array.isArray(arr) ? arr.filter((e): e is string => typeof e === "string") : [];
  } catch { return []; }
}

// Extrae la subetapa (parte del proceso) de las etiquetas de la tarea.
function subetapaDe(etiquetas: string | null): string | null {
  const tag = parseTags(etiquetas).find((e) => e.startsWith("subetapa:"));
  return tag ? tag.slice("subetapa:".length) : null;
}

function tieneTag(etiquetas: string | null, tag: string): boolean {
  return parseTags(etiquetas).includes(tag);
}

function canalDe(etiquetas: string | null): string | null {
  const tag = parseTags(etiquetas).find((e) => e.startsWith("canal:"));
  return tag ? tag.slice("canal:".length) : null;
}

interface Usuario { id: string; name: string; }

const PRIO_COLOR: Record<string, string> = {
  URGENTE: "#f87171", ALTA: "#fb923c", MEDIA: "#B3985B", BAJA: "#555",
};

const ADHOC = "__adhoc__";

function fechaCorta(iso: string): string {
  return new Date(iso.substring(0, 10) + "T00:00:00").toLocaleDateString("es-MX", { month: "short", day: "numeric" });
}

function waUrl(telefono: string | null, mensaje: string | null): string | null {
  if (!telefono) return null;
  const tel = telefono.replace(/^p:/i, "").replace(/\D/g, "");
  if (!tel) return null;
  const num = tel.length === 10 ? `52${tel}` : tel;
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/${num}${texto}`;
}

export default function TareasTratoTab({
  tratoId, tratoNombre, telefono, usuarios, onSubetapaChange,
}: {
  tratoId: string;
  tratoNombre: string;
  telefono?: string | null;
  usuarios: Usuario[];
  onSubetapaChange?: () => void;
}) {
  const [tareas, setTareas]   = useState<TareaTrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<{ mode: "crear" } | { mode: "editar"; tareaId: string } | null>(null);
  // Secciones colapsadas ("guardadas"). Se persiste por trato en localStorage para
  // que al reabrir el trato las secciones ocultas sigan ocultas.
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`tareas-trato-colapsadas:${tratoId}`);
      if (raw) setColapsadas(new Set(JSON.parse(raw) as string[]));
    } catch { /* ignore */ }
  }, [tratoId]);

  function toggleColapso(key: string) {
    setColapsadas(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem(`tareas-trato-colapsadas:${tratoId}`, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tratos/${tratoId}/tareas`, { cache: "no-store" });
      if (res.ok) { const d = await res.json(); setTareas(d.tareas ?? []); }
    } finally { setLoading(false); }
  }, [tratoId]);

  useEffect(() => { load(); }, [load]);

  async function toggle(e: React.MouseEvent, t: TareaTrato) {
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
      return;
    }
    // Al reabrir, el servidor quita la marca "no-necesario": recargamos para reflejarlo.
    if (next === "PENDIENTE" && tieneTag(t.etiquetas, "no-necesario")) { load(); return; }
    // Si completar esta tarea-hito hizo avanzar la etapa, recarga y avisa al detalle.
    const d = await res.json().catch(() => ({}));
    if (d?.subetapaAvanzada) { load(); onSubetapaChange?.(); }
  }

  async function marcarNoNecesario(e: React.MouseEvent, t: TareaTrato) {
    e.stopPropagation();
    const res = await fetch(`/api/tareas/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noNecesario: true }),
    });
    if (res.ok) { const d = await res.json().catch(() => ({})); if (d?.tarea) upsertTarea(d.tarea as TareaTrato); }
  }

  // Marca TODAS las tareas pendientes de una sección como "no fue necesario".
  // Luego se puede deseleccionar alguna individualmente (reabriéndola con su check).
  async function marcarSeccionNoNecesario(e: React.MouseEvent, grupoTareas: TareaTrato[], label: string) {
    e.stopPropagation();
    const pendientes = grupoTareas.filter(t => t.estado !== "COMPLETADA");
    if (pendientes.length === 0) return;
    if (!confirm(`¿Marcar ${pendientes.length} tarea(s) de "${label}" como "No fue necesario"?`)) return;
    const results = await Promise.all(pendientes.map(t =>
      fetch(`/api/tareas/${t.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noNecesario: true }),
      }).then(r => (r.ok ? r.json() : null)).catch(() => null)
    ));
    for (const d of results) if (d?.tarea) upsertTarea(d.tarea as TareaTrato);
  }

  function upsertTarea(t: TareaTrato) {
    setTareas(prev => {
      const i = prev.findIndex(x => x.id === t.id);
      if (i >= 0) { const c = [...prev]; c[i] = { ...c[i], ...t }; return c; }
      return [...prev, t];
    });
  }

  // Agrupa por subetapa (parte del proceso); las ad-hoc van al final.
  const grupos: { key: string; label: string; tareas: TareaTrato[] }[] = [];
  const idx = new Map<string, number>();
  for (const t of tareas) {
    const sub = subetapaDe(t.etiquetas) ?? ADHOC;
    let gi = idx.get(sub);
    if (gi === undefined) {
      gi = grupos.length;
      idx.set(sub, gi);
      grupos.push({ key: sub, label: sub === ADHOC ? "Otras tareas" : etapaInternaLabel(sub), tareas: [] });
    }
    grupos[gi].tareas.push(t);
  }
  // Ad-hoc siempre al final.
  grupos.sort((a, b) => (a.key === ADHOC ? 1 : 0) - (b.key === ADHOC ? 1 : 0));

  return (
    <div className="space-y-4">
      <button
        onClick={() => setModal({ mode: "crear" })}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-all text-sm font-medium"
      >
        <span className="w-5 h-5 rounded-full bg-[#B3985B]/15 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </span>
        Nueva tarea del trato
      </button>

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 bg-[#0d0d0d] border border-[#1a1a1a] animate-pulse rounded-2xl" />)}</div>
      ) : tareas.length === 0 ? (
        <p className="text-center text-xs text-[#555] py-6">Sin tareas para este trato todavía.</p>
      ) : (
        <div className="space-y-5">
          {grupos.map(grupo => {
            const colapsada = colapsadas.has(grupo.key);
            const hechas = grupo.tareas.filter(t => t.estado === "COMPLETADA").length;
            const pendientes = grupo.tareas.length - hechas;
            return (
            <div key={grupo.key}>
              <div className="group/sec flex items-center gap-2 mb-2 px-1">
                <button
                  onClick={() => toggleColapso(grupo.key)}
                  title={colapsada ? "Mostrar sección" : "Ocultar sección"}
                  className="flex items-center gap-2 min-w-0 group/btn"
                >
                  <ChevronDown
                    strokeWidth={2}
                    className={`w-3.5 h-3.5 text-[#555] group-hover/btn:text-[#B3985B] transition-transform ${colapsada ? "-rotate-90" : ""}`}
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B3985B] truncate">{grupo.label}</span>
                  <span className="text-[10px] text-[#555] shrink-0">{hechas}/{grupo.tareas.length}</span>
                </button>
                <div className="flex-1 h-px bg-[#1a1a1a]" />
                {pendientes > 0 && (
                  <button
                    onClick={(e) => marcarSeccionNoNecesario(e, grupo.tareas, grupo.label)}
                    title="Marcar toda la sección como no necesaria (luego puedes deseleccionar alguna)"
                    className="text-[10px] text-[#555] hover:text-gray-300 shrink-0 opacity-0 group-hover/sec:opacity-100 transition-opacity whitespace-nowrap"
                  >
                    No fue necesario
                  </button>
                )}
              </div>
              {!colapsada && (
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden divide-y divide-[#141414]">
                {grupo.tareas.map(t => {
                  const done = t.estado === "COMPLETADA";
                  const noNec = tieneTag(t.etiquetas, "no-necesario");
                  const hito = tieneTag(t.etiquetas, "hito");
                  const wa = canalDe(t.etiquetas) === "WHATSAPP" ? waUrl(telefono ?? null, t.notas) : null;
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
                          noNec ? "border-[#555] bg-[#1a1a1a] text-[#888] text-[10px]"
                               : done ? "border-green-500 bg-green-500/20 text-green-400 text-[10px]"
                               : "border-[#333] hover:border-[#B3985B] text-transparent"
                        }`}
                      >
                        {noNec ? "–" : done ? "✓" : ""}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${done ? "line-through text-gray-600" : "text-white"} transition-colors`}>
                          {t.titulo}
                        </p>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                          {hito && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300/80 px-2 py-0.5 rounded-full bg-emerald-950/30 border border-emerald-800/30 font-medium">
                              <Flag strokeWidth={1.75} className="w-3 h-3" /> Avanza etapa
                            </span>
                          )}
                          {noNec && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] font-medium">
                              <Ban strokeWidth={1.75} className="w-3 h-3" /> No fue necesario
                            </span>
                          )}
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
                          {t.fecha ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-[#111] font-medium">
                              <Calendar strokeWidth={1.75} className="w-3 h-3" /> {fechaCorta(t.fecha)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#555] px-2 py-0.5 rounded-full bg-[#111] font-medium">Sin agendar</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 self-center flex items-center gap-2">
                        {wa && (
                          <a
                            href={wa} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Abrir WhatsApp con el guion"
                            className="w-7 h-7 rounded-full bg-green-600/15 text-green-400 hover:bg-green-600/25 flex items-center justify-center transition-colors"
                          >
                            <MessageCircle strokeWidth={1.75} className="w-4 h-4" />
                          </a>
                        )}
                        {!done && (
                          <button
                            onClick={(e) => marcarNoNecesario(e, t)}
                            title="No fue necesario (marcar como hecha, sin avanzar etapa)"
                            className="text-[10px] text-[#555] hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            No fue necesario
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {modal && (
        <NuevaTareaModal
          open
          onClose={() => { setModal(null); load(); }}
          usuarios={usuarios}
          tipoInicial="TRATO"
          tratoIdInicial={tratoId}
          tratoNombre={tratoNombre}
          tareaIdEdicion={modal.mode === "editar" ? modal.tareaId : null}
          onCreated={(t) => upsertTarea(t as TareaTrato)}
        />
      )}
    </div>
  );
}
