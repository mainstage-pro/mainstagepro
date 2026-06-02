"use client";

import { calcularDias, nivelTarea, nivelTrato, NIVEL_STYLES } from "@/lib/contadores";

interface BadgeDiasProps {
  inicio: Date | string;
  fin?: Date | string | null;
  tipo: "tarea" | "trato";
  cerrado?: boolean;
  labelCerrado?: string;
  urgenciaClassName?: string;
}

export function BadgeDias({ inicio, fin, tipo, cerrado, labelCerrado, urgenciaClassName }: BadgeDiasProps) {
  const dias = calcularDias(new Date(inicio), fin ? new Date(fin) : null);
  const nivel = tipo === "tarea" ? nivelTarea(dias) : nivelTrato(dias);
  const style = cerrado ? "bg-[#1e1e1e] text-[#555]" : (urgenciaClassName ?? NIVEL_STYLES[nivel]);

  const label = cerrado
    ? `${dias}d${labelCerrado ? ` (${labelCerrado})` : ""}`
    : `${dias}d`;

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap flex-shrink-0 ${style}`}>
      {label}
    </span>
  );
}
