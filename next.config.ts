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
