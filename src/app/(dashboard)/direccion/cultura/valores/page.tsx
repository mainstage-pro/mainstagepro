"use client";

import { useState } from "react";
import {
  Gem,
  Scale,
  TrendingUp,
  Users,
  Handshake,
  Flame,
  Award,
  Anchor,
  ShieldCheck,
  Clock,
  Check,
  X,
  ShieldAlert,
  ListChecks,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { parseConductas, type Conducta } from "@/lib/estrategia";
import {
  useEstrategia,
  inputCls,
  labelCls,
  btnPrimary,
  btnGhost,
  type ValorDTO,
} from "../useEstrategia";
import { Lienzo, Encabezado, Panel, Cita, Vacio, FONDOS, GOLD, oro } from "../ui";

// Los valores los captura el usuario, así que el icono se deduce del nombre.
// Es un gesto visual, no una taxonomía: si no hay coincidencia, cae en Gem.
const PISTAS: [RegExp, LucideIcon][] = [
  [/honest|verdad|transparen/i, Scale],
  [/mejora|crec|aprend|evoluc/i, TrendingUp],
  [/equipo|juntos|colabor|compañer/i, Users],
  [/respeto|dignidad|trato/i, Handshake],
  [/pasi[óo]n|amor|entrega/i, Flame],
  [/calidad|excelencia|est[áa]ndar|impecab/i, Award],
  [/compromiso|responsab|palabra/i, Anchor],
  [/segurid|cuidado|protec/i, ShieldCheck],
  [/puntual|tiempo|anticip/i, Clock],
];

function iconoValor(nombre: string): LucideIcon {
  return PISTAS.find(([re]) => re.test(nombre))?.[1] ?? Gem;
}

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

  function editarValor(v: ValorDTO) {
    setEditId(v.id);
    setBorrador(aBorrador(v));
  }

  if (cargando) return <div className="p-6 text-gray-500 text-sm">Cargando…</div>;
  if (error) return <div className="p-6 text-red-400 text-sm">{error}</div>;

  const valores = data?.valores ?? [];
  const noNegociables = valores.flatMap(v =>
    parseConductas(v.conductas)
      .filter(c => c.tipo === "INACEPTABLE" && c.bajaInmediata)
      .map(c => ({ valor: v.nombre, texto: c.texto }))
  );
  const sinConductas = valores.filter(v => parseConductas(v.conductas).length === 0);

  return (
    <Lienzo foto={FONDOS.valores}>
      <Encabezado
        icono={Gem}
        antetitulo="Cultura y estrategia"
        titulo="Valores y conductas"
        bajada="Un valor sin conducta observable no sirve para contratar ni para evaluar. Lo que se captura aquí es lo que el puesto selecciona, lo que se filtra en la contratación y lo que se imprime en el acuerdo de alineación."
        acciones={
          <button
            className={btnPrimary}
            onClick={() => {
              setEditId("nuevo");
              setBorrador({ nombre: "", descripcion: "", comoSeVive: "", conductas: [] });
            }}
          >
            Nuevo valor
          </button>
        }
      />

      {msg && <div className="text-sm text-red-400">{msg}</div>}

      {noNegociables.length > 0 && (
        <Panel peligro>
          <div className="flex items-start gap-3">
            <ShieldAlert strokeWidth={1.6} className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-red-200">No negociables</h2>
              <p className="text-xs text-red-400/60 mt-0.5 mb-3.5 leading-relaxed">
                Conductas que terminan la relación laboral de inmediato. Se muestran en la vacante y en el
                acuerdo para que nadie las conozca por sorpresa.
              </p>
              <ul className="space-y-2">
                {noNegociables.map((n, i) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2.5 items-start">
                    <X strokeWidth={2.4} className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-500" />
                    <span>
                      {n.texto} <span className="text-gray-600">· {n.valor}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      )}

      {sinConductas.length > 0 && editId === null && (
        <Vacio
          icono={ListChecks}
          titulo={`${sinConductas.length} de ${valores.length} valores todavía no tienen conductas`}
          texto="Mientras estén vacíos, la lista de no negociables sale en blanco en la oferta de trabajo y en el acuerdo de alineación, y el puesto no tiene con qué filtrar a un candidato."
          accion={
            <button className={btnGhost} onClick={() => editarValor(sinConductas[0])}>
              Empezar por “{sinConductas[0].nombre}”
            </button>
          }
        />
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
        {valores.map((v, idx) => {
          if (editId === v.id && borrador) {
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
          const esperadas = conductas.filter(c => c.tipo === "ESPERADA");
          const inaceptables = conductas.filter(c => c.tipo === "INACEPTABLE");
          const Icono = iconoValor(v.nombre);
          return (
            <Panel key={v.id}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 flex flex-col items-center gap-2 w-10">
                  <span
                    className="text-[11px] font-semibold tabular-nums"
                    style={{ color: oro(0.5), letterSpacing: "0.1em" }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: oro(0.08), border: `1px solid ${oro(0.24)}` }}
                  >
                    <Icono strokeWidth={1.5} className="w-[18px] h-[18px]" style={{ color: GOLD }} />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-white tracking-tight">{v.nombre}</h2>
                  {v.comoSeVive && (
                    <div className="mt-2.5">
                      <Cita tam="chica">{v.comoSeVive}</Cita>
                    </div>
                  )}
                  {v.descripcion && (
                    <p className="text-sm text-gray-400 mt-3 leading-relaxed">{v.descripcion}</p>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <button className={btnGhost} onClick={() => editarValor(v)}>
                    Editar
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg border border-white/[0.07] text-gray-600 text-sm hover:text-red-400 hover:border-red-900/40 transition-colors"
                    onClick={() => quitar(v.id, v.nombre)}
                  >
                    Baja
                  </button>
                </div>
              </div>

              {conductas.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-5 mt-5 pt-5" style={{ borderTop: `1px solid ${oro(0.1)}` }}>
                  <div>
                    <p className="text-[10px] uppercase mb-2.5 flex items-center gap-1.5" style={{ color: "rgba(74,222,128,0.65)", letterSpacing: "0.18em" }}>
                      <Check strokeWidth={2.4} className="w-3 h-3" />
                      Así se ve cuando se cumple
                    </p>
                    <ul className="space-y-2">
                      {esperadas.map((c, i) => (
                        <li key={i} className="text-sm text-gray-300 flex gap-2.5 items-start leading-relaxed">
                          <Check strokeWidth={2.4} className="w-3.5 h-3.5 mt-[3px] shrink-0 text-green-500" />
                          {c.texto}
                        </li>
                      ))}
                      {esperadas.length === 0 && <li className="text-xs text-gray-700">Sin capturar</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase mb-2.5 flex items-center gap-1.5" style={{ color: "rgba(248,113,113,0.6)", letterSpacing: "0.18em" }}>
                      <X strokeWidth={2.4} className="w-3 h-3" />
                      Así se ve cuando no
                    </p>
                    <ul className="space-y-2">
                      {inaceptables.map((c, i) => (
                        <li key={i} className="text-sm text-gray-300 flex gap-2.5 items-start leading-relaxed">
                          <X
                            strokeWidth={2.4}
                            className={`w-3.5 h-3.5 mt-[3px] shrink-0 ${c.bajaInmediata ? "text-red-500" : "text-yellow-600"}`}
                          />
                          <span>
                            {c.texto}
                            {c.bajaInmediata && (
                              <span className="text-red-400/70 text-xs"> · baja inmediata</span>
                            )}
                          </span>
                        </li>
                      ))}
                      {inaceptables.length === 0 && <li className="text-xs text-gray-700">Sin capturar</li>}
                    </ul>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => editarValor(v)}
                  className="mt-5 pt-4 w-full flex items-center justify-center gap-2 text-xs text-gray-600 hover:text-white transition-colors"
                  style={{ borderTop: `1px solid ${oro(0.1)}` }}
                >
                  <Plus strokeWidth={2} className="w-3.5 h-3.5" />
                  Este valor todavía no se puede observar — agregar conductas
                </button>
              )}
            </Panel>
          );
        })}
      </div>
    </Lienzo>
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
    <Panel acento className="space-y-3.5">
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
          <label className={labelCls + " mb-0"}>Conductas observables</label>
          <button
            className="text-xs hover:underline flex items-center gap-1"
            style={{ color: GOLD }}
            onClick={() =>
              setBorrador({
                ...borrador,
                conductas: [...borrador.conductas, { texto: "", tipo: "ESPERADA" }],
              })
            }
          >
            <Plus strokeWidth={2.2} className="w-3 h-3" />
            agregar
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
                className="text-gray-600 hover:text-red-400 shrink-0 px-1"
                onClick={() =>
                  setBorrador({
                    ...borrador,
                    conductas: borrador.conductas.filter((_, ix) => ix !== i),
                  })
                }
              >
                <X strokeWidth={2} className="w-3.5 h-3.5" />
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
    </Panel>
  );
}
