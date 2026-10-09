"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import { useAutoguardadoCanales } from "@/hooks/useAutoguardadoCanales";
import EstadoGuardado from "@/components/EstadoGuardado";
import { FilaArrastrable, TablaOrdenable, ThArrastre } from "@/components/ui/TablaOrdenable";
import AbrirRenglones from "@/components/giras/AbrirRenglones";
import ImportarCanales, { type RiderOrigen } from "../ImportarCanales";
import AvisoFechasAjustadas from "../AvisoFechasAjustadas";
import RigsRider, { CeldaRig, type RigRider } from "../RigsRider";
import type { FechaConAjuste } from "@/lib/show-canales";
import {
  PLANTILLA_OUTPUT_BANDA,
  ROL_PERSONA_LABEL,
  TIPOS_SALIDA,
  TIPO_SALIDA_LABEL,
  etiquetaCanalSalida,
  numerarSalidas,
  totalCanalesSalida,
} from "@/lib/giras";

export interface CanalOutput {
  id: string;
  numero: number;
  nombre: string;
  tipoSalida: string | null;
  estereo: boolean;
  personaId: string | null;
  rigId: string | null;
  rigPuerto: string | null;
  notas: string | null;
}

type Fila = Omit<CanalOutput, "id"> & { id: string | null; clave: string };

interface Props {
  artistaId: string;
  riderId: string;
  mixesMonitor: number | null;
  canalesIniciales: CanalOutput[];
  rigsIniciales: RigRider[];
  personas: { id: string; nombre: string; rol: string; instrumento: string | null }[];
  origenes: RiderOrigen[];
  /// Por renglón del rider, las fechas que lo traen distinto en su plaza.
  divergenciasIniciales: Record<string, FechaConAjuste[]>;
}

let contador = 0;
function nuevaClave() {
  contador += 1;
  return `tmp-${contador}`;
}

function aFila(c: CanalOutput): Fila {
  return { ...c, clave: c.id };
}

function filaVacia(): Fila {
  return {
    id: null,
    clave: nuevaClave(),
    numero: 0,
    nombre: "",
    tipoSalida: null,
    estereo: false,
    personaId: null,
    rigId: null,
    rigPuerto: null,
    notas: null,
  };
}

export default function OutputListClient({
  artistaId,
  riderId,
  mixesMonitor,
  canalesIniciales,
  rigsIniciales,
  personas,
  origenes,
  divergenciasIniciales,
}: Props) {
  const [filas, setFilas] = useState<Fila[]>(canalesIniciales.map(aFila));
  const [rigs, setRigs] = useState(rigsIniciales);
  const [divergencias, setDivergencias] = useState(divergenciasIniciales);

  // Se guarda el primer canal de consola del mix, no su posición: el estéreo se
  // llevó dos números y la lista tiene que poder reconstruirse tal cual. Todo
  // renglón viaja, con nombre o sin él: el renglón abierto ya ocupa su salida.
  const aPayload = useCallback(
    (fs: Fila[]) =>
      numerarSalidas(fs).map((f) => ({
        clave: f.clave,
        canal: {
          id: f.id,
          numero: f.canal,
          nombre: f.nombre,
          tipoSalida: f.tipoSalida,
          estereo: f.estereo,
          personaId: f.personaId,
          rigId: f.rigId,
          rigPuerto: f.rigPuerto,
          notas: f.notas,
        },
      })),
    [],
  );

  const { estado, guardarYa } = useAutoguardadoCanales({
    riderId,
    tipo: "OUTPUT",
    filas,
    setFilas,
    aPayload,
    onDivergencias: setDivergencias,
  });

  const opcionesPersona: ComboboxOption[] = useMemo(
    () => [
      { value: "", label: "— Sin dueño —" },
      ...personas.map((p) => ({
        value: p.id,
        label: p.instrumento ? `${p.nombre} — ${p.instrumento}` : p.nombre,
        group: ROL_PERSONA_LABEL[p.rol] ?? p.rol,
      })),
    ],
    [personas],
  );

  function set(clave: string, campos: Partial<Fila>) {
    setFilas((prev) => prev.map((f) => (f.clave === clave ? { ...f, ...campos } : f)));
  }

  function agregar() {
    setFilas((prev) => [...prev, filaVacia()]);
  }

  /// Abre N renglones de un golpe: cuando ya se sabe que son 12 mixes, se numeran
  /// los 12 y el detalle se llena después.
  function abrir(cantidad: number) {
    setFilas((prev) => [...prev, ...Array.from({ length: cantidad }, filaVacia)]);
  }

  function quitar(clave: string) {
    setFilas((prev) => prev.filter((f) => f.clave !== clave));
  }

  function sembrarPlantilla() {
    setFilas((prev) => [
      ...prev,
      ...PLANTILLA_OUTPUT_BANDA.map((c) => ({
        ...filaVacia(),
        nombre: c.nombre,
        tipoSalida: c.tipoSalida,
        estereo: c.estereo === true,
      })),
    ]);
  }

  const porCapturar = filas.filter((f) => !f.nombre.trim()).length;
  const canales = totalCanalesSalida(filas);
  const descuadre = mixesMonitor !== null && mixesMonitor !== filas.length;

  const etiquetaPorClave = new Map(
    numerarSalidas(filas).map((f) => [f.clave, etiquetaCanalSalida(f.canal, f.estereo)]),
  );

  return (
    <div className="ms-page space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="ms-h2">Output list</h2>
          <p className="ms-subtitle mt-1">
            Los mixes de monitor con dueño: quién oye qué. De aquí sale cuántos in-ears y cuántas wedges se piden. El
            canal lo numera la lista: un mix estéreo ocupa dos salidas de consola y uno mono, una.
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
            tipo="OUTPUT"
            origenes={origenes}
            actuales={filas.length}
            onImportado={() => window.location.reload()}
          />
          <button className="ms-btn-ghost" onClick={agregar}>
            + Salida
          </button>
          <AbrirRenglones que={["salida", "salidas"]} onAbrir={abrir} />
          <EstadoGuardado estado={estado} onReintentar={guardarYa} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label">Mixes de la lista</p>
          <p className="text-xl font-semibold mt-1 text-white">{filas.length}</p>
          {porCapturar > 0 && (
            <p className="ms-micro text-amber-300 mt-0.5">
              {porCapturar} {porCapturar === 1 ? "renglón" : "renglones"} sin capturar
            </p>
          )}
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Canales de consola</p>
          <p className="text-xl font-semibold mt-1 text-white">{canales}</p>
          <p className="ms-micro mt-0.5">El estéreo se lleva dos: L y R.</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Mixes declarados en la ficha</p>
          <p className="text-xl font-semibold mt-1 text-white">{mixesMonitor ?? "—"}</p>
          {descuadre && (
            <p className="ms-micro text-amber-300 mt-0.5">No cuadra con la lista: decide cuál es el número bueno.</p>
          )}
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Con dueño asignado</p>
          <p className="text-xl font-semibold mt-1 text-[#B3985B]">{filas.filter((f) => f.personaId).length}</p>
        </div>
      </div>

      {personas.length === 0 && (
        <p className="text-xs text-amber-300">
          Este artista no tiene personas registradas, así que ningún mix puede tener dueño.{" "}
          <Link href={`/giras/artista/${artistaId}/personas`} className="ms-link-gold underline">
            Registrar personas
          </Link>
          .
        </p>
      )}

      <RigsRider riderId={riderId} rigs={rigs} onRigs={setRigs} />

      {filas.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-[#6b7280]">
            La output list está vacía. Siembra la plantilla de banda y corrige, o captura salida por salida.
          </p>
        </div>
      ) : (
        <TablaOrdenable filas={filas} claveDe={(f) => f.clave} onReordenar={setFilas}>
          <table className="w-full min-w-[1240px]">
            <thead className="ms-thead">
              <tr>
                <ThArrastre />
                <th className="ms-th text-left w-[76px]">Canal</th>
                <th className="ms-th text-left w-[200px]">Salida / mix</th>
                <th className="ms-th text-left w-[180px]">Tipo</th>
                <th className="ms-th text-center w-[80px]">Estéreo</th>
                <th className="ms-th text-left w-[240px]">De quién es el mix</th>
                <th className="ms-th text-left w-[200px]">Rig / puerto</th>
                <th className="ms-th text-left w-[200px]">Notas</th>
                <th className="ms-th w-[48px]" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <FilaArrastrable key={f.clave} clave={f.clave} titulo="Arrastrar para cambiar el orden de los mixes">
                  <td className="ms-td">
                    <span className="font-semibold text-white tabular-nums">
                      {etiquetaPorClave.get(f.clave) ?? "—"}
                    </span>
                    {f.estereo && <p className="ms-micro">L y R</p>}
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="ej. IEM voz lead"
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
                    <select
                      className="ms-input-inline w-full"
                      value={f.tipoSalida ?? ""}
                      onChange={(e) => set(f.clave, { tipoSalida: e.target.value || null })}
                    >
                      <option value="">Sin especificar</option>
                      {TIPOS_SALIDA.map((t) => (
                        <option key={t} value={t}>
                          {TIPO_SALIDA_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="ms-td text-center">
                    <input
                      type="checkbox"
                      className="accent-[#B3985B] w-4 h-4"
                      checked={f.estereo}
                      onChange={(e) => set(f.clave, { estereo: e.target.checked })}
                      title="Mix estéreo (dos canales)"
                    />
                  </td>
                  <td className="ms-td">
                    <Combobox
                      value={f.personaId ?? ""}
                      onChange={(v) => set(f.clave, { personaId: v || null })}
                      options={opcionesPersona}
                      placeholder="Sin dueño"
                      className="w-full"
                      disabled={personas.length === 0}
                    />
                  </td>
                  <td className="ms-td">
                    <CeldaRig
                      rigs={rigs}
                      rigId={f.rigId}
                      rigPuerto={f.rigPuerto}
                      placeholderPuerto="in 1"
                      onChange={(campos) => set(f.clave, campos)}
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
                        title="Quitar salida"
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
            + Salida
          </button>
          <AbrirRenglones que={["salida", "salidas"]} onAbrir={abrir} />
          <EstadoGuardado estado={estado} onReintentar={guardarYa} />
          <span className="ms-micro">
            El canal es la posición en la lista: arrastra el renglón por la manija para renumerar.
          </span>
        </div>
      )}
    </div>
  );
}
