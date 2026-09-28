"use client";

import { useMemo, useState } from "react";
import { Combobox } from "@/components/Combobox";

// Modal único para registrar la salida de dinero, lo mismo si se le paga a un
// técnico que a un proveedor, y lo mismo desde el proyecto que desde el módulo
// del ciclo semanal. Un solo lugar donde se decide qué se paga, con qué método,
// desde qué cuenta y con qué referencia.
//
// Con un solo acreedor permite partir el pago en varios desembolsos (mitad
// transferencia, mitad efectivo). Con varios acreedores el pago es uno por cada
// uno, con el mismo método: es el caso de "pagarle a todos de un jalón".

export interface LineaPago {
  id: string;
  etiqueta: string;
  detalle?: string | null;
  monto: number;
}

export interface GrupoPago {
  id: string;
  titulo: string;
  lineas: LineaPago[];
}

export interface CuentaOpcion {
  id: string;
  nombre: string;
  banco?: string | null;
}

export interface DesembolsoCapturado {
  monto: number;
  metodoPago: string;
  cuentaOrigenId: string | null;
  referencia: string | null;
}

export interface PagoCapturado {
  fecha: string;
  notas: string | null;
  /** Ids de líneas que siguen marcadas, por grupo. */
  seleccion: Record<string, string[]>;
  /** Cuánto se seleccionó en cada grupo. */
  totalPorGrupo: Record<string, number>;
  totalSeleccionado: number;
  desembolsos: DesembolsoCapturado[];
  totalDesembolsado: number;
  /** El desembolso cubre todo lo seleccionado. */
  completo: boolean;
}

interface EntradaForm {
  monto: string;
  metodoPago: string;
  cuentaOrigenId: string;
  referencia: string;
}

const ENTRADA_VACIA: EntradaForm = {
  monto: "",
  metodoPago: "TRANSFERENCIA",
  cuentaOrigenId: "",
  referencia: "",
};

const METODOS = [
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "TARJETA", label: "Tarjeta" },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const input =
  "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]";

export default function ModalRegistrarPago({
  titulo,
  subtitulo,
  grupos,
  cuentas,
  guardando = false,
  onCerrar,
  onConfirmar,
}: {
  titulo: string;
  subtitulo?: string;
  grupos: GrupoPago[];
  cuentas: CuentaOpcion[];
  guardando?: boolean;
  onCerrar: () => void;
  onConfirmar: (pago: PagoCapturado) => void;
}) {
  const unSoloAcreedor = grupos.length === 1;

  const [seleccion, setSeleccion] = useState<Set<string>>(
    () => new Set(grupos.flatMap((g) => g.lineas.map((l) => `${g.id}|${l.id}`))),
  );
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [notas, setNotas] = useState("");

  const totalInicial = grupos.reduce((s, g) => s + g.lineas.reduce((ss, l) => ss + l.monto, 0), 0);
  const [entradas, setEntradas] = useState<EntradaForm[]>(() => [
    { ...ENTRADA_VACIA, monto: unSoloAcreedor ? String(totalInicial) : "" },
  ]);
  const [metodo, setMetodo] = useState("TRANSFERENCIA");
  const [cuenta, setCuenta] = useState("");
  const [referencia, setReferencia] = useState("");

  const totalPorGrupo = useMemo(() => {
    const out: Record<string, number> = {};
    for (const g of grupos) {
      out[g.id] = g.lineas.reduce((s, l) => (seleccion.has(`${g.id}|${l.id}`) ? s + l.monto : s), 0);
    }
    return out;
  }, [grupos, seleccion]);

  const totalSeleccionado = Math.round(Object.values(totalPorGrupo).reduce((s, n) => s + n, 0) * 100) / 100;
  const totalDesembolsado = unSoloAcreedor
    ? Math.round(entradas.reduce((s, e) => s + (parseFloat(e.monto) || 0), 0) * 100) / 100
    : totalSeleccionado;
  const restante = Math.round((totalSeleccionado - totalDesembolsado) * 100) / 100;
  const completo = Math.abs(restante) <= 0.01;

  const cuentaOpts = [
    { value: "", label: "— Sin cuenta —" },
    ...cuentas.map((c) => ({ value: c.id, label: c.nombre + (c.banco ? ` · ${c.banco}` : "") })),
  ];

  function alternarLinea(grupoId: string, lineaId: string) {
    const key = `${grupoId}|${lineaId}`;
    const next = new Set(seleccion);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSeleccion(next);
    // Con un solo acreedor y un solo desembolso, el monto sigue lo que se marca.
    if (unSoloAcreedor && entradas.length === 1) {
      const g = grupos[0];
      const nuevo = g.lineas.reduce((s, l) => (next.has(`${g.id}|${l.id}`) ? s + l.monto : s), 0);
      setEntradas([{ ...entradas[0], monto: String(nuevo) }]);
    }
  }

  function confirmar() {
    const desembolsos: DesembolsoCapturado[] = unSoloAcreedor
      ? entradas
          .map((e) => ({
            monto: Math.round((parseFloat(e.monto) || 0) * 100) / 100,
            metodoPago: e.metodoPago || "TRANSFERENCIA",
            cuentaOrigenId: e.cuentaOrigenId || null,
            referencia: e.referencia || null,
          }))
          .filter((e) => e.monto > 0)
      : [
          {
            monto: totalSeleccionado,
            metodoPago: metodo || "TRANSFERENCIA",
            cuentaOrigenId: cuenta || null,
            referencia: referencia || null,
          },
        ];

    onConfirmar({
      fecha,
      notas: notas.trim() || null,
      seleccion: Object.fromEntries(
        grupos.map((g) => [g.id, g.lineas.filter((l) => seleccion.has(`${g.id}|${l.id}`)).map((l) => l.id)]),
      ),
      totalPorGrupo,
      totalSeleccionado,
      desembolsos,
      totalDesembolsado,
      completo,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.80)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !guardando) onCerrar();
      }}
    >
      <div
        className={`bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full ${
          unSoloAcreedor ? "max-w-lg" : "max-w-md"
        } p-6 max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-semibold">{titulo}</h3>
            {subtitulo && <p className="text-xs text-gray-500 mt-0.5">{subtitulo}</p>}
          </div>
          <button
            onClick={onCerrar}
            disabled={guardando}
            className="text-gray-600 hover:text-white text-lg leading-none disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* Qué se está pagando */}
        <div className="bg-[#0d0d0d] rounded-xl p-3 mb-4 space-y-2 max-h-48 overflow-y-auto">
          {grupos.map((g) => (
            <div key={g.id}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium truncate mr-2">{g.titulo}</span>
                <span className="text-sm text-[#B3985B] font-semibold shrink-0">{fmt(totalPorGrupo[g.id] ?? 0)}</span>
              </div>
              {g.lineas.map((l) => {
                const marcada = seleccion.has(`${g.id}|${l.id}`);
                return (
                  <div key={l.id} className="flex items-center justify-between pl-3 mt-1.5 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer group min-w-0">
                      <input
                        type="checkbox"
                        checked={marcada}
                        onChange={() => alternarLinea(g.id, l.id)}
                        className="accent-[#B3985B] cursor-pointer w-3.5 h-3.5 shrink-0"
                      />
                      <span className="min-w-0">
                        <span
                          className={`block text-xs truncate transition-colors ${
                            marcada ? "text-gray-400 group-hover:text-gray-300" : "text-gray-600 line-through"
                          }`}
                        >
                          {l.etiqueta}
                        </span>
                        {l.detalle && <span className="block text-[10px] text-gray-700 truncate">{l.detalle}</span>}
                      </span>
                    </label>
                    <span
                      className={`text-xs shrink-0 transition-colors ${
                        marcada ? "text-gray-500" : "text-gray-700 line-through"
                      }`}
                    >
                      {fmt(l.monto)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mb-4">
          <label className="text-xs text-gray-500 block mb-1">Fecha de pago *</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={input} />
        </div>

        {unSoloAcreedor ? (
          <>
            <div className="space-y-2 mb-3">
              {entradas.map((entrada, i) => (
                <div key={i} className="bg-[#0d0d0d] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pago {i + 1}</p>
                    {entradas.length > 1 && (
                      <button
                        onClick={() => setEntradas((prev) => prev.filter((_, j) => j !== i))}
                        className="text-gray-600 hover:text-red-400 text-sm transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Monto *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={entrada.monto}
                        onChange={(e) =>
                          setEntradas((prev) => prev.map((x, j) => (j === i ? { ...x, monto: e.target.value } : x)))
                        }
                        placeholder="0.00"
                        className={input}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Método</label>
                      <Combobox
                        value={entrada.metodoPago}
                        onChange={(v) =>
                          setEntradas((prev) => prev.map((x, j) => (j === i ? { ...x, metodoPago: v } : x)))
                        }
                        options={METODOS}
                        className={input}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Cuenta</label>
                      <Combobox
                        value={entrada.cuentaOrigenId}
                        onChange={(v) =>
                          setEntradas((prev) => prev.map((x, j) => (j === i ? { ...x, cuentaOrigenId: v } : x)))
                        }
                        options={cuentaOpts}
                        placeholder="Sin cuenta"
                        className={input}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Referencia</label>
                      <input
                        value={entrada.referencia}
                        onChange={(e) =>
                          setEntradas((prev) => prev.map((x, j) => (j === i ? { ...x, referencia: e.target.value } : x)))
                        }
                        placeholder="Folio, ref..."
                        className={input}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setEntradas((prev) => [...prev, { ...ENTRADA_VACIA }])}
                className="w-full py-2 border border-dashed border-[#333] hover:border-[#B3985B]/50 rounded-xl text-gray-500 hover:text-[#B3985B] text-xs transition-colors"
              >
                + Agregar otro pago
              </button>
            </div>

            <div className="bg-[#0d0d0d] rounded-xl p-3 mb-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Total adeudo</span>
                <span className="text-white font-semibold">{fmt(totalSeleccionado)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Registrando</span>
                <span className={`font-semibold ${restante < -0.01 ? "text-red-400" : "text-[#B3985B]"}`}>
                  {fmt(totalDesembolsado)}
                </span>
              </div>
              {completo && totalDesembolsado > 0 && (
                <div className="flex justify-center pt-0.5">
                  <span className="text-xs text-green-400">✓ Pago completo — se marcará como pagado</span>
                </div>
              )}
              {restante > 0.01 && totalDesembolsado > 0 && (
                <div className="flex justify-between text-xs pt-0.5">
                  <span className="text-yellow-500">Quedará pendiente</span>
                  <span className="text-yellow-400">{fmt(restante)}</span>
                </div>
              )}
              {restante < -0.01 && (
                <div className="flex justify-between text-xs pt-0.5">
                  <span className="text-red-400">Excede el adeudo</span>
                  <span className="text-red-400">{fmt(Math.abs(restante))}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Método de pago</label>
                <Combobox value={metodo} onChange={setMetodo} options={METODOS} className={input} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Cuenta bancaria</label>
                <Combobox
                  value={cuenta}
                  onChange={setCuenta}
                  options={cuentaOpts}
                  placeholder="Sin cuenta"
                  className={input}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Referencia / Folio</label>
              <input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Núm. de referencia, folio..."
                className={input}
              />
            </div>
          </div>
        )}

        <div className="mb-5">
          <label className="text-xs text-gray-500 block mb-1">Notas</label>
          <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" className={input} />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCerrar}
            disabled={guardando}
            className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={guardando || !fecha || totalDesembolsado <= 0 || totalSeleccionado <= 0}
            className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c9a96a] disabled:opacity-40 transition-colors"
          >
            {guardando
              ? "Registrando..."
              : completo
                ? `Confirmar pago · ${fmt(totalDesembolsado)}`
                : `Registrar pago parcial · ${fmt(totalDesembolsado)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
