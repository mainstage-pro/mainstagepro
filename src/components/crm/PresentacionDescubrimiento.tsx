"use client";

import { useEffect, useState, useCallback } from "react";
import { Clapperboard } from "lucide-react";

interface PV {
  id: string;
  titulo: string;
  estado: string;
  createdAt: string;
}

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  BORRADOR: { label: "Borrador", cls: "bg-gray-800/60 text-gray-400 border-gray-700/40" },
  GENERADA: { label: "Generada", cls: "bg-blue-900/20 text-blue-400 border-blue-700/40" },
  ENVIADA:  { label: "Enviada",  cls: "bg-emerald-900/20 text-emerald-400 border-emerald-700/40" },
};

export default function PresentacionDescubrimiento({ tratoId }: { tratoId: string }) {
  const [items, setItems] = useState<PV[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/presentaciones-venta?tratoId=${tratoId}`);
      const data = await res.json();
      setItems(data.presentaciones || []);
    } catch { /* noop */ }
    setLoading(false);
  }, [tratoId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function marcarEnviada(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/presentaciones-venta/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "ENVIADA" }),
      });
      await cargar();
    } catch { /* noop */ }
    setBusy(null);
  }

  const volver = `/crm/tratos/${tratoId}?panel=descubrimiento`;
  const crearHref = `/ventas/presentaciones/nueva?tratoId=${tratoId}&volver=${encodeURIComponent(volver)}`;

  return (
    <div className="bg-[#0a1420] border border-blue-800/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400"><Clapperboard strokeWidth={1.75} className="w-5 h-5" /></div>
          <div>
            <p className="text-white font-bold text-base">Presentación de venta</p>
            <p className="text-blue-400/70 text-xs mt-0.5">Genera y envía una presentación para el descubrimiento</p>
          </div>
        </div>
        <a
          href={crearHref}
          className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold bg-[#B3985B] text-black hover:opacity-90 transition-opacity"
        >
          + Crear con Claude
        </a>
      </div>

      {loading ? (
        <p className="text-gray-500 text-xs">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-xs">
          Aún no hay presentaciones para este prospecto. Crea una para compartirla con el cliente.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((pv) => {
            const badge = ESTADO_BADGE[pv.estado] ?? ESTADO_BADGE.BORRADOR;
            return (
              <div
                key={pv.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]"
              >
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{pv.titulo}</p>
                  <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full border ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/api/presentaciones-venta/${pv.id}/html`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a1a1a] text-gray-300 hover:text-white transition-colors"
                  >
                    Ver
                  </a>
                  {pv.estado !== "ENVIADA" && (
                    <button
                      onClick={() => marcarEnviada(pv.id)}
                      disabled={busy === pv.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-900/30 text-emerald-400 border border-emerald-700/40 hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
                    >
                      {busy === pv.id ? "…" : "Marcar enviada"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
