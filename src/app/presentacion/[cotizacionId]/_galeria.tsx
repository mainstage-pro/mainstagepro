"use client";

import { useCallback, useEffect, useState } from "react";
import { getEquipoImagenes, type EquipoLinea, type GaleriaItem } from "@/lib/presentacion-imagenes";

// ─── Lightbox / carrusel controlado ───────────────────────────────────────────
export function EquipoLightbox({
  items,
  index,
  onClose,
  setIndex,
}: {
  items: GaleriaItem[];
  index: number;
  onClose: () => void;
  setIndex: (i: number) => void;
}) {
  const total = items.length;
  const go = useCallback(
    (dir: number) => setIndex((index + dir + total) % total),
    [index, total, setIndex],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [go, onClose]);

  const foto = items[index];
  if (!foto) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 transition-colors z-10"
        aria-label="Cerrar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors z-10"
            aria-label="Anterior"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(1); }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors z-10"
            aria-label="Siguiente"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      <div className="max-w-5xl w-full flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto.src}
          alt={foto.caption}
          draggable={false}
          className="max-w-full max-h-[78vh] object-contain rounded-xl"
        />
        <div className="text-center">
          {foto.caption && <p className="text-white/80 text-sm">{foto.caption}</p>}
          {total > 1 && (
            <p className="text-white/35 text-xs mt-1 font-mono tracking-wider">{index + 1} / {total}</p>
          )}
        </div>
      </div>

      {total > 1 && (
        <div className="mt-4 flex items-center gap-2 max-w-full overflow-x-auto px-2 pb-1" onClick={(e) => e.stopPropagation()}>
          {items.map((it, i) => (
            <button
              key={`${it.src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === index ? "border-[#B3985B]" : "border-transparent opacity-50 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.src} alt="" className="w-full h-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hook: lightbox para las fotos de UN equipo ───────────────────────────────
export function useEquipoGaleria(linea: EquipoLinea) {
  const fotos = getEquipoImagenes(linea);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const tieneGaleria = fotos.length > 1;

  const abrir = () => { if (fotos.length) { setIndex(0); setOpen(true); } };
  const lightbox = open ? (
    <EquipoLightbox items={fotos} index={index} setIndex={setIndex} onClose={() => setOpen(false)} />
  ) : null;

  return { fotos, tieneGaleria, abrir, lightbox };
}

// ─── Galería combinada de todos los equipos de la cotización ──────────────────
export function GaleriaCombinada({
  lineas,
  className = "",
  titulo = "Galería del equipo",
  subtitulo = "El equipo de tu propuesta, en eventos reales. Haz click en cualquier foto para ampliar.",
}: {
  lineas: EquipoLinea[];
  className?: string;
  titulo?: string;
  subtitulo?: string;
}) {
  const fotos: GaleriaItem[] = [];
  const seen = new Set<string>();
  for (const l of lineas) {
    for (const f of getEquipoImagenes(l)) {
      if (seen.has(f.src)) continue;
      seen.add(f.src);
      fotos.push(f);
    }
  }

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (fotos.length < 2) return null;

  const abrir = (i: number) => { setIndex(i); setOpen(true); };

  return (
    <div className={className}>
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-0.5 h-5 bg-[#B3985B] rounded-full shrink-0" />
          <h3 className="text-white font-semibold" style={{ fontSize: "clamp(1.15rem,2.2vw,1.6rem)", letterSpacing: "-0.02em" }}>
            {titulo}
          </h3>
        </div>
        <p className="text-white/35 text-sm leading-relaxed pl-4">{subtitulo}</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {fotos.map((f, i) => (
          <button
            key={`${f.src}-${i}`}
            type="button"
            onClick={() => abrir(i)}
            className="group relative aspect-square rounded-xl overflow-hidden bg-[#070707] border border-white/8 hover:border-[#B3985B]/40 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.src}
              alt={f.caption}
              draggable={false}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </button>
        ))}
      </div>
      {open && (
        <EquipoLightbox items={fotos} index={index} setIndex={setIndex} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
