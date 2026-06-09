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
  | "MODALIDAD"
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
    nombre: "Junta General",
    area: "GLOBAL",
    tipo: "GLOBAL_SEMANAL",
    duracionMin: 30,
    horaDefault: "10:30",
    descripcion: "Todo el equipo. Recap fin de semana, eventos próximos, enfoque, reconocimientos y avisos.",
    agendaItems: [
      {
        orden: 1,
        tipo: "APERTURA",
        titulo: "Introducción a la junta",
        descripcion: "¿Cómo les fue el fin de semana? Mauricio abre la junta con energía positiva. El tono aquí marca el ritmo de toda la semana.",
        placeholder: "Notas de apertura: ¿cómo les fue el fin de semana?",
      },
      {
        orden: 2,
        tipo: "EVENTOS_SEMANA",
        titulo: "Eventos del fin de semana pasado",
        descripcion: "Solo los eventos de la última semana. Nombre del evento, venue, quién estuvo, qué salió bien y qué podemos mejorar.",
        placeholder: "Notas sobre los eventos del fin de semana:",
      },
      {
        orden: 3,
        tipo: "PRIORIDADES_SEMANA",
        titulo: "Eventos próximos",
        descripcion: "Eventos confirmados de las próximas semanas. Al final, mencionar posibles eventos sin confirmar pero que probablemente se harán.",
        placeholder: "Notas sobre eventos próximos y posibles eventos sin confirmar:",
      },
      {
        orden: 4,
        tipo: "AVISO",
        titulo: "Enfoque de la semana",
        descripcion: "El enfoque principal como equipo esta semana. Una dirección clara para que todos remen hacia el mismo lado.",
        placeholder: "Enfoque de la semana para todo el equipo:",
      },
      {
        orden: 5,
        tipo: "RECONOCIMIENTO",
        titulo: "Reconocimientos",
        descripcion: "Individual o grupal. Máx 2. Nombre + logro específico. Breve y genuino. Dejar espacio si no hay algo en el momento.",
        placeholder: "Reconocimientos:",
      },
      {
        orden: 6,
        tipo: "AVISO",
        titulo: "Avisos y anuncios",
        descripcion: "Cambios de proceso, fechas importantes, nuevos clientes, actualizaciones de plataforma o cualquier anuncio del equipo.",
        placeholder: "Avisos y anuncios:",
      },
    ],
  },

  ADMINISTRACION: {
    nombre: "Junta Administración",
    area: "ADMINISTRACION",
    tipo: "AREA_SEMANAL",
    duracionMin: 40,
    horaDefault: "11:00",
    descripcion: "Flujo, cobros, pagos, equipo y compromisos de la semana.",
    responsable: "Emiliano Pérez",
    proyectoGestionNombre: "2. Administración",
    agendaItems: [
      {
        orden: 1,
        tipo: "MODALIDAD",
        titulo: "Modalidad de la junta",
        descripcion: "¿Cómo se está llevando esta junta?",
        placeholder: null,
      },
      {
        orden: 2,
        tipo: "APERTURA",
        titulo: "Apertura",
        descripcion: "¿Cómo está el equipo? ¿Algo que aclarar antes de arrancar?",
        placeholder: "Notas de apertura:",
      },
      {
        orden: 3,
        tipo: "RESULTADOS",
        titulo: "¿Cómo quedó la semana?",
        descripcion: "Revisión de los compromisos de la semana anterior.",
        placeholder: "¿Qué se cumplió?\n\n¿Qué quedó pendiente y por qué?\n\n¿Hay algo que impacta esta semana?",
      },
      {
        orden: 4,
        tipo: "CUSTOM",
        titulo: "Flujo y finanzas",
        descripcion: "Estado actual del dinero, cobros y pagos de la semana.",
        placeholder: "Flujo actual: ___\n\nClientes por cobrar esta semana:\n- \n- \n\nProveedores por pagar esta semana:\n- \n- \n\nCierres del fin de semana pasado (cobros pendientes):\n\nPagos del fin de semana por liquidar:\n\nServicios extraordinarios no contemplados en el brief:",
      },
      {
        orden: 5,
        tipo: "CUSTOM",
        titulo: "Equipo",
        descripcion: "Reporte de asistencias y cumplimiento del plan de trabajo.",
        placeholder: "Asistencias semana anterior — ¿alguna anomalía?:\n\nCumplimiento de plan de trabajo (resumen del equipo):\n\nAlgo relevante del estado del equipo:",
      },
      {
        orden: 6,
        tipo: "BLOQUEO",
        titulo: "Bloqueos y necesidades",
        descripcion: "¿Qué necesitas de Mauricio o de otra área para avanzar esta semana?",
        placeholder: "Bloqueo 1:\n  - Situación: \n  - Opciones que veo: \n  - Lo que necesito: \n\nBloqueo 2 (si aplica):\n  - Situación: \n  - Opciones que veo: \n  - Lo que necesito:",
      },
      {
        orden: 7,
        tipo: "DECISION",
        titulo: "Propuesta de mejora",
        descripcion: "¿Qué cambiaríamos en el área esta semana para trabajar mejor? El equipo propone, Mauricio captura y decide.",
        placeholder: "Propuesta:\n\nDecisión de Mauricio: ✅ Se implementa / 🔄 Se evalúa / ❌ No aplica\n\nRazón:",
      },
      {
        orden: 8,
        tipo: "COMPROMISOS",
        titulo: "3 compromisos de la semana",
        descripcion: "El responsable define 3 compromisos concretos. La siguiente semana se revisan aquí.",
        placeholder: "1. [QUÉ] — [QUIÉN] — [PARA CUÁNDO]\n2.\n3.",
      },
    ],
  },

  MARKETING: {
    nombre: "Junta Marketing",
    area: "MARKETING",
    tipo: "AREA_SEMANAL",
    duracionMin: 40,
    horaDefault: "11:45",
    descripcion: "Contenido, campañas, resultados y compromisos del área.",
    responsable: "Sebastián Pérez",
    proyectoGestionNombre: "3. Marketing",
    agendaItems: [
      {
        orden: 1,
        tipo: "MODALIDAD",
        titulo: "Modalidad de la junta",
        descripcion: "¿Cómo se está llevando esta junta?",
        placeholder: null,
      },
      {
        orden: 2,
        tipo: "APERTURA",
        titulo: "Apertura",
        descripcion: "¿Cómo está el equipo? ¿Algo que aclarar antes de arrancar?",
        placeholder: "Notas de apertura:",
      },
      {
        orden: 3,
        tipo: "RESULTADOS",
        titulo: "¿Cómo quedó la semana?",
        descripcion: "Revisión de compromisos de la semana anterior.",
        placeholder: "¿Qué se cumplió?\n\n¿Qué quedó pendiente y por qué?\n\n¿Hay algo que impacta esta semana?",
      },
      {
        orden: 4,
        tipo: "CUSTOM",
        titulo: "Contenido de la semana",
        descripcion: "¿Qué se publica esta semana? Estado del material.",
        placeholder: "Contenido orgánico / informativo:\n\nContenido de entretenimiento:\n\nBrief técnico de evento:\n\n¿Archivo de material actualizado? Sí / No\n\n¿Hay levantamiento o entrega de material esta semana? (día y evento):",
      },
      {
        orden: 5,
        tipo: "CUSTOM",
        titulo: "Campañas y proyectos",
        descripcion: "Estado de campañas activas y materiales pendientes.",
        placeholder: "Campañas activas — estado breve:\n- \n- \n\nMateriales pendientes de producir:\n- \n- \n\nCampañas de fechas especiales o temporada que hay que planear:",
      },
      {
        orden: 6,
        tipo: "RESULTADOS",
        titulo: "Resultado de la semana anterior",
        descripcion: "2 números clave para dar contexto rápido sin perderse en métricas.",
        placeholder: "Alcance / impresiones: ___\nInteracciones / leads generados: ___\n\nAlgo relevante del desempeño:",
      },
      {
        orden: 7,
        tipo: "BLOQUEO",
        titulo: "Bloqueos y necesidades",
        descripcion: "¿Qué necesitas de Mauricio o de otra área para avanzar esta semana?",
        placeholder: "Bloqueo 1:\n  - Situación: \n  - Opciones que veo: \n  - Lo que necesito: \n\nBloqueo 2 (si aplica):\n  - Situación: \n  - Opciones que veo: \n  - Lo que necesito:",
      },
      {
        orden: 8,
        tipo: "DECISION",
        titulo: "Propuesta de mejora",
        descripcion: "¿Qué cambiaríamos en el área esta semana para trabajar mejor?",
        placeholder: "Propuesta:\n\nDecisión de Mauricio: ✅ Se implementa / 🔄 Se evalúa / ❌ No aplica\n\nRazón:",
      },
      {
        orden: 9,
        tipo: "COMPROMISOS",
        titulo: "3 compromisos de la semana",
        descripcion: "El responsable define 3 compromisos concretos. La siguiente semana se revisan aquí.",
        placeholder: "1. [QUÉ] — [QUIÉN] — [PARA CUÁNDO]\n2.\n3.",
      },
    ],
  },

  VENTAS: {
    nombre: "Junta Ventas",
    area: "VENTAS",
    tipo: "AREA_SEMANAL",
    duracionMin: 40,
    horaDefault: "12:30",
    descripcion: "Pipeline, actividad comercial y compromisos de la semana.",
    agendaItems: [
      {
        orden: 1,
        tipo: "MODALIDAD",
        titulo: "Modalidad de la junta",
        descripcion: "¿Cómo se está llevando esta junta?",
        placeholder: null,
      },
      {
        orden: 2,
        tipo: "APERTURA",
        titulo: "Apertura",
        descripcion: "¿Cómo está el equipo? ¿Algo que aclarar antes de arrancar?",
        placeholder: "Notas de apertura:",
      },
      {
        orden: 3,
        tipo: "RESULTADOS",
        titulo: "¿Cómo quedó la semana?",
        descripcion: "Revisión de compromisos de la semana anterior.",
        placeholder: "¿Qué se cumplió?\n\n¿Qué quedó pendiente y por qué?\n\n¿Hay algo que impacta esta semana?",
      },
      {
        orden: 4,
        tipo: "CUSTOM",
        titulo: "Pipeline activo",
        descripcion: "¿Dónde está el dinero esta semana?",
        placeholder: "Tratos más cercanos al cierre:\n- [Cliente] — [Monto] — [Siguiente paso]\n- \n\nCotizaciones estancadas:\n- [Cliente] — Razón: falta info / precio de proveedor / material de venta\n- \n\nSeguimientos pendientes esta semana:\n- \n-",
      },
      {
        orden: 5,
        tipo: "CUSTOM",
        titulo: "Actividad de la semana",
        descripcion: "Agenda comercial y prospección.",
        placeholder: "Citas con clientes confirmadas:\n- [Nombre] — [Día y hora]\n- \n\nProspección outbound — ¿a quiénes vamos a contactar?:\n- \n- \n\n¿Hay campaña de temporada o fecha especial que activar?:\n\n¿Qué puede hacer Mauricio o el equipo para ayudar a cerrar algún trato esta semana?:",
      },
      {
        orden: 6,
        tipo: "BLOQUEO",
        titulo: "Bloqueos y necesidades",
        descripcion: "¿Qué necesitas de Mauricio o de otra área para avanzar?",
        placeholder: "Bloqueo 1:\n  - Situación: \n  - Opciones que veo: \n  - Lo que necesito: \n\nBloqueo 2 (si aplica):\n  - Situación: \n  - Opciones que veo: \n  - Lo que necesito:",
      },
      {
        orden: 7,
        tipo: "DECISION",
        titulo: "Propuesta de mejora",
        descripcion: "¿Qué cambiaríamos en el área para trabajar mejor?",
        placeholder: "Propuesta:\n\nDecisión de Mauricio: ✅ Se implementa / 🔄 Se evalúa / ❌ No aplica\n\nRazón:",
      },
      {
        orden: 8,
        tipo: "COMPROMISOS",
        titulo: "3 compromisos de la semana",
        descripcion: "El responsable define 3 compromisos concretos. La siguiente semana se revisan aquí.",
        placeholder: "1. [QUÉ] — [QUIÉN] — [PARA CUÁNDO]\n2.\n3.",
      },
    ],
  },

  PRODUCCION: {
    nombre: "Junta Producción",
    area: "PRODUCCION",
    tipo: "AREA_SEMANAL",
    duracionMin: 40,
    horaDefault: "13:15",
    descripcion: "Coordinación de eventos, inventario y compromisos de la semana.",
    responsable: "Carlos Luna",
    proyectoGestionNombre: "5. Producción",
    agendaItems: [
      {
        orden: 1,
        tipo: "MODALIDAD",
        titulo: "Modalidad de la junta",
        descripcion: "¿Cómo se está llevando esta junta?",
        placeholder: null,
      },
      {
        orden: 2,
        tipo: "APERTURA",
        titulo: "Apertura",
        descripcion: "¿Cómo está el equipo? ¿Algo que aclarar antes de arrancar?",
        placeholder: "Notas de apertura:",
      },
      {
        orden: 3,
        tipo: "RESULTADOS",
        titulo: "¿Cómo quedó la semana?",
        descripcion: "Revisión de compromisos de la semana anterior.",
        placeholder: "¿Qué se cumplió?\n\n¿Qué quedó pendiente y por qué?\n\n¿Hay algo que impacta esta semana?",
      },
      {
        orden: 4,
        tipo: "CUSTOM",
        titulo: "Coordinación de eventos — esta semana",
        descripcion: "Estado de los eventos que se ejecutan esta semana.",
        placeholder: "Evento 1: [Nombre] — Estado: ✅ Listo / ⚠️ Atención / ❌ Problema\n  - Técnicos: Confirmados / Falta: ___\n  - Proveedores: Confirmados / Falta: ___\n  - Transporte: Confirmado / Pendiente\n  - Brief / Información completa: Sí / No\n\nEvento 2: [Nombre] — Estado:\n  - Técnicos: \n  - Proveedores: \n  - Transporte: \n  - Brief:",
      },
      {
        orden: 5,
        tipo: "CUSTOM",
        titulo: "Eventos próximos — preparación",
        descripcion: "¿Qué falta para los eventos de las próximas semanas?",
        placeholder: "Evento próximo 1: [Nombre] — Fecha: ___\n  - ¿Qué falta? \n\nEvento próximo 2: [Nombre] — Fecha: ___\n  - ¿Qué falta?\n\n¿Algún evento con riesgo o información incompleta?",
      },
      {
        orden: 6,
        tipo: "CUSTOM",
        titulo: "Inventario / Bodega",
        descripcion: "Estado del equipo y bodega.",
        placeholder: "Equipos programados para revisión y limpieza esta semana:\n- \n\nEquipos en mantenimiento externo:\n- [Equipo] — Estado / Fecha estimada de regreso: ___\n\nEquipos que hay que entregar a proveedores:\n- \n\nFaltantes en inventario:\n- [Qué hace falta] — Urgencia: Alta / Media / Baja",
      },
      {
        orden: 7,
        tipo: "BLOQUEO",
        titulo: "Bloqueos y necesidades",
        descripcion: "¿Qué necesitas de Mauricio o de otra área para avanzar?",
        placeholder: "Bloqueo 1:\n  - Situación: \n  - Opciones que veo: \n  - Lo que necesito: \n\nBloqueo 2 (si aplica):\n  - Situación: \n  - Opciones que veo: \n  - Lo que necesito:",
      },
      {
        orden: 8,
        tipo: "DECISION",
        titulo: "Propuesta de mejora",
        descripcion: "¿Qué cambiaríamos en producción para trabajar mejor?",
        placeholder: "Propuesta:\n\nDecisión de Mauricio: ✅ Se implementa / 🔄 Se evalúa / ❌ No aplica\n\nRazón:",
      },
      {
        orden: 9,
        tipo: "COMPROMISOS",
        titulo: "3 compromisos de la semana",
        descripcion: "El responsable define 3 compromisos concretos. La siguiente semana se revisan aquí.",
        placeholder: "1. [QUÉ] — [QUIÉN] — [PARA CUÁNDO]\n2.\n3.",
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
  MODALIDAD:         "Modalidad",
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
  CUSTOM:             "text-gray-400",
  APERTURA:           "text-[#B3985B]",
  EVENTOS_SEMANA:     "text-blue-300",
  PRIORIDADES_SEMANA: "text-emerald-400",
  MODALIDAD:          "text-gray-500",
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
