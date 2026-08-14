import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { COLOR, WEIGHT, GRID, RATIO, ICON, FONT, FONT_MONO } from "@/lib/diseno/tokens";

export const dynamic = "force-dynamic";

// Página de gobernanza de marca: hace visible, dentro de la plataforma, la
// directriz que TODO generador de diseño consume desde src/lib/diseno/tokens.ts.
// Los valores de abajo se leen del propio tokens.ts: si cambia el brandbook y se
// actualiza tokens.ts, esta página y todas las piezas cambian juntas.

const PALETTE: { name: string; hex: string; note: string; dark?: boolean }[] = [
  { name: "Negro escena", hex: COLOR.black, note: "Pantone Black 6 C · fondo base", dark: true },
  { name: "Superficie", hex: COLOR.surface, note: "Tarjetas y módulos · solo digital", dark: true },
  { name: "Oro Mainstage", hex: COLOR.gold, note: "Pantone 4007 C · único dorado" },
  { name: "Gris técnico", hex: COLOR.grey, note: "Del isotipo" },
  { name: "Blanco cálido", hex: COLOR.white, note: "Texto sobre negro" },
  { name: "Texto secundario", hex: COLOR.textMute, note: "Subtítulos y datos" },
];

const REGLAS = [
  "Un solo negro (#0A0A0A) y un solo dorado (#B3985B). Sin excepciones.",
  `El oro acentúa, no domina: ${Math.round(RATIO.negro * 100)}% negro · ${Math.round(RATIO.grises * 100)}% grises · ${Math.round(RATIO.oro * 100)}% oro.`,
  "El oro nunca se satura; jamás sobre gris; oro sobre negro solo en texto ≥24 px.",
  "Una sola familia: Montserrat. Datos (folios, fechas, medidas) en JetBrains Mono.",
  "Nunca se sustituye por Arial, Calibri, Poppins ni Inter.",
  `Iconografía de línea (no relleno): lienzo ${ICON.canvas}×${ICON.canvas}, trazo ${ICON.stroke} px.`,
  `Retícula del story: margen ${GRID.margin} px, radio de tarjeta ${GRID.radius} px, grid de ${GRID.unit} px.`,
];

const cardStyle: React.CSSProperties = {
  background: "rgba(179,152,91,0.05)",
  border: "1px solid rgba(179,152,91,0.22)",
  borderRadius: 14,
  padding: "22px 24px",
};

export default async function BrandbookPage() {
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) notFound();

  return (
    <div style={{ minHeight: "100vh", background: COLOR.black, padding: "44px 36px", color: COLOR.white }}>
      {/* Carga la Montserrat/JetBrains Mono REALES (mismos .ttf que incrusta el
          render de las piezas) para que esta referencia se vea con la marca y no
          con la fuente por defecto del navegador. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @font-face { font-family: 'Montserrat'; font-style: normal; font-weight: 300; font-display: swap; src: url('/diseno/fonts/montserrat-300.ttf') format('truetype'); }
            @font-face { font-family: 'Montserrat'; font-style: normal; font-weight: 400; font-display: swap; src: url('/diseno/fonts/montserrat-400.ttf') format('truetype'); }
            @font-face { font-family: 'Montserrat'; font-style: normal; font-weight: 600; font-display: swap; src: url('/diseno/fonts/montserrat-600.ttf') format('truetype'); }
            @font-face { font-family: 'Montserrat'; font-style: normal; font-weight: 700; font-display: swap; src: url('/diseno/fonts/montserrat-700.ttf') format('truetype'); }
            @font-face { font-family: 'Montserrat'; font-style: normal; font-weight: 800; font-display: swap; src: url('/diseno/fonts/montserrat-800.ttf') format('truetype'); }
            @font-face { font-family: 'JetBrains Mono'; font-style: normal; font-weight: 400; font-display: swap; src: url('/diseno/fonts/jetbrainsmono-400.ttf') format('truetype'); }
            @font-face { font-family: 'JetBrains Mono'; font-style: normal; font-weight: 700; font-display: swap; src: url('/diseno/fonts/jetbrainsmono-700.ttf') format('truetype'); }
          `,
        }}
      />
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <Link href="/marketing/diseno" style={{ color: COLOR.textMute, fontSize: 13, textDecoration: "none" }}>
          ← Diseño
        </Link>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: FONT, fontSize: 32, fontWeight: WEIGHT.extrabold, letterSpacing: -0.6, margin: 0 }}>
              Directriz de marca
            </h1>
            <p style={{ color: COLOR.textMute, fontSize: 15, marginTop: 10, marginBottom: 0, maxWidth: 720, lineHeight: 1.55 }}>
              Esta es la base exacta de todo lo que genera la plataforma: propuestas, presentaciones, documentos y stories.
              Vive en código (<code style={{ fontFamily: FONT_MONO, color: COLOR.gold }}>src/lib/diseno/tokens.ts</code>) y cada
              generador la consume, así ninguna pieza se decide por su cuenta.
            </p>
          </div>
          <a
            href="/diseno/brandbook-mainstage.pdf"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flexShrink: 0,
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: WEIGHT.bold,
              color: COLOR.black,
              background: COLOR.gold,
              padding: "12px 20px",
              borderRadius: GRID.radius,
              textDecoration: "none",
            }}
          >
            Descargar brandbook (PDF)
          </a>
        </div>

        {/* Paleta */}
        <h2 style={{ fontFamily: FONT_MONO, color: COLOR.gold, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", marginTop: 48, marginBottom: 16 }}>
          C · Color
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {PALETTE.map((c) => (
            <div key={c.name} style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
              <div style={{ height: 92, background: c.hex, borderBottom: "1px solid rgba(255,255,255,0.06)" }} />
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 15 }}>{c.name}</span>
                  <span style={{ fontFamily: FONT_MONO, color: COLOR.gold, fontSize: 12 }}>{c.hex}</span>
                </div>
                <p style={{ color: COLOR.textMute, fontSize: 12.5, margin: "6px 0 0", lineHeight: 1.5 }}>{c.note}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tipografía */}
        <h2 style={{ fontFamily: FONT_MONO, color: COLOR.gold, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", marginTop: 48, marginBottom: 16 }}>
          D · Tipografía
        </h2>
        <div style={{ ...cardStyle }}>
          <div style={{ fontFamily: FONT, fontWeight: WEIGHT.extrabold, fontSize: 52, letterSpacing: -1, lineHeight: 1.05 }}>
            Montserrat
          </div>
          <p style={{ color: COLOR.textMute, fontSize: 13.5, margin: "6px 0 18px" }}>
            Una sola familia para todo. Pesos: Light 300 · Regular 400 · SemiBold 600 · Bold 700 · ExtraBold 800.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(
              [
                ["Light 300", WEIGHT.light],
                ["Regular 400", WEIGHT.regular],
                ["SemiBold 600", WEIGHT.semibold],
                ["Bold 700", WEIGHT.bold],
                ["ExtraBold 800", WEIGHT.extrabold],
              ] as const
            ).map(([label, w]) => (
              <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                <span style={{ fontFamily: FONT_MONO, color: COLOR.textMute, fontSize: 12, width: 130 }}>{label}</span>
                <span style={{ fontFamily: FONT, fontWeight: w, fontSize: 22 }}>Creamos experiencias que generan impacto.</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 10 }}>
              <span style={{ fontFamily: FONT_MONO, color: COLOR.textMute, fontSize: 12, width: 130 }}>JetBrains Mono</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 20, color: COLOR.gold }}>MSP-2026-0148 · 12 AGO 2026</span>
            </div>
          </div>
        </div>

        {/* Reglas */}
        <h2 style={{ fontFamily: FONT_MONO, color: COLOR.gold, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", marginTop: 48, marginBottom: 16 }}>
          Reglas ancla
        </h2>
        <div style={{ ...cardStyle }}>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {REGLAS.map((r, i) => (
              <li key={i} style={{ fontFamily: FONT, fontSize: 14.5, lineHeight: 1.55, color: COLOR.white }}>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <p style={{ color: COLOR.textMute, fontSize: 12.5, marginTop: 32, lineHeight: 1.6 }}>
          Escenario Principal Producciones S.A. de C.V. · Brandbook V.1 · 2026. Para cambiar la marca se edita{" "}
          <code style={{ fontFamily: FONT_MONO, color: COLOR.gold }}>tokens.ts</code> y todo lo generado se actualiza en conjunto.
        </p>
      </div>
    </div>
  );
}
