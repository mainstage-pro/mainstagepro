export type NivelContador = "normal" | "atencion" | "alerta" | "critico";

export function calcularDias(inicio: Date, fin?: Date | null): number {
  const fechaFin = fin ?? new Date();
  const diff = fechaFin.getTime() - inicio.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function nivelTarea(dias: number): NivelContador {
  if (dias <= 3)  return "normal";
  if (dias <= 7)  return "atencion";
  if (dias <= 14) return "alerta";
  return "critico";
}

export function nivelTrato(dias: number): NivelContador {
  if (dias <= 7)  return "normal";
  if (dias <= 14) return "atencion";
  if (dias <= 21) return "alerta";
  return "critico";
}

export const NIVEL_STYLES: Record<NivelContador, string> = {
  normal:   "bg-[#E1F5EE] text-[#085041]",
  atencion: "bg-[#FAEEDA] text-[#633806]",
  alerta:   "bg-[#FAECE7] text-[#993C1D]",
  critico:  "bg-[#FCEBEB] text-[#791F1F]",
};

export const NIVEL_BORDER: Record<NivelContador, string> = {
  normal:   "",
  atencion: "",
  alerta:   "border-[#F0997B]",
  critico:  "border-[#F09595]",
};

export function diasTrato(trato: {
  createdAt: Date | string;
  etapa: string;
  fechaCierre?: Date | string | null;
}): { dias: number; activo: boolean } {
  const ETAPAS_CERRADAS = ["VENTA_CERRADA", "VENTA_PERDIDA"];
  const activo = !ETAPAS_CERRADAS.includes(trato.etapa);
  const fin = activo ? null : trato.fechaCierre ? new Date(trato.fechaCierre) : null;
  const dias = calcularDias(new Date(trato.createdAt), fin);
  return { dias, activo };
}
