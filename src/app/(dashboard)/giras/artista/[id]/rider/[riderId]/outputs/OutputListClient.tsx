"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { PLANTILLA_OUTPUT_BANDA, ROL_PERSONA_LABEL, TIPOS_SALIDA, TIPO_SALIDA_LABEL } from "@/lib/giras";

export interface CanalOutput {
  id: string;
  numero: number;
  nombre: string;
  tipoSalida: string | null;
  estereo: boolean;
  personaId: string | null;
  notas: string | null;
}

type Fila = Omit<CanalOutput, "id"> & { id: string | null; clave: string };

interface Props {
  artistaId: string;
  riderId: string;
  mixesMonitor: number | null;
  canalesIniciales: CanalOutput[];
  personas: { id: string; nombre: string; rol: string; instrumento: string | null }[];
}

let contador = 0;
function nuevaClave() {
  contador += 1;
  return `tmp-${contador}`;
}

function aFila(c: CanalOutput): Fila {
  return { ...c, clave: c.id };
}

function filaVacia(numero: number): Fila {
  return {
    id: null,
    clave: nuevaClave(),
    numero,
    nombre: "",
    tipoSalida: null,
    estereo: false,
    personaId: null,
    notas: null,
  };
}

export default function OutputListClient({
  artistaId,
  riderId,
  mixesMonitor,
  canalesIniciales,
  personas,
}: Props) {
  const router = useRouter();
  const toast = useToast();

  const [filas, setFilas] = useState<Fila[]>(canalesIniciales.map(aFila));
  const [original, setOriginal] = useState(JSON.stringify(canalesIniciales.map(aFila)));
  const [guardando, setGuardando] = useState(false);

  const sucio = JSON.stringify(filas) !== original;

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

  function sembrarPlantilla() {
    setFilas((prev) => [
      ...prev,
      ...PLANTILLA_OUTPUT_BANDA.map((c, i) => ({
        ...filaVacia(prev.length + i + 1),
        nombre: c.nombre,
        tipoSalida: c.tipoSalida,
        estereo: c.estereo === true,
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
          tipo: "OUTPUT",
          canales: utiles.map((f, i) => ({
            id: f.id,
            numero: i + 1,
            nombre: f.nombre,
            tipoSalida: f.tipoSalida,
            estereo: f.estereo,
            personaId: f.personaId,
            notas: f.notas,
          })),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar la output list");
        return;
      }
      const frescas: Fila[] = (d.canales as CanalOutput[]).map(aFila);
      setFilas(frescas);
      setOriginal(JSON.stringify(frescas));
      toast.success(`Output list guardada: ${frescas.length} salidas`);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  const conNombre = filas.filter((f) => f.nombre.trim()).length;
  const descuadre = mixesMonitor !== null && mixesMonitor !== conNombre;

  return (
    <div className="ms-page space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="ms-h2">Output list</h2>
          <p className="ms-subtitle mt-1">
            Los mixes de monitor con dueño: quién oye qué. De aquí sale cuántos in-ears y cuántas wedges se piden.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filas.length === 0 && (
            <button className="ms-btn-secondary" onClick={sembrarPlantilla}>
              Sembrar plantilla de banda
            </button>
          )}
          <button className="ms-btn-ghost" onClick={agregar}>
            + Salida
          </button>
          <button onClick={() => void guardar()} disabled={guardando || !sucio} className="ms-btn-primary disabled:opacity-40">
            {guardando ? "Guardando…" : "Guardar lista"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label">Salidas capturadas</p>
          <p className="text-xl font-semibold mt-1 text-white">{conNombre}</p>
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

      {filas.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-[#6b7280]">
            La output list está vacía. Siembra la plantilla de banda y corrige, o captura salida por salida.
          </p>
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="w-full min-w-[1040px]">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th text-left w-[60px]">#</th>
                <th className="ms-th text-left w-[200px]">Salida / mix</th>
                <th className="ms-th text-left w-[180px]">Tipo</th>
                <th className="ms-th text-center w-[80px]">Estéreo</th>
                <th className="ms-th text-left w-[240px]">De quién es el mix</th>
                <th className="ms-th text-left w-[200px]">Notas</th>
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
                      placeholder="ej. IEM voz lead"
                      value={f.nombre}
                      onChange={(e) => set(f.clave, { nombre: e.target.value })}
                    />
                    {!f.nombre.trim() && <span className="ms-micro text-amber-300">sin nombre no se guarda</span>}
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
                        title="Quitar salida"
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
          <button className="ms-btn-ghost" onClick={agregar}>
            + Salida
          </button>
          <span className="ms-micro">
            {sucio ? "Hay cambios sin guardar; la lista se guarda completa." : "Sin cambios por guardar."}
          </span>
        </div>
      )}
    </div>
  );
}
