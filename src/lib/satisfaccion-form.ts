// Cuestionario de satisfacción y mejora del equipo Mainstage Pro.
// Fuente única de verdad: lo usan el formulario público, la API y el expediente.
// Sintetiza el formulario extendido (estado, operación, mejora, cultura, dirección, bienestar).

export type TipoPregunta = "scale5" | "single" | "multi" | "text" | "yesno";

export type Pregunta = {
  id: string;
  tipo: TipoPregunta;
  label: string;
  desc?: string;
  required?: boolean;
  opciones?: string[];
  permiteOtro?: boolean;          // agrega opción "Otro" con caja de texto
  escalaMin?: string;             // etiqueta debajo del 1
  escalaMax?: string;             // etiqueta debajo del 5
  excluirDePromedio?: boolean;    // no cuenta para el promedio global (ej. bienestar personal)
  // Muestra la pregunta solo si otra respuesta cumple la condición
  condicion?: { preguntaId: string; en: string[] };
};

export type Seccion = {
  id: string;
  titulo: string;
  intro?: string;
  preguntas: Pregunta[];
};

export type Respuestas = Record<string, number | string | string[] | undefined>;

export const SECCIONES: Seccion[] = [
  {
    id: "estado",
    titulo: "Estado general del mes",
    intro: "Queremos entender cómo te fue este mes: carga de trabajo, claridad, apoyo del equipo y tu ánimo. Esto nos ayuda a detectar señales a tiempo y ajustar.",
    preguntas: [
      { id: "estadoGeneral", tipo: "scale5", label: "Este mes en general fue:", required: true, escalaMin: "Malo", escalaMax: "Excelente" },
      { id: "cargaTrabajo", tipo: "scale5", label: "Mi carga de trabajo este mes fue:", required: true, escalaMin: "Muy ligera", escalaMax: "Muy cargada", excluirDePromedio: true },
      { id: "claridadPrioridades", tipo: "scale5", label: "Tuve claridad de prioridades en cuanto a mis tareas:", required: true, escalaMin: "Nada claro", escalaMax: "Muy claro" },
      { id: "apoyoEquipo", tipo: "scale5", label: "Me sentí apoyado por el equipo:", required: true, escalaMin: "Nada", escalaMax: "Totalmente" },
      { id: "animo", tipo: "scale5", label: "Mi ánimo / motivación este mes:", required: true, escalaMin: "Nada motivado", escalaMax: "Muy motivado" },
    ],
  },
  {
    id: "operacion",
    titulo: "Operación, herramientas y coordinación",
    intro: "Aquí medimos lo que más te estorbó o te faltó para trabajar mejor: información, herramientas, orden, coordinación y comunicación. Mientras más concreto, más fácil de resolver.",
    preguntas: [
      {
        id: "principalProblema", tipo: "single", required: true,
        label: "Lo que más me causó problemas este mes fue:",
        opciones: [
          "Falta de información / instrucciones claras",
          "Falta de herramientas o equipo",
          "Falta de personal / apoyo",
          "Mala coordinación / comunicación",
          "Tiempos irreales / cambios de último minuto",
          "Orden y control (bodega / materiales / documentos)",
          "Falta de capacitación",
        ],
        permiteOtro: true,
      },
      { id: "principalProblemaDetalle", tipo: "text", label: "¿Puedes describir un poco más tu respuesta anterior?" },
      { id: "recursoFaltante", tipo: "text", label: "¿Qué equipo / recurso / sistema te hace falta para dar mejor resultado?" },
      { id: "ordenControl", tipo: "scale5", label: "Nivel de orden y control en la operación (inventario / pendientes / seguimiento):", required: true, escalaMin: "Falta mucho orden", escalaMax: "Muy ordenado" },
      { id: "problemaRepetido", tipo: "text", label: "Describe 1 problema repetido del mes y cómo lo evitarías." },
    ],
  },
  {
    id: "mejora",
    titulo: "Propuestas de mejora (mejora continua)",
    intro: "Este espacio es para tus ideas. Una propuesta clara (problema + solución + impacto) puede convertirse en una mejora real en procesos, costos, calidad y resultados.",
    preguntas: [
      { id: "propuestaMejora", tipo: "text", label: "Propuesta de mejora del mes (de cualquier área): menciona el problema y cómo se puede solucionar." },
      {
        id: "impactoPropuesta", tipo: "multi",
        label: "Impacto de la propuesta (¿en dónde repercutiría el cambio?)",
        opciones: ["Tiempo", "Calidad", "Ahorro económico", "Seguridad", "Cliente", "Equipo", "Ventas"],
        permiteOtro: true,
      },
      {
        id: "perdidaEficiencia", tipo: "multi",
        label: "¿Dónde crees que más estamos perdiendo eficiencia y/o dinero? (con o sin relación a tu área)",
        opciones: [
          "Compras / consumibles",
          "Mermas / pérdidas",
          "Retrabajos (hacer doble)",
          "Traslados / logística",
          "Horas extra mal planeadas",
          "Errores por falta de info",
          "Personal técnico mal cotizado",
          "Falta de equipos en inventario propio",
          "Mal uso de los recursos",
          "Gastos hormiga",
        ],
        permiteOtro: true,
      },
    ],
  },
  {
    id: "cultura",
    titulo: "Cultura, convivencia y equipo",
    intro: "Buscamos fortalecer el ambiente, el respeto y el trabajo en equipo. También queremos proponer actividades fuera del trabajo para integrar mejor al equipo interno y freelance.",
    preguntas: [
      { id: "ambiente", tipo: "scale5", label: "Ambiente y respeto dentro del equipo:", required: true, escalaMin: "Muy mal ambiente", escalaMax: "El mejor ambiente" },
      { id: "trabajoEnEquipo", tipo: "scale5", label: "Trabajo en equipo con personal interno y freelance:", required: true, escalaMin: "No hay colaboración", escalaMax: "Trabajamos en equipo" },
      { id: "huboConflicto", tipo: "yesno", label: "¿Hubo algún conflicto, falta de respeto o ambiente incómodo que debamos atender?", required: true },
      { id: "conflictoDetalle", tipo: "text", label: "Si respondiste que sí, ¿puedes describir la situación?", condicion: { preguntaId: "huboConflicto", en: ["Sí"] } },
      {
        id: "actividadesEquipo", tipo: "multi",
        label: "¿Qué actividades fuera del trabajo te gustaría tener con el equipo?",
        opciones: [
          "Comida / cena mensual",
          "Carne asada / convivencia informal",
          "Actividad deportiva (fútbol / pádel / etc.)",
          "Salida social (bar / antro)",
          "Día de integración (dinámicas + comida)",
          "Capacitación + convivencia",
          "Torneo (deporte o videojuegos)",
          "Actividad con causa (voluntariado)",
        ],
        permiteOtro: true,
      },
      { id: "actividadSugerencia", tipo: "text", label: "Sugiere 1 actividad y cada cuánto (mensual / bimestral / semanal)." },
    ],
  },
  {
    id: "direccion",
    titulo: "Dirección, crecimiento y rumbo",
    intro: "Queremos feedback directo y constructivo para mejorar liderazgo, comunicación y rumbo. Tu opinión ayuda a construir una empresa más sólida y profesional.",
    preguntas: [
      { id: "alineacionVision", tipo: "scale5", label: "Me siento alineado con la visión y rumbo de la empresa:", required: true, escalaMin: "Nada", escalaMax: "Totalmente" },
      { id: "ideasCuentan", tipo: "scale5", label: "Siento que mis ideas y mi trabajo cuentan:", required: true, escalaMin: "Nada", escalaMax: "Totalmente" },
      { id: "habilidadesDesarrollar", tipo: "text", label: "¿Qué habilidad(es) te gustaría desarrollar próximamente que complementen tu trabajo?" },
      { id: "puestosFaltantes", tipo: "text", label: "¿Qué puestos de trabajo crees que falten integrar a la empresa? (con o sin relación a tu área)" },
      { id: "mejoraDireccion", tipo: "text", label: "¿Qué debería mejorar el área de dirección para que trabajemos mejor?" },
      { id: "organizacionMasFuerte", tipo: "text", label: "¿Qué cosa haría que Mainstage Pro sea una organización más fuerte este año?" },
    ],
  },
  {
    id: "bienestar",
    titulo: "Bienestar y apoyo (confidencial y opcional)",
    intro: "Esta sección es opcional. Responde solo si quieres. La intención es entender si algo fuera del trabajo está afectando tu energía y ver cómo apoyarte de forma respetuosa.",
    preguntas: [
      { id: "vidaPersonal", tipo: "scale5", label: "¿Cómo te sientes en general en tu vida personal este mes?", escalaMin: "Muy mal", escalaMax: "Excelente", excluirDePromedio: true },
      {
        id: "afectaExterno", tipo: "single",
        label: "¿Algo fuera del trabajo te está afectando en tu energía o enfoque?",
        opciones: ["No", "Sí, un poco", "Sí, bastante", "Prefiero no responder"],
      },
      {
        id: "tipoApoyo", tipo: "multi",
        label: "Si respondiste que sí: ¿qué tipo de apoyo te ayudaría desde el trabajo?",
        opciones: [
          "Flexibilidad puntual de horario",
          "Mejor planeación y comunicación (avisos con tiempo)",
          "Acompañamiento / feedback más frecuente",
          "Capacitación para trabajar mejor",
          "Herramientas o recursos de trabajo",
          "Prefiero hablarlo 1:1 en privado",
        ],
        condicion: { preguntaId: "afectaExterno", en: ["Sí, un poco", "Sí, bastante"] },
      },
      {
        id: "situacionEconomica", tipo: "single",
        label: "¿Qué tanto te ha preocupado tu situación económica en las últimas semanas?",
        opciones: ["Nada", "Poco", "Lo normal", "Mucho", "Prefiero no responder"],
        permiteOtro: true,
      },
    ],
  },
];

export const TODAS_LAS_PREGUNTAS: Pregunta[] = SECCIONES.flatMap(s => s.preguntas);

// ¿Debe mostrarse la pregunta según las respuestas actuales?
export function preguntaVisible(p: Pregunta, r: Respuestas): boolean {
  if (!p.condicion) return true;
  const val = r[p.condicion.preguntaId];
  if (typeof val !== "string") return false;
  return p.condicion.en.includes(val);
}

function tieneValor(v: number | string | string[] | undefined): boolean {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

// IDs de preguntas obligatorias que aún faltan por responder (respetando condiciones)
export function faltantesRequeridas(r: Respuestas): string[] {
  return TODAS_LAS_PREGUNTAS
    .filter(p => p.required && preguntaVisible(p, r) && !tieneValor(r[p.id]))
    .map(p => p.id);
}

// Promedio global normalizado a escala 0-10 (a partir de las scale5 que cuentan)
export function calcularPromedio(r: Respuestas): number | null {
  const vals = SECCIONES.flatMap(s => s.preguntas)
    .filter(p => p.tipo === "scale5" && !p.excluirDePromedio)
    .map(p => r[p.id])
    .filter((v): v is number => typeof v === "number" && v > 0);
  if (vals.length === 0) return null;
  const media5 = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round((media5 / 5) * 10 * 10) / 10;
}

export function valorAnimo(r: Respuestas): number | null {
  const v = r["animo"];
  return typeof v === "number" ? Math.round((v / 5) * 10 * 10) / 10 : null;
}
