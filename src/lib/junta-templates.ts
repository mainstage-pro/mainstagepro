// Templates de agenda para cada tipo de junta.
// Son constantes TypeScript — no van a BD. Los AgendaItem se generan al crear la junta.

export type TipoAgenda =
  | "RESULTADOS"
  | "COMPROMISOS"
  | "BLOQUEO"
  | "DECISION"
  | "ACUERDO"
  | "AVISO"
  | "RECONOCIMIENTO"
  | "KPI_REVIEW"
  | "CUSTOM"
  | "APERTURA"
  | "EVENTOS_SEMANA"
  | "PRIORIDADES_SEMANA"
  | "CIERRE";

export type AreaJunta =
  | "GLOBAL"
  | "DIRECCION"
  | "ADMINISTRACION"
  | "MARKETING"
  | "VENTAS"
  | "PRODUCCION";

export type TipoJunta =
  | "GLOBAL_SEMANAL"
  | "AREA_SEMANAL"
  | "REVISION_MENSUAL"
  | "EXTRAORDINARIA"
  | "CAPACITACION";

export type EstadoJunta = "PROGRAMADA" | "EN_CURSO" | "COMPLETADA" | "CANCELADA";

export interface AgendaItemTemplate {
  orden: number;
  tipo: TipoAgenda;
  titulo: string;
  descripcion?: string;
  placeholder?: string | null;
}

export interface JuntaTemplate {
  nombre: string;
  area: AreaJunta;
  tipo: TipoJunta;
  duracionMin: number;
  descripcion: string;
  responsable?: string;
  proyectoGestionNombre?: string; // Nombre del proyecto en Gestión Operativa
  horaDefault: string; // HH:MM
  agendaItems: AgendaItemTemplate[];
}

export const JUNTA_TEMPLATES: Record<string, JuntaTemplate> = {
  GLOBAL_SEMANAL: {
    nombre: "Junta Global",
    area: "GLOBAL",
    tipo: "GLOBAL_SEMANAL",
    duracionMin: 30,
    horaDefault: "10:30",
    descripcion: "Todo el equipo. Resultados semana anterior, prioridades, avisos.",
    agendaItems: [
      {
        orden: 1,
        tipo: "APERTURA",
        titulo: "Apertura",
        descripcion: "Una sola frase. El tono y la energía de la semana. Mauricio dirige, el equipo escucha.",
        placeholder: "Frase de apertura:",
      },
      {
        orden: 2,
        tipo: "EVENTOS_SEMANA",
        titulo: "Eventos de la semana anterior",
        descripcion: "Tú comunicas, no el equipo presenta. Nombre del evento, venue, quién estuvo. Si hubo algo relevante lo mencionas en una línea.",
        placeholder: "Notas sobre eventos de la semana:",
      },
      {
        orden: 3,
        tipo: "PRIORIDADES_SEMANA",
        titulo: "Objetivos y prioridades de la semana",
        descripcion: "Mauricio marca el rumbo. Próximos eventos, proyectos con atención requerida, y los objetivos concretos que mueven el negocio esta semana.",
        placeholder: null,
      },
      {
        orden: 4,
        tipo: "AVISO",
        titulo: "Anuncios generales",
        descripcion: "Nuevos clientes, cambios de proceso, actualizaciones de plataforma, fechas importantes.",
        placeholder: "Anuncios:",
      },
      {
        orden: 5,
        tipo: "RECONOCIMIENTO",
        titulo: "Reconocimientos",
        descripcion: "Máximo 2. Nombre + logro específico. Breve y genuino.",
        placeholder: null,
      },
      {
        orden: 6,
        tipo: "CIERRE",
        titulo: "Cierre",
        descripcion: "Una frase de arranque. Se van a las juntas de área.",
        placeholder: "Frase de cierre:",
      },
    ],
  },

  ADMINISTRACION: {
    nombre: "Junta Administración — Área",
    area: "ADMINISTRACION",
    tipo: "AREA_SEMANAL",
    duracionMin: 45,
    horaDefault: "11:00",
    descripcion: "Revisión financiera, KPIs de admin, compromisos y bloqueo.",
    responsable: "Emiliano Pérez",
    proyectoGestionNombre: "2. Administración",
    agendaItems: [
      {
        orden: 1,
        tipo: "RESULTADOS",
        titulo: "Resultados vs compromisos semana anterior",
        descripcion: "Emiliano presenta qué logró vs lo que se comprometió la semana pasada.",
        placeholder: "¿Qué se logró?\n\n¿Qué no se logró y por qué?",
      },
      {
        orden: 2,
        tipo: "KPI_REVIEW",
        titulo: "KPIs de Administración",
        descripcion: "Números clave del área esta semana.",
        placeholder:
          "CxC vencidas sin gestión: $___\nFlujo de caja proyectado: ___\nPagos a técnicos en tiempo: ___/___\nRentabilidad registrada eventos: ___\nReporte semanal entregado en tiempo: Sí / No",
      },
      {
        orden: 3,
        tipo: "COMPROMISOS",
        titulo: "3 prioridades para la siguiente semana",
        descripcion: "Emiliano define sus 3 compromisos. Mauricio valida o ajusta.",
        placeholder: "1.\n2.\n3.",
      },
      {
        orden: 4,
        tipo: "BLOQUEO",
        titulo: "Bloqueo principal",
        descripcion: "Un problema que necesita decisión o apoyo de Mauricio.",
        placeholder: "El bloqueo es:\n\nOpciones que veo:\n\nMi recomendación:",
      },
      {
        orden: 5,
        tipo: "DECISION",
        titulo: "Decisión de Mauricio",
        descripcion: "Mauricio decide, aprueba o da dirección sobre el bloqueo.",
        placeholder: "Decisión tomada:",
      },
      {
        orden: 6,
        tipo: "ACUERDO",
        titulo: "Acuerdos y tareas generadas",
        descripcion: "Registro de compromisos y tareas asignadas en esta junta.",
        placeholder: "Las tareas se registran abajo automáticamente en Gestión Operativa.",
      },
    ],
  },

  MARKETING: {
    nombre: "Junta Marketing — Área",
    area: "MARKETING",
    tipo: "AREA_SEMANAL",
    duracionMin: 45,
    horaDefault: "11:45",
    descripcion: "Contenido, campañas, leads, documentación y estrategia.",
    responsable: "Sebastián Pérez",
    proyectoGestionNombre: "3. Marketing",
    agendaItems: [
      {
        orden: 1,
        tipo: "RESULTADOS",
        titulo: "Resultados vs compromisos semana anterior",
        descripcion: "Sebastián presenta qué logró vs lo que se comprometió.",
        placeholder: "¿Qué se logró?\n\n¿Qué no se logró y por qué?",
      },
      {
        orden: 2,
        tipo: "KPI_REVIEW",
        titulo: "KPIs de Marketing",
        descripcion: "Métricas de la semana.",
        placeholder:
          "Leads calificados generados: ___\nCosto por lead: $___\nCrecimiento seguidores: ___\nTasa conversión lead→oportunidad: ___%\nEventos documentados en tiempo: ___\nCampañas activas: ___",
      },
      {
        orden: 3,
        tipo: "COMPROMISOS",
        titulo: "3 prioridades para la siguiente semana",
        descripcion: "Sebastián define sus 3 compromisos. Mauricio valida.",
        placeholder: "1.\n2.\n3.",
      },
      {
        orden: 4,
        tipo: "BLOQUEO",
        titulo: "Bloqueo principal",
        descripcion: "Un problema que necesita decisión o apoyo de Mauricio.",
        placeholder: "El bloqueo es:\n\nOpciones:\n\nMi recomendación:",
      },
      {
        orden: 5,
        tipo: "DECISION",
        titulo: "Decisión de Mauricio",
        descripcion: "Dirección sobre el bloqueo o aprobación de creativos/presupuesto.",
        placeholder: "Decisión tomada:",
      },
      {
        orden: 6,
        tipo: "ACUERDO",
        titulo: "Acuerdos y tareas generadas",
        descripcion: "Compromisos y tareas que salen de esta junta.",
        placeholder: "Tareas registradas abajo en Gestión Operativa — Proyecto Marketing.",
      },
    ],
  },

  VENTAS: {
    nombre: "Junta Ventas — Área",
    area: "VENTAS",
    tipo: "AREA_SEMANAL",
    duracionMin: 45,
    horaDefault: "12:30",
    descripcion: "Pipeline, oportunidades, cierres, prospección y propuesta de valor.",
    responsable: "Mauricio Hernández",
    proyectoGestionNombre: "4. Ventas",
    agendaItems: [
      {
        orden: 1,
        tipo: "RESULTADOS",
        titulo: "Resultados comerciales vs compromisos",
        descripcion: "Revisión de ingresos cerrados, oportunidades abiertas y tasa de cierre.",
        placeholder:
          "Ingresos cerrados: $___\nOportunidades nuevas: ___\nTasa de cierre: ___%\nTicket promedio: $___",
      },
      {
        orden: 2,
        tipo: "KPI_REVIEW",
        titulo: "Estado del pipeline",
        descripcion: "Oportunidades activas, prioridades de cierre esta semana.",
        placeholder:
          "Oportunidades en pipeline: ___\nPrioridades de cierre esta semana:\n1.\n2.\n3.\nProspectos outbound contactados: ___",
      },
      {
        orden: 3,
        tipo: "COMPROMISOS",
        titulo: "3 prioridades comerciales para la siguiente semana",
        descripcion: "Qué oportunidades requieren acción, qué relaciones hay que mover.",
        placeholder: "1.\n2.\n3.",
      },
      {
        orden: 4,
        tipo: "BLOQUEO",
        titulo: "Bloqueo o decisión necesaria",
        descripcion: "Descuento fuera de política, contrato, precio especial, alianza.",
        placeholder: "El bloqueo es:\n\nContexto:\n\nOpciones:\n\nRecomendación:",
      },
      {
        orden: 5,
        tipo: "DECISION",
        titulo: "Decisión tomada",
        descripcion: "Mauricio aprueba, ajusta o delega.",
        placeholder: "Decisión:",
      },
      {
        orden: 6,
        tipo: "ACUERDO",
        titulo: "Acuerdos y tareas de seguimiento",
        descripcion: "Tareas concretas de prospección, seguimiento o cierre.",
        placeholder: "Tareas generadas:",
      },
    ],
  },

  PRODUCCION: {
    nombre: "Junta Producción — Área",
    area: "PRODUCCION",
    tipo: "AREA_SEMANAL",
    duracionMin: 45,
    horaDefault: "13:15",
    descripcion: "Bodega, logística, eventos próximos, vehículos y cierre de eventos.",
    responsable: "Carlos Luna",
    proyectoGestionNombre: "5. Producción",
    agendaItems: [
      {
        orden: 1,
        tipo: "RESULTADOS",
        titulo: "Resultados de producción semana anterior",
        descripcion: "Eventos ejecutados, incidencias, inventario, reportes entregados.",
        placeholder:
          "Eventos ejecutados: ___\nIncidencias mayores: ___\nReportes post-evento entregados en tiempo: ___\nInventario auditado: Sí / No\nFaltantes o daños detectados:",
      },
      {
        orden: 2,
        tipo: "KPI_REVIEW",
        titulo: "KPIs de Producción",
        descripcion: "Estado de bodega, eventos próximos y estado de equipos.",
        placeholder:
          "Eventos sin incidencia mayor: ___/___\nEquipo regresado completo: ___/___\nEventos con plan de producción con 72hrs anticipación: ___/___\nDesviación costo real vs cotizado: ___%\nFreelancers satisfechos: ___/10",
      },
      {
        orden: 3,
        tipo: "COMPROMISOS",
        titulo: "3 prioridades para la siguiente semana",
        descripcion: "Qué eventos vienen, qué preparar, qué resolver en bodega.",
        placeholder: "1.\n2.\n3.",
      },
      {
        orden: 4,
        tipo: "BLOQUEO",
        titulo: "Bloqueo principal",
        descripcion: "Equipo dañado, subrenta necesaria, freelancer faltante, presupuesto.",
        placeholder: "El bloqueo es:\n\nOpciones:\n\nRecomendación de Carlos:",
      },
      {
        orden: 5,
        tipo: "DECISION",
        titulo: "Decisión de Mauricio",
        descripcion: "Autorización de subrenta, compra de equipo, contratación.",
        placeholder: "Decisión:",
      },
      {
        orden: 6,
        tipo: "ACUERDO",
        titulo: "Acuerdos y checklist de la semana",
        descripcion: "Tareas concretas para bodega, logística y campo.",
        placeholder: "Tareas generadas para producción:",
      },
    ],
  },

  DIRECCION: {
    nombre: "Junta Dirección — Área",
    area: "DIRECCION",
    tipo: "AREA_SEMANAL",
    duracionMin: 45,
    horaDefault: "11:00",
    descripcion: "Estrategia, plataforma, crecimiento, evaluación de equipo.",
    responsable: "Mauricio Hernández",
    proyectoGestionNombre: "1. Dirección",
    agendaItems: [
      {
        orden: 1,
        tipo: "RESULTADOS",
        titulo: "Avances estratégicos de la semana",
        descripcion: "Deep work ejecutado, plataforma, ventas estratégicas.",
        placeholder:
          "¿Qué avancé en estrategia?\n\n¿Qué decisiones tomé?\n\n¿Qué quedó pendiente?",
      },
      {
        orden: 2,
        tipo: "KPI_REVIEW",
        titulo: "Semáforo de empresa",
        descripcion: "Estado general de los 7 indicadores del semáforo.",
        placeholder:
          "Ingresos del mes: $___\nRentabilidad: ___%\nCxC vencidas: ___\nLeads en pipeline: ___\nEventos confirmados siguiente mes: ___\nFlujo de caja: ___\nInventario: ___",
      },
      {
        orden: 3,
        tipo: "COMPROMISOS",
        titulo: "Prioridad estratégica de la semana",
        descripcion: "La cosa más importante que Mauricio debe lograr personalmente.",
        placeholder:
          "Prioridad #1 esta semana:\n\nDeep work bloques Mar/Jue:\n- Martes:\n- Jueves:",
      },
      {
        orden: 4,
        tipo: "BLOQUEO",
        titulo: "Decisiones estratégicas pendientes",
        descripcion: "Decisiones que no se tomaron y deben resolverse.",
        placeholder: "Decisiones pendientes:\n\n¿Qué necesito para decidir?",
      },
      {
        orden: 5,
        tipo: "ACUERDO",
        titulo: "Ajustes estratégicos",
        descripcion: "Cambios en metas, procesos, personas o plataforma.",
        placeholder: "Ajustes definidos:",
      },
    ],
  },

  REVISION_MENSUAL: {
    nombre: "Revisión mensual profunda",
    area: "GLOBAL",
    tipo: "REVISION_MENSUAL",
    duracionMin: 120,
    horaDefault: "09:00",
    descripcion: "Último viernes de cada mes. Revisión de KPIs, semáforo, ajustes estratégicos.",
    responsable: "Mauricio Hernández + Emiliano Pérez",
    proyectoGestionNombre: "1. Dirección",
    agendaItems: [
      {
        orden: 1,
        tipo: "KPI_REVIEW",
        titulo: "KPIs consolidados del mes — todas las áreas",
        descripcion: "Emiliano presenta el resumen mensual de KPIs de todas las áreas.",
        placeholder:
          "VENTAS: Ingresos $___ / Meta $___ / Cumplimiento ___%\nMARKETING: Leads ___ / CPL $___ / Conversión ___%\nPRODUCCIÓN: Eventos ___ / Incidencias ___ / Satisfacción ___\nADMIN: Rentabilidad ___%  CxC vencidas $___\nEQUIPO: Satisfacción ___/10",
      },
      {
        orden: 2,
        tipo: "KPI_REVIEW",
        titulo: "Semáforo de salud del negocio",
        descripcion: "Los 7 indicadores del semáforo con su color actual.",
        placeholder:
          "Ingresos: 🟢🟡🔴\nRentabilidad: 🟢🟡🔴\nCxC: 🟢🟡🔴\nLeads: 🟢🟡🔴\nEventos confirmados: 🟢🟡🔴\nFlujo de caja: 🟢🟡🔴\nInventario: 🟢🟡🔴\n\nSemáforo general:",
      },
      {
        orden: 3,
        tipo: "RESULTADOS",
        titulo: "¿Qué funcionó este mes?",
        descripcion: "Análisis de lo que sí se logró y por qué.",
        placeholder: "Lo que funcionó:\n\nPor qué funcionó:",
      },
      {
        orden: 4,
        tipo: "BLOQUEO",
        titulo: "¿Qué no funcionó y por qué?",
        descripcion: "Análisis honesto de fallas, desviaciones y áreas en rojo.",
        placeholder:
          "Lo que no funcionó:\n\nCausa raíz:\n\nQué se va a hacer diferente:",
      },
      {
        orden: 5,
        tipo: "DECISION",
        titulo: "Ajustes estratégicos del siguiente mes",
        descripcion: "Cambios en metas, procesos, personas, precios o plataforma.",
        placeholder:
          "Ajustes definidos:\n\nResponsable de cada ajuste:\n\nFecha de revisión:",
      },
      {
        orden: 6,
        tipo: "ACUERDO",
        titulo: "Compromisos para el siguiente mes",
        descripcion: "Tareas y proyectos que salen de la revisión mensual.",
        placeholder: "Compromisos registrados abajo.",
      },
    ],
  },
};

// Labels y colores para UI
export const AREA_LABELS: Record<AreaJunta, string> = {
  GLOBAL: "Global",
  DIRECCION: "Dirección",
  ADMINISTRACION: "Administración",
  MARKETING: "Marketing",
  VENTAS: "Ventas",
  PRODUCCION: "Producción",
};

export const AREA_COLORS: Record<AreaJunta, { bg: string; text: string; border: string }> = {
  GLOBAL:         { bg: "bg-white/10",          text: "text-white",       border: "border-white/20" },
  DIRECCION:      { bg: "bg-[#B3985B]/15",       text: "text-[#B3985B]",  border: "border-[#B3985B]/30" },
  ADMINISTRACION: { bg: "bg-blue-900/20",        text: "text-blue-400",   border: "border-blue-800/30" },
  MARKETING:      { bg: "bg-purple-900/20",      text: "text-purple-400", border: "border-purple-800/30" },
  VENTAS:         { bg: "bg-green-900/20",       text: "text-green-400",  border: "border-green-800/30" },
  PRODUCCION:     { bg: "bg-orange-900/20",      text: "text-orange-400", border: "border-orange-800/30" },
};

export const TIPO_AGENDA_LABELS: Record<TipoAgenda, string> = {
  RESULTADOS:        "Resultados",
  COMPROMISOS:       "Compromisos",
  BLOQUEO:           "Bloqueo",
  DECISION:          "Decisión",
  ACUERDO:           "Acuerdo",
  AVISO:             "Aviso",
  RECONOCIMIENTO:    "Reconocimiento",
  KPI_REVIEW:        "KPIs",
  CUSTOM:            "Tema libre",
  APERTURA:          "Apertura",
  EVENTOS_SEMANA:    "Eventos semana",
  PRIORIDADES_SEMANA:"Prioridades",
  CIERRE:            "Cierre",
};

export const TIPO_AGENDA_COLORS: Record<TipoAgenda, string> = {
  RESULTADOS:         "text-blue-400",
  COMPROMISOS:        "text-[#B3985B]",
  BLOQUEO:            "text-red-400",
  DECISION:           "text-green-400",
  ACUERDO:            "text-green-300",
  AVISO:              "text-gray-400",
  RECONOCIMIENTO:     "text-yellow-400",
  KPI_REVIEW:         "text-purple-400",
  CUSTOM:             "text-gray-500",
  APERTURA:           "text-[#B3985B]",
  EVENTOS_SEMANA:     "text-blue-300",
  PRIORIDADES_SEMANA: "text-emerald-400",
  CIERRE:             "text-[#B3985B]",
};

// Lunes de la semana actual (útil para defaultear fecha de junta)
export function getLunesActual(): Date {
  const hoy = new Date();
  const dia = hoy.getDay(); // 0=Dom, 1=Lun, ...
  const diff = dia === 0 ? 1 : dia === 1 ? 0 : -(dia - 1);
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
}

// Combina una fecha (Date) con una hora "HH:MM" en un ISO string local
export function combinarFechaHora(fecha: Date, hora: string): string {
  const [hh, mm] = hora.split(":").map(Number);
  const d = new Date(fecha);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}
