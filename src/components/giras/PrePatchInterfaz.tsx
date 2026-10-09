"use client";

/**
 * El pre-patch de la interfaz, junto al input y output list del show.
 *
 * Es otra lista y se ve como otra lista: el input list dice qué canal de consola
 * es cada instrumento, esto dice qué entra y qué sale por cada puerto FÍSICO de
 * la interfaz que va antes de la consola. No se deriva del input list a
 * propósito —el puerto 1 no tiene que ser el canal 1— así que aquí se escribe lo
 * que de verdad se va a cablear.
 *
 * El mismo componente edita la base de la gira (sin `showId`) y lo que queda en
 * una fecha (con él). Desde la fecha, lo que se cambie de un puerto de la gira
 * vale solo en esa plaza hasta que alguien lo suba con ↑.
 *
 * Los números de puerto los pone el servidor sobre lo que de verdad se parcha:
 * este componente nunca calcula uno.
 */

import { useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { FilaArrastrable, TablaOrdenable, ThArrastre } from "@/components/ui/TablaOrdenable";
import type { FilaPuerto, ListasPrePatch, TipoCanal } from "@/lib/pre-patch";

interface Props {
  giraId: string;
  /// Con fecha se edita lo que queda en esa plaza; sin ella, la base de la gira.
  showId?: string | null;
  conPrePatchInicial: boolean;
  listasIniciales: ListasPrePatch;
}

interface Nuevo {
  tipo: TipoCanal;
  nombre: string;
  notas: string;
}

const NUEVO: Nuevo = { tipo: "INPUT", nombre: "", notas: "" };

const DEMORA_GUARDADO = 700;

export default function PrePatchInterfaz({ giraId, showId, conPrePatchInicial, listasIniciales }: Props) {
  const toast = useToast();
  const confirmar = useConfirm();

  const [conPrePatch, setConPrePatch] = useState(conPrePatchInicial);
  const [listas, setListas] = useState(listasIniciales);
  const [nuevo, setNuevo] = useState<Nuevo | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [verQuitados, setVerQuitados] = useState(false);
  const [reordenando, setReordenando] = useState<TipoCanal | null>(null);
  /// Lo que se está escribiendo, por renglón y campo. Vive aparte de `listas`
  /// porque el servidor la manda completa en cada respuesta y pisaría la celda a
  /// medio escribir. Se indexa por `clave`, no por `id`: al primer cambio de un
  /// puerto de la gira nace su ajuste y el `id` cambia.
  const [borrador, setBorrador] = useState<Record<string, Record<string, string>>>({});
  const [timers] = useState(() => new Map<string, ReturnType<typeof setTimeout>>());
  /// Una fila a la vez: el primer cambio de un puerto de la gira CREA su ajuste,
  /// y dos cambios en paralelo intentarían crearlo dos veces.
  const [colas] = useState(() => new Map<string, Promise<void>>());

  const enFecha = Boolean(showId);

  function enCola(clave: string, fn: () => Promise<void>): Promise<void> {
    const corre = (colas.get(clave) ?? Promise.resolve()).then(fn, fn);
    colas.set(clave, corre);
    return corre;
  }

  async function alternarModulo(activo: boolean) {
    setConPrePatch(activo);
    const res = await fetch(`/api/giras/${giraId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conPrePatch: activo }),
    });
    if (!res.ok) {
      setConPrePatch(!activo);
      toast.error("No se pudo cambiar el pre-patch de la gira");
    }
  }

  /**
   * Guarda unos campos del renglón.
   *
   * Un puerto de la gira visto desde una fecha siempre viaja al endpoint de
   * ajuste: ese lo crea la primera vez y lo actualiza después, así que no importa
   * si la lista en pantalla ya alcanzó a saber que existe.
   */
  function guardar(fila: FilaPuerto, campos: Record<string, unknown>): Promise<void> {
    return enCola(fila.clave, async () => {
      const res = fila.canalId
        ? await fetch(`/api/pre-patch-canales/${fila.canalId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(campos),
          })
        : await fetch(`/api/giras/${giraId}/pre-patch/ajuste`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ showId, baseId: fila.baseId, ...campos }),
          });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar el puerto");
        return;
      }
      // Solo se suelta lo que acabó de viajar: si siguen escribiendo en otra celda
      // del mismo renglón, su borrador todavía no está en el servidor.
      setBorrador((prev) => {
        const quedan = { ...(prev[fila.clave] ?? {}) };
        for (const campo of Object.keys(campos)) delete quedan[campo];
        const copia = { ...prev };
        if (Object.keys(quedan).length) copia[fila.clave] = quedan;
        else delete copia[fila.clave];
        return copia;
      });
      if (d.listas) setListas(d.listas as ListasPrePatch);
    });
  }

  function escribir(fila: FilaPuerto, campo: string, valor: string) {
    setBorrador((prev) => ({ ...prev, [fila.clave]: { ...(prev[fila.clave] ?? {}), [campo]: valor } }));
    const llave = fila.clave + campo;
    const t = timers.get(llave);
    if (t) clearTimeout(t);
    timers.set(
      llave,
      setTimeout(() => void guardar(fila, { [campo]: valor }), DEMORA_GUARDADO),
    );
  }

  function valor(fila: FilaPuerto, campo: "nombre" | "notas"): string {
    const enVuelo = borrador[fila.clave]?.[campo];
    if (enVuelo !== undefined) return enVuelo;
    return fila[campo] ?? "";
  }

  async function agregar() {
    if (!nuevo?.nombre.trim()) return;
    setTrabajando(true);
    try {
      const res = await fetch(`/api/giras/${giraId}/pre-patch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: nuevo.tipo,
          nombre: nuevo.nombre,
          notas: nuevo.notas || null,
          showId: showId ?? null,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo agregar el puerto");
        return;
      }
      if (d.listas) setListas(d.listas as ListasPrePatch);
      setConPrePatch(true);
      setNuevo({ ...NUEVO, tipo: nuevo.tipo });
    } finally {
      setTrabajando(false);
    }
  }

  async function borrarPuerto(fila: FilaPuerto): Promise<void> {
    if (!fila.canalId) return;
    const res = await fetch(`/api/pre-patch-canales/${fila.canalId}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo quitar el puerto");
      return;
    }
    if (d.listas) setListas(d.listas as ListasPrePatch);
  }

  /**
   * Saca el renglón de la lista.
   *
   * En la base de la gira se borra y se va de todas las fechas. En una fecha, lo
   * que nació ahí se borra y lo de la gira NO: se marca fuera solo en esa plaza,
   * queda listado aparte y se puede regresar con un clic.
   */
  async function quitar(fila: FilaPuerto) {
    const queEs = `${fila.tipo === "INPUT" ? "la entrada" : "la salida"} ${fila.puerto} «${fila.nombre}»`;
    const soloAqui = enFecha && fila.origen !== "SHOW";
    const ok = await confirmar({
      message: soloAqui
        ? `¿Sacar ${queEs} del pre-patch de esta fecha? Sigue en el de la gira y se puede regresar; los puertos que siguen se recorren.`
        : enFecha
          ? `¿Quitar ${queEs} del pre-patch de esta fecha? Los puertos que siguen se recorren.`
          : `¿Quitar ${queEs} del pre-patch de la interfaz? Se va de TODAS las fechas de la gira, con lo que cada una le haya ajustado.`,
      danger: true,
      confirmText: soloAqui ? "Sacar de esta fecha" : "Quitar",
    });
    if (!ok) return;
    if (soloAqui) await guardar(fila, { oculto: true });
    else await borrarPuerto(fila);
  }

  async function regresar(fila: FilaPuerto) {
    await guardar(fila, { oculto: false });
  }

  /// Acomoda la cola. No se reordena en pantalla antes de la respuesta: el número
  /// de puerto lo recalcula el servidor sobre lo que queda visible.
  async function reordenar(tipo: TipoCanal, ids: string[]) {
    setReordenando(tipo);
    try {
      const res = await fetch(`/api/giras/${giraId}/pre-patch/orden`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, ids, showId: showId ?? null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo acomodar el pre-patch");
        return;
      }
      if (d.listas) setListas(d.listas as ListasPrePatch);
    } finally {
      setReordenando(null);
    }
  }

  /// Lo que esta fecha capturó pasa a ser lo que dice la gira.
  async function subirALaGira(fila: FilaPuerto) {
    if (!fila.canalId) return;
    const nacioAqui = fila.origen === "SHOW";
    const ok = await confirmar({
      title: "¿Así se parcha toda la gira?",
      message: nacioAqui
        ? `«${fila.nombre}» se agrega al pre-patch de la interfaz de la gira, así que deja de ser un puerto de esta fecha y lo leen todas las plazas. La cola de esta fecha se recorre.`
        : `«${fila.nombre}» queda así en el pre-patch de la gira, no solo aquí. Las fechas que ya tengan su propia versión de este puerto la conservan.`,
      confirmText: "Subir a la gira",
    });
    if (!ok) return;

    const res = await fetch(`/api/pre-patch-canales/${fila.canalId}/subir-a-la-gira`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo subir el puerto a la gira");
      return;
    }
    if (d.listas) setListas(d.listas as ListasPrePatch);
    toast.success("La gira ya lo parcha así");
  }

  /// Tira los cambios de esta plaza sobre un puerto de la gira.
  async function volverALaGira(fila: FilaPuerto) {
    const ok = await confirmar({
      message: `¿Dejar «${fila.nombre}» como lo parcha la gira? Se pierden los cambios de esta fecha.`,
      confirmText: "Volver al de la gira",
    });
    if (!ok) return;
    await borrarPuerto(fila);
  }

  const { resumen } = listas;
  const hayPuertos = listas.entradas.length + listas.salidas.length + listas.quitados.length > 0;

  // ── Apagado ────────────────────────────────────────────────────────────────
  if (!conPrePatch) {
    return (
      <section className="ms-card p-3 border-sky-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="ms-section-label text-sky-300">Pre-patch de interfaz</p>
            <p className="ms-meta max-w-2xl">
              Para cuando entre una interfaz antes de la consola y haya que decir qué se cablea en cada puerto físico.
              Es otra lista y otra numeración: no es el input list de arriba. Se captura una vez para toda la gira y
              cada fecha puede ajustarla.
              {hayPuertos ? " Esta gira ya tiene puertos capturados: prenderlo los muestra tal como quedaron." : ""}
            </p>
          </div>
          <button onClick={() => void alternarModulo(true)} className="ms-btn-ghost shrink-0">
            Esta gira usa interfaz
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="ms-card p-3 space-y-4 border-sky-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="ms-section-label text-sky-300">Pre-patch de interfaz</p>
          <p className="ms-meta max-w-2xl">
            Qué se cablea en cada puerto físico de la interfaz que va antes de la consola.{" "}
            {enFecha
              ? "La interfaz es la misma toda la gira: lo que cambies aquí vale solo en esta fecha hasta que lo subas con ↑."
              : "Esta es la base que leen todas las fechas; lo que solo pase en una plaza se ajusta en «Invitados y canales» de esa fecha."}{" "}
            No es el input list de arriba y su numeración es propia.
          </p>
        </div>
        {!enFecha && (
          <button onClick={() => void alternarModulo(false)} className="ms-btn-ghost shrink-0">
            Esta gira no usa interfaz
          </button>
        )}
      </div>

      {enFecha && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="ms-stat-card">
            <p className="ms-label mb-1">Entradas de la interfaz</p>
            <p className="text-white text-lg font-semibold">{listas.entradas.length}</p>
            <p className="ms-meta">
              {resumen.entradasGira} de la gira · {resumen.entradasShow} de esta fecha
            </p>
          </div>
          <div className="ms-stat-card">
            <p className="ms-label mb-1">Salidas de la interfaz</p>
            <p className="text-white text-lg font-semibold">{listas.salidas.length}</p>
            <p className="ms-meta">
              {resumen.salidasGira} de la gira · {resumen.salidasShow} de esta fecha
            </p>
          </div>
          <div className="ms-stat-card">
            <p className="ms-label mb-1">Distinto a la gira</p>
            <p
              className={`text-lg font-semibold ${
                resumen.ajustados + resumen.quitados > 0 ? "text-amber-300" : "text-emerald-300"
              }`}
            >
              {resumen.ajustados + resumen.quitados}
            </p>
            <p className="ms-meta">
              {resumen.ajustados} cambiados · {resumen.quitados} fuera
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setNuevo((n) => (n ? null : { ...NUEVO }))} className="ms-btn-ghost">
          {nuevo ? "Cerrar" : "+ Puerto"}
        </button>
        <span className="ms-micro">
          {enFecha
            ? "El puerto que agregues aquí nace solo en esta fecha, al final de lo que trae la gira."
            : "El puerto que agregues aquí lo leen todas las fechas de la gira."}
        </span>
      </div>

      {nuevo && (
        <div className="ms-card-deep p-3 grid grid-cols-1 md:grid-cols-[130px_1fr_1fr_auto] gap-2 items-end">
          <div>
            <label className="ms-label block mb-1">Lado</label>
            <select
              value={nuevo.tipo}
              onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value as TipoCanal })}
              className="ms-input-inline w-full"
            >
              <option value="INPUT">Entrada</option>
              <option value="OUTPUT">Salida</option>
            </select>
          </div>
          <div>
            <label className="ms-label block mb-1">Qué se cablea</label>
            <input
              value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") void agregar();
              }}
              placeholder={nuevo.tipo === "INPUT" ? "ej. Split de bombo" : "ej. Envío a FOH L"}
              className="ms-input-inline w-full"
            />
          </div>
          <div>
            <label className="ms-label block mb-1">Notas</label>
            <input
              value={nuevo.notas}
              onChange={(e) => setNuevo({ ...nuevo, notas: e.target.value })}
              placeholder="ej. XLR del subsnake A"
              className="ms-input-inline w-full"
            />
          </div>
          <button
            onClick={() => void agregar()}
            disabled={!nuevo.nombre.trim() || trabajando}
            className="ms-btn-primary disabled:opacity-50"
          >
            Agregar puerto
          </button>
        </div>
      )}

      <TablaPuertos
        titulo={enFecha ? "Entradas de la interfaz en esta fecha" : "Entradas de la interfaz"}
        nota="Qué llega a cada puerto de entrada. La numeración es de la interfaz, no del input list del show."
        tipo="INPUT"
        filas={listas.entradas}
        enFecha={enFecha}
        valor={valor}
        escribir={escribir}
        quitar={quitar}
        volverALaGira={volverALaGira}
        subirALaGira={subirALaGira}
        reordenar={reordenar}
        reordenando={reordenando === "INPUT"}
      />

      <TablaPuertos
        titulo={enFecha ? "Salidas de la interfaz en esta fecha" : "Salidas de la interfaz"}
        nota="Qué sale por cada puerto de salida: a dónde va y por qué cable."
        tipo="OUTPUT"
        filas={listas.salidas}
        enFecha={enFecha}
        valor={valor}
        escribir={escribir}
        quitar={quitar}
        volverALaGira={volverALaGira}
        subirALaGira={subirALaGira}
        reordenar={reordenar}
        reordenando={reordenando === "OUTPUT"}
      />

      {listas.quitados.length > 0 && (
        <div className="ms-card-deep p-3 space-y-2">
          <button onClick={() => setVerQuitados((v) => !v)} className="flex items-center gap-2 text-left w-full">
            <span className="ms-section-label">Fuera de esta fecha ({listas.quitados.length})</span>
            <span className="ms-micro text-[#666]">{verQuitados ? "ocultar" : "ver"}</span>
          </button>
          <p className="ms-meta">
            Puertos de la interfaz que en esta plaza no se cablean. Siguen en el pre-patch de la gira: regresarlos los
            devuelve a la lista y recorre lo que sigue.
          </p>
          {verQuitados && (
            <ul className="space-y-1">
              {listas.quitados.map((f) => (
                <li key={f.clave} className="flex items-center justify-between gap-3 py-1 border-b border-white/5">
                  <span className="text-sm text-gray-400">
                    {f.tipo === "INPUT" ? "Entrada" : "Salida"} · {f.nombre}
                    {f.notas ? <span className="ms-meta"> · {f.notas}</span> : null}
                  </span>
                  <button onClick={() => void regresar(f)} className="ms-btn-ghost text-xs shrink-0">
                    Regresar a la lista
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

// ── Tabla ────────────────────────────────────────────────────────────────────
interface TablaProps {
  titulo: string;
  nota: string;
  tipo: TipoCanal;
  filas: FilaPuerto[];
  enFecha: boolean;
  valor: (fila: FilaPuerto, campo: "nombre" | "notas") => string;
  escribir: (fila: FilaPuerto, campo: string, valor: string) => void;
  quitar: (fila: FilaPuerto) => Promise<void>;
  volverALaGira: (fila: FilaPuerto) => Promise<void>;
  subirALaGira: (fila: FilaPuerto) => Promise<void>;
  reordenar: (tipo: TipoCanal, ids: string[]) => Promise<void>;
  reordenando: boolean;
}

function TablaPuertos({
  titulo,
  nota,
  tipo,
  filas,
  enFecha,
  valor,
  escribir,
  quitar,
  volverALaGira,
  subirALaGira,
  reordenar,
  reordenando,
}: TablaProps) {
  /// Desde una fecha solo se arrastra lo que nació ahí: los puertos de la gira
  /// llevan el orden de la gira, que es el mismo en todas las plazas.
  const movibles = enFecha ? filas.filter((f) => f.origen === "SHOW") : filas;

  return (
    <div className="space-y-2">
      <div>
        <h4 className="ms-section-label">{titulo}</h4>
        <p className="ms-meta mt-0.5">{nota}</p>
      </div>

      {filas.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-gray-400">
            No hay {tipo === "INPUT" ? "entradas" : "salidas"} de interfaz capturadas.
          </p>
        </div>
      ) : (
        <TablaOrdenable
          filas={movibles}
          claveDe={(f) => f.clave}
          onReordenar={(fs) => void reordenar(tipo, fs.map((f) => f.id))}
        >
          <table className={`min-w-[720px] w-full ${reordenando ? "opacity-60" : ""}`}>
            <thead className="ms-thead">
              <tr>
                <ThArrastre />
                <th className="ms-th w-[80px]">Puerto</th>
                <th className="ms-th w-[300px]">Qué se cablea</th>
                <th className="ms-th">Notas</th>
                <th className="ms-th w-[70px]" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const deLaFecha = f.origen === "SHOW" && enFecha;
                const ajustado = f.origen === "AJUSTADO";
                return (
                  <FilaArrastrable
                    key={f.clave}
                    clave={f.clave}
                    fijo={enFecha && f.origen !== "SHOW"}
                    titulo={
                      enFecha && f.origen !== "SHOW"
                        ? "Este puerto lleva el orden del pre-patch de la gira; se cambia allá"
                        : "Arrastrar para acomodar el puerto"
                    }
                    className={`ms-tr align-top ${
                      deLaFecha ? "bg-amber-400/[0.05]" : ajustado ? "bg-[#B3985B]/[0.06]" : ""
                    }`}
                  >
                    <td className="ms-td">
                      <span
                        className={`font-semibold ${
                          deLaFecha ? "text-amber-300" : ajustado ? "text-[#D9C48A]" : "text-sky-200"
                        }`}
                      >
                        {f.puerto}
                      </span>
                    </td>
                    <td className="ms-td">
                      <input
                        value={valor(f, "nombre")}
                        onChange={(e) => escribir(f, "nombre", e.target.value)}
                        className="ms-input-inline w-full"
                      />
                      {deLaFecha && <span className="ms-badge ms-badge-amber mt-1 inline-block">de esta fecha</span>}
                      {ajustado && (
                        <span
                          className="ms-badge ms-badge-gold mt-1 inline-block"
                          title="El pre-patch de la gira dice otra cosa"
                        >
                          ajustado aquí
                        </span>
                      )}
                    </td>
                    <td className="ms-td">
                      <input
                        value={valor(f, "notas")}
                        onChange={(e) => escribir(f, "notas", e.target.value)}
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td text-right whitespace-nowrap">
                      {enFecha && (ajustado || f.origen === "SHOW") && (
                        <button
                          onClick={() => void subirALaGira(f)}
                          className="text-[#B3985B]/70 hover:text-[#D9C48A] transition-colors px-1"
                          title={
                            ajustado
                              ? "Que la gira lo parche así: aplica a todas las fechas"
                              : "Subirlo a la gira: deja de ser un puerto solo de esta fecha"
                          }
                        >
                          ↑
                        </button>
                      )}
                      {ajustado && (
                        <button
                          onClick={() => void volverALaGira(f)}
                          className="text-gray-500 hover:text-gray-300 transition-colors px-1"
                          title="Dejarlo como lo parcha la gira"
                        >
                          ↺
                        </button>
                      )}
                      <button
                        onClick={() => void quitar(f)}
                        className="text-red-400/70 hover:text-red-300 transition-colors px-1"
                        title={
                          enFecha && f.origen !== "SHOW"
                            ? "Sacarlo de esta fecha (sigue en el de la gira)"
                            : "Quitar el puerto"
                        }
                      >
                        ✕
                      </button>
                    </td>
                  </FilaArrastrable>
                );
              })}
            </tbody>
          </table>
        </TablaOrdenable>
      )}
    </div>
  );
}
