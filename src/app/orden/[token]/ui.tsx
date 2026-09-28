"use client";

/**
 * Piezas visuales de la Orden de Producción.
 *
 * El portal es la versión web de la Ficha Operativa en PDF, así que usa el mismo
 * lenguaje: papel blanco, hero negro, banda dorada y secciones numeradas con
 * badge. La referencia viva es `src/components/pdf/PdfShared.tsx` — si allá
 * cambia la paleta, aquí también.
 *
 * Se lee en la camioneta y en el venue: tipografía cómoda, áreas de toque
 * amplias y contraste alto sobre fondo claro (la pantalla se ve de día).
 */

import { useEffect, useState } from "react";
import { fmt24to12, fmtHoraDate } from "@/lib/hora";

export const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';

/** Misma paleta que el PDF. */
export const C = {
  negro: "#0d0d0d",
  grisOscuro: "#1a1a1a",
  grisMedio: "#5a5a5a",
  grisClaro: "#9a9a9a",
  linea: "#e8e8e8",
  fondo: "#f6f6f6",
  oro: "#B3985B",
  oroClaro: "#f7f0e2",
  oroBorde: "#ddc98a",
  verde: "#2d6e3e",
  rojo: "#b91c1c",
  ambar: "#b45309",
};
export const ORO = C.oro;

export function Cargando() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#B3985B]/25 border-t-[#B3985B] rounded-full animate-spin" />
    </div>
  );
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="text-[#9a9a9a] text-sm py-6 text-center">{children}</p>;
}

/**
 * Foto del equipo, como en el rider del PDF. Se toca para verla en grande:
 * en bodega la duda no es el nombre del modelo, es si la caja que tienes
 * enfrente es esa. El hueco se reserva aunque no haya foto para que la columna
 * de nombres no quede serrucho.
 */
export function Miniatura({ url, alt }: { url: string | null; alt: string }) {
  const [abierta, setAbierta] = useState(false);

  // El botón de "atrás" del teléfono debe cerrar el visor, no salirse del
  // documento; y con el visor abierto el fondo no debe correrse.
  useEffect(() => {
    if (!abierta) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierta(false);
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", esc);
    };
  }, [abierta]);

  if (!url) {
    return (
      <span
        aria-hidden
        className="shrink-0 w-10 h-10 rounded border border-[#ececec] bg-[#fafafa] flex items-center justify-center"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className="shrink-0 w-10 h-10 rounded border border-[#e4e4e4] bg-white overflow-hidden"
        aria-label={`Ver foto de ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} className="w-full h-full object-contain" draggable={false} loading="lazy" />
      </button>

      {abierta && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-5"
          onClick={() => setAbierta(false)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={alt} className="max-w-full max-h-[75vh] object-contain" draggable={false} />
          <p className="text-white text-[13px] font-semibold mt-4 text-center">{alt}</p>
          <p className="text-white/40 text-[11.5px] mt-1">Toca para cerrar</p>
        </div>
      )}
    </>
  );
}

/**
 * Sección numerada. El badge negro con número y la regla dorada son la firma
 * visual del documento impreso; el `id` es el ancla del índice de salto.
 */
export function Sec({
  id,
  num,
  titulo,
  descripcion,
  accion,
  children,
}: {
  id: string;
  num: number;
  titulo: string;
  descripcion?: string | null;
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-8 scroll-mt-4">
      <div className="flex items-center gap-2.5 mb-3 pb-1.5 border-b border-[#ddc98a]">
        <span className="shrink-0 w-[22px] h-[22px] rounded-full bg-[#0d0d0d] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
          {num}
        </span>
        <h2 className="flex-1 text-[#B3985B] text-[11px] font-bold uppercase tracking-[0.13em] leading-tight">
          {titulo}
        </h2>
        {accion}
      </div>
      {descripcion && <p className="text-[#9a9a9a] text-xs mb-3 leading-relaxed">{descripcion}</p>}
      {children}
    </section>
  );
}

/** Rejilla de pares etiqueta/valor. Dos columnas, igual que el PDF. */
export function KVGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>;
}

/** Par etiqueta/valor. Se omite solo cuando no hay valor: evita renglones vacíos. */
export function KV({
  label,
  valor,
  full,
  fuerte,
}: {
  label: string;
  valor: React.ReactNode;
  full?: boolean;
  fuerte?: boolean;
}) {
  if (valor === null || valor === undefined || valor === "" || valor === false) return null;
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[#9a9a9a] text-[9.5px] font-medium uppercase tracking-[0.09em] mb-0.5">{label}</p>
      <div className={`text-[#0d0d0d] text-[13.5px] leading-snug ${fuerte ? "font-bold" : ""}`}>{valor}</div>
    </div>
  );
}

/** Caja gris con etiqueta: notas, brief, indicaciones. */
export function NotaBox({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#f6f6f6] border-l-2 border-[#B3985B] rounded-r-md p-3.5 mb-2">
      {label && (
        <p className="text-[#9a9a9a] text-[9.5px] font-bold uppercase tracking-[0.09em] mb-1.5">{label}</p>
      )}
      <div className="text-[#0d0d0d] text-[13.5px] leading-relaxed whitespace-pre-line">{children}</div>
    </div>
  );
}

/** Contenedor con borde fino: el equivalente web de las tablas del PDF. */
export function Cuadro({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-[#e8e8e8] rounded-md overflow-hidden bg-white ${className}`}>{children}</div>
  );
}

/** Barra negra de categoría — igual que el rider impreso. */
export function CatHead({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-[#111] px-3 py-1.5">
      <span className="text-white text-[10px] font-bold uppercase tracking-[0.15em] truncate">{children}</span>
      {extra}
    </div>
  );
}

export function Chip({
  children,
  tono = "neutro",
}: {
  children: React.ReactNode;
  tono?: "neutro" | "oro" | "verde" | "rojo" | "ambar";
}) {
  const tonos: Record<string, string> = {
    neutro: "bg-[#f1f1f1] text-[#5a5a5a] border-[#e0e0e0]",
    oro: "bg-[#f7f0e2] text-[#8a6d2b] border-[#ddc98a]",
    verde: "bg-[#edf6f0] text-[#2d6e3e] border-[#bcdcc7]",
    rojo: "bg-[#fef2f2] text-[#b91c1c] border-[#f3c4c4]",
    ambar: "bg-[#fffbeb] text-[#b45309] border-[#f0ddb0]",
  };
  return (
    <span
      className={`inline-flex items-center shrink-0 px-1.5 py-0.5 rounded border text-[9.5px] font-bold uppercase tracking-[0.06em] ${tonos[tono]}`}
    >
      {children}
    </span>
  );
}

/** Badge dorado de cantidad — el ×N de las tarjetas del rider. */
export function Cantidad({ n }: { n: number }) {
  return (
    <span className="shrink-0 px-2 py-0.5 rounded-full border border-[#9A7A3F] bg-[#f8f8f8] text-[#9A7A3F] text-[11px] font-bold tabular-nums">
      ×{n}
    </span>
  );
}

export function Barra({ pct, tono = "oro" }: { pct: number; tono?: "oro" | "verde" }) {
  const color = tono === "verde" ? "bg-[#2d6e3e]" : "bg-[#B3985B]";
  return (
    <div className="h-1.5 bg-[#e8e8e8] rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

/** Teléfono tocable: en el celular marcar es la acción obvia. */
export function Telefono({ numero }: { numero: string | null }) {
  if (!numero) return null;
  return (
    <a
      href={`tel:${numero.replace(/\s/g, "")}`}
      className="text-[#0d0d0d] underline decoration-[#ddc98a] decoration-2 underline-offset-2 font-medium"
    >
      {numero}
    </a>
  );
}

/** Falta un dato que en sitio cuesta caro. Mismo ámbar del PDF. */
export function PorConfirmar({ children = "Por confirmar" }: { children?: React.ReactNode }) {
  return <span className="text-[#b45309] font-bold">{children}</span>;
}

/**
 * Mismas etiquetas que el PDF (`MAPS` en PdfShared). Se duplican aquí porque
 * aquel módulo arrastra `@react-pdf/renderer` al bundle del cliente.
 */
export const ESTADO_LABEL: Record<string, string> = {
  PLANEACION: "En preparación", CONFIRMADO: "Confirmado",
  EN_CURSO: "En evento", COMPLETADO: "Finalizado", CANCELADO: "Cancelado",
};
export const SERVICIO_LABEL: Record<string, string> = {
  PRODUCCION_TECNICA: "Producción técnica integral",
  RENTA: "Renta de equipo",
  DIRECCION_TECNICA: "Dirección técnica",
};
export const EVENTO_LABEL: Record<string, string> = {
  MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", OTRO: "Otro",
};
export const ZONA_LABEL: Record<string, string> = {
  LOCAL: "Local (Querétaro)", BAJIO: "Bajío", NACIONAL: "Nacional",
};

/** Traduce un enum a su etiqueta; si no la conoce deja el valor crudo. */
export function etiqueta(mapa: Record<string, string>, v: string | null): string | null {
  return v ? (mapa[v] ?? v) : null;
}

export function fechaLarga(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", {
    timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export function fechaCorta(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", {
    timeZone: "UTC", weekday: "short", day: "numeric", month: "short",
  });
}

/**
 * Las horas se guardan como hora de pared (un DateTime a las 06:45Z significa
 * "seis cuarenta y cinco de la mañana", no un instante en UTC): se lee en UTC o
 * la camioneta sale seis horas antes en pantalla. El formato de 12 horas es el
 * mismo del PDF — en sitio nadie traduce "15:00" a las 3 de la tarde.
 */
export function horaCorta(iso: string | null): string | null {
  return iso ? fmtHoraDate(iso, "UTC") || null : null;
}

/** ¿Dos ISO caen el mismo día? Se compara la fecha de pared, sin zona. */
export function mismoDia(a: string | null, b: string | null): boolean {
  return !!a && !!b && a.substring(0, 10) === b.substring(0, 10);
}

/** "HH:MM" de pared → "3:00 PM", igual que `fmtHora` del PDF. */
export function hora12(hhmm: string | null | undefined): string | null {
  return hhmm ? fmt24to12(hhmm) || hhmm : null;
}

export function haceCuanto(iso: string): string {
  const seg = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seg < 60) return "hace un momento";
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return `hace ${Math.round(hrs / 24)} d`;
}
