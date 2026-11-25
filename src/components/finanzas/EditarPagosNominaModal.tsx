"use client";

import { useCallback, useEffect, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";

// Editor de pagos de nómina ya registrados (Finanzas → Pagos a personal).
// Cada pago es un movimiento: se corrige fecha, monto, método, cuenta o
// referencia, o se elimina y la jornada vuelve a quedar con adeudo.

interface PagoRegistrado {
  id: string;
  filaId: string;
  proyectoId: string;
  proyectoNombre: string;
  puesto: string;
  fechaJornada: string | null;
  esComplemento: boolean;
  fecha: string;
  monto: number;
  metodoPago: string;
  cuentaOrigenId: string | null;
  referencia: string | null;
  conciliado: boolean;
}

interface Borrador {
  fecha: string;
  monto: string;
  metodoPago: string;
  cuentaOrigenId: string;
  referencia: string;
}

const METODOS = [
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "TARJETA", label: "Tarjeta" },
];

const INPUT = "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2.5 py-1.5 text-white text-sm focus:outline-none focus:border-[#B3985B]";

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(n);
}

function fmtDia(iso: string) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

function aBorrador(p: PagoRegistrado): Borrador {
  return {
    fecha: p.fecha,
    monto: String(p.monto),
    metodoPago: p.metodoPago,
    cuentaOrigenId: p.cuentaOrigenId ?? "",
    referencia: p.referencia ?? "",
  };
}

export default function EditarPagosNominaModal({
  tecnicoId,
  tecnicoNombre,
  proyectoIds,
  cuentas,
  onClose,
  onChanged,
}: {
  tecnicoId: string;
  tecnicoNombre: string;
  proyectoIds: string[];
  cuentas: { id: string; nombre: string; banco: string | null }[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [pagos, setPagos] = useState<PagoRegistrado[] | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cuentaOpts = [
    { value: "", label: "— Sin cuenta —" },
    ...cuentas.map((c) => ({ value: c.id, label: c.nombre + (c.banco ? ` · ${c.banco}` : "") })),
  ];
  const nombreCuenta = (id: string | null) => cuentas.find((c) => c.id === id)?.nombre ?? "Sin cuenta";
  const nombreMetodo = (m: string) => METODOS.find((x) => x.value === m)?.label ?? m;

  // Llave estable: el arreglo de proyectos llega nuevo en cada render del padre.
  const proyectosKey = proyectoIds.join(",");

  const cargar = useCallback(async () => {
    const qs = new URLSearchParams({ tecnicoId, proyectoIds: proyectosKey });
    const res = await fetch(`/api/pagos-personal/registrados?${qs}`);
    const json = await res.json().catch(() => ({}));
    setPagos(res.ok ? json.pagos ?? [] : []);
  }, [tecnicoId, proyectosKey]);

  useEffect(() => {
    const qs = new URLSearchParams({ tecnicoId, proyectoIds: proyectosKey });
    let vivo = true;
    fetch(`/api/pagos-personal/registrados?${qs}`)
      .then(async (res) => ({ ok: res.ok, json: await res.json().catch(() => ({})) }))
      .then(({ ok, json }) => { if (vivo) setPagos(ok ? json.pagos ?? [] : []); })
      .catch(() => { if (vivo) setPagos([]); });
    return () => { vivo = false; };
  }, [tecnicoId, proyectosKey]);

  async function guardar(p: PagoRegistrado) {
    if (!borrador) return;
    const monto = parseFloat(borrador.monto);
    if (!borrador.fecha || !(monto > 0)) {
      toast.error("Captura una fecha y un monto mayor a cero");
      return;
    }
    setOcupado(p.id);
    const res = await fetch(`/api/pagos-personal/registrados/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...borrador, monto }),
    });
    setOcupado(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "No se pudo guardar el pago");
      return;
    }
    toast.success("Pago actualizado");
    setEditando(null);
    setBorrador(null);
    await cargar();
    onChanged();
  }

  async function eliminar(p: PagoRegistrado) {
    const ok = await confirm({
      title: "Eliminar pago",
      message: `Se borra el pago de ${fmt(p.monto)} del ${fmtDia(p.fecha)} (${p.proyectoNombre}) y esa cantidad vuelve a quedar por pagar.${p.conciliado ? " Este movimiento ya estaba conciliado." : ""}`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    setOcupado(p.id);
    const res = await fetch(`/api/pagos-personal/registrados/${p.id}`, { method: "DELETE" });
    setOcupado(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "No se pudo eliminar el pago");
      return;
    }
    toast.success("Pago eliminado");
    await cargar();
    onChanged();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.80)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !ocupado) onClose(); }}
    >
      <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-semibold">Pagos registrados</h3>
            <p className="text-xs text-gray-500 mt-0.5">{tecnicoNombre}</p>
          </div>
          <button onClick={onClose} disabled={!!ocupado}
            className="text-gray-600 hover:text-white text-lg leading-none disabled:opacity-40">✕</button>
        </div>

        {pagos === null ? (
          <p className="text-gray-600 text-sm text-center py-6">Cargando...</p>
        ) : pagos.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">No hay pagos registrados en este periodo</p>
        ) : (
          <div className="space-y-2">
            {pagos.map((p) => {
              const abierto = editando === p.id && borrador;
              return (
                <div key={p.id} className="bg-[#0d0d0d] rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 truncate">{p.proyectoNombre}</p>
                      <p className="text-[11px] text-gray-600 truncate">
                        {p.puesto}{p.fechaJornada ? ` · ${fmtDia(p.fechaJornada)}` : ""}{p.esComplemento ? " · complemento" : ""}
                      </p>
                    </div>
                    {!abierto && (
                      <div className="text-right shrink-0">
                        <p className="text-sm text-white font-semibold">{fmt(p.monto)}</p>
                        <p className="text-[11px] text-gray-500">
                          {fmtDia(p.fecha)} · {nombreMetodo(p.metodoPago)}
                        </p>
                        <p className="text-[11px] text-gray-600">
                          {nombreCuenta(p.cuentaOrigenId)}{p.referencia ? ` · ${p.referencia}` : ""}
                          {p.conciliado && <span className="ml-1 text-green-500">· conciliado</span>}
                        </p>
                      </div>
                    )}
                  </div>

                  {abierto ? (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-gray-600 block mb-1">Fecha de pago</label>
                          <input type="date" value={borrador.fecha}
                            onChange={(e) => setBorrador({ ...borrador, fecha: e.target.value })} className={INPUT} />
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-600 block mb-1">Monto</label>
                          <input type="number" min="0" step="0.01" value={borrador.monto}
                            onChange={(e) => setBorrador({ ...borrador, monto: e.target.value })} className={INPUT} />
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-600 block mb-1">Método</label>
                          <Combobox value={borrador.metodoPago} options={METODOS}
                            onChange={(v) => setBorrador({ ...borrador, metodoPago: v })} className={INPUT} />
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-600 block mb-1">Cuenta</label>
                          <Combobox value={borrador.cuentaOrigenId} options={cuentaOpts} placeholder="Sin cuenta"
                            onChange={(v) => setBorrador({ ...borrador, cuentaOrigenId: v })} className={INPUT} />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-600 block mb-1">Referencia</label>
                        <input value={borrador.referencia} placeholder="Folio, ref..."
                          onChange={(e) => setBorrador({ ...borrador, referencia: e.target.value })} className={INPUT} />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => { setEditando(null); setBorrador(null); }} disabled={ocupado === p.id}
                          className="flex-1 py-1.5 rounded-lg border border-[#333] text-gray-400 text-xs hover:text-white disabled:opacity-40">
                          Cancelar
                        </button>
                        <button onClick={() => guardar(p)} disabled={ocupado === p.id}
                          className="flex-1 py-1.5 rounded-lg bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold disabled:opacity-40">
                          {ocupado === p.id ? "Guardando..." : "Guardar cambios"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-3 mt-2">
                      <button onClick={() => eliminar(p)} disabled={!!ocupado}
                        className="text-[11px] text-gray-600 hover:text-red-400 disabled:opacity-40">
                        {ocupado === p.id ? "Eliminando..." : "Eliminar"}
                      </button>
                      <button onClick={() => { setEditando(p.id); setBorrador(aBorrador(p)); }} disabled={!!ocupado}
                        className="text-[11px] text-[#B3985B] hover:text-white disabled:opacity-40">
                        ✎ Editar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
