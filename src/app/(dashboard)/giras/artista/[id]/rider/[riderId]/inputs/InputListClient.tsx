"use client";

import { useCallback, useState } from "react";
import { PLANTILLA_INPUT_BANDA, SOPORTES_MIC, SOPORTE_MIC_LABEL } from "@/lib/giras";
import { useAutoguardadoCanales } from "@/hooks/useAutoguardadoCanales";
import EstadoGuardado from "@/components/EstadoGuardado";
import { FilaArrastrable, TablaOrdenable, ThArrastre } from "@/components/ui/TablaOrdenable";
import ImportarCanales, { type RiderOrigen } from "../ImportarCanales";

export interface CanalInput {
  id: string;
  numero: number;
  nombre: string;
  instrumento: string | null;
  microfono: string | null;
  alternativas: string | null;
  soporte: string | null;
  phantom: boolean;
  inserto: string | null;
  notas: string | null;
}

/// Las filas nuevas viven sin id hasta el primer guardado; el PUT las crea.
/// El número de canal no se guarda en la fila: es la posición en la lista, así
/// que arrastrar un renglón ya es renumerar.
type Fila = Omit<CanalInput, "id" | "numero"> & { id: string | null; clave: string };

interface Props {
  riderId: string;
  canalesMinimos: number | null;
  canalesIniciales: CanalInput[];
  origenes: RiderOrigen[];
}

let contador = 0;
function nuevaClave() {
  contador += 1;
  return `tmp-${contador}`;
}

function aFila(c: CanalInput): Fila {
  return {
    id: c.id,
    clave: c.id,
    nombre: c.nombre,
    instrumento: c.instrumento,
    microfono: c.microfono,
    alternativas: c.alternativas,
    soporte: c.soporte,
    phantom: c.phantom,
    inserto: c.inserto,
    notas: c.notas,
  };
}

function filaVacia(): Fila {
  return {
    id: null,
    clave: nuevaClave(),
    nombre: "",
    instrumento: null,
    microfono: null,
    alternativas: null,
    soporte: null,
    phantom: false,
    inserto: null,
    notas: null,
  };
}

export default function InputListClient({ riderId, canalesMinimos, canalesIniciales, origenes }: Props) {
  const [filas, setFilas] = useState<Fila[]>(canalesIniciales.map(aFila));

  const aPayload = useCallback(
    (fs: Fila[]) =>
      fs
        .filter((f) => f.nombre.trim())
        .map((f, i) => ({
          clave: f.clave,
          canal: {
            id: f.id,
            numero: i + 1,
            nombre: f.nombre,
            instrumento: f.instrumento,
            microfono: f.microfono,
            alternativas: f.alternativas,
            soporte: f.soporte,
            phantom: f.phantom,
            inserto: f.inserto,
            notas: f.notas,
          },
        })),
    [],
  );

  const { estado, guardarYa } = useAutoguardadoCanales({
    riderId,
    tipo: "INPUT",
    filas,
    setFilas,
    aPayload,
  });

  function set(clave: string, campos: Partial<Fila>) {
    setFilas((prev) => prev.map((f) => (f.clave === clave ? { ...f, ...campos } : f)));
  }

  function agregar() {
    setFilas((prev) => [...prev, filaVacia()]);
  }

  function quitar(clave: string) {
    setFilas((prev) => prev.filter((f) => f.clave !== clave));
  }

  function sembrarPlantilla() {
    setFilas((prev) => [
      ...prev,
      ...PLANTILLA_INPUT_BANDA.map((c) => ({
        ...filaVacia(),
        nombre: c.nombre,
        instrumento: c.instrumento ?? null,
        microfono: c.microfono ?? null,
        alternativas: c.alternativas ?? null,
        soporte: c.soporte ?? null,
        phantom: c.phantom === true,
      })),
    ]);
  }

  // El canal se cuenta sobre lo que de verdad se guarda: la fila a medio
  // capturar no existe en el rider y no se puede llevar un número.
  const numeroPorClave = new Map<string, number>();
  for (const f of filas) {
    if (f.nombre.trim()) numeroPorClave.set(f.clave, numeroPorClave.size + 1);
  }

  const conNombre = numeroPorClave.size;
  const faltanCanales = canalesMinimos !== null && conNombre > canalesMinimos;

  return (
    <div className="ms-page space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="ms-h2">Input list</h2>
          <p className="ms-subtitle mt-1">
            Canal por canal, con el micrófono preferido y sus alternativas: es lo que se negocia con el venue sin
            discutir.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filas.length === 0 && (
            <button className="ms-btn-secondary" onClick={sembrarPlantilla}>
              Sembrar plantilla de banda
            </button>
          )}
          <ImportarCanales
            riderId={riderId}
            tipo="INPUT"
            origenes={origenes}
            actuales={filas.length}
            onImportado={() => window.location.reload()}
          />
          <button className="ms-btn-ghost" onClick={agregar}>
            + Canal
          </button>
          <EstadoGuardado estado={estado} onReintentar={guardarYa} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label">Canales capturados</p>
          <p className="text-xl font-semibold mt-1 text-white">{conNombre}</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Canales mínimos de la ficha</p>
          <p className="text-xl font-semibold mt-1 text-white">{canalesMinimos ?? "—"}</p>
          {faltanCanales && (
            <p className="ms-micro text-amber-300 mt-0.5">
              La lista pide más canales que el mínimo declarado: sube el número en la ficha.
            </p>
          )}
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Con phantom (48V)</p>
          <p className="text-xl font-semibold mt-1 text-[#B3985B]">{filas.filter((f) => f.phantom).length}</p>
        </div>
      </div>

      {filas.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-[#6b7280]">
            La input list está vacía. Siembra la plantilla de banda y corrige, o captura canal por canal.
          </p>
        </div>
      ) : (
        <TablaOrdenable filas={filas} claveDe={(f) => f.clave} onReordenar={setFilas}>
          <table className="w-full min-w-[1420px]">
            <thead className="ms-thead">
              <tr>
                <ThArrastre />
                <th className="ms-th text-left w-[52px]">#</th>
                <th className="ms-th text-left w-[170px]">Canal</th>
                <th className="ms-th text-left w-[160px]">Instrumento</th>
                <th className="ms-th text-left w-[200px]">Micrófono preferido</th>
                <th className="ms-th text-left w-[200px]">Alternativas aceptables</th>
                <th className="ms-th text-left w-[150px]">Soporte</th>
                <th className="ms-th text-center w-[60px]">48V</th>
                <th className="ms-th text-left w-[150px]">Inserto</th>
                <th className="ms-th text-left w-[170px]">Notas</th>
                <th className="ms-th w-[48px]" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <FilaArrastrable key={f.clave} clave={f.clave} titulo="Arrastrar para cambiar el número de canal">
                  <td className="ms-td">
                    <span className="font-semibold text-white tabular-nums">{numeroPorClave.get(f.clave) ?? "—"}</span>
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="ej. Kick in"
                      value={f.nombre}
                      onChange={(e) => set(f.clave, { nombre: e.target.value })}
                    />
                    {!f.nombre.trim() && <span className="ms-micro text-amber-300">sin nombre no se guarda</span>}
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="ej. Bombo"
                      value={f.instrumento ?? ""}
                      onChange={(e) => set(f.clave, { instrumento: e.target.value })}
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="ej. Shure Beta 91A"
                      value={f.microfono ?? ""}
                      onChange={(e) => set(f.clave, { microfono: e.target.value })}
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="ej. Audix D6, AKG D112"
                      value={f.alternativas ?? ""}
                      onChange={(e) => set(f.clave, { alternativas: e.target.value })}
                    />
                  </td>
                  <td className="ms-td">
                    <select
                      className="ms-input-inline w-full"
                      value={f.soporte ?? ""}
                      onChange={(e) => set(f.clave, { soporte: e.target.value || null })}
                    >
                      <option value="">Sin especificar</option>
                      {SOPORTES_MIC.map((s) => (
                        <option key={s} value={s}>
                          {SOPORTE_MIC_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="ms-td text-center">
                    <input
                      type="checkbox"
                      className="accent-[#B3985B] w-4 h-4"
                      checked={f.phantom}
                      onChange={(e) => set(f.clave, { phantom: e.target.checked })}
                      title="Requiere alimentación phantom"
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="compresor, gate…"
                      value={f.inserto ?? ""}
                      onChange={(e) => set(f.clave, { inserto: e.target.value })}
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
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => quitar(f.clave)}
                        className="text-[#555] hover:text-red-400 transition-colors"
                        title="Quitar canal"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </FilaArrastrable>
              ))}
            </tbody>
          </table>
        </TablaOrdenable>
      )}

      {filas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button className="ms-btn-ghost" onClick={agregar}>
            + Canal
          </button>
          <EstadoGuardado estado={estado} onReintentar={guardarYa} />
          <span className="ms-micro">
            El número de canal es la posición en la lista: arrastra el renglón por la manija para renumerar.
          </span>
        </div>
      )}
    </div>
  );
}
