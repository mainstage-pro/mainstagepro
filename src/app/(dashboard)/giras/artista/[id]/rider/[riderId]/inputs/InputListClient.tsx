"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { PLANTILLA_INPUT_BANDA, SOPORTES_MIC, SOPORTE_MIC_LABEL } from "@/lib/giras";

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
type Fila = Omit<CanalInput, "id"> & { id: string | null; clave: string };

interface Props {
  riderId: string;
  canalesMinimos: number | null;
  canalesIniciales: CanalInput[];
}

let contador = 0;
function nuevaClave() {
  contador += 1;
  return `tmp-${contador}`;
}

function aFila(c: CanalInput): Fila {
  return { ...c, clave: c.id };
}

function filaVacia(numero: number): Fila {
  return {
    id: null,
    clave: nuevaClave(),
    numero,
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

export default function InputListClient({ riderId, canalesMinimos, canalesIniciales }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [filas, setFilas] = useState<Fila[]>(canalesIniciales.map(aFila));
  const [original, setOriginal] = useState(JSON.stringify(canalesIniciales.map(aFila)));
  const [guardando, setGuardando] = useState(false);

  const sucio = JSON.stringify(filas) !== original;

  function set(clave: string, campos: Partial<Fila>) {
    setFilas((prev) => prev.map((f) => (f.clave === clave ? { ...f, ...campos } : f)));
  }

  function agregar() {
    setFilas((prev) => [...prev, filaVacia(prev.length + 1)]);
  }

  function quitar(clave: string) {
    setFilas((prev) => prev.filter((f) => f.clave !== clave).map((f, i) => ({ ...f, numero: i + 1 })));
  }

  function mover(clave: string, delta: number) {
    setFilas((prev) => {
      const i = prev.findIndex((f) => f.clave === clave);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia.map((f, k) => ({ ...f, numero: k + 1 }));
    });
  }

  function renumerar() {
    setFilas((prev) => prev.map((f, i) => ({ ...f, numero: i + 1 })));
  }

  function sembrarPlantilla() {
    setFilas((prev) => [
      ...prev,
      ...PLANTILLA_INPUT_BANDA.map((c, i) => ({
        ...filaVacia(prev.length + i + 1),
        nombre: c.nombre,
        instrumento: c.instrumento ?? null,
        microfono: c.microfono ?? null,
        alternativas: c.alternativas ?? null,
        soporte: c.soporte ?? null,
        phantom: c.phantom === true,
      })),
    ]);
  }

  async function guardar() {
    const utiles = filas.filter((f) => f.nombre.trim());
    setGuardando(true);
    try {
      const res = await fetch(`/api/artista-riders/${riderId}/canales`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "INPUT",
          canales: utiles.map((f, i) => ({
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
          })),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar la input list");
        return;
      }
      const frescas: Fila[] = (d.canales as CanalInput[]).map(aFila);
      setFilas(frescas);
      setOriginal(JSON.stringify(frescas));
      toast.success(`Input list guardada: ${frescas.length} canales`);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  const conNombre = filas.filter((f) => f.nombre.trim()).length;
  const faltanCanales = canalesMinimos !== null && conNombre > canalesMinimos;

  return (
    <div className="ms-page space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="ms-h2">Input list</h2>
          <p className="ms-subtitle mt-1">
            Canal por canal, con el micrófono preferido y sus alternativas: es lo que se negocia con la casa sin
            discutir.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filas.length === 0 && (
            <button className="ms-btn-secondary" onClick={sembrarPlantilla}>
              Sembrar plantilla de banda
            </button>
          )}
          <button className="ms-btn-ghost" onClick={agregar}>
            + Canal
          </button>
          <button onClick={() => void guardar()} disabled={guardando || !sucio} className="ms-btn-primary disabled:opacity-40">
            {guardando ? "Guardando…" : "Guardar lista"}
          </button>
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
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="w-full min-w-[1420px]">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th text-left w-[60px]">#</th>
                <th className="ms-th text-left w-[170px]">Canal</th>
                <th className="ms-th text-left w-[160px]">Instrumento</th>
                <th className="ms-th text-left w-[200px]">Micrófono preferido</th>
                <th className="ms-th text-left w-[200px]">Alternativas aceptables</th>
                <th className="ms-th text-left w-[150px]">Soporte</th>
                <th className="ms-th text-center w-[60px]">48V</th>
                <th className="ms-th text-left w-[150px]">Inserto</th>
                <th className="ms-th text-left w-[170px]">Notas</th>
                <th className="ms-th w-[80px]" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={f.clave} className="ms-tr align-top">
                  <td className="ms-td">
                    <input
                      type="number"
                      min={1}
                      className="ms-input-inline w-full"
                      value={f.numero}
                      onChange={(e) => set(f.clave, { numero: Number(e.target.value) })}
                    />
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
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => mover(f.clave, -1)}
                        disabled={i === 0}
                        className="text-[#555] hover:text-white disabled:opacity-30 transition-colors"
                        title="Subir"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => mover(f.clave, 1)}
                        disabled={i === filas.length - 1}
                        className="text-[#555] hover:text-white disabled:opacity-30 transition-colors"
                        title="Bajar"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => quitar(f.clave)}
                        className="text-[#555] hover:text-red-400 transition-colors"
                        title="Quitar canal"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => void guardar()} disabled={guardando || !sucio} className="ms-btn-primary disabled:opacity-40">
            {guardando ? "Guardando…" : "Guardar lista"}
          </button>
          <button onClick={renumerar} className="ms-btn-ghost">
            Renumerar 1…{filas.length}
          </button>
          <button className="ms-btn-ghost" onClick={agregar}>
            + Canal
          </button>
          <span className="ms-micro">
            {sucio ? "Hay cambios sin guardar; la lista se guarda completa." : "Sin cambios por guardar."}
          </span>
        </div>
      )}
    </div>
  );
}
