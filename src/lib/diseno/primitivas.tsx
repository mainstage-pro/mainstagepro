import React from "react";
import { COLOR, FONT, GRID, SCRIM } from "./tokens";
import { s, type FormatoPerfil } from "./formatos";

// ─────────────────────────────────────────────────────────────────────────────
// Primitivas de marca compartidas (la "directriz" hecha componentes). TODA pieza
// del módulo de diseño se compone con estas piezas → estilo congruente siempre.
// Cada primitiva es consciente del formato (`fmt`): en story (escala 1.0) el
// diseño es idéntico al original; en post/cuadrado se escala proporcionalmente.
// ─────────────────────────────────────────────────────────────────────────────

export type FrameOpts = { bg: string; scrim: string; index: number; logo: string; fmt: FormatoPerfil };

export function GoldBar({ fmt }: { fmt: FormatoPerfil }) {
  const inset = s(90, fmt);
  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: inset,
        bottom: inset,
        width: 4,
        display: "flex",
        background: `linear-gradient(180deg, rgba(179,152,91,0) 0%, ${COLOR.gold} 50%, rgba(179,152,91,0) 100%)`,
      }}
    />
  );
}

// Círculos concéntricos con trazo que se desvanece en las puntas (gradiente).
export function Ring({ fmt }: { fmt: FormatoPerfil }) {
  const cx = fmt.w / 2;
  const cy = Math.round(560 * (fmt.h / 1920));
  const radii = [640, 500, 360].map((r) => Math.round(r * fmt.escala));
  return (
    <svg width={fmt.w} height={fmt.h} style={{ position: "absolute", top: 0, left: 0 }}>
      <defs>
        <linearGradient id="ringFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={COLOR.gold} stopOpacity={0} />
          <stop offset="50%" stopColor={COLOR.gold} stopOpacity={0.34} />
          <stop offset="100%" stopColor={COLOR.gold} stopOpacity={0} />
        </linearGradient>
      </defs>
      {radii.map((r, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="url(#ringFade)" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

export function CornerNumber({ index, fmt }: { index: number; fmt: FormatoPerfil }) {
  return (
    <div
      style={{
        position: "absolute",
        right: s(44, fmt),
        bottom: s(18, fmt),
        display: "flex",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: s(300, fmt),
        lineHeight: 1,
        letterSpacing: s(-6, fmt),
        color: "rgba(179,152,91,0.07)",
      }}
    >
      {String(index).padStart(2, "0")}
    </div>
  );
}

// Logo de marca (logo-white.png ya cargado en /public), estampado arriba a la
// derecha en TODOS los slides — como en las referencias. Aspecto 4009:673.
export function BrandLogo({ logo, fmt }: { logo: string; fmt: FormatoPerfil }) {
  const h = s(50, fmt);
  const top = Math.max(fmt.margen, Math.round(fmt.safeTop * 0.5));
  return (
    <img src={logo} height={h} style={{ position: "absolute", top, right: fmt.margen, objectFit: "contain" }} />
  );
}

export function Frame({ bg, scrim, index, logo, fmt, children }: FrameOpts & { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: fmt.w,
        height: fmt.h,
        display: "flex",
        position: "relative",
        fontFamily: FONT,
        backgroundColor: COLOR.black,
        overflow: "hidden",
      }}
    >
      <img src={bg} width={fmt.w} height={fmt.h} style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: fmt.w, height: fmt.h, display: "flex", background: scrim }} />
      <Ring fmt={fmt} />
      <GoldBar fmt={fmt} />
      <CornerNumber index={index} fmt={fmt} />
      <BrandLogo logo={logo} fmt={fmt} />
      {children}
    </div>
  );
}

// Bloque de contenido centrado verticalmente, con márgenes laterales de marca.
export function Content({ fmt, children, justify = "center" }: { fmt: FormatoPerfil; children: React.ReactNode; justify?: "center" | "flex-start" }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: fmt.margen,
        right: fmt.margen,
        height: fmt.h,
        display: "flex",
        flexDirection: "column",
        justifyContent: justify,
      }}
    >
      {children}
    </div>
  );
}

export function Title({ gold, white, size = 92, fmt }: { gold: string; white: string; size?: number; fmt: FormatoPerfil }) {
  const base: React.CSSProperties = {
    display: "flex",
    fontFamily: FONT,
    fontWeight: 800,
    fontSize: s(size, fmt),
    lineHeight: 1.02,
    letterSpacing: s(-2, fmt),
    textTransform: "uppercase",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ ...base, color: COLOR.gold }}>{gold}</div>
      <div style={{ ...base, color: COLOR.white }}>{white}</div>
    </div>
  );
}

export function Divider({ fmt, mt = 26, mb = 0, width = 120, fade = false }: { fmt: FormatoPerfil; mt?: number; mb?: number; width?: number; fade?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        width: s(width, fmt),
        height: fade ? 3 : 4,
        marginTop: s(mt, fmt),
        marginBottom: s(mb, fmt),
        background: fade ? `linear-gradient(90deg, ${COLOR.gold} 0%, rgba(179,152,91,0) 100%)` : COLOR.gold,
      }}
    />
  );
}

// Etiqueta corta en oro con tracking amplio (kicker/eyebrow de bloque).
export function Eyebrow({ text, fmt }: { text: string; fmt: FormatoPerfil }) {
  return (
    <div style={{ display: "flex", fontWeight: 600, fontSize: s(24, fmt), letterSpacing: s(5, fmt), color: COLOR.gold, textTransform: "uppercase" }}>
      {text}
    </div>
  );
}

export function PinIcon({ fmt }: { fmt: FormatoPerfil }) {
  return (
    <svg width={s(38, fmt)} height={s(48, fmt)} viewBox="0 0 24 24" fill={COLOR.gold}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
    </svg>
  );
}

export function ArrowIcon({ fmt }: { fmt: FormatoPerfil }) {
  const d = s(40, fmt);
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill={COLOR.gold}>
      <path d="M4 11h11.2l-4.6-4.6L12 5l7 7-7 7-1.4-1.4 4.6-4.6H4z" />
    </svg>
  );
}

export function CheckIcon({ fmt }: { fmt: FormatoPerfil }) {
  const d = s(38, fmt);
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill={COLOR.gold}>
      <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z" />
    </svg>
  );
}

// Texto con partes en negrita (para mezclar pesos inline sin romper Satori).
export function RichLine({ segments, size, color, lineHeight = 1.4, fmt }: { segments: { t: string; bold?: boolean }[]; size: number; color: string; lineHeight?: number; fmt: FormatoPerfil }) {
  const fs = s(size, fmt);
  const words: React.ReactNode[] = [];
  segments.forEach((seg, si) => {
    seg.t.split(" ").forEach((w, wi) => {
      words.push(
        <div key={`${si}-${wi}`} style={{ display: "flex", fontWeight: seg.bold ? 800 : 400, marginRight: fs * 0.28 }}>
          {w}
        </div>,
      );
    });
  });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", fontFamily: FONT, fontSize: fs, color, lineHeight }}>
      {words}
    </div>
  );
}

export function InfoCard({ label, value, fmt }: { label: string; value: string; fmt: FormatoPerfil }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flex: 1,
        minHeight: s(152, fmt),
        background: COLOR.cardBg,
        border: `1px solid ${COLOR.cardBorder}`,
        borderRadius: GRID.radius,
        paddingLeft: s(30, fmt),
        paddingRight: s(24, fmt),
        gap: s(12, fmt),
      }}
    >
      <div style={{ display: "flex", fontWeight: 600, fontSize: s(21, fmt), letterSpacing: 4, color: COLOR.gold, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", fontWeight: 700, fontSize: s(33, fmt), color: COLOR.white, lineHeight: 1.12 }}>{value}</div>
    </div>
  );
}

// Marca en negrita las palabras contenidas en `bolds` (case-insensitive contiguo).
export function splitBold(text: string, bolds: string[]): { t: string; bold?: boolean }[] {
  const boldSet = new Set(bolds.map((b) => b.toLowerCase().replace(/[.,]/g, "")));
  return text.split(" ").map((w) => ({ t: w, bold: boldSet.has(w.toLowerCase().replace(/[.,]/g, "")) }));
}

// Badge de esquina tipo "EQUIPO EN RENTA" / "SERVICIOS MAINSTAGE" (referencias).
export function Badge({ text, fmt }: { text: string; fmt: FormatoPerfil }) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        fontWeight: 700,
        fontSize: s(20, fmt),
        letterSpacing: s(3, fmt),
        textTransform: "uppercase",
        color: COLOR.black,
        background: COLOR.gold,
        borderRadius: 999,
        paddingTop: s(9, fmt),
        paddingBottom: s(9, fmt),
        paddingLeft: s(20, fmt),
        paddingRight: s(20, fmt),
      }}
    >
      {text}
    </div>
  );
}

// Pie de contacto de marca (como en las referencias: teléfono + arroba).
export function ContactFooter({ telefono, arroba, fmt }: { telefono: string; arroba: string; fmt: FormatoPerfil }) {
  const bottom = Math.max(fmt.margen, Math.round(fmt.safeBottom * 0.45));
  return (
    <div
      style={{
        position: "absolute",
        left: fmt.margen,
        right: fmt.margen,
        bottom,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", fontWeight: 800, fontSize: s(30, fmt), letterSpacing: s(1, fmt), color: COLOR.gold }}>
        ¡CONTÁCTANOS! {telefono}
      </div>
      <div style={{ display: "flex", fontWeight: 600, fontSize: s(26, fmt), color: COLOR.white }}>{arroba}</div>
    </div>
  );
}

// Re-export para plantillas: evita que cada una importe SCRIM por separado.
export { SCRIM };
