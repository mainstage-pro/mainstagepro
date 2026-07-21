"use client";
import { useEffect, useState } from "react";
import { WA_URL, useDescubrimiento } from "./descubrimiento";

const GOLD = "#B3985B";

// Navegación única para toda la capa comercial /presentacion. Los enlaces de
// sección apuntan a anclas del home (/presentacion#...) para que funcionen desde
// cualquier subpágina; los de módulo van a su ruta dedicada.
const LINKS = [
  { label: "Servicios", href: "/presentacion#servicios" },
  { label: "Eventos", href: "/presentacion#eventos" },
  { label: "Inventario", href: "/presentacion/inventario" },
  { label: "Proyectos", href: "/presentacion#proyectos" },
  { label: "Galería", href: "/presentacion/galeria" },
];

export default function PresentacionNav({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { iniciar, loading } = useDescubrimiento();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const showBg = solid || scrolled;

  return (
    <>
      <nav
        className="fixed top-0 inset-x-0 z-[100] transition-all duration-500"
        style={{
          background: showBg ? "rgba(8,8,8,0.9)" : "transparent",
          backdropFilter: showBg ? "blur(14px)" : "none",
          borderBottom: showBg ? "1px solid rgba(255,255,255,0.05)" : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <a href="/presentacion" className="flex items-center shrink-0" aria-label="Inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="Mainstage Pro" className="h-7 object-contain" draggable={false} />
          </a>

          {/* Links desktop */}
          <div className="hidden md:flex items-center gap-7">
            {LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-[13px] font-medium text-white/55 hover:text-white transition-colors duration-200"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* CTAs desktop */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-semibold text-white/70 hover:text-white px-4 py-2 rounded-full border border-white/12 hover:border-white/30 transition-all duration-200"
            >
              WhatsApp
            </a>
            <button
              onClick={() => iniciar()}
              disabled={loading}
              className="text-[12px] font-semibold tracking-wide px-5 py-2 rounded-full transition-all duration-200 hover:scale-[1.03] disabled:opacity-60"
              style={{ background: GOLD, color: "#000" }}
            >
              {loading ? "Abriendo…" : "Cotizar"}
            </button>
          </div>

          {/* Botón menú móvil */}
          <button
            onClick={() => setOpen(true)}
            className="md:hidden flex items-center justify-center w-10 h-10 -mr-2 text-white"
            aria-label="Abrir menú"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Overlay menú móvil */}
      <div
        className="fixed inset-0 z-[110] md:hidden transition-all duration-300"
        style={{
          background: "rgba(6,6,6,0.98)",
          backdropFilter: "blur(8px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div className="px-6 h-16 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-7 object-contain" draggable={false} />
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-10 h-10 -mr-2 text-white"
            aria-label="Cerrar menú"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="px-6 pt-6 flex flex-col gap-1">
          <a href="/presentacion" onClick={() => setOpen(false)} className="py-3 text-2xl font-semibold text-white border-b border-white/[0.06]">Inicio</a>
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="py-3 text-2xl font-semibold text-white/80 hover:text-white border-b border-white/[0.06] transition-colors"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => { setOpen(false); iniciar(); }}
              disabled={loading}
              className="w-full py-4 rounded-full font-semibold text-sm tracking-wide disabled:opacity-60"
              style={{ background: GOLD, color: "#000" }}
            >
              {loading ? "Abriendo…" : "Iniciar cotización"}
            </button>
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-full font-semibold text-sm tracking-wide text-center text-white border border-white/15"
            >
              Escríbenos por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
