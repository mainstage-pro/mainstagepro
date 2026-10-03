"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronDown, MapPin, Music, Plus, Trash2, User } from "lucide-react";
import NuevaTareaModal from "../../app/(dashboard)/operaciones/components/NuevaTareaModal";
import { ESTADOS_CHECKLIST, FRENTES, type FrenteKey } from "@/lib/gira-advance-checklist";

export interface ItemChecklist {
  id: string;
  showId: string | null;
  frente: string;
  item: string;
  detalle: string | null;
  llave: string | null;
  estado: string;
  responsable: string | null;
  notas: string | null;
}

export interface ShowLigero {
  id: string;
  fecha: string;
  ciudad: string | null;
  venue: string | null;
}

export interface TareaGira {
  id: string;
  titulo: string;
  prioridad: string;
  estado: string;
  fecha: string | null;
  giraShowId: string | null;
  asignadoA: { id: string; name: string } | null;
}

interface Usuario { id: string; name: string }

const PRIO_COLOR: Record<string, string> = {
  URGENTE: "#f87171", ALTA: "#fb923c", MEDIA: "#B3985B", BAJA: "#555",
};

// El estado y el frente llegan de la BD como string, no como el literal de la
// plantilla: los mapas se tipan con llave string a propósito.
const ESTADO_MAP = new Map<string, (typeof ESTADOS_CHECKLIST)[number]>(ESTADOS_CHECKLIST.map(e => [e.key, e]));
const FRENTE_MAP = new Map<string, (typeof FRENTES)[number]>(FRENTES.map(f => [f.key, f]));

function fechaCorta(iso: string): string {
  return new Date(iso.substring(0, 10) + "T00:00:00").toLocaleDateString("es-MX", {
    weekday: "short", day: "numeric", month: "short",
  });
}

/** Un renglón del checklist: estado en 4 toques, nota y responsable inline. */
function Renglon({
  item, onPatch, onDelete,
}: {
  item: ItemChecklist;
  onPatch: (cambios: Partial<ItemChecklist>) => void;
  onDelete: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [notas, setNotas] = useState(item.notas ?? "");
  const [responsable, setResponsable] = useState(item.responsable ?? "");
  const est = ESTADO_MAP.get(item.estado) ?? ESTADOS_CHECKLIST[0];
  const resuelto = item.estado === "LISTO" || item.estado === "NO_APLICA";

  // Siguiente estado al tocar el círculo: sin pedir → pedido → resuelto → sin pedir.
  const siguiente = item.estado === "PENDIENTE" ? "PEDIDO" : item.estado === "PEDIDO" ? "LISTO" : "PENDIENTE";

  return (
    <div className="group">
      <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#0f0f0f] transition-colors">
        <button
          onClick={() => onPatch({ estado: siguiente })}
          title={`${est.label} — toca para marcar «${ESTADO_MAP.get(siguiente)?.label}»`}
          className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all text-[10px]"
          style={{
            borderColor: est.color,
            background: item.estado === "LISTO" ? est.color + "33" : "transparent",
            color: est.color,
          }}
        >
          {item.estado === "LISTO" ? "✓" : item.estado === "PEDIDO" ? "·" : item.estado === "NO_APLICA" ? "–" : ""}
        </button>

        <button onClick={() => setAbierto(a => !a)} className="flex-1 min-w-0 text-left">
          <p className={`text-[13px] leading-snug ${resuelto ? "text-gray-600" : "text-white"}`}>
            {item.item}
          </p>
          <div className="flex items-center flex-wrap gap-1.5 mt-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ color: est.color, background: est.color + "18" }}>
              {est.label}
            </span>
            {item.responsable && (
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-[#1a1a1a]">
                <User strokeWidth={1.75} className="w-3 h-3" /> {item.responsable}
              </span>
            )}
            {item.notas && !abierto && (
              <span className="text-[10px] text-[#666] truncate max-w-[22rem]">— {item.notas}</span>
            )}
          </div>
        </button>

        <div className="shrink-0 flex items-center gap-2 self-center">
          {item.estado !== "NO_APLICA" && (
            <button
              onClick={() => onPatch({ estado: "NO_APLICA" })}
              className="text-[10px] text-[#555] hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
            >
              No aplica
            </button>
          )}
          {!item.llave && (
            <button
              onClick={onDelete}
              title="Borrar renglón"
              className="text-[#444] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 strokeWidth={1.75} className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {abierto && (
        <div className="px-4 pb-3 pl-12 space-y-2">
          {item.detalle && <p className="text-[11.5px] text-[#7d8590] leading-relaxed">{item.detalle}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              value={responsable}
              onChange={e => setResponsable(e.target.value)}
              onBlur={() => { if (responsable !== (item.responsable ?? "")) onPatch({ responsable }); }}
              placeholder="¿Quién lo persigue?"
              className="ms-input-inline sm:col-span-1"
            />
            <input
              value={notas}
              onChange={e => setNotas(e.target.value)}
              onBlur={() => { if (notas !== (item.notas ?? "")) onPatch({ notas }); }}
              placeholder="Qué contestaron, qué falta…"
              className="ms-input-inline sm:col-span-2"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Bloque de un frente (management / venue / promotor / nosotros). */
function BloqueFrente({
  frente, items, onPatch, onDelete, onAgregar,
}: {
  frente: FrenteKey;
  items: ItemChecklist[];
  onPatch: (id: string, cambios: Partial<ItemChecklist>) => void;
  onDelete: (id: string) => void;
  onAgregar: (frente: FrenteKey, texto: string) => void;
}) {
  const [nuevo, setNuevo] = useState("");
  const def = FRENTE_MAP.get(frente)!;
  const resueltos = items.filter(i => i.estado === "LISTO" || i.estado === "NO_APLICA").length;

  if (items.length === 0) return null;

  return (
    <div className="ms-card-deep overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#141414]">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: def.color }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider truncate" style={{ color: def.color }}>
          {def.label}
        </span>
        <span className="text-[10px] text-[#555] shrink-0">{resueltos}/{items.length}</span>
      </div>

      <div className="divide-y divide-[#141414]">
        {items.map(i => (
          <Renglon
            key={i.id}
            item={i}
            onPatch={cambios => onPatch(i.id, cambios)}
            onDelete={() => onDelete(i.id)}
          />
        ))}
      </div>

      <div className="px-4 py-2 border-t border-[#141414]">
        <input
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && nuevo.trim()) { onAgregar(frente, nuevo.trim()); setNuevo(""); }
          }}
          placeholder="Agregar renglón y Enter…"
          className="w-full bg-transparent text-[12px] text-white placeholder:text-[#3a3a3a] focus:outline-none py-1"
        />
      </div>
    </div>
  );
}

export default function PendientesGiraPanel({
  giraId, giraNombre, esTour, shows, itemsIniciales, usuarios,
}: {
  giraId: string;
  giraNombre: string;
  esTour: boolean;
  shows: ShowLigero[];
  itemsIniciales: ItemChecklist[];
  usuarios: Usuario[];
}) {
  const [items, setItems] = useState<ItemChecklist[]>(itemsIniciales);
  const [tareas, setTareas] = useState<TareaGira[]>([]);
  const [modal, setModal] = useState<
    { mode: "crear"; showId: string | null } | { mode: "editar"; tareaId: string } | null
  >(null);
  // Las fechas nacen colapsadas: con 5 shows, abrir todo es ilegible.
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  const cargarTareas = useCallback(async () => {
    const res = await fetch(`/api/giras/${giraId}/tareas`, { cache: "no-store" });
    if (res.ok) { const d = await res.json(); setTareas(d.tareas ?? []); }
  }, [giraId]);

  useEffect(() => { cargarTareas(); }, [cargarTareas]);

  async function patchItem(id: string, cambios: Partial<ItemChecklist>) {
    const antes = items.find(i => i.id === id);
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...cambios } : i)));
    const res = await fetch(`/api/giras/${giraId}/checklist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    });
    if (!res.ok && antes) setItems(prev => prev.map(i => (i.id === id ? antes : i)));
  }

  async function agregarItem(frente: FrenteKey, texto: string, showId: string | null) {
    const res = await fetch(`/api/giras/${giraId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frente, item: texto, showId }),
    });
    if (res.ok) { const d = await res.json(); setItems(prev => [...prev, d.item]); }
  }

  async function borrarItem(id: string) {
    const res = await fetch(`/api/giras/${giraId}/checklist/${id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id));
    else { const d = await res.json().catch(() => ({})); if (d?.error) alert(d.error); }
  }

  const deGira = useMemo(() => items.filter(i => !i.showId), [items]);
  const porShow = useMemo(() => {
    const m = new Map<string, ItemChecklist[]>();
    for (const i of items) if (i.showId) {
      const arr = m.get(i.showId) ?? [];
      arr.push(i);
      m.set(i.showId, arr);
    }
    return m;
  }, [items]);

  const tareasDeGira = tareas.filter(t => !t.giraShowId);
  const activas = (arr: TareaGira[]) => arr.filter(t => t.estado !== "COMPLETADA");

  function toggleShow(id: string) {
    setAbiertos(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const resueltosTotal = items.filter(i => i.estado === "LISTO" || i.estado === "NO_APLICA").length;
  const pct = items.length > 0 ? Math.round((resueltosTotal / items.length) * 100) : 0;

  function ListaTareas({ lista, showId }: { lista: TareaGira[]; showId: string | null }) {
    const vivas = activas(lista);
    return (
      <div className="space-y-1.5">
        {vivas.map(t => (
          <div
            key={t.id}
            onClick={() => setModal({ mode: "editar", tareaId: t.id })}
            className="flex items-start gap-2.5 px-3 py-2 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#2a2a2a] cursor-pointer transition-colors"
          >
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: PRIO_COLOR[t.prioridad] ?? "#555" }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-white leading-snug">{t.titulo}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {t.asignadoA ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-[#1a1a1a]">
                    <User strokeWidth={1.75} className="w-3 h-3" /> {t.asignadoA.name}
                  </span>
                ) : (
                  <span className="text-[10px] text-yellow-500/70 px-2 py-0.5 rounded-full bg-yellow-950/20">Sin asignar</span>
                )}
                {t.fecha ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-[#111]">
                    <Calendar strokeWidth={1.75} className="w-3 h-3" /> {fechaCorta(t.fecha)}
                  </span>
                ) : (
                  <span className="text-[10px] text-[#555] px-2 py-0.5 rounded-full bg-[#111]">Sin agendar</span>
                )}
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={() => setModal({ mode: "crear", showId })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[#1f1f1f] text-[12px] text-[#666] hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-colors"
        >
          <Plus strokeWidth={2} className="w-3.5 h-3.5" />
          {showId ? "Pendiente de esta fecha" : "Pendiente de la gira"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avance del checklist */}
      <div className="ms-card p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[12px] text-[#8b9099]">
            {resueltosTotal} de {items.length} renglones del advance resueltos
          </p>
          <span className={`text-sm font-semibold ${pct === 100 ? "text-green-400" : "text-[#B3985B]"}`}>{pct}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-green-500" : "bg-[#B3985B]"}`}
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* ── Alcance gira ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <h2 className="ms-h2">{esTour ? "De toda la gira" : "Del show"}</h2>
          <p className="ms-subtitle">
            Lo que se pide una vez y sirve para todas las fechas: el rider vigente, los contactos y el alcance.
          </p>
        </div>

        {FRENTES.map(f => (
          <BloqueFrente
            key={f.key}
            frente={f.key}
            items={deGira.filter(i => i.frente === f.key)}
            onPatch={patchItem}
            onDelete={borrarItem}
            onAgregar={(frente, texto) => agregarItem(frente, texto, null)}
          />
        ))}

        <div className="ms-card-deep p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Music strokeWidth={1.75} className="w-3.5 h-3.5 text-[#c084fc]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#c084fc]">
              Pendientes de la gira
            </span>
            <span className="text-[10px] text-[#555]">{activas(tareasDeGira).length} activos</span>
          </div>
          <p className="text-[11px] text-[#666] -mt-1">
            Tareas con responsable y fecha. Aparecen en Gestión Operativa junto a las de tratos y proyectos.
          </p>
          <ListaTareas lista={tareasDeGira} showId={null} />
        </div>
      </section>

      {/* ── Por fecha ─────────────────────────────────────────────────────── */}
      {shows.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="ms-h2">Por fecha</h2>
            <p className="ms-subtitle">
              Cada casa y cada promotor responden distinto. Esto se pregunta venue por venue.
            </p>
          </div>

          {shows.map(s => {
            const propios = porShow.get(s.id) ?? [];
            const resueltos = propios.filter(i => i.estado === "LISTO" || i.estado === "NO_APLICA").length;
            const tareasShow = tareas.filter(t => t.giraShowId === s.id);
            const abierto = abiertos.has(s.id);
            const pctShow = propios.length > 0 ? Math.round((resueltos / propios.length) * 100) : 0;

            return (
              <div key={s.id} className="ms-card overflow-hidden">
                <button
                  onClick={() => toggleShow(s.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#141414] transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {fechaCorta(s.fecha)}
                      {s.ciudad ? ` · ${s.ciudad}` : ""}
                    </p>
                    {s.venue && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#666] mt-0.5">
                        <MapPin strokeWidth={1.75} className="w-3 h-3" /> {s.venue}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    {activas(tareasShow).length > 0 && (
                      <span className="text-[10px] text-[#c084fc] px-2 py-0.5 rounded-full bg-[#c084fc]/10">
                        {activas(tareasShow).length} pendiente{activas(tareasShow).length !== 1 ? "s" : ""}
                      </span>
                    )}
                    <div className="text-right">
                      <p className={`text-xs font-semibold ${pctShow === 100 ? "text-green-400" : "text-[#B3985B]"}`}>{pctShow}%</p>
                      <p className="text-[10px] text-[#444]">{resueltos}/{propios.length}</p>
                    </div>
                    <ChevronDown strokeWidth={2}
                      className={`w-4 h-4 text-[#444] transition-transform ${abierto ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {abierto && (
                  <div className="px-3 pb-3 space-y-3 border-t border-[#141414] pt-3">
                    {FRENTES.map(f => (
                      <BloqueFrente
                        key={f.key}
                        frente={f.key}
                        items={propios.filter(i => i.frente === f.key)}
                        onPatch={patchItem}
                        onDelete={borrarItem}
                        onAgregar={(frente, texto) => agregarItem(frente, texto, s.id)}
                      />
                    ))}

                    <div className="ms-card-deep p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Music strokeWidth={1.75} className="w-3.5 h-3.5 text-[#c084fc]" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#c084fc]">
                          Pendientes de esta fecha
                        </span>
                      </div>
                      <ListaTareas lista={tareasShow} showId={s.id} />
                    </div>

                    <Link
                      href={`/giras/${giraId}/show/${s.id}/advance`}
                      className="block text-center text-[11px] text-[#B3985B] hover:underline py-1"
                    >
                      Ir al advance de esta fecha →
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {modal && (
        <NuevaTareaModal
          open
          onClose={() => { setModal(null); cargarTareas(); }}
          usuarios={usuarios}
          tipoInicial="GIRA"
          giraIdInicial={giraId}
          giraNombre={giraNombre}
          giraShowIdInicial={modal.mode === "crear" ? modal.showId : null}
          giraShowLabel={
            modal.mode === "crear" && modal.showId
              ? (() => {
                  const s = shows.find(x => x.id === modal.showId);
                  return s ? `${fechaCorta(s.fecha)}${s.ciudad ? ` · ${s.ciudad}` : ""}` : null;
                })()
              : null
          }
          tareaIdEdicion={modal.mode === "editar" ? modal.tareaId : null}
          onCreated={() => cargarTareas()}
        />
      )}
    </div>
  );
}
