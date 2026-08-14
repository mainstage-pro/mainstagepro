import React from "react";
import { COLOR } from "../tokens";
import { getFormato, s, type FormatoPerfil } from "../formatos";
import { Badge, ContactFooter, Content, Frame, type FrameOpts, SCRIM, Title } from "../primitivas";
import type { CampanaData } from "./data";

// Chip de oferta/gancho: contorno dorado, texto claro (ej. "20% de descuento").
function OfertaChip({ text, fmt }: { text: string; fmt: FormatoPerfil }) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        alignItems: "center",
        fontWeight: 700,
        fontSize: s(30, fmt),
        letterSpacing: s(1, fmt),
        color: COLOR.white,
        background: COLOR.cardBg,
        border: `1px solid ${COLOR.gold}`,
        borderRadius: 999,
        paddingTop: s(12, fmt),
        paddingBottom: s(12, fmt),
        paddingLeft: s(26, fmt),
        paddingRight: s(26, fmt),
      }}
    >
      {text}
    </div>
  );
}

// Botón/píldora de llamado a la acción (fondo dorado, texto negro).
function CtaPill({ text, fmt }: { text: string; fmt: FormatoPerfil }) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        alignItems: "center",
        fontWeight: 800,
        fontSize: s(34, fmt),
        letterSpacing: s(0.5, fmt),
        textTransform: "uppercase",
        color: COLOR.black,
        background: COLOR.gold,
        borderRadius: 999,
        paddingTop: s(18, fmt),
        paddingBottom: s(18, fmt),
        paddingLeft: s(40, fmt),
        paddingRight: s(40, fmt),
      }}
    >
      {text} →
    </div>
  );
}

function Creativo({ d, opts }: { d: CampanaData; opts: FrameOpts }) {
  const fmt = opts.fmt;
  return (
    <Frame {...opts}>
      <Content fmt={fmt} justify="center">
        <Badge text={d.badge} fmt={fmt} />
        <div style={{ display: "flex", height: s(28, fmt) }} />
        <Title gold={d.tituloGold} white={d.tituloWhite} size={108} fmt={fmt} />
        <div style={{ display: "flex", fontWeight: 400, fontSize: s(37, fmt), color: COLOR.white, lineHeight: 1.42, maxWidth: s(780, fmt), marginTop: s(30, fmt), marginBottom: s(46, fmt) }}>
          {d.mensaje}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: s(28, fmt) }}>
          {d.oferta ? <OfertaChip text={d.oferta} fmt={fmt} /> : null}
          {d.cta ? <CtaPill text={d.cta} fmt={fmt} /> : null}
        </div>
      </Content>
      <ContactFooter telefono={d.telefono} arroba={d.arroba} fmt={fmt} />
    </Frame>
  );
}

export function renderCampana(
  _id: string,
  d: CampanaData,
  assets: { bg: string; logo: string },
  index: number,
  fmt: FormatoPerfil = getFormato("story"),
): React.ReactElement {
  const opts: FrameOpts = { bg: assets.bg, scrim: SCRIM.strong, index, logo: assets.logo, fmt };
  return <Creativo d={d} opts={opts} />;
}
