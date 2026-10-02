"use client";

/**
 * Setlist de la gira y sus variantes por plaza. El repertorio se teclea una vez
 * en el base; la plaza que necesita otro orden o menos tiempo lo copia y lo
 * ajusta, para que las notas de audio, luces y video no se vuelvan a escribir.
 */

import { useRef, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { fmtFechaCorta, fmtMinSeg, segundosDesdeTexto } from "@/lib/giras";

export interface CancionFila {
  id: string;
  orden: number;
  titulo: string;
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

export default function SetlistPanel({ giraId, alcance, showId, setlistsIniciales }: Props) {
  const toast = useToast();
  const confirmar = useConfirm();

  const [setlists, setSetlists] = useState<SetlistFila[]>(setlistsIniciales);
  const [abierto, setAbierto] = useState<string | null>(
    // En la plaza se abre directo el setlist de ese día: es el que se va a leer.
    setlistsIniciales.find((s) => s.showId === showId)?.id ?? setlistsIniciales[0]?.id ?? null,
  );
  const [trabajando, setTrabajando] = useState(false);

  // Los temporizadores viven en un ref: si se recrearan en cada render, cada
  // tecla abriría un guardado nuevo en vez de reemplazar el pendiente.
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const timers = timersRef.current;

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

  async function agregarCancion(setlistId: string) {
    const res = await fetch(`/api/gira-setlists/${setlistId}/canciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: "" }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo agregar la canción");
      return;
    }
    setSetlists((prev) => prev.map((s) => (s.id === setlistId ? { ...s, canciones: [...s.canciones, d.cancion] } : s)));
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
              ? "El repertorio de esta plaza. Copia el base y ajústalo si el tiempo o el orden cambian."
              : "El base es el repertorio de la gira; cada plaza puede tener su variante."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {alcance === "SHOW" && base && (
            <button onClick={() => void crear(base.id)} disabled={trabajando} className="ms-btn-primary disabled:opacity-50">
              {trabajando ? "Copiando…" : "Copiar el setlist base a esta plaza"}
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
            Todavía no hay setlist. Crea el base de la gira y las plazas lo heredan con un clic.
          </p>
        </div>
      ) : (
        visibles.map((s) => {
          const expandido = abierto === s.id;
          const segundos = s.canciones.reduce((t, c) => t + (c.duracionSeg ?? 0), 0);
          const heredado = alcance === "SHOW" && s.showId !== showId;

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
                    {s.canciones.length} canciones
                    {segundos > 0 ? ` · ${Math.round(segundos / 60)} min cantados` : ""}
                    {s.duracionMin ? ` · ${s.duracionMin} min de slot` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
                      Es el setlist base de la gira (del que copian las plazas)
                    </label>
                  )}

                  {s.canciones.length === 0 ? (
                    <p className="ms-meta">Sin canciones todavía.</p>
                  ) : (
                    <div className="ms-table-wrapper overflow-x-auto">
                      <table className="min-w-[1280px] w-full">
                        <thead className="ms-thead">
                          <tr>
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
                          {s.canciones.map((c, i) => (
                            <tr key={c.id} className="ms-tr align-top">
                              <td className="ms-td ms-micro tabular-nums">{i + 1}</td>
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
                                    editarCancion(s.id, c.id, { bpm: e.target.value === "" ? null : Number(e.target.value) })
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => void agregarCancion(s.id)} className="ms-btn-ghost">
                      + Agregar canción
                    </button>
                    {alcance === "SHOW" && s.esBase && s.showId === null && (
                      <button onClick={() => void crear(s.id)} className="ms-btn-ghost">
                        Copiar este base a la plaza
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
