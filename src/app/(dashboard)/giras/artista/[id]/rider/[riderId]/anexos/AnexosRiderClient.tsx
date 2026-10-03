"use client";

/**
 * Stage plots, patches y planos del rider.
 *
 * El binario sube del navegador directo a Vercel Blob: un plano escaneado de 20
 * MB no cabe en el límite de las funciones serverless. Aquí solo se registra la
 * metadata.
 *
 * Dos formas, dos destinos en el PDF:
 *
 *  · Imagen → se dibuja en su propia página, encajada por el lado que apriete
 *    primero para que un escenario de 12×8 no se imprima como 12×12.
 *  · PDF    → se pega al final del documento con sus páginas intactas.
 *
 * `incluirEnPdf` existe porque hay planos de trabajo que sirven internamente y
 * no se mandan a la casa.
 */

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import {
  TIPOS_ARCHIVO_RIDER,
  TIPO_ARCHIVO_RIDER_COLOR,
  TIPO_ARCHIVO_RIDER_LABEL,
  esImagenArchivo,
  fmtTamano,
} from "@/lib/giras";

export interface AnexoFila {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  mime: string | null;
  tamanoBytes: number | null;
  incluirEnPdf: boolean;
  notas: string | null;
  orden: number;
}

interface Props {
  riderId: string;
  stagePlotUrl: string | null;
  anexosIniciales: AnexoFila[];
}

const DEMORA_GUARDADO = 700;

export default function AnexosRiderClient({ riderId, stagePlotUrl, anexosIniciales }: Props) {
  const toast = useToast();
  const confirm = useConfirm();

  const [anexos, setAnexos] = useState<AnexoFila[]>(anexosIniciales);
  const [tipoNuevo, setTipoNuevo] = useState("STAGE_PLOT");
  const [subiendo, setSubiendo] = useState(false);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const pendientes = useRef(new Map<string, Record<string, unknown>>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  async function descargar(anexoId: string) {
    const campos = pendientes.current.get(anexoId);
    pendientes.current.delete(anexoId);
    const t = timers.current.get(anexoId);
    if (t) clearTimeout(t);
    timers.current.delete(anexoId);
    if (!campos) return;

    const res = await fetch(`/api/artista-riders/${riderId}/archivos`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: anexoId, ...campos }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo guardar el anexo");
    }
  }

  function editar(anexoId: string, campos: Record<string, unknown>, inmediato = false) {
    setAnexos((prev) => prev.map((a) => (a.id === anexoId ? ({ ...a, ...campos } as AnexoFila) : a)));
    pendientes.current.set(anexoId, { ...(pendientes.current.get(anexoId) ?? {}), ...campos });
    const t = timers.current.get(anexoId);
    if (t) clearTimeout(t);
    if (inmediato) {
      void descargar(anexoId);
      return;
    }
    timers.current.set(anexoId, setTimeout(() => void descargar(anexoId), DEMORA_GUARDADO));
  }

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    if (archivos.length === 0) return;
    setSubiendo(true);
    try {
      for (const file of archivos) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const blob = await upload(
          `riders/${riderId}/${Date.now()}-${tipoNuevo.toLowerCase()}.${ext}`,
          file,
          { access: "public", handleUploadUrl: "/api/upload/token" },
        );

        const res = await fetch(`/api/artista-riders/${riderId}/archivos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: blob.url,
            nombre: file.name,
            tipo: tipoNuevo,
            mime: file.type || null,
            tamanoBytes: file.size,
          }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(d.error ?? `No se pudo registrar ${file.name}`);
          continue;
        }
        setAnexos((prev) => [...prev, d.archivo]);
      }
      toast.success(archivos.length === 1 ? "Anexo subido" : `${archivos.length} anexos subidos`);
    } catch {
      toast.error("No se pudo subir el archivo");
    } finally {
      setSubiendo(false);
      if (inputArchivo.current) inputArchivo.current.value = "";
    }
  }

  async function quitar(a: AnexoFila) {
    const ok = await confirm({
      message: `¿Quitar «${a.nombre}» de este rider?`,
      danger: true,
      confirmText: "Quitar",
    });
    if (!ok) return;
    const res = await fetch(`/api/artista-riders/${riderId}/archivos?id=${a.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar");
      return;
    }
    setAnexos((prev) => prev.filter((x) => x.id !== a.id));
  }

  async function adoptarStagePlotViejo() {
    if (!stagePlotUrl) return;
    const res = await fetch(`/api/artista-riders/${riderId}/archivos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: stagePlotUrl, nombre: "Stage plot", tipo: "STAGE_PLOT" }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo traer el stage plot");
      return;
    }
    setAnexos((prev) => [...prev, d.archivo]);
  }

  const imagenes = anexos.filter((a) => esImagenArchivo(a.url, a.mime));
  const documentos = anexos.filter((a) => !esImagenArchivo(a.url, a.mime));
  const enPdf = anexos.filter((a) => a.incluirEnPdf).length;
  const sueltoSinAdoptar = Boolean(stagePlotUrl) && !anexos.some((a) => a.url === stagePlotUrl);

  return (
    <div className="ms-page space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="ms-h2">Stage plots y anexos</h2>
          <p className="ms-subtitle mt-1">
            Las imágenes se imprimen en su propia página, respetando su proporción; los PDF se pegan completos al
            final del rider con sus páginas intactas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="ms-filter-select"
            value={tipoNuevo}
            onChange={(e) => setTipoNuevo(e.target.value)}
            disabled={subiendo}
          >
            {TIPOS_ARCHIVO_RIDER.map((t) => (
              <option key={t} value={t}>
                {TIPO_ARCHIVO_RIDER_LABEL[t]}
              </option>
            ))}
          </select>
          <button
            className="ms-btn-primary disabled:opacity-50"
            onClick={() => inputArchivo.current?.click()}
            disabled={subiendo}
          >
            {subiendo ? "Subiendo…" : "Subir archivo"}
          </button>
          <input
            ref={inputArchivo}
            type="file"
            multiple
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => void subir(e)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label">Imágenes</p>
          <p className="text-xl font-semibold mt-1 text-white">{imagenes.length}</p>
          <p className="ms-micro mt-0.5">una página cada una</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Documentos PDF</p>
          <p className="text-xl font-semibold mt-1 text-white">{documentos.length}</p>
          <p className="ms-micro mt-0.5">se pegan al final</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Salen en el PDF</p>
          <p className="text-xl font-semibold mt-1 text-[#B3985B]">{enPdf}</p>
        </div>
      </div>

      {sueltoSinAdoptar && (
        <div className="ms-card-deep p-3 flex flex-wrap items-center gap-3">
          <p className="text-[13px] text-[#9ca3af] flex-1 min-w-[260px]">
            La ficha tiene un stage plot capturado como URL suelta. Tráelo aquí para que se imprima con el rider.
          </p>
          <button className="ms-btn-secondary" onClick={() => void adoptarStagePlotViejo()}>
            Traerlo como anexo
          </button>
        </div>
      )}

      {anexos.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-[#6b7280]">
            Sin anexos. Sube el stage plot y el patch: es lo primero que abre la casa cuando recibe el rider.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {anexos.map((a) => {
            const esImagen = esImagenArchivo(a.url, a.mime);
            return (
              <section key={a.id} className="ms-card p-3">
                <div className="flex flex-col lg:flex-row gap-3">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 w-full lg:w-[200px] h-[130px] rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] overflow-hidden flex items-center justify-center"
                    title="Abrir el archivo"
                  >
                    {esImagen ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.url} alt={a.nombre} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="ms-micro">Abrir PDF</span>
                    )}
                  </a>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_190px] gap-2">
                      <div>
                        <label className="ms-label block mb-1">Nombre que se imprime</label>
                        <input
                          className="ms-input-inline w-full"
                          value={a.nombre}
                          onChange={(e) => editar(a.id, { nombre: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="ms-label block mb-1">Tipo</label>
                        <select
                          className="ms-input-inline w-full"
                          value={a.tipo}
                          onChange={(e) => editar(a.id, { tipo: e.target.value }, true)}
                        >
                          {TIPOS_ARCHIVO_RIDER.map((t) => (
                            <option key={t} value={t}>
                              {TIPO_ARCHIVO_RIDER_LABEL[t]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="ms-label block mb-1">Nota al pie</label>
                      <input
                        className="ms-input-inline w-full"
                        placeholder="ej. vista desde FOH, medidas en metros"
                        value={a.notas ?? ""}
                        onChange={(e) => editar(a.id, { notas: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={`ms-badge ${TIPO_ARCHIVO_RIDER_COLOR[a.tipo] ?? "ms-badge-gray"}`}>
                        {TIPO_ARCHIVO_RIDER_LABEL[a.tipo] ?? a.tipo}
                      </span>
                      <span className="ms-badge ms-badge-gray">
                        {esImagen ? "Imagen · página propia" : "PDF · se pega al final"}
                      </span>
                      {a.tamanoBytes ? <span className="ms-micro">{fmtTamano(a.tamanoBytes)}</span> : null}
                      <label className="flex items-center gap-1.5 ms-micro cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-[#B3985B] w-3.5 h-3.5"
                          checked={a.incluirEnPdf}
                          onChange={(e) => editar(a.id, { incluirEnPdf: e.target.checked }, true)}
                        />
                        Incluir en el PDF del rider
                      </label>
                      <button
                        onClick={() => void quitar(a)}
                        className="ms-micro text-[#555] hover:text-red-400 transition-colors ml-auto"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="ms-micro">
        Si el plano sale deformado en el PDF es porque la imagen venía con proporción distinta a la del marco: el
        documento la encaja sin estirarla, deja aire antes que deformar medidas.
      </p>
    </div>
  );
}
