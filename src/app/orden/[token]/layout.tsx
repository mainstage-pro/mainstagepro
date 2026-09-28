"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { OrdenProvider, useOrden } from "./OrdenContext";
import { FONT, haceCuanto } from "./ui";

const SECCIONES = [
  { slug: "", label: "Resumen", icono: "M4 6h16M4 12h16M4 18h10" },
  { slug: "cronologia", label: "Horarios", icono: "M12 8v4l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { slug: "equipo", label: "Equipo", icono: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { slug: "carga", label: "Carga", icono: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" },
  { slug: "archivos", label: "Archivos", icono: "M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9zM13 2v7h7" },
];

function Cascaron({ children }: { children: React.ReactNode }) {
  const { orden, error, token } = useOrden();
  const pathname = usePathname();
  const base = `/orden/${token}`;
  const activa = pathname === base ? "" : pathname.replace(`${base}/`, "").split("/")[0];

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6" style={{ fontFamily: FONT }}>
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 mx-auto mb-8 opacity-30" draggable={false} />
          <p className="text-white/50 font-semibold mb-2">{error}</p>
          <p className="text-white/25 text-sm">Pide al coordinador que te comparta el enlace vigente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: FONT }}>
      {/* Encabezado: qué evento es y qué tan fresco está lo que se ve. */}
      <header className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-2xl mx-auto px-5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest">
                Orden de producción{orden ? ` · ${orden.numeroProyecto}` : ""}
              </p>
              <h1 className="text-white font-bold text-[15px] leading-tight truncate">
                {orden?.nombre ?? "Cargando…"}
              </h1>
            </div>
            {orden && (
              <span className="shrink-0 text-white/25 text-[10px] text-right leading-tight">
                Actualizado
                <br />
                {haceCuanto(orden.actualizadoEn)}
              </span>
            )}
          </div>
        </div>

        {/* Navegación superior — en celular el tab bar de abajo hace el trabajo. */}
        <nav className="hidden sm:block border-t border-white/5">
          <div className="max-w-2xl mx-auto px-5 flex gap-1">
            {SECCIONES.map((s) => {
              const on = activa === s.slug;
              return (
                <Link
                  key={s.slug}
                  href={s.slug ? `${base}/${s.slug}` : base}
                  className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    on ? "border-[#B3985B] text-white" : "border-transparent text-white/35 hover:text-white/70"
                  }`}
                >
                  {s.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-5 pt-5 pb-28 sm:pb-12">{children}</main>

      {/* Tab bar inferior: el pulgar alcanza las secciones sin recolocar el teléfono. */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-black/95 backdrop-blur-xl border-t border-white/8 pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {SECCIONES.map((s) => {
            const on = activa === s.slug;
            return (
              <Link
                key={s.slug}
                href={s.slug ? `${base}/${s.slug}` : base}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
                  on ? "text-[#B3985B]" : "text-white/30"
                }`}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={s.icono} />
                </svg>
                <span className="text-[10px] font-medium">{s.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function OrdenLayout({ children }: { children: React.ReactNode }) {
  const { token } = useParams<{ token: string }>();
  return (
    <OrdenProvider token={token}>
      <Cascaron>{children}</Cascaron>
    </OrdenProvider>
  );
}
