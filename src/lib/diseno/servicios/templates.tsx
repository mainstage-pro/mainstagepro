import React from "react";
import { COLOR } from "../tokens";
import { getFormato, s, type FormatoPerfil } from "../formatos";
import {
  Badge,
  CheckIcon,
  ContactFooter,
  Content,
  Divider,
  Eyebrow,
  Frame,
  type FrameOpts,
  SCRIM,
  Title,
} from "../primitivas";
import type { ServiciosData, ServicioSlide } from "./data";

function BulletRow({ text, fmt }: { text: string; fmt: FormatoPerfil }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: s(18, fmt) }}>
      <div style={{ display: "flex" }}><CheckIcon fmt={fmt} /></div>
      <div style={{ display: "flex", fontWeight: 600, fontSize: s(34, fmt), color: COLOR.white, letterSpacing: -0.3 }}>{text}</div>
    </div>
  );
}

function Portada({ d, opts }: { d: ServiciosData; opts: FrameOpts }) {
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

function ServicioStory({ sv, opts }: { sv: ServicioSlide; opts: FrameOpts }) {
  const fmt = opts.fmt;
  return (
    <Frame {...opts}>
      <Content fmt={fmt} justify="center">
        <Badge text={sv.badge} fmt={fmt} />
        <div style={{ display: "flex", height: s(28, fmt) }} />
        <Title gold={sv.tituloGold} white={sv.tituloWhite} size={104} fmt={fmt} />
        <div style={{ display: "flex", fontWeight: 400, fontSize: s(35, fmt), color: COLOR.white, lineHeight: 1.42, maxWidth: s(780, fmt), marginTop: s(28, fmt), marginBottom: s(46, fmt) }}>
          {sv.descripcion}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: s(24, fmt) }}>
          {sv.bullets.map((b, i) => (
            <BulletRow key={i} text={b} fmt={fmt} />
          ))}
        </div>
      </Content>
    </Frame>
  );
}

function Cierre({ d, opts }: { d: ServiciosData; opts: FrameOpts }) {
  const c = d.cierre;
  const fmt = opts.fmt;
  return (
    <Frame {...opts}>
      <Content fmt={fmt} justify="center">
        <Eyebrow text="LISTOS CUANDO TÚ LO ESTÉS" fmt={fmt} />
        <div style={{ display: "flex", height: s(24, fmt) }} />
        <Title gold={c.tituloGold} white={c.tituloWhite} size={120} fmt={fmt} />
        <Divider fmt={fmt} mt={34} mb={0} width={560} fade />
      </Content>
      <ContactFooter telefono={c.telefono} arroba={c.arroba} fmt={fmt} />
    </Frame>
  );
}

export function renderServicio(
  id: string,
  d: ServiciosData,
  assets: { bg: string; logo: string },
  index: number,
  fmt: FormatoPerfil = getFormato("story"),
): React.ReactElement {
  const opts = (scrim: string): FrameOpts => ({ bg: assets.bg, scrim, index, logo: assets.logo, fmt });
  if (id === "portada") return <Portada d={d} opts={opts(SCRIM.soft)} />;
  if (id === "cierre") return <Cierre d={d} opts={opts(SCRIM.medium)} />;
  const sv = d.servicios.find((s2) => s2.id === id);
  if (sv) return <ServicioStory sv={sv} opts={opts(SCRIM.strong)} />;
  return <Portada d={d} opts={opts(SCRIM.soft)} />;
}
