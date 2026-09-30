export const VENUE_TIPOS = [
  { value: "SALON", label: "Salón de eventos" },
  { value: "HACIENDA", label: "Hacienda" },
  { value: "JARDIN", label: "Jardín / finca" },
  { value: "VINEDO", label: "Viñedo" },
  { value: "HOTEL", label: "Hotel" },
  { value: "FORO", label: "Foro" },
  { value: "TEATRO", label: "Teatro" },
  { value: "AUDITORIO", label: "Auditorio" },
  { value: "MUSEO", label: "Museo" },
  { value: "HISTORICO", label: "Recinto histórico" },
  { value: "CLUB", label: "Club" },
  { value: "CLUB_GOLF", label: "Club de golf" },
  { value: "BAR", label: "Bar / antro" },
  { value: "RESTAURANTE", label: "Restaurante" },
  { value: "COLEGIO", label: "Colegio / universidad" },
  { value: "PARQUE", label: "Parque" },
  { value: "PLAZA", label: "Plaza comercial" },
  { value: "PLAZA_TOROS", label: "Plaza de toros" },
  { value: "ESTADIO", label: "Estadio" },
  { value: "GALERIA", label: "Galería" },
  { value: "RANCHO", label: "Rancho" },
  { value: "ESPACIO_PUBLICO", label: "Espacio público" },
  { value: "OTRO", label: "Otro" },
] as const;

export const VENUE_TIPO_LABEL: Record<string, string> = Object.fromEntries(
  VENUE_TIPOS.map(t => [t.value, t.label])
);

export function etiquetaTipoVenue(tipo: string | null | undefined) {
  return tipo ? (VENUE_TIPO_LABEL[tipo] ?? tipo) : "Sin clasificar";
}
