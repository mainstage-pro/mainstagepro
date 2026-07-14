"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";

export type CostoMantenimiento =
  | { hubo: false }
  | { hubo: true; monto: number; descripcion: string; proveedorId: string | null };

type Proveedor = { id: string; nombre: string; empresa?: string | null };

// Candado que se muestra al devolver un equipo/unidad a servicio desde
// mantenimiento o reparación. Obliga a declarar si hubo costo antes de continuar.
export function CostoMantenimientoModal({
  open,
  estadoAnterior,
  equipoLabel,
  saving = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  estadoAnterior: string; // EN_MANTENIMIENTO | EN_REPARACION
  equipoLabel: string;
  saving?: boolean;
  onConfirm: (costo: CostoMantenimiento) => void;
  onCancel: () => void;
}) {
  const [hubo, setHubo] = useState<null | boolean>(null);
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/proveedores", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.proveedores) setProveedores(d.proveedores); })
      .catch(() => {});
  }, [open]);

  const trabajo = estadoAnterior === "EN_REPARACION" ? "reparación" : "mantenimiento";
  const montoNum = parseFloat(monto);
  const puedeGuardarConCosto = Number.isFinite(montoNum) && montoNum > 0 && descripcion.trim().length > 0;

  function reset() {
    setHubo(null);
    setMonto("");
    setDescripcion("");
    setProveedorId("");
  }

  function cerrar() {
    reset();
    onCancel();
  }

  function confirmarSinCosto() {
    onConfirm({ hubo: false });
    reset();
  }

  function confirmarConCosto() {
    if (!puedeGuardarConCosto) return;
    onConfirm({ hubo: true, monto: montoNum, descripcion: descripcion.trim(), proveedorId: proveedorId || null });
    reset();
  }

  const inputCls =
    "w-full bg-[#0d0d0d] border border-[#333] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]";

  return (
    <Modal open={open} onClose={cerrar} title={`Devolver a servicio · costo de ${trabajo}`} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-gray-400 text-sm">
          <span className="text-white font-medium">{equipoLabel}</span> vuelve a estar activo.
          ¿Hubo un costo de {trabajo}?
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setHubo(false)}
            className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
              hubo === false
                ? "bg-[#1a1a1a] text-white border-[#B3985B]"
                : "bg-transparent text-gray-400 border-[#333] hover:border-[#555]"
            }`}
          >
            Sin costo
          </button>
          <button
            type="button"
            onClick={() => setHubo(true)}
            className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
              hubo === true
                ? "bg-[#1a1a1a] text-white border-[#B3985B]"
                : "bg-transparent text-gray-400 border-[#333] hover:border-[#555]"
            }`}
          >
            Sí hubo costo
          </button>
        </div>

        {hubo === true && (
          <div className="space-y-3 border-t border-[#1a1a1a] pt-3">
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Monto *</label>
              <input
                type="number"
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Descripción del trabajo *</label>
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Piezas cambiadas, servicio realizado..."
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Proveedor (opcional)</label>
              <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className={inputCls}>
                <option value="">— Sin proveedor —</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                    {p.empresa ? ` · ${p.empresa}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-gray-600">
              Se creará una cuenta por pagar en la categoría «Mantenimiento de equipos».
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={cerrar}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-[#333] text-gray-400 hover:text-white hover:border-[#555] transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          {hubo === true ? (
            <button
              onClick={confirmarConCosto}
              disabled={!puedeGuardarConCosto || saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[#B3985B] hover:bg-[#c9a96a] text-black transition-colors disabled:opacity-40"
            >
              {saving ? "Guardando..." : "Registrar y devolver"}
            </button>
          ) : (
            <button
              onClick={confirmarSinCosto}
              disabled={hubo !== false || saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[#B3985B] hover:bg-[#c9a96a] text-black transition-colors disabled:opacity-40"
            >
              {saving ? "Guardando..." : "Devolver a servicio"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
