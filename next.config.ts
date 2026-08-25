import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Identificador único por deploy. Se usa para versionar el service worker y sus
// cachés: al cambiar en cada build, fuerza al navegador a instalar el SW nuevo
// y purgar el bundle viejo (evita ChunkLoadError / "Algo salió mal" tras deploy).
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now());

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  outputFileTracingExcludes: {
    "*": ["./public/images/**", "./public/uploads/**"],
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 60,
    },
  },
  async redirects() {
    return [
      // ── Wizard del trato retirado (Fase 6): el proceso vive en la página del
      //    trato como registro único; el brief se edita en ?panel=descubrimiento. ──
      { source: "/crm/tratos/:id/wizard",    destination: "/crm/tratos/:id?panel=descubrimiento", permanent: true },
      // ── Descubrimiento público: /f (retirado) → /descubrimiento ──────────────
      // Links de formulario ya enviados por WhatsApp siguen funcionando.
      { source: "/f/:token",                 destination: "/descubrimiento/:token",     permanent: true },
      // ── Calendario de eventos → Calendarios (módulo con pestañas) ────────────
      { source: "/calendario",               destination: "/calendarios/eventos",       permanent: true },
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
      // ── Candidatos: movido de RRHH/Personal a Dirección → Organización ───────
      { source: "/personal/candidatos/:path*",   destination: "/organizacion/candidatos/:path*",    permanent: true },
      { source: "/personal/candidatos",          destination: "/organizacion/candidatos",           permanent: true },
      { source: "/reclutamiento/candidatos",     destination: "/organizacion/candidatos",           permanent: true },
      { source: "/reclutamiento",                destination: "/organizacion/candidatos",           permanent: true },
      // ── Integración/Onboarding y Configuración RRHH: retirados ───────────────
      { source: "/personal/onboarding",          destination: "/personal/interno",                  permanent: true },
      { source: "/rrhh/onboarding",              destination: "/personal/interno",                  permanent: true },
      { source: "/personal/configuracion",       destination: "/personal/interno",                  permanent: true },
      { source: "/reclutamiento/configuracion",  destination: "/personal/interno",                  permanent: true },
      // ── Organización (movido de RRHH/Personal a Dirección) ───────────────────
      { source: "/personal/organigrama",         destination: "/organizacion/organigrama",          permanent: true },
      { source: "/personal/puestos-operativos",  destination: "/organizacion/puestos",              permanent: true },
      { source: "/personal/politicas",           destination: "/organizacion/politicas",            permanent: true },
      { source: "/rrhh/organigrama",             destination: "/organizacion/organigrama",          permanent: true },
      { source: "/rrhh/puestos-operativos",      destination: "/organizacion/puestos",              permanent: true },
      { source: "/rrhh/politicas",               destination: "/organizacion/politicas",            permanent: true },
      // ── Puestos ideales (fusionado en Organización → Puestos) ────────────────
      { source: "/rrhh/puestos",                 destination: "/organizacion/puestos",              permanent: true },
      { source: "/personal/puestos",             destination: "/organizacion/puestos",              permanent: true },
      { source: "/reclutamiento/puestos",        destination: "/organizacion/puestos",              permanent: true },
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
