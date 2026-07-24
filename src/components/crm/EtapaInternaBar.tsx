"use client";

import { useSubetapas } from "@/lib/proceso/estructura-client";

// Color de la barra por etapa del pipeline (alineado con los colores de la lista de tratos).
const ETAPA_ACCENT: Record<string, { on: string; off: string; text: string }> = {
  PROSPECCION:    { on: "bg-violet-500",  off: "bg-violet-900/30",  text: "text-violet-300" },
  DESCUBRIMIENTO: { on: "bg-blue-500",    off: "bg-blue-900/30",    text: "text-blue-300" },
  OPORTUNIDAD:    { on: "bg-yellow-500",  off: "bg-yellow-900/30",  text: "text-yellow-300" },
  VENTA_CERRADA:  { on: "bg-emerald-500", off: "bg-emerald-900/30", text: "text-emerald-300" },
  VENTA_PERDIDA:  { on: "bg-red-500",     off: "bg-red-900/30",     text: "text-red-400" },
};

// Barra visual de la etapa interna: segmentos que se llenan según el avance,
// con la etiqueta de la etapa interna actual. Sin interacción (solo lectura).
export function EtapaInternaBar({
  etapa,
  etapaInterna,
  showLabel = true,
  compact = false,
}: {
  etapa: string;
  etapaInterna: string | null | undefined;
  showLabel?: boolean;
  compact?: boolean;
}) {
  const pasos = useSubetapas(etapa);
  if (pasos.length === 0) return null;

  const index = etapaInterna ? pasos.findIndex((p) => p.key === etapaInterna) : -1;
  const accent = ETAPA_ACCENT[etapa] ?? ETAPA_ACCENT.PROSPECCION;
  const actual = index >= 0 ? pasos[index] : null;

  return (
    <div className="w-full">
      <div className="flex items-center gap-1">
        {pasos.map((p, i) => (
          <span
            key={p.key}
            title={p.label}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= index ? accent.on : accent.off}`}
          />
        ))}
      </div>
      {showLabel && (
        <p className={`mt-1 leading-tight ${compact ? "text-[9px]" : "text-[10px]"} ${actual ? accent.text : "text-[#555]"}`}>
          {actual ? actual.label : "Sin sub-etapa"}
          {!compact && index >= 0 && (
            <span className="text-[#555] ml-1 tabular-nums">{index + 1}/{pasos.length}</span>
          )}
        </p>
      )}
    </div>
  );
}

// Selector para avanzar/cambiar la etapa interna. Emite el nuevo key vía onChange.
export function EtapaInternaSelect({
  etapa,
  etapaInterna,
  onChange,
  className = "",
}: {
  etapa: string;
  etapaInterna: string | null | undefined;
  onChange: (key: string) => void;
  className?: string;
}) {
  const pasos = useSubetapas(etapa);
  if (pasos.length === 0) return null;

  return (
    <select
      value={etapaInterna ?? ""}
      onChange={e => { e.stopPropagation(); onChange(e.target.value); }}
      onClick={e => e.stopPropagation()}
      title="Cambiar sub-etapa interna"
      className={`bg-transparent border-none text-[11px] focus:outline-none cursor-pointer text-[#888] hover:text-white transition-colors ${className}`}
    >
      {!etapaInterna && <option value="" disabled className="bg-[#111] text-white">Elegir sub-etapa</option>}
      {pasos.map(p => (
        <option key={p.key} value={p.key} className="bg-[#111] text-white">{p.label}</option>
      ))}
    </select>
  );
}
