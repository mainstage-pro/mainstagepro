"use client";

import { useCallback, useState } from "react";
import { FUENTES_CANAL, PLANTILLA_INPUT_BANDA, SOPORTES_MIC, SOPORTE_MIC_LABEL } from "@/lib/giras";
import { useAutoguardadoCanales } from "@/hooks/useAutoguardadoCanales";
import EstadoGuardado from "@/components/EstadoGuardado";
import { FilaArrastrable, TablaOrdenable, ThArrastre } from "@/components/ui/TablaOrdenable";
import AbrirRenglones from "@/components/giras/AbrirRenglones";
import ImportarCanales, { type RiderOrigen } from "../ImportarCanales";
import AvisoFechasAjustadas from "../AvisoFechasAjustadas";
import RigsRider, { CeldaRig, type RigRider } from "../RigsRider";
import type { FechaConAjuste } from "@/lib/show-canales";

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
  rigId: string | null;
  rigPuerto: string | null;
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
  rigsIniciales: RigRider[];
  origenes: RiderOrigen[];
  /// Por renglón del rider, las fechas que lo traen distinto en su plaza.
  divergenciasIniciales: Record<string, FechaConAjuste[]>;
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
    rigId: c.rigId,
    rigPuerto: c.rigPuerto,
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
    rigId: null,
    rigPuerto: null,
    notas: null,
  };
}

export default function InputListClient({
  riderId,
  canalesMinimos,
  canalesIniciales,
  rigsIniciales,
  origenes,
  divergenciasIniciales,
}: Props) {
  const [filas, setFilas] = useState<Fila[]>(canalesIniciales.map(aFila));
  const [rigs, setRigs] = useState(rigsIniciales);
  const [divergencias, setDivergencias] = useState(divergenciasIniciales);

  /// Todo renglón viaja, con nombre o sin él: un renglón abierto es un canal que
  /// ya cuenta y lleva su número aunque todavía no se sepa qué entra por ahí.
  const aPayload = useCallback(
    (fs: Fila[]) =>
      fs.map((f, i) => ({
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
          rigId: f.rigId,
          rigPuerto: f.rigPuerto,
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
    onDivergencias: setDivergencias,
  });

  function set(clave: string, campos: Partial<Fila>) {
    setFilas((prev) => prev.map((f) => (f.clave === clave ? { ...f, ...campos } : f)));
  }

  function agregar() {
    setFilas((prev) => [...prev, filaVacia()]);
  }

  /// Abre N renglones de un golpe: cuando ya se sabe que son 32 canales, se
  /// numeran los 32 y el detalle se llena después.
  function abrir(cantidad: number) {
    setFilas((prev) => [...prev, ...Array.from({ length: cantidad }, filaVacia)]);
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

  // El número es la posición en la lista: el renglón abierto ya ocupa un canal de
  // consola aunque todavía no diga qué entra por él.
  const porCapturar = filas.filter((f) => !f.nombre.trim()).length;
  const faltanCanales = canalesMinimos !== null && filas.length > canalesMinimos;

  return (
    <div className="ms-page space-y-4">
      <datalist id="fuentes-canal">
        {FUENTES_CANAL.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="ms-h2">Input list</h2>
          <p className="ms-subtitle mt-1">
            Canal por canal: qué suena, por qué micrófono, caja directa o línea llega a la consola y qué alternativas
            se aceptan. Es lo que se negocia con el venue sin discutir.
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
          <AbrirRenglones que={["canal", "canales"]} onAbrir={abrir} />
          <EstadoGuardado estado={estado} onReintentar={guardarYa} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label">Canales de la lista</p>
          <p className="text-xl font-semibold mt-1 text-white">{filas.length}</p>
          {porCapturar > 0 && (
            <p className="ms-micro text-amber-300 mt-0.5">
              {porCapturar} {porCapturar === 1 ? "renglón" : "renglones"} sin capturar
            </p>
          )}
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

      <RigsRider riderId={riderId} rigs={rigs} onRigs={setRigs} />

      {filas.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-[#6b7280]">
            La input list está vacía. Siembra la plantilla de banda y corrige, o captura canal por canal.
          </p>
        </div>
      ) : (
        <TablaOrdenable filas={filas} claveDe={(f) => f.clave} onReordenar={setFilas}>
          <table className="w-full min-w-[1620px]">
            <thead className="ms-thead">
              <tr>
                <ThArrastre />
                <th className="ms-th text-left w-[52px]">#</th>
                <th className="ms-th text-left w-[170px]">Canal</th>
                <th className="ms-th text-left w-[160px]">Fuente</th>
                <th className="ms-th text-left w-[200px]">Mic / DI / Línea</th>
                <th className="ms-th text-left w-[200px]">Alternativas aceptables</th>
                <th className="ms-th text-left w-[200px]">Rig / puerto</th>
                <th className="ms-th text-left w-[150px]">Soporte</th>
                <th className="ms-th text-center w-[60px]">48V</th>
                <th className="ms-th text-left w-[150px]">Inserto</th>
                <th className="ms-th text-left w-[170px]">Notas</th>
                <th className="ms-th w-[48px]" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <FilaArrastrable key={f.clave} clave={f.clave} titulo="Arrastrar para cambiar el número de canal">
                  <td className="ms-td">
                    <span className="font-semibold text-white tabular-nums">{i + 1}</span>
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="ej. Kick in"
                      value={f.nombre}
                      onChange={(e) => set(f.clave, { nombre: e.target.value })}
                    />
                    <AvisoFechasAjustadas
                      riderId={riderId}
                      canalId={f.id}
                      nombre={f.nombre}
                      fechas={(f.id && divergencias[f.id]) || []}
                      onRealineado={setDivergencias}
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      list="fuentes-canal"
                      placeholder="ej. Bombo"
                      value={f.instrumento ?? ""}
                      onChange={(e) => set(f.clave, { instrumento: e.target.value })}
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="ej. Beta 91A · DI J48 · línea"
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
                    <CeldaRig
                      rigs={rigs}
                      rigId={f.rigId}
                      rigPuerto={f.rigPuerto}
                      onChange={(campos) => set(f.clave, campos)}
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
          <AbrirRenglones que={["canal", "canales"]} onAbrir={abrir} />
          <EstadoGuardado estado={estado} onReintentar={guardarYa} />
          <span className="ms-micro">
            El número de canal es la posición en la lista: arrastra el renglón por la manija para renumerar.
          </span>
        </div>
      )}
    </div>
  );
}
