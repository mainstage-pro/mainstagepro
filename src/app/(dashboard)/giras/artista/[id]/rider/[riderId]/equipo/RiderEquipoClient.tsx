"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { coincide } from "@/lib/buscar";
import {
  DISCIPLINAS,
  DISCIPLINA_LABEL,
  PLANTILLA_RIDER_BANDA,
  PRIORIDADES,
  PRIORIDAD_COLOR,
  PRIORIDAD_LABEL,
  PROVISTO_POR,
  PROVISTO_POR_LABEL,
  UNIDADES_RIDER,
  UNIDAD_RIDER_LABEL,
} from "@/lib/giras";

export interface LineaRider {
  id: string;
  disciplina: string;
  concepto: string;
  cantidad: number;
  unidad: string | null;
  equipoId: string | null;
  preferido: string | null;
  aceptables: string | null;
  noAceptable: string | null;
  prioridad: string;
  provistoPor: string;
  notas: string | null;
  orden: number;
}

type Fila = Omit<LineaRider, "id"> & { id: string | null; clave: string };

interface Props {
  riderId: string;
  lineasIniciales: LineaRider[];
  equipos: { id: string; descripcion: string; marca: string | null; modelo: string | null }[];
}

let contador = 0;
function nuevaClave() {
  contador += 1;
  return `tmp-${contador}`;
}

function aFila(l: LineaRider): Fila {
  return { ...l, clave: l.id };
}

function filaVacia(disciplina: string, orden: number): Fila {
  return {
    id: null,
    clave: nuevaClave(),
    disciplina,
    concepto: "",
    cantidad: 1,
    unidad: "PZA",
    equipoId: null,
    preferido: null,
    aceptables: null,
    noAceptable: null,
    prioridad: "INDISPENSABLE",
    provistoPor: "CASA",
    notas: null,
    orden,
  };
}

export default function RiderEquipoClient({ riderId, lineasIniciales, equipos }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [filas, setFilas] = useState<Fila[]>(lineasIniciales.map(aFila));
  const [original, setOriginal] = useState(JSON.stringify(lineasIniciales.map(aFila)));
  const [filtro, setFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);

  const sucio = JSON.stringify(filas) !== original;

  const opcionesEquipo: ComboboxOption[] = useMemo(
    () => [
      { value: "", label: "— Sin ligar al inventario —" },
      ...equipos.map((e) => ({
        value: e.id,
        label: [e.marca, e.modelo].filter(Boolean).join(" ")
          ? `${e.descripcion} — ${[e.marca, e.modelo].filter(Boolean).join(" ")}`
          : e.descripcion,
      })),
    ],
    [equipos],
  );

  function set(clave: string, campos: Partial<Fila>) {
    setFilas((prev) => prev.map((f) => (f.clave === clave ? { ...f, ...campos } : f)));
  }

  function agregar() {
    setFilas((prev) => [...prev, filaVacia(filtro || "AUDIO", prev.length)]);
  }

  function quitar(clave: string) {
    setFilas((prev) => prev.filter((f) => f.clave !== clave).map((f, i) => ({ ...f, orden: i })));
  }

  function mover(clave: string, delta: number) {
    setFilas((prev) => {
      const i = prev.findIndex((f) => f.clave === clave);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia.map((f, k) => ({ ...f, orden: k }));
    });
  }

  function sembrarPlantilla() {
    setFilas((prev) => [
      ...prev,
      ...PLANTILLA_RIDER_BANDA.map((l, i) => ({
        ...filaVacia(l.disciplina, prev.length + i),
        concepto: l.concepto,
        cantidad: l.cantidad,
        unidad: l.unidad,
        preferido: l.preferido ?? null,
        aceptables: l.aceptables ?? null,
        prioridad: l.prioridad,
        provistoPor: l.provistoPor,
      })),
    ]);
  }

  async function guardar() {
    const utiles = filas.filter((f) => f.concepto.trim());
    setGuardando(true);
    try {
      const res = await fetch(`/api/artista-riders/${riderId}/lineas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineas: utiles.map((f, i) => ({
            id: f.id,
            disciplina: f.disciplina,
            concepto: f.concepto,
            cantidad: f.cantidad,
            unidad: f.unidad,
            equipoId: f.equipoId,
            preferido: f.preferido,
            aceptables: f.aceptables,
            noAceptable: f.noAceptable,
            prioridad: f.prioridad,
            provistoPor: f.provistoPor,
            notas: f.notas,
            orden: i,
          })),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar el rider de equipo");
        return;
      }
      const frescas: Fila[] = (d.lineas as LineaRider[]).map(aFila);
      setFilas(frescas);
      setOriginal(JSON.stringify(frescas));
      toast.success(`Rider guardado: ${frescas.length} conceptos`);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  const disciplinasPresentes = DISCIPLINAS.filter((d) => filas.some((f) => f.disciplina === d));

  const visibles = filas.filter(
    (f) =>
      (!filtro || f.disciplina === filtro) &&
      coincide(busqueda, f.concepto, f.preferido, f.aceptables, f.notas),
  );

  const puedeMover = !filtro && !busqueda.trim();

  const conteos = useMemo(
    () => ({
      total: filas.filter((f) => f.concepto.trim()).length,
      indispensables: filas.filter((f) => f.prioridad === "INDISPENSABLE").length,
      casa: filas.filter((f) => f.provistoPor === "CASA").length,
      artista: filas.filter((f) => f.provistoPor === "ARTISTA").length,
    }),
    [filas],
  );

  return (
    <div className="ms-page space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="ms-h2">Equipo que pide el artista</h2>
          <p className="ms-subtitle mt-1">
            Un renglón por concepto, con prioridad y quién lo pone. Esto es lo que cada show tiene que resolver en su
            advance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filas.length === 0 && (
            <button className="ms-btn-secondary" onClick={sembrarPlantilla}>
              Sembrar plantilla de banda
            </button>
          )}
          <button className="ms-btn-ghost" onClick={agregar}>
            + Concepto
          </button>
          <button onClick={() => void guardar()} disabled={guardando || !sucio} className="ms-btn-primary disabled:opacity-40">
            {guardando ? "Guardando…" : "Guardar rider"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label">Conceptos</p>
          <p className="text-xl font-semibold mt-1 text-white">{conteos.total}</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Indispensables</p>
          <p className="text-xl font-semibold mt-1 text-[#B3985B]">{conteos.indispensables}</p>
          <p className="ms-micro mt-0.5">Son los que deciden si el show va.</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Los pone la casa</p>
          <p className="text-xl font-semibold mt-1 text-white">{conteos.casa}</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Los trae el artista</p>
          <p className="text-xl font-semibold mt-1 text-white">{conteos.artista}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <input
          className="ms-input-search flex-1"
          placeholder="Buscar concepto, marca preferida o alternativa…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFiltro("")} className={!filtro ? "ms-filter-select-active" : "ms-filter-select"}>
            Todas ({filas.length})
          </button>
          {disciplinasPresentes.map((d) => (
            <button
              key={d}
              onClick={() => setFiltro((f) => (f === d ? "" : d))}
              className={filtro === d ? "ms-filter-select-active" : "ms-filter-select"}
            >
              {DISCIPLINA_LABEL[d]} ({filas.filter((f) => f.disciplina === d).length})
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-[#6b7280]">
            {filas.length === 0
              ? "El rider de equipo está vacío. Siembra la plantilla de banda y corrige lo que no aplique."
              : "Ningún concepto coincide con el filtro."}
          </p>
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="w-full min-w-[1700px]">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th text-left w-[150px]">Disciplina</th>
                <th className="ms-th text-left w-[260px]">Concepto</th>
                <th className="ms-th text-left w-[70px]">Cant.</th>
                <th className="ms-th text-left w-[110px]">Unidad</th>
                <th className="ms-th text-left w-[150px]">Prioridad</th>
                <th className="ms-th text-left w-[150px]">Lo pone</th>
                <th className="ms-th text-left w-[190px]">Preferido</th>
                <th className="ms-th text-left w-[190px]">Aceptables</th>
                <th className="ms-th text-left w-[170px]">No aceptable</th>
                <th className="ms-th text-left w-[220px]">Equipo del inventario</th>
                <th className="ms-th text-left w-[170px]">Notas</th>
                <th className="ms-th w-[80px]" />
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => {
                const i = filas.findIndex((x) => x.clave === f.clave);
                return (
                  <tr key={f.clave} className="ms-tr align-top">
                    <td className="ms-td">
                      <select
                        className="ms-input-inline w-full"
                        value={f.disciplina}
                        onChange={(e) => set(f.clave, { disciplina: e.target.value })}
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
                        className="ms-input-inline w-full"
                        placeholder="ej. Consola digital de FOH, mínimo 32 entradas"
                        value={f.concepto}
                        onChange={(e) => set(f.clave, { concepto: e.target.value })}
                      />
                      {!f.concepto.trim() && <span className="ms-micro text-amber-300">sin concepto no se guarda</span>}
                    </td>
                    <td className="ms-td">
                      <input
                        type="number"
                        min={1}
                        className="ms-input-inline w-full"
                        value={f.cantidad}
                        onChange={(e) => set(f.clave, { cantidad: Number(e.target.value) })}
                      />
                    </td>
                    <td className="ms-td">
                      <select
                        className="ms-input-inline w-full"
                        value={f.unidad ?? ""}
                        onChange={(e) => set(f.clave, { unidad: e.target.value || null })}
                      >
                        <option value="">Sin unidad</option>
                        {UNIDADES_RIDER.map((u) => (
                          <option key={u} value={u}>
                            {UNIDAD_RIDER_LABEL[u]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="ms-td">
                      <select
                        className={`ms-input-inline w-full border ${PRIORIDAD_COLOR[f.prioridad] ?? ""}`}
                        value={f.prioridad}
                        onChange={(e) => set(f.clave, { prioridad: e.target.value })}
                      >
                        {PRIORIDADES.map((p) => (
                          <option key={p} value={p} className="bg-[#111] text-white">
                            {PRIORIDAD_LABEL[p]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="ms-td">
                      <select
                        className="ms-input-inline w-full"
                        value={f.provistoPor}
                        onChange={(e) => set(f.clave, { provistoPor: e.target.value })}
                      >
                        {PROVISTO_POR.map((p) => (
                          <option key={p} value={p}>
                            {PROVISTO_POR_LABEL[p]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="ms-td">
                      <input
                        className="ms-input-inline w-full"
                        placeholder="marca y modelo que quiere"
                        value={f.preferido ?? ""}
                        onChange={(e) => set(f.clave, { preferido: e.target.value })}
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        className="ms-input-inline w-full"
                        placeholder="lo que sí se puede sustituir"
                        value={f.aceptables ?? ""}
                        onChange={(e) => set(f.clave, { aceptables: e.target.value })}
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        className="ms-input-inline w-full"
                        placeholder="lo que se rechaza"
                        value={f.noAceptable ?? ""}
                        onChange={(e) => set(f.clave, { noAceptable: e.target.value })}
                      />
                    </td>
                    <td className="ms-td">
                      <Combobox
                        value={f.equipoId ?? ""}
                        onChange={(v) => set(f.clave, { equipoId: v || null })}
                        options={opcionesEquipo}
                        idleOptions={opcionesEquipo.slice(0, 60)}
                        placeholder="Sin ligar"
                        className="w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        className="ms-input-inline w-full"
                        placeholder="…"
                        value={f.notas ?? ""}
                        onChange={(e) => set(f.clave, { notas: e.target.value })}
                      />
                    </td>
                    <td className="ms-td">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => mover(f.clave, -1)}
                          disabled={!puedeMover || i === 0}
                          className="text-[#555] hover:text-white disabled:opacity-30 transition-colors"
                          title={puedeMover ? "Subir" : "Quita el filtro para reordenar"}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => mover(f.clave, 1)}
                          disabled={!puedeMover || i === filas.length - 1}
                          className="text-[#555] hover:text-white disabled:opacity-30 transition-colors"
                          title={puedeMover ? "Bajar" : "Quita el filtro para reordenar"}
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => quitar(f.clave)}
                          className="text-[#555] hover:text-red-400 transition-colors"
                          title="Quitar concepto"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => void guardar()} disabled={guardando || !sucio} className="ms-btn-primary disabled:opacity-40">
            {guardando ? "Guardando…" : "Guardar rider"}
          </button>
          <button className="ms-btn-ghost" onClick={agregar}>
            + Concepto
          </button>
          <span className="ms-micro">
            {sucio
              ? "Hay cambios sin guardar; el rider se guarda completo y lo que quitaste se borra."
              : "Sin cambios por guardar."}
          </span>
        </div>
      )}
    </div>
  );
}
