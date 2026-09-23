"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { CostoMantenimientoModal, type CostoMantenimiento } from "@/components/CostoMantenimientoModal";
import { ESTADOS_EQUIPO, ESTADO_EQUIPO_LABEL, esRetornoAServicio } from "@/lib/equipo-estado";

// Cambio de estado de un equipo o unidad desde cualquier vista. Respeta el candado de
// costo: devolver a ACTIVO desde mantenimiento o reparación obliga a declarar el gasto.
export function CambiarEstadoEquipoModal({
  open,
  equipoId,
  unidadId = null,
  equipoLabel,
  estadoActual,
  onClose,
  onSaved,
}: {
  open: boolean;
  equipoId: string;
  unidadId?: string | null;
  equipoLabel: string;
  estadoActual: string;
  onClose: () => void;
  onSaved?: (estado: string) => void;
}) {
  const [estado, setEstado] = useState(estadoActual);
  const [saving, setSaving] = useState(false);
  const [showCosto, setShowCosto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setEstado(estadoActual); setError(null); setShowCosto(false); }
  }, [open, estadoActual]);

  const url = unidadId
    ? `/api/equipos/${equipoId}/unidades/${unidadId}`
    : `/api/equipos/${equipoId}`;

  async function guardar(costo?: CostoMantenimiento) {
    setSaving(true);
    setError(null);
    const r = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, ...(costo ? { costo } : {}) }),
    }).catch(() => null);
    setSaving(false);

    if (!r?.ok) {
      setError("No se pudo cambiar el estado");
      return;
    }
    setShowCosto(false);
    onSaved?.(estado);
    onClose();
  }

  function intentarGuardar() {
    if (estado === estadoActual) { onClose(); return; }
    if (esRetornoAServicio(estadoActual, estado)) { setShowCosto(true); return; }
    guardar();
  }

  return (
    <>
      <Modal open={open && !showCosto} onClose={onClose} title="Cambiar estado" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            <span className="text-white font-medium">{equipoLabel}</span> está{" "}
            <span className="text-white">{(ESTADO_EQUIPO_LABEL[estadoActual] ?? estadoActual).toLowerCase()}</span>.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {ESTADOS_EQUIPO.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEstado(e)}
                className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                  estado === e
                    ? "bg-[#1a1a1a] text-white border-[#B3985B]"
                    : "bg-transparent text-gray-400 border-[#333] hover:border-[#555]"
                }`}
              >
                {ESTADO_EQUIPO_LABEL[e]}
              </button>
            ))}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-[#333] text-gray-400 hover:text-white hover:border-[#555] transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              onClick={intentarGuardar}
              disabled={saving || estado === estadoActual}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[#B3985B] hover:bg-[#c9a96a] text-black transition-colors disabled:opacity-40"
            >
              {saving ? "Guardando..." : "Cambiar estado"}
            </button>
          </div>
        </div>
      </Modal>

      <CostoMantenimientoModal
        open={showCosto}
        estadoAnterior={estadoActual}
        equipoLabel={equipoLabel}
        saving={saving}
        onConfirm={(costo) => guardar(costo)}
        onCancel={() => setShowCosto(false)}
      />
    </>
  );
}
