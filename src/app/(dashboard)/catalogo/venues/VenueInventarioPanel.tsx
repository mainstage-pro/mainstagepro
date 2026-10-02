"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import {
  CONDICIONES_CASA,
  CONDICION_CASA_LABEL,
  DISCIPLINAS,
  DISCIPLINA_LABEL,
  fmtFechaCorta,
} from "@/lib/giras";

interface ItemInventario {
  id: string;
  disciplina: string;
  concepto: string;
  cantidad: number;
  marca: string | null;
  modelo: string | null;
  condicion: string | null;
  incluidoEnRenta: boolean;
  costoExtra: number | null;
  verificadoEn: string | null;
  verificadoPor: string | null;
  notas: string | null;
  orden: number;
}

type Campos = Partial<Record<keyof ItemInventario | "verificado", unknown>>;

const DEMORA_GUARDADO = 700;

/**
 * Lo que la casa presta, línea por línea. Es la memoria del foro: el advance de
 * gira la precarga y, al cerrar, escribe aquí lo que realmente había.
 */
export default function VenueInventarioPanel({ venueId }: { venueId: string }) {
  const toast = useToast();
  const confirm = useConfirm();

  const [items, setItems] = useState<ItemInventario[] | null>(null);
  const [nuevo, setNuevo] = useState<{ disciplina: string; concepto: string; cantidad: string; marca: string; modelo: string }>({
    disciplina: "AUDIO",
    concepto: "",
    cantidad: "1",
    marca: "",
    modelo: "",
  });

  const pendientes = useRef(new Map<string, Campos>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    fetch(`/api/venues/${venueId}/inventario`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, [venueId]);

  async function descargar(itemId: string) {
    const campos = pendientes.current.get(itemId);
    pendientes.current.delete(itemId);
    const t = timers.current.get(itemId);
    if (t) clearTimeout(t);
    timers.current.delete(itemId);
    if (!campos) return;

    const res = await fetch(`/api/venue-inventario/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    if (!res.ok) {
      toast.error("No se pudo guardar el concepto de casa");
      return;
    }
    const d = await res.json();
    // El sello de verificación lo pone el servidor; hay que reflejarlo.
    if ("verificado" in campos && d.item) {
      setItems((prev) =>
        prev
          ? prev.map((i) =>
              i.id === itemId ? { ...i, verificadoEn: d.item.verificadoEn, verificadoPor: d.item.verificadoPor } : i,
            )
          : prev,
      );
    }
  }

  function editar(itemId: string, campos: Campos, inmediato = false) {
    setItems((prev) => (prev ? prev.map((i) => (i.id === itemId ? ({ ...i, ...campos } as ItemInventario) : i)) : prev));
    pendientes.current.set(itemId, { ...(pendientes.current.get(itemId) ?? {}), ...campos });
    const t = timers.current.get(itemId);
    if (t) clearTimeout(t);
    if (inmediato) {
      void descargar(itemId);
      return;
    }
    timers.current.set(itemId, setTimeout(() => void descargar(itemId), DEMORA_GUARDADO));
  }

  async function agregar() {
    if (!nuevo.concepto.trim()) return;
    const res = await fetch(`/api/venues/${venueId}/inventario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nuevo, cantidad: Number(nuevo.cantidad) || 1 }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo agregar");
      return;
    }
    setItems((prev) => [...(prev ?? []), d.item]);
    setNuevo({ ...nuevo, concepto: "", cantidad: "1", marca: "", modelo: "" });
  }

  async function quitar(item: ItemInventario) {
    const ok = await confirm({
      message: `¿Quitar «${item.concepto}» de la ficha de casa de este venue?`,
      danger: true,
      confirmText: "Quitar",
    });
    if (!ok) return;
    const res = await fetch(`/api/venue-inventario/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar");
      return;
    }
    setItems((prev) => (prev ? prev.filter((i) => i.id !== item.id) : prev));
  }

  if (items === null) return <p className="text-gray-600 text-xs italic">Cargando inventario de casa...</p>;

  const presentes = DISCIPLINAS.filter((d) => items.some((i) => i.disciplina === d));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="ms-label">Inventario de casa ({items.length} conceptos)</p>
        <p className="ms-micro">Lo que el foro presta. El advance de gira lo lee y lo actualiza.</p>
      </div>

      {items.length > 0 && (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="min-w-[1080px] w-full">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th w-[230px]">Concepto</th>
                <th className="ms-th w-[70px]">Cant.</th>
                <th className="ms-th w-[140px]">Marca</th>
                <th className="ms-th w-[140px]">Modelo</th>
                <th className="ms-th w-[130px]">Condición</th>
                <th className="ms-th w-[90px]">Incluido</th>
                <th className="ms-th w-[110px]">Costo extra</th>
                <th className="ms-th w-[150px]">Verificado</th>
                <th className="ms-th w-[180px]">Notas</th>
                <th className="ms-th w-[40px]" />
              </tr>
            </thead>
            {presentes.map((d) => (
              <tbody key={d}>
                <tr>
                  <td colSpan={10} className="bg-[#0d0d0d] border-y border-[#1e1e1e] px-4 py-2">
                    <span className="ms-section-label">{DISCIPLINA_LABEL[d]}</span>
                  </td>
                </tr>
                {items
                  .filter((i) => i.disciplina === d)
                  .map((i) => (
                    <tr key={i.id} className="ms-tr">
                      <td className="ms-td">
                        <input
                          value={i.concepto}
                          onChange={(e) => editar(i.id, { concepto: e.target.value })}
                          className="ms-input-inline w-full"
                        />
                      </td>
                      <td className="ms-td">
                        <input
                          type="number"
                          min={0}
                          value={i.cantidad}
                          onChange={(e) => editar(i.id, { cantidad: Number(e.target.value) })}
                          className="ms-input-inline w-full"
                        />
                      </td>
                      <td className="ms-td">
                        <input
                          value={i.marca ?? ""}
                          onChange={(e) => editar(i.id, { marca: e.target.value })}
                          className="ms-input-inline w-full"
                        />
                      </td>
                      <td className="ms-td">
                        <input
                          value={i.modelo ?? ""}
                          onChange={(e) => editar(i.id, { modelo: e.target.value })}
                          className="ms-input-inline w-full"
                        />
                      </td>
                      <td className="ms-td">
                        <select
                          value={i.condicion ?? "DESCONOCIDO"}
                          onChange={(e) => editar(i.id, { condicion: e.target.value }, true)}
                          className="ms-input-inline w-full"
                        >
                          {CONDICIONES_CASA.map((c) => (
                            <option key={c} value={c}>
                              {CONDICION_CASA_LABEL[c]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="ms-td text-center">
                        <input
                          type="checkbox"
                          checked={i.incluidoEnRenta}
                          onChange={(e) => editar(i.id, { incluidoEnRenta: e.target.checked }, true)}
                          className="accent-[#B3985B] w-4 h-4"
                          title="Incluido en la renta del foro"
                        />
                      </td>
                      <td className="ms-td">
                        <input
                          type="number"
                          step="0.01"
                          value={i.costoExtra ?? ""}
                          onChange={(e) => editar(i.id, { costoExtra: e.target.value === "" ? null : Number(e.target.value) })}
                          placeholder="0"
                          className="ms-input-inline w-full"
                        />
                      </td>
                      <td className="ms-td">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!i.verificadoEn}
                            onChange={(e) => editar(i.id, { verificado: e.target.checked }, true)}
                            className="accent-[#B3985B] w-4 h-4"
                          />
                          <span className="ms-micro">
                            {i.verificadoEn ? `${fmtFechaCorta(i.verificadoEn)} · ${i.verificadoPor ?? ""}` : "sin verificar"}
                          </span>
                        </label>
                      </td>
                      <td className="ms-td">
                        <input
                          value={i.notas ?? ""}
                          onChange={(e) => editar(i.id, { notas: e.target.value })}
                          className="ms-input-inline w-full"
                        />
                      </td>
                      <td className="ms-td text-right">
                        <button
                          onClick={() => void quitar(i)}
                          className="text-[#555] hover:text-red-400 transition-colors"
                          title="Quitar"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            ))}
          </table>
        </div>
      )}

      {/* Alta de concepto */}
      <div className="grid grid-cols-1 md:grid-cols-[150px_1fr_80px_130px_130px_auto] gap-2 items-end">
        <select
          value={nuevo.disciplina}
          onChange={(e) => setNuevo({ ...nuevo, disciplina: e.target.value })}
          className="ms-input-inline w-full"
        >
          {DISCIPLINAS.map((d) => (
            <option key={d} value={d}>
              {DISCIPLINA_LABEL[d]}
            </option>
          ))}
        </select>
        <input
          value={nuevo.concepto}
          onChange={(e) => setNuevo({ ...nuevo, concepto: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") void agregar();
          }}
          placeholder="ej. Consola de FOH"
          className="ms-input-inline w-full"
        />
        <input
          type="number"
          min={1}
          value={nuevo.cantidad}
          onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })}
          className="ms-input-inline w-full"
        />
        <input
          value={nuevo.marca}
          onChange={(e) => setNuevo({ ...nuevo, marca: e.target.value })}
          placeholder="Marca"
          className="ms-input-inline w-full"
        />
        <input
          value={nuevo.modelo}
          onChange={(e) => setNuevo({ ...nuevo, modelo: e.target.value })}
          placeholder="Modelo"
          className="ms-input-inline w-full"
        />
        <button onClick={() => void agregar()} disabled={!nuevo.concepto.trim()} className="ms-btn-secondary disabled:opacity-50">
          Agregar
        </button>
      </div>
    </div>
  );
}
