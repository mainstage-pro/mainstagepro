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

/**
 * Resuelve el nombre del estado (ej. Querétaro, CDMX, Guanajuato, etc.)
 * a partir de la información disponible de un venue, lugar o dirección de evento.
 */
export function resolverEstadoEvento(opts: {
  estado?: string | null;
  ciudad?: string | null;
  lugar?: string | null;
  direccion?: string | null;
}): string {
  const normalizar = (s?: string | null) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const cEstado = normalizar(opts.estado);
  const cCiudad = normalizar(opts.ciudad);
  const cLugar = normalizar(opts.lugar);
  const cDireccion = normalizar(opts.direccion);
  const fullText = `${cEstado} ${cCiudad} ${cLugar} ${cDireccion}`;

  // CDMX / Ciudad de México
  if (/\b(cdmx|df|distrito federal|ciudad de mexico|mexico d\.?f\.?)\b/.test(fullText)) {
    return "CDMX";
  }

  // Querétaro
  if (/\b(queretaro|qro|santiago de queretaro|juriquilla|el marques|corregidora|san juan del rio|tequisquiapan|bernal|colon|huimilpan)\b/.test(fullText)) {
    return "Querétaro";
  }

  // Guanajuato
  if (/\b(guanajuato|gto|san miguel de allende|sma|leon|celaya|irapuato|silao|dolores hidalgo)\b/.test(fullText)) {
    return "Guanajuato";
  }

  // Jalisco
  if (/\b(jalisco|jal|guadalajara|gdl|zapopan|tlaquepaque|tonala|puerto vallarta|chapala|ajijic)\b/.test(fullText)) {
    return "Jalisco";
  }

  // Nuevo León
  if (/\b(nuevo leon|nl|monterrey|mty|san pedro garza|san nicolas|guadalupe|santa catarina)\b/.test(fullText)) {
    return "Nuevo León";
  }

  // Estado de México
  if (/\b(estado de mexico|edomex|edo\.? mex\.?|toluca|metepec|naucalpan|tlalnepantla|huixquilucan|valle de bravo|atizapan|cuautitlan)\b/.test(fullText)) {
    return "Estado de México";
  }

  // Puebla
  if (/\b(puebla|pue|cholula|atlixco)\b/.test(fullText)) {
    return "Puebla";
  }

  // San Luis Potosí
  if (/\b(san luis potosi|slp)\b/.test(fullText)) {
    return "San Luis Potosí";
  }

  // Hidalgo
  if (/\b(hidalgo|hgo|pachuca|tulancingo|tula|huasca)\b/.test(fullText)) {
    return "Hidalgo";
  }

  // Michoacán
  if (/\b(michoacan|mich|morelia|patzcuaro|urapan)\b/.test(fullText)) {
    return "Michoacán";
  }

  // Morelos
  if (/\b(morelos|mor|cuernavaca|tepoztlan|yautepec|oaxtepec)\b/.test(fullText)) {
    return "Morelos";
  }

  // Aguascalientes
  if (/\b(aguascalientes|ags)\b/.test(fullText)) {
    return "Aguascalientes";
  }

  // Yucatán
  if (/\b(yucatan|yuc|merida|valladolid)\b/.test(fullText)) {
    return "Yucatán";
  }

  // Quintana Roo
  if (/\b(quintana roo|q\.? roo|cancun|playa del carmen|tulum|cozumel|riviera maya)\b/.test(fullText)) {
    return "Quintana Roo";
  }

  // Coahuila
  if (/\b(coahuila|saltillo|torreon)\b/.test(fullText)) {
    return "Coahuila";
  }

  // Veracruz
  if (/\b(veracruz|ver|xalapa|boca del rio|orizaba|cordoba)\b/.test(fullText)) {
    return "Veracruz";
  }

  // Oaxaca
  if (/\b(oaxaca|oax|huatulco|puerto escondido)\b/.test(fullText)) {
    return "Oaxaca";
  }

  // Guerrero
  if (/\b(guerrero|gro|acapulco|ixtapa|zihuatanejo)\b/.test(fullText)) {
    return "Guerrero";
  }

  if (opts.estado && opts.estado.trim()) {
    return opts.estado.trim();
  }

  return "Querétaro";
}

