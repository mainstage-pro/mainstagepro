/**
 * Mapa de fusión del currículo de capacitación: 148 temas → 66.
 *
 * `survivor` es el #numero de la sesión que se conserva (mantiene id, progreso,
 * versiones y evaluación). `absorbe` son los #numero cuyo contenido se copia al
 * survivor y cuya fila se elimina. `copiaDe` toma contenido de una sesión que
 * pertenece a OTRO grupo (temas que se parten en dos destinos) sin eliminarla.
 */
export type Fusion = {
  cat: string;
  subArea: string;
  titulo: string;
  descripcion: string;
  duracion: number;
  survivor: number;
  absorbe: number[];
  copiaDe?: number[];
};

export const FUSIONES: Fusion[] = [
  // ─────────────────────────── INDUCCIÓN (general) ───────────────────────────
  {
    cat: "general", subArea: "Inducción", survivor: 1, absorbe: [2, 3, 130], duracion: 90,
    titulo: "Quiénes somos: identidad, organigrama, servicios y clientes",
    descripcion: "Qué es Mainstage Pro, cómo estamos organizados, qué servicios ofrecemos y a qué clientes sí atendemos.",
  },
  {
    cat: "general", subArea: "Inducción", survivor: 4, absorbe: [5, 6, 7], duracion: 90,
    titulo: "Los eventos que producimos: musicales, sociales, corporativos y otros",
    descripcion: "Los cuatro segmentos que atendemos: qué necesita cada uno, quién nos contrata y qué estándar debemos cumplir.",
  },
  {
    cat: "general", subArea: "Inducción", survivor: 8, absorbe: [9, 10, 11, 158, 159], duracion: 120,
    titulo: "Nuestro inventario: audio, iluminación, video y estructuras",
    descripcion: "El inventario completo por categoría: qué es cada equipo, para qué sirve, cómo se cuida y por qué define nuestra capacidad.",
  },
  {
    cat: "general", subArea: "Inducción", survivor: 12, absorbe: [13, 14], duracion: 120,
    titulo: "Anatomía técnica de un evento: musical, social y corporativo",
    descripcion: "De qué elementos se compone cada tipo de evento: PA, delays, fills, monitoreo, video, streaming e iluminación.",
  },
  {
    cat: "general", subArea: "Inducción", survivor: 15, absorbe: [], duracion: 60,
    titulo: "El equipo humano: por qué el personal técnico es el corazón de la operación",
    descripcion: "Planta vs. freelance, cómo se elige a un técnico y cómo se construye un banco confiable.",
  },

  // ─────────────────────────────── DIRECCIÓN ────────────────────────────────
  {
    cat: "direccion", subArea: "Estrategia y Planeación", survivor: 101, absorbe: [102, 103], duracion: 90,
    titulo: "Estrategia: visión, temporada y selección de proyectos",
    descripcion: "Visión, misión y metas del año; capacidad instalada y punto de equilibrio; cuándo un evento no nos conviene.",
  },
  {
    cat: "direccion", subArea: "Cultura y Liderazgo", survivor: 104, absorbe: [105, 106], duracion: 90,
    titulo: "Cultura y liderazgo: valores, retroalimentación y estándar del responsable",
    descripcion: "Cómo se viven los valores en decisiones reales, cómo se da feedback y qué se espera de quien coordina un área.",
  },
  {
    cat: "direccion", subArea: "Finanzas Estratégicas y Rentabilidad", survivor: 107, absorbe: [108, 109], duracion: 90,
    titulo: "Rentabilidad y decisiones de inversión",
    descripcion: "Leer la rentabilidad real del negocio, fijar el margen mínimo por tipo de evento y decidir entre comprar, contratar o subarrendar.",
  },
  {
    cat: "direccion", subArea: "Relaciones Institucionales y Alianzas", survivor: 110, absorbe: [111, 183], duracion: 90,
    titulo: "Relaciones institucionales y alianzas",
    descripcion: "Mapa de aliados (venues, proveedores, planners), cómo se desarrollan y cuidan, y cómo representamos a la empresa.",
  },
  {
    cat: "direccion", subArea: "Tablero Ejecutivo", survivor: 112, absorbe: [113], duracion: 60,
    titulo: "Tablero ejecutivo y ritmo de juntas",
    descripcion: "Cómo se lee el tablero de KPIs consolidado y cómo se estructura la junta de dirección.",
  },

  // ───────────────────────────── ADMINISTRACIÓN ─────────────────────────────
  {
    cat: "administracion", subArea: "Finanzas y Contabilidad", survivor: 114, absorbe: [115, 116], duracion: 90,
    titulo: "Pagos a personal y proveedores: política, extras y viáticos",
    descripcion: "Calendario y política de pago a freelance y proveedores, criterios de pago extra y reglas de viáticos.",
  },
  {
    cat: "administracion", subArea: "Finanzas y Contabilidad", survivor: 117, absorbe: [], duracion: 45,
    titulo: "Condiciones de pago, anticipos y cobranza",
    descripcion: "Qué porcentaje se pide, qué libera la operación y qué hacer si el pago no llega.",
  },
  {
    cat: "administracion", subArea: "Finanzas y Contabilidad", survivor: 120, absorbe: [], duracion: 45,
    titulo: "Facturación y CFDI",
    descripcion: "Datos fiscales, uso de CFDI, tiempos de emisión y errores comunes de facturación.",
  },
  {
    cat: "administracion", subArea: "Finanzas y Contabilidad", survivor: 118, absorbe: [121], duracion: 60,
    titulo: "Comprobación de gastos y caja chica",
    descripcion: "Ticket vs. factura vs. vale, plazos de comprobación y operación y reposición de la caja chica.",
  },
  {
    cat: "administracion", subArea: "Finanzas y Contabilidad", survivor: 119, absorbe: [141], duracion: 90,
    titulo: "Cierre financiero: costo real del evento y reporte mensual",
    descripcion: "Cerrar el costo real de un evento contra lo cotizado y leer el reporte financiero del mes.",
  },
  {
    cat: "administracion", subArea: "Finanzas y Contabilidad", survivor: 122, absorbe: [], duracion: 45,
    titulo: "Finanzas y nómina en la plataforma",
    descripcion: "Cómo se capturan movimientos, facturación y nómina en Mainstage Pro.",
  },
  {
    cat: "administracion", subArea: "Operaciones y Procesos", survivor: 135, absorbe: [136], duracion: 60,
    titulo: "Mainstage Pro: acceso, PWA, offline y por qué todo pasa por la plataforma",
    descripcion: "Acceso e instalación como app, uso offline y por qué la operación se ordena y se captura aquí.",
  },
  {
    cat: "administracion", subArea: "Operaciones y Procesos", survivor: 137, absorbe: [138], duracion: 90,
    titulo: "Hub de tareas, plan de trabajo y rendimiento operativo",
    descripcion: "Cómo se opera el trabajo diario desde el hub de tareas y cómo el módulo de rendimiento juzga si el plan funciona.",
  },
  {
    cat: "administracion", subArea: "Operaciones y Procesos", survivor: 139, absorbe: [140], duracion: 60,
    titulo: "Permisos, roles y trazabilidad",
    descripcion: "Cómo se controla qué ve y hace cada persona, y cómo la bitácora registra quién hizo qué.",
  },
  {
    cat: "administracion", subArea: "Recursos Humanos", survivor: 123, absorbe: [126], duracion: 90,
    titulo: "Integración de personal: criterios y filtro de freelance técnico",
    descripcion: "A quién sumamos al equipo, con qué criterios se evalúa y cómo se recluta y filtra un freelance técnico.",
  },
  {
    cat: "administracion", subArea: "Recursos Humanos", survivor: 124, absorbe: [127, 128], duracion: 90,
    titulo: "Alta del nuevo integrante: administrativo, documentos y plataforma",
    descripcion: "Alta, documentos obligatorios, cartas responsivas, accesos y ejecución del onboarding por puesto en la plataforma.",
  },
  {
    cat: "administracion", subArea: "Recursos Humanos", survivor: 125, absorbe: [129], copiaDe: [141], duracion: 90,
    titulo: "Reglamento interno, asistencia e incidencias",
    descripcion: "Horarios, retardos, faltas, permisos y consecuencias; registro y lectura del reporte de asistencia.",
  },
  {
    cat: "administracion", subArea: "Recursos Humanos", survivor: 132, absorbe: [], duracion: 45,
    titulo: "Comunicación interna y grupos de evento",
    descripcion: "Canales oficiales, cómo se opera un grupo por evento, tono y tiempos de respuesta.",
  },
  {
    cat: "administracion", subArea: "Recursos Humanos", survivor: 131, absorbe: [147], duracion: 60,
    titulo: "Confidencialidad, datos del cliente y derechos de imagen",
    descripcion: "Qué información del cliente es confidencial, qué se puede publicar y cuándo se pide autorización.",
  },

  // ─────────────────────────────── MARKETING ────────────────────────────────
  {
    cat: "marketing", subArea: "Content & Media Management", survivor: 142, absorbe: [145], duracion: 90,
    titulo: "Levantamiento de material y documentación de montajes",
    descripcion: "Qué se captura según el tipo de evento, su checklist, y cómo documentar un montaje para que sea contenido y no solo evidencia.",
  },
  {
    cat: "marketing", subArea: "Content & Media Management", survivor: 144, absorbe: [148], duracion: 60,
    titulo: "Organización, respaldo y captura del material",
    descripcion: "Estructura de carpetas y respaldo en Drive, y registro del levantamiento en la plataforma.",
  },
  {
    cat: "marketing", subArea: "Diseño Gráfico", survivor: 151, absorbe: [152, 143], duracion: 90,
    titulo: "Identidad de marca: visual y verbal",
    descripcion: "Logo, color, tipografía, plantillas y restricciones; y cómo suena Mainstage al comunicar.",
  },
  {
    cat: "marketing", subArea: "Diseño Gráfico", survivor: 153, absorbe: [154], duracion: 60,
    titulo: "Producción de piezas: material gráfico y módulo de Diseño",
    descripcion: "Formatos y entregables estándar, y cómo el módulo de diseño genera piezas y stories.",
  },
  {
    cat: "marketing", subArea: "Publicidad y Campañas", survivor: 149, absorbe: [150], duracion: 90,
    titulo: "Campañas pagadas: estructura, segmentación y presupuesto",
    descripcion: "Objetivo, público, segmentación, presupuesto y cuándo conviene pautar.",
  },
  {
    cat: "marketing", subArea: "Reportes y Métricas", survivor: 155, absorbe: [], duracion: 45,
    titulo: "Métricas de redes: lectura y reporte",
    descripcion: "Alcance, interacción y crecimiento: qué significan y cómo se reportan.",
  },

  // ───────────────────────────────── VENTAS ─────────────────────────────────
  {
    cat: "ventas", subArea: "Desarrollo de Herramientas de Venta", survivor: 156, absorbe: [157], duracion: 90,
    titulo: "Qué vendemos y por qué nos compran: servicios, nichos, cliente ideal y propuesta de valor",
    descripcion: "Los servicios, tipos de evento y nichos desde el ángulo comercial, y la propuesta de valor en una frase.",
  },
  {
    cat: "ventas", subArea: "Desarrollo de Herramientas de Venta", survivor: 160, absorbe: [161, 162], duracion: 90,
    titulo: "Portafolio comercial: equipo, producto, paquete y adicionales",
    descripcion: "Diferencia entre equipo individual, producto y paquete; adicionales por tipo y nicho; cómo se desarrolla un paquete nuevo.",
  },
  {
    cat: "ventas", subArea: "Desarrollo de Herramientas de Venta", survivor: 163, absorbe: [164], duracion: 60,
    titulo: "Herramientas de venta y presentaciones por tipo de evento",
    descripcion: "Qué herramientas tenemos, cuándo se usa cada una y cómo se comparten las presentaciones por tipo de evento.",
  },
  {
    cat: "ventas", subArea: "Prospección", survivor: 165, absorbe: [166, 146], duracion: 90,
    titulo: "Primer contacto: inbound, outbound y preguntas obligatorias",
    descripcion: "Atención de mensajes entrantes, prospección en frío y las preguntas que califican al prospecto desde el inicio.",
  },
  {
    cat: "ventas", subArea: "Cotizaciones, Seguimientos y Cierres", survivor: 168, absorbe: [167, 174], duracion: 90,
    titulo: "El trato en el CRM: cliente vs. prospecto, registro, avance y cadencia",
    descripcion: "Clasificación por Perfil, alta y etapas del trato, panel de siguiente paso, ritmo de seguimiento y cierre por perdido.",
  },
  {
    cat: "ventas", subArea: "Cotizaciones, Seguimientos y Cierres", survivor: 169, absorbe: [170, 171, 172], duracion: 120,
    titulo: "Cotizar: cotizador, técnicos, rider del cliente y faltantes",
    descripcion: "Armar la cotización con productos y paquetes, elegir técnicos por rol, cotizar contra un rider y resolver faltantes de equipo.",
  },
  {
    cat: "ventas", subArea: "Cotizaciones, Seguimientos y Cierres", survivor: 173, absorbe: [], duracion: 45,
    titulo: "Precios especiales y descuentos",
    descripcion: "Cuándo aplica un descuento, sus límites y autorización, y cómo se protege el margen mínimo.",
  },
  {
    cat: "ventas", subArea: "Cotizaciones, Seguimientos y Cierres", survivor: 175, absorbe: [176, 177], duracion: 90,
    titulo: "Cierre: objeciones, portales al cliente y contrato",
    descripcion: "Manejo de objeciones y señales de cierre, portales de propuesta/aprobación/brief, y contrato con firma digital.",
  },
  {
    cat: "ventas", subArea: "Cotizaciones, Seguimientos y Cierres", survivor: 178, absorbe: [20], duracion: 60,
    titulo: "Entrega de comercial a producción",
    descripcion: "Qué información se entrega, en qué formato y cuándo; cómo se lee una cotización aprobada desde producción.",
  },
  {
    cat: "ventas", subArea: "Atención a Clientes", survivor: 179, absorbe: [182], duracion: 60,
    titulo: "Comunicación con el cliente: tono comercial y manejo de quejas",
    descripcion: "Tono con prospectos y clientes, tiempos de respuesta, y cómo se atiende una queja hasta convertirla en lealtad.",
  },
  {
    cat: "ventas", subArea: "Atención a Clientes", survivor: 181, absorbe: [], duracion: 45,
    titulo: "Postventa: satisfacción, referidos y siguiente venta",
    descripcion: "Cierre con el cliente, encuesta de satisfacción, referidos y cómo se siembra la próxima venta.",
  },
  {
    cat: "ventas", subArea: "Reportes y Métricas", survivor: 184, absorbe: [], duracion: 45,
    titulo: "Comisiones a vendedores",
    descripcion: "Base de la comisión, cuándo se gana, cuándo se paga y casos especiales.",
  },
  {
    cat: "ventas", subArea: "Reportes y Métricas", survivor: 185, absorbe: [], duracion: 45,
    titulo: "Lectura del pipeline y KPIs comerciales",
    descripcion: "Etapas y valor del pipeline, tasa de conversión y ciclo de venta.",
  },

  // ──────────────────────────────── PRODUCCIÓN ───────────────────────────────
  {
    cat: "produccion", subArea: "Equipos", survivor: 25, absorbe: [206, 207, 208], duracion: 120,
    titulo: "Electro Voice: familia, configuraciones y montaje",
    descripcion: "La familia Electro Voice completa: configuraciones base, montaje a piso, en tripié y en poste, y display EKX con subwoofer.",
  },
  {
    cat: "produccion", subArea: "Equipos", survivor: 26, absorbe: [], copiaDe: [206], duracion: 60,
    titulo: "RCF: familia, configuraciones y usos",
    descripcion: "La familia RCF: configuraciones base, usos por escenario y buenas prácticas.",
  },
  {
    cat: "produccion", subArea: "Equipos", survivor: 27, absorbe: [], duracion: 60,
    titulo: "Pioneer y DJ setup",
    descripcion: "Equipo Pioneer y armado del setup de DJ: mixer, platos y controladores.",
  },
  {
    cat: "produccion", subArea: "Equipos", survivor: 28, absorbe: [], duracion: 60,
    titulo: "Entarimado y estructuras",
    descripcion: "Medidas, configuraciones, capacidad de carga y limitaciones del entarimado y las estructuras.",
  },
  {
    cat: "produccion", subArea: "Equipos", survivor: 29, absorbe: [], duracion: 60,
    titulo: "Pantalla LED y video",
    descripcion: "Pantallas LED y de proyección, procesadores de video y manejo de señales.",
  },
  {
    cat: "produccion", subArea: "Prácticas y Capacitaciones Técnicas", survivor: 209, absorbe: [210, 211, 212, 215], duracion: 120,
    titulo: "Cadena de audio: micrófonos, stagebox, consolas, in-ear y estructura de ganancia",
    descripcion: "La cadena de señal completa: selección de micrófonos, stagebox, consola análoga vs. digital, monitoreo in-ear y estructura de ganancia.",
  },
  {
    cat: "produccion", subArea: "Prácticas y Capacitaciones Técnicas", survivor: 203, absorbe: [204, 205], duracion: 90,
    titulo: "Operar según tipo de evento y rol: audio e iluminación",
    descripcion: "Cómo cambia la operación de audio e iluminación entre evento social, musical y corporativo, y qué ajusta cada rol técnico.",
  },
  {
    cat: "produccion", subArea: "Prácticas y Capacitaciones Técnicas", survivor: 214, absorbe: [213, 216], duracion: 90,
    titulo: "Electricidad: fundamentos, centros de carga y prevención de riesgo",
    descripcion: "Voltaje, corriente y potencia; fases y balanceo; centros de carga; aterrizaje, protección y prevención de riesgo eléctrico.",
  },
  {
    cat: "produccion", subArea: "Prácticas y Capacitaciones Técnicas", survivor: 217, absorbe: [18], duracion: 90,
    titulo: "Rigging, alturas y manejo de cargas",
    descripcion: "Puntos de anclaje, capacidad de carga, revisión de estructuras, equipo de protección y verificación antes de izar.",
  },
  {
    cat: "produccion", subArea: "Prácticas y Capacitaciones Técnicas", survivor: 201, absorbe: [202], duracion: 90,
    titulo: "Montaje en venue: descarga, distribución, cableado y estética",
    descripcion: "Acceso y logística del venue, descarga ordenada, distribución del equipo, ruteo de cable y estética del montaje.",
  },
  {
    cat: "produccion", subArea: "Prácticas y Capacitaciones Técnicas", survivor: 219, absorbe: [], duracion: 90,
    titulo: "Operación técnica de un evento de principio a fin con Mainstage Pro",
    descripcion: "Recorrido completo de cómo un técnico opera un evento apoyándose en Mainstage Pro: de la asignación al cierre y su evaluación de rendimiento.",
  },
  {
    cat: "produccion", subArea: "Orden y Control de Bodega", survivor: 200, absorbe: [186, 23], duracion: 120,
    titulo: "Carga, descarga y orden de bodega",
    descripcion: "Técnica de carga y descarga, distribución y sujeción en transporte, zonas y etiquetado de bodega, y por qué el orden es operativo y económico.",
  },
  {
    cat: "produccion", subArea: "Orden y Control de Bodega", survivor: 187, absorbe: [188], duracion: 90,
    titulo: "Control de inventario: entradas, salidas y levantamiento físico",
    descripcion: "Registro de salida y entrada de equipo, estado al volver, conteo físico y conciliación con la plataforma.",
  },
  {
    cat: "produccion", subArea: "Mantenimiento y Servicio a Equipos", survivor: 189, absorbe: [134], duracion: 90,
    titulo: "Cuidado del equipo: mantenimiento preventivo y protocolo ante daño, pérdida o robo",
    descripcion: "Preventivo vs. correctivo, rutina de revisión y señales de desgaste; qué hacer y cómo se documenta un incidente de equipo.",
  },
  {
    cat: "produccion", subArea: "Pre Producción Técnica", survivor: 191, absorbe: [19, 192], duracion: 120,
    titulo: "Del rider al plan de producción: lectura, listado, ficha técnica y plan",
    descripcion: "Qué es un rider y cómo se lee, cómo se traduce a listado de equipo y checklist de salida, y cómo se arma la ficha técnica y el plan de producción.",
  },
  {
    cat: "produccion", subArea: "Pre Producción Técnica", survivor: 21, absorbe: [], duracion: 60,
    titulo: "Coordinación previa: asignación de roles, junta previa y checklist de salida",
    descripcion: "Todo lo que pasa antes de salir a campo: roles, descansos y relevos, junta previa, checklist y grupo del evento.",
  },
  {
    cat: "produccion", subArea: "Pre Producción Técnica", survivor: 190, absorbe: [17, 133], duracion: 90,
    titulo: "Subarriendo: cuándo, con quién y con qué términos",
    descripcion: "Cuándo se subarrienda, cómo se elige y cotiza a un proveedor, términos y responsabilidad del equipo, e impacto en la rentabilidad.",
  },
  {
    cat: "produccion", subArea: "Coordinación de Producción", survivor: 193, absorbe: [16, 194, 195], duracion: 120,
    titulo: "Roles y perfiles del equipo técnico: del auxiliar al coordinador",
    descripcion: "FOH, monitores, luces, video, rigging, auxiliar y coordinador; los perfiles Técnico, Operador e Ingeniero; y cómo interactúan en el evento.",
  },
  {
    cat: "produccion", subArea: "Coordinación de Producción", survivor: 199, absorbe: [180], duracion: 60,
    titulo: "El cliente y el venue: imagen, conducta y escalamiento en sitio",
    descripcion: "Vestimenta y presentación, trato con el cliente y el venue, cómo se reciben solicitudes en sitio y cuándo se escala.",
  },
  {
    cat: "produccion", subArea: "Coordinación de Producción", survivor: 196, absorbe: [22], duracion: 120,
    titulo: "Las jornadas del evento: montaje, operación y desmontaje",
    descripcion: "El ciclo completo del día: llegada y reconocimiento, montaje, soundcheck, operación, imprevistos, desmontaje y regreso a bodega.",
  },
  {
    cat: "produccion", subArea: "Coordinación de Producción", survivor: 198, absorbe: [], copiaDe: [18], duracion: 45,
    titulo: "Protocolo de emergencias",
    descripcion: "Tipos de emergencia, primeros pasos, cadena de mando y reporte posterior.",
  },
  {
    cat: "produccion", subArea: "Coordinación de Producción", survivor: 197, absorbe: [24], duracion: 90,
    titulo: "Cierre del evento: avance, reporte y aprendizajes",
    descripcion: "Revisión y limpieza al regreso, documentación de incidencias, reporte de coordinación, cierre del proyecto y aprendizajes registrados.",
  },
  {
    cat: "produccion", subArea: "Reportes y Métricas", survivor: 218, absorbe: [], duracion: 45,
    titulo: "Lectura del reporte de uso de equipos y rendimiento",
    descripcion: "Uso y rotación de equipo, equipo más y menos usado, y rendimiento operativo.",
  },
];
