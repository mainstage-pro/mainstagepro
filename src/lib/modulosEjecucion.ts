export type ModuloEjecucion = {
  ruta: string
  nombre: string
}

export const GRUPOS_MODULOS: { grupo: string; modulos: ModuloEjecucion[] }[] = [
  {
    grupo: 'Dirección & General',
    modulos: [
      { ruta: '/kpis',              nombre: 'KPIs' },
      { ruta: '/plan-trabajo/plan', nombre: 'Plan de Trabajo' },
      { ruta: '/operaciones',       nombre: 'Módulo de tareas' },
      { ruta: '/calendario',        nombre: 'Calendario de eventos' },
      { ruta: '/dashboard',         nombre: 'Mi Dashboard' },
    ],
  },
  {
    grupo: 'Administración',
    modulos: [
      { ruta: '/finanzas/cobros-pagos',   nombre: 'Cobros y pagos' },
      { ruta: '/finanzas/pagos-personal', nombre: 'Pagos a personal' },
      { ruta: '/finanzas/movimientos',    nombre: 'Movimientos' },
      { ruta: '/finanzas/caja-chica',     nombre: 'Caja chica' },
      { ruta: '/finanzas/reporte',        nombre: 'Estado de Resultados' },
      { ruta: '/finanzas/reporte#flujo',  nombre: 'Flujo de Efectivo' },
      { ruta: '/rrhh/asistencia',         nombre: 'Control de asistencia' },
      { ruta: '/rrhh/satisfaccion',       nombre: 'Satisfacción del equipo' },
    ],
  },
  {
    grupo: 'Marketing',
    modulos: [
      { ruta: '/marketing/contenido',   nombre: 'Contenido' },
      { ruta: '/marketing/publicidad',  nombre: 'Publicidad' },
      { ruta: '/marketing/resultados',  nombre: 'Resultados' },
    ],
  },
  {
    grupo: 'Ventas',
    modulos: [
      { ruta: '/ventas/seguimientos', nombre: 'Seguimientos' },
      { ruta: '/ventas/cartera',      nombre: 'Cartera KARE' },
      { ruta: '/ventas/reporte',      nombre: 'Reporte de ventas' },
      { ruta: '/crm/tratos',          nombre: 'Tratos' },
      { ruta: '/crm/clientes',        nombre: 'Clientes' },
    ],
  },
  {
    grupo: 'Producción',
    modulos: [
      { ruta: '/proyectos',                   nombre: 'Proyectos de evento' },
      { ruta: '/inventario/equipos',          nombre: 'Equipos' },
      { ruta: '/inventario/maestro',          nombre: 'Inventario maestro' },
      { ruta: '/inventario/disponibilidad',   nombre: 'Disponibilidad' },
      { ruta: '/inventario/recolecciones',    nombre: 'Recolecciones' },
      { ruta: '/inventario/mantenimiento',    nombre: 'Mantenimiento' },
      { ruta: '/inventario/checklist',        nombre: 'Checklist semanal' },
      { ruta: '/inventario/vehiculos',        nombre: 'Vehículos' },
      { ruta: '/inventario/analisis',         nombre: 'Análisis de inventario' },
    ],
  },
  {
    grupo: 'Catálogo',
    modulos: [
      { ruta: '/catalogo/proveedores', nombre: 'Proveedores' },
      { ruta: '/catalogo/tecnicos',    nombre: 'Técnicos freelance' },
      { ruta: '/catalogo/venues',      nombre: 'Venues' },
    ],
  },
]

// Flat list for lookups
export const MODULOS_EJECUCION: ModuloEjecucion[] = GRUPOS_MODULOS.flatMap(g => g.modulos)
