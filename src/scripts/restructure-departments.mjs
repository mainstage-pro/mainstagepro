
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ─── NEW DEPARTMENT IDs (already created) ───────────────────────────────────
const DEPTS = {
  // ADMINISTRACIÓN
  ADMIN_FINANZAS:    'cmq7k0fe70001984be10199z0',
  ADMIN_RRHH:        'cmq7k0fy50003984btzc8kqmc',
  ADMIN_OPERACIONES: 'cmq7k0gfs0005984b5lljzf55',
  ADMIN_REPORTES:    'cmq7k0gy60007984bwuavhtw4',
  // MARKETING
  MKT_CONTENT:       'cmq7k0hgc0009984bmkujplzb',
  MKT_PUBLICIDAD:    'cmq7k0igv000b984b721vxghx',
  MKT_DISENO:        'cmq7k0jhn000d984b7k5lx833',
  MKT_REPORTES:      'cmq7k0k85000f984badogg2q5',
  // VENTAS
  VTA_ATENCION:      'cmq7k0lsc000h984b6cvggewj',
  VTA_PROSPECCION:   'cmq7k0nre000j984b5ujjn7td',
  VTA_COTIZACIONES:  'cmq7k0p3r000l984bet5v7w08',
  VTA_HERRAMIENTAS:  'cmq7k0pw2000n984bw1lemwia',
  VTA_RRPP:          'cmq7k0qp5000p984bl5ee3ru2',
  VTA_REPORTES:      'cmq7k0rsn000r984bqm0t7jb3',
  // PRODUCCIÓN
  PRD_BODEGA:        'cmq7k0slo000t984bw8zqe6i3',
  PRD_MANTENIMIENTO: 'cmq7k0t2b000v984b73zyxesy',
  PRD_PREPRODUCCION: 'cmq7k0tkm000x984baeipp8uw',
  PRD_COORDINACION:  'cmq7k0u3p000z984bp8v39zj1',
  PRD_PRACTICAS:     'cmq7k0ulv0011984b7zaz3t97',
  PRD_REPORTES:      'cmq7k0v360013984bihlf2kvo',
};

const AREA_IDS = {
  ADMIN:     'cmpni9la300007vq0dukclr37',
  MARKETING: 'cmpni9liv002b7vq0elmhjmh5',
  VENTAS:    'cmpni9loy00487vq0m13gnld8',
  PRODUCCION:'cmpni9luh00637vq0d16tiirr',
};

const EMILIANO_ID = 'cmo7ikcc00000oqfsqwzys8g4';

// ─── TEMPLATE ASSIGNMENTS ────────────────────────────────────────────────────
// Format: [exactName, deptKey]
const ASSIGNMENTS = [
  // ADMINISTRACIÓN → Finanzas y Contabilidad
  ['Registro de movimientos financieros',                     'ADMIN_FINANZAS'],
  ['Reporte de gastos por categoría',                         'ADMIN_FINANZAS'],
  ['Conciliación bancaria',                                   'ADMIN_FINANZAS'],
  ['Cierre financiero por evento',                            'ADMIN_FINANZAS'],
  ['Entrega documental a contabilidad externa',               'ADMIN_FINANZAS'],
  ['Programación y agenda de pagos de la semana',             'ADMIN_FINANZAS'],
  ['Planeación presupuestal por evento',                      'ADMIN_FINANZAS'],
  ['Estado de resultados mensual',                            'ADMIN_FINANZAS'],
  ['Facturación y emisión de CFDI',                          'ADMIN_FINANZAS'],
  ['Cartera actualizada (CxC y CxP)',                        'ADMIN_FINANZAS'],
  ['Pago de nómina semanal',                                  'ADMIN_FINANZAS'],
  ['Gestión y seguimiento de cuentas por cobrar',            'ADMIN_FINANZAS'],
  ['Seguimiento de anticipos de eventos próximos',           'ADMIN_FINANZAS'],
  ['Reabastecimiento de caja chica',                          'ADMIN_FINANZAS'],
  ['Pago a técnicos y freelancers post-evento',              'ADMIN_FINANZAS'],
  ['Pago a proveedores y subrentas',                          'ADMIN_FINANZAS'],
  ['Pago de renta mensual operativa',                         'ADMIN_FINANZAS'],
  ['Pago de servicios y gastos fijos',                        'ADMIN_FINANZAS'],
  ['Reporte de equipos subarrendados y costos',              'ADMIN_FINANZAS'],
  ['Entrega de presupuesto y recursos operativos a Producción','ADMIN_FINANZAS'],
  ['Aprobación y registro de gastos operativos del evento',  'ADMIN_FINANZAS'],
  // ADMINISTRACIÓN → Recursos Humanos
  ['Control de asistencia del equipo',                        'ADMIN_RRHH'],
  ['Registro de incidencias de personal',                     'ADMIN_RRHH'],
  ['Reporte de asistencias mensual',                          'ADMIN_RRHH'],
  ['Control de insumos de oficina',                           'ADMIN_RRHH'],
  ['Envío de formulario de satisfacción al freelancer',      'ADMIN_RRHH'],
  ['Reporte mensual de incidencias',                          'ADMIN_RRHH'],
  ['Envío de formulario de satisfacción al equipo interno',  'ADMIN_RRHH'],
  ['Coordinación del servicio de limpieza de oficina',       'ADMIN_RRHH'],
  ['Revisión y consolidación de formularios de satisfacción empleados','ADMIN_RRHH'],
  // ADMINISTRACIÓN → Reportes y Métricas
  ['Dashboard de KPIs consolidado de todas las áreas',       'ADMIN_REPORTES'],
  ['Reporte de KPIs del área con propuestas de mejora',      'ADMIN_REPORTES', AREA_IDS.ADMIN],
  ['Reporte de uso de equipos',                               'ADMIN_REPORTES'],

  // MARKETING → Content & Media Management
  ['Atención a mensajes directos, comentarios y comunidad en redes', 'MKT_CONTENT'],
  ['Publicar contenido orgánico — feed, stories y reels',    'MKT_CONTENT'],
  ['Reporte de resultados de contenido orgánico',            'MKT_CONTENT'],
  ['Evaluacion de publicación de contenido organico',        'MKT_CONTENT'],
  ['Sesión de creación de contenido mensual',                'MKT_CONTENT'],
  ['Subir y organizar contenido grabado con iPhone',         'MKT_CONTENT'],
  ['Entrega de levantamientos en eventos',                   'MKT_CONTENT'],
  ['Entrega de material de contenido mensual para revisión', 'MKT_CONTENT'],
  ['Organización y respaldo de material post-evento',        'MKT_CONTENT'],
  ['Selección de mejores piezas — carpeta SELECCIÓN',       'MKT_CONTENT'],
  ['Actualización del banco de imágenes y archivo en Drive', 'MKT_CONTENT'],
  ['Propuesta de parrilla mensual de contenido orgánico',   'MKT_CONTENT'],
  ['Identificación de tendencias del sector',                'MKT_CONTENT'],
  // MARKETING → Publicidad y Campañas
  ['Revisión y optimización de campañas en Meta Ads',        'MKT_PUBLICIDAD'],
  ['Reporte de resultados de campañas',                      'MKT_PUBLICIDAD'],
  ['Propuesta de calendario de campañas del mes',            'MKT_PUBLICIDAD'],
  ['Desarrollo de nuevos creativos para campañas',           'MKT_PUBLICIDAD'],
  ['Evaluacion de ejecución de campañas',                   'MKT_PUBLICIDAD'],
  // MARKETING → Diseño Gráfico
  ['Producción de material gráfico',                        'MKT_DISENO'],
  // MARKETING → Reportes y Métricas
  ['Reporte de KPIs del área con propuestas de mejora',      'MKT_REPORTES', AREA_IDS.MARKETING],

  // VENTAS → Atención a Clientes
  ['Confirmación de eventos y anticipos',                    'VTA_ATENCION'],
  ['Reporte de atención post-evento',                        'VTA_ATENCION'],
  ['Seguimiento y atención a clientes activos',              'VTA_ATENCION'],
  ['Seguimiento post-evento a clientes',                     'VTA_ATENCION'],
  ['Reporte de seguimiento y fortalecimiento de relación con clientes','VTA_ATENCION'],
  ['Mensaje quincenal de presencia a cartera de clientes',   'VTA_ATENCION'],
  ['Desarrollo de relación con clientes priority',           'VTA_ATENCION'],
  ['Nurturing de clientes recurrentes y prioridad',          'VTA_ATENCION'],
  // VENTAS → Prospección
  ['Prospección outbound — contactar prospectos estratégicos','VTA_PROSPECCION'],
  ['Contacto con clientes inactivos',                        'VTA_PROSPECCION'],
  ['Mantenimiento de base de prospectos',                    'VTA_PROSPECCION'],
  ['Contacto semanal con venue o aliado clave',              'VTA_PROSPECCION'],
  ['Identificación y desarrollo de alianzas comerciales',    'VTA_PROSPECCION'],
  ['Reporte de prospectos outbound',                         'VTA_PROSPECCION'],
  // VENTAS → Cotizaciones, Seguimientos y Cierres
  ['Revisión y priorización del pipeline activo',            'VTA_COTIZACIONES'],
  ['Seguimiento a oportunidades sin respuesta +3 días',      'VTA_COTIZACIONES'],
  ['Seguimiento a propuestas enviadas pendientes',           'VTA_COTIZACIONES'],
  ['Transferencia de venta cerrada a Producción',            'VTA_COTIZACIONES'],
  ['Descubrimiento completo con leads calificados',          'VTA_COTIZACIONES'],
  ['Elaboración y envío de cotizaciones',                   'VTA_COTIZACIONES'],
  ['Atención y resolución de incidencias comerciales',       'VTA_COTIZACIONES'],
  // VENTAS → Desarrollo de Herramientas de Venta
  ['Definición de paquetes de servicio por tipo de evento',  'VTA_HERRAMIENTAS'],
  ['Propuesta de campaña comercial por temporalidad',        'VTA_HERRAMIENTAS'],
  // VENTAS → Reportes y Métricas
  ['Reporte de ventas semanal',                              'VTA_REPORTES'],
  ['Reporte de KPIs del área con propuestas de mejora',      'VTA_REPORTES', AREA_IDS.VENTAS],
  ['Reporte de comisión a vendedores',                       'VTA_REPORTES'],
  ['Consolidado de ventas del mes',                          'VTA_REPORTES'],

  // PRODUCCIÓN → Orden y Control de Bodega
  ['Hojas de entrega — archivo semanal',                     'PRD_BODEGA'],
  ['Recepción y validación de equipos post-evento',          'PRD_BODEGA'],
  ['Registro de entradas y salidas de equipo',               'PRD_BODEGA'],
  ['Auditoría completa de inventario',                       'PRD_BODEGA'],
  ['Devolución de equipos subarrendados',                    'PRD_BODEGA'],
  ['Reporte de checklist semanal de equipos',                'PRD_BODEGA'],
  ['Reporte de estado de vehículos',                        'PRD_BODEGA'],
  ['Inventario semanal de consumibles',                      'PRD_BODEGA'],
  ['Impresión de hojas de entrega y checklists',            'PRD_BODEGA'],
  ['Cierre semanal de bodega',                               'PRD_BODEGA'],
  ['Reporte de faltantes en bodega y oficina',               'PRD_BODEGA'],
  ['Limpieza de bodega: piso, pasillos y áreas de trabajo', 'PRD_BODEGA'],
  ['Mantenimiento del orden de bodega durante el día',       'PRD_BODEGA'],
  ['Recolección de basura en bodega y patio',                'PRD_BODEGA'],
  ['Limpieza profunda en bodega — cierre de semana',        'PRD_BODEGA'],
  // PRODUCCIÓN → Mantenimiento y Servicio a Equipos
  ['Revisión funcional de equipos según plan de revisión',   'PRD_MANTENIMIENTO'],
  ['Revisión de disponibilidad de consumibles',              'PRD_MANTENIMIENTO'],
  ['Limpieza de equipos e identificación de golpes',        'PRD_MANTENIMIENTO'],
  ['Reporte de reparación y equipos en mantenimiento',      'PRD_MANTENIMIENTO'],
  ['Recolección de equipos reparados',                       'PRD_MANTENIMIENTO'],
  ['Envío de equipos a mantenimiento o reparación',         'PRD_MANTENIMIENTO'],
  ['Registro del historial de mantenimiento por equipo',     'PRD_MANTENIMIENTO'],
  ['Compras operativas y reposición de consumibles',         'PRD_MANTENIMIENTO'],
  ['Seguimiento a equipos en reparación',                    'PRD_MANTENIMIENTO'],
  // PRODUCCIÓN → Pre Producción Técnica
  ['Revisión completa de proyectos activos en plataforma',   'PRD_PREPRODUCCION'],
  ['Reporte de gastos operativos próximos',                 'PRD_PREPRODUCCION'],
  ['Mantenimiento de base de datos de técnicos freelance',  'PRD_PREPRODUCCION'],
  ['Cálculo de pagos a freelancers y proveedores',          'PRD_PREPRODUCCION'],
  ['Terminar checklist / rider de salida de equipos',        'PRD_PREPRODUCCION'],
  ['Terminar ficha técnica de eventos próximos',            'PRD_PREPRODUCCION'],
  ['Creación del grupo de WhatsApp de los eventos',          'PRD_PREPRODUCCION'],
  ['Plan de producción completo del evento',                 'PRD_PREPRODUCCION'],
  ['Contratación y confirmación de personal técnico',        'PRD_PREPRODUCCION'],
  ['Contratación y confirmación de transporte externo',      'PRD_PREPRODUCCION'],
  ['Contratación de equipos a subarrendar',                  'PRD_PREPRODUCCION'],
  ['Archivo de cartas responsivas freelancers',              'PRD_PREPRODUCCION'],
  ['Solicitar presupuesto para eventos del fin de semana',   'PRD_PREPRODUCCION'],
  ['Recolección y firma de cartas responsivas de freelancers','PRD_PREPRODUCCION'],
  ['Separación y preparación de equipos por evento',         'PRD_PREPRODUCCION'],
  ['Validación final de carga — checklist de salida firmado','PRD_PREPRODUCCION'],
  ['Últimos detalles y verificación final de operación/producción','PRD_PREPRODUCCION'],
  // PRODUCCIÓN → Coordinación de Producción
  ['Coordinación de tiempos, llegadas y montaje en campo',   'PRD_COORDINACION'],
  ['Coordinación técnica durante el evento',                 'PRD_COORDINACION'],
  ['Revisión de retroalimentación y actualización de protocolos e junta','PRD_COORDINACION'],
  ['Cierre del proyecto en plataforma',                      'PRD_COORDINACION'],
  ['Reporte general de ejecución de eventos',               'PRD_COORDINACION'],
  ['Apoyo en recepción y acomodo de equipos post-evento',   'PRD_COORDINACION'],
  ['Apoyo en trámites y gestiones externas básicas',        'PRD_COORDINACION'],
  // PRODUCCIÓN → Prácticas y Capacitaciones Técnicas
  ['Apoyo en revisión de equipos (martes)',                  'PRD_PRACTICAS'],
  ['Apoyo en preparación y separación de equipos (jueves)', 'PRD_PRACTICAS'],
  // PRODUCCIÓN → Reportes y Métricas
  ['Reporte de KPIs del área con propuestas de mejora',      'PRD_REPORTES', AREA_IDS.PRODUCCION],
  ['Reporte de KPIs de Bodega con propuestas de mejora',    'PRD_REPORTES'],
];

async function main() {
  console.log('=== PASO 3: Reassigning templates ===\n');
  
  let assigned = 0;
  const notFound = [];
  const counts = {};

  for (const [nombre, deptKey, areaFilter] of ASSIGNMENTS) {
    const deptId = DEPTS[deptKey];
    
    // Build where clause
    const where = { nombre };
    if (areaFilter) where.areaId = areaFilter;

    // Find templates matching this name
    const templates = await prisma.pTTareaTemplate.findMany({ where, select: { id: true, nombre: true, areaId: true } });

    if (templates.length === 0) {
      notFound.push({ nombre, deptKey, areaFilter });
      console.log(`  ❌ NOT FOUND: "${nombre}" (dept: ${deptKey}${areaFilter ? ', area: '+areaFilter : ''})`);
    } else {
      for (const t of templates) {
        await prisma.pTTareaTemplate.update({
          where: { id: t.id },
          data: { subAreaId: deptId },
        });
        assigned++;
        counts[deptKey] = (counts[deptKey] || 0) + 1;
        console.log(`  ✅ "${t.nombre}" → ${deptKey}`);
      }
    }
  }

  console.log('\n=== PASO 4: Creating 2 new templates ===\n');

  // Template 1
  const t1 = await prisma.pTTareaTemplate.create({
    data: {
      areaId: AREA_IDS.ADMIN,
      subAreaId: DEPTS.ADMIN_OPERACIONES,
      nombre: 'Mantenimiento y actualización de plataforma Mainstage',
      descripcion: 'Revisar bugs reportados, implementar mejoras pendientes e integrar nuevas funcionalidades en la plataforma Mainstage Pro. Coordinar con equipo de desarrollo si aplica.',
      tipo: 'CHECK',
      frecuencia: 'SEMANAL',
      diasSemana: [2, 4],
      semanaDeMes: [],
      impacto: 'alto',
      contexto: 'independiente',
      puestoDefault: 'Administrador General',
      responsableId: EMILIANO_ID,
      moduloDestino: '/configuracion',
      moduloTexto: 'Configuración',
      moduloDisponible: true,
      esAccionCampo: false,
      activa: true,
      orden: 1,
    }
  });
  console.log(`  ✅ Template 1 created: ${t1.id} | ${t1.nombre}`);

  // Template 2
  const t2 = await prisma.pTTareaTemplate.create({
    data: {
      areaId: AREA_IDS.ADMIN,
      subAreaId: DEPTS.ADMIN_OPERACIONES,
      nombre: 'Revisión y actualización de procesos internos',
      descripcion: 'Revisar si los procesos operativos documentados siguen vigentes. Actualizar manuales, checklists y flujos de trabajo según cambios recientes en la operación.',
      tipo: 'CHECK',
      frecuencia: 'MENSUAL',
      diasSemana: [5],
      semanaDeMes: [5],
      impacto: 'alto',
      contexto: 'independiente',
      puestoDefault: 'Administrador General',
      responsableId: EMILIANO_ID,
      moduloDestino: '/configuracion',
      moduloTexto: 'Configuración',
      moduloDisponible: true,
      esAccionCampo: false,
      activa: true,
      orden: 2,
    }
  });
  console.log(`  ✅ Template 2 created: ${t2.id} | ${t2.nombre}`);

  console.log('\n=== PASO 5: Checking orphan templates ===\n');
  const orphans = await prisma.pTTareaTemplate.findMany({
    where: {
      subAreaId: null,
      areaId: { in: Object.values(AREA_IDS) }
    },
    select: { id: true, nombre: true, areaId: true }
  });
  console.log(`Orphans count: ${orphans.length}`);
  if (orphans.length > 0) {
    console.log('ORPHANS:', JSON.stringify(orphans, null, 2));
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total assigned: ${assigned}`);
  console.log(`Not found: ${notFound.length}`);
  if (notFound.length > 0) {
    console.log('Not found list:', JSON.stringify(notFound, null, 2));
  }
  console.log('By department:', JSON.stringify(counts, null, 2));
  console.log(`\nTemplate 1 ID: ${t1.id}`);
  console.log(`Template 2 ID: ${t2.id}`);
  console.log(`Orphans: ${orphans.length}`);

  if (orphans.length === 0) {
    console.log('\n=== PASO 5: Deleting old subAreas ===');
    const OLD_SUBAREA_IDS = [
      // ADMIN (5)
      'cmpvf7zu900d1cctv8f4l4e7l',
      'cmpvf7zyo00drcctvwgmdl9sw',
      'cmpvf802c00ebcctv1ov621b1',
      'cmpvf803k00ejcctv2mz0pfw6',
      'cmpvf806n00f3cctvxj7o72e6',
      // MARKETING (4)
      'cmpvf808r00fdcctvpj69t0qb',
      'cmpvf80a100flcctvgj6nr5eu',
      'cmpvf80ek00g7cctv4mcdtifm',
      'cmpvf80gq00glcctv25zcgwqg',
      // VENTAS (6)
      'cmpvf80j200gvcctvcvk15nl1',
      'cmpvf80nw00hjcctvvgjuguwo',
      'cmpvf80ri00i5cctvvmmzhsum',
      'cmpvf80sy00ibcctv11wplz8m',
      'cmpvf80tu00ihcctvhshrivpe',
      'cmpvf80uq00incctvphjaf467',
      // PRODUCCIÓN (10)
      'cmpvf80wb00ixcctv6jw1esjx',
      'cmpvf811d00jncctverr2atya',
      'cmpvf813k00jxcctvqge8dkg9',
      'cmpvf815200k7cctv311co7ex',
      'cmpvf816100kdcctvr9cvo45y',
      'cmpvf818o00ktcctv8mddt43y',
      'cmpvf81bu00lbcctvjotlls7m',
      'cmpvf81cf00lfcctv5wrd0kmk',
      'cmpvf81e000lpcctvigmariat',
      'cmpvf81hr00mdcctv2c0hxzmn',
    ];
    const deleteResult = await prisma.pTSubArea.deleteMany({
      where: { id: { in: OLD_SUBAREA_IDS } }
    });
    console.log(`Deleted ${deleteResult.count} old subAreas`);
  } else {
    console.log('\n⚠️  SKIPPING delete of old subAreas because orphans > 0. Fix orphans first!');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
