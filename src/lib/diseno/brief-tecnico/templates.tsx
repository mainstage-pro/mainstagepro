import React from "react";
import { COLOR, FONT, FONT_MONO, GRID, SCRIM } from "../tokens";
import { getFormato, s, type FormatoPerfil } from "../formatos";
import type { BriefTecnicoData, EquipoItem, StatItem } from "./data";

// ─────────────────────────────────────────────────────────────────────────────
// Primitivas compartidas (la "directriz" hecha componentes). Todo lo que genere
// el módulo de diseño se compone con estas piezas → estilo congruente siempre.
// Cada primitiva es consciente del formato (`fmt`): en story (escala 1.0) el
// diseño es idéntico al original; en post/cuadrado se escala proporcionalmente.
// ─────────────────────────────────────────────────────────────────────────────

type FrameOpts = { bg: string; scrim: string; index: number; logo: string; fmt: FormatoPerfil };

function GoldBar({ fmt }: { fmt: FormatoPerfil }) {
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
function Ring({ fmt }: { fmt: FormatoPerfil }) {
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

function CornerNumber({ index, fmt }: { index: number; fmt: FormatoPerfil }) {
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
function BrandLogo({ logo, fmt }: { logo: string; fmt: FormatoPerfil }) {
  const h = s(50, fmt);
  const top = Math.max(fmt.margen, Math.round(fmt.safeTop * 0.5));
  return (
    <img src={logo} height={h} style={{ position: "absolute", top, right: fmt.margen, objectFit: "contain" }} />
  );
}

function Frame({ bg, scrim, index, logo, fmt, children }: FrameOpts & { children: React.ReactNode }) {
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
function Content({ fmt, children, justify = "center" }: { fmt: FormatoPerfil; children: React.ReactNode; justify?: "center" | "flex-start" }) {
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

function Title({ gold, white, size = 92, fmt }: { gold: string; white: string; size?: number; fmt: FormatoPerfil }) {
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

function Divider({ fmt, mt = 26, mb = 0, width = 120, fade = false }: { fmt: FormatoPerfil; mt?: number; mb?: number; width?: number; fade?: boolean }) {
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

function PinIcon({ fmt }: { fmt: FormatoPerfil }) {
  return (
    <svg width={s(38, fmt)} height={s(48, fmt)} viewBox="0 0 24 24" fill={COLOR.gold}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
    </svg>
  );
}

function ArrowIcon({ fmt }: { fmt: FormatoPerfil }) {
  const d = s(40, fmt);
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill={COLOR.gold}>
      <path d="M4 11h11.2l-4.6-4.6L12 5l7 7-7 7-1.4-1.4 4.6-4.6H4z" />
    </svg>
  );
}

// Texto con partes en negrita (para mezclar pesos inline sin romper Satori).
function RichLine({ segments, size, color, lineHeight = 1.4, fmt }: { segments: { t: string; bold?: boolean }[]; size: number; color: string; lineHeight?: number; fmt: FormatoPerfil }) {
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

function EquipoRow({ item, fmt }: { item: EquipoItem; fmt: FormatoPerfil }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: s(24, fmt),
        background: COLOR.cardBg,
        border: `1px solid ${COLOR.cardBorder}`,
        borderRadius: GRID.radius,
        paddingTop: s(26, fmt),
        paddingBottom: s(26, fmt),
        paddingLeft: s(30, fmt),
        paddingRight: s(34, fmt),
      }}
    >
      <div style={{ display: "flex", width: s(12, fmt), height: s(12, fmt), borderRadius: 6, background: COLOR.gold }} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", fontWeight: 700, fontSize: s(35, fmt), color: COLOR.white, letterSpacing: -0.5 }}>{item.nombre}</div>
        <div style={{ display: "flex", fontWeight: 400, fontSize: s(26, fmt), color: COLOR.textMute, marginTop: s(7, fmt) }}>{item.sub}</div>
      </div>
      <div style={{ display: "flex", fontFamily: FONT_MONO, fontWeight: 700, fontSize: s(46, fmt), color: COLOR.gold }}>{item.cant}</div>
    </div>
  );
}

function StatRow({ item, fmt }: { item: StatItem; fmt: FormatoPerfil }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: s(26, fmt),
        background: COLOR.cardBg,
        border: `1px solid ${COLOR.cardBorder}`,
        borderRadius: GRID.radius,
        paddingTop: s(22, fmt),
        paddingBottom: s(22, fmt),
        paddingLeft: s(32, fmt),
        paddingRight: s(34, fmt),
      }}
    >
      <div style={{ display: "flex", width: s(40, fmt) }}><ArrowIcon fmt={fmt} /></div>
      <div style={{ display: "flex", width: s(108, fmt), fontFamily: FONT_MONO, fontWeight: 700, fontSize: s(62, fmt), color: COLOR.gold, letterSpacing: -2 }}>{item.n}</div>
      <div style={{ display: "flex", fontWeight: 700, fontSize: s(35, fmt), color: COLOR.white, letterSpacing: 0.3, textTransform: "uppercase" }}>{item.label}</div>
    </div>
  );
}

function InfoCard({ label, value, fmt }: { label: string; value: string; fmt: FormatoPerfil }) {
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

// ─────────────────────────────────────────────────────────────────────────────
// Las 5 stories
// ─────────────────────────────────────────────────────────────────────────────

function Portada({ d, opts }: { d: BriefTecnicoData; opts: FrameOpts }) {
  const p = d.portada;
  const fmt = opts.fmt;
  return (
    <Frame {...opts}>
      <Content fmt={fmt} justify="center">
        <div style={{ display: "flex", fontWeight: 700, fontSize: s(30, fmt), letterSpacing: 5, color: COLOR.white, marginBottom: s(26, fmt) }}>{p.kicker}</div>
        <Title gold={p.tituloGold} white={p.tituloWhite} size={132} fmt={fmt} />
        <Divider fmt={fmt} mt={34} mb={40} width={680} fade />
        <div style={{ display: "flex", alignItems: "flex-start", gap: s(20, fmt) }}>
          <div style={{ display: "flex", marginTop: 2 }}><PinIcon fmt={fmt} /></div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontWeight: 700, fontSize: s(34, fmt), color: COLOR.white, lineHeight: 1.32 }}>{p.lugar}</div>
            <div style={{ display: "flex", fontWeight: 700, fontSize: s(34, fmt), color: COLOR.white, lineHeight: 1.32 }}>{p.fechas}</div>
          </div>
        </div>
      </Content>
    </Frame>
  );
}

function Brief({ d, opts }: { d: BriefTecnicoData; opts: FrameOpts }) {
  const b = d.brief;
  const fmt = opts.fmt;
  return (
    <Frame {...opts}>
      <Content fmt={fmt} justify="center">
        <Title gold="BRIEF" white="TÉCNICO" size={96} fmt={fmt} />
        <Divider fmt={fmt} mt={30} mb={40} />
        <div style={{ display: "flex", fontWeight: 400, fontSize: s(33, fmt), color: COLOR.white, lineHeight: 1.45, maxWidth: s(780, fmt), marginBottom: s(54, fmt) }}>{b.descripcion}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: s(20, fmt) }}>
          <div style={{ display: "flex", gap: s(20, fmt) }}>
            <InfoCard label="Venue" value={b.venue} fmt={fmt} />
            <InfoCard label="Tipo" value={b.tipo} fmt={fmt} />
          </div>
          <div style={{ display: "flex", gap: s(20, fmt) }}>
            <InfoCard label="Cliente" value={b.cliente} fmt={fmt} />
            <InfoCard label="Servicio" value={b.servicio} fmt={fmt} />
          </div>
        </div>
      </Content>
    </Frame>
  );
}

function EquipmentStory({ block, opts }: { block: { tituloGold: string; tituloWhite: string; items: EquipoItem[]; footer: string[] }; opts: FrameOpts }) {
  const fmt = opts.fmt;
  return (
    <Frame {...opts}>
      <Content fmt={fmt} justify="center">
        <Title gold={block.tituloGold} white={block.tituloWhite} size={92} fmt={fmt} />
        <div style={{ display: "flex", flexDirection: "column", gap: s(20, fmt), marginTop: s(46, fmt) }}>
          {block.items.map((it, i) => (
            <EquipoRow key={i} item={it} fmt={fmt} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: s(32, fmt) }}>
          {block.footer.map((line, i) => (
            <div key={i} style={{ display: "flex", fontWeight: 400, fontSize: s(26, fmt), color: "rgba(179,152,91,0.85)", lineHeight: 1.42 }}>{line}</div>
          ))}
        </div>
      </Content>
    </Frame>
  );
}

function Numeros({ d, opts }: { d: BriefTecnicoData; opts: FrameOpts }) {
  const n = d.numeros;
  const fmt = opts.fmt;
  const introSegs = splitBold(n.intro, ["producción", "técnica", "integral"]);
  return (
    <Frame {...opts}>
      <Content fmt={fmt} justify="center">
        <Title gold="LOS NÚMEROS" white="DEL EVENTO" size={92} fmt={fmt} />
        <div style={{ display: "flex", marginTop: s(24, fmt), marginBottom: s(42, fmt), maxWidth: s(770, fmt) }}>
          <RichLine segments={introSegs} size={33} color={COLOR.white} lineHeight={1.4} fmt={fmt} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: s(18, fmt) }}>
          {n.stats.map((st, i) => (
            <StatRow key={i} item={st} fmt={fmt} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: s(34, fmt) }}>
          <div style={{ display: "flex", fontWeight: 400, fontSize: s(34, fmt), color: COLOR.white, lineHeight: 1.3 }}>{n.cierreNormal}</div>
          <div style={{ display: "flex", fontWeight: 700, fontSize: s(34, fmt), color: COLOR.white, lineHeight: 1.3 }}>{n.cierreBold}</div>
        </div>
      </Content>
    </Frame>
  );
}

// Marca en negrita las palabras contenidas en `bolds` (case-insensitive contiguo).
function splitBold(text: string, bolds: string[]): { t: string; bold?: boolean }[] {
  const boldSet = new Set(bolds.map((b) => b.toLowerCase().replace(/[.,]/g, "")));
  return text.split(" ").map((w) => ({ t: w, bold: boldSet.has(w.toLowerCase().replace(/[.,]/g, "")) }));
}

export function renderStory(
  id: string,
  d: BriefTecnicoData,
  assets: { bg: string; logo: string },
  index: number,
  fmt: FormatoPerfil = getFormato("story"),
): React.ReactElement {
  const opts = (scrim: string): FrameOpts => ({ bg: assets.bg, scrim, index, logo: assets.logo, fmt });
  if (id === "portada") return <Portada d={d} opts={opts(SCRIM.soft)} />;
  if (id === "brief") return <Brief d={d} opts={opts(SCRIM.medium)} />;
  if (id === "numeros") return <Numeros d={d} opts={opts(SCRIM.strong)} />;
  const eq = d.equipos.find((e) => e.id === id);
  if (eq) return <EquipmentStory block={eq} opts={opts(SCRIM.strong)} />;
  return <Portada d={d} opts={opts(SCRIM.soft)} />;
}
