"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { DISCIPLINAS, DISCIPLINA_LABEL } from "@/lib/giras";

interface Renglon {
  disciplina: string;
  concepto: string;
  cantidad: number;
  marca: string | null;
  modelo: string | null;
  notas: string | null;
  crudo: string;
  clave: string;
}

interface Props {
  venueId: string;
  onImportado: (items: unknown[]) => void;
}

/**
 * Pega el rider de la casa y lo convierte en renglones de inventario. Ningún
 * recinto manda su lista igual, así que la lectura es una propuesta: se corrige
 * aquí y se guarda cuando cuadra. Nada se escribe hasta que se aprieta Guardar.
 */
export default function VenueRiderImportar({ venueId, onImportado }: Props) {
  const toast = useToast();

  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [renglones, setRenglones] = useState<Renglon[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  async function leer() {
    if (!texto.trim()) return;
    setTrabajando(true);
    try {
      const res = await fetch(`/api/venues/${venueId}/inventario/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo leer el rider");
        return;
      }
      const leidos: Renglon[] = (d.renglones as Omit<Renglon, "clave">[]).map((r, i) => ({
        ...r,
        clave: `r-${i}`,
      }));
      setRenglones(leidos);
      setAviso(
        [
          `${leidos.length} renglones leídos`,
          d.descartadas ? `${d.descartadas} líneas descartadas por ruido` : null,
          d.reflujo ? "el texto venía en una palabra por línea y se rearmó" : null,
        ]
          .filter(Boolean)
          .join(" · "),
      );
      if (leidos.length === 0) toast.error("No se reconoció ningún renglón en ese texto");
    } finally {
      setTrabajando(false);
    }
  }

  function set(clave: string, campos: Partial<Renglon>) {
    setRenglones((prev) => (prev ? prev.map((r) => (r.clave === clave ? { ...r, ...campos } : r)) : prev));
  }

  function quitar(clave: string) {
    setRenglones((prev) => (prev ? prev.filter((r) => r.clave !== clave) : prev));
  }

  async function guardar() {
    if (!renglones?.length) return;
    setTrabajando(true);
    try {
      const res = await fetch(`/api/venues/${venueId}/inventario/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: renglones.map((r) => ({
            disciplina: r.disciplina,
            concepto: r.concepto,
            cantidad: r.cantidad,
            marca: r.marca,
            modelo: r.modelo,
            notas: r.notas,
          })),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar el inventario");
        return;
      }
      toast.success(`${d.creados} conceptos agregados al inventario de casa`);
      onImportado(d.items ?? []);
      setRenglones(null);
      setTexto("");
      setAviso(null);
      setAbierto(false);
    } finally {
      setTrabajando(false);
    }
  }

  if (!abierto) {
    return (
      <button className="ms-btn-ghost" onClick={() => setAbierto(true)}>
        Importar rider del venue
      </button>
    );
  }

  return (
    <div className="ms-card space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="ms-label">Importar el rider del venue</p>
          <p className="ms-micro mt-0.5">
            Pega el rider como texto —de un PDF, un Word o un correo—. Se lee cantidad, marca y modelo, y lo que quede
            mal se corrige aquí antes de guardar.
          </p>
        </div>
        <button
          className="ms-btn-ghost"
          onClick={() => {
            setAbierto(false);
            setRenglones(null);
            setAviso(null);
          }}
        >
          Cerrar
        </button>
      </div>

      {renglones === null ? (
        <>
          <textarea
            rows={10}
            className="ms-input w-full font-mono text-xs"
            placeholder={"AUDIO\n12 KARA I – L-ACOUSTICS\n4 SB 18 – L-ACOUSTICS\n…"}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void leer()}
              disabled={trabajando || !texto.trim()}
              className="ms-btn-primary disabled:opacity-40"
            >
              {trabajando ? "Leyendo…" : "Leer el rider"}
            </button>
            <span className="ms-micro">Todavía no se guarda nada: primero revisas la lectura.</span>
          </div>
        </>
      ) : (
        <>
          {aviso && <p className="ms-micro text-[#B3985B]">{aviso}</p>}

          <div className="ms-table-wrapper overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="ms-thead">
                <tr>
                  <th className="ms-th text-left w-[140px]">Disciplina</th>
                  <th className="ms-th text-left w-[70px]">Cant.</th>
                  <th className="ms-th text-left w-[240px]">Concepto</th>
                  <th className="ms-th text-left w-[150px]">Marca</th>
                  <th className="ms-th text-left w-[150px]">Modelo</th>
                  <th className="ms-th text-left w-[160px]">Notas</th>
                  <th className="ms-th text-left">Línea original</th>
                  <th className="ms-th w-[40px]" />
                </tr>
              </thead>
              <tbody>
                {renglones.map((r) => (
                  <tr key={r.clave} className="ms-tr align-top">
                    <td className="ms-td">
                      <select
                        className="ms-input-inline w-full"
                        value={r.disciplina}
                        onChange={(e) => set(r.clave, { disciplina: e.target.value })}
                      >
                        {DISCIPLINAS.map((d) => (
                          <option key={d} value={d}>
                            {DISCIPLINA_LABEL[d]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="ms-td">
                      <input
                        type="number"
                        min={1}
                        className="ms-input-inline w-full"
                        value={r.cantidad}
                        onChange={(e) => set(r.clave, { cantidad: Number(e.target.value) || 1 })}
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        className="ms-input-inline w-full"
                        value={r.concepto}
                        onChange={(e) => set(r.clave, { concepto: e.target.value })}
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        className="ms-input-inline w-full"
                        value={r.marca ?? ""}
                        onChange={(e) => set(r.clave, { marca: e.target.value || null })}
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        className="ms-input-inline w-full"
                        value={r.modelo ?? ""}
                        onChange={(e) => set(r.clave, { modelo: e.target.value || null })}
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        className="ms-input-inline w-full"
                        value={r.notas ?? ""}
                        onChange={(e) => set(r.clave, { notas: e.target.value || null })}
                      />
                    </td>
                    <td className="ms-td">
                      <span className="ms-micro text-[#555]">{r.crudo}</span>
                    </td>
                    <td className="ms-td">
                      <button
                        onClick={() => quitar(r.clave)}
                        className="text-[#555] hover:text-red-400 transition-colors"
                        title="No importar este renglón"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void guardar()}
              disabled={trabajando || renglones.length === 0}
              className="ms-btn-primary disabled:opacity-40"
            >
              {trabajando ? "Guardando…" : `Agregar ${renglones.length} conceptos`}
            </button>
            <button className="ms-btn-ghost" onClick={() => setRenglones(null)}>
              Volver al texto
            </button>
            <span className="ms-micro">Se agregan al inventario de casa; no se borra lo que ya estaba.</span>
          </div>
        </>
      )}
    </div>
  );
}
