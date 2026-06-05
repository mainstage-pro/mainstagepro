import type { NextConfig } from "next";

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
      // /plan-trabajo → /plan-de-trabajo (alias corto)
      { source: "/plan-trabajo",                   destination: "/plan-de-trabajo",                   permanent: false },
      { source: "/plan-trabajo/hoy",               destination: "/plan-de-trabajo/hoy",               permanent: false },
      { source: "/plan-trabajo/plan",              destination: "/plan-de-trabajo/plan",              permanent: false },
      { source: "/plan-trabajo/kpis",              destination: "/plan-de-trabajo/kpis",              permanent: false },
      { source: "/plan-trabajo/:path*",            destination: "/plan-de-trabajo/:path*",            permanent: false },
      // marketing
      { source: "/marketing/calendario",    destination: "/marketing/contenido",               permanent: true },
      { source: "/marketing/kanban",         destination: "/marketing/contenido?vista=kanban",  permanent: true },
      { source: "/marketing/levantamientos", destination: "/marketing/contenido?vista=shoots",  permanent: true },
      { source: "/marketing/metricas",       destination: "/marketing/resultados",              permanent: true },
      { source: "/marketing/contenidos",     destination: "/marketing/contenido?config=tipos",  permanent: true },
      { source: "/marketing/reporte",        destination: "/marketing/resultados",              permanent: true },
      { source: "/marketing/campanas",       destination: "/marketing/publicidad?vista=campanas", permanent: true },
      { source: "/marketing/campanas/calendario", destination: "/marketing/publicidad?vista=calendario", permanent: true },
      { source: "/marketing/meta-ads",       destination: "/marketing/publicidad?vista=meta",  permanent: true },
    ];
  },
};

export default nextConfig;
