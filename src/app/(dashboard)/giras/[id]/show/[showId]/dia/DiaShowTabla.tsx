"use client";

/**
 * El día del show, momento por momento. Es la misma tabla que alimenta los
 * horarios ancla de la ficha: los ocho de plantilla son el esqueleto —salen
 * marcados— y lo demás es lo que esta fecha sí trae (meet and greet, prensa,
 * prueba de vestuario). Todo vive en el mismo renglón, con inicio, fin,
 * responsable, lugar y notas, porque es lo que se imprime en el day sheet.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import HoraInput from "@/components/ui/HoraInput";
import {
  MOMENTOS_PLANTILLA,
  MOMENTOS_SUGERIDOS,
  TIPOS_BLOQUE,
  TIPO_BLOQUE_COLOR,
  TIPO_BLOQUE_LABEL,
  duracionBloque,
  fmtDuracion,
  minutosDeJornada,
  ordenarBloques,
} from "@/lib/giras";
import { fmt24to12 } from "@/lib/hora";

export interface MomentoFila {
  id: string;
  llave: string | null;
  titulo: string;
  hora: string | null;
  horaFin: string | null;
  tipo: string;
  esAncla: boolean;
  responsable: string | null;
  lugar: string | null;
  notas: string | null;
  orden: number;
}

interface Props {
  showId: string;
  momentosIniciales: MomentoFila[];
}

type Campos = Partial<Record<keyof MomentoFila, unknown>>;

const DEMORA_GUARDADO = 700;

interface Nuevo {
  titulo: string;
  tipo: string;
  hora: string;
}

const NUEVO: Nuevo = { titulo: "", tipo: "LOGISTICA", hora: "" };

export default function DiaShowTabla({ showId, momentosIniciales }: Props) {
  const toast = useToast();
  const confirmar = useConfirm();

  const [momentos, setMomentos] = useState<MomentoFila[]>(momentosIniciales);
  const [nuevo, setNuevo] = useState<Nuevo | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [guardados, setGuardados] = useState<Set<string>>(new Set());

  const pendientes = useRef(new Map<string, Campos>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/gira-shows/${showId}/momentos`);
    if (!res.ok) return;
    const d = await res.json();
    setMomentos((d.momentos ?? []) as MomentoFila[]);
  }, [showId]);

  // El día en blanco no existe: el GET siembra el esqueleto de plantilla la
  // primera vez que alguien abre el show, así que se pide una sola vez.
  useEffect(() => {
    if (momentosIniciales.length === 0) void cargar();
  }, [momentosIniciales.length, cargar]);

  // ── Guardado por renglón ───────────────────────────────────────────────────
  async function descargar(momentoId: string) {
    const campos = pendientes.current.get(momentoId);
    pendientes.current.delete(momentoId);
    const t = timers.current.get(momentoId);
    if (t) clearTimeout(t);
    timers.current.delete(momentoId);
    if (!campos) return;

    const res = await fetch(`/api/show-momentos/${momentoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo guardar el momento");
      return;
    }
    // La fila no se reemplaza con la respuesta: el usuario puede seguir escribiendo.
    setGuardados((prev) => new Set(prev).add(momentoId));
    setTimeout(
      () =>
        setGuardados((prev) => {
          const s = new Set(prev);
          s.delete(momentoId);
          return s;
        }),
      1500,
    );
  }

  function editar(momentoId: string, campos: Campos, inmediato = false) {
    setMomentos((prev) => prev.map((m) => (m.id === momentoId ? ({ ...m, ...campos } as MomentoFila) : m)));
    pendientes.current.set(momentoId, { ...(pendientes.current.get(momentoId) ?? {}), ...campos });
    const t = timers.current.get(momentoId);
    if (t) clearTimeout(t);
    if (inmediato) {
      void descargar(momentoId);
      return;
    }
    timers.current.set(momentoId, setTimeout(() => void descargar(momentoId), DEMORA_GUARDADO));
  }

  async function descargarTodo() {
    await Promise.all([...pendientes.current.keys()].map((id) => descargar(id)));
  }

  // ── Acciones ───────────────────────────────────────────────────────────────
  async function agregar(cuerpo: Record<string, unknown>) {
    await descargarTodo();
    setTrabajando(true);
    try {
      const res = await fetch(`/api/gira-shows/${showId}/momentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo agregar el momento");
        return;
      }
      setMomentos((prev) => [...prev, d.momento as MomentoFila]);
    } finally {
      setTrabajando(false);
    }
  }

  async function agregarManual() {
    if (!nuevo?.titulo.trim()) return;
    await agregar({ titulo: nuevo.titulo, tipo: nuevo.tipo, hora: nuevo.hora || null });
    setNuevo({ ...NUEVO, tipo: nuevo.tipo });
  }

  async function quitar(m: MomentoFila) {
    const ok = await confirmar({
      message: m.esAncla
        ? `¿Quitar «${m.titulo}» del día? Es parte del esqueleto, así que también desaparece de los horarios ancla de la ficha.`
        : `¿Quitar «${m.titulo}» del día?`,
      danger: true,
      confirmText: "Quitar",
    });
    if (!ok) return;
    const res = await fetch(`/api/show-momentos/${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar el momento");
      return;
    }
    setMomentos((prev) => prev.filter((x) => x.id !== m.id));
  }

  /// Reordenar solo decide entre los momentos sin hora: en cuanto hay reloj, el
  /// reloj manda y mover el renglón no cambiaría nada.
  function mover(index: number, delta: number) {
    const a = ordenados[index];
    const b = ordenados[index + delta];
    if (!a || !b) return;
    editar(a.id, { orden: b.orden }, true);
    editar(b.id, { orden: a.orden }, true);
  }

  // ── Derivados ──────────────────────────────────────────────────────────────
  const ordenados = useMemo(() => ordenarBloques(momentos), [momentos]);

  const conHora = ordenados.filter((m) => minutosDeJornada(m.hora) !== null);
  const sinHora = ordenados.length - conHora.length;
  const sinResponsable = ordenados.filter((m) => !m.responsable?.trim()).length;
  const anclas = ordenados.filter((m) => m.esAncla).length;

  /// Lo que se agrega de un clic: el esqueleto que falte primero (si alguien lo
  /// borró) y luego los momentos que aparecen seguido pero no en todas las fechas.
  const sugeridos = useMemo(() => {
    const estan = new Set(momentos.map((m) => m.llave).filter((l): l is string => !!l));
    return [...MOMENTOS_PLANTILLA, ...MOMENTOS_SUGERIDOS].filter((p) => !estan.has(p.llave));
  }, [momentos]);

  // La jornada se mide de la primera hora a la última que haya, sea de inicio o
  // de fin: así el load out de la madrugada cuenta en el largo del día.
  const jornada = useMemo(() => {
    const marcas = ordenados
      .flatMap((m) => [minutosDeJornada(m.hora), minutosDeJornada(m.horaFin)])
      .filter((x): x is number => x !== null);
    if (marcas.length < 2) return null;
    return Math.max(...marcas) - Math.min(...marcas);
  }, [ordenados]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Momentos del día</p>
          <p className="text-white text-lg font-semibold">{ordenados.length}</p>
          <p className="ms-meta">
            {anclas} del esqueleto · {ordenados.length - anclas} de esta fecha
          </p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Largo de la jornada</p>
          <p className="text-white text-lg font-semibold">{fmtDuracion(jornada)}</p>
          <p className="ms-meta">{conHora.length ? `arranca ${fmt24to12(conHora[0].hora)}` : "sin horas capturadas"}</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Sin hora</p>
          <p className={`text-lg font-semibold ${sinHora > 0 ? "text-amber-300" : "text-emerald-300"}`}>{sinHora}</p>
          <p className="ms-meta">pendientes de agendar</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Sin responsable</p>
          <p className={`text-lg font-semibold ${sinResponsable > 0 ? "text-amber-300" : "text-emerald-300"}`}>
            {sinResponsable}
          </p>
          <p className="ms-meta">nadie contesta por ese momento</p>
        </div>
      </div>

      {sugeridos.length > 0 && (
        <div className="ms-card-deep p-3">
          <p className="ms-label mb-2">Agregar de un clic</p>
          <div className="flex flex-wrap gap-1.5">
            {sugeridos.map((p) => (
              <button
                key={p.llave}
                onClick={() => void agregar({ llave: p.llave })}
                disabled={trabajando}
                className="ms-badge ms-badge-gray hover:text-white hover:border-[#B3985B]/40 transition-colors disabled:opacity-50"
                title={`${TIPO_BLOQUE_LABEL[p.tipo] ?? p.tipo}${p.rango ? " · dura un rato" : " · es un instante"}`}
              >
                + {p.titulo}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setNuevo((n) => (n ? null : { ...NUEVO }))} className="ms-btn-ghost">
          {nuevo ? "Cerrar" : "+ Momento a mano"}
        </button>
      </div>

      {nuevo && (
        <div className="ms-card-deep p-3 grid grid-cols-1 md:grid-cols-[1fr_170px_130px_auto] gap-2 items-end">
          <div>
            <label className="ms-label block mb-1">Qué pasa</label>
            <input
              value={nuevo.titulo}
              onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") void agregarManual();
              }}
              placeholder="ej. Prueba de vestuario"
              className="ms-input-inline w-full"
            />
          </div>
          <div>
            <label className="ms-label block mb-1">Fase</label>
            <select
              value={nuevo.tipo}
              onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
              className="ms-input-inline w-full"
            >
              {TIPOS_BLOQUE.map((t) => (
                <option key={t} value={t}>
                  {TIPO_BLOQUE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ms-label block mb-1">Hora</label>
            <HoraInput
              value={nuevo.hora}
              onChange={(v) => setNuevo({ ...nuevo, hora: v })}
              className="ms-input-inline w-full"
            />
          </div>
          <button
            onClick={() => void agregarManual()}
            disabled={!nuevo.titulo.trim() || trabajando}
            className="ms-btn-primary disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      )}

      {ordenados.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-gray-400">
            El día está en blanco. Agrega los momentos de siempre de un clic y abre los que necesiten detalle.
          </p>
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="min-w-[1240px] w-full">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th w-[60px]">Orden</th>
                <th className="ms-th w-[120px]">Inicio</th>
                <th className="ms-th w-[120px]">Fin</th>
                <th className="ms-th w-[90px]">Dura</th>
                <th className="ms-th w-[260px]">Qué pasa</th>
                <th className="ms-th w-[150px]">Fase</th>
                <th className="ms-th w-[180px]">Responsable</th>
                <th className="ms-th w-[180px]">Lugar</th>
                <th className="ms-th w-[220px]">Notas</th>
                <th className="ms-th w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {ordenados.map((m, i) => {
                const conReloj = minutosDeJornada(m.hora) !== null;
                return (
                  <tr key={m.id} className={`ms-tr align-top ${m.esAncla ? "bg-[#B3985B]/[0.04]" : ""}`}>
                    <td className="ms-td">
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={() => mover(i, -1)}
                          disabled={conReloj || i === 0}
                          className="text-[#555] hover:text-white disabled:opacity-25 disabled:hover:text-[#555] transition-colors leading-none"
                          title={conReloj ? "Este momento ya tiene hora: el reloj lo ordena" : "Subir"}
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => mover(i, 1)}
                          disabled={conReloj || i === ordenados.length - 1}
                          className="text-[#555] hover:text-white disabled:opacity-25 disabled:hover:text-[#555] transition-colors leading-none"
                          title={conReloj ? "Este momento ya tiene hora: el reloj lo ordena" : "Bajar"}
                        >
                          ▼
                        </button>
                      </div>
                    </td>
                    <td className="ms-td">
                      <HoraInput
                        value={m.hora}
                        onChange={(v) => editar(m.id, { hora: v || null }, true)}
                        className="ms-input-inline w-full"
                      />
                      {guardados.has(m.id) && <span className="ms-micro text-emerald-400">guardado</span>}
                    </td>
                    <td className="ms-td">
                      <HoraInput
                        value={m.horaFin}
                        onChange={(v) => editar(m.id, { horaFin: v || null }, true)}
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <span className="ms-meta">{fmtDuracion(duracionBloque(m.hora, m.horaFin))}</span>
                    </td>
                    <td className="ms-td">
                      <input
                        value={m.titulo}
                        onChange={(e) => editar(m.id, { titulo: e.target.value })}
                        className="ms-input-inline w-full"
                      />
                      {m.esAncla && <span className="ms-badge ms-badge-gold mt-1 inline-block">ancla</span>}
                    </td>
                    <td className="ms-td">
                      <select
                        value={m.tipo}
                        onChange={(e) => editar(m.id, { tipo: e.target.value }, true)}
                        className={`ms-input-inline w-full ${TIPO_BLOQUE_COLOR[m.tipo] ?? ""}`}
                      >
                        {TIPOS_BLOQUE.map((t) => (
                          <option key={t} value={t} className="bg-[#111] text-white">
                            {TIPO_BLOQUE_LABEL[t]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="ms-td">
                      <input
                        value={m.responsable ?? ""}
                        onChange={(e) => editar(m.id, { responsable: e.target.value })}
                        placeholder="¿quién contesta?"
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        value={m.lugar ?? ""}
                        onChange={(e) => editar(m.id, { lugar: e.target.value })}
                        placeholder="ej. Andén de carga"
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        value={m.notas ?? ""}
                        onChange={(e) => editar(m.id, { notas: e.target.value })}
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td text-right">
                      <button
                        onClick={() => void quitar(m)}
                        className="text-red-400/70 hover:text-red-300 transition-colors px-1"
                        title="Quitar el momento"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="ms-micro">
        Los renglones marcados <span className="text-[#B3985B]">ancla</span> son el esqueleto que también se ve en la
        ficha del show. Cada celda se guarda sola al dejar de escribir. El día se ordena por el reloj y lo que cae
        después de medianoche (load out, curfew) se lee al final de la jornada, no al principio.
      </p>
    </div>
  );
}
