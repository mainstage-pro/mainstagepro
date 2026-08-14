import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { COLOR, WEIGHT, GRID, RATIO, ICON, FONT, FONT_MONO } from "@/lib/diseno/tokens";

export const dynamic = "force-dynamic";

// Página de gobernanza de marca: hace visible, dentro de la plataforma, la
// directriz que TODO generador de diseño consume desde src/lib/diseno/tokens.ts.
// Es la traducción a pantalla del Brandbook Mainstage Pro V.1 — solo las
// secciones que gobiernan diseño (logo, color, tipografía, sistema gráfico,
// fotografía y voz). Si cambia el brandbook y se actualiza tokens.ts, esta
// página y todas las piezas cambian juntas.

const PALETTE: { name: string; hex: string; note: string }[] = [
  { name: "Negro escena", hex: COLOR.black, note: "Pantone Black 6 C · fondo base" },
  { name: "Oro Mainstage", hex: COLOR.gold, note: "Pantone 4007 C · único dorado" },
  { name: "Gris técnico", hex: COLOR.grey, note: "Del isotipo" },
  { name: "Blanco cálido", hex: COLOR.white, note: "Texto sobre negro (no #FFF)" },
  { name: "Superficie", hex: COLOR.surface, note: "Tarjetas y módulos · solo digital" },
  { name: "Texto secundario", hex: COLOR.textMute, note: "Subtítulos y datos" },
];

// C.2 — dónde va y dónde no va el oro
const ORO_SI = [
  "Una palabra del titular",
  "Líneas divisorias",
  "Numeración e iconos",
  "Bullets y bordes de tarjeta",
  "Estados activos y enlaces",
];
const ORO_NO = [
  "Párrafos completos",
  "Fondos grandes de texto",
  "Degradados y sombras de texto",
  "Sobre gris (nunca)",
  "Más de un elemento por bloque",
];

// F — fotografía
const FOTO_TIPOS = [
  { t: "Resultado", d: "Luz, humo, público. Nocturna, haces visibles. Abre toda pieza." },
  { t: "Método", d: "Sala montada, cableado limpio. Vende orden, no espectáculo." },
  { t: "Ambiente", d: "Venue terminado antes de la gente. Eventos sociales y propuestas." },
];
const FOTO_NO = [
  "Movido, oscuro o desenfocado",
  "Cables sueltos, sillas desalineadas",
  "Público disperso",
  "Invitados identificables en primer plano",
  "Logos de clientes sin autorización",
];

// G — voz y tono
const VOZ_ADJ = [
  { t: "Directo", d: "Frases cortas. Sujeto, verbo, dato." },
  { t: "Técnico", d: "Nombramos el equipo con precisión." },
  { t: "Cercano", d: "Tuteamos. Sin solemnidad corporativa." },
  { t: "Responsable", d: "No prometemos lo que no operamos." },
];
const VOZ_SI = [
  "Line array calibrado para el aforo real.",
  "Prueba técnica completa el día anterior.",
  "Un director técnico que responde por todo.",
  "Cotización en 24 horas.",
];
const VOZ_NO = [
  "Los mejores del mercado.",
  "Soluciones integrales 360 de vanguardia.",
  "Precios inigualables, ¡aprovecha ya!",
  "Hacemos magia con tu evento.",
];

// B — logo
const LOGO_VERSIONES = [
  { n: "01 · Principal", sub: "Horizontal completo", uso: "Cotizaciones, presentaciones, sitio, plataforma, encabezado de piezas. El 80% de todo." },
  { n: "02 · Secundaria", sub: "Logotipo sin isotipo", uso: "Cuando el isotipo se pierde por tamaño: bordados, cierre de video, marca de agua." },
  { n: "03 · Isotipo", sub: "Solo los círculos", uso: "Avatar de redes y WhatsApp, favicon, app, sello de inventario, pin y gorra." },
];
const LOGO_MIN = [
  ["Digital", "160 px de ancho"],
  ["Impreso", "30 mm de ancho"],
  ["Isotipo", "24 px / 8 mm"],
  ["Bordado", "45 mm (secundaria)"],
];
const LOGO_NO = [
  "No deformar ni estirar",
  "No rotar ni inclinar",
  "No cambiar los colores",
  "No sobre fondos ruidosos",
  "No sombras ni contornos",
  "No reescribir el nombre",
  "No invadir el área de respeto",
  "No baja resolución ni halo JPG",
];

const cardStyle: React.CSSProperties = {
  background: "rgba(179,152,91,0.05)",
  border: "1px solid rgba(179,152,91,0.22)",
  borderRadius: 14,
  padding: "22px 24px",
};

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: FONT_MONO,
        color: COLOR.gold,
        fontSize: 12,
        letterSpacing: 1.4,
        textTransform: "uppercase",
        marginTop: 48,
        marginBottom: 16,
      }}
    >
      {children}
    </h2>
  );
}

// Isotipo dibujado con los tokens: dos círculos que se intersectan —
// gris (la técnica) y oro (la experiencia). La intersección es el evento.
function Isotipo({ size = 92 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="40" cy="50" r="26" stroke={COLOR.grey} strokeWidth="3" />
      <circle cx="60" cy="50" r="26" stroke={COLOR.gold} strokeWidth="3" />
    </svg>
  );
}

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
      <div style={{ maxWidth: 1080, margin: "0 auto", fontFamily: FONT }}>
        <Link href="/marketing/diseno" style={{ color: COLOR.textMute, fontSize: 13, textDecoration: "none" }}>
          ← Diseño
        </Link>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: FONT, fontSize: 32, fontWeight: WEIGHT.extrabold, letterSpacing: -0.6, margin: 0 }}>
              Directriz de marca
            </h1>
            <p style={{ color: COLOR.textMute, fontSize: 15, marginTop: 10, marginBottom: 0, maxWidth: 720, lineHeight: 1.55 }}>
              La base exacta de todo lo que genera la plataforma: propuestas, presentaciones, documentos y stories.
              Vive en código (<code style={{ fontFamily: FONT_MONO, color: COLOR.gold }}>src/lib/diseno/tokens.ts</code>) y cada
              generador la consume, así ninguna pieza se decide por su cuenta. Ante la duda, gana la consistencia sobre la creatividad.
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

        {/* ── B · Logotipo ──────────────────────────────────────────────── */}
        <H2>B · Logotipo</H2>
        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 26, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <Isotipo />
              <span style={{ fontFamily: FONT_MONO, color: COLOR.textMute, fontSize: 11, letterSpacing: 0.6 }}>ISOTIPO</span>
            </div>
            <p style={{ color: COLOR.textMute, fontSize: 13.5, lineHeight: 1.55, margin: 0, maxWidth: 640 }}>
              Dos círculos que se intersectan: <span style={{ color: COLOR.grey }}>gris (la técnica)</span> y{" "}
              <span style={{ color: COLOR.gold }}>oro (la experiencia)</span>. La intersección es el evento.
              Proporción fija: no se separan ni se reordenan las partes, y <b style={{ color: COLOR.white }}>MAINSTAGE</b> nunca
              se reescribe con otra tipografía.
            </p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {LOGO_VERSIONES.map((v) => (
            <div key={v.n} style={{ ...cardStyle }}>
              <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 15 }}>{v.n}</div>
              <div style={{ fontFamily: FONT_MONO, color: COLOR.gold, fontSize: 11.5, marginTop: 4, letterSpacing: 0.5 }}>
                {v.sub.toUpperCase()}
              </div>
              <p style={{ color: COLOR.textMute, fontSize: 12.5, margin: "8px 0 0", lineHeight: 1.5 }}>{v.uso}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
          <div style={{ ...cardStyle }}>
            <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 14, marginBottom: 4 }}>Aire y tamaños mínimos</div>
            <p style={{ color: COLOR.textMute, fontSize: 12.5, margin: "0 0 12px", lineHeight: 1.5 }}>
              Área de respeto = altura del isotipo (X) por los cuatro lados. Nada entra ahí. Por debajo del mínimo, se usa el isotipo solo.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {LOGO_MIN.map(([k, val]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontFamily: FONT_MONO, color: COLOR.textMute, fontSize: 12 }}>{k}</span>
                  <span style={{ fontFamily: FONT_MONO, color: COLOR.gold, fontSize: 12 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...cardStyle }}>
            <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 14, marginBottom: 8 }}>Usos incorrectos</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }}>
              {LOGO_NO.map((r) => (
                <li key={r} style={{ color: COLOR.textMute, fontSize: 12.5, lineHeight: 1.4 }}>{r}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── C · Color ─────────────────────────────────────────────────── */}
        <H2>C · Color</H2>
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

        {/* C.2 — proporción y uso del oro */}
        <div style={{ ...cardStyle, marginTop: 14 }}>
          <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 15, marginBottom: 4 }}>El oro acentúa, no domina</div>
          <p style={{ color: COLOR.textMute, fontSize: 12.5, margin: "0 0 14px" }}>
            El dorado no se satura “para que resalte”. Si se ve apagado, el problema es el contraste del fondo, no el color.
          </p>
          <div style={{ display: "flex", height: 34, borderRadius: 8, overflow: "hidden", marginBottom: 6 }}>
            <div style={{ flex: RATIO.negro, background: COLOR.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: COLOR.white }}>{Math.round(RATIO.negro * 100)}% NEGRO</span>
            </div>
            <div style={{ flex: RATIO.grises, background: COLOR.grey, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: COLOR.black }}>{Math.round(RATIO.grises * 100)}%</span>
            </div>
            <div style={{ flex: RATIO.oro, background: COLOR.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: COLOR.black }}>{Math.round(RATIO.oro * 100)}%</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 16 }}>
            <div>
              <div style={{ fontFamily: FONT_MONO, color: COLOR.gold, fontSize: 11, letterSpacing: 0.8, marginBottom: 8 }}>EL ORO VA EN</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
                {ORO_SI.map((r) => (
                  <li key={r} style={{ color: COLOR.white, fontSize: 13, lineHeight: 1.4 }}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <div style={{ fontFamily: FONT_MONO, color: COLOR.textMute, fontSize: 11, letterSpacing: 0.8, marginBottom: 8 }}>NUNCA VA EN</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
                {ORO_NO.map((r) => (
                  <li key={r} style={{ color: COLOR.textMute, fontSize: 13, lineHeight: 1.4 }}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
          <p style={{ color: COLOR.textMute, fontSize: 12.5, margin: "14px 0 0", lineHeight: 1.5, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
            <b style={{ color: COLOR.white }}>Contraste mínimo:</b> oro sobre negro solo en texto ≥24 px. Para texto corrido, siempre blanco cálido. Nunca oro sobre gris.
          </p>
        </div>

        {/* ── D · Tipografía ────────────────────────────────────────────── */}
        <H2>D · Tipografía</H2>
        <div style={{ ...cardStyle }}>
          <div style={{ fontFamily: FONT, fontWeight: WEIGHT.extrabold, fontSize: 52, letterSpacing: -1, lineHeight: 1.05 }}>
            Montserrat
          </div>
          <p style={{ color: COLOR.textMute, fontSize: 13.5, margin: "6px 0 18px" }}>
            Una sola familia para todo. Si un programa no la tiene, se instala — no se sustituye por Arial, Calibri, Poppins ni Inter.
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
          <p style={{ color: COLOR.textMute, fontSize: 12.5, margin: "18px 0 0", lineHeight: 1.5, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
            Datos (folios, fechas, medidas, códigos) en JetBrains Mono — nunca para títulos ni párrafos. Interlínea 1.0–1.1 en titulares,
            1.45–1.6 en texto. Máximo dos pesos por pieza. Prohibido: cursivas, subrayados y texto centrado en párrafos largos.
          </p>
        </div>

        {/* ── E · Sistema gráfico ───────────────────────────────────────── */}
        <H2>E · Sistema gráfico — cinco elementos</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {/* Línea dorada */}
          <div style={{ ...cardStyle }}>
            <div style={{ height: 64, display: "flex", alignItems: "center" }}>
              <div style={{ height: 2, width: "100%", background: `linear-gradient(90deg, ${COLOR.gold} 0%, rgba(179,152,91,0) 100%)` }} />
            </div>
            <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 14, marginTop: 8 }}>Línea dorada</div>
            <p style={{ color: COLOR.textMute, fontSize: 12, margin: "4px 0 0", lineHeight: 1.45 }}>
              Separa titular de contenido. 1–2 px, se desvanece a la derecha.
            </p>
          </div>
          {/* Círculos concéntricos */}
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            <div style={{ height: 64, position: "relative", overflow: "hidden" }}>
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: "absolute", top: -14, left: -6 }}>
                {[52, 40, 28, 16].map((r) => (
                  <circle key={r} cx="60" cy="60" r={r} fill="none" stroke={COLOR.gold} strokeOpacity="0.5" strokeWidth="1.5" />
                ))}
              </svg>
            </div>
            <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 14, marginTop: 8 }}>Círculos concéntricos</div>
            <p style={{ color: COLOR.textMute, fontSize: 12, margin: "4px 0 0", lineHeight: 1.45 }}>
              Ondas de sonido. Fondo, siempre recortados por el borde.
            </p>
          </div>
          {/* Tarjeta de dato */}
          <div style={{ ...cardStyle }}>
            <div style={{ height: 64, display: "flex", alignItems: "center" }}>
              <div style={{ background: COLOR.surface, border: `1px solid ${COLOR.cardBorder}`, borderRadius: GRID.radius, padding: "8px 12px" }}>
                <div style={{ fontFamily: FONT_MONO, color: COLOR.gold, fontSize: 9, letterSpacing: 0.5 }}>02 / SUBWOOFER</div>
                <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 15 }}>RCF 8006-AS</div>
              </div>
            </div>
            <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 14, marginTop: 8 }}>Tarjeta de dato</div>
            <p style={{ color: COLOR.textMute, fontSize: 12, margin: "4px 0 0", lineHeight: 1.45 }}>
              Etiqueta mono arriba, valor en bold. Radio {GRID.radius} px.
            </p>
          </div>
          {/* Badge de sección */}
          <div style={{ ...cardStyle }}>
            <div style={{ height: 64, display: "flex", alignItems: "center" }}>
              <span style={{ border: `1px solid ${COLOR.gold}`, color: COLOR.gold, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", padding: "5px 10px", borderRadius: GRID.radius }}>
                Equipo en renta
              </span>
            </div>
            <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 14, marginTop: 8 }}>Badge de sección</div>
            <p style={{ color: COLOR.textMute, fontSize: 12, margin: "4px 0 0", lineHeight: 1.45 }}>
              Contorno oro, mayúsculas. Siempre arriba a la izquierda.
            </p>
          </div>
          {/* Numeración fantasma */}
          <div style={{ ...cardStyle, position: "relative", overflow: "hidden" }}>
            <div style={{ height: 64, position: "relative" }}>
              <span style={{ position: "absolute", right: -4, bottom: -22, fontFamily: FONT, fontWeight: WEIGHT.extrabold, fontSize: 96, color: COLOR.white, opacity: 0.07, lineHeight: 1 }}>
                02
              </span>
            </div>
            <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 14, marginTop: 8 }}>Numeración fantasma</div>
            <p style={{ color: COLOR.textMute, fontSize: 12, margin: "4px 0 0", lineHeight: 1.45 }}>
              Número grande al 7% de opacidad, abajo a la derecha.
            </p>
          </div>
        </div>

        {/* E.2 retícula + E.3 iconografía */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
          <div style={{ ...cardStyle }}>
            <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 14, marginBottom: 10 }}>E.2 · Retícula del story (1080×1920)</div>
            {(
              [
                ["Margen lateral", `${GRID.margin} px · 8%`],
                ["Libre arriba", `${GRID.safeTop} px · 14%`],
                ["Libre abajo", `${GRID.safeBottom} px · 20%`],
                ["Columnas", String(GRID.columns)],
                ["Grid base", `${GRID.unit} px`],
                ["Radio tarjeta", `${GRID.radius} px`],
              ] as const
            ).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0" }}>
                <span style={{ fontFamily: FONT_MONO, color: COLOR.textMute, fontSize: 12 }}>{k}</span>
                <span style={{ fontFamily: FONT_MONO, color: COLOR.gold, fontSize: 12 }}>{v}</span>
              </div>
            ))}
            <p style={{ color: COLOR.textMute, fontSize: 12, margin: "10px 0 0", lineHeight: 1.5 }}>
              El 14% superior y el 20% inferior quedan libres de texto: ahí va la interfaz de Reels y Stories.
            </p>
          </div>
          <div style={{ ...cardStyle }}>
            <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 14, marginBottom: 10 }}>E.3 · Iconografía — línea, no relleno</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <svg width={ICON.canvas} height={ICON.canvas} viewBox="0 0 48 48" fill="none" stroke={COLOR.gold} strokeWidth={ICON.stroke} strokeLinecap="square" strokeLinejoin="round">
                <rect x="8" y="14" width="32" height="20" rx={ICON.corner} />
                <circle cx="24" cy="24" r="5" />
                <path d="M14 14v-4M34 14v-4" />
              </svg>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {(
                  [
                    ["Lienzo", `${ICON.canvas} × ${ICON.canvas}`],
                    ["Trazo", `${ICON.stroke} px, recto`],
                    ["Esquinas", `radio ${ICON.corner} px`],
                    ["Color", "oro o blanco"],
                  ] as const
                ).map(([k, v]) => (
                  <span key={k} style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: COLOR.textMute }}>
                    {k}: <span style={{ color: COLOR.gold }}>{v}</span>
                  </span>
                ))}
              </div>
            </div>
            <p style={{ color: COLOR.textMute, fontSize: 12, margin: 0, lineHeight: 1.5, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
              Un icono por tarjeta, una sola biblioteca. Prohibidos: emoji, iconos rellenos mezclados con lineales, degradados y clip-art de equipo.
            </p>
          </div>
        </div>

        {/* ── F · Fotografía ────────────────────────────────────────────── */}
        <H2>F · Fotografía</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {FOTO_TIPOS.map((f) => (
            <div key={f.t} style={{ ...cardStyle }}>
              <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 15 }}>{f.t}</div>
              <p style={{ color: COLOR.textMute, fontSize: 12.5, margin: "6px 0 0", lineHeight: 1.5 }}>{f.d}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
          <div style={{ ...cardStyle }}>
            <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 14, marginBottom: 6 }}>Tratamiento</div>
            <p style={{ color: COLOR.textMute, fontSize: 12.5, margin: 0, lineHeight: 1.55 }}>
              Velo negro <b style={{ color: COLOR.white }}>40–60%</b> cuando lleva texto encima. Contraste alto, negros profundos, temperatura cálida.
              Nunca filtros de moda ni saturación forzada.
            </p>
          </div>
          <div style={{ ...cardStyle }}>
            <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 14, marginBottom: 6 }}>No entra al corte</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {FOTO_NO.map((r) => (
                <li key={r} style={{ color: COLOR.textMute, fontSize: 12.5, lineHeight: 1.4 }}>{r}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── G · Voz y tono ────────────────────────────────────────────── */}
        <H2>G · Voz y tono</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {VOZ_ADJ.map((a) => (
            <div key={a.t} style={{ ...cardStyle }}>
              <div style={{ fontFamily: FONT, fontWeight: WEIGHT.bold, fontSize: 15 }}>{a.t}</div>
              <p style={{ color: COLOR.textMute, fontSize: 12.5, margin: "6px 0 0", lineHeight: 1.5 }}>{a.d}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
          <div style={{ ...cardStyle }}>
            <div style={{ fontFamily: FONT_MONO, color: COLOR.gold, fontSize: 11, letterSpacing: 0.8, marginBottom: 10 }}>SÍ DECIMOS</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 7 }}>
              {VOZ_SI.map((r) => (
                <li key={r} style={{ color: COLOR.white, fontSize: 13, lineHeight: 1.45 }}>{r}</li>
              ))}
            </ul>
          </div>
          <div style={{ ...cardStyle }}>
            <div style={{ fontFamily: FONT_MONO, color: COLOR.textMute, fontSize: 11, letterSpacing: 0.8, marginBottom: 10 }}>NO DECIMOS</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 7 }}>
              {VOZ_NO.map((r) => (
                <li key={r} style={{ color: COLOR.textMute, fontSize: 13, lineHeight: 1.45, textDecoration: "line-through", textDecorationColor: "rgba(142,136,127,0.5)" }}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
        <div style={{ ...cardStyle, marginTop: 14, background: "rgba(179,152,91,0.09)" }}>
          <span style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.55 }}>
            <b style={{ color: COLOR.gold }}>Regla de redes:</b> máximo 12 palabras por pantalla, nunca dos bloques de texto simultáneos, y el mensaje debe entenderse en mudo.
          </span>
        </div>

        <p style={{ color: COLOR.textMute, fontSize: 12.5, marginTop: 32, lineHeight: 1.6 }}>
          Escenario Principal Producciones S.A. de C.V. · Brandbook V.1 · 2026. Para cambiar la marca se edita{" "}
          <code style={{ fontFamily: FONT_MONO, color: COLOR.gold }}>tokens.ts</code> y todo lo generado se actualiza en conjunto.
        </p>
      </div>
    </div>
  );
}
