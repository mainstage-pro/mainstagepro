import React from "react";
import { COLOR } from "../tokens";
import { getFormato, s, type FormatoPerfil } from "../formatos";
import {
  Badge,
  ContactFooter,
  Content,
  Divider,
  Eyebrow,
  Frame,
  type FrameOpts,
  SCRIM,
  Title,
} from "../primitivas";
import type { InventarioData, EquipoSlide } from "./data";

// Chip de spec (píldora con borde oro tenue sobre superficie translúcida).
function Spec({ text, fmt }: { text: string; fmt: FormatoPerfil }) {
  return (
    <div
      style={{
        display: "flex",
        fontWeight: 600,
        fontSize: s(30, fmt),
        color: COLOR.white,
        background: COLOR.cardBg,
        border: `1px solid ${COLOR.cardBorder}`,
        borderRadius: 999,
        paddingTop: s(14, fmt),
        paddingBottom: s(14, fmt),
        paddingLeft: s(28, fmt),
        paddingRight: s(28, fmt),
      }}
    >
      {text}
    </div>
  );
}

function Portada({ d, opts }: { d: InventarioData; opts: FrameOpts }) {
  const p = d.portada;
  const fmt = opts.fmt;
  return (
    <Frame {...opts}>
      <Content fmt={fmt} justify="center">
        <Eyebrow text={p.kicker} fmt={fmt} />
        <div style={{ display: "flex", height: s(26, fmt) }} />
        <Title gold={p.tituloGold} white={p.tituloWhite} size={128} fmt={fmt} />
        <Divider fmt={fmt} mt={34} mb={38} width={620} fade />
        <div style={{ display: "flex", fontWeight: 400, fontSize: s(36, fmt), color: COLOR.white, lineHeight: 1.42, maxWidth: s(760, fmt) }}>
          {p.tagline}
        </div>
      </Content>
    </Frame>
  );
}

function EquipoStory({ e, opts }: { e: EquipoSlide; opts: FrameOpts }) {
  const fmt = opts.fmt;
  return (
    <Frame {...opts}>
      <Content fmt={fmt} justify="center">
        <Badge text={e.badge} fmt={fmt} />
        <div style={{ display: "flex", height: s(28, fmt) }} />
        <Title gold={e.tituloGold} white={e.tituloWhite} size={96} fmt={fmt} />
        <div style={{ display: "flex", fontWeight: 400, fontSize: s(35, fmt), color: COLOR.white, lineHeight: 1.42, maxWidth: s(780, fmt), marginTop: s(26, fmt), marginBottom: s(42, fmt) }}>
          {e.descripcion}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: s(16, fmt), maxWidth: s(820, fmt) }}>
          {e.specs.map((sp, i) => (
            <Spec key={i} text={sp} fmt={fmt} />
          ))}
        </div>
      </Content>
    </Frame>
  );
}

function Cierre({ d, opts }: { d: InventarioData; opts: FrameOpts }) {
  const c = d.cierre;
  const fmt = opts.fmt;
  return (
    <Frame {...opts}>
      <Content fmt={fmt} justify="center">
        <Eyebrow text="ARMAMOS TU EVENTO" fmt={fmt} />
        <div style={{ display: "flex", height: s(24, fmt) }} />
        <Title gold={c.tituloGold} white={c.tituloWhite} size={116} fmt={fmt} />
        <Divider fmt={fmt} mt={34} mb={0} width={560} fade />
      </Content>
      <ContactFooter telefono={c.telefono} arroba={c.arroba} fmt={fmt} />
    </Frame>
  );
}

export function renderEquipo(
  id: string,
  d: InventarioData,
  assets: { bg: string; logo: string },
  index: number,
  fmt: FormatoPerfil = getFormato("story"),
): React.ReactElement {
  const opts = (scrim: string): FrameOpts => ({ bg: assets.bg, scrim, index, logo: assets.logo, fmt });
  if (id === "portada") return <Portada d={d} opts={opts(SCRIM.soft)} />;
  if (id === "cierre") return <Cierre d={d} opts={opts(SCRIM.medium)} />;
  const e = d.equipos.find((x) => x.id === id);
  if (e) return <EquipoStory e={e} opts={opts(SCRIM.strong)} />;
  return <Portada d={d} opts={opts(SCRIM.soft)} />;
}
