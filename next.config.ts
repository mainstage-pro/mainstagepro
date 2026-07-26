import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": ["./public/images/**", "./public/uploads/**"],
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  async redirects() {
    return [
      // ── Proyectos internos → Proyectos de empresa (ruta renombrada) ──────────
      { source: "/proyectos-internos",      destination: "/proyectos-de-empresa",      permanent: true },
      { source: "/proyectos-internos/:id",  destination: "/proyectos-de-empresa/:id",  permanent: true },
      // ── Marketing (legacy routes) ────────────────────────────────────────────
      { source: "/marketing/calendario",         destination: "/marketing/contenido",               permanent: true },
      { source: "/marketing/kanban",             destination: "/marketing/contenido/kanban",        permanent: true },
      { source: "/marketing/levantamientos",     destination: "/marketing/contenido/shoots",        permanent: true },
      { source: "/marketing/metricas",           destination: "/marketing/resultados",              permanent: true },
      { source: "/marketing/contenidos",         destination: "/marketing/contenido/tipos",         permanent: true },
      { source: "/marketing/reporte",            destination: "/marketing/resultados",              permanent: true },
      { source: "/marketing/campanas",           destination: "/marketing/publicidad/campanas",     permanent: true },
      { source: "/marketing/campanas/calendario",destination: "/marketing/publicidad/campanas",     permanent: true },
      { source: "/marketing/meta-ads",           destination: "/marketing/publicidad/campanas",     permanent: true },
      // ── Finanzas (legacy routes) ─────────────────────────────────────────────
      { source: "/finanzas/cxp",                 destination: "/finanzas/cobros-pagos",             permanent: true },
      { source: "/finanzas/cxc",                 destination: "/finanzas/cobros-pagos",             permanent: true },
      { source: "/finanzas/reporte",             destination: "/direccion/estado-resultados",       permanent: true },
      { source: "/finanzas/rentabilidad",        destination: "/admin/reportes",                    permanent: true },
      { source: "/finanzas/pagos",               destination: "/finanzas/cobros-pagos",             permanent: true },
      // ── Operaciones (legacy routes) ──────────────────────────────────────────
      { source: "/backlog",                      destination: "/operaciones",                       permanent: true },
      // ── RRHH (legacy routes) ─────────────────────────────────────────────────
      { source: "/rrhh/incidencias",             destination: "/rrhh/asistencia",                   permanent: true },
      // ── Comercial (legacy routes) ────────────────────────────────────────────
      { source: "/comercial/solicitudes",        destination: "/crm/tratos",                        permanent: true },
      { source: "/ventas",                        destination: "/crm/tratos",                        permanent: true },
      { source: "/ventas/metas",                  destination: "/ventas/reporte",                    permanent: true },
      // ── CRM (legacy routes) ──────────────────────────────────────────────────
      { source: "/crm/clientes",                 destination: "/crm/base-de-datos",                permanent: true },
      { source: "/crm/pipeline",                 destination: "/crm/tratos",                        permanent: true },
      // ── Dashboard / Agenda (legacy routes) ───────────────────────────────────
      { source: "/dashboard/semaforo",            destination: "/dashboard/direccion",               permanent: true },
      { source: "/agenda",                        destination: "/calendario",                        permanent: true },
      { source: "/agenda/semana",                 destination: "/calendario",                        permanent: true },
      // ── Admin (legacy routes) ────────────────────────────────────────────────
      { source: "/admin/plantillas-equipo",      destination: "/inventario/bodega/templates",       permanent: true },
      // ── Inventario (legacy routes) ───────────────────────────────────────────
      { source: "/catalogo/equipos",             destination: "/inventario/maestro",                permanent: true },
      { source: "/inventario/equipos",           destination: "/inventario/maestro",                permanent: true },
      { source: "/inventario/bodega",            destination: "/inventario/checklist",              permanent: true },
      // ── Plan de trabajo (legacy routes) ─────────────────────────────────────
      { source: "/plan-trabajo/kpis",            destination: "/plan-trabajo/rendimiento",          permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Subir source maps a Sentry para ver el código real en los errores (no minificado)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Solo subir source maps si el token está configurado
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // No mostrar logs de Sentry durante el build
  silent: !process.env.CI,
  // Subir source maps en producción
  widenClientFileUpload: true,
  // No envolver páginas con Sentry automáticamente (lo hacemos manual)
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  // Tunnel para evitar bloqueadores de ads
  tunnelRoute: "/monitoring",
  // Subir y eliminar source maps del bundle público después del upload
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  // Desactivar el tree-shaking de Sentry para asegurar que todo funcione
  disableLogger: true,
});
