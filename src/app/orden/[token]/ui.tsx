"use client";

/**
 * Piezas visuales compartidas de la Orden de Producción.
 *
 * El portal se usa en la camioneta y en el venue: tipografía grande, áreas de
 * toque amplias y contraste alto. Mismo lenguaje que los demás portales
 * públicos (negro, oro #B3985B, tarjetas translúcidas).
 */

export const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';
export const ORO = "#B3985B";

export function Cargando() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
    </div>
  );
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="text-white/25 text-sm py-8 text-center">{children}</p>;
}

/** Tarjeta con encabezado en oro. El bloque base de todas las secciones. */
export function Seccion({
  titulo,
  descripcion,
  accion,
  children,
}: {
  titulo: string;
  descripcion?: string | null;
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white/[0.025] border border-white/8 rounded-2xl p-5 mb-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest">{titulo}</h2>
          {descripcion && <p className="text-white/30 text-xs mt-1 leading-relaxed">{descripcion}</p>}
        </div>
        {accion}
      </div>
      {children}
    </section>
  );
}

/** Par etiqueta/valor. Se omite solo cuando no hay valor: evita renglones vacíos. */
export function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  if (valor === null || valor === undefined || valor === "" || valor === false) return null;
  return (
    <div className="py-2.5 border-b border-white/5 last:border-0">
      <p className="text-white/30 text-[11px] uppercase tracking-wider mb-1">{label}</p>
      <div className="text-white/80 text-sm leading-relaxed">{valor}</div>
    </div>
  );
}

export function Chip({ children, tono = "neutro" }: { children: React.ReactNode; tono?: "neutro" | "oro" | "verde" | "rojo" | "ambar" }) {
  const tonos: Record<string, string> = {
    neutro: "bg-white/5 text-white/50 border-white/10",
    oro: "bg-[#B3985B]/10 text-[#B3985B] border-[#B3985B]/25",
    verde: "bg-green-500/10 text-green-400 border-green-500/25",
    rojo: "bg-red-500/10 text-red-400 border-red-500/25",
    ambar: "bg-amber-500/10 text-amber-400 border-amber-500/25",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${tonos[tono]}`}>
      {children}
    </span>
  );
}

export function Barra({ pct, tono = "oro" }: { pct: number; tono?: "oro" | "verde" }) {
  const color = tono === "verde" ? "bg-green-500" : "bg-[#B3985B]";
  return (
    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

/** Teléfono tocable: en el celular marcar es la acción obvia. */
export function Telefono({ numero }: { numero: string | null }) {
  if (!numero) return null;
  return (
    <a href={`tel:${numero.replace(/\s/g, "")}`} className="text-[#B3985B] hover:underline">
      {numero}
    </a>
  );
}

export function fechaLarga(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", {
    timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export function horaCorta(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
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
