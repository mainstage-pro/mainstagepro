"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { useToast } from "@/components/Toast";
import { DISCIPLINAS, DISCIPLINA_LABEL, SECCIONES_RIDER } from "@/lib/giras";

interface Renglon {
  clave: string;
  cantidad: number | null;
  concepto: string;
  notas: string | null;
  crudo: string;
}

interface Seccion {
  clave: string;
  titulo: string;
  texto: string;
  destino: string;
  departamento: string;
  renglones: Renglon[];
}

/// A dónde puede ir el texto de una sección del documento. Los campos de notas
/// salen del mismo vocabulario que imprime el PDF, así que la lista no se
/// desincroniza con el rider.
const DESTINOS: { valor: string; label: string }[] = [
  { valor: "SECCION", label: "Sección propia, con su título" },
  { valor: "requerimientosGenerales", label: "Requerimientos generales" },
  ...SECCIONES_RIDER.flatMap((s) =>
    s.notas.map((n) => ({
      valor: n.campo,
      label: n.label ? `${s.titulo} — ${n.label}` : s.titulo,
    })),
  ),
  { valor: "NINGUNO", label: "No guardar este texto" },
];

/**
 * Mete el Word del rider del artista a la ficha. La lectura es literal: lo que
 * el documento no dice se queda vacío, y cada renglón trae su texto original
 * para poder compararlo. Nada se guarda hasta que se revisa aquí.
 */
export default function RiderDocTranscribir({ riderId }: { riderId: string }) {
  const router = useRouter();
  const toast = useToast();

  const [abierto, setAbierto] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [secciones, setSecciones] = useState<Seccion[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function leer(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTrabajando(true);
    try {
      // El .docx sube directo del navegador a Blob y el servidor lo baja de
      // ahí: así no pega con el límite de las funciones serverless.
      const blob = await upload(`riders/${riderId}/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload/token",
      });
      const res = await fetch(`/api/artista-riders/${riderId}/transcribir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivoUrl: blob.url }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo leer el documento");
        return;
      }
      type SeccionLeida = {
        titulo: string | null;
        parrafos: string[];
        departamento: string | null;
        renglones: Omit<Renglon, "clave">[];
      };
      const leidas: Seccion[] = (d.secciones as SeccionLeida[]).map((s, i) => ({
        clave: `s-${i}`,
        titulo: s.titulo ?? "",
        texto: s.parrafos.join("\n\n"),
        destino: "SECCION",
        departamento: s.departamento ?? "OTRO",
        renglones: s.renglones.map((r, j) => ({ ...r, clave: `s-${i}-r-${j}` })),
      }));
      setSecciones(leidas);
      setAviso(
        `${leidas.length} secciones · ${d.totalRenglones} renglones de equipo · ${d.totalParrafos} párrafos, en el orden del documento`,
      );
    } catch {
      toast.error("No se pudo subir el documento");
    } finally {
      setTrabajando(false);
      if (input.current) input.current.value = "";
    }
  }

  function setSeccion(clave: string, campos: Partial<Seccion>) {
    setSecciones((p) => (p ? p.map((s) => (s.clave === clave ? { ...s, ...campos } : s)) : p));
  }

  function setRenglon(clave: string, rclave: string, campos: Partial<Renglon>) {
    setSecciones((p) =>
      p
        ? p.map((s) =>
            s.clave === clave
              ? { ...s, renglones: s.renglones.map((r) => (r.clave === rclave ? { ...r, ...campos } : r)) }
              : s,
          )
        : p,
    );
  }

  function quitarRenglon(clave: string, rclave: string) {
    setSecciones((p) =>
      p ? p.map((s) => (s.clave === clave ? { ...s, renglones: s.renglones.filter((r) => r.clave !== rclave) } : s)) : p,
    );
  }

  function quitarSeccion(clave: string) {
    setSecciones((p) => (p ? p.filter((s) => s.clave !== clave) : p));
  }

  async function guardar() {
    if (!secciones?.length) return;
    setTrabajando(true);
    try {
      const res = await fetch(`/api/artista-riders/${riderId}/transcribir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secciones: secciones.map((s) => ({
            titulo: s.titulo,
            texto: s.texto,
            destino: s.destino,
            departamento: s.departamento,
            renglones: s.renglones.map((r) => ({ cantidad: r.cantidad, concepto: r.concepto, notas: r.notas })),
          })),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar la transcripción");
        return;
      }
      toast.success(`${d.lineas} renglones de equipo y ${d.notas} bloques de notas guardados`);
      setSecciones(null);
      setAviso(null);
      setAbierto(false);
      router.refresh();
    } finally {
      setTrabajando(false);
    }
  }

  const totalRenglones = secciones?.reduce((n, s) => n + s.renglones.length, 0) ?? 0;
  const sinCantidad = secciones?.reduce((n, s) => n + s.renglones.filter((r) => r.cantidad === null).length, 0) ?? 0;

  if (!abierto) {
    return (
      <section className="ms-card p-4 space-y-2">
        <p className="ms-section-label">Transcribir el rider desde Word</p>
        <p className="ms-micro">
          Sube el .docx del artista y se lee tal como viene: las secciones en su orden, con sus títulos, y el equipo con
          la cantidad que diga el documento. Lo revisas antes de que se guarde nada.
        </p>
        <button className="ms-btn-secondary" onClick={() => setAbierto(true)}>
          Subir el rider en Word
        </button>
      </section>
    );
  }

  return (
    <section className="ms-card p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="ms-section-label">Transcribir el rider desde Word</p>
          <p className="ms-micro mt-0.5">
            Solo entra lo que el documento dice. Si no trae marca, modelo o cantidad, el campo se queda vacío.
          </p>
        </div>
        <button
          className="ms-btn-ghost"
          onClick={() => {
            setAbierto(false);
            setSecciones(null);
            setAviso(null);
          }}
        >
          Cerrar
        </button>
      </div>

      {secciones === null ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="ms-btn-primary disabled:opacity-40"
            onClick={() => input.current?.click()}
            disabled={trabajando}
          >
            {trabajando ? "Leyendo el documento…" : "Elegir el .docx"}
          </button>
          <span className="ms-micro">Todavía no se guarda nada: primero revisas la lectura.</span>
          <input
            ref={input}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => void leer(e)}
          />
        </div>
      ) : (
        <>
          {aviso && <p className="ms-micro text-[#B3985B]">{aviso}</p>}
          {sinCantidad > 0 && (
            <p className="ms-micro text-amber-300">
              {sinCantidad} renglones no traen cantidad en el documento. Si los dejas en blanco se guardan como 1.
            </p>
          )}

          <div className="space-y-3 max-h-[620px] overflow-y-auto">
            {secciones.map((s) => (
              <div key={s.clave} className="ms-card-inset p-3 space-y-2">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_160px_auto] gap-2 items-end">
                  <div>
                    <label className="ms-label block mb-1">Título en el documento</label>
                    <input
                      className="ms-input-inline w-full"
                      placeholder="(sin título)"
                      value={s.titulo}
                      onChange={(e) => setSeccion(s.clave, { titulo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="ms-label block mb-1">El texto va a</label>
                    <select
                      className="ms-input-inline w-full"
                      value={s.destino}
                      onChange={(e) => setSeccion(s.clave, { destino: e.target.value })}
                    >
                      {DESTINOS.map((d) => (
                        <option key={d.valor} value={d.valor}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="ms-label block mb-1">Departamento</label>
                    <select
                      className="ms-input-inline w-full"
                      value={s.departamento}
                      onChange={(e) => setSeccion(s.clave, { departamento: e.target.value })}
                    >
                      {DISCIPLINAS.map((d) => (
                        <option key={d} value={d}>
                          {DISCIPLINA_LABEL[d]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => quitarSeccion(s.clave)}
                    className="ms-btn-ghost shrink-0"
                    title="No transcribir esta sección"
                  >
                    Quitar
                  </button>
                </div>

                {s.texto && (
                  <textarea
                    className="ms-textarea w-full"
                    rows={Math.min(8, Math.max(2, Math.ceil(s.texto.length / 110)))}
                    value={s.texto}
                    onChange={(e) => setSeccion(s.clave, { texto: e.target.value })}
                  />
                )}

                {s.renglones.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                      <thead className="ms-thead">
                        <tr>
                          <th className="ms-th text-left w-[70px]">Cant.</th>
                          <th className="ms-th text-left w-[280px]">Concepto</th>
                          <th className="ms-th text-left w-[180px]">Notas</th>
                          <th className="ms-th text-left">Como venía</th>
                          <th className="ms-th w-[36px]" />
                        </tr>
                      </thead>
                      <tbody>
                        {s.renglones.map((r) => (
                          <tr key={r.clave} className="ms-tr align-top">
                            <td className="ms-td">
                              <input
                                type="number"
                                min={1}
                                className="ms-input-inline w-full"
                                placeholder="—"
                                value={r.cantidad ?? ""}
                                onChange={(e) =>
                                  setRenglon(s.clave, r.clave, {
                                    cantidad: e.target.value === "" ? null : Number(e.target.value),
                                  })
                                }
                              />
                            </td>
                            <td className="ms-td">
                              <input
                                className="ms-input-inline w-full"
                                value={r.concepto}
                                onChange={(e) => setRenglon(s.clave, r.clave, { concepto: e.target.value })}
                              />
                            </td>
                            <td className="ms-td">
                              <input
                                className="ms-input-inline w-full"
                                value={r.notas ?? ""}
                                onChange={(e) => setRenglon(s.clave, r.clave, { notas: e.target.value || null })}
                              />
                            </td>
                            <td className="ms-td">
                              <span className="ms-micro text-[#555]">{r.crudo}</span>
                            </td>
                            <td className="ms-td">
                              <button
                                onClick={() => quitarRenglon(s.clave, r.clave)}
                                className="text-[#555] hover:text-red-400 transition-colors"
                                title="No transcribir este renglón"
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
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void guardar()}
              disabled={trabajando || secciones.length === 0}
              className="ms-btn-primary disabled:opacity-40"
            >
              {trabajando ? "Guardando…" : `Transcribir ${totalRenglones} renglones`}
            </button>
            <button className="ms-btn-ghost" onClick={() => setSecciones(null)} disabled={trabajando}>
              Subir otro documento
            </button>
            <span className="ms-micro">
              El equipo se agrega a lo que ya tenía el rider; no se borra nada de lo que estaba.
            </span>
          </div>
        </>
      )}
    </section>
  );
}
