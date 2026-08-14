// Currículo de capacitación de Mainstage Pro — 118 temas en 5 áreas y 24 sub-áreas.
// Fuente: reestructuración consolidada (área × sub-área del plan de trabajo).
// Cada tema trae una ficha semilla (descripción + objetivos + puntos base) lista
// para enriquecerse con el flujo de generación IA / edición en el portal.

export type Topic = {
  t: string; // título
  d: string; // descripción (1 frase)
  obj: string[]; // objetivos de aprendizaje
  pts: string[]; // puntos base (esqueleto del desarrollo)
};
export type SubArea = { sub: string; topics: Topic[] };
export type Area = {
  area: string; // etiqueta de bloque
  categoriaSlug: string; // slug de CategoriaCapacitacion
  categoriaNombre: string;
  letra: string; // bloqueLetra
  subs: SubArea[];
};

export const CURRICULO: Area[] = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    area: "Dirección",
    categoriaSlug: "direccion",
    categoriaNombre: "Dirección",
    letra: "A",
    subs: [
      {
        sub: "Estrategia y Planeación",
        topics: [
          {
            t: "Visión, misión y metas de Mainstage Pro",
            d: "Qué es Mainstage Pro, para qué existe y hacia dónde vamos este año.",
            obj: ["Explicar la visión, misión y valores de la empresa", "Reconocer las metas del año y el rol de cada área para lograrlas"],
            pts: ["Quiénes somos: historia y propósito de Mainstage Pro", "Visión y misión en palabras simples", "Metas del año: comerciales, operativas y de servicio", "Cómo cada área contribuye a esas metas"],
          },
          {
            t: "Planeación de temporada: capacidad instalada y punto de equilibrio",
            d: "Cómo se define la temporada según nuestra capacidad real de operar eventos.",
            obj: ["Entender qué es capacidad instalada y punto de equilibrio", "Leer cuántos eventos necesitamos para ser rentables"],
            pts: ["Qué es capacidad instalada (equipo + personal + días)", "Cómo se calcula el punto de equilibrio del mes", "Eventos objetivo por temporada", "Riesgos de sobrevender o subutilizar"],
          },
          {
            t: "Criterios de selección de proyectos: cuándo un evento no nos conviene",
            d: "Marco para decir sí o no a un proyecto con base en rentabilidad y riesgo.",
            obj: ["Aplicar criterios para aceptar o rechazar un proyecto", "Identificar señales de un evento que no conviene"],
            pts: ["Margen mínimo aceptable", "Riesgo técnico, logístico y de cobranza", "Choque de fechas y capacidad", "Cómo comunicar un 'no' profesional"],
          },
        ],
      },
      {
        sub: "Cultura y Liderazgo",
        topics: [
          {
            t: "Valores de Mainstage en la operación diaria",
            d: "Cómo se traducen nuestros valores en decisiones y conductas concretas.",
            obj: ["Reconocer los valores de la empresa", "Ejemplificar cada valor en situaciones reales de trabajo"],
            pts: ["Cuáles son nuestros valores", "Ejemplos de valor vivido vs. traicionado", "Cómo los valores guían decisiones difíciles", "Conductas que esperamos de todos"],
          },
          {
            t: "Retroalimentación y resolución de conflictos",
            d: "Cómo damos feedback y resolvemos fricciones dentro del equipo.",
            obj: ["Dar retroalimentación clara y respetuosa", "Resolver un conflicto sin escalarlo innecesariamente"],
            pts: ["Feedback: cuándo, cómo y en privado", "Separar la persona del problema", "Pasos para resolver un conflicto", "Cuándo escalar a dirección"],
          },
          {
            t: "Estándar de liderazgo del responsable de área",
            d: "Qué se espera de quien coordina un área o un evento.",
            obj: ["Definir las responsabilidades de un líder de área", "Aplicar el estándar de liderazgo en campo"],
            pts: ["El líder marca el estándar con el ejemplo", "Planear, delegar y dar seguimiento", "Cuidar a la gente y al equipo", "Rendir cuentas de resultados"],
          },
        ],
      },
      {
        sub: "Finanzas Estratégicas y Rentabilidad",
        topics: [
          {
            t: "Lectura de la rentabilidad del negocio",
            d: "Cómo leemos la rentabilidad real, más allá del monto vendido.",
            obj: ["Distinguir venta de utilidad", "Interpretar la rentabilidad de un periodo"],
            pts: ["Venta vs. costo vs. utilidad", "Costos fijos y variables de un evento", "Margen bruto y margen neto", "Dónde se fuga la rentabilidad"],
          },
          {
            t: "Criterios de inversión: compra, contratación o subarriendo",
            d: "Cuándo conviene comprar equipo, contratar personal o subarrendar.",
            obj: ["Comparar comprar vs. subarrendar vs. contratar", "Aplicar criterios de retorno de inversión"],
            pts: ["Uso esperado y recuperación de la inversión", "Costo de oportunidad de comprar", "Cuándo el subarriendo es más sano", "Contratar de planta vs. freelance"],
          },
          {
            t: "Definición del margen mínimo por tipo de evento",
            d: "Cómo se fija el margen piso según el tipo y riesgo del evento.",
            obj: ["Entender por qué el margen varía por tipo de evento", "Aplicar el margen mínimo al cotizar"],
            pts: ["Margen por tipo: social, musical, corporativo", "Riesgo y complejidad ajustan el margen", "Piso de margen no negociable", "Cómo se protege el margen en descuentos"],
          },
        ],
      },
      {
        sub: "Relaciones Institucionales y Alianzas",
        topics: [
          {
            t: "Gestión de alianzas clave: venues, proveedores y planners",
            d: "Quiénes son nuestros aliados estratégicos y cómo se cuidan.",
            obj: ["Identificar las alianzas clave del negocio", "Aplicar prácticas para fortalecer una alianza"],
            pts: ["Mapa de aliados: venues, proveedores, planners", "Qué gana cada parte de la alianza", "Cómo se cuida una relación de largo plazo", "Señales de una alianza en riesgo"],
          },
          {
            t: "Representación institucional de Mainstage",
            d: "Cómo representamos a la empresa frente a clientes y aliados clave.",
            obj: ["Proyectar la imagen correcta de la empresa", "Manejar una reunión con un aliado estratégico"],
            pts: ["Somos la cara de la empresa", "Tono y compromisos que sí podemos hacer", "Confidencialidad y prudencia", "Seguimiento después de la reunión"],
          },
        ],
      },
      {
        sub: "Tablero Ejecutivo",
        topics: [
          {
            t: "Lectura del tablero de KPIs consolidado",
            d: "Cómo leer el tablero de indicadores de todas las áreas en la plataforma.",
            obj: ["Interpretar los KPIs principales del negocio", "Detectar desviaciones a tiempo"],
            pts: ["Qué mide cada KPI del tablero", "Metas vs. real", "Cómo interpretar tendencias", "De un número a una decisión"],
          },
          {
            t: "Ritmo y agenda de las juntas de dirección",
            d: "Qué se revisa y qué se decide en las juntas de dirección.",
            obj: ["Conocer la agenda estándar de la junta", "Preparar la información que se revisa"],
            pts: ["Frecuencia y duración de la junta", "Qué se revisa: ventas, operación, finanzas", "Cómo se toman y registran las decisiones", "Seguimiento de acuerdos"],
          },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  {
    area: "Administración",
    categoriaSlug: "administracion",
    categoriaNombre: "Administración",
    letra: "B",
    subs: [
      {
        sub: "Finanzas y Contabilidad",
        topics: [
          { t: "Política y calendario de pago a freelance y proveedores", d: "Cuándo y cómo se paga a técnicos freelance y proveedores.", obj: ["Conocer el calendario de pagos", "Aplicar la política de pago correctamente"], pts: ["Días de corte y de pago", "Qué documentos se requieren para pagar", "Anticipos y saldos", "Qué hacer ante un pago detenido"] },
          { t: "Criterios de pagos extra a personal", d: "Cuándo procede un pago adicional al acordado y cómo se autoriza.", obj: ["Identificar cuándo aplica un pago extra", "Seguir el flujo de autorización"], pts: ["Casos que justifican pago extra", "Quién autoriza y con qué evidencia", "Cómo se registra", "Errores a evitar"] },
          { t: "Gastos y viáticos de personal freelance", d: "Reglas de viáticos y gastos para personal freelance en evento.", obj: ["Conocer qué cubre viáticos", "Comprobar un gasto correctamente"], pts: ["Qué se considera viático", "Topes y autorización previa", "Comprobación con ticket/factura", "Plazos de entrega"] },
          { t: "Condiciones de pago y anticipos", d: "Qué porcentaje se pide, qué libera la ejecución y qué hacer si no llega.", obj: ["Explicar las condiciones de pago al cliente", "Actuar ante un anticipo no recibido"], pts: ["% de anticipo estándar", "Qué libera la operación", "Saldo antes o después del evento", "Protocolo si no llega el pago"] },
          { t: "Comprobación de gastos: ticket, factura, viáticos y caja chica", d: "Cómo se comprueba cada tipo de gasto y en qué plazo.", obj: ["Distinguir tipos de comprobante", "Comprobar un gasto en tiempo"], pts: ["Ticket vs. factura vs. vale", "Datos fiscales que debe traer", "Plazos de entrega", "Qué pasa si no se comprueba"] },
          { t: "Cierre del costo real del evento vs. cotizado", d: "Cómo se compara lo gastado contra lo cotizado al cerrar un evento.", obj: ["Cerrar el costo real de un evento", "Detectar desviaciones vs. lo cotizado"], pts: ["Reunir todos los costos del evento", "Comparar contra la cotización", "Explicar desviaciones", "Aprendizaje para la próxima cotización"] },
          { t: "Facturación y CFDI", d: "Qué necesita el cliente para facturar y cómo se solicita.", obj: ["Solicitar los datos fiscales correctos", "Emitir un CFDI sin errores"], pts: ["Datos fiscales requeridos", "Uso de CFDI y régimen", "Tiempos de emisión", "Errores comunes de facturación"] },
          { t: "Manejo y reposición de caja chica", d: "Montos, control y reposición del efectivo para gastos menores.", obj: ["Operar la caja chica con control", "Reponerla correctamente"], pts: ["Monto y responsable", "Qué se paga con caja chica", "Comprobación de cada salida", "Cómo se repone"] },
          { t: "Registro de movimientos, facturación y nómina en la plataforma", d: "Cómo se capturan finanzas y nómina en Mainstage Pro.", obj: ["Registrar movimientos en el módulo de finanzas", "Ubicar nómina y facturación en la plataforma"], pts: ["Módulo de finanzas: dónde y qué se captura", "Facturación desde la plataforma", "Nómina: alta y cálculo", "Orden y consistencia de los datos"] },
        ],
      },
      {
        sub: "Recursos Humanos",
        topics: [
          { t: "Criterios de integración de personal al equipo", d: "Base para decidir a quién sumamos al equipo.", obj: ["Aplicar los criterios de integración", "Evaluar a un candidato con el mismo estándar"], pts: ["Actitud, confiabilidad y técnica", "Referencias y prueba en campo", "Ajuste cultural", "Señales de alerta"] },
          { t: "Onboarding administrativo del nuevo integrante", d: "Alta, documentos, accesos y herramientas de quien entra.", obj: ["Completar el alta administrativa", "Entregar accesos y herramientas"], pts: ["Documentos de alta", "Accesos a la plataforma", "Herramientas y equipo asignado", "Checklist de bienvenida"] },
          { t: "Reglamento interno de trabajo", d: "Horarios, retardos, faltas, permisos y consecuencias.", obj: ["Conocer las reglas de convivencia laboral", "Aplicar el reglamento con justicia"], pts: ["Horarios y asistencia", "Retardos y faltas", "Vacaciones y permisos", "Consecuencias y debido proceso"] },
          { t: "Reclutamiento y filtro de freelance técnico", d: "Cómo reclutamos y filtramos a un freelance técnico nuevo.", obj: ["Reclutar freelance con estándar", "Filtrar por perfil técnico y actitud"], pts: ["Dónde buscamos freelance", "Filtro por rol técnico", "Prueba y referencias", "Alta en el padrón"] },
          { t: "Cartas responsivas y documentación laboral", d: "Documentos laborales y responsivas del personal freelance.", obj: ["Recabar la documentación laboral", "Gestionar cartas responsivas de equipo"], pts: ["Documentos obligatorios", "Carta responsiva de equipo", "Confidencialidad", "Resguardo de documentos"] },
          { t: "Onboarding por puesto en la plataforma", d: "Cómo la plataforma arma el onboarding según el puesto.", obj: ["Ejecutar el onboarding por puesto", "Dar seguimiento a los pasos en la plataforma"], pts: ["Plantilla base de pasos", "Pasos dinámicos por puesto", "Módulos y capacitación asignados", "Seguimiento de avance"] },
          { t: "Control de asistencia e incidencias en la plataforma", d: "Cómo se registran asistencia e incidencias del personal.", obj: ["Registrar asistencia e incidencias", "Interpretar el reporte de asistencia"], pts: ["Registro de asistencia", "Tipos de incidencia", "Justificaciones", "Lectura del reporte"] },
          { t: "Bienvenida: identidad, organigrama y estructura de áreas", d: "Quiénes somos, cómo estamos organizados y quién es quién.", obj: ["Ubicar las áreas y sub-áreas", "Identificar a quién acudir según el tema"], pts: ["Identidad de la empresa", "Organigrama y áreas", "Sub-áreas y responsables", "Canales de comunicación"] },
          { t: "Confidencialidad y manejo de datos del cliente", d: "Qué información del cliente es confidencial y cómo se protege.", obj: ["Reconocer datos confidenciales", "Manejar información con discreción"], pts: ["Qué es confidencial", "Con quién sí y con quién no", "Manejo de fotos y datos", "Consecuencias de una fuga"] },
          { t: "Comunicación interna y grupos de evento", d: "Cómo nos comunicamos internamente y por evento.", obj: ["Usar los canales internos correctamente", "Operar un grupo de evento con orden"], pts: ["Canales oficiales", "Grupo por evento: para qué sí", "Tono y tiempos de respuesta", "Qué no va en el grupo"] },
        ],
      },
      {
        sub: "Operaciones y Procesos",
        topics: [
          { t: "Compra vs. renta vs. subarriendo: criterio y cotización a proveedores", d: "Cuándo comprar, rentar o subarrendar y cómo se cotiza a proveedores.", obj: ["Elegir entre comprar, rentar o subarrendar", "Cotizar a proveedores con criterio"], pts: ["Criterio por uso y costo", "Cómo se pide cotización a proveedor", "Comparar opciones", "Registro de la decisión"] },
          { t: "Protocolo ante daño, pérdida o robo de equipo", d: "Qué hacer y cómo se documenta un daño, pérdida o robo.", obj: ["Actuar ante un incidente de equipo", "Documentar y deslindar responsabilidad"], pts: ["Primeros pasos ante el incidente", "Evidencia y reporte", "Responsabilidad y reposición", "Prevención a futuro"] },
          { t: "Mainstage Pro como columna de la operación", d: "Por qué toda la operación se ordena y se captura en la plataforma.", obj: ["Entender el rol central de la plataforma", "Capturar con orden y a tiempo"], pts: ["Todo pasa por la plataforma", "Orden de captura", "Datos confiables = decisiones confiables", "Consecuencias de no capturar"] },
          { t: "Inducción a Mainstage Pro: acceso, PWA y uso offline", d: "Cómo entrar, instalar la app y trabajar sin conexión.", obj: ["Acceder e instalar la PWA", "Trabajar en modo offline"], pts: ["Acceso y credenciales", "Instalar como app (PWA)", "Uso offline y sincronización", "Buenas prácticas de sesión"] },
          { t: "Hub de tareas y plan de trabajo", d: "Cómo se opera el trabajo diario desde el hub de tareas.", obj: ["Gestionar tareas del plan de trabajo", "Dar seguimiento a responsables y fechas"], pts: ["Qué es el hub de tareas", "Tareas con fecha y responsable", "Tareas recurrentes", "Seguimiento y cierre"] },
          { t: "Rendimiento operativo en la plataforma", d: "Cómo el módulo de rendimiento evalúa si el plan funciona.", obj: ["Interpretar el rendimiento operativo", "Actuar sobre tareas atrasadas"], pts: ["Qué mide el rendimiento", "Una ocurrencia por vez", "Atrasos y no realizadas", "Cómo mejorar el indicador"] },
          { t: "Roles, permisos y acceso por módulo", d: "Cómo se controla qué ve y hace cada persona en la plataforma.", obj: ["Entender el acceso por área/módulo", "Asignar permisos correctamente"], pts: ["Roles: admin, usuario, solo lectura", "Acceso por área y módulo", "Cómo se otorga acceso", "Principio de mínimo privilegio"] },
          { t: "Bitácora de actividad y trazabilidad", d: "Cómo la plataforma registra quién hizo qué y cuándo.", obj: ["Ubicar la bitácora de actividad", "Usar la trazabilidad para aclarar dudas"], pts: ["Qué queda registrado", "Cómo se consulta", "Para qué sirve la trazabilidad", "Responsabilidad de cada acción"] },
        ],
      },
      {
        sub: "Reportes y Métricas",
        topics: [
          { t: "Lectura de reportes financieros y de asistencia", d: "Cómo leer los reportes financieros y de asistencia del mes.", obj: ["Leer el reporte financiero mensual", "Interpretar el reporte de asistencia"], pts: ["Ingresos, costos y utilidad del mes", "Cuentas por cobrar y pagar", "Asistencia e incidencias", "De la métrica a la acción"] },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  {
    area: "Marketing",
    categoriaSlug: "marketing",
    categoriaNombre: "Marketing",
    letra: "C",
    subs: [
      {
        sub: "Content & Media Management",
        topics: [
          { t: "Levantamiento de material por tipo de evento: criterio y checklist", d: "Qué material capturamos según el tipo de evento y su checklist.", obj: ["Aplicar el checklist de levantamiento", "Adaptar la captura al tipo de evento"], pts: ["Qué se captura: foto, video, detalle", "Checklist por tipo de evento", "Momentos clave para grabar", "Qué no puede faltar"] },
          { t: "Voz y tono en redes sociales", d: "Cómo suena Mainstage al comunicar en redes.", obj: ["Aplicar la voz y tono de marca", "Adaptar el mensaje al canal"], pts: ["Personalidad de la marca", "Palabras que sí y que no", "Tono por red social", "Ejemplos correctos"] },
          { t: "Organización y respaldo de material en Google Drive", d: "Cómo organizamos y respaldamos el material capturado.", obj: ["Organizar el material en Drive", "Garantizar el respaldo del contenido"], pts: ["Estructura de carpetas", "Nomenclatura de archivos", "Respaldo y permisos", "Depuración periódica"] },
          { t: "Documentación de montajes como contenido", d: "Cómo documentar un montaje para que sirva como contenido, no solo evidencia.", obj: ["Capturar el montaje con intención de contenido", "Convertir evidencia en material publicable"], pts: ["Antes, durante y después del montaje", "Encuadres y ángulos que venden", "Detalle que muestra calidad", "De evidencia a pieza de contenido"] },
          { t: "Atención de mensajes entrantes y derivación a comercial", d: "Tiempo de respuesta, qué se contesta y qué pasa a comercial.", obj: ["Atender mensajes con estándar", "Derivar a comercial cuando corresponde"], pts: ["Tiempo de respuesta objetivo", "Qué se responde directo", "Qué pasa a comercial y cómo", "Registro del contacto"] },
          { t: "Derechos de imagen y confidencialidad del cliente", d: "Qué se publica de un cliente y cuándo se pide autorización.", obj: ["Aplicar derechos de imagen", "Pedir autorización cuando se requiere"], pts: ["Qué se puede publicar", "Cuándo se pide permiso", "Casos sensibles", "Consecuencias de publicar sin permiso"] },
          { t: "Captura de levantamientos en la plataforma", d: "Cómo se registra el levantamiento de material en Mainstage Pro.", obj: ["Registrar el levantamiento en la plataforma", "Vincular material al evento correcto"], pts: ["Dónde se captura", "Vincular al evento/tipo", "Etiquetado y orden", "Uso posterior del material"] },
        ],
      },
      {
        sub: "Publicidad y Campañas",
        topics: [
          { t: "Estructura de una campaña pagada", d: "Objetivo, público, presupuesto y cuándo se usa una campaña.", obj: ["Estructurar una campaña pagada", "Definir objetivo y público"], pts: ["Objetivo de la campaña", "Público al que va", "Presupuesto y duración", "Cuándo conviene pautar"] },
          { t: "Segmentación y presupuesto de campaña", d: "Cómo se decide a quién llegar y cuánto invertir.", obj: ["Segmentar el público correcto", "Asignar presupuesto con criterio"], pts: ["Criterios de segmentación", "Presupuesto por objetivo", "Pruebas y ajustes", "Lectura de resultados"] },
        ],
      },
      {
        sub: "Diseño Gráfico",
        topics: [
          { t: "Identidad de marca Mainstage", d: "Cuál es nuestra identidad visual y qué la sostiene.", obj: ["Reconocer los elementos de identidad", "Aplicar la identidad con consistencia"], pts: ["Logo, color y tipografía", "Personalidad visual", "Consistencia en todo material", "Errores que rompen la marca"] },
          { t: "Estándar visual: logo, plantillas y restricciones", d: "Uso correcto del logo, plantillas y material que nunca se publica.", obj: ["Usar el logo y plantillas correctamente", "Evitar usos prohibidos de la marca"], pts: ["Uso correcto del logo", "Plantillas oficiales", "Qué nunca se publica", "Aprobación antes de publicar"] },
          { t: "Producción de material gráfico", d: "Formatos y entregables estándar del diseño gráfico.", obj: ["Producir material en formatos estándar", "Entregar piezas listas para publicar"], pts: ["Formatos por canal", "Entregables estándar", "Flujo de revisión", "Archivo de piezas"] },
          { t: "Módulo de Diseño: generación de piezas y stories", d: "Cómo el módulo de diseño genera piezas y stories 1080x1920.", obj: ["Generar piezas desde el módulo de diseño", "Aplicar la directriz visual única"], pts: ["Qué genera el módulo", "Stories y formatos", "Directriz visual única", "De la plantilla a la pieza final"] },
        ],
      },
      {
        sub: "Reportes y Métricas",
        topics: [
          { t: "Métricas de redes: lectura y reporte", d: "Qué métricas se miden, qué significan y cómo se reportan.", obj: ["Interpretar las métricas de redes", "Reportar resultados con claridad"], pts: ["Alcance, interacción y crecimiento", "Qué significa cada métrica", "Cómo se reporta", "De la métrica a la decisión"] },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  {
    area: "Comercial",
    categoriaSlug: "ventas",
    categoriaNombre: "Ventas",
    letra: "D",
    subs: [
      {
        sub: "Desarrollo de Herramientas de Venta",
        topics: [
          { t: "Fundamentos de venta en Mainstage Pro: servicios, eventos, nichos y cliente ideal", d: "Introducción a las ventas: qué vendemos, a quién y para qué eventos.", obj: ["Describir servicios, tipos de evento y nichos", "Identificar al cliente ideal"], pts: ["Qué servicios ofrecemos", "Tipos de evento que atendemos", "Nichos y cliente ideal", "Cómo se conecta todo en la venta"] },
          { t: "Propuesta de valor en una frase", d: "Cómo definiríamos a Mainstage en una sola frase.", obj: ["Formular la propuesta de valor", "Comunicarla en una frase memorable"], pts: ["Qué nos hace diferentes", "El problema que resolvemos", "La frase de valor", "Cómo usarla en la venta"] },
          { t: "Categorías de equipo", d: "Cuáles son las categorías de equipo que manejamos.", obj: ["Reconocer las categorías de equipo", "Ubicar un equipo en su categoría"], pts: ["Audio, iluminación, video", "Estructuras y complementos", "Cómo se agrupan", "Para qué sirve cada categoría"] },
          { t: "Nuestro inventario", d: "Qué inventario tenemos y cómo se organiza.", obj: ["Conocer el inventario disponible", "Consultar el inventario en la plataforma"], pts: ["Qué equipo tenemos", "Cómo está organizado", "Estado y disponibilidad", "Consulta en la plataforma"] },
          { t: "Portafolio: equipo individual, producto y paquete", d: "Diferencia entre equipo individual, producto y paquete.", obj: ["Distinguir equipo, producto y paquete", "Elegir el nivel correcto para cotizar"], pts: ["Equipo individual", "Producto (arma una solución)", "Paquete (solución completa)", "Cuándo usar cada uno"] },
          { t: "Adicionales por tipo y nicho de evento", d: "Qué adicionales ofrecemos según tipo y nicho de evento.", obj: ["Identificar adicionales por evento", "Ofrecer adicionales que agregan valor"], pts: ["Adicionales por tipo de evento", "Adicionales por nicho", "Cómo se proponen", "Impacto en el ticket"] },
          { t: "Desarrollo de un nuevo paquete", d: "Cómo se diseña y se da de alta un nuevo paquete.", obj: ["Diseñar un paquete rentable", "Darlo de alta en la plataforma"], pts: ["Necesidad que resuelve", "Composición y costo", "Precio y margen", "Alta en la plataforma"] },
          { t: "Herramientas de venta y su uso", d: "Qué herramientas de venta tenemos y cómo se usa cada una.", obj: ["Conocer las herramientas de venta", "Usar cada una en su momento"], pts: ["Catálogo de herramientas", "Cuándo usar cada una", "Cómo se accede", "Buenas prácticas"] },
          { t: "Presentaciones por tipo de evento y perfiles que atendemos", d: "Cómo usamos las presentaciones por tipo de evento y sus perfiles.", obj: ["Usar la presentación del tipo de evento", "Ubicar el apartado de perfiles"], pts: ["Presentación por tipo de evento", "Perfiles que atendemos dentro de cada una", "Cómo se comparte", "Cuándo se usa en la venta"] },
        ],
      },
      {
        sub: "Prospección",
        topics: [
          { t: "Preguntas obligatorias del primer contacto", d: "Qué debemos preguntar siempre en el primer contacto.", obj: ["Aplicar las preguntas obligatorias", "Calificar al prospecto desde el inicio"], pts: ["Fecha, lugar y tipo de evento", "Presupuesto y expectativa", "Quién decide", "Cómo nos encontró"] },
          { t: "Prospección outbound: a quién contactar y cómo abrir", d: "A quién contactamos de forma proactiva y cómo abrimos la conversación.", obj: ["Definir a quién prospectar", "Abrir una conversación en frío"], pts: ["Perfil a contactar", "Canales de prospección", "Apertura que no espanta", "Seguimiento inicial"] },
          { t: "Cliente vs. prospecto y el Perfil del cliente", d: "Cómo clasificamos cliente vs. prospecto y qué es el Perfil.", obj: ["Distinguir cliente de prospecto", "Usar el Perfil como clasificador del cliente"], pts: ["Prospecto vs. cliente", "El pipeline solo promueve", "El Perfil (sector) clasifica al cliente", "Servicio y tipo de evento van en el trato"] },
        ],
      },
      {
        sub: "Cotizaciones, Seguimientos y Cierres",
        topics: [
          { t: "Registro y avance del trato en el CRM", d: "Cómo se registra y avanza un trato en el pipeline.", obj: ["Registrar un trato en el CRM", "Avanzar el trato por sus etapas"], pts: ["Alta del trato", "Etapas del pipeline", "Panel de siguiente paso", "Registro único de información"] },
          { t: "Elaboración de cotizaciones en el cotizador", d: "Cómo se arma una cotización con el cotizador de la plataforma.", obj: ["Armar una cotización correcta", "Aplicar productos, paquetes y adicionales"], pts: ["Abrir el cotizador", "Agregar equipo/producto/paquete", "Adicionales y descuentos", "Generar y enviar"] },
          { t: "Criterios de selección de técnicos en cotización", d: "Cómo se eligen los técnicos que entran a una cotización.", obj: ["Seleccionar técnicos por rol", "Aplicar preferentes y sugerencias"], pts: ["Roles requeridos por el evento", "Técnicos preferentes", "Sugerencias por rol", "Costo del personal en la cotización"] },
          { t: "Atención a cliente con rider específico", d: "Cómo atender a un cliente que ya pide con rider específico.", obj: ["Leer un rider del cliente", "Cotizar contra un rider"], pts: ["Interpretar el rider", "Mapear a nuestro inventario", "Faltantes y alternativas", "Cotizar con precisión"] },
          { t: "Manejo de faltantes de equipo en cotización", d: "Qué hacer si no tenemos el equipo que pide el cliente.", obj: ["Resolver un faltante de equipo", "Proponer alternativas o subarriendo"], pts: ["Detectar el faltante", "Alternativa equivalente", "Subarriendo con costo", "Comunicar la solución"] },
          { t: "Política de precios especiales y descuentos", d: "Cuándo y cómo se aplican precios especiales o descuentos.", obj: ["Aplicar la política de descuentos", "Proteger el margen mínimo"], pts: ["Cuándo aplica un descuento", "Límites y autorización", "Impacto en el margen", "Cómo se registra"] },
          { t: "Cadencia de seguimiento y declaración de prospecto perdido", d: "Cada cuándo se da seguimiento y cuándo se declara perdido.", obj: ["Aplicar la cadencia de seguimiento", "Declarar un prospecto perdido a tiempo"], pts: ["Ritmo de seguimiento", "Canales y mensajes", "Cuándo se declara perdido", "Registro del cierre"] },
          { t: "Manejo de objeciones y cierre", d: "Cómo manejamos objeciones y cerramos la venta.", obj: ["Responder objeciones comunes", "Cerrar la venta con seguridad"], pts: ["Objeciones típicas", "Cómo responder cada una", "Señales de cierre", "Pedir el sí"] },
          { t: "Portales al cliente: propuesta, aprobación y brief", d: "Cómo se usan los portales de propuesta, aprobación y brief.", obj: ["Compartir portales al cliente", "Dar seguimiento a la aprobación"], pts: ["Portal de propuesta", "Portal de aprobación", "Portal de brief", "Seguimiento por token"] },
          { t: "Contratos y firma digital", d: "Cómo se genera y firma un contrato de forma digital.", obj: ["Generar un contrato", "Gestionar la firma digital"], pts: ["Cuándo se genera contrato", "Datos del contrato", "Firma digital", "Resguardo del firmado"] },
          { t: "Entrega de proyecto de comercial a producción", d: "Qué información, en qué formato y cuándo se entrega a producción.", obj: ["Entregar el proyecto a producción", "Transferir la información completa"], pts: ["Qué se entrega", "Formato y momento", "Junta de entrega", "Confirmación de recepción"] },
        ],
      },
      {
        sub: "Atención a Clientes",
        topics: [
          { t: "Estándar de comunicación: tono y voz comercial", d: "Cómo nos comunicamos con prospectos y clientes.", obj: ["Aplicar el tono comercial", "Comunicar con claridad y respeto"], pts: ["Tono con prospectos", "Tono con clientes", "Tiempos de respuesta", "Ejemplos correctos"] },
          { t: "Atención al cliente en sitio y escalamiento de problemas", d: "Solicitudes en sitio, quién habla con quién y cómo se escala.", obj: ["Atender al cliente en sitio", "Escalar un problema correctamente"], pts: ["Quién es el interlocutor", "Cómo se reciben solicitudes", "Cuándo y cómo se escala", "Cerrar el problema"] },
          { t: "Postventa: cierre, satisfacción y siguiente venta", d: "Cierre con el cliente, encuesta y detonación de la próxima venta.", obj: ["Cerrar el ciclo de postventa", "Detonar la siguiente venta"], pts: ["Cierre con el cliente", "Encuesta de satisfacción", "Pedir referidos", "Sembrar la próxima venta"] },
          { t: "Manejo de quejas e inconformidades", d: "Cómo atendemos una queja o inconformidad del cliente.", obj: ["Atender una queja con estándar", "Convertir una queja en lealtad"], pts: ["Escuchar y validar", "Resolver o escalar", "Compensación si aplica", "Aprendizaje interno"] },
        ],
      },
      {
        sub: "Relaciones Públicas",
        topics: [
          { t: "Desarrollo de alianzas con venues, planners y proveedores", d: "Cómo desarrollamos alianzas comerciales de largo plazo.", obj: ["Desarrollar una alianza comercial", "Cuidar la relación en el tiempo"], pts: ["A quién buscamos aliar", "Qué ofrecemos y qué pedimos", "Primeros acuerdos", "Seguimiento de la alianza"] },
        ],
      },
      {
        sub: "Reportes y Métricas",
        topics: [
          { t: "Política de comisiones a vendedores", d: "Cómo se calcula y paga la comisión a vendedores.", obj: ["Entender el esquema de comisión", "Calcular una comisión correctamente"], pts: ["Base de la comisión", "Cuándo se gana", "Cuándo se paga", "Casos especiales"] },
          { t: "Lectura del pipeline y KPIs comerciales", d: "Cómo leer el pipeline y los indicadores comerciales.", obj: ["Leer el pipeline", "Interpretar los KPIs comerciales"], pts: ["Etapas y valor del pipeline", "Tasa de conversión", "Ciclo de venta", "De la métrica a la acción"] },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  {
    area: "Producción",
    categoriaSlug: "produccion",
    categoriaNombre: "Producción",
    letra: "E",
    subs: [
      {
        sub: "Orden y Control de Bodega",
        topics: [
          { t: "Orden y organización de bodega", d: "Cómo se ordena la bodega para operar rápido y sin pérdidas.", obj: ["Aplicar el orden estándar de bodega", "Ubicar equipo con rapidez"], pts: ["Zonas y etiquetado", "Un lugar para cada cosa", "Orden por categoría", "Devolución en su sitio"] },
          { t: "Levantamiento de inventario físico", d: "Cómo se hace un inventario físico y se concilia.", obj: ["Levantar inventario físico", "Conciliar contra el sistema"], pts: ["Preparación del conteo", "Cómo se cuenta", "Conciliación con la plataforma", "Diferencias y ajustes"] },
          { t: "Registro de entradas y salidas de equipo en la plataforma", d: "Cómo se registra el movimiento de equipo a evento y de regreso.", obj: ["Registrar salida y entrada de equipo", "Mantener el inventario confiable"], pts: ["Salida a evento", "Entrada de regreso", "Estado del equipo al volver", "Trazabilidad del movimiento"] },
        ],
      },
      {
        sub: "Mantenimiento y Servicio a Equipos",
        topics: [
          { t: "Cultura de mantenimiento preventivo", d: "Por qué el mantenimiento constante protege la operación.", obj: ["Valorar el mantenimiento preventivo", "Detectar equipo que necesita servicio"], pts: ["Preventivo vs. correctivo", "Rutina de revisión", "Señales de desgaste", "Registro del servicio"] },
        ],
      },
      {
        sub: "Pre Producción Técnica",
        topics: [
          { t: "Términos y criterios de subarriendo", d: "Términos y tips para subarrendar equipo con seguridad.", obj: ["Conocer los términos de subarriendo", "Aplicar criterios al subarrendar"], pts: ["Cuándo se subarrienda", "Términos con el proveedor", "Responsabilidad del equipo", "Costo y logística"] },
          { t: "Rider y checklist de salida", d: "Cómo se arma y valida el rider y el checklist de salida.", obj: ["Armar el rider del evento", "Validar el checklist de salida"], pts: ["Del rider al listado de equipo", "Checklist de salida", "Doble verificación", "Firma de responsable"] },
          { t: "Ficha técnica y plan de producción en la plataforma", d: "Cómo se arma la ficha técnica y el plan de producción.", obj: ["Elaborar la ficha técnica", "Construir el plan de producción"], pts: ["Ficha técnica del evento", "Plan de producción", "Roles y tiempos", "Aprobación del plan"] },
        ],
      },
      {
        sub: "Coordinación de Producción",
        topics: [
          { t: "Rol del coordinador de producción y eventos", d: "Qué hace y de qué responde un coordinador de producción.", obj: ["Definir el rol del coordinador", "Aplicar sus responsabilidades"], pts: ["Antes, durante y después del evento", "Planea y delega", "Es el punto de contacto", "Responde por el resultado"] },
          { t: "Responsabilidades base por rol técnico", d: "Qué se espera de cada rol técnico en el evento.", obj: ["Conocer las responsabilidades por rol", "Ubicar la propia responsabilidad"], pts: ["Responsabilidades comunes", "Por rol técnico", "Coordinación entre roles", "Rendición de cuentas"] },
          { t: "Estándar por perfil técnico: Técnico, Operador e Ingeniero", d: "Diferencia entre Técnico, Operador e Ingeniero y cuándo asignar cada uno.", obj: ["Distinguir los tres perfiles", "Asignar el perfil correcto al evento"], pts: ["Qué hace un Técnico", "Qué hace un Operador", "Qué hace un Ingeniero", "Cuándo asignar cada uno"] },
          { t: "Jornadas operativas: montaje, operación y desmontaje", d: "Cómo se estructuran las jornadas de montaje, operación y desmontaje.", obj: ["Conocer las tres jornadas", "Operar cada una con estándar"], pts: ["Jornada de montaje", "Jornada de operación", "Jornada de desmontaje", "Tiempos y relevos"] },
          { t: "Avance y cierre de proyecto en la plataforma", d: "Cómo se registra el avance y el cierre de un proyecto.", obj: ["Registrar el avance del proyecto", "Cerrar el proyecto correctamente"], pts: ["Seguimiento de avance", "Evidencias por etapa", "Cierre del proyecto", "Aprendizajes registrados"] },
          { t: "Protocolo de emergencias en evento", d: "Qué hacer ante una emergencia durante el evento.", obj: ["Actuar ante una emergencia", "Proteger a personas y equipo"], pts: ["Tipos de emergencia", "Primeros pasos", "Cadena de mando", "Reporte posterior"] },
          { t: "Imagen y conducta del personal en sitio", d: "Cómo se presenta y se conduce el personal en el evento.", obj: ["Cuidar la imagen en sitio", "Aplicar la conducta esperada"], pts: ["Vestimenta y presentación", "Trato con el cliente y venue", "Qué no se hace en sitio", "Somos la marca en el evento"] },
        ],
      },
      {
        sub: "Prácticas y Capacitaciones Técnicas",
        topics: [
          { t: "Carga y descarga segura de equipo", d: "Cómo se carga y descarga el equipo en transporte sin daños ni lesiones.", obj: ["Cargar y descargar con seguridad", "Proteger equipo y personas"], pts: ["Orden de carga en transporte", "Técnica de levantamiento", "Sujeción y protección", "Descarga segura"] },
          { t: "Descarga en venue y preparación de montaje", d: "Cómo se descarga en el venue y se prepara el montaje.", obj: ["Descargar y organizar en venue", "Preparar el área de montaje"], pts: ["Acceso y logística del venue", "Descarga ordenada", "Distribución del equipo", "Preparación previa al montaje"] },
          { t: "Estética y cableado de equipo", d: "Cómo dejamos un montaje limpio, seguro y estético.", obj: ["Cablear con orden y seguridad", "Lograr un montaje estético"], pts: ["Ruteo de cable", "Fijación y protección", "Estética del escenario", "Seguridad del público"] },
          { t: "Operación por tipo de evento según rol técnico", d: "Cómo se opera un evento social, musical y empresarial según el rol.", obj: ["Adaptar la operación al tipo de evento", "Ejecutar según el rol técnico"], pts: ["Evento social", "Evento musical", "Evento empresarial", "Ajuste por rol"] },
          { t: "Operación de audio por tipo de evento", d: "Cómo se opera el audio según el tipo de evento.", obj: ["Operar audio por tipo de evento", "Ajustar según necesidades del show"], pts: ["Audio en social", "Audio en musical", "Audio en corporativo", "Ajustes clave"] },
          { t: "Operación de iluminación por tipo de evento", d: "Cómo se opera la iluminación según el tipo de evento.", obj: ["Operar iluminación por tipo de evento", "Crear ambiente con luz"], pts: ["Luz en social", "Luz en musical", "Luz en corporativo", "Escenas y ambientes"] },
          { t: "Configuraciones base de RCF y Electro Voice", d: "Configuraciones base de RCF y Electro Voice y sus usos.", obj: ["Configurar sistemas RCF y EV", "Elegir la configuración por evento"], pts: ["Configuraciones RCF", "Configuraciones Electro Voice", "Usos por escenario", "Buenas prácticas"] },
          { t: "Electro Voice a piso, tripié y poste", d: "Cómo montar Electro Voice a piso, en tripié y en poste.", obj: ["Montar EV en cada configuración", "Elegir la disposición correcta"], pts: ["A piso", "En tripié", "En poste", "Cuándo usar cada una"] },
          { t: "Electro Voice EKX en display con subwoofer", d: "Cómo se arma un display EKX con subwoofer.", obj: ["Armar el display EKX con sub", "Balancear el sistema"], pts: ["Componentes del display", "Colocación del sub", "Cableado y configuración", "Ajuste de nivel"] },
          { t: "Selección de consola: análoga vs. digital", d: "Cuándo elegir una consola análoga o digital.", obj: ["Comparar análoga vs. digital", "Elegir la consola por evento"], pts: ["Ventajas de la análoga", "Ventajas de la digital", "Criterio por evento", "Casos típicos"] },
          { t: "Selección de micrófonos por tipo de evento", d: "Cómo se eligen los micrófonos según el evento.", obj: ["Seleccionar micrófonos por uso", "Ajustar por tipo de evento"], pts: ["Tipos de micrófono", "Uso por fuente sonora", "Selección por evento", "Errores comunes"] },
          { t: "Uso del stagebox", d: "Qué es el stagebox y en qué casos se usa.", obj: ["Explicar el uso del stagebox", "Aplicarlo cuando conviene"], pts: ["Qué es y para qué sirve", "Conexión y ruteo", "Cuándo usarlo", "Cuidados"] },
          { t: "Sistemas de monitoreo in-ear", d: "Cómo funcionan y se operan los sistemas de monitoreo in-ear.", obj: ["Operar monitoreo in-ear", "Resolver problemas comunes"], pts: ["Cómo funciona el in-ear", "Configuración por músico", "Ventajas vs. monitor de piso", "Problemas y soluciones"] },
          { t: "Centros de carga: criterio de uso", d: "Cuándo y cómo se usan los centros de carga eléctrica.", obj: ["Usar centros de carga con criterio", "Distribuir la carga con seguridad"], pts: ["Qué es un centro de carga", "Criterio de uso", "Distribución de carga", "Seguridad eléctrica"] },
          { t: "Fundamentos de corriente eléctrica", d: "Información básica de corriente eléctrica para operar seguro.", obj: ["Entender conceptos eléctricos básicos", "Aplicarlos para operar seguro"], pts: ["Voltaje, corriente y potencia", "Fases y balanceo", "Consumo de nuestros equipos", "Riesgos básicos"] },
          { t: "Estructura de ganancia en música electrónica", d: "Cómo se arma la estructura de ganancia en un evento electrónico.", obj: ["Armar estructura de ganancia", "Evitar saturación y ruido"], pts: ["Qué es estructura de ganancia", "Del reproductor a la salida", "Niveles óptimos", "Errores que arruinan el sonido"] },
          { t: "Prevención de riesgo eléctrico", d: "Cómo prevenimos riesgos eléctricos en el montaje y operación.", obj: ["Identificar riesgos eléctricos", "Aplicar medidas de prevención"], pts: ["Riesgos comunes", "Aterrizaje y protección", "Cables y conexiones seguras", "Qué hacer ante una falla"] },
          { t: "Rigging, alturas y manejo de cargas", d: "Cómo se trabaja con seguridad en alturas y manejo de cargas.", obj: ["Trabajar seguro en alturas", "Manejar cargas suspendidas"], pts: ["Puntos de anclaje", "Capacidad de carga", "Equipo de protección", "Verificación antes de izar"] },
        ],
      },
      {
        sub: "Reportes y Métricas",
        topics: [
          { t: "Lectura del reporte de uso de equipos y rendimiento", d: "Cómo leer el reporte de uso de equipo y rendimiento operativo.", obj: ["Leer el uso de equipos", "Interpretar el rendimiento operativo"], pts: ["Uso y rotación de equipo", "Equipo más y menos usado", "Rendimiento operativo", "Decisiones a partir del reporte"] },
        ],
      },
    ],
  },
];

// ─── Tema estrella (freelancers): ficha COMPLETA como ejemplo vivo ────────────
export const TEMA_ESTRELLA: {
  categoriaSlug: string; subArea: string; topic: Topic;
  publicoObjetivo: string; prerrequisitos: string[]; procedimiento: string[];
  erroresComunes: string[]; checklistAplicacion: string[]; recursos: string[]; duracion: number;
} = {
  categoriaSlug: "produccion",
  subArea: "Prácticas y Capacitaciones Técnicas",
  duracion: 90,
  topic: {
    t: "Operación técnica de un evento de principio a fin con Mainstage Pro",
    d: "Recorrido completo de cómo un técnico freelance opera un evento apoyándose en Mainstage Pro: desde que recibe la asignación hasta el cierre y su evaluación de rendimiento.",
    obj: [
      "Seguir el flujo completo de un evento desde la plataforma, de la asignación al cierre",
      "Saber dónde ver su rider, plan de producción, roles y tiempos en Mainstage Pro",
      "Registrar evidencias, incidencias y avance para que el evento quede documentado",
      "Entender cómo su desempeño alimenta el rendimiento operativo",
    ],
    pts: [
      "Cómo recibes y aceptas una asignación de evento en la plataforma",
      "Dónde consultas el rider, el plan de producción y tu rol",
      "Cómo funciona el día: montaje, operación y desmontaje con la app",
      "Cómo registras evidencias, incidencias y avance",
      "Qué pasa al cerrar: reporte, cobro y evaluación de rendimiento",
    ],
  },
  publicoObjetivo: "Técnicos freelance (Técnico, Operador, Ingeniero) que colaboran con Mainstage Pro y necesitan operar un evento apoyados en la plataforma.",
  prerrequisitos: [
    "Tener acceso a Mainstage Pro con tu usuario y la PWA instalada",
    "Haber tomado 'Inducción a Mainstage Pro: acceso, PWA y uso offline'",
    "Conocer tu rol técnico (Técnico, Operador o Ingeniero)",
  ],
  procedimiento: [
    "Recibe la notificación de asignación y acepta el evento desde tu panel.",
    "Abre el evento y revisa la ficha técnica, el rider y el plan de producción.",
    "Confirma tu rol, tus horarios y el punto de encuentro (bodega o venue).",
    "En bodega: valida el equipo contra el checklist de salida antes de cargar.",
    "En el venue: descarga, distribuye y prepara el área según el plan.",
    "Montaje: arma, cablea y prueba tu sistema; marca cada avance en la app.",
    "Operación: opera según tu rol y registra cualquier incidencia en tiempo real.",
    "Desmontaje: recoge, verifica equipo completo y registra el estado de regreso.",
    "Cierre: confirma tareas completadas y sube las evidencias del evento.",
    "Post-evento: revisa tu evaluación de rendimiento y el estatus de tu pago.",
  ],
  erroresComunes: [
    "No revisar el rider ni el plan antes de llegar al venue",
    "Operar sin marcar avance ni incidencias, dejando el evento sin trazabilidad",
    "No validar el equipo contra el checklist de salida y descubrir faltantes en sitio",
    "Registrar el estado del equipo de regreso 'de memoria' y días después",
    "Ignorar el módulo de rendimiento y no entender por qué baja tu calificación",
  ],
  checklistAplicacion: [
    "Acepté la asignación y revisé rider + plan de producción",
    "Validé el equipo contra el checklist de salida",
    "Marqué avance de montaje, operación y desmontaje en la app",
    "Registré incidencias en el momento en que ocurrieron",
    "Subí evidencias y confirmé el estado del equipo de regreso",
    "Revisé mi evaluación de rendimiento al cierre",
  ],
  recursos: [
    "Módulo de Operaciones / hub de tareas del evento",
    "Módulo de Inventario: checklist de salida y estado de equipo",
    "Módulo de Rendimiento operativo",
    "Tema: 'Inducción a Mainstage Pro: acceso, PWA y uso offline'",
    "Tema: 'Rider y checklist de salida'",
  ],
};
