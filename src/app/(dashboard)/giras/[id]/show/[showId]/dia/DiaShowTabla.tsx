"use client";

/**
 * Day sheet de la plaza: la jornada bloque por bloque. Los horarios gruesos del
 * resumen (load in, soundcheck, show) son el esqueleto; aquí se abren en el
 * detalle que se imprime y se reparte, con responsable y lugar de cada cosa.
 */

import { useMemo, useRef, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import HoraInput from "@/components/ui/HoraInput";
import {
  TIPOS_BLOQUE,
  TIPO_BLOQUE_COLOR,
  TIPO_BLOQUE_LABEL,
  duracionBloque,
  fmtDuracion,
  minutosDeJornada,
  ordenarBloques,
} from "@/lib/giras";
import { fmt24to12 } from "@/lib/hora";

export interface BloqueFila {
  id: string;
  hora: string | null;
  horaFin: string | null;
  titulo: string;
  tipo: string;
  responsable: string | null;
  lugar: string | null;
  notas: string | null;
  orden: number;
}

interface Props {
  showId: string;
  bloquesIniciales: BloqueFila[];
  /// Cuántos horarios gruesos tiene capturada la plaza: si son cero, sembrar no
  /// serviría de nada y hay que decirlo en vez de dejar el botón mintiendo.
  horariosPlaza: number;
}

type Campos = Partial<Record<keyof BloqueFila, unknown>>;

const DEMORA_GUARDADO = 700;

interface Nuevo {
  titulo: string;
  tipo: string;
  hora: string;
}

const NUEVO: Nuevo = { titulo: "", tipo: "LOGISTICA", hora: "" };

export default function DiaShowTabla({ showId, bloquesIniciales, horariosPlaza }: Props) {
  const toast = useToast();
  const confirmar = useConfirm();

  const [bloques, setBloques] = useState<BloqueFila[]>(bloquesIniciales);
  const [nuevo, setNuevo] = useState<Nuevo | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardados, setGuardados] = useState<Set<string>>(new Set());

  const pendientes = useRef(new Map<string, Campos>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // ── Guardado por renglón ───────────────────────────────────────────────────
  async function descargar(bloqueId: string) {
    const campos = pendientes.current.get(bloqueId);
    pendientes.current.delete(bloqueId);
    const t = timers.current.get(bloqueId);
    if (t) clearTimeout(t);
    timers.current.delete(bloqueId);
    if (!campos) return;

    const res = await fetch(`/api/gira-show-bloques/${bloqueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo guardar el bloque");
      return;
    }
    // La fila no se reemplaza con la respuesta: el usuario puede seguir escribiendo.
    setGuardados((prev) => new Set(prev).add(bloqueId));
    setTimeout(
      () =>
        setGuardados((prev) => {
          const s = new Set(prev);
          s.delete(bloqueId);
          return s;
        }),
      1500,
    );
  }

  function editar(bloqueId: string, campos: Campos, inmediato = false) {
    setBloques((prev) => prev.map((b) => (b.id === bloqueId ? ({ ...b, ...campos } as BloqueFila) : b)));
    pendientes.current.set(bloqueId, { ...(pendientes.current.get(bloqueId) ?? {}), ...campos });
    const t = timers.current.get(bloqueId);
    if (t) clearTimeout(t);
    if (inmediato) {
      void descargar(bloqueId);
      return;
    }
    timers.current.set(bloqueId, setTimeout(() => void descargar(bloqueId), DEMORA_GUARDADO));
  }

  async function descargarTodo() {
    await Promise.all([...pendientes.current.keys()].map((id) => descargar(id)));
  }

  // ── Acciones ───────────────────────────────────────────────────────────────
  async function sembrar() {
    await descargarTodo();
    setTrabajando(true);
    setAviso(null);
    try {
      const res = await fetch(`/api/gira-shows/${showId}/bloques/sembrar`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo armar el día");
        return;
      }
      setAviso(
        `Se agregaron ${d.agregados} bloques desde los horarios de la plaza` +
          (d.existentes ? `, ${d.existentes} ya estaban y no se tocaron` : "") +
          (d.sinHora ? `, ${d.sinHora} horarios siguen vacíos en el resumen` : "") +
          ".",
      );
      const lista = await fetch(`/api/gira-shows/${showId}/bloques`);
      if (lista.ok) {
        const dl = await lista.json();
        setBloques(dl.bloques ?? []);
      }
    } finally {
      setTrabajando(false);
    }
  }

  async function agregar() {
    if (!nuevo || !nuevo.titulo.trim()) return;
    const res = await fetch(`/api/gira-shows/${showId}/bloques`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: nuevo.titulo, tipo: nuevo.tipo, hora: nuevo.hora || null }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo agregar el bloque");
      return;
    }
    setBloques((prev) => [...prev, d.bloque]);
    setNuevo({ ...NUEVO, tipo: nuevo.tipo });
  }

  async function quitar(b: BloqueFila) {
    const ok = await confirmar({
      message: `¿Quitar «${b.titulo}» del día? Los horarios gruesos de la plaza no se tocan.`,
      danger: true,
      confirmText: "Quitar",
    });
    if (!ok) return;
    const res = await fetch(`/api/gira-show-bloques/${b.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar el bloque");
      return;
    }
    setBloques((prev) => prev.filter((x) => x.id !== b.id));
  }

  // ── Derivados ──────────────────────────────────────────────────────────────
  const ordenados = useMemo(() => ordenarBloques(bloques), [bloques]);

  const conHora = ordenados.filter((b) => minutosDeJornada(b.hora) !== null);
  const sinHora = ordenados.length - conHora.length;
  const sinResponsable = ordenados.filter((b) => !b.responsable?.trim()).length;

  // La jornada se mide de la primera hora a la última que haya, sea de inicio o
  // de fin: así el load out de la madrugada cuenta en el largo del día.
  const jornada = useMemo(() => {
    const marcas = ordenados
      .flatMap((b) => [minutosDeJornada(b.hora), minutosDeJornada(b.horaFin)])
      .filter((m): m is number => m !== null);
    if (marcas.length < 2) return null;
    return Math.max(...marcas) - Math.min(...marcas);
  }, [ordenados]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Bloques del día</p>
          <p className="text-white text-lg font-semibold">{ordenados.length}</p>
          <p className="ms-meta">{conHora.length} con hora en el reloj</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Largo de la jornada</p>
          <p className="text-white text-lg font-semibold">{fmtDuracion(jornada)}</p>
          <p className="ms-meta">
            {conHora.length ? `arranca ${fmt24to12(conHora[0].hora)}` : "sin horas capturadas"}
          </p>
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
          <p className="ms-meta">nadie contesta por ese bloque</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => void sembrar()}
          disabled={trabajando || horariosPlaza === 0}
          className="ms-btn-primary disabled:opacity-50"
          title={horariosPlaza === 0 ? "La plaza todavía no tiene horarios capturados en el resumen" : undefined}
        >
          {trabajando ? "Armando…" : "Armar el día desde los horarios de la plaza"}
        </button>
        <button onClick={() => setNuevo((n) => (n ? null : { ...NUEVO }))} className="ms-btn-ghost">
          {nuevo ? "Cerrar" : "+ Bloque"}
        </button>
      </div>

      {horariosPlaza === 0 && (
        <p className="text-xs text-amber-300">
          La plaza no tiene horarios gruesos capturados. Llénalos en el resumen de la plaza y vuelve para armar el día de
          un golpe, o captura los bloques a mano aquí.
        </p>
      )}
      {aviso && <p className="text-xs text-emerald-300">{aviso}</p>}

      {nuevo && (
        <div className="ms-card-deep p-3 grid grid-cols-1 md:grid-cols-[1fr_170px_130px_auto] gap-2 items-end">
          <div>
            <label className="ms-label block mb-1">Qué pasa</label>
            <input
              value={nuevo.titulo}
              onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") void agregar();
              }}
              placeholder="ej. Llegada del backline"
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
          <button onClick={() => void agregar()} disabled={!nuevo.titulo.trim()} className="ms-btn-primary disabled:opacity-50">
            Agregar
          </button>
        </div>
      )}

      {ordenados.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-gray-400">
            El día está en blanco. Ármalo desde los horarios de la plaza y luego abre los bloques que necesiten detalle.
          </p>
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="min-w-[1180px] w-full">
            <thead className="ms-thead">
              <tr>
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
              {ordenados.map((b) => (
                <tr key={b.id} className="ms-tr align-top">
                  <td className="ms-td">
                    <HoraInput
                      value={b.hora}
                      onChange={(v) => editar(b.id, { hora: v || null }, true)}
                      className="ms-input-inline w-full"
                    />
                    {guardados.has(b.id) && <span className="ms-micro text-emerald-400">guardado</span>}
                  </td>
                  <td className="ms-td">
                    <HoraInput
                      value={b.horaFin}
                      onChange={(v) => editar(b.id, { horaFin: v || null }, true)}
                      className="ms-input-inline w-full"
                    />
                  </td>
                  <td className="ms-td">
                    <span className="ms-meta">{fmtDuracion(duracionBloque(b.hora, b.horaFin))}</span>
                  </td>
                  <td className="ms-td">
                    <input
                      value={b.titulo}
                      onChange={(e) => editar(b.id, { titulo: e.target.value })}
                      className="ms-input-inline w-full"
                    />
                  </td>
                  <td className="ms-td">
                    <select
                      value={b.tipo}
                      onChange={(e) => editar(b.id, { tipo: e.target.value }, true)}
                      className={`ms-input-inline w-full ${TIPO_BLOQUE_COLOR[b.tipo] ?? ""}`}
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
                      value={b.responsable ?? ""}
                      onChange={(e) => editar(b.id, { responsable: e.target.value })}
                      placeholder="¿quién contesta?"
                      className="ms-input-inline w-full"
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      value={b.lugar ?? ""}
                      onChange={(e) => editar(b.id, { lugar: e.target.value })}
                      placeholder="ej. Andén de carga"
                      className="ms-input-inline w-full"
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      value={b.notas ?? ""}
                      onChange={(e) => editar(b.id, { notas: e.target.value })}
                      className="ms-input-inline w-full"
                    />
                  </td>
                  <td className="ms-td text-right">
                    <button
                      onClick={() => void quitar(b)}
                      className="text-red-400/70 hover:text-red-300 transition-colors px-1"
                      title="Quitar el bloque"
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

      <p className="ms-micro">
        Cada celda se guarda sola al dejar de escribir. El día se ordena por el reloj y lo que cae después de medianoche
        (load out, curfew) se lee al final de la jornada, no al principio.
      </p>
    </div>
  );
}
