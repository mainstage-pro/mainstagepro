"use client";

import { useEffect, useRef, useState } from "react";
import EstadoGuardado from "@/components/EstadoGuardado";
import { useToast } from "@/components/Toast";
import type { EstadoAutoguardado } from "@/hooks/useAutoguardadoCanales";
import { CONEXIONES_RIG } from "@/lib/giras";

export interface RigRider {
  id: string;
  nombre: string;
  equipo: string | null;
  cadena: string | null;
  conexion: string | null;
  notas: string | null;
}

type Fila = Omit<RigRider, "id"> & { id: string | null; clave: string };

/// La celda que amarra un canal a su rig. Sin rig, el canal entra con cable
/// directo a la consola, que es el caso normal y por eso es el valor por default.
export function CeldaRig({
  rigs,
  rigId,
  rigPuerto,
  placeholderPuerto = "out 1",
  onChange,
}: {
  rigs: RigRider[];
  rigId: string | null;
  rigPuerto: string | null;
  /// En el input list el puerto es una salida del rig; en el output list, una
  /// entrada suya.
  placeholderPuerto?: string;
  onChange: (campos: { rigId: string | null; rigPuerto: string | null }) => void;
}) {
  if (rigs.length === 0) return <span className="ms-micro">Directo a consola</span>;

  return (
    <div className="flex items-center gap-1">
      <select
        className="ms-input-inline min-w-0 flex-1"
        value={rigId ?? ""}
        onChange={(e) => onChange({ rigId: e.target.value || null, rigPuerto: e.target.value ? rigPuerto : null })}
      >
        <option value="">Directo</option>
        {rigs.map((r) => (
          <option key={r.id} value={r.id}>
            {r.nombre}
          </option>
        ))}
      </select>
      {rigId && (
        <input
          className="ms-input-inline w-[72px] shrink-0"
          placeholder={placeholderPuerto}
          value={rigPuerto ?? ""}
          onChange={(e) => onChange({ rigId, rigPuerto: e.target.value })}
        />
      )}
    </div>
  );
}

let contador = 0;
function filaVacia(): Fila {
  contador += 1;
  return { id: null, clave: `rig-tmp-${contador}`, nombre: "", equipo: null, cadena: null, conexion: null, notas: null };
}

function firma(filas: Fila[]): string {
  return JSON.stringify(filas.map((f) => ({ ...f, id: null })));
}

/// El bloque donde se declara, una sola vez, por dónde pasa la señal antes de
/// llegar a la consola: la laptop con Ableton que entra a la Apollo, la interfaz
/// de voces, el mixer del DJ. El input list repetiría esa cadena en cada
/// renglón; aquí se escribe una vez y el canal solo apunta al rig y al puerto.
export default function RigsRider({
  riderId,
  rigs,
  onRigs,
}: {
  riderId: string;
  rigs: RigRider[];
  onRigs: (rigs: RigRider[]) => void;
}) {
  const toast = useToast();
  const [filas, setFilas] = useState<Fila[]>(() => rigs.map((r) => ({ ...r, clave: r.id })));
  const [estado, setEstado] = useState<EstadoAutoguardado>("limpio");

  const guardada = useRef(firma(filas));
  const filasRef = useRef(filas);
  const enviarRef = useRef<() => void>(() => {});
  filasRef.current = filas;

  async function enviar() {
    const base = filasRef.current;
    const sig = firma(base);
    if (sig === guardada.current) return;

    const conNombre = base.filter((f) => f.nombre.trim());
    setEstado("guardando");
    try {
      const res = await fetch(`/api/artista-riders/${riderId}/rigs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rigs: conNombre.map(({ clave: _clave, ...r }) => r) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEstado("error");
        toast.error(d.error ?? "No se pudieron guardar los rigs");
        return;
      }
      guardada.current = sig;
      const guardados = (d.rigs as RigRider[]) ?? [];
      const porClave = new Map(conNombre.map((f, i) => [f.clave, guardados[i]?.id ?? null]));
      setFilas((prev) => prev.map((f) => ({ ...f, id: porClave.get(f.clave) ?? null })));
      onRigs(guardados);
      setEstado("guardado");
    } catch {
      setEstado("error");
      toast.error("Error de red al guardar los rigs");
    }
  }

  useEffect(() => {
    enviarRef.current = () => void enviar();
  });

  useEffect(() => {
    if (firma(filas) === guardada.current) return;
    setEstado("pendiente");
    const t = setTimeout(() => enviarRef.current(), 900);
    return () => clearTimeout(t);
  }, [filas]);

  function set(clave: string, campos: Partial<Fila>) {
    setFilas((prev) => prev.map((f) => (f.clave === clave ? { ...f, ...campos } : f)));
  }

  return (
    <div className="ms-card p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Rigs de línea</h3>
          <p className="ms-micro mt-1">
            El equipo del artista por el que pasa la señal antes de la consola: la interfaz del playback, la de voces,
            el mixer del DJ, el rack de in-ears. Se declara aquí una vez y cada canal dice de qué rig y de qué puerto
            sale.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="ms-btn-ghost" onClick={() => setFilas((p) => [...p, filaVacia()])}>
            + Rig
          </button>
          <EstadoGuardado estado={estado} onReintentar={() => void enviar()} />
        </div>
      </div>

      {filas.length === 0 ? (
        <p className="ms-micro mt-3 text-[#6b7280]">
          Sin rigs: todos los canales entran con cable directo a la consola.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th text-left w-[150px]">Rig</th>
                <th className="ms-th text-left w-[200px]">Equipo</th>
                <th className="ms-th text-left w-[260px]">Viene de</th>
                <th className="ms-th text-left w-[160px]">Conexión</th>
                <th className="ms-th text-left w-[180px]">Notas</th>
                <th className="ms-th w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.clave}>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="ej. Playback"
                      value={f.nombre}
                      onChange={(e) => set(f.clave, { nombre: e.target.value })}
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="ej. UA Apollo x8p"
                      value={f.equipo ?? ""}
                      onChange={(e) => set(f.clave, { equipo: e.target.value })}
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="ej. MacBook Pro + Ableton Live"
                      value={f.cadena ?? ""}
                      onChange={(e) => set(f.clave, { cadena: e.target.value })}
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      list="rig-conexiones"
                      placeholder="ej. XLR balanceado"
                      value={f.conexion ?? ""}
                      onChange={(e) => set(f.clave, { conexion: e.target.value })}
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
                        onClick={() => setFilas((p) => p.filter((x) => x.clave !== f.clave))}
                        className="text-[#555] hover:text-red-400 transition-colors"
                        title="Quitar rig"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="rig-conexiones">
            {CONEXIONES_RIG.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      )}
    </div>
  );
}
