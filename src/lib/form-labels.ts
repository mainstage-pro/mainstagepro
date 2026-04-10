/** Etiquetas legibles para las claves del JSON de respuestas del formulario */
export const FORM_KEY_LABELS: Record<string, string> = {
  nombreEvento:       "Nombre del evento",
  fechaEvento:        "Fecha del evento",
  lugar:              "Lugar / venue",
  ciudad:             "Ciudad",
  asistentes:         "Asistentes aproximados",
  duracion:           "Duración del evento",
  horaMontaje:        "Hora de inicio de montaje",
  operacion:          "Operación técnica",
  extras:             "Notas adicionales",
  // Escenario / espacio
  tipoEspacio:        "Espacio (interior/exterior)",
  tipoEscenario:      "Tipo de escenario",
  energia:            "Energía eléctrica",
  zonasAudio:         "Zonas del evento",
  // Audio
  sistemaPa:          "Sistema de PA / audio",
  musicosEnEscena:    "Músicos en escena",
  monitores:          "Monitores / IEM",
  djBridge:           "Soporte DJ",
  backline:           "Backline",
  musica:             "Tipo de música",
  microfono:          "Micrófono para protocolo",
  karaoke:            "Karaoke",
  tipoAudio:          "Sistema de audio",
  microfonos:         "Tipos de micrófono",
  // Iluminación y video
  iluminacion:        "Iluminación",
  efectos:            "Efectos especiales",
  pantallaLed:        "Pantallas LED / videowall",
  pantalla:           "Pantalla / proyección",
  produccionVideo:    "Producción de video",
  pantallas:          "Pantallas para presentaciones",
  traduccion:         "Traducción simultánea",
  grabacion:          "Grabación del evento",
  streaming:          "Transmisión en vivo",
  branding:           "Branding en pantallas",
  // Logística
  transporte:         "Transporte del equipo",
  direccionVenue:     "Dirección del venue",
  presupuesto:        "Presupuesto aproximado",
  restriccionMontaje: "Restricciones de montaje",
  // Ponentes / Corp
  ponentes:           "Ponentes en escena",
  // Renta
  tiposEquipo:        "Categorías de equipo",
  descripcionEquipos: "Descripción de equipos",
  fechaInicio:        "Fecha inicio de renta",
  fechaFin:           "Fecha fin / devolución",
  entrega:            "Modalidad de entrega",
  direccionEntrega:   "Dirección de entrega",
  tipoEvento:         "Tipo de evento",
  tecnicoPropio:      "Técnico propio",
  // Otro
  servicios:          "Servicios requeridos",
  descripcion:        "Descripción de necesidades",
  // Referencias
  referencias:        "Referencias visuales / sonoras",
};

export const RUTA_LABELS: Record<string, string> = {
  DESCUBRIR:     "Descubrimiento",
  RIDER_DIRECTO: "Rider / Directo",
};

export const SERVICIO_LABELS: Record<string, string> = {
  PRODUCCION_TECNICA: "Producción técnica",
  RENTA:              "Renta de equipo",
  DIRECCION_TECNICA:  "Dirección técnica",
};

export const EVENTO_LABELS: Record<string, string> = {
  MUSICAL:     "Musical",
  SOCIAL:      "Social",
  EMPRESARIAL: "Empresarial",
  OTRO:        "Otro",
};
