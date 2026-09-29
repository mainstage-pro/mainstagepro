"use client";

import type { LucideIcon } from "lucide-react";

export const GOLD = "#B3985B";
export const oro = (a: number) => `rgba(179,152,91,${a})`;

// Fotos reales del banco de la plataforma. Se usan como fondo a opacidad muy
// baja: dan atmósfera sin competir con el texto.
export const FONDOS = {
  identidad: "/images/presentacion/musicales/Musicales-016.jpg",
  valores: "/images/presentacion/musicales/Musicales-045.jpg",
  meta: "/images/presentacion/musicales/Musicales-126.jpg",
  areas: "/images/presentacion/musicales/Musicales-111.jpg",
  cascada: "/images/presentacion/musicales/Afrodise-59.jpg",
  presentacion: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg",
} as const;

/** Atmósfera de la pestaña: foto del banco + halo dorado + retícula. */
export function Ambiente({ foto }: { foto: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={foto}
        alt=""
        draggable={false}
        className="absolute inset-x-0 top-0 h-[420px] w-full object-cover opacity-[0.07]"
      />
      <div
        className="absolute inset-x-0 top-0 h-[420px]"
        style={{ background: "linear-gradient(to bottom, rgba(10,10,10,0.2) 0%, #0a0a0a 92%)" }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[520px]"
        style={{ background: `radial-gradient(ellipse 70% 100% at 18% 0%, ${oro(0.07)} 0%, transparent 70%)` }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[520px] opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(${GOLD} 1px,transparent 1px),linear-gradient(90deg,${GOLD} 1px,transparent 1px)`,
          backgroundSize: "72px 72px",
        }}
      />
    </div>
  );
}

/** Encabezado de pestaña: icono enmarcado, antetítulo, título y bajada. */
export function Encabezado({
  icono: Icono,
  antetitulo,
  titulo,
  bajada,
  acciones,
}: {
  icono: LucideIcon;
  antetitulo: string;
  titulo: string;
  bajada: string;
  acciones?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 flex-wrap">
      <div
        className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
        style={{ background: oro(0.09), border: `1px solid ${oro(0.28)}` }}
      >
        <Icono strokeWidth={1.6} className="w-5 h-5" style={{ color: GOLD }} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] font-medium uppercase mb-1.5"
          style={{ color: GOLD, letterSpacing: "0.26em" }}
        >
          {antetitulo}
        </p>
        <h1 className="text-[26px] sm:text-3xl font-semibold text-white leading-[1.1] tracking-tight">
          {titulo}
        </h1>
        <p className="text-sm text-gray-500 mt-2.5 leading-relaxed max-w-2xl">{bajada}</p>
      </div>
      {acciones && <div className="flex gap-2 shrink-0 flex-wrap">{acciones}</div>}
    </div>
  );
}

/** Filete dorado que se desvanece. Separa secciones sin meter una caja más. */
export function Filete({ ancho = "100%" }: { ancho?: string }) {
  return (
    <div
      className="h-px"
      style={{ width: ancho, background: `linear-gradient(to right, ${oro(0.45)}, transparent)` }}
    />
  );
}

/** Rótulo de sección dentro de una pestaña. */
export function Rotulo({ icono: Icono, children }: { icono?: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      {Icono && <Icono strokeWidth={1.7} className="w-3.5 h-3.5 shrink-0" style={{ color: oro(0.75) }} />}
      <span
        className="text-[10px] font-medium uppercase whitespace-nowrap"
        style={{ color: oro(0.75), letterSpacing: "0.22em" }}
      >
        {children}
      </span>
      <div className="h-px flex-1" style={{ background: oro(0.14) }} />
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
  const borde = peligro ? "rgba(153,27,27,0.4)" : acento ? oro(0.3) : "rgba(255,255,255,0.07)";
  const fondo = peligro ? "rgba(69,10,10,0.14)" : acento ? oro(0.035) : "rgba(255,255,255,0.025)";
  return (
    <div
      className={`rounded-xl p-5 sm:p-6 backdrop-blur-[2px] transition-colors ${className}`}
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
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={grosor} />
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
        style={{ fontSize: tam * 0.26, color: pct > 0 ? color : "rgba(255,255,255,0.3)" }}
      >
        {pct}
      </span>
    </div>
  );
}

/** Declaración destacada: la frase de marca, el "cómo se vive" de un valor. */
export function Cita({ children, tam = "grande" }: { children: React.ReactNode; tam?: "grande" | "chica" }) {
  return (
    <div className="flex gap-4">
      <div className="w-[2px] shrink-0 rounded-full" style={{ background: `linear-gradient(to bottom, ${GOLD}, ${oro(0.1)})` }} />
      <p
        className={
          tam === "grande"
            ? "text-xl sm:text-2xl font-medium leading-snug tracking-tight"
            : "text-[15px] leading-relaxed"
        }
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
          strokeWidth={1.7}
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: alerta ? "#f87171" : oro(0.7) }}
        />
        <p className="text-[11px] text-gray-500 truncate">{label}</p>
      </div>
      <p
        className="text-3xl font-semibold mt-2 tabular-nums tracking-tight"
        style={{ color: alerta ? "#f87171" : "#fff" }}
      >
        {valor}
      </p>
      {pie && <p className="text-[11px] text-gray-600 mt-1">{pie}</p>}
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
    <div
      className="rounded-xl px-6 py-8 text-center"
      style={{ border: `1px dashed ${oro(0.22)}`, background: oro(0.02) }}
    >
      <Icono strokeWidth={1.4} className="w-6 h-6 mx-auto mb-3" style={{ color: oro(0.55) }} />
      <p className="text-sm font-medium text-white">{titulo}</p>
      <p className="text-xs text-gray-500 mt-1.5 max-w-md mx-auto leading-relaxed">{texto}</p>
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

/** Contenedor de pestaña: monta la atmósfera y centra el contenido. */
export function Lienzo({
  foto,
  ancho = "max-w-4xl",
  children,
}: {
  foto: string;
  ancho?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-full overflow-hidden">
      <Ambiente foto={foto} />
      <div className={`relative p-6 sm:p-8 space-y-7 ${ancho}`}>{children}</div>
    </div>
  );
}
