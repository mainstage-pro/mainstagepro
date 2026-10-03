"use client";

/// Traer la lista de canales de otra versión del mismo artista. El rider de
/// festival y el de tour casi nunca comparten el equipo, pero sí los canales: el
/// baterista se microfonea igual en los dos. Reemplaza la lista completa, así que
/// se confirma antes.

import { useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { CONTEXTO_RIDER_LABEL } from "@/lib/giras";

export interface RiderOrigen {
  id: string;
  nombre: string;
  version: number;
  contexto: string;
  canales: number;
}

interface Props {
  riderId: string;
  tipo: "INPUT" | "OUTPUT";
  origenes: RiderOrigen[];
  /// Cuántos renglones hay hoy: decide el tono de la confirmación.
  actuales: number;
  /// Recarga entera, no router.refresh(): la lista vive en estado local con
  /// autoguardado pendiente que volvería a escribir los renglones viejos.
  onImportado: () => void;
}

export default function ImportarCanales({ riderId, tipo, origenes, actuales, onImportado }: Props) {
  const toast = useToast();
  const confirm = useConfirm();

  const [desdeId, setDesdeId] = useState(origenes[0]?.id ?? "");
  const [trabajando, setTrabajando] = useState(false);

  if (origenes.length === 0) return null;

  const etiqueta = tipo === "INPUT" ? "input list" : "output list";

  async function importar() {
    const origen = origenes.find((o) => o.id === desdeId);
    if (!origen) return;
    const ok = await confirm({
      message:
        actuales > 0
          ? `La ${etiqueta} de esta versión tiene ${actuales} ${
              actuales === 1 ? "renglón" : "renglones"
            } y se reemplaza por los ${origen.canales} de «${origen.nombre}». ¿Seguir?`
          : `¿Traer los ${origen.canales} renglones de «${origen.nombre}»?`,
      confirmText: "Traer la lista",
      danger: actuales > 0,
    });
    if (!ok) return;

    setTrabajando(true);
    try {
      const res = await fetch(`/api/artista-riders/${riderId}/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desdeRiderId: desdeId, tipo }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo importar la lista");
        return;
      }
      toast.success(`Lista traída de «${d.desde}»`);
      onImportado();
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="ms-filter-select"
        value={desdeId}
        onChange={(e) => setDesdeId(e.target.value)}
        disabled={trabajando}
      >
        {origenes.map((o) => (
          <option key={o.id} value={o.id}>
            v{o.version} · {CONTEXTO_RIDER_LABEL[o.contexto] ?? o.contexto} — {o.canales} renglones
          </option>
        ))}
      </select>
      <button onClick={() => void importar()} disabled={trabajando} className="ms-btn-secondary disabled:opacity-50">
        {trabajando ? "Trayendo…" : "Traer de otra versión"}
      </button>
    </div>
  );
}
