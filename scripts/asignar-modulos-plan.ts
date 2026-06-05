import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// key: nombre contains (case insensitive), value: { moduloDestino, moduloTexto, esAccionCampo }
const ASIGNACIONES: { buscar: string; datos: { moduloDestino?: string; moduloTexto?: string; esAccionCampo?: boolean } }[] = [
  // GENERAL
  { buscar: 'Reporte General Semanal',                     datos: { moduloDestino: '/kpis', moduloTexto: 'KPIs' } },
  { buscar: 'Revisión mensual de KPIs',                    datos: { moduloDestino: '/kpis', moduloTexto: 'KPIs' } },
  { buscar: 'Junta global del lunes',                      datos: { esAccionCampo: true } },
  { buscar: 'Junta de área',                               datos: { esAccionCampo: true } },
  { buscar: 'Sesión de capacitación semanal',             datos: { esAccionCampo: true } },

  // DIRECCIÓN
  { buscar: 'Cierre de semana — revisión de KPIs',        datos: { moduloDestino: '/kpis', moduloTexto: 'KPIs' } },
  { buscar: 'Bloque de deep work',                         datos: { esAccionCampo: true } },
  { buscar: 'Lectura y formación personal',               datos: { esAccionCampo: true } },
  { buscar: 'Sesión de retroalimentación individual',     datos: { esAccionCampo: true } },
  { buscar: 'Evaluación de desempeño trimestral',        datos: { moduloDestino: '/rrhh/satisfaccion', moduloTexto: 'Satisfacción del equipo' } },
  { buscar: 'Sesión de estrategia trimestral',           datos: { esAccionCampo: true } },
  { buscar: 'Contacto de construcción de red',           datos: { moduloDestino: '/crm/clientes', moduloTexto: 'Clientes' } },
  { buscar: 'Representación de Mainstage Pro',           datos: { moduloDestino: '/crm/clientes', moduloTexto: 'Clientes' } },
  { buscar: 'Lectura de reportes del equipo',             datos: { moduloDestino: '/plan-trabajo/plan', moduloTexto: 'Plan de Trabajo' } },
  { buscar: 'Preparación de agenda de juntas',           datos: { moduloDestino: '/plan-trabajo/plan', moduloTexto: 'Plan de Trabajo' } },
  { buscar: 'Envío de reporte semanal general al equipo', datos: { moduloDestino: '/operaciones', moduloTexto: 'Módulo de tareas' } },

  // ADMINISTRACIÓN — Control Financiero
  { buscar: 'Registro de movimientos financieros',        datos: { moduloDestino: '/finanzas/movimientos', moduloTexto: 'Movimientos' } },
  { buscar: 'Conciliación bancaria',                     datos: { moduloDestino: '/finanzas/movimientos', moduloTexto: 'Movimientos' } },
  { buscar: 'Flujo de caja proyectado',                   datos: { moduloDestino: '/finanzas/reporte#flujo', moduloTexto: 'Flujo de Efectivo' } },
  { buscar: 'Planeación presupuestal por evento',        datos: { moduloDestino: '/proyectos', moduloTexto: 'Proyectos de evento' } },
  { buscar: 'Cierre financiero por evento',               datos: { moduloDestino: '/proyectos', moduloTexto: 'Proyectos de evento' } },
  { buscar: 'Reporte de gastos por categoría',          datos: { moduloDestino: '/finanzas/reporte', moduloTexto: 'Estado de Resultados' } },
  { buscar: 'Estado de resultados mensual',               datos: { moduloDestino: '/finanzas/reporte', moduloTexto: 'Estado de Resultados' } },
  { buscar: 'Facturación y emisión de CFDI',           datos: { moduloDestino: '/finanzas/movimientos', moduloTexto: 'Movimientos' } },
  { buscar: 'Entrega documental a contabilidad',         datos: { esAccionCampo: true } },
  { buscar: 'Archivo y organización documental',        datos: { esAccionCampo: true } },

  // ADMINISTRACIÓN — CxC y CxP
  { buscar: 'Gestión y seguimiento de cuentas por cobrar', datos: { moduloDestino: '/finanzas/cobros-pagos', moduloTexto: 'Cobros y pagos' } },
  { buscar: 'Seguimiento de anticipos de eventos',        datos: { moduloDestino: '/finanzas/cobros-pagos', moduloTexto: 'Cobros y pagos' } },
  { buscar: 'Programación y agenda de pagos',            datos: { moduloDestino: '/finanzas/cobros-pagos', moduloTexto: 'Cobros y pagos' } },
  { buscar: 'Pago de sueldos semanales',                  datos: { moduloDestino: '/finanzas/pagos-personal', moduloTexto: 'Pagos a personal' } },
  { buscar: 'Liquidación de técnicos post-evento',      datos: { moduloDestino: '/finanzas/pagos-personal', moduloTexto: 'Pagos a personal' } },
  { buscar: 'Pago a proveedores y subrentas',             datos: { moduloDestino: '/finanzas/cobros-pagos', moduloTexto: 'Cobros y pagos' } },
  { buscar: 'Pago de servicios y gastos fijos',           datos: { moduloDestino: '/finanzas/movimientos', moduloTexto: 'Movimientos' } },
  { buscar: 'Reabastecimiento de caja chica',             datos: { moduloDestino: '/finanzas/caja-chica', moduloTexto: 'Caja chica' } },
  { buscar: 'Entrega de presupuesto operativo',           datos: { moduloDestino: '/finanzas/caja-chica', moduloTexto: 'Caja chica' } },

  // ADMINISTRACIÓN — RRHH
  { buscar: 'Control de asistencia del equipo',           datos: { moduloDestino: '/rrhh/asistencia', moduloTexto: 'Control de asistencia' } },
  { buscar: 'Confirmación de servicio de limpieza',      datos: { esAccionCampo: true } },
  { buscar: 'Confirmar servicio de limpieza',             datos: { esAccionCampo: true } },
  { buscar: 'Confirmar servicio limpieza',                datos: { esAccionCampo: true } },
  { buscar: 'Envío de formulario de satisfacción al empleado', datos: { moduloDestino: '/rrhh/satisfaccion', moduloTexto: 'Satisfacción del equipo' } },
  { buscar: 'Envío de formulario de satisfacción al freelancer', datos: { moduloDestino: '/rrhh/satisfaccion', moduloTexto: 'Satisfacción del equipo' } },

  // ADMINISTRACIÓN — Reportes
  { buscar: 'Consolidar KPIs de todas las áreas',        datos: { moduloDestino: '/kpis', moduloTexto: 'KPIs' } },
  { buscar: 'Entregar semáforo de salud del negocio',    datos: { moduloDestino: '/kpis', moduloTexto: 'KPIs' } },
  { buscar: 'Análisis de rentabilidad por tipo de evento', datos: { moduloDestino: '/finanzas/reporte', moduloTexto: 'Estado de Resultados' } },
  { buscar: 'Presentar resultados financieros',           datos: { moduloDestino: '/finanzas/reporte', moduloTexto: 'Estado de Resultados' } },

  // MARKETING — Contenido
  { buscar: 'Publicar contenido orgánico',               datos: { moduloDestino: '/marketing/contenido', moduloTexto: 'Contenido' } },
  { buscar: 'Atención a mensajes directos',              datos: { moduloDestino: '/marketing/contenido', moduloTexto: 'Contenido' } },
  { buscar: 'Propuesta de parrilla mensual de contenido', datos: { moduloDestino: '/marketing/contenido', moduloTexto: 'Contenido' } },
  { buscar: 'Entrega de material de contenido',          datos: { moduloDestino: '/marketing/contenido', moduloTexto: 'Contenido' } },

  // MARKETING — Campanas
  { buscar: 'Revisión y optimización de campanas',      datos: { moduloDestino: '/marketing/publicidad', moduloTexto: 'Publicidad' } },
  { buscar: 'Reporte de resultados de campanas',         datos: { moduloDestino: '/marketing/publicidad', moduloTexto: 'Publicidad' } },
  { buscar: 'Propuesta de calendario de campanas',       datos: { moduloDestino: '/marketing/publicidad', moduloTexto: 'Publicidad' } },
  { buscar: 'Desarrollo de nuevos creativos',            datos: { moduloDestino: '/marketing/publicidad', moduloTexto: 'Publicidad' } },

  // MARKETING — Producción Material
  { buscar: 'Subir y organizar contenido grabado',       datos: { moduloDestino: '/marketing/contenido', moduloTexto: 'Contenido' } },
  { buscar: 'Organización y respaldo de material',      datos: { esAccionCampo: true } },
  { buscar: 'Selección de mejores piezas',              datos: { esAccionCampo: true } },
  { buscar: 'Actualización del banco de imágenes',     datos: { esAccionCampo: true } },

  // MARKETING — Estrategia
  { buscar: 'Reporte de resultados de contenido orgánico', datos: { moduloDestino: '/marketing/resultados', moduloTexto: 'Resultados' } },
  { buscar: 'Reporte de KPIs del área con propuestas',   datos: { moduloDestino: '/kpis', moduloTexto: 'KPIs' } },

  // VENTAS — Pipeline
  { buscar: 'Revisión y priorización del pipeline',     datos: { moduloDestino: '/crm/tratos', moduloTexto: 'Tratos' } },
  { buscar: 'Seguimiento a oportunidades sin respuesta', datos: { moduloDestino: '/ventas/seguimientos', moduloTexto: 'Seguimientos' } },
  { buscar: 'Seguimiento y atención a clientes activos',datos: { moduloDestino: '/ventas/seguimientos', moduloTexto: 'Seguimientos' } },
  { buscar: 'Descubrimiento completo con leads',         datos: { moduloDestino: '/crm/tratos', moduloTexto: 'Tratos' } },
  { buscar: 'Elaboración y envío de cotizaciones',      datos: { moduloDestino: '/crm/tratos', moduloTexto: 'Tratos' } },
  { buscar: 'Transferencia de venta cerrada',            datos: { moduloDestino: '/proyectos', moduloTexto: 'Proyectos de evento' } },
  { buscar: 'Atención y resolución de incidencias comerciales', datos: { moduloDestino: '/crm/tratos', moduloTexto: 'Tratos' } },

  // VENTAS — Prospección
  { buscar: 'Prospección outbound',                      datos: { moduloDestino: '/ventas/seguimientos', moduloTexto: 'Seguimientos' } },
  { buscar: 'Contactar clientes inactivos',              datos: { moduloDestino: '/ventas/seguimientos', moduloTexto: 'Seguimientos' } },
  { buscar: 'Desarrollo de relación con clientes priority', datos: { moduloDestino: '/ventas/cartera', moduloTexto: 'Cartera KARE' } },
  { buscar: 'Mensaje quincenal de presencia a cartera',  datos: { moduloDestino: '/ventas/cartera', moduloTexto: 'Cartera KARE' } },

  // VENTAS — Ofertas
  { buscar: 'Crear y desarrollar ofertas comerciales',   datos: { moduloDestino: '/crm/tratos', moduloTexto: 'Tratos' } },
  { buscar: 'Enviar formulario de satisfacción al cliente post-evento', datos: { moduloDestino: '/rrhh/satisfaccion', moduloTexto: 'Satisfacción del equipo' } },

  // VENTAS — Medición
  { buscar: 'Revisar tasa de cierre',                    datos: { moduloDestino: '/ventas/reporte', moduloTexto: 'Reporte de ventas' } },
  { buscar: 'Analizar ticket promedio',                  datos: { moduloDestino: '/ventas/reporte', moduloTexto: 'Reporte de ventas' } },
  { buscar: 'Reporte de seguimiento y fortalecimiento',  datos: { moduloDestino: '/ventas/reporte', moduloTexto: 'Reporte de ventas' } },
  { buscar: 'Seguimiento post-evento a clientes',        datos: { moduloDestino: '/ventas/seguimientos', moduloTexto: 'Seguimientos' } },
  { buscar: 'Reporte de atención post-evento',          datos: { moduloDestino: '/ventas/reporte', moduloTexto: 'Reporte de ventas' } },

  // PRODUCCIÓN — Bodega
  { buscar: 'Inventario semanal de consumibles',         datos: { moduloDestino: '/inventario/checklist', moduloTexto: 'Checklist semanal' } },
  { buscar: 'Inventario de breakouts',                   datos: { moduloDestino: '/inventario/equipos', moduloTexto: 'Equipos' } },
  { buscar: 'Mapa de bodega',                            datos: { moduloDestino: '/inventario/maestro', moduloTexto: 'Inventario maestro' } },
  { buscar: 'Recorrido de bodega',                       datos: { moduloDestino: '/inventario/equipos', moduloTexto: 'Equipos' } },
  { buscar: 'Apoyo en revisión de equipos',             datos: { moduloDestino: '/inventario/equipos', moduloTexto: 'Equipos' } },
  { buscar: 'Apoyo en preparación y separación de equipos', datos: { moduloDestino: '/inventario/disponibilidad', moduloTexto: 'Disponibilidad' } },
  { buscar: 'Reporte de faltantes en bodega',            datos: { moduloDestino: '/inventario/equipos', moduloTexto: 'Equipos' } },
  { buscar: 'Recolección y firma de cartas responsivas', datos: { moduloDestino: '/catalogo/tecnicos', moduloTexto: 'Técnicos freelance' } },
  { buscar: 'Seguimiento de tickets y facturas',         datos: { moduloDestino: '/finanzas/movimientos', moduloTexto: 'Movimientos' } },
  { buscar: 'Solicitar presupuesto para eventos',        datos: { moduloDestino: '/finanzas/caja-chica', moduloTexto: 'Caja chica' } },
  { buscar: 'Impresión de hojas de entrega',            datos: { moduloDestino: '/proyectos', moduloTexto: 'Proyectos de evento' } },

  // PRODUCCIÓN — Mantenimiento
  { buscar: 'Limpiar y revisar equipo al regreso',       datos: { moduloDestino: '/inventario/mantenimiento', moduloTexto: 'Mantenimiento' } },
  { buscar: 'Llevar equipos a mantenimiento',            datos: { moduloDestino: '/inventario/mantenimiento', moduloTexto: 'Mantenimiento' } },
  { buscar: 'Dar seguimiento a equipos en taller',       datos: { moduloDestino: '/inventario/mantenimiento', moduloTexto: 'Mantenimiento' } },
  { buscar: 'Registrar historial de mantenimiento',      datos: { moduloDestino: '/inventario/mantenimiento', moduloTexto: 'Mantenimiento' } },
  { buscar: 'Verificar cables, adaptadores',             datos: { moduloDestino: '/inventario/equipos', moduloTexto: 'Equipos' } },

  // PRODUCCIÓN — Coordinación
  { buscar: 'Leer información del proyecto',            datos: { moduloDestino: '/proyectos', moduloTexto: 'Proyectos de evento' } },
  { buscar: 'Llenar información de montaje',           datos: { moduloDestino: '/proyectos', moduloTexto: 'Proyectos de evento' } },
  { buscar: 'Contratar personal técnico',              datos: { moduloDestino: '/catalogo/tecnicos', moduloTexto: 'Técnicos freelance' } },
  { buscar: 'Contratar equipos a subarrendar',          datos: { moduloDestino: '/catalogo/proveedores', moduloTexto: 'Proveedores' } },
  { buscar: 'Crear checklist y rider de salida',        datos: { moduloDestino: '/inventario/checklist', moduloTexto: 'Checklist semanal' } },
  { buscar: 'Crear grupo de WhatsApp del evento',       datos: { esAccionCampo: true } },
  { buscar: 'Coordinar tiempos, transporte',            datos: { moduloDestino: '/proyectos', moduloTexto: 'Proyectos de evento' } },
  { buscar: 'Reporte semanal de eventos confirmados',   datos: { moduloDestino: '/proyectos', moduloTexto: 'Proyectos de evento' } },

  // PRODUCCIÓN — Post Producción
  { buscar: 'Supervisar regreso y conteo completo',     datos: { moduloDestino: '/inventario/recolecciones', moduloTexto: 'Recolecciones' } },
  { buscar: 'Reportar incidencias, daños, faltantes',  datos: { moduloDestino: '/inventario/mantenimiento', moduloTexto: 'Mantenimiento' } },
  { buscar: 'Entregar reporte de coordinación',        datos: { moduloDestino: '/proyectos', moduloTexto: 'Proyectos de evento' } },
  { buscar: 'Documentar aprendizajes operativos',       datos: { moduloDestino: '/proyectos', moduloTexto: 'Proyectos de evento' } },
  { buscar: 'Cerrar proyecto en plataforma',            datos: { moduloDestino: '/proyectos', moduloTexto: 'Proyectos de evento' } },
  { buscar: 'Calcular costo real de producción',       datos: { moduloDestino: '/proyectos', moduloTexto: 'Proyectos de evento' } },

  // PRODUCCIÓN — Vehículos
  { buscar: 'Revisar estado general de vehículos',     datos: { moduloDestino: '/inventario/vehiculos', moduloTexto: 'Vehículos' } },
  { buscar: 'Programar y llevar vehículos a mantenimiento', datos: { moduloDestino: '/inventario/vehiculos', moduloTexto: 'Vehículos' } },
  { buscar: 'Registrar incidencias o daños en vehículos', datos: { moduloDestino: '/inventario/vehiculos', moduloTexto: 'Vehículos' } },
  { buscar: 'Coordinar logística de gasolina',         datos: { esAccionCampo: true } },
  { buscar: 'Gestionar documentación de vehículos',    datos: { moduloDestino: '/inventario/vehiculos', moduloTexto: 'Vehículos' } },
  { buscar: 'Llevar control de gastos de transporte',  datos: { moduloDestino: '/finanzas/movimientos', moduloTexto: 'Movimientos' } },

  // DIRECCIÓN — Asistente General Daniel
  { buscar: 'Verificar insumos y materiales',           datos: { esAccionCampo: true } },
  { buscar: 'Supervisión de instalaciones de oficina', datos: { esAccionCampo: true } },
  { buscar: 'Registro de acuerdos y compromisos en juntas', datos: { moduloDestino: '/operaciones', moduloTexto: 'Módulo de tareas' } },
  { buscar: 'Seguimiento a compromisos del equipo',    datos: { moduloDestino: '/operaciones', moduloTexto: 'Módulo de tareas' } },
  { buscar: 'Apoyo en prospección y seguimiento comercial', datos: { moduloDestino: '/ventas/seguimientos', moduloTexto: 'Seguimientos' } },
  { buscar: 'Seguimiento a clientes en espera',        datos: { moduloDestino: '/crm/tratos', moduloTexto: 'Tratos' } },
  { buscar: 'Checklist de servicio a camioneta',       datos: { moduloDestino: '/inventario/vehiculos', moduloTexto: 'Vehículos' } },
]

async function main() {
  console.log(`\nEjecutando asignación de módulos para ${ASIGNACIONES.length} reglas...\n`)
  let actualizados = 0
  const noEncontrados: string[] = []

  for (const asig of ASIGNACIONES) {
    const templates = await prisma.pTTareaTemplate.findMany({
      where: { nombre: { contains: asig.buscar, mode: 'insensitive' } },
      select: { id: true, nombre: true },
    })

    if (templates.length === 0) {
      noEncontrados.push(asig.buscar)
      continue
    }

    for (const t of templates) {
      const updateData: Record<string, unknown> = {}
      if (asig.datos.moduloDestino !== undefined) updateData.moduloDestino = asig.datos.moduloDestino
      if (asig.datos.moduloTexto   !== undefined) updateData.moduloTexto   = asig.datos.moduloTexto
      if (asig.datos.esAccionCampo !== undefined) updateData.esAccionCampo = asig.datos.esAccionCampo
      updateData.moduloDisponible = true

      await prisma.pTTareaTemplate.update({ where: { id: t.id }, data: updateData })
      console.log(`  ✓ [${t.nombre}]`)
      actualizados++
    }
  }

  console.log(`\n──────────────────────────────`)
  console.log(`Actualizados: ${actualizados}`)
  console.log(`No encontrados (${noEncontrados.length}):`, noEncontrados)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
