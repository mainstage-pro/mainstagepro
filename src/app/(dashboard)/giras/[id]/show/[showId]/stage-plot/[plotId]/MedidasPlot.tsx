"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";

/**
 * Las medidas del escenario de la plaza. Van en el editor y no solo en la lista
 * porque el lienzo se dibuja a escala de estos números: si están mal, lo que se
 * acomoda encima también. Al guardar se recarga la página para que el plano se
 * redibuje con la medida nueva.
 */
export default function MedidasPlot({
  plotId,
  anchoM,
  largoM,
  alturaM,
}: {
  plotId: string;
  anchoM: number | null;
  largoM: number | null;
  alturaM: number | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [ancho, setAncho] = useState(anchoM != null ? String(anchoM) : "");
  const [largo, setLargo] = useState(largoM != null ? String(largoM) : "");
  const [altura, setAltura] = useState(alturaM != null ? String(alturaM) : "");
  const [guardando, setGuardando] = useState(false);

  const sucio =
    ancho !== (anchoM != null ? String(anchoM) : "") ||
    largo !== (largoM != null ? String(largoM) : "") ||
    altura !== (alturaM != null ? String(alturaM) : "");

  async function guardar() {
    setGuardando(true);
    const r = await fetch(`/api/show-stage-plots/${plotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anchoM: ancho, largoM: largo, alturaM: altura }),
    });
    setGuardando(false);
    if (!r.ok) {
      toast.error("No se pudieron guardar las medidas");
      return;
    }
    router.refresh();
  }

  const CAMPO =
    "w-20 bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]";

  return (
    <div className="ms-card p-3 flex flex-wrap items-end gap-3">
      <div>
        <p className="ms-section-label">Medidas de la plaza</p>
        <p className="ms-micro text-[#666] mt-0.5">
          Sin capturar, el lienzo arranca en 12 × 8 m.
        </p>
      </div>
      <label className="flex flex-col gap-1">
        <span className="ms-label">Ancho (m)</span>
        <input type="number" step="0.1" min="0" value={ancho} onChange={e => setAncho(e.target.value)} className={CAMPO} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="ms-label">Fondo (m)</span>
        <input type="number" step="0.1" min="0" value={largo} onChange={e => setLargo(e.target.value)} className={CAMPO} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="ms-label">Alto (m)</span>
        <input type="number" step="0.1" min="0" value={altura} onChange={e => setAltura(e.target.value)} className={CAMPO} />
      </label>
      <button
        type="button"
        onClick={guardar}
        disabled={!sucio || guardando}
        className="ms-btn-ghost disabled:opacity-40"
      >
        {guardando ? "Guardando…" : "Aplicar al plano"}
      </button>
    </div>
  );
}
