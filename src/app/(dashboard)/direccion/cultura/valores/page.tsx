"use client";

import { useState } from "react";
import { parseConductas, type Conducta } from "@/lib/estrategia";
import {
  useEstrategia,
  inputCls,
  labelCls,
  cardCls,
  btnPrimary,
  btnGhost,
  type ValorDTO,
} from "../useEstrategia";

interface Borrador {
  nombre: string;
  descripcion: string;
  comoSeVive: string;
  conductas: Conducta[];
}

function aBorrador(v: ValorDTO): Borrador {
  return {
    nombre: v.nombre,
    descripcion: v.descripcion ?? "",
    comoSeVive: v.comoSeVive ?? "",
    conductas: parseConductas(v.conductas),
  };
}

export default function ValoresPage() {
  const { data, cargando, error, recargar } = useEstrategia();
  const [editId, setEditId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  async function guardar() {
    if (!borrador) return;
    setGuardando(true);
    const nuevo = editId === "nuevo";
    const res = await fetch("/api/direccion/estrategia/valores", {
      method: nuevo ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevo ? borrador : { id: editId, ...borrador }),
    });
    const d = await res.json();
    setGuardando(false);
    if (!res.ok) return setMsg(d.error ?? "No se pudo guardar");
    setEditId(null);
    setBorrador(null);
    setMsg("");
    recargar();
  }

  async function quitar(id: string, nombre: string) {
    if (!confirm(`¿Dar de baja el valor “${nombre}”? Los puestos y acuerdos ya firmados lo conservan.`)) return;
    await fetch(`/api/direccion/estrategia/valores?id=${id}`, { method: "DELETE" });
    recargar();
  }

  function setConducta(i: number, patch: Partial<Conducta>) {
    if (!borrador) return;
    const conductas = borrador.conductas.map((c, ix) => (ix === i ? { ...c, ...patch } : c));
    setBorrador({ ...borrador, conductas });
  }

  if (cargando) return <div className="p-6 text-gray-500 text-sm">Cargando…</div>;
  if (error) return <div className="p-6 text-red-400 text-sm">{error}</div>;

  const valores = data?.valores ?? [];
  const noNegociables = valores.flatMap(v =>
    parseConductas(v.conductas)
      .filter(c => c.tipo === "INACEPTABLE" && c.bajaInmediata)
      .map(c => ({ valor: v.nombre, texto: c.texto }))
  );

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-start gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Valores y conductas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Un valor sin conducta observable no sirve para contratar ni para evaluar. Lo que se captura
            aquí es lo que el puesto selecciona, lo que se filtra en el proceso de contratación y lo que
            se imprime en el acuerdo de alineación.
          </p>
        </div>
        <button
          className={`${btnPrimary} ml-auto shrink-0`}
          onClick={() => {
            setEditId("nuevo");
            setBorrador({ nombre: "", descripcion: "", comoSeVive: "", conductas: [] });
          }}
        >
          Nuevo valor
        </button>
      </div>

      {msg && <div className="text-sm text-red-400">{msg}</div>}

      {noNegociables.length > 0 && (
        <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-5">
          <h2 className="text-base font-semibold text-red-300">No negociables</h2>
          <p className="text-xs text-red-400/70 mt-0.5 mb-3">
            Conductas que terminan la relación laboral de inmediato. Se muestran en la vacante y en el
            acuerdo para que nadie las conozca por sorpresa.
          </p>
          <ul className="space-y-1.5">
            {noNegociables.map((n, i) => (
              <li key={i} className="text-sm text-gray-300 flex gap-2">
                <span className="text-red-500">✕</span>
                <span>
                  {n.texto} <span className="text-gray-600">· {n.valor}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editId === "nuevo" && borrador && (
        <EditorValor
          borrador={borrador}
          setBorrador={setBorrador}
          setConducta={setConducta}
          guardar={guardar}
          cancelar={() => {
            setEditId(null);
            setBorrador(null);
          }}
          guardando={guardando}
        />
      )}

      <div className="space-y-4">
        {valores.map(v => {
          const enEdicion = editId === v.id;
          if (enEdicion && borrador) {
            return (
              <EditorValor
                key={v.id}
                borrador={borrador}
                setBorrador={setBorrador}
                setConducta={setConducta}
                guardar={guardar}
                cancelar={() => {
                  setEditId(null);
                  setBorrador(null);
                }}
                guardando={guardando}
              />
            );
          }
          const conductas = parseConductas(v.conductas);
          return (
            <div key={v.id} className={cardCls}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-white">{v.nombre}</h2>
                  {v.comoSeVive && (
                    <p className="text-sm text-[#B3985B] mt-0.5 italic">{v.comoSeVive}</p>
                  )}
                  {v.descripcion && (
                    <p className="text-sm text-gray-400 mt-2 leading-relaxed">{v.descripcion}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    className={btnGhost}
                    onClick={() => {
                      setEditId(v.id);
                      setBorrador(aBorrador(v));
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg border border-[#222] text-gray-600 text-sm hover:text-red-400"
                    onClick={() => quitar(v.id, v.nombre)}
                  >
                    Baja
                  </button>
                </div>
              </div>
              {conductas.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#1a1a1a]">
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Así se ve cuando se cumple</p>
                    <ul className="space-y-1">
                      {conductas
                        .filter(c => c.tipo === "ESPERADA")
                        .map((c, i) => (
                          <li key={i} className="text-sm text-gray-300 flex gap-2">
                            <span className="text-green-500">✓</span>
                            {c.texto}
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Así se ve cuando no</p>
                    <ul className="space-y-1">
                      {conductas
                        .filter(c => c.tipo === "INACEPTABLE")
                        .map((c, i) => (
                          <li key={i} className="text-sm text-gray-300 flex gap-2">
                            <span className={c.bajaInmediata ? "text-red-500" : "text-yellow-600"}>
                              ✕
                            </span>
                            <span>
                              {c.texto}
                              {c.bajaInmediata && (
                                <span className="text-red-400/70 text-xs"> · baja inmediata</span>
                              )}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditorValor({
  borrador,
  setBorrador,
  setConducta,
  guardar,
  cancelar,
  guardando,
}: {
  borrador: Borrador;
  setBorrador: (b: Borrador) => void;
  setConducta: (i: number, patch: Partial<Conducta>) => void;
  guardar: () => void;
  cancelar: () => void;
  guardando: boolean;
}) {
  return (
    <div className={`${cardCls} border-[#B3985B]/40 space-y-3`}>
      <div>
        <label className={labelCls}>Nombre del valor</label>
        <input
          className={inputCls}
          value={borrador.nombre}
          onChange={e => setBorrador({ ...borrador, nombre: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>Cómo se vive (una frase que cualquiera reconozca)</label>
        <input
          className={inputCls}
          value={borrador.comoSeVive}
          onChange={e => setBorrador({ ...borrador, comoSeVive: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>Descripción</label>
        <textarea
          className={inputCls}
          rows={3}
          value={borrador.descripcion}
          onChange={e => setBorrador({ ...borrador, descripcion: e.target.value })}
        />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className={labelCls + " mb-0"}>Conductas</label>
          <button
            className="text-xs text-[#B3985B] hover:underline"
            onClick={() =>
              setBorrador({
                ...borrador,
                conductas: [...borrador.conductas, { texto: "", tipo: "ESPERADA" }],
              })
            }
          >
            + agregar
          </button>
        </div>
        <div className="space-y-2">
          {borrador.conductas.map((c, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className={inputCls}
                value={c.texto}
                placeholder="Conducta observable"
                onChange={e => setConducta(i, { texto: e.target.value })}
              />
              <select
                className="bg-[#0d0d0d] border border-[#222] text-white text-xs rounded-lg px-2 py-2 shrink-0"
                value={c.tipo}
                onChange={e =>
                  setConducta(i, {
                    tipo: e.target.value as Conducta["tipo"],
                    bajaInmediata: e.target.value === "ESPERADA" ? false : c.bajaInmediata,
                  })
                }
              >
                <option value="ESPERADA">Esperada</option>
                <option value="INACEPTABLE">Inaceptable</option>
              </select>
              <label
                className={`text-xs shrink-0 flex items-center gap-1 ${
                  c.tipo === "INACEPTABLE" ? "text-red-400" : "text-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={c.tipo !== "INACEPTABLE"}
                  checked={!!c.bajaInmediata}
                  onChange={e => setConducta(i, { bajaInmediata: e.target.checked })}
                />
                baja
              </label>
              <button
                className="text-gray-600 hover:text-red-400 text-sm shrink-0 px-1"
                onClick={() =>
                  setBorrador({
                    ...borrador,
                    conductas: borrador.conductas.filter((_, ix) => ix !== i),
                  })
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button className={btnPrimary} onClick={guardar} disabled={guardando || !borrador.nombre.trim()}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button className={btnGhost} onClick={cancelar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
