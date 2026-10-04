"use client";

/**
 * Los papeles del show o la gira. Cuatro bloques, en el orden en que se usan:
 *
 *  1. Libro de gira — el documento maestro. Se arma con las secciones que se
 *     elijan, así que una sola plantilla cubre desde el libro completo hasta la
 *     hoja de rooming suelta.
 *  2. Documentos del rider — rider y listas de canales. Salen del rider
 *     maestro, así que valen para todos los shows.
 *  3. Documentos por show — day sheet y advance. Un renglón por fecha, con su
 *     botón de descarga y su enlace público.
 *  4. Archivero — lo que llega de afuera y hay que tener a mano.
 *
 * Cada documento se descarga o se comparte desde su propio renglón: no hay
 * palomitas ni descarga masiva, porque nadie manda cuatro documentos de golpe.
 * Las secciones del libro son la excepción y no la contradicen: no eligen qué
 * documentos bajar, recortan uno.
 */

import { useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import {
  ESTADO_SHOW_COLOR,
  ESTADO_SHOW_LABEL,
  TIPOS_ARCHIVO_GIRA,
  TIPO_ARCHIVO_GIRA_COLOR,
  TIPO_ARCHIVO_GIRA_LABEL,
  esGira,
  fmtFechaCorta,
  fmtFechaLarga,
  fmtTamano,
  SECCIONES_LIBRO,
  SECCION_LIBRO_AYUDA,
  SECCION_LIBRO_LABEL,
  type SeccionLibro,
} from "@/lib/giras";

export interface ShowDoc {
  id: string;
  fecha: string;
  ciudad: string | null;
  venueNombre: string | null;
  estado: string;
  docsToken: string | null;
  bloques: number;
  renglonesAdvance: number;
}

export interface ArchivoFila {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  tamanoBytes: number | null;
  createdAt: string;
  show: { id: string; fecha: string; ciudad: string | null } | null;
}

interface RiderResuelto {
  id: string;
  nombre: string;
  version: number;
  esActivo: boolean;
}

interface Props {
  giraId: string;
  giraNombre: string;
  /// SHOW o GIRA: decide si el libro se llama "de gira" o "del show".
  giraTipo: string | null;
  artistaNombre: string;
  portalToken: string | null;
  rider: RiderResuelto | null;
  /// El rider no está enganchado a la gira: se tomó el activo del artista.
  riderHeredado: boolean;
  shows: ShowDoc[];
  archivosIniciales: ArchivoFila[];
}

const DOCS_GIRA = [
  {
    slug: "rider",
    label: "Rider técnico",
    descripcion: "Lo que pide el artista, con prioridad y quién lo pone. Dos páginas: equipo e input/output list.",
  },
  {
    slug: "input-list",
    label: "Input y output list",
    descripcion: "Solo las dos listas de canales. Es lo que pide el ingeniero de la casa para parchar.",
  },
] as const;

const DOCS_PLAZA = [
  { slug: "day-sheet", label: "Day sheet" },
  { slug: "advance", label: "Advance" },
] as const;

function etiquetaShow(p: { fecha: string; ciudad: string | null }): string {
  return [fmtFechaCorta(p.fecha), p.ciudad].filter(Boolean).join(" · ");
}

export default function DocumentosClient({
  giraId,
  giraNombre,
  giraTipo,
  artistaNombre,
  portalToken,
  rider,
  riderHeredado,
  shows,
  archivosIniciales,
}: Props) {
  const toast = useToast();
  const confirmar = useConfirm();

  const [token, setToken] = useState(portalToken);
  const [tokensShow, setTokensShow] = useState<Record<string, string | null>>(
    Object.fromEntries(shows.map((p) => [p.id, p.docsToken])),
  );
  const [archivos, setArchivos] = useState<ArchivoFila[]>(archivosIniciales);
  const [ocupado, setOcupado] = useState<string | null>(null);

  // ── Libro de gira ──────────────────────────────────────────────────────────
  // Arranca con todo prendido: el caso normal es bajar el libro completo, y
  // apagar secciones es lo excepcional. Si se apagan todas se vuelve al libro
  // completo en vez de emitir un PDF vacío.
  const [secciones, setSecciones] = useState<SeccionLibro[]>([...SECCIONES_LIBRO]);
  const libroCompleto = secciones.length === SECCIONES_LIBRO.length;

  function alternarSeccion(s: SeccionLibro) {
    setSecciones((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : SECCIONES_LIBRO.filter((x) => x === s || prev.includes(x)),
    );
  }

  /// Sin el parámetro el generador imprime el libro completo, así que solo se
  /// manda cuando de verdad hay un recorte.
  const queryLibro = libroCompleto || secciones.length === 0 ? null : `secciones=${secciones.join(",")}`;

  function urlLibro(inline: boolean): string {
    const qs = [inline ? "inline=1" : null, queryLibro].filter(Boolean).join("&");
    return `/api/giras/${giraId}/documentos/libro-gira${qs ? `?${qs}` : ""}`;
  }

  // ── Enlaces públicos ───────────────────────────────────────────────────────
  function copiar(url: string, mensaje: string) {
    navigator.clipboard.writeText(url).catch(() => {});
    toast.success(mensaje);
  }

  /// El token del registro cubre los documentos que no dependen de una fecha; se
  /// crea la primera vez que alguien comparte uno.
  async function compartirDeGira(slug: string, query: string | null = null) {
    setOcupado(`gira:${slug}`);
    try {
      let actual = token;
      if (!actual) {
        const res = await fetch(`/api/giras/${giraId}/docs-token`, { method: "POST" });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(d.error ?? "No se pudo generar el enlace");
          return;
        }
        actual = d.token as string;
        setToken(actual);
      }
      // El recorte de secciones viaja en el enlace: quien lo abra ve el mismo
      // documento que se eligió aquí, no el libro completo.
      const url = `${window.location.origin}/gira-doc/${actual}/${slug}${query ? `?${query}` : ""}`;
      copiar(url, "Enlace copiado — se regenera con la gira en cada visita");
    } finally {
      setOcupado(null);
    }
  }

  /// El token del show abre los cuatro documentos: quien está en el foro
  /// necesita el day sheet y el rider, y no se le van a mandar dos ligas.
  async function compartirDeShow(showId: string, slug: string) {
    setOcupado(`show:${showId}:${slug}`);
    try {
      let actual = tokensShow[showId] ?? null;
      if (!actual) {
        const res = await fetch(`/api/gira-shows/${showId}/docs-token`, { method: "POST" });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(d.error ?? "No se pudo generar el enlace");
          return;
        }
        actual = d.token as string;
        setTokensShow((prev) => ({ ...prev, [showId]: actual }));
      }
      copiar(`${window.location.origin}/gira-doc/${actual}/${slug}`, "Enlace copiado — se actualiza solo con el show");
    } finally {
      setOcupado(null);
    }
  }

  async function revocarShow(showId: string) {
    const ok = await confirmar({
      message:
        "¿Revocar el enlace de este show? Quien lo tenga dejará de ver los documentos y habrá que compartirle uno nuevo.",
      danger: true,
      confirmText: "Revocar",
    });
    if (!ok) return;
    const res = await fetch(`/api/gira-shows/${showId}/docs-token`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo revocar el enlace");
      return;
    }
    setTokensShow((prev) => ({ ...prev, [showId]: null }));
    toast.success("Enlace revocado");
  }

  async function revocarGira() {
    const ok = await confirmar({
      message:
        "¿Revocar el enlace de la gira? Quien lo tenga dejará de ver el libro, el rider y las listas de canales.",
      danger: true,
      confirmText: "Revocar",
    });
    if (!ok) return;
    const res = await fetch(`/api/giras/${giraId}/docs-token`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo revocar el enlace");
      return;
    }
    setToken(null);
    toast.success("Enlace revocado");
  }

  // ── Archivero ──────────────────────────────────────────────────────────────
  const inputArchivo = useRef<HTMLInputElement>(null);
  const [tipoNuevo, setTipoNuevo] = useState("RIDER_CASA");
  const [showNuevo, setShowNuevo] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    try {
      // El binario sube directo del navegador a Blob: así un plano de 30 MB no
      // choca con el límite de las funciones.
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const blob = await upload(`giras/${giraId}/${Date.now()}-${tipoNuevo.toLowerCase()}.${ext}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload/token",
      });

      const res = await fetch(`/api/giras/${giraId}/archivos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: blob.url,
          nombre: file.name,
          tipo: tipoNuevo,
          tamanoBytes: file.size,
          showId: showNuevo || null,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar el archivo");
        return;
      }
      setArchivos((prev) => [
        {
          id: d.archivo.id,
          nombre: d.archivo.nombre,
          url: d.archivo.url,
          tipo: d.archivo.tipo ?? "OTRO",
          tamanoBytes: d.archivo.tamanoBytes,
          createdAt: d.archivo.createdAt,
          show: d.archivo.show
            ? { id: d.archivo.show.id, fecha: d.archivo.show.fecha, ciudad: d.archivo.show.ciudad }
            : null,
        },
        ...prev,
      ]);
      toast.success("Archivo guardado en el archivero");
    } catch {
      toast.error("Error de conexión al subir el archivo");
    } finally {
      setSubiendo(false);
      if (inputArchivo.current) inputArchivo.current.value = "";
    }
  }

  async function borrarArchivo(a: ArchivoFila) {
    const ok = await confirmar({
      message: `¿Quitar "${a.nombre}" del archivero? El archivo se borra y no se puede recuperar desde aquí.`,
      danger: true,
      confirmText: "Quitar",
    });
    if (!ok) return;
    const res = await fetch(`/api/giras/${giraId}/archivos/${a.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar el archivo");
      return;
    }
    setArchivos((prev) => prev.filter((x) => x.id !== a.id));
    toast.success("Archivo quitado");
  }

  const porTipo = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const a of archivos) cuenta.set(a.tipo, (cuenta.get(a.tipo) ?? 0) + 1);
    return cuenta;
  }, [archivos]);

  return (
    <div className="space-y-6">
      {/* ── Libro de gira ── */}
      <section className="space-y-3">
        <div>
          <h2 className="ms-h2">Libro de {esGira(giraTipo) ? "gira" : "show"}</h2>
          <p className="ms-meta mt-1">
            El documento maestro: todo lo que se planeó aquí, en un solo PDF. Apaga las secciones que no vayan a
            servir y el libro se recorta — así el tour manager recibe el libro completo y el crew nada más la hoja
            que le toca, sin inventar otro documento.
          </p>
        </div>

        <div className="ms-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SECCIONES_LIBRO.map((s) => {
              const dentro = secciones.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => alternarSeccion(s)}
                  className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                    dentro
                      ? "border-[#B3985B]/40 bg-[#B3985B]/10"
                      : "border-[#1e1e1e] bg-[#0d0d0d] hover:border-[#2a2a2a]"
                  }`}
                >
                  <span className={`text-[13px] ${dentro ? "text-[#B3985B]" : "text-[#6b7280]"}`}>
                    {SECCION_LIBRO_LABEL[s]}
                  </span>
                  <span className="block ms-meta mt-0.5 leading-relaxed">{SECCION_LIBRO_AYUDA[s]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#1a1a1a]">
            <p className="ms-meta flex-1 min-w-[200px]">
              {libroCompleto
                ? `Libro completo · ${SECCIONES_LIBRO.length} secciones`
                : secciones.length === 0
                  ? "No queda ninguna sección prendida: se emitirá el libro completo."
                  : `${secciones.length} de ${SECCIONES_LIBRO.length} secciones`}
            </p>
            <a className="ms-btn-secondary" href={urlLibro(true)} target="_blank" rel="noreferrer">
              Ver
            </a>
            <a className="ms-btn-ghost" href={urlLibro(false)}>
              Descargar
            </a>
            <button
              className="ms-btn-ghost"
              disabled={ocupado === "gira:libro-gira"}
              onClick={() => compartirDeGira("libro-gira", queryLibro)}
            >
              {ocupado === "gira:libro-gira" ? "Generando…" : "Copiar enlace"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Documentos generales ── */}
      <section className="space-y-3">
        <div>
          <h2 className="ms-h2">Documentos del rider</h2>
          <p className="ms-meta mt-1">
            {rider
              ? `Salen de ${rider.nombre} · versión ${rider.version}${riderHeredado ? " (rider activo del artista, no está enganchado a este registro)" : ""}`
              : `${artistaNombre} no tiene un rider técnico capturado: sin él no se pueden emitir estos documentos.`}
          </p>
        </div>

        {!rider ? (
          <div className="ms-empty-state">
            <p className="text-sm text-[#6b7280]">
              Captura el rider del artista y engánchalo aquí para poder emitir el rider técnico y las listas de
              canales.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {DOCS_GIRA.map((d) => (
              <div key={d.slug} className="ms-card p-4 flex flex-col gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{d.label}</p>
                  <p className="ms-meta mt-1 leading-relaxed">{d.descripcion}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-auto">
                  <a
                    className="ms-btn-secondary"
                    href={`/api/giras/${giraId}/documentos/${d.slug}?inline=1`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver
                  </a>
                  <a className="ms-btn-ghost" href={`/api/giras/${giraId}/documentos/${d.slug}`}>
                    Descargar
                  </a>
                  <button
                    className="ms-btn-ghost"
                    disabled={ocupado === `gira:${d.slug}`}
                    onClick={() => compartirDeGira(d.slug)}
                  >
                    {ocupado === `gira:${d.slug}` ? "Generando…" : "Copiar enlace"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {token && (
          <div className="ms-card-deep p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="ms-meta">
              Hay un enlace público activo para el libro de gira, el rider y las listas de canales. Caduca en 180
              días desde que se generó.
            </p>
            <button className="ms-btn-ghost shrink-0" onClick={revocarGira}>
              Revocar enlace
            </button>
          </div>
        )}
      </section>

      {/* ── Documentos por show ── */}
      <section className="space-y-3">
        <div>
          <h2 className="ms-h2">Documentos por show</h2>
          <p className="ms-meta mt-1">
            El day sheet y el advance hablan de una fecha, así que se emiten desde el renglón del show. El enlace de
            un show abre además el rider: es el único que se le manda al foro.
          </p>
        </div>

        {shows.length === 0 ? (
          <div className="ms-empty-state">
            <p className="text-sm text-[#6b7280]">
              {giraNombre} todavía no tiene shows. Agrégalos para poder emitir day sheets.
            </p>
          </div>
        ) : (
          <div className="ms-table-wrapper overflow-x-auto">
            <table className="w-full min-w-[840px]">
              <thead className="ms-thead">
                <tr>
                  <th className="ms-th text-left">Show</th>
                  <th className="ms-th text-left">Estado</th>
                  <th className="ms-th text-left">Corrida</th>
                  <th className="ms-th text-left">Advance</th>
                  <th className="ms-th text-right">Documentos</th>
                </tr>
              </thead>
              <tbody>
                {shows.map((p) => (
                  <tr key={p.id} className="ms-tr">
                    <td className="ms-td">
                      <div className="text-white text-[13px]">{fmtFechaLarga(p.fecha)}</div>
                      <div className="ms-meta">
                        {[p.ciudad, p.venueNombre].filter(Boolean).join(" · ") || "Sin lugar"}
                      </div>
                    </td>
                    <td className="ms-td">
                      <span className={`ms-badge ${ESTADO_SHOW_COLOR[p.estado] ?? ""}`}>
                        {ESTADO_SHOW_LABEL[p.estado] ?? p.estado}
                      </span>
                    </td>
                    <td className="ms-td text-[13px]">
                      {p.bloques > 0 ? (
                        <span className="text-[#9ca3af]">{p.bloques} bloques</span>
                      ) : (
                        <span className="text-[#6b7280]">Se deriva de los horarios</span>
                      )}
                    </td>
                    <td className="ms-td text-[13px]">
                      {p.renglonesAdvance > 0 ? (
                        <span className="text-[#9ca3af]">{p.renglonesAdvance} renglones</span>
                      ) : (
                        <span className="text-[#6b7280]">Sin armar</span>
                      )}
                    </td>
                    <td className="ms-td">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {DOCS_PLAZA.map((d) => (
                          <span key={d.slug} className="flex items-center gap-1">
                            <a
                              className="ms-btn-ghost"
                              href={`/api/gira-shows/${p.id}/documentos/${d.slug}?inline=1`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {d.label}
                            </a>
                            <button
                              className="ms-btn-ghost"
                              title={`Copiar enlace público del ${d.label.toLowerCase()}`}
                              disabled={ocupado === `show:${p.id}:${d.slug}`}
                              onClick={() => compartirDeShow(p.id, d.slug)}
                            >
                              {ocupado === `show:${p.id}:${d.slug}` ? "…" : "Enlace"}
                            </button>
                          </span>
                        ))}
                        {tokensShow[p.id] && (
                          <button className="ms-btn-ghost text-red-400" onClick={() => revocarShow(p.id)}>
                            Revocar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Archivero ── */}
      <section className="space-y-3">
        <div>
          <h2 className="ms-h2">Archivero</h2>
          <p className="ms-meta mt-1">
            Lo que llega de afuera: el rider de la casa, el contrato, el plano del foro, la input list que mandó el
            ingeniero local. Un archivo puede ser general o de un show.
          </p>
        </div>

        <div className="ms-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <label className="flex flex-col gap-1">
              <span className="ms-label">Qué es</span>
              <select className="ms-input" value={tipoNuevo} onChange={(e) => setTipoNuevo(e.target.value)}>
                {TIPOS_ARCHIVO_GIRA.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_ARCHIVO_GIRA_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="ms-label">De qué show</span>
              <select className="ms-input" value={showNuevo} onChange={(e) => setShowNuevo(e.target.value)}>
                <option value="">General</option>
                {shows.map((p) => (
                  <option key={p.id} value={p.id}>
                    {etiquetaShow(p)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                className="ms-btn-primary w-full"
                disabled={subiendo}
                onClick={() => inputArchivo.current?.click()}
              >
                {subiendo ? "Subiendo…" : "Subir archivo"}
              </button>
              <input ref={inputArchivo} type="file" className="hidden" onChange={subir} />
            </div>
          </div>
        </div>

        {archivos.length === 0 ? (
          <div className="ms-empty-state">
            <p className="text-sm text-[#6b7280]">
              El archivero está vacío. Sube el rider de la casa o el contrato en cuanto lleguen: aquí los encuentra
              cualquiera del equipo.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {[...porTipo.entries()].map(([tipo, n]) => (
                <span key={tipo} className={`ms-badge ${TIPO_ARCHIVO_GIRA_COLOR[tipo] ?? "ms-badge-gray"}`}>
                  {TIPO_ARCHIVO_GIRA_LABEL[tipo] ?? tipo} · {n}
                </span>
              ))}
            </div>

            <div className="ms-table-wrapper overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="ms-thead">
                  <tr>
                    <th className="ms-th text-left">Archivo</th>
                    <th className="ms-th text-left">Qué es</th>
                    <th className="ms-th text-left">Show</th>
                    <th className="ms-th text-left">Tamaño</th>
                    <th className="ms-th text-left">Subido</th>
                    <th className="ms-th" />
                  </tr>
                </thead>
                <tbody>
                  {archivos.map((a) => (
                    <tr key={a.id} className="ms-tr">
                      <td className="ms-td">
                        <a
                          className="text-[13px] text-white hover:text-[#B3985B]"
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {a.nombre}
                        </a>
                      </td>
                      <td className="ms-td">
                        <span className={`ms-badge ${TIPO_ARCHIVO_GIRA_COLOR[a.tipo] ?? "ms-badge-gray"}`}>
                          {TIPO_ARCHIVO_GIRA_LABEL[a.tipo] ?? a.tipo}
                        </span>
                      </td>
                      <td className="ms-td text-[13px] text-[#9ca3af]">
                        {a.show ? etiquetaShow(a.show) : "General"}
                      </td>
                      <td className="ms-td text-[13px] text-[#9ca3af]">{fmtTamano(a.tamanoBytes)}</td>
                      <td className="ms-td text-[13px] text-[#9ca3af]">{fmtFechaCorta(a.createdAt)}</td>
                      <td className="ms-td text-right">
                        <button className="ms-btn-ghost text-red-400" onClick={() => borrarArchivo(a)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
