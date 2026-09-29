// Primitivas de los dashboards de resumen.
//
// La lectura es server component: cero JavaScript para pintar cifras y renglones.
// Operar sí requiere cliente — las acciones por renglón viven en `acciones.tsx`.
//
// Un panel con lista nunca recorta filas: se le fija el alto y se desplaza. Si
// el panel truncara, el resumen mentiría sobre el tamaño del pendiente.

import Link from "next/link";
import type { ReactNode } from "react";

export type Tono = "neutro" | "oro" | "verde" | "ambar" | "rojo" | "azul";

export const TEXTO: Record<Tono, string> = {
  neutro: "text-white",
  oro: "text-[#B3985B]",
  verde: "text-green-400",
  ambar: "text-amber-400",
  rojo: "text-red-400",
  azul: "text-blue-400",
};

const BADGE: Record<Tono, string> = {
  neutro: "ms-badge ms-badge-gray",
  oro: "ms-badge ms-badge-gold",
  verde: "ms-badge ms-badge-green",
  ambar: "ms-badge ms-badge-amber",
  rojo: "ms-badge ms-badge-red",
  azul: "ms-badge ms-badge-blue",
};

export const BARRA: Record<Tono, string> = {
  neutro: "bg-[#3a3a3a]",
  oro: "bg-[#B3985B]",
  verde: "bg-green-500",
  ambar: "bg-amber-500",
  rojo: "bg-red-500",
  azul: "bg-blue-500",
};

export function Badge({ tono = "neutro", children }: { tono?: Tono; children: ReactNode }) {
  return <span className={BADGE[tono]}>{children}</span>;
}

export function EncabezadoResumen({
  titulo,
  subtitulo,
  acciones,
}: {
  titulo: string;
  subtitulo?: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="ms-h1">{titulo}</h1>
        {subtitulo && <p className="ms-subtitle mt-1">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}

export function Kpi({
  label,
  valor,
  nota,
  tono = "neutro",
  href,
}: {
  label: string;
  valor: ReactNode;
  nota?: ReactNode;
  tono?: Tono;
  href?: string;
}) {
  const cuerpo = (
    <>
      <p className="ms-label truncate">{label}</p>
      <p className={`text-xl md:text-2xl font-bold mt-1.5 tabular-nums ${TEXTO[tono]}`}>{valor}</p>
      {nota && <p className="ms-meta mt-1 truncate">{nota}</p>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="ms-card-hover p-3.5 md:p-4 block">
        {cuerpo}
      </Link>
    );
  }
  return <div className="ms-stat-card p-3.5 md:p-4">{cuerpo}</div>;
}

export function Panel({
  titulo,
  nota,
  href,
  hrefLabel = "Ver todo",
  children,
  className = "",
  scroll = false,
}: {
  titulo: string;
  nota?: ReactNode;
  href?: string;
  hrefLabel?: string;
  children: ReactNode;
  className?: string;
  /**
   * Altura fija con desplazamiento: el panel no crece, se recorre. `"alto"` para
   * los paneles anchos (agenda, calendario) que ya venían con más aire.
   */
  scroll?: boolean | "alto";
}) {
  return (
    <section className={`ms-card flex flex-col ${className}`}>
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2.5">
        <div className="min-w-0">
          <h2 className="ms-section-label truncate">{titulo}</h2>
          {nota && <p className="ms-meta mt-0.5 truncate">{nota}</p>}
        </div>
        {href && (
          <Link href={href} className="ms-micro text-[#B3985B] hover:text-white transition-colors shrink-0">
            {hrefLabel} →
          </Link>
        )}
      </div>
      <div
        className={
          scroll === "alto"
            ? "flex-1 max-h-[420px] overflow-y-auto overscroll-contain"
            : scroll
              ? "flex-1 max-h-72 overflow-y-auto overscroll-contain"
              : "flex-1"
        }
      >
        {children}
      </div>
    </section>
  );
}

export function Fila({
  href,
  titulo,
  meta,
  valor,
  valorNota,
  tono = "neutro",
  tonoValor,
  badge,
}: {
  href?: string;
  titulo: ReactNode;
  meta?: ReactNode;
  valor?: ReactNode;
  valorNota?: ReactNode;
  tono?: Tono;
  /** Color sólo de la cifra, cuando no debe heredar la alarma de la barra. */
  tonoValor?: Tono;
  badge?: ReactNode;
}) {
  const cuerpo = (
    <div className="flex items-center gap-3 px-4 py-2.5 border-t border-[#1a1a1a]">
      <span className={`w-1 h-8 rounded-full shrink-0 ${BARRA[tono]}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-white truncate leading-tight">{titulo}</p>
        {meta && <p className="ms-meta truncate mt-0.5">{meta}</p>}
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
      {valor !== undefined && (
        <div className="text-right shrink-0">
          <p className={`text-[13px] font-semibold tabular-nums ${TEXTO[tonoValor ?? tono]}`}>{valor}</p>
          {valorNota && <p className="ms-micro mt-0.5">{valorNota}</p>}
        </div>
      )}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block hover:bg-[#161616] transition-colors">
        {cuerpo}
      </Link>
    );
  }
  return cuerpo;
}

/** Encabezado de un grupo (cliente, proveedor) con sus documentos dentro. */
export function Grupo({
  titulo,
  meta,
  valor,
  tono = "neutro",
  children,
}: {
  titulo: ReactNode;
  meta?: ReactNode;
  valor?: ReactNode;
  tono?: Tono;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-2 border-t border-[#1a1a1a] bg-[#141414] sticky top-0 z-10">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white truncate leading-tight">{titulo}</p>
          {meta && <p className="ms-meta truncate mt-0.5">{meta}</p>}
        </div>
        {valor !== undefined && (
          <p className={`text-[13px] font-semibold tabular-nums shrink-0 ${TEXTO[tono]}`}>{valor}</p>
        )}
      </div>
      <div className="pl-3">{children}</div>
    </div>
  );
}

export function Vacio({ texto = "Nada pendiente aquí" }: { texto?: string }) {
  return (
    <div className="px-4 py-6 border-t border-[#1a1a1a] text-center">
      <p className="ms-meta">{texto}</p>
    </div>
  );
}

/** Barra apilada de composición. Comunica proporción, no cantidad exacta. */
export function BarraDistribucion({
  segmentos,
}: {
  segmentos: { label: string; valor: number; tono: Tono }[];
}) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  if (total === 0) return <Vacio texto="Sin datos" />;
  return (
    <div className="px-4 pb-4 pt-1">
      <div className="flex h-2 rounded-full overflow-hidden bg-[#1a1a1a]">
        {segmentos
          .filter(s => s.valor > 0)
          .map(s => (
            <span
              key={s.label}
              className={BARRA[s.tono]}
              style={{ width: `${(s.valor / total) * 100}%` }}
              title={`${s.label}: ${s.valor}`}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {segmentos
          .filter(s => s.valor > 0)
          .map(s => (
            <span key={s.label} className="flex items-center gap-1.5 ms-meta">
              <span className={`w-1.5 h-1.5 rounded-full ${BARRA[s.tono]}`} aria-hidden />
              {s.label}
              <b className={`tabular-nums ${TEXTO[s.tono]}`}>{s.valor}</b>
            </span>
          ))}
      </div>
    </div>
  );
}

/**
 * Ingreso y gasto pareados por mes, como en el tablero de dirección.
 * Las dos series comparten escala: si cada una se normalizara por su propio
 * máximo, un mes con gasto mayor que el ingreso se vería igual de alto y la
 * gráfica mentiría justo donde importa.
 */
export function BarrasPareadas({
  datos,
  formato = (n: number) => String(n),
  etiquetaA = "Ingreso",
  etiquetaB = "Gasto",
}: {
  datos: { label: string; a: number; b: number }[];
  formato?: (n: number) => string;
  etiquetaA?: string;
  etiquetaB?: string;
}) {
  if (datos.length === 0) return <Vacio texto="Sin datos" />;
  const max = Math.max(...datos.flatMap(d => [Math.abs(d.a), Math.abs(d.b)]), 1);
  const alto = (v: number) => `${Math.max(2, (Math.abs(v) / max) * 128)}px`;

  return (
    <div className="px-4 pb-4 pt-1">
      <div className="flex items-end gap-2 md:gap-4 h-40">
        {datos.map(d => (
          <div key={d.label} className="flex-1 flex flex-col justify-end items-center gap-1 min-w-0">
            <div className="flex items-end justify-center gap-[3px] w-full">
              <span className="rounded-t bg-[#4ade80]/85 w-1/2 max-w-[30px]" style={{ height: alto(d.a) }} />
              <span className="rounded-t bg-[#f87171]/75 w-1/2 max-w-[30px]" style={{ height: alto(d.b) }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 md:gap-4 mt-1.5">
        {datos.map(d => (
          <div key={d.label} className="flex-1 min-w-0 text-center">
            <p className="ms-micro truncate">{d.label}</p>
            <p className="ms-micro tabular-nums text-green-400 truncate">{formato(d.a)}</p>
            <p className="ms-micro tabular-nums text-red-400 truncate">{formato(d.b)}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-2.5">
        {[
          { color: "bg-[#4ade80]/85", label: etiquetaA },
          { color: "bg-[#f87171]/75", label: etiquetaB },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5 ms-micro">
            <span className={`w-2.5 h-2.5 rounded-sm ${l.color}`} aria-hidden />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Serie mensual en SVG puro. Sin Recharts: esto no necesita hidratarse. */
export function MiniBarras({
  datos,
  formato = (n: number) => String(n),
  tono = "oro",
}: {
  datos: { label: string; valor: number }[];
  formato?: (n: number) => string;
  tono?: Tono;
}) {
  if (datos.length === 0) return <Vacio texto="Sin datos" />;
  const max = Math.max(...datos.map(d => Math.abs(d.valor)), 1);
  return (
    <div className="px-4 pb-4 pt-1">
      <div className="flex items-end gap-1.5 h-24">
        {datos.map(d => (
          <div key={d.label} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
            <span className="ms-micro tabular-nums truncate w-full text-center">{formato(d.valor)}</span>
            <span
              className={`w-full rounded-t ${d.valor === 0 ? "bg-[#1a1a1a]" : BARRA[tono]}`}
              style={{ height: `${Math.max(2, (Math.abs(d.valor) / max) * 64)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {datos.map(d => (
          <span key={d.label} className="flex-1 ms-micro text-center truncate min-w-0">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
