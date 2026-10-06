"use client";

/**
 * La lista real de canales de ESTA fecha: el input y output list del rider
 * maestro con los cambios de esta plaza encima, más lo que solo existe aquí, en
 * una sola secuencia corrida.
 *
 * Todo renglón se edita, también el que viene del rider: cambiar el micrófono
 * porque el venue solo tiene otro, o sacar un canal que aquí no se usa, no toca
 * el rider de la gira — nace como ajuste de esta fecha y se puede devolver.
 *
 * Los números los pone el servidor sobre lo que de verdad se parcha: este
 * componente nunca calcula uno.
 */

import { useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import {
  ROL_INVITADO_LABEL,
  SOPORTES_MIC,
  SOPORTE_MIC_LABEL,
  TIPOS_SALIDA,
  TIPO_SALIDA_LABEL,
} from "@/lib/giras";
import type { FilaCanal, ListasDelShow, TipoCanal } from "@/lib/show-canales";

interface Props {
  showId: string;
  listas: ListasDelShow;
  /// Para colgarle el canal a un invitado al agregarlo a mano.
  invitados: { id: string; nombre: string; rol: string | null }[];
  onListas: (listas: ListasDelShow) => void;
  /// Un canal a mano puede nacer colgado de un invitado: al cambiar sus canales
  /// hay que volver a leer los renglones de invitados.
  onInvitadosDesfasados: () => void;
}

interface Nuevo {
  tipo: TipoCanal;
  nombre: string;
  invitadoId: string;
  instrumento: string;
  microfono: string;
  soporte: string;
  phantom: boolean;
  tipoSalida: string;
  estereo: boolean;
  notas: string;
}

const NUEVO: Nuevo = {
  tipo: "INPUT",
  nombre: "",
  invitadoId: "",
  instrumento: "",
  microfono: "",
  soporte: "",
  phantom: false,
  tipoSalida: "",
  estereo: false,
  notas: "",
};

const DEMORA_GUARDADO = 700;

export default function CanalesShow({ showId, listas, invitados, onListas, onInvitadosDesfasados }: Props) {
  const toast = useToast();
  const confirmar = useConfirm();

  const [nuevo, setNuevo] = useState<Nuevo | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [verQuitados, setVerQuitados] = useState(false);
  /// Lo que el usuario está escribiendo, por renglón y campo. Vive aparte de
  /// `listas` porque esa la manda el servidor completa en cada respuesta y
  /// pisaría la celda a medio escribir. Se indexa por `clave`, no por `id`: al
  /// primer cambio de un renglón del rider nace su ajuste y el `id` cambia.
  const [borrador, setBorrador] = useState<Record<string, Record<string, string>>>({});
  const [timers] = useState(() => new Map<string, ReturnType<typeof setTimeout>>());
  /// Una fila a la vez. El primer cambio de un renglón del rider CREA su ajuste,
  /// y dos cambios en paralelo intentarían crearlo dos veces.
  const [colas] = useState(() => new Map<string, Promise<void>>());

  function enCola(clave: string, fn: () => Promise<void>): Promise<void> {
    const corre = (colas.get(clave) ?? Promise.resolve()).then(fn, fn);
    colas.set(clave, corre);
    return corre;
  }

  /**
   * Guarda unos campos del renglón.
   *
   * Un renglón que cuelga del rider siempre viaja al endpoint de ajuste: ese
   * crea el ajuste la primera vez y lo actualiza después, así que no importa si
   * la lista en pantalla ya alcanzó a saber que existe. Lo que nació en esta
   * fecha se edita directo.
   */
  function guardar(fila: FilaCanal, campos: Record<string, unknown>): Promise<void> {
    return enCola(fila.clave, async () => {
      const res = fila.riderCanalId
        ? await fetch(`/api/gira-shows/${showId}/canales/ajuste`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ riderCanalId: fila.riderCanalId, ...campos }),
          })
        : await fetch(`/api/show-canales/${fila.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(campos),
          });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar el canal");
        return;
      }
      // Solo se suelta lo que acabó de viajar: si siguen escribiendo en otra
      // celda del mismo renglón, su borrador todavía no está en el servidor.
      setBorrador((prev) => {
        const quedan = { ...(prev[fila.clave] ?? {}) };
        for (const campo of Object.keys(campos)) delete quedan[campo];
        const copia = { ...prev };
        if (Object.keys(quedan).length) copia[fila.clave] = quedan;
        else delete copia[fila.clave];
        return copia;
      });
      if (d.listas) onListas(d.listas as ListasDelShow);
      // El soporte, el tipo de salida y el estéreo cambian lo que el renglón del
      // invitado dice que ocupa, así que ese renglón se queda viejo.
      if (fila.invitadoId) onInvitadosDesfasados();
    });
  }

  /// Texto con demora. El soporte, el tipo de salida y el estéreo se mandan de
  /// inmediato porque pueden recorrer la lista completa.
  function escribir(fila: FilaCanal, campo: string, valor: string) {
    setBorrador((prev) => ({ ...prev, [fila.clave]: { ...(prev[fila.clave] ?? {}), [campo]: valor } }));
    const llave = fila.clave + campo;
    const t = timers.get(llave);
    if (t) clearTimeout(t);
    timers.set(
      llave,
      setTimeout(() => void guardar(fila, { [campo]: valor }), DEMORA_GUARDADO),
    );
  }

  function valor(fila: FilaCanal, campo: keyof FilaCanal): string {
    const enVuelo = borrador[fila.clave]?.[campo as string];
    if (enVuelo !== undefined) return enVuelo;
    const v = fila[campo];
    return typeof v === "string" ? v : "";
  }

  async function agregar() {
    if (!nuevo?.nombre.trim()) return;
    setTrabajando(true);
    try {
      const res = await fetch(`/api/gira-shows/${showId}/canales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: nuevo.tipo,
          nombre: nuevo.nombre,
          invitadoId: nuevo.invitadoId || null,
          instrumento: nuevo.instrumento || null,
          microfono: nuevo.microfono || null,
          soporte: nuevo.soporte || null,
          phantom: nuevo.phantom,
          tipoSalida: nuevo.tipoSalida || null,
          estereo: nuevo.estereo,
          notas: nuevo.notas || null,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo agregar el canal");
        return;
      }
      if (d.listas) onListas(d.listas as ListasDelShow);
      if (nuevo.invitadoId) onInvitadosDesfasados();
      setNuevo({ ...NUEVO, tipo: nuevo.tipo });
    } finally {
      setTrabajando(false);
    }
  }

  /// Borra el `ShowCanal` del renglón. En un canal propio de la fecha es quitarlo
  /// de la lista; en un ajuste es devolver el renglón a como lo dice el rider.
  async function borrarCanal(fila: FilaCanal): Promise<void> {
    if (!fila.canalShowId) return;
    const res = await fetch(`/api/show-canales/${fila.canalShowId}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo quitar el canal");
      return;
    }
    if (d.listas) onListas(d.listas as ListasDelShow);
    if (fila.invitadoId) onInvitadosDesfasados();
  }

  /**
   * Saca el renglón de la lista de esta fecha.
   *
   * Lo que nació aquí se borra. Lo del rider NO se borra: se marca oculto solo en
   * esta plaza, queda listado aparte y se puede regresar con un clic.
   */
  async function quitar(fila: FilaCanal) {
    const queEs = `${fila.tipo === "INPUT" ? "la entrada" : "la salida"} ${fila.etiqueta} «${fila.nombre}»`;
    const ok = await confirmar({
      message:
        fila.origen === "SHOW"
          ? `¿Quitar ${queEs} de esta fecha? Lo que venga después se recorre.`
          : `¿Sacar ${queEs} de esta fecha? Sigue en el rider de la gira y se puede regresar; lo que venga después se recorre.`,
      danger: true,
      confirmText: fila.origen === "SHOW" ? "Quitar" : "Sacar de esta fecha",
    });
    if (!ok) return;
    if (fila.origen === "SHOW") await borrarCanal(fila);
    else await guardar(fila, { oculto: true });
  }

  /// Devuelve a la lista un renglón del rider que esta plaza había sacado.
  async function regresar(fila: FilaCanal) {
    await guardar(fila, { oculto: false });
  }

  /// Tira un ajuste que quedó colgando de un rider que la fecha ya no usa.
  async function descartar(fila: FilaCanal) {
    const ok = await confirmar({
      message: `¿Descartar el ajuste de «${fila.nombre}»? Era de un rider que esta gira ya no usa y no está en el patch.`,
      danger: true,
      confirmText: "Descartar",
    });
    if (!ok) return;
    await borrarCanal(fila);
  }

  /// Tira los cambios de esta plaza sobre un renglón del rider.
  async function volverAlRider(fila: FilaCanal) {
    const ok = await confirmar({
      message: `¿Dejar «${fila.nombre}» como lo dice el rider de la gira? Se pierden los cambios de esta fecha.`,
      confirmText: "Volver al rider",
    });
    if (!ok) return;
    await borrarCanal(fila);
  }

  const { resumen } = listas;
  const hechoAMedida = resumen.entradasShow + resumen.salidasShow + resumen.ajustados + resumen.quitados;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Entradas de la fecha</p>
          <p className="text-white text-lg font-semibold">{resumen.entradasRider + resumen.entradasShow}</p>
          <p className="ms-meta">
            {resumen.entradasRider} del rider · {resumen.entradasShow} de esta fecha
          </p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Salidas de consola</p>
          <p className="text-white text-lg font-semibold">{resumen.salidasRider + resumen.salidasShow}</p>
          <p className="ms-meta">
            {resumen.salidasRider} del rider · {resumen.salidasShow} de esta fecha
          </p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Hecho a la medida</p>
          <p className={`text-lg font-semibold ${hechoAMedida > 0 ? "text-amber-300" : "text-emerald-300"}`}>
            {hechoAMedida}
          </p>
          <p className="ms-meta">
            {resumen.entradasShow + resumen.salidasShow} agregados · {resumen.ajustados} cambiados ·{" "}
            {resumen.quitados} fuera
          </p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Rider maestro</p>
          <p className={`text-lg font-semibold ${listas.conRider ? "text-emerald-300" : "text-amber-300"}`}>
            {listas.conRider ? "Leído" : "Sin rider"}
          </p>
          <p className="ms-meta">
            {listas.conRider
              ? "es la base de la lista y no se toca desde aquí"
              : "sin rider la numeración arranca en 1: falta la base"}
          </p>
        </div>
      </div>

      {listas.huerfanos.length > 0 && (
        <section className="ms-card p-3 space-y-2 border-amber-800/40 bg-amber-900/10">
          <p className="ms-label text-amber-300">
            {listas.huerfanos.length} ajuste{listas.huerfanos.length === 1 ? "" : "s"} de un rider anterior
          </p>
          <p className="ms-meta">
            Esta fecha tenía estos canales ajustados, pero cuelgan de renglones de un rider que la gira ya no usa, así
            que NO están en el patch de arriba. Vuelve a capturar lo que siga valiendo sobre el renglón nuevo y
            descártalos.
          </p>
          <ul className="space-y-1">
            {listas.huerfanos.map((f) => (
              <li key={f.clave} className="flex items-center justify-between gap-3 py-1 border-b border-white/5">
                <span className="text-sm text-gray-300">
                  {f.tipo === "INPUT" ? "Entrada" : "Salida"} · {f.nombre}
                  {[f.instrumento, f.microfono, f.soporte ? (SOPORTE_MIC_LABEL[f.soporte] ?? f.soporte) : null, f.notas]
                    .filter(Boolean)
                    .map((t) => (
                      <span key={t as string} className="ms-meta"> · {t}</span>
                    ))}
                </span>
                <button onClick={() => void descartar(f)} className="ms-btn-ghost text-xs shrink-0">
                  Descartar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setNuevo((n) => (n ? null : { ...NUEVO }))} className="ms-btn-ghost">
          {nuevo ? "Cerrar" : "+ Canal a mano"}
        </button>
        <span className="ms-micro">
          Todo renglón se edita aquí. Lo que cambies de un canal del rider vale solo en esta fecha.
        </span>
      </div>

      {nuevo && (
        <div className="ms-card-deep p-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-[130px_1fr_200px] gap-2 items-end">
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
              <label className="ms-label block mb-1">Qué es</label>
              <input
                value={nuevo.nombre}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void agregar();
                }}
                placeholder={nuevo.tipo === "INPUT" ? "ej. Acordeón del invitado" : "ej. Shout del DJ"}
                className="ms-input-inline w-full"
              />
            </div>
            <div>
              <label className="ms-label block mb-1">¿De quién?</label>
              <select
                value={nuevo.invitadoId}
                onChange={(e) => setNuevo({ ...nuevo, invitadoId: e.target.value })}
                className="ms-input-inline w-full"
              >
                <option value="">— De nadie en particular —</option>
                {invitados.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre}
                    {i.rol ? ` — ${ROL_INVITADO_LABEL[i.rol] ?? i.rol}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {nuevo.tipo === "INPUT" ? (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_170px_auto] gap-2 items-end">
              <div>
                <label className="ms-label block mb-1">Instrumento</label>
                <input
                  value={nuevo.instrumento}
                  onChange={(e) => setNuevo({ ...nuevo, instrumento: e.target.value })}
                  className="ms-input-inline w-full"
                />
              </div>
              <div>
                <label className="ms-label block mb-1">Micrófono</label>
                <input
                  value={nuevo.microfono}
                  onChange={(e) => setNuevo({ ...nuevo, microfono: e.target.value })}
                  placeholder="ej. SM58"
                  className="ms-input-inline w-full"
                />
              </div>
              <div>
                <label className="ms-label block mb-1">Soporte</label>
                <select
                  value={nuevo.soporte}
                  onChange={(e) => setNuevo({ ...nuevo, soporte: e.target.value })}
                  className="ms-input-inline w-full"
                >
                  <option value="">— Sin definir —</option>
                  {SOPORTES_MIC.map((s) => (
                    <option key={s} value={s}>
                      {SOPORTE_MIC_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-400 pb-1.5">
                <input
                  type="checkbox"
                  checked={nuevo.phantom}
                  onChange={(e) => setNuevo({ ...nuevo, phantom: e.target.checked })}
                />
                Phantom
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[200px_auto] gap-2 items-end">
              <div>
                <label className="ms-label block mb-1">Tipo de salida</label>
                <select
                  value={nuevo.tipoSalida}
                  onChange={(e) => setNuevo({ ...nuevo, tipoSalida: e.target.value })}
                  className="ms-input-inline w-full"
                >
                  <option value="">— Sin definir —</option>
                  {TIPOS_SALIDA.map((t) => (
                    <option key={t} value={t}>
                      {TIPO_SALIDA_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-400 pb-1.5">
                <input
                  type="checkbox"
                  checked={nuevo.estereo}
                  onChange={(e) => setNuevo({ ...nuevo, estereo: e.target.checked })}
                />
                Estéreo (se lleva dos canales)
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <label className="ms-label block mb-1">Notas</label>
              <input
                value={nuevo.notas}
                onChange={(e) => setNuevo({ ...nuevo, notas: e.target.value })}
                className="ms-input-inline w-full"
              />
            </div>
            <button
              onClick={() => void agregar()}
              disabled={!nuevo.nombre.trim() || trabajando}
              className="ms-btn-primary disabled:opacity-50"
            >
              Agregar canal
            </button>
          </div>
        </div>
      )}

      <TablaCanales
        titulo="Input list de la fecha"
        nota="El orden del patch es el número de canal. El rider de la gira va primero: lo que cambies o saques aquí vale solo en esta plaza."
        tipo="INPUT"
        filas={listas.inputs}
        valor={valor}
        escribir={escribir}
        guardar={guardar}
        quitar={quitar}
        volverAlRider={volverAlRider}
      />

      <TablaCanales
        titulo="Output list de la fecha"
        nota="Las salidas llevan su propia secuencia. Un mix estéreo ocupa dos canales de consola, así que se lee «15/16»."
        tipo="OUTPUT"
        filas={listas.outputs}
        valor={valor}
        escribir={escribir}
        guardar={guardar}
        quitar={quitar}
        volverAlRider={volverAlRider}
      />

      {listas.quitados.length > 0 && (
        <section className="ms-card-deep p-3 space-y-2">
          <button
            onClick={() => setVerQuitados((v) => !v)}
            className="flex items-center gap-2 text-left w-full"
          >
            <span className="ms-section-label">Fuera de esta fecha ({listas.quitados.length})</span>
            <span className="ms-micro text-[#666]">{verQuitados ? "ocultar" : "ver"}</span>
          </button>
          <p className="ms-meta">
            Canales del rider de la gira que en esta plaza no se usan. Siguen en el rider: regresarlos los devuelve a la
            lista y recorre lo que sigue.
          </p>
          {verQuitados && (
            <ul className="space-y-1">
              {listas.quitados.map((f) => (
                <li key={f.clave} className="flex items-center justify-between gap-3 py-1 border-b border-white/5">
                  <span className="text-sm text-gray-400">
                    {f.tipo === "INPUT" ? "Entrada" : "Salida"} · {f.nombre}
                    {f.microfono ? <span className="ms-meta"> · {f.microfono}</span> : null}
                  </span>
                  <button onClick={() => void regresar(f)} className="ms-btn-ghost text-xs shrink-0">
                    Regresar a la lista
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

// ── Tabla ────────────────────────────────────────────────────────────────────
interface TablaProps {
  titulo: string;
  nota: string;
  tipo: TipoCanal;
  filas: FilaCanal[];
  valor: (fila: FilaCanal, campo: keyof FilaCanal) => string;
  escribir: (fila: FilaCanal, campo: string, valor: string) => void;
  guardar: (fila: FilaCanal, campos: Record<string, unknown>) => Promise<void>;
  quitar: (fila: FilaCanal) => Promise<void>;
  volverAlRider: (fila: FilaCanal) => Promise<void>;
}

function TablaCanales({ titulo, nota, tipo, filas, valor, escribir, guardar, quitar, volverAlRider }: TablaProps) {
  const esInput = tipo === "INPUT";

  return (
    <section className="space-y-2">
      <div>
        <h3 className="ms-section-label">{titulo}</h3>
        <p className="ms-meta mt-0.5">{nota}</p>
      </div>

      {filas.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-gray-400">
            No hay {esInput ? "entradas" : "salidas"}. Si el rider maestro las tiene y aquí no se ven, es que la gira no
            trae rider enganchado y el artista no tiene uno vigente.
          </p>
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className={`${esInput ? "min-w-[1080px]" : "min-w-[880px]"} w-full`}>
            <thead className="ms-thead">
              <tr>
                <th className="ms-th w-[80px]">Canal</th>
                <th className="ms-th w-[260px]">Qué es</th>
                {esInput ? (
                  <>
                    <th className="ms-th w-[180px]">Instrumento</th>
                    <th className="ms-th w-[180px]">Micrófono</th>
                    <th className="ms-th w-[160px]">Soporte</th>
                    <th className="ms-th w-[90px]">Phantom</th>
                  </>
                ) : (
                  <>
                    <th className="ms-th w-[180px]">Tipo</th>
                    <th className="ms-th w-[100px]">Estéreo</th>
                  </>
                )}
                <th className="ms-th w-[200px]">Para quién</th>
                <th className="ms-th w-[200px]">Notas</th>
                <th className="ms-th w-[70px]" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const delShow = f.origen === "SHOW";
                const ajustado = f.origen === "AJUSTADO";
                return (
                  <tr
                    key={f.clave}
                    className={`ms-tr align-top ${delShow ? "bg-amber-400/[0.05]" : ajustado ? "bg-[#B3985B]/[0.06]" : ""}`}
                  >
                    <td className="ms-td">
                      <span
                        className={`font-semibold ${delShow ? "text-amber-300" : ajustado ? "text-[#D9C48A]" : "text-white"}`}
                      >
                        {f.etiqueta}
                      </span>
                    </td>
                    <td className="ms-td">
                      <input
                        value={valor(f, "nombre")}
                        onChange={(e) => escribir(f, "nombre", e.target.value)}
                        className="ms-input-inline w-full"
                      />
                      {delShow && <span className="ms-badge ms-badge-amber mt-1 inline-block">de esta fecha</span>}
                      {ajustado && (
                        <span
                          className="ms-badge ms-badge-gold mt-1 inline-block"
                          title="El rider de la gira dice otra cosa"
                        >
                          ajustado aquí
                        </span>
                      )}
                    </td>

                    {esInput ? (
                      <>
                        <td className="ms-td">
                          <input
                            value={valor(f, "instrumento")}
                            onChange={(e) => escribir(f, "instrumento", e.target.value)}
                            className="ms-input-inline w-full"
                          />
                        </td>
                        <td className="ms-td">
                          <input
                            value={valor(f, "microfono")}
                            onChange={(e) => escribir(f, "microfono", e.target.value)}
                            className="ms-input-inline w-full"
                          />
                          {f.alternativas && <span className="ms-micro block mt-0.5">o {f.alternativas}</span>}
                        </td>
                        <td className="ms-td">
                          <select
                            value={f.soporte ?? ""}
                            onChange={(e) => void guardar(f, { soporte: e.target.value || null })}
                            className="ms-input-inline w-full"
                          >
                            <option value="">— Sin definir —</option>
                            {SOPORTES_MIC.map((s) => (
                              <option key={s} value={s} className="bg-[#111] text-white">
                                {SOPORTE_MIC_LABEL[s]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="ms-td">
                          <input
                            type="checkbox"
                            checked={f.phantom}
                            onChange={(e) => void guardar(f, { phantom: e.target.checked })}
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="ms-td">
                          <select
                            value={f.tipoSalida ?? ""}
                            onChange={(e) => void guardar(f, { tipoSalida: e.target.value || null })}
                            className="ms-input-inline w-full"
                          >
                            <option value="">— Sin definir —</option>
                            {TIPOS_SALIDA.map((t) => (
                              <option key={t} value={t} className="bg-[#111] text-white">
                                {TIPO_SALIDA_LABEL[t]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="ms-td">
                          <input
                            type="checkbox"
                            checked={f.estereo}
                            onChange={(e) => void guardar(f, { estereo: e.target.checked })}
                          />
                        </td>
                      </>
                    )}

                    <td className="ms-td">
                      {f.paraQuien ? (
                        <span className="text-sm text-gray-300">
                          {f.paraQuien}
                          {f.rolInvitado ? (
                            <span className="ms-meta"> · {ROL_INVITADO_LABEL[f.rolInvitado] ?? f.rolInvitado}</span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="ms-meta">—</span>
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
                      {ajustado && (
                        <button
                          onClick={() => void volverAlRider(f)}
                          className="text-gray-500 hover:text-gray-300 transition-colors px-1"
                          title="Dejarlo como lo dice el rider de la gira"
                        >
                          ↺
                        </button>
                      )}
                      <button
                        onClick={() => void quitar(f)}
                        className="text-red-400/70 hover:text-red-300 transition-colors px-1"
                        title={delShow ? "Quitar el canal de esta fecha" : "Sacarlo de esta fecha (sigue en el rider)"}
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
    </section>
  );
}
