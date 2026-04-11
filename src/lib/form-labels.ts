/** Etiquetas legibles para las claves del JSON de respuestas del formulario */
export const FORM_KEY_LABELS: Record<string, string> = {
  nombreEvento:          "Nombre del evento",
  fechaEvento:           "Fecha del evento",
  horaEvento:            "Hora del evento",
  lugar:                 "Lugar / venue",
  ciudad:                "Ciudad",
  asistentes:            "Asistentes aproximados",
  duracion:              "Duración del evento",
  tipoEspacio:           "Espacio (interior/exterior)",
  horaMontaje:           "Hora de inicio de montaje",
  operacion:             "Operación técnica",
  extras:                "Notas adicionales",
  // Escenario / espacio
  tipoEscenario:         "Tipo de escenario",
  energia:               "Energía eléctrica",
  zonasAudio:            "Zonas del evento",
  // Audio
  sistemaPa:             "Sistema de PA / audio",
  musicosEnEscena:       "Músicos en escena",
  monitores:             "Monitores / IEM",
  djBridge:              "Soporte DJ",
  backline:              "Backline",
  musica:                "Tipo de música",
  microfono:             "Micrófono para protocolo",
  karaoke:               "Karaoke",
  tipoAudio:             "Sistema de audio",
  microfonos:            "Tipos de micrófono",
  // Iluminación y video
  iluminacion:           "Iluminación",
  efectos:               "Efectos especiales",
  pantallaLed:           "Pantallas LED / videowall",
  pantalla:              "Pantalla / proyección",
  produccionVideo:       "Producción de video",
  pantallas:             "Pantallas para presentaciones",
  traduccion:            "Traducción simultánea",
  grabacion:             "Grabación del evento",
  streaming:             "Transmisión en vivo",
  branding:              "Branding en pantallas",
  // Logística
  transporte:            "Transporte del equipo",
  direccionVenue:        "Dirección del venue",
  presupuesto:           "Presupuesto aproximado",
  restriccionMontaje:    "Restricciones de montaje",
  // Ponentes / Corp
  ponentes:              "Ponentes en escena",
  // Renta
  tiposEquipo:           "Categorías de equipo",
  descripcionEquipos:    "Descripción de equipos",
  nivelServicio:         "Nivel de servicio",
  tieneRider:            "¿Tiene rider técnico?",
  entrega:               "Modalidad de entrega",
  fechaEntrega:          "Fecha de entrega del equipo",
  horaEntrega:           "Hora de entrega",
  fechaDevolucion:       "Fecha de devolución",
  horaDevolucion:        "Hora de recolección",
  direccionEntrega:      "Dirección de entrega",
  fechaInicio:           "Fecha inicio de renta",
  fechaFin:              "Fecha fin / devolución",
  tecnicoPropio:         "Técnico propio",
  // Otro
  tipoEvento:            "Tipo de evento",
  servicios:             "Servicios requeridos",
  descripcion:           "Descripción de necesidades",
  referencias:           "Referencias visuales / sonoras",
};

export const RUTA_LABELS: Record<string, string> = {
  DESCUBRIR:     "Descubrimiento",
  RIDER_DIRECTO: "Rider / Directo",
};

export const SERVICIO_LABELS: Record<string, string> = {
  PRODUCCION_TECNICA: "Producción técnica",
  RENTA:              "Renta de equipo",
  DIRECCION_TECNICA:  "Dirección técnica",
  POR_DESCUBRIR:      "Por descubrir",
};

export const EVENTO_LABELS: Record<string, string> = {
  MUSICAL:     "Musical",
  SOCIAL:      "Social",
  EMPRESARIAL: "Empresarial",
  OTRO:        "Otro",
};

// ─── Constantes específicas de Renta ─────────────────────────────────────────

export const RENTA_NIVEL_SERVICIO = [
  { id: "SOLO_RENTA",      label: "Solo renta",           desc: "Cliente recoge, instala y opera" },
  { id: "RENTA_ENTREGA",   label: "Renta + entrega",      desc: "Llevamos y recogemos el equipo" },
  { id: "RENTA_MONTAJE",   label: "Renta + montaje",      desc: "Instalamos en venue, cliente opera" },
  { id: "RENTA_FULL",      label: "Renta + operación",    desc: "Instalamos + técnico operador incluido" },
] as const;

export const RENTA_MODALIDAD_ENTREGA = [
  { id: "RECOGE_BODEGA",   label: "Recoge en bodega",     desc: "Querétaro, Qro." },
  { id: "ENTREGA_BODEGA",  label: "Llevamos a su bodega", desc: "A su almacén o local" },
  { id: "ENTREGA_VENUE",   label: "Llevamos al venue",    desc: "Directo al lugar del evento" },
] as const;

export const RENTA_CATEGORIAS_EQUIPO = [
  { id: "AUDIO_PA",       label: "Audio PA (bafles)" },
  { id: "SUBWOOFERS",     label: "Subwoofers" },
  { id: "MONITORES",      label: "Monitores" },
  { id: "CONSOLA",        label: "Consola de audio" },
  { id: "MICROFONOS",     label: "Micrófonos" },
  { id: "ILUMINACION",    label: "Iluminación" },
  { id: "PANTALLAS_LED",  label: "Pantallas LED" },
  { id: "PROYECTOR",      label: "Proyector + pantalla" },
  { id: "DJ_EQUIPO",      label: "Equipo DJ" },
  { id: "CABLES_ACC",     label: "Cables y accesorios" },
] as const;
