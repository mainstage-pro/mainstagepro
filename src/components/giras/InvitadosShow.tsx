"use client";

/**
 * Quién se sube al escenario en esta fecha además del artista, y qué consume en
 * consola.
 *
 * El rider maestro es el mismo para toda la gira; lo que cambia de plaza en plaza
 * es el telonero, el featuring que cae en la tercera canción, el presentador. Cada
 * uno ocupa canales que nadie contempló, y eso se descubre el día del show si no
 * se captura antes. Aquí se captura: un renglón por persona, y los requerimientos
 * se prenden como interruptores que hacen nacer el canal a continuación del rider.
 *
 * Este componente es el dueño del estado de las dos cosas (invitados y listas de
 * canales) porque prender un requerimiento mueve las dos a la vez.
 */

import { useCallback, useRef, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { REQUERIMIENTOS_INVITADO, ROLES_INVITADO, ROL_INVITADO_LABEL } from "@/lib/giras";
import type { InvitadoConCanales, ListasDelShow } from "@/lib/show-canales";
import CanalesShow from "./CanalesShow";

interface Props {
  showId: string;
  invitadosIniciales: InvitadoConCanales[];
  listasIniciales: ListasDelShow;
}

interface Nuevo {
  nombre: string;
  rol: string;
  momento: string;
}

const NUEVO: Nuevo = { nombre: "", rol: "TELONERO", momento: "" };

const DEMORA_GUARDADO = 700;

export default function InvitadosShow({ showId, invitadosIniciales, listasIniciales }: Props) {
  const toast = useToast();
  const confirmar = useConfirm();

  const [invitados, setInvitados] = useState<InvitadoConCanales[]>(invitadosIniciales);
  const [listas, setListas] = useState<ListasDelShow>(listasIniciales);
  const [nuevo, setNuevo] = useState<Nuevo | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [guardados, setGuardados] = useState<Set<string>>(new Set());

  const pendientes = useRef(new Map<string, Record<string, unknown>>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const cargarInvitados = useCallback(async () => {
    const res = await fetch(`/api/gira-shows/${showId}/invitados`);
    if (!res.ok) return;
    const d = await res.json();
    setInvitados((d.invitados ?? []) as InvitadoConCanales[]);
  }, [showId]);

  const recargarListas = useCallback(async () => {
    const res = await fetch(`/api/gira-shows/${showId}/canales`);
    if (!res.ok) return;
    const d = await res.json();
    if (d.listas) setListas(d.listas as ListasDelShow);
  }, [showId]);

  // ── Guardado por renglón ───────────────────────────────────────────────────
  const descargar = useCallback(
    async (invitadoId: string) => {
      const campos = pendientes.current.get(invitadoId);
      pendientes.current.delete(invitadoId);
      const t = timers.current.get(invitadoId);
      if (t) clearTimeout(t);
      timers.current.delete(invitadoId);
      if (!campos) return;

      const res = await fetch(`/api/show-invitados/${invitadoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campos),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "No se pudo guardar el invitado");
        return;
      }
      // La fila no se reemplaza con la respuesta: el usuario puede seguir escribiendo.
      setGuardados((prev) => new Set(prev).add(invitadoId));
      setTimeout(
        () =>
          setGuardados((prev) => {
            const s = new Set(prev);
            s.delete(invitadoId);
            return s;
          }),
        1500,
      );
    },
    [toast],
  );

  function editar(invitadoId: string, campos: Record<string, unknown>, inmediato = false) {
    setInvitados((prev) =>
      prev.map((i) => (i.id === invitadoId ? ({ ...i, ...campos } as InvitadoConCanales) : i)),
    );
    pendientes.current.set(invitadoId, { ...(pendientes.current.get(invitadoId) ?? {}), ...campos });
    const t = timers.current.get(invitadoId);
    if (t) clearTimeout(t);
    if (inmediato) {
      void descargar(invitadoId);
      return;
    }
    timers.current.set(invitadoId, setTimeout(() => void descargar(invitadoId), DEMORA_GUARDADO));
  }

  // ── Acciones ───────────────────────────────────────────────────────────────
  async function agregar() {
    if (!nuevo?.nombre.trim()) return;
    setTrabajando("nuevo");
    try {
      const res = await fetch(`/api/gira-shows/${showId}/invitados`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevo.nombre, rol: nuevo.rol || null, momento: nuevo.momento || null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo agregar al invitado");
        return;
      }
      setInvitados((prev) => [...prev, d.invitado as InvitadoConCanales]);
      setNuevo({ ...NUEVO, rol: nuevo.rol });
    } finally {
      setTrabajando(null);
    }
  }

  async function quitar(inv: InvitadoConCanales) {
    const ok = await confirmar({
      message: inv.canales.length
        ? `¿Quitar a «${inv.nombre}» del show? Se van también sus ${inv.canales.length} canal(es) y la lista se recorre.`
        : `¿Quitar a «${inv.nombre}» del show?`,
      danger: true,
      confirmText: "Quitar",
    });
    if (!ok) return;
    const res = await fetch(`/api/show-invitados/${inv.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar al invitado");
      return;
    }
    setInvitados((prev) => prev.filter((x) => x.id !== inv.id));
    await recargarListas();
  }

  /// Prender el interruptor hace nacer el canal; apagarlo se lo lleva. El número
  /// lo pone el servidor a continuación del rider maestro: aquí no se calcula.
  async function alternar(inv: InvitadoConCanales, clave: string, activo: boolean) {
    await descargar(inv.id);
    setTrabajando(inv.id + clave);
    try {
      const res = await fetch(`/api/show-invitados/${inv.id}/requerimientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave, activo }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo cambiar el requerimiento");
        return;
      }
      setInvitados((prev) => prev.map((x) => (x.id === inv.id ? (d.invitado as InvitadoConCanales) : x)));
      if (d.listas) setListas(d.listas as ListasDelShow);
    } finally {
      setTrabajando(null);
    }
  }

  const sinRequerimientos = invitados.filter((i) => i.canales.length === 0).length;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="ms-stat-card">
            <p className="ms-label mb-1">Suben al escenario</p>
            <p className="text-white text-lg font-semibold">{invitados.length}</p>
            <p className="ms-meta">además del artista y su banda</p>
          </div>
          <div className="ms-stat-card">
            <p className="ms-label mb-1">Sin nada pedido</p>
            <p className={`text-lg font-semibold ${sinRequerimientos > 0 ? "text-amber-300" : "text-emerald-300"}`}>
              {sinRequerimientos}
            </p>
            <p className="ms-meta">nadie sabe qué canal ocupan</p>
          </div>
          <div className="ms-stat-card">
            <p className="ms-label mb-1">Canales que generan</p>
            <p className="text-white text-lg font-semibold">
              {invitados.reduce((n, i) => n + i.canales.length, 0)}
            </p>
            <p className="ms-meta">numerados después del rider</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => setNuevo((n) => (n ? null : { ...NUEVO }))} className="ms-btn-ghost">
            {nuevo ? "Cerrar" : "+ Invitado"}
          </button>
        </div>

        {nuevo && (
          <div className="ms-card-deep p-3 grid grid-cols-1 md:grid-cols-[1fr_200px_1fr_auto] gap-2 items-end">
            <div>
              <label className="ms-label block mb-1">Quién</label>
              <input
                value={nuevo.nombre}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void agregar();
                }}
                placeholder="ej. Los del Norte"
                className="ms-input-inline w-full"
              />
            </div>
            <div>
              <label className="ms-label block mb-1">Qué hace</label>
              <select
                value={nuevo.rol}
                onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}
                className="ms-input-inline w-full"
              >
                {ROLES_INVITADO.map((r) => (
                  <option key={r} value={r}>
                    {ROL_INVITADO_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ms-label block mb-1">Cuándo entra</label>
              <input
                value={nuevo.momento}
                onChange={(e) => setNuevo({ ...nuevo, momento: e.target.value })}
                placeholder="ej. 3ª canción"
                className="ms-input-inline w-full"
              />
            </div>
            <button
              onClick={() => void agregar()}
              disabled={!nuevo.nombre.trim() || trabajando === "nuevo"}
              className="ms-btn-primary disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
        )}

        {invitados.length === 0 ? (
          <div className="ms-empty-state">
            <p className="text-sm text-gray-400">
              Nadie más sube al escenario en esta fecha. Si hay telonero, featuring o presentador, anótalo aquí: cada
              uno ocupa canales que el rider maestro no trae.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invitados.map((inv) => (
              <div key={inv.id} className="ms-card p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_190px_200px_auto] gap-2 items-start">
                  <div>
                    <label className="ms-label block mb-1">Quién</label>
                    <input
                      value={inv.nombre}
                      onChange={(e) => editar(inv.id, { nombre: e.target.value })}
                      className="ms-input-inline w-full"
                    />
                    {guardados.has(inv.id) && <span className="ms-micro text-emerald-400">guardado</span>}
                  </div>
                  <div>
                    <label className="ms-label block mb-1">Qué hace</label>
                    <select
                      value={inv.rol ?? ""}
                      onChange={(e) => editar(inv.id, { rol: e.target.value || null }, true)}
                      className="ms-input-inline w-full"
                    >
                      <option value="">— Sin definir —</option>
                      {ROLES_INVITADO.map((r) => (
                        <option key={r} value={r} className="bg-[#111] text-white">
                          {ROL_INVITADO_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="ms-label block mb-1">Cuándo entra</label>
                    <input
                      value={inv.momento ?? ""}
                      onChange={(e) => editar(inv.id, { momento: e.target.value })}
                      placeholder="ej. encore"
                      className="ms-input-inline w-full"
                    />
                  </div>
                  <div className="flex md:justify-end pt-5">
                    <button
                      onClick={() => void quitar(inv)}
                      className="text-red-400/70 hover:text-red-300 transition-colors px-1"
                      title="Quitar al invitado"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div>
                  <label className="ms-label block mb-1">Notas</label>
                  <input
                    value={inv.notas ?? ""}
                    onChange={(e) => editar(inv.id, { notas: e.target.value })}
                    placeholder="ej. llega apenas para el soundcheck; trae su propio ingeniero"
                    className="ms-input-inline w-full"
                  />
                </div>

                <div className="border-t border-[#1a1a1a] pt-2.5">
                  <p className="ms-label mb-2">Qué necesita en escena</p>
                  <div className="flex flex-wrap gap-1.5">
                    {REQUERIMIENTOS_INVITADO.map((r) => {
                      // Prendido o apagado lo dice el servidor: `requerimientos` se
                      // deriva de los canales que el invitado ya tiene.
                      const activo = inv.requerimientos.includes(r.clave);
                      return (
                        <button
                          key={r.clave}
                          onClick={() => void alternar(inv, r.clave, !activo)}
                          disabled={trabajando === inv.id + r.clave}
                          className={`ms-badge transition-colors disabled:opacity-50 ${
                            activo
                              ? "bg-amber-400/10 text-amber-300 border-amber-400/40"
                              : "ms-badge-gray hover:text-white hover:border-[#B3985B]/40"
                          }`}
                          title={
                            activo
                              ? `Quitar ${r.label.toLowerCase()} y su canal`
                              : `${r.label} — nace como ${r.tipo === "INPUT" ? "entrada" : "salida"} después del rider`
                          }
                        >
                          {activo ? "✓ " : "+ "}
                          {r.label}
                        </button>
                      );
                    })}
                  </div>

                  {inv.canales.length > 0 ? (
                    <p className="ms-micro mt-2">
                      Ocupa{" "}
                      {inv.canales
                        .map((c) => `${c.tipo === "INPUT" ? "entrada" : "salida"} ${c.etiqueta}`)
                        .join(" · ")}
                    </p>
                  ) : (
                    <p className="ms-micro mt-2 text-amber-300/70">
                      No ocupa ningún canal todavía: si se sube a cantar, falta prender algo.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="ms-micro">
          Cada celda se guarda sola al dejar de escribir. Prender un requerimiento hace nacer el canal numerado a
          continuación del rider maestro —las entradas y las salidas llevan secuencias separadas— y apagarlo se lo
          lleva. Si hace falta algo que no está en la lista corta, agrégalo como canal a mano abajo.
        </p>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="ms-h2">Lista real de esta fecha</h2>
          <p className="ms-meta">
            El input y output list del rider de la gira, hecho a la medida de esta plaza: todo renglón se edita, se
            puede agregar lo que aquí hace falta y sacar lo que aquí no se usa. El rider de la gira no se mueve.
          </p>
        </div>
        <CanalesShow
          showId={showId}
          listas={listas}
          invitados={invitados.map((i) => ({ id: i.id, nombre: i.nombre, rol: i.rol }))}
          onListas={setListas}
          onInvitadosDesfasados={() => void cargarInvitados()}
        />
      </section>
    </div>
  );
}
