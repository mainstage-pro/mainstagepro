// Carga el plan de trabajo por área en el hub de Gestión Operativa.
// Crea secciones (tipoModulo=PLAN, con objetivo/descripcion) y sus tareas (tipoOrigen=PLAN)
// bajo la pestaña "Plan de trabajo" de cada proyecto de área.
//
//   ENV_FILE=.env.prod.backup node scripts/cargar-plan-trabajo-areas.mjs          (dry-run, sólo reporta)
//   ENV_FILE=.env.prod.backup node scripts/cargar-plan-trabajo-areas.mjs --commit  (inserta)
//
// Decisiones acordadas: sin recurrencia, sin asignar; evidencia inferida del texto;
// título = acción principal, el resto del renglón va a notas.

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { randomBytes } from "crypto";

const ENV_FILE = process.env.ENV_FILE || ".env.prod.backup";
const COMMIT = process.argv.includes("--commit");
const env = readFileSync(ENV_FILE, "utf8");
const mUrl = env.match(/DATABASE_URL="?([^"\n]+)"?/);
if (!mUrl) { console.error(`No encontré DATABASE_URL en ${ENV_FILE}`); process.exit(1); }
const sql = neon(mUrl[1]);

const CREADO_POR = "cmnrpg62h0000zmizxpydetsm"; // Mauricio Hernández (ADMIN)

function cuid() {
  return "c" + Date.now().toString(36) + randomBytes(10).toString("hex");
}

// Normaliza para buscar palabras clave (minúsculas, sin acentos).
function norm(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Inferir método de comprobación (evidencia) del texto completo del renglón.
function inferirEvidencia(texto) {
  const t = norm(texto);
  if (/\bfoto|evidencia|imagen/.test(t)) return "FOTO";
  if (/\bpdf|reporte|documento|ticket|carta|calculo|listado\b/.test(t)) return "ARCHIVO";
  if (/notificar|comunicar|avisar|compartir|mandar|enviar|registro|\blink\b/.test(t)) return "NOTA";
  return null;
}

// Divide el renglón en título (acción) y notas (entregable/cadencia/responsable).
function partir(linea) {
  const raw = linea.trim();
  const sepDash = raw.indexOf(" - ");
  const sepColon = raw.indexOf(": ");
  const candidatos = [sepDash, sepColon].filter(i => i >= 0);
  let titulo, notas;
  if (candidatos.length === 0) {
    titulo = raw; notas = null;
  } else {
    const corte = Math.min(...candidatos);
    titulo = raw.slice(0, corte).trim();
    notas = raw.slice(corte + (raw.slice(corte, corte + 3) === " - " ? 3 : 2)).trim() || null;
  }
  titulo = titulo.replace(/\.+$/, "").trim(); // quita punto final del título
  return { titulo, notas };
}

// ── Datos: 5 áreas → proyecto, con sus secciones (objetivo) y tareas ──────────
const PLAN = [
  {
    area: "DIRECCION",
    proyectoId: "cmnw6n11o0001zpkwtc98avmf",
    secciones: [
      {
        nombre: "Dirección Estratégica, Alianzas y Nuevos Negocios",
        objetivo: "Asegurar el futuro comercial de la empresa, expandir la red de contactos y posicionar la marca en los niveles más altos del gremio.",
        tareas: [
          "Listar mensualmente 5 proveedores o personas del medio para proponer alianzas de subarrendamiento o apoyo.",
          "Tener 2 reuniones mensuales con agencias o empresas corporativas para cerrar convenios de exclusividad.",
          "Mapear el calendario anual de ferias y exposiciones del sector para programar visitas de networking.",
          "Revisar trimestralmente las tarifas de la competencia para ajustar precios internos y diseñar nuevos paquetes.",
        ],
      },
      {
        nombre: "Gobierno Corporativo y Finanzas de Alta Dirección",
        objetivo: "Blindar la salud financiera, vigilar la rentabilidad real de la operación y proteger el patrimonio del negocio.",
        tareas: [
          "Analizar la rentabilidad de cada evento cerrado, cruzando gastos de staff y fletes contra lo cotizado.",
          "Revisar dos veces por semana las cuentas por cobrar y hacer llamadas de presión a saldos vencidos.",
          "Calcular mensualmente el retorno de inversión (ROI) de los equipos para ver si están parados en bodega.",
          "Autorizar el presupuesto de gastos operativos y viáticos de producción para los eventos del fin de semana.",
        ],
      },
      {
        nombre: "Alineación y Desarrollo del Talento",
        objetivo: "Elevar el nivel de autonomía de tus 3 pilares clave (Emiliano, Roy y Cheb) para reducir su dependencia de tus instrucciones verbales diarias.",
        tareas: [
          "Ejecutar las sesiones semanales de retroalimentación de 45 minutos con Emiliano, Roy y Cheb.",
          "Auditar la entrega del formulario de visión semanal los lunes y registrar el cumplimiento en el tablero.",
          "Redactar o actualizar quincenalmente 1 manual de procedimiento o checklist operativo junto con el equipo.",
          "Validar mensualmente el cumplimiento de metas del personal para autorizar el pago de bonos o incentivos.",
        ],
      },
      {
        nombre: "Control Operativo y Gestión de Riesgos",
        objetivo: "Garantizar la excelencia técnica en campo, erradicar los errores logísticos y asegurar la continuidad del negocio ante cualquier crisis.",
        tareas: [
          "Ejecutar los jueves por la tarde el Plan de Contingencia (validar técnicos de guardia, fletes y equipos de respaldo).",
          "Realizar los miércoles una inspección visual sorpresa en la bodega para revisar orden, limpieza y etiquetado.",
          "Hacer 1 visita sorpresa al mes en campo durante un montaje para auditar uniformes, puntualidad y seguridad.",
          "Liderar y coordinar el ritmo completo de las juntas semanales y el cierre de dirección.",
          "Revisar en grupo el tablero de rendimiento de todos (reporte semanal, visión semanal, cumplimiento de tareas).",
        ],
      },
    ],
  },
  {
    area: "ADMINISTRACION",
    proyectoId: "cmnw6n7fr0003zpkw3gyitiih",
    secciones: [
      {
        nombre: "Finanzas y Contabilidad",
        objetivo: "Mantener el control preciso de los recursos económicos disponibles, asegurar la salud fiscal del negocio y transparentar los costos operativos.",
        tareas: [
          "Conciliación de saldos en cuentas - reporte semanal de dinero total disponible - todos los lunes - Emiliano.",
          "Solicitar movimientos del fin de semana a Mauricio.",
          "Gestión de cuentas por pagar operativas (programar pagos) - enviar reporte de los pagos programados para la semana.",
          "Pago de renta de bodega - notificar a Mauricio pago de renta / Pago de crédito Actinver - notificar a Mauricio.",
          "Pago de amortización bodega coproba - notificar a Mauricio.",
          "Revisión de presupuesto semanal para gastos operativos - mandar reporte de presupuesto operativo a grupo de administración.",
          "Entrega de recurso para gastos operativos y viaticos - registro de movimiento.",
          "Presentar cierres de los eventos del fin de semana.",
          "Presentación, revisión y entrega de reporte mensual de operación.",
        ],
      },
      {
        nombre: "Recursos Humanos",
        objetivo: "Gestionar la comunicación interna, asegurar el cumplimiento de las compensaciones tanto de la plantilla fija como externa, y blindar legalmente las contrataciones operativas.",
        tareas: [
          "Envío de formulario de visión semanal al equipo - mandar a grupo MAINSTAGE PRO TEAM.",
          "Revisión de formulario de vision semanal al equipo.",
          "Revisión de asistencia semanal (semana pasada) - enviar reporte semanal a grupo de administración.",
          "Pago de nómina semanal - generar documento pdf del calculo de pagos y enviar a grupo de administración.",
          "Revisión de calculo de pagos a personal freelancer y proveedores.",
          "Generar reporte de pagos a personal de esa semana - enviar al grupo de administración.",
          "Envío de reporte semanal al equipo - enviar link al grupo de team.",
          "Imprimir y entregar a coordinador cartas responsiva de técnicos freelancers - notificar que se entregaron las cartas responsivas.",
        ],
      },
      {
        nombre: "Gestión de Oficinas, Servicios y Compras Operativas",
        objetivo: "Garantizar el abasto de consumibles de la empresa y asegurar que las instalaciones cumplan con las condiciones óptimas de higiene y control documental operativo.",
        tareas: [
          "Solicitar tickets de gastos operativos a coordinador de producción.",
          "Gestión de cuentas por cobrar (actualizar fechas de cobro) - enviar actualización de seguimientos realizados.",
          "Seguimiento a cobro de anticipos de eventos próximos.",
          "Levantamiento de insumos de oficina faltantes (papel de baño, jabón, cosas de limpieza, hojas, trapos, etc) - compartir por grupo mainstage pro.",
          "Solicitar servicio de limpieza todos los martes - notificar que se agendó el servicio.",
          "Pago de servicio de limpieza Edna - notificar para hacer pago.",
        ],
      },
    ],
  },
  {
    area: "MARKETING",
    proyectoId: "cmnw6ne550005zpkw8bslxmrh",
    secciones: [
      {
        nombre: "Contenido Orgánico y Redes Sociales",
        objetivo: "Posicionar la marca de forma digital, proyectar profesionalismo hacia el exterior y coordinar el flujo constante de publicaciones no pagadas.",
        tareas: [
          "Presentar propuesta de contenidos del mes (eventos a publicar, contenido informativo, contenido de entretenimiento, contenido de fecha especiales, tbt).",
          "Levantamiento de actividades en bodega/oficina.",
          "Actualización de foto de portada de Facebook.",
          "Solicitar a equipo fotos o videos de los eventos del fin de semana.",
          "Entregar resumen de publicaciones para la siguiente semana.",
          "Reporte semanal de lo publicado.",
        ],
      },
      {
        nombre: "Estrategia Digital y Publicidad Pagada",
        objetivo: "Generar leads y prospectos calificados constantemente mediante pauta digital, maximizando la presencia del negocio en motores de búsqueda y redes.",
        tareas: [
          "Crear campañas de publicidad a publicaciones (publicas personalizados).",
        ],
      },
      {
        nombre: "Archivo y Control de Material Gráfico",
        objetivo: "Resguardar, clasificar y mantener accesible todo el portafolio visual de la empresa para agilizar el uso de materiales tanto en marketing como en ventas.",
        tareas: [
          "Entrega de material levantado en eventos (carpeta de fotos y videos en google drive) - compartir al grupo de marketing.",
          "Organización de archivo de material en Google Drive y disco duro.",
          "Actualización de carpetas “Selección de fotos/videos”.",
          "Actualización de carpeta de “Material por equipo”.",
          "Actualización de selección de videos.",
          "Organización general del Google Drive.",
        ],
      },
      {
        nombre: "Diseño Comercial e Identidad de Marca",
        objetivo: "Estandarizar la línea gráfica corporativa y emitir los informes de desempeño mensuales para la evaluación de resultados.",
        tareas: [
          "Propuesta de portadas para posts/carruseles de Instagram.",
          "Archivo de material grafico.",
          "Presentación, revisión y entrega de reporte mensual de operación.",
        ],
      },
    ],
  },
  {
    area: "VENTAS",
    proyectoId: "cmnw6niv80007zpkwyoaqh4qy",
    secciones: [
      {
        nombre: "Gestión de Cuentas y Prospección Activa (Fijo Semanal)",
        objetivo: "Generar oportunidades comerciales de forma proactiva y sistemática sin depender exclusivamente de las cotizaciones entrantes.",
        tareas: [
          "Auditoría de base de datos: Revisar la lista histórica de clientes de la empresa para clasificar y separar a los \"Clientes VIP\" de los \"Clientes Inactivos\" (los que tienen más de 6 meses sin contratarnos).",
          "Llamadas de reactivación: Contactar activamente a los clientes inactivos para actualizar sus datos de contacto, preguntarles por sus eventos de este año y recordarles que estamos listos para cotizarles.",
          "Mapeo y prospección en frío: Investigar en redes sociales e internet nuevas agencias de eventos, corporativos, hoteles o wedding planners locales que no nos conozcan y conseguir el contacto de su director de producción o compras.",
          "Contacto inicial de siembra: Enviar un correo de presentación institucional o un mensaje personalizado de LinkedIn a los nuevos prospectos encontrados para agendar una breve llamada de 10 minutos la siguiente semana.",
        ],
      },
      {
        nombre: "Relaciones Públicas e Inteligencia de Mercado (Fijo Quincenal/Mensual)",
        objetivo: "Construir convenios institucionales a largo plazo, vigilar las tendencias de precios del mercado y blindar la oferta comercial del negocio.",
        tareas: [
          "Agendamiento de visitas presenciales: Programar al menos 2 reuniones físicas al mes con directores de agencias de eventos o recintos para presentar la carpeta técnica impresa y platicar sobre convenios anuales o comisiones.",
          "Auditoría de satisfacción y fidelización: Contactar a los clientes que nos contrataron el mes pasado para invitarlos a un café o llamada con el único fin de estrechar la relación comercial y pedir recomendaciones.",
          "Monitoreo encubierto de competencia (Mystery Shopping): Solicitar cotizaciones simuladas a competidores locales para analizar sus precios actuales, velocidad de respuesta y marcas de equipo de audio/iluminación ofrecidas.",
          "Sincronización de Stock Vendible: Revisar quincenalmente el estado de las altas/bajas de equipos en reparación con el área de producción para conocer qué activos están disponibles y cuáles no se deben ofrecer en las cotizaciones de esa semana.",
          "Mantenimiento del material de ventas: Revisar que las presentaciones corporativas, las carpetas técnicas por tipo de evento y tabuladores de precios estén actualizados con las fotos recientes generadas por Marketing.",
        ],
      },
      {
        nombre: "Operación de Cuentas y Reportes",
        objetivo: "Ejecutar el flujo comercial diario, el cierre de contratos y reportar el desempeño global del área de ventas.",
        tareas: [
          "(Espacio libre reservado para tus actividades cotidianas de atención a solicitudes entrantes, cotizaciones rápidas diarias, firmas de contratos y anticipos).",
          "Presentación, revisión y entrega de reporte mensual de operación.",
        ],
      },
    ],
  },
  {
    area: "PRODUCCION",
    proyectoId: "cmnw6nnti0009zpkwpiukw8tu",
    secciones: [
      {
        nombre: "Orden y Control de Bodega",
        objetivo: "Garantizar el control estricto de las existencias, mantener las instalaciones bajo estándares de orden absoluto y asegurar el resguardo de la documentación de entrega.",
        tareas: [
          "Comunicación con clientes de renta y proveedores con equipos (programar recolecciones) - comunicar equipos pendientes de recolección en grupo de produccion.",
          "Checklist semanal - enviar reporte de checklist semanal a grupo de producción.",
          "Orden de equipos de bodega - enviar foto a grupo de produccion.",
          "Orden de cableado en su caja correspondiente.",
          "Limpieza de bodega, cocina y espacio de piso (barrer, recoger y tirar basura) enviar evidencias al grupo de producción.",
          "Alta de nuevos proveedores en base de datos.",
          "Alta de nuevos técnicos freelancers.",
          "Recolección de equipos con clientes de renta (si aplica) - notificar recolección en grupo de WhatsApp.",
          "Levantamiento de insumos faltantes en bodega/oficina - hacer listado y solicitar recurso $ para comprarlo.",
          "Entregar a Administración cartas responsiva de free lancers firmadas.",
          "Limpieza de bodega, cocina y espacio de piso (barrer, recoger y tirar basura) enviar evidencias al grupo de producción (Cierre de semana Viernes).",
          "Orden de equipos de bodega - enviar foto a grupo de produccion (Cierre de semana Viernes).",
        ],
      },
      {
        nombre: "Mantenimiento y Reparaciones",
        objetivo: "Preservar el valor de los activos técnicos del negocio, minimizar los riesgos de fallas mecánicas en transporte y averías electrónicas en vivo.",
        tareas: [
          "Comunicación con técnicos de mantenimiento/reparación para seguimiento a equipos (si aplica) - comunicar diagnóstico en grupo de produccion.",
          "Llenado de bitácora de KM de la camioneta - Mandar foto a grupo de produccion.",
          "Mantenimiento de equipos (elegir un grupo de equipos para hacer mantenimiento) revisión de funcionamiento y limpieza - comunicar que equipos van a hacerles mantenimiento.",
          "Registro de equipos en mantenimiento - generar pdf y enviar reporte de mantenimiento a grupo de producción.",
          "Registro e identificación de equipos con fallas para llevar a reparar.",
          "Guardar y ordenar equipos que se les dio mantenimiento - enviar foto de bodega ordenada y todo en su lugar.",
          "Revisión de niveles de aceite, anticongelante y estado de llantas de la camioneta - enviar foto a grupo de producción.",
          "Lavado de la camioneta - enviar foto a grupo de producción.",
          "Salir a llevar/recolectar equipos en reparación - comunicar fecha de entrega de los equipos.",
          "Registro de alta/baja de equipos reparados o en reparación y anotar el costo de la reparación - comunicar alta o baja de los equipos por WhatsApp.",
        ],
      },
      {
        nombre: "Coordinación de Producción",
        objetivo: "Liderar la logística interna, la comunicación técnica previa con recintos/proveedores externos y la gestión de la documentación necesaria para la ejecución de eventos.",
        tareas: [
          "Mensaje de agradecimiento a técnicos por su colaboración el fin de semana (en grupos de WhatsApp).",
          "Consultar disponibilidad de equipos del fin de semana en plataforma.",
          "Archivo de documentación operativa (fichas técnicas, rider de carga y hojas de entrega) - enviar foto a WhatsApp.",
          "Revisión de tareas pendientes de proyectos próximos - Revisar en checklist de tareas en proyectos.",
          "Ponerse en contacto con clientes para aclarar dudas e información faltante de los eventos - comunicar respuestas por grupo de producción.",
          "Confirmación de contar con los equipos y herramientas disponibles para ejecutar los eventos del fin de semana - comunicar por WhatsApp si falta algo o si estamos completos.",
          "Revisar si falta algún equipo o herramienta para subarrendar - comunicar por WhatsApp si falta algo o si estamos completos.",
          "Revisión de disponibilidad de consumibles (líquido de humo, telas, cables, herramientas).",
          "Hacer lista de consumibles o herramientas faltantes para aprobación y preparar el recurso $.",
          "Junta de producción post eventos (revisión de evaluación, expresar observaciones y revisión de información de los proyectos próximos y resolución de dudas).",
          "Completar llenado de información de los proyectos (hora de llamado, montaje, inicio, fin, técnicos, cronología, accesorios, equipos adicionales etc).",
          "Descargar archivos pdf de ficha técnica, rider de carga, hojas de entrega, info para técnicos y carta responsiva de técnicos.",
          "Imprimir documentos de producción.",
          "Crear grupos de WhatsApp con el personal técnico y comunicar documentos.",
          "Comunicación con proveedores para confirmar servicios - comunicar confirmación o falta de proveedores.",
          "Comunicación con técnicos para confirmar colaboración - comunicar confirmación o falta de técnicos.",
          "Salir a hacer compras de insumos o herramientas de producción faltantes - mandar ticket de los gastos.",
          "Recolección (equipos que solicitamos) y entrega (equipos que nos solicitan) de equipos con proveedores - enviar foto de los equipos entregados o recolectados.",
          "Recolección (equipos que solicitamos) y entrega (equipos que nos solicitan) de equipos con proveedores (dia 2) - enviar foto de los equipos entregados o recolectados.",
          "Solicitar presupuesto de gastos operativos y viaticos para el fin de semana.",
          "Ordenar por carpetas los documentos operativos por evento.",
        ],
      },
      {
        nombre: "Operación y Ejecución",
        objetivo: "Garantizar un montaje eficiente, un estricto apego a las fichas técnicas validadas y una excelente operación de ingeniería durante el evento en vivo.",
        tareas: [
          "Llenado de evaluación de los servicios generar pdf y enviar en grupo de producción.",
          "Preparación de equipos ordenadamente por evento en piso (del primero al último) para hacer eficiente su carga (aquí debemos de tener ya los documentos operativos) - mandar foto de equipos preparados.",
          "Validación final de equipos y carga conforme al proyecto y ficha técnica.",
        ],
      },
    ],
  },
];

// ── Preview ───────────────────────────────────────────────────────────────────
let totalSec = 0, totalTar = 0;
console.log(`\n=== ${COMMIT ? "INSERCIÓN" : "DRY-RUN (preview)"} — plan de trabajo por área ===\n`);
for (const area of PLAN) {
  console.log(`\n██ ${area.area}  (proyecto ${area.proyectoId})`);
  for (const sec of area.secciones) {
    totalSec++;
    console.log(`  ▸ Sección: ${sec.nombre}`);
    console.log(`     objetivo: ${sec.objetivo}`);
    sec.tareas.forEach((linea, i) => {
      totalTar++;
      const { titulo, notas } = partir(linea);
      const ev = inferirEvidencia(linea);
      console.log(`     ${String(i + 1).padStart(2)}. [${ev ?? "—"}] ${titulo}${notas ? `  ⟶ notas: ${notas}` : ""}`);
    });
  }
}
console.log(`\nResumen: ${totalSec} secciones · ${totalTar} tareas\n`);

// ── Guardas de seguridad antes de escribir ────────────────────────────────────
if (COMMIT) {
  const proyectoIds = PLAN.map(a => a.proyectoId);
  const existentes = await sql.query(
    `SELECT "proyectoId", COUNT(*)::int AS n FROM tarea_secciones
     WHERE "tipoModulo" = 'PLAN' AND "proyectoId" = ANY($1) GROUP BY "proyectoId"`,
    [proyectoIds]
  );
  if (existentes.length > 0) {
    console.error("ABORTADO: ya existen secciones PLAN en estos proyectos:", JSON.stringify(existentes));
    console.error("Revisa/limpia antes de re-correr para no duplicar.");
    process.exit(1);
  }

  let secCount = 0, tarCount = 0;
  for (const area of PLAN) {
    let secOrden = 0;
    for (const sec of area.secciones) {
      const secId = cuid();
      await sql.query(
        `INSERT INTO tarea_secciones (id, nombre, descripcion, orden, colapsada, "tipoModulo", "proyectoId", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,false,'PLAN',$5, NOW(), NOW())`,
        [secId, sec.nombre, sec.objetivo, secOrden, area.proyectoId]
      );
      secCount++;
      secOrden++;

      let tarOrden = 0;
      for (const linea of sec.tareas) {
        const { titulo, notas } = partir(linea);
        const ev = inferirEvidencia(linea);
        await sql.query(
          `INSERT INTO tareas
             (id, titulo, descripcion, prioridad, area, estado, "creadoPorId",
              "proyectoTareaId", "seccionId", notas, orden, "tipoOrigen",
              "requiereEvidencia", "tipoEvidencia", "estadoVerificacion",
              "createdAt", "updatedAt")
           VALUES
             ($1,$2,NULL,'MEDIA',$3,'PENDIENTE',$4,
              $5,$6,$7,$8,'PLAN',
              $9,$10,'NO_REQUIERE',
              NOW(), NOW())`,
          [cuid(), titulo, area.area, CREADO_POR, area.proyectoId, secId, notas, tarOrden, ev != null, ev]
        );
        tarCount++;
        tarOrden++;
      }
    }
  }
  console.log(`✅ Insertado: ${secCount} secciones · ${tarCount} tareas.`);
} else {
  console.log("(dry-run) No se escribió nada. Corre con --commit para insertar.\n");
}
