"use client";

import type { EstadoAutoguardado } from "@/hooks/useAutoguardadoCanales";

const TEXTO: Record<EstadoAutoguardado, string> = {
  limpio: "Se guarda solo",
  pendiente: "Cambios sin guardar…",
  guardando: "Guardando…",
  guardado: "Guardado ✓",
  error: "No se pudo guardar",
};

const COLOR: Record<EstadoAutoguardado, string> = {
  limpio: "text-[#6b7280]",
  pendiente: "text-[#6b7280]",
  guardando: "text-[#B3985B]",
  guardado: "text-emerald-400",
  error: "text-red-400",
};

export default function EstadoGuardado({
  estado,
  onReintentar,
}: {
  estado: EstadoAutoguardado;
  onReintentar: () => void;
}) {
  return (
    <span className="flex items-center gap-2 text-xs">
      <span className={COLOR[estado]}>{TEXTO[estado]}</span>
      {estado === "error" && (
        <button onClick={onReintentar} className="ms-link-gold underline">
          Reintentar
        </button>
      )}
    </span>
  );
}
