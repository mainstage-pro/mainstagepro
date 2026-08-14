import React from "react";
import { COLOR } from "../tokens";
import { getFormato, s, type FormatoPerfil } from "../formatos";
import {
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
import type { ContenidoData } from "./data";

function PuntoRow({ text, fmt }: { text: string; fmt: FormatoPerfil }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: s(18, fmt) }}>
      <div style={{ display: "flex", marginTop: s(4, fmt) }}>
        <CheckIcon fmt={fmt} />
      </div>
      <div style={{ display: "flex", fontWeight: 600, fontSize: s(36, fmt), color: COLOR.white, lineHeight: 1.3, letterSpacing: -0.3, maxWidth: s(760, fmt) }}>
        {text}
      </div>
    </div>
  );
}

function Gancho({ d, opts }: { d: ContenidoData; opts: FrameOpts }) {
  const fmt = opts.fmt;
  return (
    <Frame {...opts}>
      <Content fmt={fmt} justify="center">
        <Eyebrow text={d.eyebrow} fmt={fmt} />
        <div style={{ display: "flex", height: s(26, fmt) }} />
        <Title gold={d.tituloGold} white={d.tituloWhite} size={104} fmt={fmt} />
        <Divider fmt={fmt} mt={34} mb={38} width={620} fade />
        <div style={{ display: "flex", fontWeight: 400, fontSize: s(37, fmt), color: COLOR.white, lineHeight: 1.42, maxWidth: s(780, fmt) }}>
          {d.gancho}
        </div>
      </Content>
    </Frame>
  );
}

function Valor({ d, opts }: { d: ContenidoData; opts: FrameOpts }) {
  const fmt = opts.fmt;
  return (
    <Frame {...opts}>
      <Content fmt={fmt} justify="center">
        <Eyebrow text="LO QUE DEBES SABER" fmt={fmt} />
        <div style={{ display: "flex", height: s(30, fmt) }} />
        <Title gold={d.tituloGold} white={d.tituloWhite} size={72} fmt={fmt} />
        <div style={{ display: "flex", flexDirection: "column", gap: s(28, fmt), marginTop: s(48, fmt) }}>
          {d.puntos.map((p, i) => (
            <PuntoRow key={i} text={p} fmt={fmt} />
          ))}
        </div>
      </Content>
    </Frame>
  );
}

function Cierre({ d, opts }: { d: ContenidoData; opts: FrameOpts }) {
  const fmt = opts.fmt;
  return (
    <Frame {...opts}>
      <Content fmt={fmt} justify="center">
        <Eyebrow text={d.eyebrow} fmt={fmt} />
        <div style={{ display: "flex", height: s(28, fmt) }} />
        <div style={{ display: "flex", fontWeight: 800, fontSize: s(60, fmt), color: COLOR.white, lineHeight: 1.18, letterSpacing: -0.6, maxWidth: s(820, fmt) }}>
          {d.remate}
        </div>
        <Divider fmt={fmt} mt={38} mb={0} width={560} fade />
      </Content>
      <ContactFooter telefono={d.telefono} arroba={d.arroba} fmt={fmt} />
    </Frame>
  );
}

export function renderContenido(
  id: string,
  d: ContenidoData,
  assets: { bg: string; logo: string },
  index: number,
  fmt: FormatoPerfil = getFormato("story"),
): React.ReactElement {
  const opts = (scrim: string): FrameOpts => ({ bg: assets.bg, scrim, index, logo: assets.logo, fmt });
  if (id === "valor") return <Valor d={d} opts={opts(SCRIM.strong)} />;
  if (id === "cierre") return <Cierre d={d} opts={opts(SCRIM.medium)} />;
  return <Gancho d={d} opts={opts(SCRIM.soft)} />;
}
