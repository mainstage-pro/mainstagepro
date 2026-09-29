"use client";

import type { LucideIcon } from "lucide-react";

export const GOLD = "#B3985B";
export const oro = (a: number) => `rgba(179,152,91,${a})`;

/** Encabezado de pestaña. Mismo formato que el resto de los módulos. */
export function Encabezado({
  titulo,
  bajada,
  acciones,
}: {
  titulo: string;
  bajada: string;
  acciones?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3">
      <div className="min-w-0">
        <h1 className="ms-h1">{titulo}</h1>
        <p className="ms-subtitle mt-1 max-w-2xl leading-relaxed">{bajada}</p>
      </div>
      {acciones && <div className="flex gap-2 shrink-0 flex-wrap">{acciones}</div>}
    </div>
  );
}

/** Rótulo de sección dentro de una pestaña. */
export function Rotulo({ icono: Icono, children }: { icono?: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {Icono && <Icono strokeWidth={1.8} className="w-3.5 h-3.5 shrink-0 text-[#B3985B]" />}
      <span className="ms-section-label whitespace-nowrap">{children}</span>
      <div className="h-px flex-1 bg-[#1e1e1e]" />
    </div>
  );
}

/** Tarjeta base del módulo. `acento` la resalta en dorado; `peligro` en rojo. */
export function Panel({
  children,
  acento,
  peligro,
  className = "",
}: {
  children: React.ReactNode;
  acento?: boolean;
  peligro?: boolean;
  className?: string;
}) {
  const borde = peligro ? "rgba(153,27,27,0.4)" : acento ? oro(0.28) : "#1e1e1e";
  const fondo = peligro ? "rgba(69,10,10,0.14)" : acento ? oro(0.04) : "#111";
  return (
    <div
      className={`rounded-xl p-4 sm:p-5 ${className}`}
      style={{ background: fondo, border: `1px solid ${borde}` }}
    >
      {children}
    </div>
  );
}

/** Anillo de avance. Sustituye a la barra cuando el número es protagonista. */
export function Anillo({
  pct,
  tam = 52,
  color = GOLD,
  grosor = 3,
}: {
  pct: number;
  tam?: number;
  color?: string;
  grosor?: number;
}) {
  const r = (tam - grosor) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} className="-rotate-90">
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="#1e1e1e" strokeWidth={grosor} />
        <circle
          cx={tam / 2}
          cy={tam / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (Math.max(0, Math.min(100, pct)) / 100) * circ}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums"
        style={{ fontSize: tam * 0.26, color: pct > 0 ? color : "#555" }}
      >
        {pct}
      </span>
    </div>
  );
}

/** Declaración destacada: la frase de marca, el "cómo se vive" de un valor. */
export function Cita({ children, tam = "grande" }: { children: React.ReactNode; tam?: "grande" | "chica" }) {
  return (
    <div className="flex gap-3">
      <div className="w-[2px] shrink-0 rounded-full" style={{ background: oro(0.55) }} />
      <p
        className={tam === "grande" ? "text-lg font-medium leading-snug" : "text-[15px] leading-relaxed"}
        style={{ color: tam === "grande" ? GOLD : oro(0.92) }}
      >
        {children}
      </p>
    </div>
  );
}

/** Indicador de tablero con icono. */
export function Metrica({
  icono: Icono,
  label,
  valor,
  pie,
  alerta,
}: {
  icono: LucideIcon;
  label: string;
  valor: React.ReactNode;
  pie?: string;
  alerta?: boolean;
}) {
  return (
    <Panel peligro={alerta}>
      <div className="flex items-center gap-2">
        <Icono
          strokeWidth={1.8}
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: alerta ? "#f87171" : oro(0.7) }}
        />
        <p className="ms-meta truncate">{label}</p>
      </div>
      <p
        className="text-2xl font-bold mt-1.5 tabular-nums tracking-tight"
        style={{ color: alerta ? "#f87171" : "#fff" }}
      >
        {valor}
      </p>
      {pie && <p className="ms-micro mt-1">{pie}</p>}
    </Panel>
  );
}

/** Estado vacío con intención: dice qué falta y por qué importa. */
export function Vacio({
  icono: Icono,
  titulo,
  texto,
  accion,
}: {
  icono: LucideIcon;
  titulo: string;
  texto: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl px-6 py-8 text-center border border-dashed border-[#1e1e1e] bg-[#0d0d0d]">
      <Icono strokeWidth={1.5} className="w-6 h-6 mx-auto mb-3 text-[#555]" />
      <p className="text-sm font-medium text-white">{titulo}</p>
      <p className="text-xs text-gray-500 mt-1.5 max-w-md mx-auto leading-relaxed">{texto}</p>
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

/** Contenedor de pestaña. */
export function Lienzo({ ancho = "max-w-4xl", children }: { ancho?: string; children: React.ReactNode }) {
  return <div className={`p-4 md:p-6 mx-auto space-y-6 ${ancho}`}>{children}</div>;
}
