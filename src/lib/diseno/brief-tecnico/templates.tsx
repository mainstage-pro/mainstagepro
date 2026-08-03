import React from "react";
import { CANVAS, COLOR, SPACE, FONT, SCRIM } from "../tokens";
import type { BriefTecnicoData, EquipoItem, StatItem } from "./data";

// ─────────────────────────────────────────────────────────────────────────────
// Primitivas compartidas (la "directriz" hecha componentes). Todo lo que genere
// el módulo de diseño se compone con estas piezas → estilo congruente siempre.
// ─────────────────────────────────────────────────────────────────────────────

type FrameOpts = { bg: string; scrim: string; index: number };

function GoldBar() {
  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 90,
        bottom: 90,
        width: 7,
        display: "flex",
        background: `linear-gradient(180deg, rgba(179,152,91,0) 0%, ${COLOR.goldBright} 50%, rgba(179,152,91,0) 100%)`,
      }}
    />
  );
}

// Círculos concéntricos con trazo que se desvanece en las puntas (gradiente).
function Ring() {
  const cx = 540;
  const cy = 560;
  const radii = [640, 500, 360];
  return (
    <svg width={CANVAS.W} height={CANVAS.H} style={{ position: "absolute", top: 0, left: 0 }}>
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

function CornerNumber({ index }: { index: number }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 44,
        bottom: 18,
        display: "flex",
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 300,
        lineHeight: 1,
        letterSpacing: -6,
        color: "rgba(179,152,91,0.13)",
      }}
    >
      {String(index).padStart(2, "0")}
    </div>
  );
}

function Frame({ bg, scrim, index, children }: FrameOpts & { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: CANVAS.W,
        height: CANVAS.H,
        display: "flex",
        position: "relative",
        fontFamily: FONT,
        backgroundColor: COLOR.black,
        overflow: "hidden",
      }}
    >
      <img src={bg} width={CANVAS.W} height={CANVAS.H} style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: CANVAS.W, height: CANVAS.H, display: "flex", background: scrim }} />
      <Ring />
      <GoldBar />
      <CornerNumber index={index} />
      {children}
    </div>
  );
}

// Bloque de contenido centrado verticalmente, con márgenes laterales de marca.
function Content({ children, justify = "center" }: { children: React.ReactNode; justify?: "center" | "flex-start" }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: SPACE.padX,
        right: SPACE.padX,
        height: CANVAS.H,
        display: "flex",
        flexDirection: "column",
        justifyContent: justify,
      }}
    >
      {children}
    </div>
  );
}

function Title({ gold, white, size = 92 }: { gold: string; white: string; size?: number }) {
  const base: React.CSSProperties = {
    display: "flex",
    fontFamily: FONT,
    fontWeight: 900,
    fontSize: size,
    lineHeight: 0.98,
    letterSpacing: -2,
    textTransform: "uppercase",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ ...base, color: COLOR.gold }}>{gold}</div>
      <div style={{ ...base, color: COLOR.white }}>{white}</div>
    </div>
  );
}

function Divider({ mt = 26, mb = 0, width = 120, fade = false }: { mt?: number; mb?: number; width?: number; fade?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        width,
        height: fade ? 3 : 4,
        marginTop: mt,
        marginBottom: mb,
        background: fade ? `linear-gradient(90deg, ${COLOR.gold} 0%, rgba(179,152,91,0) 100%)` : COLOR.gold,
      }}
    />
  );
}

const PinIcon = (
  <svg width="38" height="48" viewBox="0 0 24 24" fill={COLOR.gold}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
  </svg>
);

const ArrowIcon = (
  <svg width="40" height="40" viewBox="0 0 24 24" fill={COLOR.gold}>
    <path d="M4 11h11.2l-4.6-4.6L12 5l7 7-7 7-1.4-1.4 4.6-4.6H4z" />
  </svg>
);

// Texto con partes en negrita (para mezclar pesos inline sin romper Satori).
function RichLine({ segments, size, color, lineHeight = 1.4 }: { segments: { t: string; bold?: boolean }[]; size: number; color: string; lineHeight?: number }) {
  const words: React.ReactNode[] = [];
  segments.forEach((seg, si) => {
    seg.t.split(" ").forEach((w, wi) => {
      words.push(
        <div key={`${si}-${wi}`} style={{ display: "flex", fontWeight: seg.bold ? 900 : 400, marginRight: size * 0.28 }}>
          {w}
        </div>,
      );
    });
  });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", fontFamily: FONT, fontSize: size, color, lineHeight }}>
      {words}
    </div>
  );
}

function EquipoRow({ item }: { item: EquipoItem }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        background: COLOR.cardBg,
        border: `1px solid ${COLOR.cardBorder}`,
        borderRadius: 18,
        paddingTop: 26,
        paddingBottom: 26,
        paddingLeft: 30,
        paddingRight: 34,
      }}
    >
      <div style={{ display: "flex", width: 13, height: 13, borderRadius: 7, background: COLOR.gold }} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", fontWeight: 700, fontSize: 35, color: COLOR.white, letterSpacing: -0.5 }}>{item.nombre}</div>
        <div style={{ display: "flex", fontWeight: 400, fontSize: 26, color: COLOR.mute, marginTop: 7 }}>{item.sub}</div>
      </div>
      <div style={{ display: "flex", fontWeight: 900, fontSize: 48, color: COLOR.gold }}>{item.cant}</div>
    </div>
  );
}

function StatRow({ item }: { item: StatItem }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 26,
        background: COLOR.cardBg,
        border: `1px solid ${COLOR.cardBorder}`,
        borderRadius: 16,
        paddingTop: 22,
        paddingBottom: 22,
        paddingLeft: 32,
        paddingRight: 34,
      }}
    >
      <div style={{ display: "flex", width: 40 }}>{ArrowIcon}</div>
      <div style={{ display: "flex", width: 108, fontWeight: 900, fontSize: 66, color: COLOR.gold, letterSpacing: -2 }}>{item.n}</div>
      <div style={{ display: "flex", fontWeight: 700, fontSize: 35, color: COLOR.white, letterSpacing: 0.3, textTransform: "uppercase" }}>{item.label}</div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flex: 1,
        minHeight: 152,
        background: COLOR.cardBg,
        border: `1px solid ${COLOR.cardBorder}`,
        borderRadius: 16,
        paddingLeft: 30,
        paddingRight: 24,
        gap: 12,
      }}
    >
      <div style={{ display: "flex", fontWeight: 700, fontSize: 21, letterSpacing: 3, color: COLOR.gold, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", fontWeight: 700, fontSize: 33, color: COLOR.white, lineHeight: 1.12 }}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Las 5 stories
// ─────────────────────────────────────────────────────────────────────────────

function Portada({ d, opts, logo }: { d: BriefTecnicoData; opts: FrameOpts; logo: string }) {
  const p = d.portada;
  return (
    <Frame {...opts}>
      <img src={logo} height={58} style={{ position: "absolute", top: 128, right: 84, objectFit: "contain" }} />
      <Content justify="center">
        <div style={{ display: "flex", fontWeight: 700, fontSize: 30, letterSpacing: 5, color: COLOR.white, marginBottom: 26 }}>{p.kicker}</div>
        <Title gold={p.tituloGold} white={p.tituloWhite} size={132} />
        <Divider mt={34} mb={40} width={680} fade />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
          <div style={{ display: "flex", marginTop: 2 }}>{PinIcon}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontWeight: 700, fontSize: 34, color: COLOR.white, lineHeight: 1.32 }}>{p.lugar}</div>
            <div style={{ display: "flex", fontWeight: 700, fontSize: 34, color: COLOR.white, lineHeight: 1.32 }}>{p.fechas}</div>
          </div>
        </div>
      </Content>
    </Frame>
  );
}

function Brief({ d, opts }: { d: BriefTecnicoData; opts: FrameOpts }) {
  const b = d.brief;
  return (
    <Frame {...opts}>
      <Content justify="center">
        <Title gold="BRIEF" white="TÉCNICO" size={96} />
        <Divider mt={30} mb={40} />
        <div style={{ display: "flex", fontWeight: 400, fontSize: 33, color: COLOR.white, lineHeight: 1.45, maxWidth: 780, marginBottom: 54 }}>{b.descripcion}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", gap: 20 }}>
            <InfoCard label="Venue" value={b.venue} />
            <InfoCard label="Tipo" value={b.tipo} />
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <InfoCard label="Cliente" value={b.cliente} />
            <InfoCard label="Servicio" value={b.servicio} />
          </div>
        </div>
      </Content>
    </Frame>
  );
}

function EquipmentStory({ block, opts }: { block: { tituloGold: string; tituloWhite: string; items: EquipoItem[]; footer: string[] }; opts: FrameOpts }) {
  return (
    <Frame {...opts}>
      <Content justify="center">
        <Title gold={block.tituloGold} white={block.tituloWhite} size={92} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 46 }}>
          {block.items.map((it, i) => (
            <EquipoRow key={i} item={it} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 32 }}>
          {block.footer.map((line, i) => (
            <div key={i} style={{ display: "flex", fontWeight: 400, fontSize: 26, color: "rgba(179,152,91,0.85)", lineHeight: 1.42 }}>{line}</div>
          ))}
        </div>
      </Content>
    </Frame>
  );
}

function Numeros({ d, opts }: { d: BriefTecnicoData; opts: FrameOpts }) {
  const n = d.numeros;
  const introSegs = splitBold(n.intro, ["producción", "técnica", "integral"]);
  return (
    <Frame {...opts}>
      <Content justify="center">
        <Title gold="LOS NÚMEROS" white="DEL EVENTO" size={92} />
        <div style={{ display: "flex", marginTop: 24, marginBottom: 42, maxWidth: 770 }}>
          <RichLine segments={introSegs} size={33} color={COLOR.white} lineHeight={1.4} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {n.stats.map((s, i) => (
            <StatRow key={i} item={s} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 34 }}>
          <div style={{ display: "flex", fontWeight: 400, fontSize: 34, color: COLOR.white, lineHeight: 1.3 }}>{n.cierreNormal}</div>
          <div style={{ display: "flex", fontWeight: 700, fontSize: 34, color: COLOR.white, lineHeight: 1.3 }}>{n.cierreBold}</div>
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

export function renderStory(id: string, d: BriefTecnicoData, assets: { bg: string; logo: string }): React.ReactElement {
  const opts = (index: number, scrim: string): FrameOpts => ({ bg: assets.bg, scrim, index });
  switch (id) {
    case "portada":
      return <Portada d={d} opts={opts(1, SCRIM.soft)} logo={assets.logo} />;
    case "brief":
      return <Brief d={d} opts={opts(2, SCRIM.medium)} />;
    case "audio":
      return <EquipmentStory block={d.audio} opts={opts(3, SCRIM.strong)} />;
    case "video":
      return <EquipmentStory block={d.video} opts={opts(4, SCRIM.strong)} />;
    case "numeros":
      return <Numeros d={d} opts={opts(5, SCRIM.strong)} />;
    default:
      return <Portada d={d} opts={opts(1, SCRIM.soft)} logo={assets.logo} />;
  }
}
