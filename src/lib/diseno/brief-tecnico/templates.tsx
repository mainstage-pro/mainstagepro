import React from "react";
import { COLOR, FONT_MONO, GRID, SCRIM } from "../tokens";
import { getFormato, s, type FormatoPerfil } from "../formatos";
import {
  ArrowIcon,
  Content,
  Divider,
  Frame,
  type FrameOpts,
  InfoCard,
  PinIcon,
  RichLine,
  splitBold,
  Title,
} from "../primitivas";
import type { BriefTecnicoData, EquipoItem, StatItem } from "./data";

// Las primitivas de marca (Frame, Content, Title, …) viven en ../primitivas y las
// comparten todas las plantillas. Aquí quedan solo las filas propias del brief.

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
