// Etapas internas (subetapas) de cada etapa del pipeline.
// La estructura fija del proceso vive ahora en src/lib/proceso/valores.ts; este módulo
// mantiene la API histórica (etapasInternasDe, defaultEtapaInterna, etc.) sobre esos datos
// para el código que aún la consume. Los pasos y guiones editables viven en la BD
// (ProcesoSubetapa / ProcesoPaso).
import {
  ETAPAS,
  SUBETAPAS_DE_ETAPA,
  ETAPA_INTERNA_LABELS,
  type EtapaInterna as EtapaInternaKey,
} from "./proceso/valores";

export type EtapaInterna = { key: string; label: string; hint?: string };

const HINTS: Record<EtapaInternaKey, string> = {
  PRIMER_CONTACTO: "Nos presentamos, abrimos conversación y calificamos el punto del prospecto.",
  NURTURING: "Sin evento definido — se nutre con galería, inventario y proyectos.",
  FORMULARIO_ENVIADO: "Levantamiento de necesidades por formulario o por llamada.",
  PROPUESTA_EN_ELABORACION: "Recibimos la información y armamos la cotización.",
  COTIZACION_ENVIADA: "Propuesta entregada y ciclo de tres seguimientos.",
  CAMBIOS_Y_NEGOCIACION: "El cliente pidió ajustes; los pasos son alternativos.",
  CONFIRMADA: "El cliente confirmó el servicio.",
  FORMALIZADA: "Recibo, contrato y proyecto creado.",
  PERDIDA: "Cierre del trato con motivo registrado.",
};

export const ETAPAS_INTERNAS: Record<string, EtapaInterna[]> = Object.fromEntries(
  ETAPAS.map((etapa) => [
    etapa,
    SUBETAPAS_DE_ETAPA[etapa].map((key) => ({ key, label: ETAPA_INTERNA_LABELS[key], hint: HINTS[key] })),
  ])
);

export function etapasInternasDe(etapa: string): EtapaInterna[] {
  return ETAPAS_INTERNAS[etapa] ?? [];
}

export function esEtapaInternaValida(etapa: string, key: string | null | undefined): boolean {
  if (!key) return false;
  return (ETAPAS_INTERNAS[etapa] ?? []).some((e) => e.key === key);
}

export function etapaInternaLabel(etapa: string, key: string | null | undefined): string | null {
  if (!key) return null;
  return (ETAPAS_INTERNAS[etapa] ?? []).find((e) => e.key === key)?.label ?? null;
}

// Primera etapa interna de una etapa del pipeline (el punto de entrada al cambiar de etapa).
export function defaultEtapaInterna(etapa: string): string | null {
  return ETAPAS_INTERNAS[etapa]?.[0]?.key ?? null;
}

// Progreso 0-based dentro de la etapa. index = -1 cuando no hay etapa interna aún.
export function progresoEtapaInterna(etapa: string, key: string | null | undefined): { index: number; total: number } {
  const arr = ETAPAS_INTERNAS[etapa] ?? [];
  const idx = key ? arr.findIndex((e) => e.key === key) : -1;
  return { index: idx, total: arr.length };
}
