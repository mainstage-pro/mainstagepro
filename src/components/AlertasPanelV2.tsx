"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Alerta {
  tipo: string;
  prioridad: "ALTA" | "MEDIA" | "BAJA";
  titulo: string;
  detalle: string;
  href: string;
  icono: string;
}

const PRIORIDAD_COLORS: Record<string, string> = {
  ALTA:  "border-red-800/60 bg-red-900/10",
  MEDIA: "border-yellow-800/60 bg-yellow-900/10",
  BAJA:  "border-[#1e1e1e] bg-[#0d0d0d]",
};
const PRIORIDAD_DOT: Record<string, string> = {
  ALTA:  "bg-red-500",
  MEDIA: "bg-yellow-500",
  BAJA:  "bg-gray-600",
};
const PRIORIDAD_BADGE: Record<string, string> = {
  ALTA:  "text-red-400 bg-red-900/20",
  MEDIA: "text-yellow-400 bg-yellow-900/20",
  BAJA:  "text-gray-500 bg-gray-800/50",
};

export default function AlertasPanelV2() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState<"TODAS" | "ALTA" | "MEDIA" | "BAJA">("TODAS");

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/alertas");
      const d = await res.json();
      setAlertas(d.alertas ?? []);
    } catch { /* silencioso */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const visibles = filtro === "TODAS" ? alertas : alertas.filter(a => a.prioridad === filtro);
  const total = alertas.length;
  const altas = alertas.filter(a => a.prioridad === "ALTA").length;

  if (loading) return (
    <div className="w-9 h-9 bg-[#1a1a1a] border border-[#333] rounded-lg animate-pulse" />
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${total > 0 ? "border-red-800/60 bg-red-900/10 hover:bg-red-900/20" : "border-[#333] bg-[#1a1a1a] hover:bg-[#222]"}`}
        title={`${total} alerta${total !== 1 ? "s" : ""}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={total > 0 ? "text-red-400" : "text-gray-500"}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {total > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-bold flex items-center justify-center ${altas > 0 ? "bg-red-600 text-white" : "bg-yellow-600 text-black"}`}>
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-10 z-50 w-[380px] bg-[#0f0f0f] border border-[#222] rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">Alertas proactivas</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{total} pendiente{total !== 1 ? "s" : ""}{altas > 0 ? ` · ${altas} alta prioridad` : ""}</p>
              </div>
              <button onClick={cargar} className="text-gray-600 hover:text-gray-400 text-xs transition-colors">↻ Actualizar</button>
            </div>

            {/* Filtros */}
            {total > 0 && (
              <div className="flex gap-1 px-3 py-2 border-b border-[#1e1e1e]">
                {(["TODAS", "ALTA", "MEDIA", "BAJA"] as const).map(f => (
                  <button key={f} onClick={() => setFiltro(f)}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors ${filtro === f ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-white"}`}>
                    {f === "TODAS" ? `Todas (${total})` : `${f} (${alertas.filter(a => a.prioridad === f).length})`}
                  </button>
                ))}
              </div>
            )}

            {/* Lista */}
            <div className="max-h-[480px] overflow-y-auto divide-y divide-[#111]">
              {visibles.length === 0 ? (
                <div className="text-center py-8">
                  {total === 0 ? (
                    <>
                      <p className="text-2xl mb-2">✅</p>
                      <p className="text-gray-500 text-sm font-medium">Todo al día</p>
                      <p className="text-gray-700 text-xs mt-1">No hay alertas pendientes</p>
                    </>
                  ) : (
                    <p className="text-gray-600 text-sm">Sin alertas de este nivel</p>
                  )}
                </div>
              ) : visibles.map((a, i) => (
                <Link key={i} href={a.href} onClick={() => setOpen(false)}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-[#151515] transition-colors border-l-2 ${a.prioridad === "ALTA" ? "border-red-600" : a.prioridad === "MEDIA" ? "border-yellow-600" : "border-transparent"}`}>
                  <span className="text-base shrink-0 mt-0.5">{a.icono}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium leading-snug truncate">{a.titulo}</p>
                    <p className="text-gray-500 text-[10px] mt-0.5 truncate">{a.detalle}</p>
                  </div>
                  <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${PRIORIDAD_BADGE[a.prioridad]}`}>
                    {a.prioridad}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
