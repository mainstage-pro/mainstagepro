import type React from "react";
import { Target } from "lucide-react";

// ── Tipos de navegación ──────────────────────────────────────────────────────
export interface NavChild {
  key?: string;
  accessKey?: string;
  label: string;
  href: string;
  adminOnly?: boolean;
}

export interface NavItem {
  key?: string;
  accessKey?: string;
  label: string;
  href?: string;
  adminOnly?: boolean;
  children?: NavChild[];
  badge?: string; // key used to look up badge counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: React.ComponentType<any>; // optional lucide icon
}

export interface NavSection {
  key: string;
  section: string;
  items: NavItem[];
}

// ── Fuente única de verdad del menú lateral ──────────────────────────────────
// El Sidebar renderiza esto y el módulo de "Usuarios y accesos" deriva de aquí
// la lista de permisos por módulo. Al agregar un módulo nuevo aquí, aparece
// automáticamente en la sección "Por módulo" de permisos.
export const NAV: NavSection[] = [
  // ── INICIO (siempre visible, sin encabezado) ───────────────────────────────
  {
    key: "seccion-top",
    section: "",
    items: [
      { label: "Mi Dashboard", href: "/dashboard" },
      { key: "calendario", label: "Calendario de eventos", href: "/calendario" },
      {
        key: "gestion-operativa",
        accessKey: "operaciones",
        label: "Gestión Operativa",
        href: "/gestion",
        children: [
          { accessKey: "operaciones", label: "Centro Operativo", href: "/gestion/resumen" },
          { key: "plan-trabajo", label: "Plan de trabajo", href: "/plan-trabajo" },
          { key: "operaciones", label: "Módulo de tareas", href: "/operaciones" },
          { accessKey: "proyectos", label: "Proyectos internos", href: "/proyectos-internos" },
          { accessKey: "operaciones", label: "Bandeja de entrada", href: "/gestion/bandeja" },
        ],
      },
      {
        key: "metas",
        label: "Metas",
        href: "/metas",
        icon: Target,
        adminOnly: true,
        children: [
          { key: "objetivos", label: "Objetivos", href: "/objetivos", adminOnly: true },
          { key: "kpis-dashboard", label: "KPIs", href: "/kpis", adminOnly: true },
        ],
      },
    ],
  },

  // ── DIRECCIÓN ──────────────────────────────────────────────────────────────
  {
    key: "seccion-direccion",
    section: "Dirección",
    items: [
      { key: "dir-estado-resultados", label: "Estado de Resultados", href: "/direccion/estado-resultados", adminOnly: true },
      {
        key: "coordinacion",
        label: "Coordinación",
        href: "/coordinacion",
        children: [
          { key: "juntas", label: "Juntas", href: "/juntas" },
          { key: "vision-semanal", label: "Visión semanal", href: "/vision-semanal" },
          { key: "formularios", label: "Formularios", href: "/formularios", adminOnly: true },
        ],
      },
      { key: "presentaciones", label: "Presentaciones", href: "/presentaciones" },
    ],
  },

  // ── ADMINISTRACIÓN ─────────────────────────────────────────────────────────
  {
    key: "seccion-administracion",
    section: "Administración",
    items: [
      {
        key: "finanzas",
        label: "Finanzas",
        href: "/finanzas",
        children: [
          { key: "finanzas-cobros", label: "Cobros y pagos", href: "/finanzas/cobros-pagos" },
          { key: "finanzas-pagos-personal", label: "Pagos a personal", href: "/finanzas/pagos-personal" },
          { key: "finanzas-movimientos", label: "Movimientos", href: "/finanzas/movimientos" },
          { key: "finanzas-caja-chica", label: "Caja chica", href: "/finanzas/caja-chica" },
          { key: "finanzas-cuentas", accessKey: "finanzas-movimientos", label: "Cuentas bancarias", href: "/finanzas/cuentas" },
          { key: "finanzas-pasivos", label: "Pasivos y deudas", href: "/finanzas/pasivos", adminOnly: true },
          { key: "finanzas-repartos", label: "Reparto de utilidades", href: "/finanzas/repartos", adminOnly: true },
          { key: "finanzas-config", label: "Configuración", href: "/finanzas/configuracion", adminOnly: true },
        ],
      },
      {
        key: "activos",
        label: "Activos",
        href: "/activos",
        children: [
          { key: "inventario-activos-admin", label: "Inventario de activos", href: "/admin/valuacion", adminOnly: true },
          { key: "inv-analisis", label: "Análisis de uso de equipo", href: "/inventario/analisis" },
        ],
      },
      { key: "socios-constitutivos", label: "Socios Constitutivos", href: "/socios" },
      { key: "tabulador", label: "Tabulador Freelancers", href: "/catalogo/roles" },
      { key: "admin-reportes", label: "Reportes de administración", href: "/admin/reportes", adminOnly: true },
      // ── Recursos Humanos (dentro de Administración) ────────────────────────
      {
        key: "rrhh",
        label: "Personal",
        href: "/personal",
        children: [
          { key: "rrhh-personal", label: "Personal interno", href: "/rrhh/personal" },
          { key: "rrhh-nomina", label: "Nómina", href: "/rrhh/nomina" },
          { key: "rrhh-asistencia", label: "Asistencia", href: "/rrhh/asistencia" },
          { key: "rrhh-evaluaciones", label: "Evaluaciones", href: "/rrhh/evaluaciones" },
          { key: "rrhh-satisfaccion", label: "Satisfacción equipo", href: "/rrhh/satisfaccion" },
        ],
      },
      {
        key: "capacitacion-grp",
        label: "Capacitación",
        href: "/formacion",
        children: [
          { key: "capacitacion", label: "Portal de capacitación", href: "/capacitacion" },
          { key: "rrhh-capacitaciones", label: "Capacitaciones internas", href: "/rrhh/capacitaciones" },
        ],
      },
      { key: "rrhh-onboarding", label: "Integración / Onboarding", href: "/rrhh/onboarding" },
      {
        key: "ats",
        label: "Reclutamiento",
        href: "/reclutamiento",
        children: [
          { key: "rrhh-candidatos", label: "Candidatos", href: "/rrhh/candidatos" },
          { key: "rrhh-puestos", label: "Puestos ideales", href: "/rrhh/puestos" },
          { key: "rrhh-config", label: "Configuración", href: "/rrhh/configuracion" },
        ],
      },
    ],
  },

  // ── MARKETING ──────────────────────────────────────────────────────────────
  {
    key: "seccion-marketing",
    section: "Marketing",
    items: [
      { key: "mkt-contenido",   label: "Contenido",        href: "/marketing/contenido" },
      { key: "mkt-publicidad",  label: "Publicidad",        href: "/marketing/publicidad" },
      { key: "mkt-resultados",  label: "Reporte de marketing", href: "/marketing/resultados", adminOnly: true },
      { key: "mkt-config",      label: "Configuración",        href: "/marketing/configuracion" },
    ],
  },

  // ── COMERCIAL ──────────────────────────────────────────────────────────────
  {
    key: "seccion-ventas",
    section: "Comercial",
    items: [
      {
        key: "crm-tratos",
        label: "Ventas",
        href: "/crm/tratos",
        badge: "leads",
        children: [
          { key: "crm-tratos", label: "Ventas", href: "/crm/tratos/lista" },
          { key: "cotizaciones", accessKey: "crm-tratos", label: "Cotizaciones", href: "/cotizaciones" },
          { key: "cotizaciones-plantillas", accessKey: "crm-tratos", label: "Plantillas", href: "/cotizaciones/plantillas" },
          { key: "crm-base-de-datos", label: "Clientes", href: "/crm/base-de-datos" },
          { key: "ventas-seguimientos", label: "Seguimientos", href: "/ventas/seguimientos" },
        ],
      },
      {
        key: "comercial-productos",
        label: "Productos y paquetes",
        href: "/comercial/productos",
        children: [
          { key: "comercial-productos", label: "Productos y paquetes", href: "/comercial/productos" },
          { key: "grupos-equipo", label: "Grupos de equipo", href: "/admin/grupos-equipo", adminOnly: true },
        ],
      },
      { key: "ventas-reporte",          label: "Reporte de ventas",          href: "/ventas/reporte" },
      { key: "ventas-config",           label: "Configuración",              href: "/ventas/configuracion", adminOnly: true },
    ],
  },

  // ── PRODUCCIÓN ─────────────────────────────────────────────────────────────
  {
    key: "seccion-produccion",
    section: "Producción",
    items: [
      { key: "proyectos", label: "Proyectos de evento", href: "/proyectos" },
      {
        key: "inventario",
        label: "Equipos",
        href: "/equipos",
        children: [
          { key: "inv-maestro", label: "Inventario de equipos", href: "/inventario/maestro" },
          { key: "produccion-tablero", label: "Estado de equipos", href: "/produccion/tablero" },
          { key: "inv-disponibilidad", accessKey: "inventario", label: "Disponibilidad", href: "/inventario/disponibilidad" },
          { key: "inv-recolecciones", accessKey: "inventario", label: "Recolecciones", href: "/inventario/recolecciones" },
          { key: "inv-mantenimiento", accessKey: "inventario", label: "Mantenimiento", href: "/inventario/mantenimiento" },
          { key: "inv-checklist", accessKey: "inventario", label: "Checklist semanal", href: "/inventario/checklist" },
          { key: "inv-vehiculos", accessKey: "inventario", label: "Vehículos", href: "/inventario/vehiculos" },
        ],
      },
      {
        key: "catalogo",
        label: "Directorio",
        href: "/directorio",
        children: [
          { key: "bd-proveedores", label: "Proveedores", href: "/catalogo/proveedores" },
          { key: "bd-tecnicos", label: "Técnicos freelance", href: "/catalogo/tecnicos" },
          { key: "bd-venues", accessKey: "catalogo", label: "Venues", href: "/catalogo/venues" },
          { key: "bd-empresas", accessKey: "catalogo", label: "Empresas", href: "/catalogo/empresas" },
        ],
      },
      { key: "reporte-produccion", label: "Reporte de producción", href: "/produccion/reporte" },
      { key: "produccion-config", label: "Configuración", href: "/produccion/configuracion" },
    ],
  },

  // ── CONFIGURACIÓN ──────────────────────────────────────────────────────────
  {
    key: "seccion-config",
    section: "Configuración",
    items: [
      { key: "admin-usuarios", label: "Usuarios y accesos", href: "/admin/usuarios" },
      { key: "admin-actividad", label: "Log de actividad", href: "/admin/actividad" },
      { key: "configuracion", label: "Configuración global", href: "/admin/configuracion", adminOnly: true },
    ],
  },
];

// ── Derivación de la lista de permisos por módulo ────────────────────────────
// Título de sección de permisos según el `section` del NAV.
const SECTION_TITLES: Record<string, string> = {
  "": "GLOBAL",
  "Gestión Operativa": "GESTIÓN OPERATIVA",
  "Comercial": "COMERCIAL",
  "Producción": "PRODUCCIÓN",
  "Marketing": "MARKETING",
  "Administración": "ADMINISTRACIÓN",
  "Recursos Humanos": "RECURSOS HUMANOS",
  "Dirección": "DIRECCIÓN",
  "Configuración": "CONFIGURACIÓN",
};

// Overrides de etiqueta/descripción para claves de acceso. La etiqueta cae al
// label del NAV si no hay override; la descripción es opcional.
const MODULE_META: Record<string, { label?: string; desc?: string }> = {
  calendario:            { desc: "Vista y reportes de eventos" },
  "vision-semanal":      { desc: "Visión semanal del equipo" },
  operaciones:           { label: "Centro Operativo", desc: "Centro operativo, bandeja de entrada y módulo de tareas" },
  "plan-trabajo":        { desc: "Plan de trabajo y tareas personales" },
  proyectos:             { label: "Proyectos", desc: "Proyectos de evento e internos" },
  juntas:                { desc: "Minutas y acuerdos de juntas" },
  presentaciones:        { desc: "Presentaciones de ventas y dirección" },
  capacitacion:          { desc: "Portal de capacitación" },
  "admin-usuarios":      { desc: "Gestión de usuarios y sus permisos" },
  "admin-actividad":     { desc: "Registro de actividad de usuarios" },
  "finanzas-cobros":     { desc: "Cobros y pagos de proyectos" },
  "finanzas-pagos-personal": { desc: "Pagos a personal" },
  "finanzas-movimientos":    { desc: "Movimientos financieros" },
  "finanzas-caja-chica":     { desc: "Caja chica" },
  "inv-analisis":        { desc: "Análisis de uso de equipo" },
  "rrhh-personal":       { desc: "Personal interno" },
  "rrhh-nomina":         { desc: "Nómina" },
  "rrhh-asistencia":     { desc: "Asistencia" },
  "rrhh-evaluaciones":   { desc: "Evaluaciones de desempeño" },
  "rrhh-satisfaccion":   { desc: "Satisfacción del equipo" },
  "rrhh-capacitaciones": { desc: "Capacitaciones internas" },
  "rrhh-onboarding":     { desc: "Integración / Onboarding" },
  "rrhh-candidatos":     { desc: "Candidatos" },
  "rrhh-puestos":        { desc: "Puestos ideales" },
  "rrhh-config":         { label: "Configuración de reclutamiento", desc: "Configuración de reclutamiento" },
  "socios-constitutivos":{ label: "Socios Constitutivos", desc: "Gestión de socios de activos" },
  tabulador:             { desc: "Roles técnicos y tarifas de freelancers" },
  "mkt-contenido":       { desc: "Estrategia y calendario de contenido" },
  "mkt-publicidad":      { desc: "Campañas y pauta" },
  "mkt-config":          { label: "Configuración de marketing", desc: "Configuración de marketing" },
  "crm-tratos":          { label: "Ventas", desc: "Pipeline de ventas y tratos" },
  "crm-base-de-datos":   { label: "Clientes", desc: "Base de datos de clientes (CRM)" },
  "comercial-productos": { desc: "Productos y paquetes comerciales" },
  "ventas-seguimientos": { desc: "Seguimientos de tratos" },
  "ventas-reporte":      { desc: "Métricas y reportes de ventas" },
  "produccion-tablero":  { label: "Estado de equipos", desc: "Tablero de estado de equipos (en taller / fuera / disponible)" },
  inventario:            { label: "Bodega", desc: "Disponibilidad, recolecciones, mantenimiento, checklist y vehículos" },
  "inv-maestro":         { desc: "Catálogo maestro de equipos" },
  "bd-proveedores":      { desc: "Directorio de proveedores" },
  "bd-tecnicos":         { desc: "Directorio de técnicos freelance" },
  catalogo:              { label: "Base de datos producción", desc: "Proveedores, técnicos y venues" },
  "reporte-produccion":  { desc: "Reporte de producción" },
  "produccion-config":   { label: "Configuración de producción", desc: "Configuración de producción" },
};

export interface PermModule { key: string; label: string; desc: string }
export interface PermSection { seccion: string; items: PermModule[] }

// Accesos que NO son items del sidebar pero sí controlan visibilidad (tareas por
// área en el módulo de tareas). Se anexan manualmente al final.
const TAREAS_SECTION: PermSection = {
  seccion: "ACCESOS MÓDULO DE TAREAS",
  items: [
    { key: "tareas-ventas",         label: "Tareas · Ventas",         desc: "Ver tareas del área de Ventas" },
    { key: "tareas-produccion",     label: "Tareas · Producción",     desc: "Ver tareas del área de Producción" },
    { key: "tareas-marketing",      label: "Tareas · Marketing",      desc: "Ver tareas del área de Marketing" },
    { key: "tareas-administracion", label: "Tareas · Administración", desc: "Ver tareas del área de Administración" },
    { key: "tareas-rrhh",           label: "Tareas · RRHH",           desc: "Ver tareas del área de RRHH" },
    { key: "tareas-direccion",      label: "Tareas · Dirección",      desc: "Ver tareas del área de Dirección" },
  ],
};

/**
 * Deriva la lista de permisos por módulo a partir del NAV. Recorre cada sección
 * y emite una entrada por cada clave de acceso distinta (`accessKey ?? key`) de
 * los items visibles para no-admin. Los items `adminOnly` se omiten (nunca
 * aplican a usuarios regulares). Deduplica claves compartidas globalmente.
 */
export function deriveModulePermissions(): PermSection[] {
  const seen = new Set<string>();
  const sections: PermSection[] = [];

  for (const nav of NAV) {
    const items: PermModule[] = [];

    const push = (gateKey: string | undefined, fallbackLabel: string) => {
      if (!gateKey || seen.has(gateKey)) return;
      seen.add(gateKey);
      const meta = MODULE_META[gateKey];
      items.push({ key: gateKey, label: meta?.label ?? fallbackLabel, desc: meta?.desc ?? "" });
    };

    for (const item of nav.items) {
      if (item.adminOnly) continue;
      if (item.children) {
        for (const child of item.children) {
          if (child.adminOnly) continue;
          const gk = child.accessKey ?? child.key;
          // Si la clave del hijo es la del grupo, usa el label del grupo.
          const fallbackLabel = gk && gk === item.key ? item.label : child.label;
          push(gk, fallbackLabel);
        }
      } else {
        push(item.accessKey ?? item.key, item.label);
      }
    }

    if (items.length > 0) {
      sections.push({ seccion: SECTION_TITLES[nav.section] ?? (nav.section || "GLOBAL").toUpperCase(), items });
    }
  }

  sections.push(TAREAS_SECTION);
  return sections;
}

export const MODULOS_POR_SECCION: PermSection[] = deriveModulePermissions();
export const ALL_MODULE_KEYS: string[] = MODULOS_POR_SECCION.flatMap(s => s.items.map(i => i.key));

// ── Presets de acceso por área ───────────────────────────────────────────────
// Accesos por defecto cuando un usuario no-admin no tiene accesos explícitos, y
// base para el botón "Preset {área}". Usa claves granulares (las mismas que
// derivan del NAV) para que el acceso otorgado sea funcional.
export const AREA_MODULE_PRESETS: Record<string, string[]> = {
  ADMINISTRACION: [
    "plan-trabajo", "operaciones", "calendario", "vision-semanal",
    "finanzas-cobros", "finanzas-pagos-personal", "finanzas-movimientos", "finanzas-caja-chica", "inv-analisis",
    "rrhh-personal", "rrhh-nomina", "rrhh-asistencia", "rrhh-evaluaciones", "rrhh-satisfaccion", "rrhh-capacitaciones", "rrhh-onboarding",
    "rrhh-candidatos", "rrhh-puestos", "rrhh-config",
    "socios-constitutivos", "tabulador",
    "tareas-administracion",
  ],
  MARKETING: [
    "plan-trabajo", "operaciones", "calendario", "vision-semanal",
    "mkt-contenido", "mkt-publicidad", "mkt-config",
    "tareas-marketing",
  ],
  VENTAS: [
    "plan-trabajo", "operaciones", "calendario", "vision-semanal",
    "ventas-seguimientos", "crm-tratos", "crm-base-de-datos", "comercial-productos", "ventas-reporte",
    "tareas-ventas",
  ],
  PRODUCCION: [
    "plan-trabajo", "operaciones", "calendario", "vision-semanal",
    "proyectos", "produccion-tablero", "inventario", "inv-maestro", "catalogo", "bd-proveedores", "bd-tecnicos",
    "tareas-produccion",
  ],
  RRHH: [
    "plan-trabajo", "operaciones", "calendario", "vision-semanal",
    "rrhh-personal", "rrhh-nomina", "rrhh-asistencia", "rrhh-evaluaciones", "rrhh-satisfaccion", "rrhh-capacitaciones", "rrhh-onboarding",
    "rrhh-candidatos", "rrhh-puestos", "rrhh-config",
    "tareas-rrhh",
  ],
  DIRECCION: [
    "plan-trabajo", "operaciones", "calendario", "vision-semanal",
    "juntas", "presentaciones", "capacitacion",
    "tareas-direccion",
  ],
  GENERAL: [
    "plan-trabajo", "operaciones", "calendario", "vision-semanal",
  ],
};
