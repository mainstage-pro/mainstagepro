"use client";

/**
 * La lista real de canales de una fecha: el input y output list del rider
 * maestro MÁS lo que esta fecha agregó, en una sola secuencia corrida.
 *
 * Lo del rider se pinta tal cual y no se puede editar aquí —el rider es el mismo
 * para toda la gira y tocarlo desde una plaza sería moverlo en todas—; lo de esta
 * fecha va marcado, con el nombre del invitado que lo pidió, y sí se edita.
 *
 * Los números los pone el servidor: este componente nunca calcula uno.
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
  /// Lo que el usuario está escribiendo, por canal y campo. Vive aparte de
  /// `listas` porque esa la manda el servidor completa en cada respuesta y
  /// pisaría la celda a medio escribir.
  const [borrador, setBorrador] = useState<Record<string, Record<string, string>>>({});
  const [timers] = useState(() => new Map<string, ReturnType<typeof setTimeout>>());

  async function patch(canalId: string, campos: Record<string, unknown>, invitadoId?: string | null) {
    const res = await fetch(`/api/show-canales/${canalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo guardar el canal");
      return;
    }
    // Solo se suelta lo que acabó de viajar: si siguen escribiendo en otra celda
    // del mismo canal, su borrador todavía no está en el servidor.
    setBorrador((prev) => {
      const quedan = { ...(prev[canalId] ?? {}) };
      for (const campo of Object.keys(campos)) delete quedan[campo];
      const copia = { ...prev };
      if (Object.keys(quedan).length) copia[canalId] = quedan;
      else delete copia[canalId];
      return copia;
    });
    if (d.listas) onListas(d.listas as ListasDelShow);
    // El soporte, el tipo de salida y el estéreo cambian lo que el renglón del
    // invitado dice que ocupa, así que ese renglón se queda viejo.
    if (invitadoId) onInvitadosDesfasados();
  }

  /// Texto con demora. El soporte, el tipo de salida y el estéreo se mandan de
  /// inmediato porque pueden recorrer la lista completa.
  function escribir(canalId: string, campo: string, valor: string) {
    setBorrador((prev) => ({ ...prev, [canalId]: { ...(prev[canalId] ?? {}), [campo]: valor } }));
    const t = timers.get(canalId + campo);
    if (t) clearTimeout(t);
    timers.set(
      canalId + campo,
      setTimeout(() => void patch(canalId, { [campo]: valor }), DEMORA_GUARDADO),
    );
  }

  function valor(fila: FilaCanal, campo: keyof FilaCanal): string {
    const enVuelo = borrador[fila.id]?.[campo as string];
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

  async function quitar(fila: FilaCanal) {
    const ok = await confirmar({
      message: `¿Quitar ${fila.tipo === "INPUT" ? "la entrada" : "la salida"} ${fila.etiqueta} «${fila.nombre}» de esta fecha? Lo que venga después se recorre.`,
      danger: true,
      confirmText: "Quitar",
    });
    if (!ok) return;
    const res = await fetch(`/api/show-canales/${fila.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo quitar el canal");
      return;
    }
    if (d.listas) onListas(d.listas as ListasDelShow);
    if (fila.invitadoId) onInvitadosDesfasados();
  }

  const { resumen } = listas;

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
          <p className="ms-label mb-1">Canales extra</p>
          <p
            className={`text-lg font-semibold ${
              resumen.entradasShow + resumen.salidasShow > 0 ? "text-amber-300" : "text-emerald-300"
            }`}
          >
            {resumen.entradasShow + resumen.salidasShow}
          </p>
          <p className="ms-meta">que el rider maestro no contempla</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Rider maestro</p>
          <p className={`text-lg font-semibold ${listas.conRider ? "text-emerald-300" : "text-amber-300"}`}>
            {listas.conRider ? "Leído" : "Sin rider"}
          </p>
          <p className="ms-meta">
            {listas.conRider
              ? "la numeración arranca después de él"
              : "sin rider la numeración arranca en 1: falta la base"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setNuevo((n) => (n ? null : { ...NUEVO }))} className="ms-btn-ghost">
          {nuevo ? "Cerrar" : "+ Canal a mano"}
        </button>
        <span className="ms-micro">
          Para lo que se agregó en plaza y no cae en la lista corta de requerimientos.
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
        nota="El orden del patch es el número de canal. Lo del rider maestro va primero y no se edita aquí; lo que agrega esta fecha sigue la secuencia."
        tipo="INPUT"
        filas={listas.inputs}
        valor={valor}
        escribir={escribir}
        patch={patch}
        quitar={quitar}
      />

      <TablaCanales
        titulo="Output list de la fecha"
        nota="Las salidas llevan su propia secuencia. Un mix estéreo ocupa dos canales de consola, así que se lee «15/16»."
        tipo="OUTPUT"
        filas={listas.outputs}
        valor={valor}
        escribir={escribir}
        patch={patch}
        quitar={quitar}
      />
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
  escribir: (canalId: string, campo: string, valor: string) => void;
  patch: (canalId: string, campos: Record<string, unknown>, invitadoId?: string | null) => Promise<void>;
  quitar: (fila: FilaCanal) => Promise<void>;
}

function TablaCanales({ titulo, nota, tipo, filas, valor, escribir, patch, quitar }: TablaProps) {
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
                <th className="ms-th w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const delShow = f.origen === "SHOW";
                return (
                  <tr key={f.id} className={`ms-tr align-top ${delShow ? "bg-amber-400/[0.05]" : ""}`}>
                    <td className="ms-td">
                      <span className={`font-semibold ${delShow ? "text-amber-300" : "text-white"}`}>{f.etiqueta}</span>
                    </td>
                    <td className="ms-td">
                      {delShow ? (
                        <input
                          value={valor(f, "nombre")}
                          onChange={(e) => escribir(f.id, "nombre", e.target.value)}
                          className="ms-input-inline w-full"
                        />
                      ) : (
                        <span className="text-sm text-gray-200">{f.nombre}</span>
                      )}
                      {delShow && <span className="ms-badge ms-badge-amber mt-1 inline-block">de esta fecha</span>}
                    </td>

                    {esInput ? (
                      <>
                        <td className="ms-td">
                          {delShow ? (
                            <input
                              value={valor(f, "instrumento")}
                              onChange={(e) => escribir(f.id, "instrumento", e.target.value)}
                              className="ms-input-inline w-full"
                            />
                          ) : (
                            <span className="ms-meta">{f.instrumento ?? "—"}</span>
                          )}
                        </td>
                        <td className="ms-td">
                          {delShow ? (
                            <input
                              value={valor(f, "microfono")}
                              onChange={(e) => escribir(f.id, "microfono", e.target.value)}
                              className="ms-input-inline w-full"
                            />
                          ) : (
                            <span className="ms-meta">
                              {f.microfono ?? "—"}
                              {f.alternativas ? ` · o ${f.alternativas}` : ""}
                            </span>
                          )}
                        </td>
                        <td className="ms-td">
                          {delShow ? (
                            <select
                              value={f.soporte ?? ""}
                              onChange={(e) => void patch(f.id, { soporte: e.target.value || null }, f.invitadoId)}
                              className="ms-input-inline w-full"
                            >
                              <option value="">— Sin definir —</option>
                              {SOPORTES_MIC.map((s) => (
                                <option key={s} value={s} className="bg-[#111] text-white">
                                  {SOPORTE_MIC_LABEL[s]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="ms-meta">
                              {f.soporte ? (SOPORTE_MIC_LABEL[f.soporte] ?? f.soporte) : "—"}
                            </span>
                          )}
                        </td>
                        <td className="ms-td">
                          {delShow ? (
                            <input
                              type="checkbox"
                              checked={f.phantom}
                              onChange={(e) => void patch(f.id, { phantom: e.target.checked })}
                            />
                          ) : (
                            <span className="ms-meta">{f.phantom ? "48 V" : "—"}</span>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="ms-td">
                          {delShow ? (
                            <select
                              value={f.tipoSalida ?? ""}
                              onChange={(e) => void patch(f.id, { tipoSalida: e.target.value || null }, f.invitadoId)}
                              className="ms-input-inline w-full"
                            >
                              <option value="">— Sin definir —</option>
                              {TIPOS_SALIDA.map((t) => (
                                <option key={t} value={t} className="bg-[#111] text-white">
                                  {TIPO_SALIDA_LABEL[t]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="ms-meta">
                              {f.tipoSalida ? (TIPO_SALIDA_LABEL[f.tipoSalida] ?? f.tipoSalida) : "—"}
                            </span>
                          )}
                        </td>
                        <td className="ms-td">
                          {delShow ? (
                            <input
                              type="checkbox"
                              checked={f.estereo}
                              onChange={(e) => void patch(f.id, { estereo: e.target.checked }, f.invitadoId)}
                            />
                          ) : (
                            <span className="ms-meta">{f.estereo ? "L/R" : "mono"}</span>
                          )}
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
                      {delShow ? (
                        <input
                          value={valor(f, "notas")}
                          onChange={(e) => escribir(f.id, "notas", e.target.value)}
                          className="ms-input-inline w-full"
                        />
                      ) : (
                        <span className="ms-meta">{f.notas ?? "—"}</span>
                      )}
                    </td>
                    <td className="ms-td text-right">
                      {delShow ? (
                        <button
                          onClick={() => void quitar(f)}
                          className="text-red-400/70 hover:text-red-300 transition-colors px-1"
                          title="Quitar el canal de esta fecha"
                        >
                          ✕
                        </button>
                      ) : (
                        <span className="ms-micro text-[#444]" title="Viene del rider maestro: se edita en el rider">
                          rider
                        </span>
                      )}
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
