// Cultura y estrategia — fuente única de la cascada institucional.
//
// Identidad (propósito/misión/visión + valores) → Meta global del periodo →
// Objetivos SMART por área → Tácticas. El avance de un objetivo NO se captura a
// mano: se deriva del estado de sus tácticas. Los textos de abajo son la semilla
// con la que nace el módulo; a partir de ahí se editan en la plataforma y la
// base de datos manda.

export type EstadoTactica = "PENDIENTE" | "EN_PROCESO" | "BLOQUEADO" | "COMPLETADO";
export type UnidadMeta = "%" | "$" | "número" | "días" | "ratio";
export type TipoConducta = "ESPERADA" | "INACEPTABLE";

export const ESTADOS_TACTICA: { value: EstadoTactica; label: string; color: string }[] = [
  { value: "PENDIENTE", label: "Pendiente", color: "#6b7280" },
  { value: "EN_PROCESO", label: "En proceso", color: "#3b82f6" },
  { value: "BLOQUEADO", label: "Bloqueado", color: "#ef4444" },
  { value: "COMPLETADO", label: "Completado", color: "#22c55e" },
];

export const UNIDADES_META: UnidadMeta[] = ["%", "$", "número", "días", "ratio"];

/** Slugs de kpi-calculators.ts que pueden leer su valor solos. */
export const KPI_OPCIONES = [
  { slug: "", label: "Captura manual" },
  { slug: "ingresos-totales", label: "Ingresos totales ($)" },
  { slug: "utilidad-neta", label: "Utilidad neta (%)" },
  { slug: "eventos-vendidos", label: "Eventos vendidos (número)" },
  { slug: "ticket-promedio", label: "Ticket promedio ($)" },
  { slug: "costo-de-ventas", label: "Costo de ventas (%)" },
] as const;

export interface Conducta {
  texto: string;
  tipo: TipoConducta;
  bajaInmediata?: boolean;
}

// ── Identidad institucional ──────────────────────────────────────────────────

export const IDENTIDAD_SEED = {
  frase: "Creamos experiencias que generan impacto.",
  proposito:
    "Existimos para que lo que sucede arriba de un escenario deje algo en la vida de quien lo vive. " +
    "Creemos que un show bien producido no es un servicio: es un recuerdo, y merece hacerse bien. " +
    "Por eso elevamos el estándar de la producción de eventos en nuestra región, para que ningún " +
    "promotor, artista ni público tenga que conformarse con menos — y para que la gente que hace " +
    "posible cada evento crezca al mismo ritmo que la experiencia que crea.",
  mision:
    "Somos una empresa de producción y dirección técnica de eventos en vivo. Planeamos, coordinamos y " +
    "ejecutamos conciertos, festivales, ferias y eventos de gran formato con método, infraestructura y " +
    "personal propios, para que promotores y artistas encuentren en Querétaro y el Bajío el nivel de " +
    "producción que antes tenían que traer de otra ciudad. No rentamos equipo: producimos eventos.",
  vision:
    "Para 2031 Mainstage Pro es la casa de producción de referencia del Bajío y opera en todo el país: " +
    "un equipo pequeño y excepcional, con un coordinador dueño de cada área, capaz de sostener pocos " +
    "eventos pero muy grandes — conciertos, festivales y ferias — con inventario, transporte, personal " +
    "técnico y alianzas suficientes para tomar cualquier producción musical sin depender de terceros ni " +
    "de su director. 25 millones de pesos de facturación anual con 25% de utilidad.",
  aQuienNoServimos:
    "No servimos a quien ve la producción como un gasto y no como parte del show; a quien pretende " +
    "resolver a la mera hora lo que se planea con semanas; ni a quien no siente pasión por lo que pasa " +
    "arriba del escenario. Preferimos perder un evento antes que entregar uno del que no estemos orgullosos.",
} as const;

// ── Valores ──────────────────────────────────────────────────────────────────
// Derivados de conducta real, no de póster: lo que se premia y lo que cuesta el puesto.

export interface ValorSeed {
  nombre: string;
  descripcion: string;
  comoSeVive: string;
  conductas: Conducta[];
}

export const VALORES_SEED: ValorSeed[] = [
  {
    nombre: "Honestidad",
    descripcion:
      "La verdad es la base del negocio. Decimos las cosas como son, a tiempo, aunque incomoden, " +
      "y cuidamos lo que no es nuestro.",
    comoSeVive: "Avisas del problema antes de que se note, y cotizas lo que realmente cuesta.",
    conductas: [
      { texto: "Reportar un error o un faltante en cuanto se detecta, sin esperar a que pregunten", tipo: "ESPERADA" },
      { texto: "Reconocer lo que no se sabe hacer y pedir apoyo", tipo: "ESPERADA" },
      { texto: "Cuidar el equipo, el dinero y la información de la empresa y del cliente", tipo: "ESPERADA" },
      { texto: "Robar o disponer de lo que no es propio", tipo: "INACEPTABLE", bajaInmediata: true },
      { texto: "Mentir u ocultar información que afecte un evento, un cobro o al equipo", tipo: "INACEPTABLE", bajaInmediata: true },
    ],
  },
  {
    nombre: "Anticipación",
    descripcion:
      "El evento se gana antes del evento. Planeamos, preguntamos y resolvemos en papel lo que otros " +
      "resuelven a gritos en el montaje.",
    comoSeVive: "Llegas con el rider revisado, el faltante detectado y la ruta prevista.",
    conductas: [
      { texto: "Revisar el rider y la logística completos días antes de cargar", tipo: "ESPERADA" },
      { texto: "Avisar faltantes, riesgos o cambios con la mayor anticipación posible", tipo: "ESPERADA" },
      { texto: "Puntualidad en montajes, juntas y entregas", tipo: "ESPERADA" },
      { texto: "Dejar para el día del evento lo que se podía cerrar con semanas", tipo: "INACEPTABLE" },
      { texto: "Negligencia que ponga en riesgo a personas, al equipo o al evento", tipo: "INACEPTABLE", bajaInmediata: true },
    ],
  },
  {
    nombre: "Resolución",
    descripcion:
      "Buscamos el cómo sí. Frente a un problema se propone una solución, no se busca un culpable.",
    comoSeVive: "Traes opciones, no solo el problema.",
    conductas: [
      { texto: "Presentar el problema junto con al menos una alternativa de solución", tipo: "ESPERADA" },
      { texto: "Tomar decisiones dentro de su alcance sin esperar instrucción", tipo: "ESPERADA" },
      { texto: "Escalar a tiempo lo que excede su alcance", tipo: "ESPERADA" },
      { texto: "Quedarse esperando indicaciones frente a un problema evidente", tipo: "INACEPTABLE" },
    ],
  },
  {
    nombre: "Orden y limpieza",
    descripcion:
      "Nuestra bodega, nuestro cableado y nuestros registros hablan de nosotros antes de que suene el " +
      "primer golpe. El orden es parte del resultado técnico.",
    comoSeVive: "El equipo regresa como salió o mejor, y el sistema queda al día.",
    conductas: [
      { texto: "Cableado peinado y escenario limpio en cada montaje", tipo: "ESPERADA" },
      { texto: "Devolver el equipo revisado, completo y en su lugar", tipo: "ESPERADA" },
      { texto: "Mantener los registros de la plataforma al día el mismo día", tipo: "ESPERADA" },
      { texto: "Dejar el desorden o el pendiente para el siguiente turno", tipo: "INACEPTABLE" },
    ],
  },
  {
    nombre: "Mejora continua",
    descripcion:
      "Cada evento deja un aprendizaje y el siguiente tiene que salir mejor. Dar el extra no es trabajar " +
      "más horas: es buscar siempre una mejor manera de hacerlo.",
    comoSeVive: "Propones la mejora que nadie te pidió.",
    conductas: [
      { texto: "Cerrar cada evento con un reporte honesto de lo que falló y lo que mejoró", tipo: "ESPERADA" },
      { texto: "Proponer mejoras de proceso, herramienta o técnica", tipo: "ESPERADA" },
      { texto: "Buscar capacitarse por cuenta propia en su especialidad", tipo: "ESPERADA" },
      { texto: "Conformismo sostenido: “así siempre lo hemos hecho”", tipo: "INACEPTABLE", bajaInmediata: true },
    ],
  },
  {
    nombre: "Respeto",
    descripcion:
      "Trato digno al compañero, al cliente, al proveedor, al artista y al público, sin importar la " +
      "presión del momento.",
    comoSeVive: "Bajo presión sigues tratando bien a la gente.",
    conductas: [
      { texto: "Escuchar y hablar bien de los colegas, dentro y fuera del evento", tipo: "ESPERADA" },
      { texto: "Atender al artista y al cliente con el mismo cuidado que al equipo propio", tipo: "ESPERADA" },
      { texto: "Faltas de respeto, gritos o descalificaciones al equipo o a terceros", tipo: "INACEPTABLE" },
      { texto: "Consumir estupefacientes o alcohol durante la jornada o el evento", tipo: "INACEPTABLE", bajaInmediata: true },
    ],
  },
  {
    nombre: "Pasión por el show",
    descripcion:
      "Nos mueve lo que pasa cuando el audio, la luz y el video se juntan frente a un público. " +
      "Quien no siente eso, no encaja aquí.",
    comoSeVive: "Te quedas a ver el show que ayudaste a montar.",
    conductas: [
      { texto: "Interés genuino por el oficio: audio, iluminación, video y producción en vivo", tipo: "ESPERADA" },
      { texto: "Orgullo por el resultado final, no solo por la tarea propia", tipo: "ESPERADA" },
      { texto: "Tratar el evento como un trámite y no como una experiencia para alguien", tipo: "INACEPTABLE" },
    ],
  },
];

// ── Meta global del periodo ──────────────────────────────────────────────────

export const META_GLOBAL_SEED = {
  periodo: "2027",
  titulo: "Crecer 50% en ventas sosteniendo 25% de utilidad",
  descripcion:
    "El periodo se gana con dos números que no se negocian: vender 50% más que el año anterior y " +
    "cerrar con 25% de utilidad. Crecer sin utilidad nos endeuda más; cuidar la utilidad sin crecer " +
    "nos deja del mismo tamaño. Todo objetivo de área debe poder explicarse contra uno de los dos.",
  fechaInicio: "2027-01-01",
  fechaFin: "2027-12-31",
  indicadores: [
    { nombre: "Crecimiento en ventas vs. año anterior", unidad: "%" as UnidadMeta, valorMeta: 50, kpiSlug: "" },
    { nombre: "Ventas del periodo", unidad: "$" as UnidadMeta, valorMeta: null, kpiSlug: "ingresos-totales" },
    { nombre: "Utilidad neta", unidad: "%" as UnidadMeta, valorMeta: 25, kpiSlug: "utilidad-neta" },
  ],
};

// ── Áreas ────────────────────────────────────────────────────────────────────
// `areaPermiso` es el puente con las llaves de acceso que ya usa la plataforma
// (AREA_MODULE_PRESETS en nav.ts y Puesto.area): Comercial↔VENTAS, Operaciones↔PRODUCCION.

export interface TacticaSeed {
  descripcion: string;
}
export interface ObjetivoSeed {
  descripcion: string;
  metrica: string;
  unidad: UnidadMeta;
  lineaBase: number | null;
  valorMeta: number | null;
  kpiSlug?: string;
  fechaLimite: string;
  tacticas: string[];
}
export interface AreaSeed {
  codigo: string;
  nombre: string;
  areaPermiso: string;
  proposito: string;
  objetivos: ObjetivoSeed[];
}

export const AREAS_SEED: AreaSeed[] = [
  {
    codigo: "DIRECCION",
    nombre: "Dirección",
    areaPermiso: "DIRECCION",
    proposito:
      "Diseñar el negocio en lugar de operarlo. Dirección existe para marcar el rumbo, construir el " +
      "sistema con el que trabaja la empresa y formar a los coordinadores que lo sostienen, de modo que " +
      "Mainstage pueda crecer y producir sin depender de una sola persona.",
    objetivos: [
      {
        descripcion:
          "Sacar a la dirección de la ejecución operativa: reducir al 30% los eventos en los que el " +
          "director asume un rol operativo, liberando su tiempo para estrategia y relaciones comerciales.",
        metrica: "Eventos del periodo con el director en rol operativo",
        unidad: "%",
        lineaBase: 100,
        valorMeta: 30,
        fechaLimite: "2027-12-31",
        tacticas: [
          "Definir el puesto de coordinador de Operaciones con sus resultados clave y contratarlo",
          "Entregar 3 eventos completos a un coordinador, con dirección presente solo en la revisión",
          "Documentar en la plataforma el método de producción para que no viva en la cabeza del director",
          "Instituir la junta semanal de área de 45 minutos como único canal de control operativo",
        ],
      },
      {
        descripcion:
          "Tener un dueño real por área: cubrir las 5 áreas con un responsable formal, con puesto " +
          "documentado, plan de trabajo activo y fit cultural verificado contra los valores.",
        metrica: "Áreas con responsable formal y plan de trabajo activo",
        unidad: "número",
        lineaBase: 2,
        valorMeta: 5,
        fechaLimite: "2027-09-30",
        tacticas: [
          "Publicar vacantes derivadas del registro de puesto, con los valores y conductas esperadas visibles",
          "Filtrar candidatos contra los no negociables antes de la entrevista técnica",
          "Completar el onboarding por puesto dentro de los primeros 30 días de cada ingreso",
          "Evaluar cada área una vez al mes contra su propósito y sus objetivos",
        ],
      },
      {
        descripcion:
          "Instalar el ritmo de gestión que hoy no existe: que el 95% de las semanas del periodo cierren " +
          "con junta semanal, visión semanal capturada y reporte mensual de área entregado.",
        metrica: "Semanas del periodo con el ritmo de gestión completo",
        unidad: "%",
        lineaBase: 0,
        valorMeta: 95,
        fechaLimite: "2027-12-31",
        tacticas: [
          "Agenda fija de junta semanal por área, con minuta y compromisos en la plataforma",
          "Revisión mensual del marco estratégico: avance de tácticas y objetivos en riesgo",
          "Cerrar el estado de resultados antes del día 10 de cada mes para decidir con datos",
          "Revisar el tablero de cascada al inicio de cada junta de dirección",
        ],
      },
    ],
  },
  {
    codigo: "ADMINISTRACION",
    nombre: "Administración",
    areaPermiso: "ADMINISTRACION",
    proposito:
      "Cuidar el dinero y el orden de la empresa para que el equipo pueda producir sin fricción. " +
      "Administración existe para cobrar a tiempo, pagar con orden y decir la verdad financiera, " +
      "de modo que cada decisión se tome sobre números reales y no sobre suposiciones.",
    objetivos: [
      {
        descripcion:
          "Terminar con el flujo de efectivo negativo: cerrar los 12 meses del periodo con flujo " +
          "operativo positivo, sin recurrir a crédito nuevo para cubrir la operación.",
        metrica: "Meses del periodo con flujo operativo positivo",
        unidad: "número",
        lineaBase: null,
        valorMeta: 12,
        fechaLimite: "2027-12-31",
        tacticas: [
          "Cobrar el anticipo dentro de las 24 horas siguientes al cierre de la venta",
          "Condicionar el montaje a la liquidación el día del evento, sin excepciones no autorizadas",
          "Calendario de cobranza con alerta 3 días antes de cada vencimiento",
          "No comprometer compras ni rentas de un evento hasta que su anticipo esté cobrado",
        ],
      },
      {
        descripcion:
          "Bajar el endeudamiento que hoy frena el crecimiento: reducir 40% el saldo de créditos y " +
          "deudas respecto al cierre del año anterior.",
        metrica: "Reducción del saldo de créditos y deudas",
        unidad: "%",
        lineaBase: 0,
        valorMeta: 40,
        fechaLimite: "2027-12-31",
        tacticas: [
          "Renegociar plazo y tasa de los créditos más caros durante el primer trimestre",
          "Destinar un porcentaje fijo de cada liquidación de evento a amortización de deuda",
          "Congelar compras de inventario que no estén atadas a un evento ya vendido",
          "Revisión mensual del saldo de deuda en la junta de dirección",
        ],
      },
      {
        descripcion:
          "Cierre financiero confiable y a tiempo: entregar el estado de resultados de los 12 meses del " +
          "periodo antes del día 10 del mes siguiente, con la utilidad por evento calculada.",
        metrica: "Cierres mensuales entregados antes del día 10",
        unidad: "número",
        lineaBase: null,
        valorMeta: 12,
        fechaLimite: "2027-12-31",
        tacticas: [
          "Captura diaria de movimientos financieros, sin acumular semanas",
          "Conciliación bancaria semanal",
          "Mantener el catálogo de gastos recurrentes al día",
          "Comparar costo estimado contra costo real de cada evento dentro de los 7 días posteriores",
        ],
      },
    ],
  },
  {
    codigo: "MARKETING",
    nombre: "Marketing",
    areaPermiso: "MARKETING",
    proposito:
      "Hacer que Mainstage sea conocida y creída antes de la primera llamada. Marketing existe para " +
      "mostrar el nivel real de lo que producimos, para que el promotor llegue convencido y el área " +
      "comercial no tenga que empezar de cero cada vez.",
    objetivos: [
      {
        descripcion:
          "Construir un sistema de generación de leads que no dependa de quién esté disponible: llegar " +
          "a 20 leads calificados al mes de forma sostenida.",
        metrica: "Leads calificados por mes",
        unidad: "número",
        lineaBase: null,
        valorMeta: 20,
        fechaLimite: "2027-06-30",
        tacticas: [
          "Mantener una campaña de publicidad siempre activa con presupuesto mensual fijo",
          "Landing y formulario por tipo de evento, conectados al CRM",
          "Responder todo lead entrante en menos de 1 hora en horario laboral",
          "Medir costo por lead calificado cada mes y recortar lo que no funciona",
        ],
      },
      {
        descripcion:
          "Producción de contenido constante que demuestre el nivel técnico: publicar 6 videos " +
          "promocionales al mes durante todo el periodo.",
        metrica: "Videos promocionales publicados en el periodo",
        unidad: "número",
        lineaBase: null,
        valorMeta: 72,
        fechaLimite: "2027-12-31",
        tacticas: [
          "Grabar aftermovie en todo evento grande, con responsable de foto y video asignado en el proyecto",
          "Cerrar el calendario editorial del mes siguiente el día 25 de cada mes",
          "Publicar un carrusel informativo por semana",
          "Publicar una ficha de equipo de inventario al mes",
        ],
      },
      {
        descripcion:
          "Portafolio que venda solo: documentar y publicar el caso de cada evento grande del periodo " +
          "dentro de los 15 días posteriores al evento.",
        metrica: "Eventos grandes con caso documentado y publicado",
        unidad: "%",
        lineaBase: null,
        valorMeta: 100,
        fechaLimite: "2027-12-31",
        tacticas: [
          "Checklist de captura de material fotográfico y de video dentro de la ficha operativa",
          "Actualizar cada trimestre las presentaciones por tipo de evento con los casos nuevos",
          "Pedir testimonio al promotor dentro de la semana posterior al evento",
        ],
      },
    ],
  },
  {
    codigo: "COMERCIAL",
    nombre: "Comercial",
    areaPermiso: "VENTAS",
    proposito:
      "Ayudar al promotor a que su evento salga mejor de lo que imaginó. Comercial existe para entender " +
      "qué necesita realmente el show y proponer la producción que lo logra — vendiendo dirección técnica " +
      "y no fierros, y cerrando solo lo que podemos cumplir con orgullo.",
    objetivos: [
      {
        descripcion:
          "Crecer las ventas 50% respecto al año anterior con un sistema de venta que no se apague: " +
          "prospección, seguimiento y cierre ocurriendo cada semana, no por temporada.",
        metrica: "Ventas del periodo",
        unidad: "$",
        lineaBase: null,
        valorMeta: null,
        kpiSlug: "ingresos-totales",
        fechaLimite: "2027-12-31",
        tacticas: [
          "Dar seguimiento a todo lead en menos de 24 horas y entregar propuesta en menos de 72 horas",
          "Dos visitas o llamadas de relación comercial por semana a promotores, venues y productoras",
          "Recuperar a los clientes sin evento en los últimos 12 meses, uno por semana",
          "Junta comercial semanal de revisión de pipeline por etapa",
        ],
      },
      {
        descripcion:
          "Subir el ticket promedio 30%: completar de forma genuina la solución del cliente en cada " +
          "evento ya agendado, en lugar de perseguir más eventos pequeños.",
        metrica: "Ticket promedio por evento",
        unidad: "$",
        lineaBase: null,
        valorMeta: null,
        kpiSlug: "ticket-promedio",
        fechaLimite: "2027-12-31",
        tacticas: [
          "Revisar el rider con el cliente antes de cerrar, para detectar lo que le falta al show y ofrecerlo como mejora del resultado",
          "Ofrecer la dirección técnica como línea propia en toda propuesta, no como cortesía",
          "Usar paquetes base por tipo y tamaño de evento para hacer visible el siguiente nivel",
          "Presentar toda propuesta con tres niveles, explicando qué gana el evento en cada uno",
        ],
      },
      {
        descripcion:
          "Hacer predecible el pipeline: mantener en todo momento al menos 3 eventos grandes " +
          "confirmados con 60 días o más de anticipación.",
        metrica: "Eventos grandes confirmados con 60+ días de anticipación",
        unidad: "número",
        lineaBase: null,
        valorMeta: 3,
        fechaLimite: "2027-12-31",
        tacticas: [
          "Formalizar alianzas con 5 promotores, venues o productoras recurrentes",
          "Cerrar la agenda de cada temporada con 90 días de anticipación",
          "Mantener la etapa de cada trato actualizada en el CRM como condición de la junta semanal",
        ],
      },
    ],
  },
  {
    codigo: "OPERACIONES",
    nombre: "Operaciones",
    areaPermiso: "PRODUCCION",
    proposito:
      "Convertir lo vendido en una experiencia impecable. Operaciones existe para planear el evento en " +
      "papel antes de tocarlo con las manos, coordinar a quien lo ejecuta y garantizar que el equipo " +
      "salga orgulloso de cada montaje — eso es lo que nos distingue del gremio.",
    objetivos: [
      {
        descripcion:
          "Cero improvisación: que el 95% de los proyectos tengan brief, rider y cronología cerrados al " +
          "menos 7 días antes del evento.",
        metrica: "Proyectos con planeación cerrada 7 días antes",
        unidad: "%",
        lineaBase: null,
        valorMeta: 95,
        fechaLimite: "2027-12-31",
        tacticas: [
          "Junta de producción obligatoria 10 días antes de cada evento",
          "Generar ficha operativa y hoja de entrega desde la plataforma, no en papel suelto",
          "Cerrar las solicitudes a proveedores 7 días antes del montaje",
          "Checklist de carga revisado y firmado antes de salir de bodega",
        ],
      },
      {
        descripcion:
          "Cero fallas críticas frente al público: ninguna falla crítica de equipo durante los eventos " +
          "del periodo.",
        metrica: "Fallas críticas de equipo durante evento",
        unidad: "número",
        lineaBase: null,
        valorMeta: 0,
        fechaLimite: "2027-12-31",
        tacticas: [
          "Reporte de fallas obligatorio al cierre de cada evento",
          "Programa de mantenimiento preventivo del inventario, con calendario propio",
          "Definir redundancia del equipo crítico en cada rider antes de cargar",
          "Capacitación técnica por sub-área para el personal que opera equipo crítico",
        ],
      },
      {
        descripcion:
          "Sostener la rentabilidad del periodo desde la operación: margen bruto de al menos 45% por " +
          "evento, cuidando personal, transporte y rentas a terceros.",
        metrica: "Margen bruto promedio por evento",
        unidad: "%",
        lineaBase: null,
        valorMeta: 45,
        fechaLimite: "2027-12-31",
        tacticas: [
          "Comparar costo estimado contra real de cada evento en los 7 días posteriores",
          "Rentar a terceros solo con proveedor autorizado y precio negociado previamente",
          "Optimizar transporte y personal por evento desde la planeación, no en el montaje",
          "Medir horas reales de montaje contra las planeadas y ajustar el estándar",
        ],
      },
    ],
  },
];

// ── Cálculo de avance, riesgo y alertas ──────────────────────────────────────

export interface TacticaCalc {
  estado: string;
  fechaEjecucion?: Date | string | null;
}

/** Avance del objetivo = tácticas completadas / tácticas totales. No es editable a mano. */
export function progresoObjetivo(tacticas: TacticaCalc[]): number {
  if (!tacticas.length) return 0;
  const hechas = tacticas.filter(t => t.estado === "COMPLETADO").length;
  return Math.round((hechas / tacticas.length) * 100);
}

/** Una táctica está vencida si pasó su fecha de ejecución y no está completada. */
export function tacticaVencida(t: TacticaCalc, ahora = new Date()): boolean {
  if (t.estado === "COMPLETADO" || !t.fechaEjecucion) return false;
  return new Date(t.fechaEjecucion) < ahora;
}

export type EstadoObjetivo = "SIN_TACTICAS" | "COMPLETADO" | "EN_RIESGO" | "EN_CURSO";

/**
 * Un objetivo entra "En riesgo" si alguna de sus tácticas venció sin completarse,
 * si hay una táctica bloqueada, o si su propia fecha límite ya pasó sin llegar al 100%.
 */
export function estadoObjetivo(
  tacticas: TacticaCalc[],
  fechaLimite?: Date | string | null,
  ahora = new Date()
): EstadoObjetivo {
  if (!tacticas.length) return "SIN_TACTICAS";
  const progreso = progresoObjetivo(tacticas);
  if (progreso === 100) return "COMPLETADO";
  const bloqueada = tacticas.some(t => t.estado === "BLOQUEADO");
  const vencida = tacticas.some(t => tacticaVencida(t, ahora));
  const limitePasado = !!fechaLimite && new Date(fechaLimite) < ahora;
  if (bloqueada || vencida || limitePasado) return "EN_RIESGO";
  return "EN_CURSO";
}

export const ESTADO_OBJETIVO_META: Record<EstadoObjetivo, { label: string; color: string }> = {
  SIN_TACTICAS: { label: "Sin tácticas", color: "#6b7280" },
  EN_CURSO: { label: "En curso", color: "#3b82f6" },
  EN_RIESGO: { label: "En riesgo", color: "#ef4444" },
  COMPLETADO: { label: "Completado", color: "#22c55e" },
};

/** Formatea un valor según la unidad de la métrica, para mostrarlo en tarjetas y árbol. */
export function formatValorMeta(valor: number | null | undefined, unidad: string): string {
  if (valor === null || valor === undefined) return "—";
  if (unidad === "$") return `$${valor.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
  if (unidad === "%") return `${valor.toLocaleString("es-MX", { maximumFractionDigits: 1 })}%`;
  if (unidad === "días") return `${valor} días`;
  return valor.toLocaleString("es-MX", { maximumFractionDigits: 2 });
}

/** Parse seguro de las conductas guardadas como JSON en ValorEmpresa.conductas. */
export function parseConductas(s?: string | null): Conducta[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    if (!Array.isArray(v)) return [];
    return v.filter((c): c is Conducta => !!c && typeof c.texto === "string");
  } catch {
    return [];
  }
}

/** Conductas que cuestan el puesto: alimentan la vacante, el acuerdo y la evaluación. */
export function noNegociables(valores: { nombre: string; conductas?: string | null }[]): string[] {
  const out: string[] = [];
  for (const v of valores) {
    for (const c of parseConductas(v.conductas)) {
      if (c.tipo === "INACEPTABLE" && c.bajaInmediata) out.push(c.texto);
    }
  }
  return out;
}
