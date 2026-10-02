/**
 * El archivero del proyecto: lo que llega de afuera y hay que tener a mano el día
 * del evento. No son los documentos que emite Mainstage (esos los genera
 * src/lib/proyecto-documentos.ts) sino el papel ajeno: el rider del artista, el
 * contrato, el plano del salón, la input list del ingeniero de casa.
 *
 * Las llaves legacy (RENDER, PLOT_PATCH, INPUT_LIST, RIDER, ITINERARIO, DOCUMENTO,
 * OTRO) se conservan porque ya hay filas en producción guardadas con ellas.
 */

export const TIPOS_ARCHIVO_PROYECTO = [
  "RIDER",
  "CONTRATO",
  "PLANO",
  "PLOT_PATCH",
  "INPUT_LIST",
  "RENDER",
  "ITINERARIO",
  "PERMISO",
  "OTRO",
] as const;

export type TipoArchivoProyecto = (typeof TIPOS_ARCHIVO_PROYECTO)[number];

export const TIPO_ARCHIVO_PROYECTO_LABEL: Record<string, string> = {
  RIDER: "Rider del artista",
  CONTRATO: "Contrato",
  PLANO: "Plano del lugar",
  PLOT_PATCH: "Plot / patch",
  INPUT_LIST: "Input list recibida",
  RENDER: "Render",
  ITINERARIO: "Itinerario / minuto a minuto",
  PERMISO: "Permiso o póliza",
  DOCUMENTO: "Documento",
  OTRO: "Otro",
};

export const TIPO_ARCHIVO_PROYECTO_COLOR: Record<string, string> = {
  RIDER: "ms-badge-gold",
  CONTRATO: "ms-badge-blue",
  PLANO: "ms-badge-sky",
  PLOT_PATCH: "ms-badge-purple",
  INPUT_LIST: "ms-badge-emerald",
  RENDER: "ms-badge-pink",
  ITINERARIO: "ms-badge-amber",
  PERMISO: "ms-badge-red",
  DOCUMENTO: "ms-badge-gray",
  OTRO: "ms-badge-gray",
};

/// Peso del archivo como se lee en pantalla. Blob lo reporta en bytes; nadie lee "4823910".
export function fmtTamanoArchivo(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
