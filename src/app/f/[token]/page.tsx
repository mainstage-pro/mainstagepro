"use client";

import { useEffect, useState, use } from "react";
import { SelectorEquiposInventario, type SeleccionEquipos } from '@/components/SelectorEquiposInventario';

// ─── Tipos de preguntas ───────────────────────────────────────────────────────
type PreguntaTipo = "text" | "number" | "date" | "select" | "radio" | "checkbox" | "textarea";

interface Pregunta {
  id: string;
  label: string;
  tipo: PreguntaTipo;
  opciones?: string[];
  placeholder?: string;
  requerida?: boolean;
  hint?: string;
}

interface Seccion {
  titulo: string;
  preguntas: Pregunta[];
}

// ─── Cuestionarios por tipo de servicio + evento ──────────────────────────────

const FORM_PRODUCCION_MUSICAL: Seccion[] = [
  {
    titulo: "El evento",
    preguntas: [
      { id: "nombreEvento",  label: "Nombre del evento / artista principal", tipo: "text", placeholder: "Ej: Festival Verano 2026, Concierto López...", requerida: true },
      { id: "fechaEvento",   label: "Fecha del evento", tipo: "date", requerida: true },
      { id: "lugar",         label: "Ciudad y nombre del venue", tipo: "text", placeholder: "Ej: Querétaro · Foro Independencia", requerida: true },
      { id: "asistentes",    label: "Asistentes esperados (aforo)", tipo: "number", placeholder: "Ej: 500", requerida: true },
      { id: "duracion",      label: "Duración del show (horas de producción)", tipo: "text", placeholder: "Ej: 6 horas, 2 días", requerida: true },
    ],
  },
  {
    titulo: "El escenario",
    preguntas: [
      { id: "tipoEspacio", label: "¿El evento es interior o exterior?", tipo: "radio", opciones: ["Interior", "Exterior", "Ambos / Carpa"] },
      { id: "tipoEscenario", label: "¿Qué tipo de escenario tienen?", tipo: "radio", opciones: ["Proscenio / tablado frontal", "Arena (360°)", "Al aire libre sin estructura", "Carpa / domo", "Todavía no definido"] },
      { id: "energia", label: "¿El venue cuenta con energía suficiente?", tipo: "radio", opciones: ["Sí, el venue tiene energía", "Se requiere generador (tenemos propio)", "No sabemos / por confirmar"] },
    ],
  },
  {
    titulo: "Audio",
    preguntas: [
      { id: "sistemaPa",      label: "¿Necesitan sistema de PA / sonido principal?", tipo: "radio", opciones: ["Sí", "No", "Por definir"] },
      { id: "musicosEnEscena", label: "¿Cuántos músicos / instrumentos en escena?", tipo: "number", placeholder: "0 si es solo DJ" },
      { id: "monitores",      label: "¿Se requieren monitores de escenario o IEM?", tipo: "radio", opciones: ["Sí, monitores de piso", "Sí, IEM (in-ear)", "Ambos", "No / por definir"] },
      { id: "djBridge",       label: "¿Necesitan soporte DJ o bridge de DJ?", tipo: "radio", opciones: ["Sí", "No", "Por definir"] },
      { id: "backline",       label: "¿Requieren backline (amps, batería, teclados)?", tipo: "radio", opciones: ["Sí, backline completo", "Sí, parcial", "No, ellos traen su equipo", "Por definir"] },
    ],
  },
  {
    titulo: "Iluminación y Video",
    preguntas: [
      { id: "iluminacion",  label: "¿Se requiere iluminación artística / show?", tipo: "radio", opciones: ["Básica", "Intermedia", "Show profesional completo", "No por ahora", "Por definir"] },
      { id: "pantallaLed",  label: "¿Se requieren pantallas LED o videowall?", tipo: "radio", opciones: ["Sí", "No", "Por definir"] },
      { id: "produccionVideo", label: "¿Se requiere producción de video (cámaras, IMAG)?", tipo: "radio", opciones: ["Sí", "No", "Por definir"] },
    ],
  },
  {
    titulo: "Logística",
    preguntas: [
      { id: "transporte",   label: "¿Requieren transporte del equipo desde Querétaro?", tipo: "radio", opciones: ["Sí", "No, lo recogemos en bodega", "Por definir"] },
      { id: "direccionVenue", label: "Dirección exacta del venue (para calcular traslado)", tipo: "text", placeholder: "Calle, colonia, ciudad, CP" },
      { id: "restriccionMontaje", label: "¿Hay restricciones de horario para montaje?", tipo: "text", placeholder: "Ej: Solo de 8am-2pm, no antes del día anterior" },
    ],
  },
  {
    titulo: "Referencias y extras",
    preguntas: [
      { id: "referencias",  label: "Referencias visuales o de sonido (links, descripción)", tipo: "textarea", placeholder: "Links de YouTube, fotos de referencia, artistas de referencia sonora..." },
      { id: "presupuesto",  label: "Presupuesto aproximado (opcional)", tipo: "number", placeholder: "En pesos mexicanos" },
      { id: "extras",       label: "¿Algo más que debamos saber?", tipo: "textarea", placeholder: "Detalles especiales, restricciones, peticiones..." },
    ],
  },
];

const FORM_PRODUCCION_SOCIAL: Seccion[] = [
  {
    titulo: "El evento",
    preguntas: [
      { id: "nombreEvento",  label: "Nombre y tipo de evento", tipo: "text", placeholder: "Ej: Boda García-López, XV años Sofía, Cóctel corporativo...", requerida: true },
      { id: "fechaEvento",   label: "Fecha del evento", tipo: "date", requerida: true },
      { id: "lugar",         label: "Ciudad y nombre del venue", tipo: "text", placeholder: "Ej: Querétaro · Hacienda San Gabriel", requerida: true },
      { id: "asistentes",    label: "Número de invitados esperados", tipo: "number", placeholder: "Ej: 200", requerida: true },
      { id: "duracion",      label: "Duración del evento (horas)", tipo: "text", placeholder: "Ej: 6 horas, de 7pm a 1am" },
    ],
  },
  {
    titulo: "El espacio",
    preguntas: [
      { id: "tipoEspacio",  label: "¿El evento es interior o exterior?", tipo: "radio", opciones: ["Interior", "Exterior", "Ambos"] },
      { id: "zonasAudio",   label: "¿Cuántas zonas o áreas tiene el evento?", tipo: "radio", opciones: ["Solo una (salón principal)", "Dos (salón + terraza / jardín)", "Tres o más zonas"] },
      { id: "energia",      label: "¿El venue cuenta con energía suficiente?", tipo: "radio", opciones: ["Sí", "No sé / por confirmar"] },
    ],
  },
  {
    titulo: "Música y audio",
    preguntas: [
      { id: "musica",        label: "¿Qué tipo de música tendrán?", tipo: "radio", opciones: ["Solo DJ", "Música en vivo (banda)", "DJ + música en vivo", "Aún no decidido"] },
      { id: "microfono",     label: "¿Necesitan micrófono para brindis / ceremonia / discursos?", tipo: "radio", opciones: ["Sí", "No", "Por definir"] },
      { id: "karaoke",       label: "¿Quieren karaoke?", tipo: "radio", opciones: ["Sí", "No"] },
    ],
  },
  {
    titulo: "Iluminación",
    preguntas: [
      { id: "iluminacion",  label: "¿Qué tipo de iluminación buscan?", tipo: "radio", opciones: ["Ambiental / decorativa", "Pista de baile iluminada", "Show completo de luces", "Por definir"] },
      { id: "efectos",      label: "¿Desean efectos especiales?", tipo: "checkbox", opciones: ["Confeti / cañón", "Humo frío (cielo de humo)", "Artificios indoor", "Ninguno"] },
    ],
  },
  {
    titulo: "Video",
    preguntas: [
      { id: "pantalla",     label: "¿Requieren pantalla o proyección?", tipo: "radio", opciones: ["Sí (video tributo / memoria fotográfica)", "Sí (transmisión en vivo para invitados remotos)", "No", "Por definir"] },
    ],
  },
  {
    titulo: "Logística y extras",
    preguntas: [
      { id: "transporte",     label: "¿Requieren que llevemos el equipo desde Querétaro?", tipo: "radio", opciones: ["Sí", "No, lo recogemos", "Por definir"] },
      { id: "direccionVenue", label: "Dirección del venue (para calcular traslado)", tipo: "text", placeholder: "Calle, colonia, ciudad, CP" },
      { id: "presupuesto",    label: "Presupuesto aproximado (opcional)", tipo: "number", placeholder: "En pesos mexicanos" },
      { id: "extras",         label: "¿Algo más que debamos saber?", tipo: "textarea", placeholder: "Estilo, colores, ambiente deseado, restricciones..." },
    ],
  },
];

const FORM_PRODUCCION_EMPRESARIAL: Seccion[] = [
  {
    titulo: "El evento",
    preguntas: [
      { id: "nombreEvento",  label: "Nombre y tipo de evento", tipo: "text", placeholder: "Ej: Congreso Nacional, Lanzamiento Producto X, Gala 30 años...", requerida: true },
      { id: "fechaEvento",   label: "Fecha del evento", tipo: "date", requerida: true },
      { id: "lugar",         label: "Ciudad y venue", tipo: "text", placeholder: "Ej: CDMX · Centro Citibanamex", requerida: true },
      { id: "asistentes",    label: "Número de asistentes", tipo: "number", placeholder: "Ej: 300", requerida: true },
      { id: "duracion",      label: "Duración del evento", tipo: "text", placeholder: "Ej: 1 día completo, 3 días, de 9am a 6pm" },
    ],
  },
  {
    titulo: "Escenario y presentaciones",
    preguntas: [
      { id: "ponentes",     label: "¿Cuántos ponentes / presentadores en escenario?", tipo: "number", placeholder: "Ej: 5" },
      { id: "pantallas",    label: "¿Cuántas pantallas/proyectores para presentaciones?", tipo: "radio", opciones: ["1 pantalla principal", "2 pantallas (principal + lateral)", "Videowall LED", "3 o más", "Por definir"] },
      { id: "traduccion",   label: "¿Se requiere traducción simultánea?", tipo: "radio", opciones: ["Sí", "No"] },
    ],
  },
  {
    titulo: "Audio",
    preguntas: [
      { id: "tipoAudio",    label: "¿Qué tipo de sistema de audio necesitan?", tipo: "radio", opciones: ["PA para auditorio grande", "Sistema para sala de conferencias", "Ambos (plenary + breakouts)", "Por definir"] },
      { id: "microfonos",   label: "¿Qué tipos de micrófonos necesitan?", tipo: "checkbox", opciones: ["De mano (inalámbrico)", "De solapa / lavalier", "De podio", "Diadema / headset"] },
    ],
  },
  {
    titulo: "Producción adicional",
    preguntas: [
      { id: "grabacion",    label: "¿Se requiere grabación del evento?", tipo: "radio", opciones: ["Sí", "No", "Por definir"] },
      { id: "streaming",    label: "¿Se requiere transmisión en vivo (streaming)?", tipo: "radio", opciones: ["Sí", "No", "Por definir"] },
      { id: "branding",     label: "¿Se requiere branding en pantallas / contenido visual?", tipo: "radio", opciones: ["Sí", "No", "Por definir"] },
    ],
  },
  {
    titulo: "Logística y extras",
    preguntas: [
      { id: "transporte",     label: "¿Requieren transporte del equipo desde Querétaro?", tipo: "radio", opciones: ["Sí", "No", "Por definir"] },
      { id: "direccionVenue", label: "Dirección del venue", tipo: "text", placeholder: "Calle, colonia, ciudad, CP" },
      { id: "presupuesto",    label: "Presupuesto aproximado (opcional)", tipo: "number", placeholder: "En pesos mexicanos" },
      { id: "extras",         label: "¿Algo más que debamos saber?", tipo: "textarea", placeholder: "Requerimientos especiales, restricciones, setup específico..." },
    ],
  },
];

const FORM_PRODUCCION_OTRO: Seccion[] = [
  {
    titulo: "El evento",
    preguntas: [
      { id: "nombreEvento",  label: "Nombre y tipo de evento", tipo: "text", placeholder: "Ej: Festival comunitario, Evento privado...", requerida: true },
      { id: "fechaEvento",   label: "Fecha del evento", tipo: "date", requerida: true },
      { id: "lugar",         label: "Ciudad y venue", tipo: "text", requerida: true },
      { id: "asistentes",    label: "Asistentes esperados", tipo: "number" },
      { id: "duracion",      label: "Duración del evento", tipo: "text" },
    ],
  },
  {
    titulo: "Equipos y servicios",
    preguntas: [
      { id: "servicios",    label: "¿Qué servicios buscan?", tipo: "checkbox", opciones: ["Sistema de audio / PA", "Iluminación artística", "Pantallas LED / Video", "DJ / soporte musical", "Efectos especiales", "Producción general"] },
      { id: "descripcion",  label: "Describe lo que necesitan", tipo: "textarea", placeholder: "Cuéntanos con detalle qué buscan para su evento..." },
    ],
  },
  {
    titulo: "Logística y extras",
    preguntas: [
      { id: "transporte",     label: "¿Requieren transporte del equipo?", tipo: "radio", opciones: ["Sí", "No", "Por definir"] },
      { id: "direccionVenue", label: "Dirección del venue", tipo: "text" },
      { id: "presupuesto",    label: "Presupuesto aproximado (opcional)", tipo: "number" },
      { id: "extras",         label: "¿Algo más que debamos saber?", tipo: "textarea" },
    ],
  },
];

const FORM_RENTA: Seccion[] = [
  {
    titulo: "Tu evento",
    preguntas: [
      { id: "nombreEvento",       label: "¿Cómo se llama tu evento?",                    tipo: "text",     placeholder: "Ej: Boda García, Fiesta de XV, Concierto Verano...", requerida: true },
      { id: "tipoEvento",         label: "¿Qué tipo de evento es?",                      tipo: "text",     placeholder: "Ej: boda, xv años, corporativo, concierto, graduación..." },
      { id: "fechaEvento",        label: "Fecha del evento",                             tipo: "date",     requerida: true },
      { id: "horaEvento",         label: "¿A qué hora empieza el evento?",               tipo: "text",     placeholder: "Ej: 7:00 PM" },
      { id: "duracion",           label: "Duración aproximada del evento",               tipo: "text",     placeholder: "Ej: 6 horas, de 7 PM a 1 AM" },
      { id: "lugar",              label: "Dirección del lugar del evento (venue)",        tipo: "text",     placeholder: "Calle, colonia, ciudad, CP", requerida: true },
      { id: "asistentes",         label: "¿Cuántos asistentes aproximados?",             tipo: "number",   placeholder: "Ej: 150" },
      { id: "tipoEspacio",        label: "¿El evento es interior o exterior?",           tipo: "radio",    opciones: ["Interior", "Exterior", "Mixto (interior + exterior)"] },
    ],
  },
  {
    titulo: "El equipo que necesitas",
    preguntas: [
      { id: "tiposEquipo",        label: "¿Qué tipo de equipo necesitas? (puedes seleccionar varios)", tipo: "checkbox", opciones: [
          "Sistema de audio PA (bafles principales)",
          "Subwoofers (graves)",
          "Monitores / bafles de escenario",
          "Consola de audio",
          "Micrófonos inalámbricos",
          "Micrófonos de mano (cableados)",
          "Iluminación (PARs, wash, ambiente)",
          "Cabezas móviles (moving heads)",
          "Efectos especiales (humo, confeti)",
          "Pantallas LED / Videowall",
          "Proyector + pantalla de proyección",
          "Equipo DJ (tornamesas, mixer)",
          "Cables y accesorios",
          "Otro",
        ],
      },
      { id: "descripcionEquipos", label: "Describe el equipo específico que buscas (o adjunta tu lista)",tipo: "textarea", placeholder: "Ej: 2 bafles EV de 15\", 1 subwoofer, 4 micrófonos inalámbricos, 8 PARs LED... Si tienes rider técnico, indícalo aquí." },
      { id: "tieneRider",         label: "¿Tienes un rider técnico o lista específica de equipos?",    tipo: "radio", opciones: ["Sí, tengo rider / lista técnica", "No, la descripción de arriba es suficiente", "Puedo enviarlo después"] },
    ],
  },
  {
    titulo: "Tipo de servicio que necesitas",
    preguntas: [
      { id: "nivelServicio",      label: "¿Qué nivel de servicio necesitas?",            tipo: "radio",    opciones: [
          "Solo renta — yo instalo y opero el equipo",
          "Renta + entrega en venue — ustedes llevan y recogen, yo instalo y opero",
          "Renta + montaje — ustedes instalan en el venue, yo opero",
          "Renta + montaje y operación — servicio completo con técnico incluido",
        ], requerida: true,
        hint: "Si tienes dudas, selecciona la opción más cercana — la ajustamos en la cotización",
      },
      { id: "tecnicoPropio",      label: "¿Cuentas con personal técnico para operar el equipo?",       tipo: "radio", opciones: ["Sí, tengo técnico propio", "No, necesito técnico de su parte", "Parcialmente — tengo ayudantes pero sin experiencia técnica"] },
    ],
  },
  {
    titulo: "Logística de entrega y devolución",
    preguntas: [
      { id: "entrega",            label: "¿Cómo prefieres recibir el equipo?",           tipo: "radio",    opciones: [
          "Recojo en su bodega (Querétaro, Qro.) — yo lo llevo y regreso",
          "Entrega en mi bodega o almacén — ustedes lo traen y recogen",
          "Entrega directo en el venue del evento — ustedes lo llevan y recogen",
        ], requerida: true,
      },
      { id: "direccionEntrega",   label: "Dirección de entrega (si aplica)",              tipo: "text",     placeholder: "Calle, colonia, ciudad, CP — donde quieres recibir el equipo" },
      { id: "fechaEntrega",       label: "¿Cuándo necesitas el equipo? (fecha de entrega)",tipo: "date",   hint: "Puede ser el mismo día del evento o el día anterior para montaje" },
      { id: "horaEntrega",        label: "¿A qué hora lo necesitas?",                    tipo: "text",     placeholder: "Ej: 10:00 AM" },
      { id: "fechaDevolucion",    label: "¿Cuándo regresas el equipo? (fecha de devolución)",tipo: "date", requerida: true },
      { id: "horaDevolucion",     label: "¿A qué hora lo regresas o lo recogen?",        tipo: "text",     placeholder: "Ej: 12:00 PM del día siguiente" },
    ],
  },
  {
    titulo: "Presupuesto y notas finales",
    preguntas: [
      { id: "presupuesto",        label: "Presupuesto aproximado (opcional)",             tipo: "number",   placeholder: "En pesos mexicanos — nos ayuda a orientar la propuesta" },
      { id: "extras",             label: "¿Algo más que debamos saber?",                  tipo: "textarea", placeholder: "Restricciones de acceso, estacionamiento, escaleras, horarios de montaje, peticiones especiales..." },
    ],
  },
];

const FORM_RIDER_DIRECTO: Seccion[] = [
  {
    titulo: "Información del evento",
    preguntas: [
      { id: "nombreEvento",  label: "Nombre del evento", tipo: "text", placeholder: "Ej: Boda García, Congreso TechMX 2026...", requerida: true },
      { id: "fechaEvento",   label: "Fecha del evento", tipo: "date", requerida: true },
      { id: "lugar",         label: "Lugar / venue", tipo: "text", placeholder: "Nombre del venue o espacio", requerida: true },
      { id: "ciudad",        label: "Ciudad", tipo: "text", placeholder: "Ej: Querétaro, CDMX..." },
      { id: "asistentes",    label: "Asistentes aproximados", tipo: "number", placeholder: "Ej: 200" },
      { id: "horaMontaje",   label: "Hora de inicio de montaje", tipo: "text", placeholder: "Ej: 8:00 AM, 10:00 AM del día anterior" },
      { id: "operacion",     label: "¿Requieren operación técnica incluida?", tipo: "radio", opciones: ["Sí, con operadores", "No, nosotros lo operamos", "Por definir"] },
      { id: "extras",        label: "Notas o especificaciones adicionales", tipo: "textarea", placeholder: "Cualquier detalle importante, restricciones, peticiones especiales..." },
    ],
  },
];

// ─── Sección compartida de horarios y contacto del venue ─────────────────────
const SECCION_HORARIOS_VENUE: Seccion = {
  titulo: "Horarios y acceso al venue",
  preguntas: [
    {
      id: "horaInicioEvento",
      label: "Hora de inicio del evento",
      tipo: "text",
      placeholder: "Ej: 20:00",
      hint: "Hora en que comienza oficialmente el evento para los invitados",
    },
    {
      id: "horaFinEvento",
      label: "Hora de fin del evento",
      tipo: "text",
      placeholder: "Ej: 01:00 (del día siguiente)",
    },
    {
      id: "ventanaMontajeInicio",
      label: "Primera hora de acceso al venue para montaje",
      tipo: "text",
      placeholder: "Ej: 08:00",
      hint: "¿Desde qué hora nos permiten entrar a instalar?",
    },
    {
      id: "ventanaMontajeFin",
      label: "Hora límite para terminar el montaje",
      tipo: "text",
      placeholder: "Ej: 17:00",
      hint: "Hora máxima en que debemos tener todo listo antes de que lleguen los invitados",
    },
    {
      id: "horaTerminoMontaje",
      label: "¿A qué hora deben salir del venue? (desmontaje)",
      tipo: "text",
      placeholder: "Ej: 03:00 hrs",
      hint: "Hora límite para tener el equipo fuera del venue",
    },
    {
      id: "contactoVenueNombre",
      label: "Nombre del coordinador del venue",
      tipo: "text",
      placeholder: "Ej: Ana García",
      hint: "Persona a quien contactar el día del evento para acceso y logística",
    },
    {
      id: "contactoVenueTelefono",
      label: "Teléfono del coordinador del venue",
      tipo: "text",
      placeholder: "Ej: 55 1234 5678",
    },
  ],
};

function getForm(tipoServicio: string | null, tipoEvento: string | null, rutaEntrada?: string | null): Seccion[] {
  if (rutaEntrada === "RIDER_DIRECTO") return FORM_RIDER_DIRECTO;
  if (tipoServicio === "RENTA") return FORM_RENTA;

  // Para producción: insertar sección de horarios/venue antes de la última sección
  const addHorarios = (base: Seccion[]): Seccion[] => {
    const last = base[base.length - 1];
    return [...base.slice(0, -1), SECCION_HORARIOS_VENUE, last];
  };

  if (tipoServicio === "PRODUCCION_TECNICA" || tipoServicio === "DIRECCION_TECNICA") {
    if (tipoEvento === "MUSICAL")    return addHorarios(FORM_PRODUCCION_MUSICAL);
    if (tipoEvento === "SOCIAL")     return addHorarios(FORM_PRODUCCION_SOCIAL);
    if (tipoEvento === "EMPRESARIAL") return addHorarios(FORM_PRODUCCION_EMPRESARIAL);
    return addHorarios(FORM_PRODUCCION_OTRO);
  }
  return addHorarios(FORM_PRODUCCION_OTRO);
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface TratoInfo {
  tipoServicio: string | null;
  tipoEvento: string;
  rutaEntrada: string | null;
  nombreEvento: string | null;
  fechaEventoEstimada: string | null;
  lugarEstimado: string | null;
  asistentesEstimados: number | null;
  presupuestoEstimado: number | null;
  horaInicioEvento: string | null;
  horaFinEvento: string | null;
  ventanaMontajeInicio: string | null;
  ventanaMontajeFin: string | null;
  horaTerminoMontaje: string | null;
  contactoVenueNombre: string | null;
  contactoVenueTelefono: string | null;
  formEstado: string;
  cliente: { nombre: string };
}

const SERVICIO_LABELS: Record<string, string> = {
  PRODUCCION_TECNICA: "Producción técnica", RENTA: "Renta de equipo", DIRECCION_TECNICA: "Dirección técnica",
};
const EVENTO_LABELS: Record<string, string> = {
  MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", OTRO: "Otro",
};

export default function FormProspectoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [trato, setTrato] = useState<TratoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [completado, setCompletado] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [reenvio, setReenvio] = useState(false); // true cuando el cliente actualiza un form ya enviado
  const [respuestas, setRespuestas] = useState<Record<string, string | string[]>>({});
  const [guardando, setGuardando] = useState(false);
  const [seccionActual, setSeccionActual] = useState(0);
  const [error, setError] = useState("");
  const [equiposInteres, setEquiposInteres] = useState<SeleccionEquipos>({ categorias: [], equipos: [] });

  useEffect(() => {
    fetch(`/api/f/${token}`)
      .then(r => r.json())
      .then(d => {
        // Pre-fill con todo lo que ya tenemos (para envío nuevo o actualización)
        const preFill = (t: TratoInfo) => {
          const pre: Record<string, string | string[]> = {};
          if (t.nombreEvento)          pre.nombreEvento          = t.nombreEvento;
          if (t.lugarEstimado)         pre.lugar                 = t.lugarEstimado;
          if (t.asistentesEstimados)   pre.asistentes            = String(t.asistentesEstimados);
          if (t.fechaEventoEstimada)   pre.fechaEvento           = t.fechaEventoEstimada.slice(0, 10);
          if (t.presupuestoEstimado)   pre.presupuesto           = String(t.presupuestoEstimado);
          if (t.horaInicioEvento)      pre.horaInicioEvento      = t.horaInicioEvento;
          if (t.horaFinEvento)         pre.horaFinEvento         = t.horaFinEvento;
          if (t.ventanaMontajeInicio)  pre.ventanaMontajeInicio  = t.ventanaMontajeInicio;
          if (t.ventanaMontajeFin)     pre.ventanaMontajeFin     = t.ventanaMontajeFin;
          if (t.horaTerminoMontaje)    pre.horaTerminoMontaje    = t.horaTerminoMontaje;
          if (t.contactoVenueNombre)   pre.contactoVenueNombre   = t.contactoVenueNombre;
          if (t.contactoVenueTelefono) pre.contactoVenueTelefono = t.contactoVenueTelefono;
          return pre;
        };
        if (d.completado && d.trato) {
          // Ya completado — mostramos pantalla de confirmación con opción de actualizar
          setCompletado(true);
          setTrato(d.trato);
          setRespuestas(preFill(d.trato));
        } else if (d.trato) {
          setTrato(d.trato);
          setRespuestas(preFill(d.trato));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  function setRespuesta(id: string, valor: string | string[]) {
    setRespuestas(p => ({ ...p, [id]: valor }));
  }

  function toggleCheckbox(id: string, opcion: string) {
    const actual = (respuestas[id] as string[] | undefined) ?? [];
    const nuevo = actual.includes(opcion) ? actual.filter(o => o !== opcion) : [...actual, opcion];
    setRespuesta(id, nuevo);
  }

  const secciones = trato ? getForm(trato.tipoServicio, trato.tipoEvento, trato.rutaEntrada) : [];
  const seccion = secciones[seccionActual];
  const esUltima = seccionActual === secciones.length - 1;

  function validarSeccion(): boolean {
    if (!seccion) return true;
    for (const p of seccion.preguntas) {
      if (p.requerida) {
        const val = respuestas[p.id];
        if (!val || (Array.isArray(val) && val.length === 0) || val === "") {
          setError(`Por favor completa: "${p.label}"`);
          return false;
        }
      }
    }
    setError("");
    return true;
  }

  function siguiente() {
    if (!validarSeccion()) return;
    setSeccionActual(p => p + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function enviar() {
    if (!validarSeccion()) return;
    setGuardando(true);
    try {
      const res = await fetch(`/api/f/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...respuestas,
          _equiposInteres: JSON.stringify(equiposInteres),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (completado) setReenvio(true); // era una actualización
        setEnviado(true);
        setCompletado(false); // para mostrar pantalla de enviado, no de completado
        window.scrollTo({ top: 0, behavior: "smooth" });
        void data; // suprimir warning
      }
      else setError("Hubo un error al enviar. Por favor intenta de nuevo.");
    } catch { setError("Error de conexión. Por favor intenta de nuevo."); }
    setGuardando(false);
  }

  // ── Pantalla de carga ──
  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-gray-500 text-sm">Cargando formulario...</p>
    </div>
  );

  // ── Ya enviado (éxito tras submit) ──
  if (enviado) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-900/30 border border-green-600/40 flex items-center justify-center mx-auto text-3xl">✓</div>
        <h1 className="text-white text-xl font-semibold">
          {reenvio ? "¡Información actualizada!" : "¡Gracias por tu tiempo!"}
        </h1>
        <p className="text-gray-400 text-sm">
          {reenvio
            ? "Tus datos han sido actualizados. El equipo de Mainstage ya puede verlos."
            : "Hemos recibido tu información. Nuestro equipo la revisará y te contactará pronto con una propuesta personalizada."
          }
        </p>
        {/* Botón WhatsApp — avisa al equipo de ventas */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 mt-2">
          <p className="text-gray-500 text-xs mb-3">Avisa a tu asesor que ya llenaste el formulario</p>
          <a
            href={`https://wa.me/524461432565?text=${encodeURIComponent(
              `Hola! Soy ${trato?.cliente?.nombre ?? "tu cliente"} y acabo de ${reenvio ? "actualizar" : "completar"} el formulario de información para mi evento. Ya pueden revisarlo 🎉`
            )}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.984-1.31A9.944 9.944 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
            </svg>
            Notificar a mi asesor
          </a>
        </div>
      </div>
    </div>
  );

  // ── Ya completado previamente — opción de actualizar ──
  if (completado && trato) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-[#B3985B]/20 border border-[#B3985B]/40 flex items-center justify-center mx-auto text-2xl">📋</div>
        <h1 className="text-white text-lg font-semibold">Ya enviaste este formulario</h1>
        <p className="text-gray-400 text-sm">¿Cambió algo? Puedes actualizar tu información cuando quieras.</p>
        <button
          onClick={() => { setCompletado(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="w-full py-3 rounded-xl bg-[#B3985B]/10 border border-[#B3985B]/40 text-[#B3985B] text-sm font-semibold hover:bg-[#B3985B]/20 transition-colors"
        >
          Actualizar mi información →
        </button>
        <a
          href={`https://wa.me/524461432565?text=${encodeURIComponent(
            `Hola, soy ${trato.cliente?.nombre ?? "tu cliente"} y tengo dudas sobre mi evento`
          )}`}
          target="_blank" rel="noopener noreferrer"
          className="block text-sm text-green-500 hover:text-green-400 transition-colors"
        >
          💬 Contactar a mi asesor por WhatsApp
        </a>
      </div>
    </div>
  );

  // ── No encontrado ──
  if (!trato) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-gray-500 text-sm">Este formulario no existe o ha expirado.</p>
        <a href="https://wa.me/524461432565" className="text-[#B3985B] text-sm mt-2 block">Contáctanos por WhatsApp</a>
      </div>
    </div>
  );

  const progreso = Math.round(((seccionActual + 1) / secciones.length) * 100);

  return (
    <div className="min-h-screen bg-[#0a0a0a]"
         style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      {/* Header */}
      <div className="bg-[#0d0d0d] border-b border-[#1a1a1a] px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider">Mainstage Pro</p>
            <p className="text-white text-sm font-semibold mt-0.5">
              {trato.rutaEntrada === "RIDER_DIRECTO"
                ? "Información del evento"
                : `${SERVICIO_LABELS[trato.tipoServicio ?? ""] ?? "Formulario de descubrimiento"} · ${EVENTO_LABELS[trato.tipoEvento] ?? trato.tipoEvento}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-[10px]">Para: {trato.cliente.nombre}</p>
            <p className="text-gray-600 text-[10px]">{seccionActual + 1} / {secciones.length}</p>
          </div>
        </div>
        {/* Barra de progreso */}
        <div className="max-w-xl mx-auto mt-3">
          <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div className="h-full bg-[#B3985B] rounded-full transition-all duration-500" style={{ width: `${progreso}%` }} />
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="max-w-xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h2 className="text-white font-semibold text-lg">{seccion.titulo}</h2>
          {trato.nombreEvento && <p className="text-gray-500 text-xs mt-0.5">Para: {trato.nombreEvento}</p>}
        </div>

        <div className="space-y-5">
          {seccion.preguntas.map(p => (
            <div key={p.id}>
              <label className="block text-gray-300 text-sm mb-1.5 font-medium">
                {p.label}
                {p.requerida && <span className="text-[#B3985B] ml-1">*</span>}
              </label>
              {p.hint && <p className="text-gray-600 text-xs mb-2">{p.hint}</p>}

              {p.tipo === "text" && (
                <input value={(respuestas[p.id] as string) ?? ""} onChange={e => setRespuesta(p.id, e.target.value)}
                  placeholder={p.placeholder} className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              )}
              {p.tipo === "number" && (
                <input type="number" value={(respuestas[p.id] as string) ?? ""} onChange={e => setRespuesta(p.id, e.target.value)}
                  placeholder={p.placeholder} className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              )}
              {p.tipo === "date" && (
                <input type="date" value={(respuestas[p.id] as string) ?? ""} onChange={e => setRespuesta(p.id, e.target.value)}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              )}
              {p.tipo === "textarea" && (
                <textarea value={(respuestas[p.id] as string) ?? ""} onChange={e => setRespuesta(p.id, e.target.value)}
                  placeholder={p.placeholder} rows={3}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              )}
              {p.tipo === "radio" && (
                <div className="space-y-2">
                  {p.opciones?.map(op => (
                    <button key={op} type="button" onClick={() => setRespuesta(p.id, op)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                        respuestas[p.id] === op
                          ? "border-[#B3985B] bg-[#B3985B]/10 text-white"
                          : "border-[#2a2a2a] bg-[#111] text-gray-400 hover:border-[#3a3a3a] hover:text-white"
                      }`}>
                      {op}
                    </button>
                  ))}
                </div>
              )}
              {p.tipo === "checkbox" && (
                <div className="space-y-2">
                  {p.opciones?.map(op => {
                    const sel = ((respuestas[p.id] as string[]) ?? []).includes(op);
                    return (
                      <button key={op} type="button" onClick={() => toggleCheckbox(p.id, op)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex items-center gap-3 ${
                          sel ? "border-[#B3985B] bg-[#B3985B]/10 text-white" : "border-[#2a2a2a] bg-[#111] text-gray-400 hover:border-[#3a3a3a] hover:text-white"
                        }`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sel ? "bg-[#B3985B] border-[#B3985B]" : "border-[#444]"}`}>
                          {sel && <span className="text-black text-[10px] font-bold">✓</span>}
                        </div>
                        {op}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Selector de equipos — siempre visible en la última sección */}
        {esUltima && (
          <div className="pt-4 border-t border-[#1e1e1e] space-y-3">
            <div>
              <h3 className="text-white font-semibold text-base">Equipos de interés</h3>
              <p className="text-gray-500 text-xs mt-1">
                ¿Ya tienes en mente los equipos que necesitas? Selecciona los que te interesan
                o marca la categoría si no sabes aún qué equipo específico.
                <br/>
                <span className="text-gray-600">(Opcional — lo podemos definir juntos después)</span>
              </p>
            </div>
            <SelectorEquiposInventario
              value={equiposInteres}
              onChange={setEquiposInteres}
            />
          </div>
        )}

        {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">{error}</p>}

        <div className="flex gap-3 pb-8">
          {seccionActual > 0 && (
            <button onClick={() => { setSeccionActual(p => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="px-5 py-3 rounded-xl border border-[#2a2a2a] text-gray-400 hover:text-white text-sm transition-colors">
              ← Anterior
            </button>
          )}
          {!esUltima ? (
            <button onClick={siguiente}
              className="flex-1 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-sm px-5 py-3 rounded-xl transition-colors">
              Siguiente →
            </button>
          ) : (
            <button onClick={enviar} disabled={guardando}
              className="flex-1 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-3 rounded-xl transition-colors">
              {guardando ? "Enviando..." : "Enviar formulario ✓"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
