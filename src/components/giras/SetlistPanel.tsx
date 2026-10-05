"use client";

/**
 * Setlist de la gira y sus variantes por show. El repertorio se teclea una vez
 * en el base; el show que necesita otro orden o menos tiempo lo copia y lo
 * ajusta, para que las notas de audio, luces y video no se vuelvan a escribir.
 *
 * Los renglones que no son canción (intro, presentación, pausa, cierre) van en
 * la misma lista: son los que parten el show en bloques, y el bloque se deriva
 * de dónde caen en vez de capturarse aparte.
 */

import { Fragment, useRef, useState, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import {
  bloquesNormalizados,
  COLORES_BLOQUE,
  esCancion,
  fmtFechaCorta,
  fmtMinSeg,
  segmentarSetlist,
  segundosDesdeTexto,
  TIPOS_FILA_SETLIST,
  TIPO_FILA_SETLIST_LABEL,
} from "@/lib/giras";

export interface CancionFila {
  id: string;
  tipo: string;
  orden: number;
  titulo: string;
  bloqueNombre: string | null;
  bloqueColor: string | null;
  duracionSeg: number | null;
  tonalidad: string | null;
  bpm: number | null;
  conTrack: boolean;
  notasAudio: string | null;
  notasLuces: string | null;
  notasVideo: string | null;
  cambioInstrumento: string | null;
  notas: string | null;
}

export interface SetlistFila {
  id: string;
  showId: string | null;
  nombre: string;
  esBase: boolean;
  duracionMin: number | null;
  notas: string | null;
  canciones: CancionFila[];
  show: { id: string; fecha: Date | string; ciudad: string | null } | null;
}

interface Props {
  giraId: string;
  alcance: "GIRA" | "SHOW";
  showId?: string;
  setlistsIniciales: SetlistFila[];
}

const DEMORA_GUARDADO = 700;

/// Un renglón que se arrastra. La manija es su propia celda y no el renglón
/// entero: la fila está llena de inputs, y hacerla arrastrable completa
/// impediría seleccionar el texto de un título para corregirlo.
function RenglonArrastrable({ id, className, children }: { id: string; className: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <tr
      ref={setNodeRef}
      className={className}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : undefined,
        position: isDragging ? "relative" : undefined,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <td className="ms-td">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-[#444] hover:text-white transition-colors touch-none"
          title="Arrastrar para mover de lugar o de bloque"
        >
          ⠿
        </button>
      </td>
      {children}
    </tr>
  );
}

export default function SetlistPanel({ giraId, alcance, showId, setlistsIniciales }: Props) {
  const toast = useToast();
  const confirmar = useConfirm();

  const [setlists, setSetlists] = useState<SetlistFila[]>(setlistsIniciales);
  const [abierto, setAbierto] = useState<string | null>(
    // En el show se abre directo el setlist de ese día: es el que se va a leer.
    setlistsIniciales.find((s) => s.showId === showId)?.id ?? setlistsIniciales[0]?.id ?? null,
  );
  const [trabajando, setTrabajando] = useState(false);
  // Qué bloque tiene la paleta abierta, por el id de su ancla. La paleta se
  // despliega en el mismo renglón y no flotando: la tabla va dentro de un
  // contenedor con scroll horizontal, que recortaría cualquier popover.
  const [paleta, setPaleta] = useState<string | null>(null);

  // Los temporizadores viven en un ref: si se recrearan en cada render, cada
  // tecla abriría un guardado nuevo en vez de reemplazar el pendiente.
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const timers = timersRef.current;

  const sensores = useSensors(
    // Sin el umbral, un clic en la manija contaría como arrastre de cero píxeles
    // y se comería el foco de la celda.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Canciones ──────────────────────────────────────────────────────────────
  function editarCancion(setlistId: string, cancionId: string, campos: Partial<CancionFila>, inmediato = false) {
    setSetlists((prev) =>
      prev.map((s) =>
        s.id === setlistId
          ? { ...s, canciones: s.canciones.map((c) => (c.id === cancionId ? { ...c, ...campos } : c)) }
          : s,
      ),
    );

    const guardar = async () => {
      const res = await fetch(`/api/gira-setlist-canciones/${cancionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campos),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "No se pudo guardar la canción");
      }
    };

    const t = timers.get(cancionId);
    if (t) clearTimeout(t);
    if (inmediato) {
      void guardar();
      return;
    }
    timers.set(cancionId, setTimeout(() => void guardar(), DEMORA_GUARDADO));
  }

  async function agregarCancion(setlistId: string, tipo = "CANCION") {
    const res = await fetch(`/api/gira-setlists/${setlistId}/canciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: "", tipo }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo agregar la canción");
      return;
    }
    setSetlists((prev) => prev.map((s) => (s.id === setlistId ? { ...s, canciones: [...s.canciones, d.cancion] } : s)));
  }

  /// Un bloque nuevo es la pausa que lo abre más su primera canción: sin la
  /// pausa el renglón se pegaría a la tanda anterior, y sin la canción el
  /// bloque no existiría todavía.
  async function agregarBloque(setlistId: string) {
    const hayFilas = (setlists.find((s) => s.id === setlistId)?.canciones.length ?? 0) > 0;
    if (hayFilas) await agregarCancion(setlistId, "PAUSA");
    await agregarCancion(setlistId);
  }

  async function reordenar(setlistId: string, e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const previo = setlists;
    const s = previo.find((x) => x.id === setlistId);
    if (!s) return;

    const desde = s.canciones.findIndex((c) => c.id === active.id);
    const hasta = s.canciones.findIndex((c) => c.id === over.id);
    if (desde < 0 || hasta < 0) return;

    // El nombre y el color del bloque se reacomodan igual que en el servidor
    // para que la pantalla no muestre un bloque bautizado que al recargar
    // aparece sin nombre.
    const movidas = arrayMove(s.canciones, desde, hasta).map((c, i) => ({ ...c, orden: i * 10 }));
    const bloques = new Map(bloquesNormalizados(movidas).map((c) => [c.id, c]));
    const finales = movidas.map((c) => {
      const b = bloques.get(c.id);
      return b ? { ...c, bloqueNombre: b.bloqueNombre, bloqueColor: b.bloqueColor } : c;
    });

    setSetlists((prev) => prev.map((x) => (x.id === setlistId ? { ...x, canciones: finales } : x)));

    const res = await fetch(`/api/gira-setlists/${setlistId}/canciones/orden`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: finales.map((c) => c.id) }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo guardar el nuevo orden");
      setSetlists(previo);
    }
  }

  async function quitarCancion(setlistId: string, cancion: CancionFila) {
    const res = await fetch(`/api/gira-setlist-canciones/${cancion.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar la canción");
      return;
    }
    setSetlists((prev) =>
      prev.map((s) => (s.id === setlistId ? { ...s, canciones: s.canciones.filter((c) => c.id !== cancion.id) } : s)),
    );
  }

  // ── Setlists ───────────────────────────────────────────────────────────────
  function editarSetlist(id: string, campos: Partial<SetlistFila>, inmediato = false) {
    setSetlists((prev) => prev.map((s) => (s.id === id ? { ...s, ...campos } : s)));

    const guardar = async () => {
      const res = await fetch(`/api/gira-setlists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campos),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "No se pudo guardar el setlist");
        return;
      }
      // Marcar el base desmarca al anterior: se refleja en pantalla sin recargar.
      if (campos.esBase) {
        setSetlists((prev) => prev.map((s) => (s.id === id ? s : { ...s, esBase: false })));
      }
    };

    const t = timers.get(id);
    if (t) clearTimeout(t);
    if (inmediato) {
      void guardar();
      return;
    }
    timers.set(id, setTimeout(() => void guardar(), DEMORA_GUARDADO));
  }

  async function crear(copiarDeId?: string) {
    setTrabajando(true);
    try {
      const res = await fetch(`/api/giras/${giraId}/setlists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showId: alcance === "SHOW" ? showId : null,
          copiarDeId: copiarDeId ?? null,
          esBase: alcance === "GIRA" && !setlists.some((s) => s.esBase),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo crear el setlist");
        return;
      }
      setSetlists((prev) => [...prev, d.setlist]);
      setAbierto(d.setlist.id);
      toast.success(copiarDeId ? "Setlist copiado" : "Setlist creado");
    } finally {
      setTrabajando(false);
    }
  }

  async function quitarSetlist(s: SetlistFila) {
    const ok = await confirmar({
      title: "Quitar el setlist",
      message: `Se borran también sus ${s.canciones.length} canciones con sus notas de audio, luces y video. No se puede deshacer.`,
      confirmText: "Quitar setlist",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/gira-setlists/${s.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar el setlist");
      return;
    }
    setSetlists((prev) => prev.filter((x) => x.id !== s.id));
    toast.success("Setlist eliminado");
  }

  const base = setlists.find((s) => s.esBase);
  const visibles = alcance === "SHOW" ? setlists.filter((s) => s.showId === showId || s.esBase) : setlists;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ms-h2">Setlist</h2>
          <p className="ms-subtitle mt-0.5">
            {alcance === "SHOW"
              ? "El repertorio de este show. Copia el base y ajústalo si el tiempo o el orden cambian."
              : "El base es el repertorio de la gira; cada show puede tener su variante."}{" "}
            Arrastra un renglón de la manija para moverlo de lugar o de bloque.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {alcance === "SHOW" && base && (
            <button onClick={() => void crear(base.id)} disabled={trabajando} className="ms-btn-primary disabled:opacity-50">
              {trabajando ? "Copiando…" : "Copiar el setlist base a este show"}
            </button>
          )}
          <button onClick={() => void crear()} disabled={trabajando} className="ms-btn-secondary disabled:opacity-50">
            Setlist en blanco
          </button>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-gray-400">
            Todavía no hay setlist. Crea el base de la gira y los shows lo heredan con un clic.
          </p>
        </div>
      ) : (
        visibles.map((s) => {
          const expandido = abierto === s.id;
          const segundos = s.canciones.reduce((t, c) => t + (c.duracionSeg ?? 0), 0);
          const heredado = alcance === "SHOW" && s.showId !== showId;
          const segmentos = segmentarSetlist(s.canciones);
          const totalCanciones = s.canciones.filter((c) => esCancion(c.tipo)).length;
          const totalBloques = segmentos.filter((x) => x.clase === "bloque").length;

          return (
            <section key={s.id} className={`ms-card ${expandido ? "border-[#B3985B]/30" : ""}`}>
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-white truncate">
                    {s.nombre}
                    {s.esBase && <span className="ms-badge ms-badge-gold ml-2">Base de la gira</span>}
                    {s.show && (
                      <span className="ms-badge ms-badge-gray ml-2">
                        {fmtFechaCorta(s.show.fecha)} · {s.show.ciudad ?? "Sin ciudad"}
                      </span>
                    )}
                    {heredado && <span className="ms-badge ms-badge-sky ml-2">Heredado de la gira</span>}
                  </p>
                  <p className="ms-meta mt-0.5">
                    {totalCanciones} canciones
                    {totalBloques > 1 ? ` · ${totalBloques} bloques` : ""}
                    {segundos > 0 ? ` · ${Math.round(segundos / 60)} min cantados` : ""}
                    {s.duracionMin ? ` · ${s.duracionMin} min de slot` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {s.canciones.length > 0 && (
                    <a
                      href={`/api/gira-setlists/${s.id}/escenario`}
                      className="ms-micro text-[#6b7280] hover:text-white transition-colors"
                      title="PDF de letra gigante para pegar en el piso del escenario. El formato con membrete está en Documentos."
                    >
                      Descargar PDF de escenario
                    </a>
                  )}
                  <button
                    onClick={() => setAbierto(expandido ? null : s.id)}
                    className="ms-micro text-[#6b7280] hover:text-white transition-colors"
                  >
                    {expandido ? "Cerrar" : "Abrir"}
                  </button>
                </div>
              </div>

              {expandido && (
                <div className="px-4 pb-4 pt-1 border-t border-[#1a1a1a] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_1fr] gap-3">
                    <div>
                      <label className="ms-label block mb-1.5">Nombre</label>
                      <input
                        value={s.nombre}
                        onChange={(e) => editarSetlist(s.id, { nombre: e.target.value })}
                        className="ms-input"
                      />
                    </div>
                    <div>
                      <label className="ms-label block mb-1.5">Slot (min)</label>
                      <input
                        type="number"
                        min={0}
                        value={s.duracionMin ?? ""}
                        onChange={(e) =>
                          editarSetlist(s.id, { duracionMin: e.target.value === "" ? null : Number(e.target.value) })
                        }
                        placeholder="ej. 90"
                        className="ms-input"
                      />
                    </div>
                    <div>
                      <label className="ms-label block mb-1.5">Notas del setlist</label>
                      <input
                        value={s.notas ?? ""}
                        onChange={(e) => editarSetlist(s.id, { notas: e.target.value })}
                        placeholder="ej. sin encore por curfew"
                        className="ms-input"
                      />
                    </div>
                  </div>

                  {alcance === "GIRA" && !s.showId && (
                    <label className="flex items-center gap-2 ms-meta cursor-pointer">
                      <input
                        type="checkbox"
                        checked={s.esBase}
                        onChange={(e) => editarSetlist(s.id, { esBase: e.target.checked }, true)}
                        className="accent-[#B3985B] w-4 h-4"
                      />
                      Es el setlist base de la gira (del que copian los shows)
                    </label>
                  )}

                  {s.canciones.length === 0 ? (
                    <p className="ms-meta">Sin canciones todavía.</p>
                  ) : (
                    <DndContext
                      sensors={sensores}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => void reordenar(s.id, e)}
                    >
                      <SortableContext items={s.canciones.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                        <div className="ms-table-wrapper overflow-x-auto">
                      <table className="min-w-[1410px] w-full">
                        <thead className="ms-thead">
                          <tr>
                            <th className="ms-th w-[30px]" />
                            <th className="ms-th w-[120px]">Tipo</th>
                            <th className="ms-th w-[40px]">#</th>
                            <th className="ms-th w-[240px]">Canción</th>
                            <th className="ms-th w-[90px]">Dura</th>
                            <th className="ms-th w-[80px]">Tono</th>
                            <th className="ms-th w-[70px]">BPM</th>
                            <th className="ms-th w-[60px]">Track</th>
                            <th className="ms-th w-[180px]">Audio</th>
                            <th className="ms-th w-[180px]">Luces</th>
                            <th className="ms-th w-[180px]">Video</th>
                            <th className="ms-th w-[160px]">Cambio de instrumento</th>
                            <th className="ms-th w-[40px]" />
                          </tr>
                        </thead>
                        <tbody>
                          {segmentos.map((seg) => {
                            if (seg.clase === "momento") {
                              const c = seg.fila;
                              return (
                                <RenglonArrastrable key={c.id} id={c.id} className="ms-tr align-top bg-[#121212]">
                                  <td className="ms-td">
                                    <select
                                      value={c.tipo}
                                      onChange={(e) => editarCancion(s.id, c.id, { tipo: e.target.value }, true)}
                                      className="ms-input-inline w-full"
                                    >
                                      {TIPOS_FILA_SETLIST.map((t) => (
                                        <option key={t} value={t}>
                                          {TIPO_FILA_SETLIST_LABEL[t]}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="ms-td ms-micro text-[#555]">—</td>
                                  <td className="ms-td">
                                    <input
                                      value={c.titulo}
                                      onChange={(e) => editarCancion(s.id, c.id, { titulo: e.target.value })}
                                      placeholder="ej. Intro (video)"
                                      className="ms-input-inline w-full"
                                    />
                                  </td>
                                  <td className="ms-td">
                                    <input
                                      defaultValue={fmtMinSeg(c.duracionSeg)}
                                      onBlur={(e) =>
                                        editarCancion(s.id, c.id, { duracionSeg: segundosDesdeTexto(e.target.value) }, true)
                                      }
                                      placeholder="1:30"
                                      className="ms-input-inline w-full"
                                    />
                                  </td>
                                  <td className="ms-td" colSpan={7}>
                                    <input
                                      value={c.notas ?? ""}
                                      onChange={(e) => editarCancion(s.id, c.id, { notas: e.target.value })}
                                      placeholder="Qué pasa en este momento: video pregrabado, cambio de vestuario, presentación de la banda…"
                                      className="ms-input-inline w-full"
                                    />
                                  </td>
                                  <td className="ms-td text-right">
                                    <button
                                      onClick={() => void quitarCancion(s.id, c)}
                                      className="text-[#555] hover:text-red-400 transition-colors"
                                      title="Quitar momento"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </RenglonArrastrable>
                              );
                            }

                            const segundosBloque = seg.canciones.reduce((t, x) => t + (x.fila.duracionSeg ?? 0), 0);

                            return (
                              <Fragment key={seg.clave}>
                                <tr className="bg-[#0d0d0d]">
                                  <td className="ms-td" colSpan={13}>
                                    <span className="inline-flex items-center gap-2">
                                      <button
                                        onClick={() => setPaleta(paleta === seg.anclaId ? null : seg.anclaId)}
                                        className="inline-flex items-center justify-center w-5 h-5 rounded-sm text-[11px] font-bold text-black"
                                        style={{ backgroundColor: seg.color }}
                                        title="Cambiar el color del bloque"
                                      >
                                        {seg.numero}
                                      </button>
                                      <input
                                        value={seg.nombre ?? ""}
                                        onChange={(e) => editarCancion(s.id, seg.anclaId, { bloqueNombre: e.target.value })}
                                        placeholder={`Bloque ${seg.numero}`}
                                        title="Cómo le dice el crew a esta tanda"
                                        className="ms-input-inline w-[200px] text-white"
                                      />
                                      {paleta === seg.anclaId ? (
                                        <span className="inline-flex items-center gap-1">
                                          {COLORES_BLOQUE.map((col) => (
                                            <button
                                              key={col}
                                              onClick={() => {
                                                editarCancion(s.id, seg.anclaId, { bloqueColor: col }, true);
                                                setPaleta(null);
                                              }}
                                              className={`w-5 h-5 rounded-sm ${
                                                seg.color === col ? "ring-2 ring-white ring-offset-1 ring-offset-[#0d0d0d]" : ""
                                              }`}
                                              style={{ backgroundColor: col }}
                                              title={col}
                                            />
                                          ))}
                                          <button
                                            onClick={() => {
                                              editarCancion(s.id, seg.anclaId, { bloqueColor: null }, true);
                                              setPaleta(null);
                                            }}
                                            className="ms-micro text-[#9ca3af] hover:text-white px-1"
                                            title="Volver al color que le toca por su número"
                                          >
                                            Automático
                                          </button>
                                        </span>
                                      ) : (
                                        <span className="ms-micro text-[#9ca3af]">
                                          {seg.canciones.length} canciones
                                          {segundosBloque > 0 ? ` · ${Math.round(segundosBloque / 60)} min` : ""}
                                        </span>
                                      )}
                                    </span>
                                  </td>
                                </tr>
                                {seg.canciones.map(({ fila: c, posicion }) => (
                                  <RenglonArrastrable key={c.id} id={c.id} className="ms-tr align-top">
                                    <td className="ms-td">
                                      <select
                                        value={c.tipo}
                                        onChange={(e) => editarCancion(s.id, c.id, { tipo: e.target.value }, true)}
                                        className="ms-input-inline w-full"
                                      >
                                        {TIPOS_FILA_SETLIST.map((t) => (
                                          <option key={t} value={t}>
                                            {TIPO_FILA_SETLIST_LABEL[t]}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="ms-td ms-micro tabular-nums">{posicion}</td>
                                    <td className="ms-td">
                                      <input
                                        value={c.titulo}
                                        onChange={(e) => editarCancion(s.id, c.id, { titulo: e.target.value })}
                                        placeholder="Título"
                                        className="ms-input-inline w-full"
                                      />
                                    </td>
                                    <td className="ms-td">
                                      <input
                                        defaultValue={fmtMinSeg(c.duracionSeg)}
                                        onBlur={(e) =>
                                          editarCancion(s.id, c.id, { duracionSeg: segundosDesdeTexto(e.target.value) }, true)
                                        }
                                        placeholder="3:45"
                                        className="ms-input-inline w-full"
                                      />
                                    </td>
                                    <td className="ms-td">
                                      <input
                                        value={c.tonalidad ?? ""}
                                        onChange={(e) => editarCancion(s.id, c.id, { tonalidad: e.target.value })}
                                        placeholder="Am"
                                        className="ms-input-inline w-full"
                                      />
                                    </td>
                                    <td className="ms-td">
                                      <input
                                        type="number"
                                        min={0}
                                        value={c.bpm ?? ""}
                                        onChange={(e) =>
                                          editarCancion(s.id, c.id, {
                                            bpm: e.target.value === "" ? null : Number(e.target.value),
                                          })
                                        }
                                        className="ms-input-inline w-full"
                                      />
                                    </td>
                                    <td className="ms-td text-center">
                                      <input
                                        type="checkbox"
                                        checked={c.conTrack}
                                        onChange={(e) => editarCancion(s.id, c.id, { conTrack: e.target.checked }, true)}
                                        className="accent-[#B3985B] w-4 h-4"
                                        title="Lleva track"
                                      />
                                    </td>
                                    <td className="ms-td">
                                      <input
                                        value={c.notasAudio ?? ""}
                                        onChange={(e) => editarCancion(s.id, c.id, { notasAudio: e.target.value })}
                                        placeholder="…"
                                        className="ms-input-inline w-full"
                                      />
                                    </td>
                                    <td className="ms-td">
                                      <input
                                        value={c.notasLuces ?? ""}
                                        onChange={(e) => editarCancion(s.id, c.id, { notasLuces: e.target.value })}
                                        placeholder="…"
                                        className="ms-input-inline w-full"
                                      />
                                    </td>
                                    <td className="ms-td">
                                      <input
                                        value={c.notasVideo ?? ""}
                                        onChange={(e) => editarCancion(s.id, c.id, { notasVideo: e.target.value })}
                                        placeholder="…"
                                        className="ms-input-inline w-full"
                                      />
                                    </td>
                                    <td className="ms-td">
                                      <input
                                        value={c.cambioInstrumento ?? ""}
                                        onChange={(e) => editarCancion(s.id, c.id, { cambioInstrumento: e.target.value })}
                                        placeholder="ej. acústica"
                                        className="ms-input-inline w-full"
                                      />
                                    </td>
                                    <td className="ms-td text-right">
                                      <button
                                        onClick={() => void quitarCancion(s.id, c)}
                                        className="text-[#555] hover:text-red-400 transition-colors"
                                        title="Quitar canción"
                                      >
                                        ✕
                                      </button>
                                    </td>
                                  </RenglonArrastrable>
                                ))}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => void agregarCancion(s.id)} className="ms-btn-ghost">
                      + Agregar canción
                    </button>
                    <button onClick={() => void agregarCancion(s.id, "PAUSA")} className="ms-btn-ghost">
                      + Agregar pausa
                    </button>
                    <button onClick={() => void agregarBloque(s.id)} className="ms-btn-ghost">
                      + Agregar bloque
                    </button>
                    {alcance === "SHOW" && s.esBase && s.showId === null && (
                      <button onClick={() => void crear(s.id)} className="ms-btn-ghost">
                        Copiar este base al show
                      </button>
                    )}
                    <button
                      onClick={() => void quitarSetlist(s)}
                      className="ms-btn-ghost text-red-400/80 hover:text-red-300 ml-auto"
                    >
                      Quitar setlist
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
