"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { FilaArrastrable, TablaOrdenable, ThArrastre } from "@/components/ui/TablaOrdenable";
import { PLANTILLA_BLOQUES_RIDER, TIPOS_BLOQUE, TIPO_BLOQUE_LABEL } from "@/lib/giras";

export interface BloqueRider {
  id: string;
  titulo: string;
  tipo: string;
  duracionMin: number | null;
  responsable: string | null;
  contenido: string | null;
  orden: number;
}

/// El orden del bloque no se guarda en la fila: es su posición en la lista, así
/// que arrastrar un renglón ya es reordenar el montaje.
type Fila = Omit<BloqueRider, "id" | "orden"> & { id: string | null; clave: string };

interface Props {
  riderId: string;
  bloquesIniciales: BloqueRider[];
}

let contador = 0;
function nuevaClave() {
  contador += 1;
  return `tmp-${contador}`;
}

function aFila(b: BloqueRider): Fila {
  return {
    id: b.id,
    clave: b.id,
    titulo: b.titulo,
    tipo: b.tipo,
    duracionMin: b.duracionMin,
    responsable: b.responsable,
    contenido: b.contenido,
  };
}

function filaVacia(): Fila {
  return {
    id: null,
    clave: nuevaClave(),
    titulo: "",
    tipo: "MONTAJE",
    duracionMin: null,
    responsable: null,
    contenido: null,
  };
}

function horasYMinutos(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export default function MontajeRiderClient({ riderId, bloquesIniciales }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [filas, setFilas] = useState<Fila[]>(bloquesIniciales.map(aFila));
  const [original, setOriginal] = useState(JSON.stringify(bloquesIniciales.map(aFila)));
  const [guardando, setGuardando] = useState(false);

  const sucio = JSON.stringify(filas) !== original;

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
      ...PLANTILLA_BLOQUES_RIDER.map((b) => ({
        ...filaVacia(),
        titulo: b.titulo,
        tipo: b.tipo,
        duracionMin: b.duracionMin,
        responsable: b.responsable,
        contenido: b.contenido,
      })),
    ]);
  }

  async function guardar() {
    const utiles = filas.filter((f) => f.titulo.trim());
    setGuardando(true);
    try {
      const res = await fetch(`/api/artista-riders/${riderId}/bloques`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bloques: utiles.map((f, i) => ({
            id: f.id,
            titulo: f.titulo,
            tipo: f.tipo,
            duracionMin: f.duracionMin,
            responsable: f.responsable,
            contenido: f.contenido,
            orden: i,
          })),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar el montaje");
        return;
      }
      const frescas: Fila[] = (d.bloques as BloqueRider[]).map(aFila);
      setFilas(frescas);
      setOriginal(JSON.stringify(frescas));
      toast.success(`Montaje guardado: ${frescas.length} bloques`);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  const totalMin = useMemo(
    () => filas.reduce((s, f) => s + (f.duracionMin ?? 0), 0),
    [filas],
  );
  const sinDuracion = filas.filter((f) => f.titulo.trim() && f.duracionMin === null).length;

  return (
    <div className="ms-page space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="ms-h2">Montaje y soundcheck que exige el rider</h2>
          <p className="ms-subtitle mt-1">
            Duraciones y responsables, no horas de reloj: la hora la pone el day sheet de cada fecha. Esto es lo que se
            negocia con el venue antes de firmar el horario.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filas.length === 0 && (
            <button className="ms-btn-secondary" onClick={sembrarPlantilla}>
              Sembrar plantilla de banda
            </button>
          )}
          <button className="ms-btn-ghost" onClick={agregar}>
            + Bloque
          </button>
          <button
            onClick={() => void guardar()}
            disabled={guardando || !sucio}
            className="ms-btn-primary disabled:opacity-40"
          >
            {guardando ? "Guardando…" : "Guardar montaje"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label">Bloques</p>
          <p className="text-xl font-semibold mt-1 text-white">{filas.filter((f) => f.titulo.trim()).length}</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Tiempo que pide en sitio</p>
          <p className="text-xl font-semibold mt-1 text-[#B3985B]">{totalMin ? horasYMinutos(totalMin) : "—"}</p>
          <p className="ms-micro mt-0.5">Es el mínimo que debe caber antes de puertas.</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Sin duración</p>
          <p className="text-xl font-semibold mt-1 text-white">{sinDuracion}</p>
          <p className="ms-micro mt-0.5">Previos del venue que no consumen el llamado.</p>
        </div>
      </div>

      {filas.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-[#6b7280]">
            El rider no tiene bloques de montaje. Siembra la plantilla de banda y corrige lo que no aplique.
          </p>
        </div>
      ) : (
        <TablaOrdenable filas={filas} claveDe={(f) => f.clave} onReordenar={setFilas}>
          <table className="w-full min-w-[1100px]">
            <thead className="ms-thead">
              <tr>
                <ThArrastre />
                <th className="ms-th text-left w-[240px]">Bloque</th>
                <th className="ms-th text-left w-[150px]">Tipo</th>
                <th className="ms-th text-left w-[110px]">Duración</th>
                <th className="ms-th text-left w-[180px]">Quién lo ejecuta</th>
                <th className="ms-th text-left">Qué pasa en el bloque</th>
                <th className="ms-th w-[48px]" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <FilaArrastrable key={f.clave} clave={f.clave} titulo="Arrastrar para cambiar el orden del montaje">
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="ej. Line check y RF"
                      value={f.titulo}
                      onChange={(e) => set(f.clave, { titulo: e.target.value })}
                    />
                    {!f.titulo.trim() && <span className="ms-micro text-amber-300">sin título no se guarda</span>}
                  </td>
                  <td className="ms-td">
                    <select
                      className="ms-input-inline w-full"
                      value={f.tipo}
                      onChange={(e) => set(f.clave, { tipo: e.target.value })}
                    >
                      {TIPOS_BLOQUE.map((t) => (
                        <option key={t} value={t}>
                          {TIPO_BLOQUE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="ms-td">
                    <input
                      type="number"
                      min={0}
                      step={15}
                      className="ms-input-inline w-full"
                      placeholder="min"
                      value={f.duracionMin ?? ""}
                      onChange={(e) => set(f.clave, { duracionMin: e.target.value ? Number(e.target.value) : null })}
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="ej. Artista + local"
                      value={f.responsable ?? ""}
                      onChange={(e) => set(f.clave, { responsable: e.target.value })}
                    />
                  </td>
                  <td className="ms-td">
                    <textarea
                      rows={2}
                      className="ms-input-inline w-full resize-y"
                      placeholder="qué se verifica, qué queda listo al cerrar el bloque"
                      value={f.contenido ?? ""}
                      onChange={(e) => set(f.clave, { contenido: e.target.value })}
                    />
                  </td>
                  <td className="ms-td">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => quitar(f.clave)}
                        className="text-[#555] hover:text-red-400 transition-colors"
                        title="Quitar bloque"
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
          <button
            onClick={() => void guardar()}
            disabled={guardando || !sucio}
            className="ms-btn-primary disabled:opacity-40"
          >
            {guardando ? "Guardando…" : "Guardar montaje"}
          </button>
          <button className="ms-btn-ghost" onClick={agregar}>
            + Bloque
          </button>
          <span className="ms-micro">
            {sucio
              ? "Hay cambios sin guardar; el montaje se guarda completo y lo que quitaste se borra."
              : "Sin cambios por guardar."}
          </span>
        </div>
      )}
    </div>
  );
}
