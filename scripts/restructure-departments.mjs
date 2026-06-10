/**
 * restructure-departments.mjs
 * Run with: node scripts/restructure-departments.mjs
 *
 * PASO 2: Create 22 new departments (PTSubArea)
 * PASO 3: Reassign all templates to correct departments
 * PASO 4: Create 2 new templates in Admin > Operaciones y Procesos
 * PASO 5: Delete old subareas
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Area IDs ─────────────────────────────────────────────────────────────────
const ADMIN_AREA_ID   = 'cmpni9la300007vq0dukclr37'
const MKTG_AREA_ID    = 'cmpni9liv002b7vq0elmhjmh5'
const VENTAS_AREA_ID  = 'cmpni9loy00487vq0m13gnld8'
const PROD_AREA_ID    = 'cmpni9luh00637vq0d16tiirr'

// ── User ID ───────────────────────────────────────────────────────────────────
const EMILIANO_ID = 'cmo7ikcc00000oqfsqwzys8g4'

// ── Old subarea IDs to delete ─────────────────────────────────────────────────
const OLD_SUBAREA_IDS = [
  // ADMIN
  'cmpvf7zu900d1cctv8f4l4e7l',
  'cmpvf7zyo00drcctvwgmdl9sw',
  'cmpvf802c00ebcctv1ov621b1',
  'cmpvf803k00ejcctv2mz0pfw6',
  'cmpvf806n00f3cctvxj7o72e6',
  // MARKETING
  'cmpvf808r00fdcctvpj69t0qb',
  'cmpvf80a100flcctvgj6nr5eu',
  'cmpvf80ek00g7cctv4mcdtifm',
  'cmpvf80gq00glcctv25zcgwqg',
  // VENTAS
  'cmpvf80j200gvcctvcvk15nl1',
  'cmpvf80nw00hjcctvvgjuguwo',
  'cmpvf80ri00i5cctvvmmzhsum',
  'cmpvf80sy00ibcctv11wplz8m',
  'cmpvf80tu00ihcctvhshrivpe',
  'cmpvf80uq00incctvphjaf467',
  // PRODUCCIÓN
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
]

// ── Helper: get template ID by exact name in an area ─────────────────────────
async function getTemplateId(nombre, areaId) {
  const t = await prisma.pTTareaTemplate.findFirst({
    where: { nombre, areaId },
    select: { id: true },
  })
  return t?.id ?? null
}

async function main() {
  console.log('━━━ PASO 2: Creando nuevos departamentos ━━━')

  // ── ADMINISTRACIÓN ───────────────────────────────────────────────────────
  const adminFinanzas = await prisma.pTSubArea.create({
    data: { areaId: ADMIN_AREA_ID, nombre: 'Finanzas y Contabilidad', orden: 1 },
  })
  console.log('✓ Admin > Finanzas y Contabilidad:', adminFinanzas.id)

  const adminRRHH = await prisma.pTSubArea.create({
    data: { areaId: ADMIN_AREA_ID, nombre: 'Recursos Humanos', orden: 2 },
  })
  console.log('✓ Admin > Recursos Humanos:', adminRRHH.id)

  const adminOps = await prisma.pTSubArea.create({
    data: { areaId: ADMIN_AREA_ID, nombre: 'Operaciones y Procesos', orden: 3 },
  })
  console.log('✓ Admin > Operaciones y Procesos:', adminOps.id)

  const adminReportes = await prisma.pTSubArea.create({
    data: { areaId: ADMIN_AREA_ID, nombre: 'Reportes y Métricas', orden: 4 },
  })
  console.log('✓ Admin > Reportes y Métricas:', adminReportes.id)

  // ── MARKETING ────────────────────────────────────────────────────────────
  const mktgContent = await prisma.pTSubArea.create({
    data: { areaId: MKTG_AREA_ID, nombre: 'Content & Media Management', orden: 1 },
  })
  console.log('✓ Marketing > Content & Media Management:', mktgContent.id)

  const mktgPublicidad = await prisma.pTSubArea.create({
    data: { areaId: MKTG_AREA_ID, nombre: 'Publicidad y Campañas', orden: 2 },
  })
  console.log('✓ Marketing > Publicidad y Campañas:', mktgPublicidad.id)

  const mktgDiseno = await prisma.pTSubArea.create({
    data: { areaId: MKTG_AREA_ID, nombre: 'Diseño Gráfico', orden: 3 },
  })
  console.log('✓ Marketing > Diseño Gráfico:', mktgDiseno.id)

  const mktgReportes = await prisma.pTSubArea.create({
    data: { areaId: MKTG_AREA_ID, nombre: 'Reportes y Métricas', orden: 4 },
  })
  console.log('✓ Marketing > Reportes y Métricas:', mktgReportes.id)

  // ── VENTAS ───────────────────────────────────────────────────────────────
  const ventasAtencion = await prisma.pTSubArea.create({
    data: { areaId: VENTAS_AREA_ID, nombre: 'Atención a Clientes', orden: 1 },
  })
  console.log('✓ Ventas > Atención a Clientes:', ventasAtencion.id)

  const ventasProspeccion = await prisma.pTSubArea.create({
    data: { areaId: VENTAS_AREA_ID, nombre: 'Prospección', orden: 2 },
  })
  console.log('✓ Ventas > Prospección:', ventasProspeccion.id)

  const ventasCotizaciones = await prisma.pTSubArea.create({
    data: { areaId: VENTAS_AREA_ID, nombre: 'Cotizaciones, Seguimientos y Cierres', orden: 3 },
  })
  console.log('✓ Ventas > Cotizaciones, Seguimientos y Cierres:', ventasCotizaciones.id)

  const ventasHerramientas = await prisma.pTSubArea.create({
    data: { areaId: VENTAS_AREA_ID, nombre: 'Desarrollo de Herramientas de Venta', orden: 4 },
  })
  console.log('✓ Ventas > Desarrollo de Herramientas de Venta:', ventasHerramientas.id)

  const ventasRRPP = await prisma.pTSubArea.create({
    data: { areaId: VENTAS_AREA_ID, nombre: 'Relaciones Públicas', orden: 5 },
  })
  console.log('✓ Ventas > Relaciones Públicas:', ventasRRPP.id)

  const ventasReportes = await prisma.pTSubArea.create({
    data: { areaId: VENTAS_AREA_ID, nombre: 'Reportes y Métricas', orden: 6 },
  })
  console.log('✓ Ventas > Reportes y Métricas:', ventasReportes.id)

  // ── PRODUCCIÓN ───────────────────────────────────────────────────────────
  const prodBodega = await prisma.pTSubArea.create({
    data: { areaId: PROD_AREA_ID, nombre: 'Orden y Control de Bodega', orden: 1 },
  })
  console.log('✓ Prod > Orden y Control de Bodega:', prodBodega.id)

  const prodMantenimiento = await prisma.pTSubArea.create({
    data: { areaId: PROD_AREA_ID, nombre: 'Mantenimiento y Servicio a Equipos', orden: 2 },
  })
  console.log('✓ Prod > Mantenimiento y Servicio a Equipos:', prodMantenimiento.id)

  const prodPreProd = await prisma.pTSubArea.create({
    data: { areaId: PROD_AREA_ID, nombre: 'Pre Producción Técnica', orden: 3 },
  })
  console.log('✓ Prod > Pre Producción Técnica:', prodPreProd.id)

  const prodCoord = await prisma.pTSubArea.create({
    data: { areaId: PROD_AREA_ID, nombre: 'Coordinación de Producción', orden: 4 },
  })
  console.log('✓ Prod > Coordinación de Producción:', prodCoord.id)

  const prodPracticas = await prisma.pTSubArea.create({
    data: { areaId: PROD_AREA_ID, nombre: 'Prácticas y Capacitaciones Técnicas', orden: 5 },
  })
  console.log('✓ Prod > Prácticas y Capacitaciones Técnicas:', prodPracticas.id)

  const prodReportes = await prisma.pTSubArea.create({
    data: { areaId: PROD_AREA_ID, nombre: 'Reportes y Métricas', orden: 6 },
  })
  console.log('✓ Prod > Reportes y Métricas:', prodReportes.id)

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n━━━ PASO 3: Reasignando templates ━━━')

  let assigned = 0
  const notFound = []

  async function assign(nombre, areaId, subAreaId) {
    const id = await getTemplateId(nombre, areaId)
    if (!id) {
      notFound.push({ nombre, areaId })
      console.warn('  ✗ NOT FOUND:', nombre)
      return
    }
    await prisma.pTTareaTemplate.update({ where: { id }, data: { subAreaId } })
    assigned++
  }

  // ── ADMINISTRACIÓN > Finanzas y Contabilidad ──────────────────────────
  console.log('\n  → Admin > Finanzas y Contabilidad')
  const finanzasTemplates = [
    'Registro de movimientos financieros',
    'Reporte de gastos por categoría',
    'Conciliación bancaria',
    'Cierre financiero por evento',
    'Entrega documental a contabilidad externa',
    'Programación y agenda de pagos de la semana',
    'Planeación presupuestal por evento',
    'Estado de resultados mensual',
    'Facturación y emisión de CFDI',
    'Cartera actualizada (CxC y CxP)',
    'Pago de nómina semanal',
    'Gestión y seguimiento de cuentas por cobrar',
    'Seguimiento de anticipos de eventos próximos',
    'Reabastecimiento de caja chica',
    'Pago a técnicos y freelancers post-evento',
    'Pago a proveedores y subrentas',
    'Pago de renta mensual operativa',
    'Pago de servicios y gastos fijos',
    'Reporte de equipos subarrendados y costos',
    'Entrega de presupuesto y recursos operativos a Producción',
    'Aprobación y registro de gastos operativos del evento',
  ]
  for (const n of finanzasTemplates) await assign(n, ADMIN_AREA_ID, adminFinanzas.id)

  // ── ADMINISTRACIÓN > Recursos Humanos ─────────────────────────────────
  console.log('\n  → Admin > Recursos Humanos')
  const rrhhTemplates = [
    'Control de asistencia del equipo',
    'Registro de incidencias de personal',
    'Reporte de asistencias mensual',
    'Control de insumos de oficina',
    'Envío de formulario de satisfacción al freelancer',
    'Reporte mensual de incidencias',
    'Envío de formulario de satisfacción al equipo interno',
    'Coordinación del servicio de limpieza de oficina',
    'Revisión y consolidación de formularios de satisfacción empleados',
  ]
  for (const n of rrhhTemplates) await assign(n, ADMIN_AREA_ID, adminRRHH.id)

  // ── ADMINISTRACIÓN > Reportes y Métricas ──────────────────────────────
  console.log('\n  → Admin > Reportes y Métricas')
  const adminReportesTemplates = [
    'Dashboard de KPIs consolidado de todas las áreas',
    'Reporte de KPIs del área con propuestas de mejora',
    'Reporte de uso de equipos',
  ]
  for (const n of adminReportesTemplates) await assign(n, ADMIN_AREA_ID, adminReportes.id)

  // ── MARKETING > Content & Media Management ────────────────────────────
  console.log('\n  → Marketing > Content & Media Management')
  const contentTemplates = [
    'Atención a mensajes directos, comentarios y comunidad en redes',
    'Publicar contenido orgánico — feed, stories y reels',
    'Reporte de resultados de contenido orgánico',
    'Evaluacion de publicación de contenido organico',
    'Sesión de creación de contenido mensual',
    'Subir y organizar contenido grabado con iPhone',
    'Entrega de levantamientos en eventos',
    'Entrega de material de contenido mensual para revisión',
    'Organización y respaldo de material post-evento',
    'Selección de mejores piezas — carpeta SELECCIÓN',
    'Actualización del banco de imágenes y archivo en Drive',
    'Propuesta de parrilla mensual de contenido orgánico',
    'Identificación de tendencias del sector',
  ]
  for (const n of contentTemplates) await assign(n, MKTG_AREA_ID, mktgContent.id)

  // ── MARKETING > Publicidad y Campañas ────────────────────────────────
  console.log('\n  → Marketing > Publicidad y Campañas')
  const pubTemplates = [
    'Revisión y optimización de campañas en Meta Ads',
    'Reporte de resultados de campañas',
    'Propuesta de calendario de campañas del mes',
    'Desarrollo de nuevos creativos para campañas',
    'Evaluacion de ejecución de campañas',
  ]
  for (const n of pubTemplates) await assign(n, MKTG_AREA_ID, mktgPublicidad.id)

  // ── MARKETING > Diseño Gráfico ────────────────────────────────────────
  console.log('\n  → Marketing > Diseño Gráfico')
  await assign('Producción de material gráfico', MKTG_AREA_ID, mktgDiseno.id)

  // ── MARKETING > Reportes y Métricas ──────────────────────────────────
  console.log('\n  → Marketing > Reportes y Métricas')
  await assign('Reporte de KPIs del área con propuestas de mejora', MKTG_AREA_ID, mktgReportes.id)

  // ── VENTAS > Atención a Clientes ──────────────────────────────────────
  console.log('\n  → Ventas > Atención a Clientes')
  const atencionTemplates = [
    'Confirmación de eventos y anticipos',
    'Reporte de atención post-evento',
    'Seguimiento y atención a clientes activos',
    'Seguimiento post-evento a clientes',
    'Reporte de seguimiento y fortalecimiento de relación con clientes',
    'Mensaje quincenal de presencia a cartera de clientes',
    'Desarrollo de relación con clientes priority',
    'Nurturing de clientes recurrentes y prioridad',
  ]
  for (const n of atencionTemplates) await assign(n, VENTAS_AREA_ID, ventasAtencion.id)

  // ── VENTAS > Prospección ───────────────────────────────────────────────
  console.log('\n  → Ventas > Prospección')
  const prospeccionTemplates = [
    'Prospección outbound — contactar prospectos estratégicos',
    'Contacto con clientes inactivos',
    'Mantenimiento de base de prospectos',
    'Contacto semanal con venue o aliado clave',
    'Identificación y desarrollo de alianzas comerciales',
    'Reporte de prospectos outbound',
  ]
  for (const n of prospeccionTemplates) await assign(n, VENTAS_AREA_ID, ventasProspeccion.id)

  // ── VENTAS > Cotizaciones, Seguimientos y Cierres ─────────────────────
  console.log('\n  → Ventas > Cotizaciones, Seguimientos y Cierres')
  const cotizacionesTemplates = [
    'Revisión y priorización del pipeline activo',
    'Seguimiento a oportunidades sin respuesta +3 días',
    'Seguimiento a propuestas enviadas pendientes',
    'Transferencia de venta cerrada a Producción',
    'Descubrimiento completo con leads calificados',
    'Elaboración y envío de cotizaciones',
    'Atención y resolución de incidencias comerciales',
  ]
  for (const n of cotizacionesTemplates) await assign(n, VENTAS_AREA_ID, ventasCotizaciones.id)

  // ── VENTAS > Desarrollo de Herramientas de Venta ──────────────────────
  console.log('\n  → Ventas > Desarrollo de Herramientas de Venta')
  const herramientasTemplates = [
    'Definición de paquetes de servicio por tipo de evento',
    'Propuesta de campaña comercial por temporalidad',
  ]
  for (const n of herramientasTemplates) await assign(n, VENTAS_AREA_ID, ventasHerramientas.id)

  // ── VENTAS > Reportes y Métricas ──────────────────────────────────────
  console.log('\n  → Ventas > Reportes y Métricas')
  const ventasReportesTemplates = [
    'Reporte de ventas semanal',
    'Reporte de KPIs del área con propuestas de mejora',
    'Reporte de comisión a vendedores',
    'Consolidado de ventas del mes',
  ]
  for (const n of ventasReportesTemplates) await assign(n, VENTAS_AREA_ID, ventasReportes.id)

  // ── PRODUCCIÓN > Orden y Control de Bodega ────────────────────────────
  console.log('\n  → Prod > Orden y Control de Bodega')
  const bodegaTemplates = [
    'Hojas de entrega — archivo semanal',
    'Recepción y validación de equipos post-evento',
    'Registro de entradas y salidas de equipo',
    'Auditoría completa de inventario',
    'Devolución de equipos subarrendados',
    'Reporte de checklist semanal de equipos',
    'Reporte de estado de vehículos',
    'Inventario semanal de consumibles',
    'Impresión de hojas de entrega y checklists',
    'Cierre semanal de bodega',
    'Reporte de faltantes en bodega y oficina',
    'Limpieza de bodega: piso, pasillos y áreas de trabajo',
    'Mantenimiento del orden de bodega durante el día',
    'Recolección de basura en bodega y patio',
    'Limpieza profunda en bodega — cierre de semana',
  ]
  for (const n of bodegaTemplates) await assign(n, PROD_AREA_ID, prodBodega.id)

  // ── PRODUCCIÓN > Mantenimiento y Servicio a Equipos ───────────────────
  console.log('\n  → Prod > Mantenimiento y Servicio a Equipos')
  const mantenimientoTemplates = [
    'Revisión funcional de equipos según plan de revisión',
    'Revisión de disponibilidad de consumibles',
    'Limpieza de equipos e identificación de golpes',
    'Reporte de reparación y equipos en mantenimiento',
    'Recolección de equipos reparados',
    'Envío de equipos a mantenimiento o reparación',
    'Registro del historial de mantenimiento por equipo',
    'Compras operativas y reposición de consumibles',
    'Seguimiento a equipos en reparación',
  ]
  for (const n of mantenimientoTemplates) await assign(n, PROD_AREA_ID, prodMantenimiento.id)

  // ── PRODUCCIÓN > Pre Producción Técnica ───────────────────────────────
  console.log('\n  → Prod > Pre Producción Técnica')
  const preProduccionTemplates = [
    'Revisión completa de proyectos activos en plataforma',
    'Reporte de gastos operativos próximos',
    'Mantenimiento de base de datos de técnicos freelance',
    'Cálculo de pagos a freelancers y proveedores',
    'Terminar checklist / rider de salida de equipos',
    'Terminar ficha técnica de eventos próximos',
    'Creación del grupo de WhatsApp de los eventos',
    'Plan de producción completo del evento',
    'Contratación y confirmación de personal técnico',
    'Contratación y confirmación de transporte externo',
    'Contratación de equipos a subarrendar',
    'Archivo de cartas responsivas freelancers',
    'Solicitar presupuesto para eventos del fin de semana',
    'Recolección y firma de cartas responsivas de freelancers',
    'Separación y preparación de equipos por evento',
    'Validación final de carga — checklist de salida firmado',
    'Últimos detalles y verificación final de operación/producción',
  ]
  for (const n of preProduccionTemplates) await assign(n, PROD_AREA_ID, prodPreProd.id)

  // ── PRODUCCIÓN > Coordinación de Producción ───────────────────────────
  console.log('\n  → Prod > Coordinación de Producción')
  const coordTemplates = [
    'Coordinación de tiempos, llegadas y montaje en campo',
    'Coordinación técnica durante el evento',
    'Revisión de retroalimentación y actualización de protocolos e junta',
    'Cierre del proyecto en plataforma',
    'Reporte general de ejecución de eventos',
    'Apoyo en recepción y acomodo de equipos post-evento',
    'Apoyo en trámites y gestiones externas básicas',
  ]
  for (const n of coordTemplates) await assign(n, PROD_AREA_ID, prodCoord.id)

  // ── PRODUCCIÓN > Prácticas y Capacitaciones Técnicas ─────────────────
  console.log('\n  → Prod > Prácticas y Capacitaciones Técnicas')
  const practicasTemplates = [
    'Apoyo en revisión de equipos (martes)',
    'Apoyo en preparación y separación de equipos (jueves)',
  ]
  for (const n of practicasTemplates) await assign(n, PROD_AREA_ID, prodPracticas.id)

  // ── PRODUCCIÓN > Reportes y Métricas ─────────────────────────────────
  console.log('\n  → Prod > Reportes y Métricas')
  const prodReportesTemplates = [
    'Reporte de KPIs del área con propuestas de mejora',
    'Reporte de KPIs de Bodega con propuestas de mejora',
  ]
  for (const n of prodReportesTemplates) await assign(n, PROD_AREA_ID, prodReportes.id)

  console.log(`\n  Asignados: ${assigned}`)
  if (notFound.length > 0) {
    console.log('  Templates NO encontrados:')
    for (const nf of notFound) console.log('   -', nf.nombre, '|', nf.areaId)
  }

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n━━━ PASO 4: Creando 2 nuevos templates ━━━')

  const template1 = await prisma.pTTareaTemplate.create({
    data: {
      areaId: ADMIN_AREA_ID,
      subAreaId: adminOps.id,
      responsableId: EMILIANO_ID,
      nombre: 'Mantenimiento y actualización de plataforma Mainstage',
      descripcion: 'Revisar bugs reportados, implementar mejoras pendientes e integrar nuevas funcionalidades en la plataforma Mainstage Pro. Coordinar con equipo de desarrollo si aplica.',
      tipo: 'CHECK',
      frecuencia: 'SEMANAL',
      diasSemana: [2, 4],
      semanaDeMes: [],
      impacto: 'alto',
      contexto: 'independiente',
      puestoDefault: 'Administrador General',
      moduloDestino: '/configuracion',
      moduloTexto: 'Configuración',
      moduloDisponible: true,
      esAccionCampo: false,
      activa: true,
      orden: 1,
    },
  })
  console.log('✓ Template 1 creado:', template1.id, '-', template1.nombre)

  const template2 = await prisma.pTTareaTemplate.create({
    data: {
      areaId: ADMIN_AREA_ID,
      subAreaId: adminOps.id,
      responsableId: EMILIANO_ID,
      nombre: 'Revisión y actualización de procesos internos',
      descripcion: 'Revisar si los procesos operativos documentados siguen vigentes. Actualizar manuales, checklists y flujos de trabajo según cambios recientes en la operación.',
      tipo: 'CHECK',
      frecuencia: 'MENSUAL',
      diasSemana: [],
      semanaDeMes: [5],
      impacto: 'alto',
      contexto: 'independiente',
      puestoDefault: 'Administrador General',
      moduloDestino: '/configuracion',
      moduloTexto: 'Configuración',
      moduloDisponible: true,
      esAccionCampo: false,
      activa: true,
      orden: 2,
    },
  })
  console.log('✓ Template 2 creado:', template2.id, '-', template2.nombre)

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n━━━ PASO 5: Verificando templates huérfanos antes de eliminar subareas ━━━')

  const orphans = await prisma.pTTareaTemplate.count({
    where: {
      subAreaId: { in: OLD_SUBAREA_IDS },
      areaId: { in: [ADMIN_AREA_ID, MKTG_AREA_ID, VENTAS_AREA_ID, PROD_AREA_ID] },
    },
  })
  console.log(`  Templates aún apuntando a subareas antiguas: ${orphans}`)

  if (orphans > 0) {
    const orphanList = await prisma.pTTareaTemplate.findMany({
      where: {
        subAreaId: { in: OLD_SUBAREA_IDS },
      },
      select: { id: true, nombre: true, subAreaId: true },
    })
    console.log('  Templates huérfanos:')
    for (const o of orphanList) console.log('   -', o.id, '|', o.nombre, '|', o.subAreaId)
    console.log('\n  ⚠ Hay templates huérfanos. No se eliminarán las subareas antiguas.')
    console.log('    Por favor, reasigna manualmente los templates listados arriba.')
  } else {
    console.log('  Ningún template apunta a subareas antiguas. Procediendo a eliminar...')
    const deleted = await prisma.pTSubArea.deleteMany({
      where: { id: { in: OLD_SUBAREA_IDS } },
    })
    console.log(`  ✓ Eliminadas ${deleted.count} subareas antiguas`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n━━━ RESUMEN FINAL ━━━')
  console.log('\nNuevos departamentos creados:')
  console.log('  ADMIN:')
  console.log('   ', adminFinanzas.id, '— Finanzas y Contabilidad')
  console.log('   ', adminRRHH.id, '— Recursos Humanos')
  console.log('   ', adminOps.id, '— Operaciones y Procesos')
  console.log('   ', adminReportes.id, '— Reportes y Métricas')
  console.log('  MARKETING:')
  console.log('   ', mktgContent.id, '— Content & Media Management')
  console.log('   ', mktgPublicidad.id, '— Publicidad y Campañas')
  console.log('   ', mktgDiseno.id, '— Diseño Gráfico')
  console.log('   ', mktgReportes.id, '— Reportes y Métricas')
  console.log('  VENTAS:')
  console.log('   ', ventasAtencion.id, '— Atención a Clientes')
  console.log('   ', ventasProspeccion.id, '— Prospección')
  console.log('   ', ventasCotizaciones.id, '— Cotizaciones, Seguimientos y Cierres')
  console.log('   ', ventasHerramientas.id, '— Desarrollo de Herramientas de Venta')
  console.log('   ', ventasRRPP.id, '— Relaciones Públicas')
  console.log('   ', ventasReportes.id, '— Reportes y Métricas')
  console.log('  PRODUCCIÓN:')
  console.log('   ', prodBodega.id, '— Orden y Control de Bodega')
  console.log('   ', prodMantenimiento.id, '— Mantenimiento y Servicio a Equipos')
  console.log('   ', prodPreProd.id, '— Pre Producción Técnica')
  console.log('   ', prodCoord.id, '— Coordinación de Producción')
  console.log('   ', prodPracticas.id, '— Prácticas y Capacitaciones Técnicas')
  console.log('   ', prodReportes.id, '— Reportes y Métricas')
  console.log('\nNuevos templates:')
  console.log('   ', template1.id, '—', template1.nombre)
  console.log('   ', template2.id, '—', template2.nombre)
}

main()
  .catch(e => { console.error('ERROR:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
