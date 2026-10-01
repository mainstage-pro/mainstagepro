import type { TipoDocumento } from "@/lib/proyecto-documentos";
import type { PdfProyecto } from "./render";
import { generarFichaOperativa } from "./ficha-operativa";
import { generarListaCarga } from "./lista-carga";
import { generarInfoTecnicos } from "./info-tecnicos";
import { generarHojaEntrega } from "./hoja-entrega";

export type { PdfProyecto } from "./render";
export { respuestaPdf } from "./render";

/**
 * Los documentos del proyecto que se pueden ver en línea.
 *
 * La llave es el segmento de URL del enlace público (/doc/{token}/{slug}) y a
 * la vez el identificador que usa la tarjeta de Documentos. `tipo` enlaza con
 * los candados de `proyecto-documentos.ts` para que el enlace público aplique
 * exactamente el mismo criterio que la descarga.
 */
export const DOCUMENTOS_PDF = {
  "ficha-operativa": {
    tipo: "FICHA_OPERATIVA" as TipoDocumento,
    label: "Ficha operativa",
    generar: generarFichaOperativa,
  },
  "lista-carga": {
    tipo: "CONTROL_CARGA" as TipoDocumento,
    label: "Lista de carga",
    generar: generarListaCarga,
  },
  "info-tecnicos": {
    tipo: "BRIEF_TECNICO" as TipoDocumento,
    label: "Info para técnicos",
    generar: generarInfoTecnicos,
  },
  "hoja-entrega": {
    tipo: "HOJA_ENTREGA" as TipoDocumento,
    label: "Hoja de entrega",
    generar: generarHojaEntrega,
  },
} satisfies Record<string, { tipo: TipoDocumento; label: string; generar: (id: string) => Promise<PdfProyecto | null> }>;

export type SlugDocumento = keyof typeof DOCUMENTOS_PDF;

export function esSlugDocumento(slug: string): slug is SlugDocumento {
  return slug in DOCUMENTOS_PDF;
}
