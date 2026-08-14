import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { FORMATOS, type FormatoId } from "@/lib/diseno/formatos";
import {
  PILAR_LABEL,
  contenidoSlides,
  getIdea,
  planSemanal,
  alternativasEnPilar,
} from "@/lib/diseno/contenido/data";

export const dynamic = "force-dynamic";

const GOLD = "#B3985B";
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fechaCorta = (d: Date) => `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;

// Horizonte del plan: de hoy hasta el 31 de diciembre de 2026.
const HASTA = new Date(Date.UTC(2026, 11, 31));

export default async function ContenidoInformativo({
  searchParams,
}: {
  searchParams: Promise<{ pieza?: string; formato?: string }>;
}) {
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) notFound();

  const { pieza, formato: formatoParam } = await searchParams;
  const formato: FormatoId = (["story", "post", "cuadrado"] as const).includes(formatoParam as FormatoId)
    ? (formatoParam as FormatoId)
    : "story";

  const plan = planSemanal(new Date(), HASTA);

  // ── Modo detalle: una pieza (3 slides) ─────────────────────────────────────
  const idea = getIdea(pieza);
  if (idea) {
    const fmt = FORMATOS[formato];
    const aspect = `${fmt.w} / ${fmt.h}`;
    const alternativas = alternativasEnPilar(idea.pilar, idea.id);
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "40px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <a href="/marketing/diseno/contenido-informativo" style={{ color: "#8a8578", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            ← Calendario
          </a>
          <div style={{ color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginTop: 12 }}>
            {PILAR_LABEL[idea.pilar]}
          </div>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginTop: 6 }}>
            {idea.tituloGold} <span style={{ color: GOLD }}>{idea.tituloWhite}</span>
          </h1>
          <p style={{ color: "#8a8578", fontSize: 15, marginTop: 8, marginBottom: 24 }}>{idea.gancho}</p>

          {/* Selector de formato */}
          <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
            {(["story", "post", "cuadrado"] as FormatoId[]).map((k) => {
              const activo = k === formato;
              return (
                <a
                  key={k}
                  href={`?pieza=${idea.id}&formato=${k}`}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 700,
                    color: activo ? "#0a0a0a" : "#fff",
                    background: activo ? GOLD : "transparent",
                    border: `1px solid ${activo ? GOLD : "rgba(179,152,91,0.35)"}`,
                  }}
                >
                  {FORMATOS[k].label}
                </a>
              );
            })}
          </div>

          {/* Los 3 slides */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
            {contenidoSlides().map((slide, i) => {
              const src = `/api/diseno/render?template=contenido-informativo&pieza=${idea.id}&slide=${slide.id}&formato=${formato}`;
              return (
                <div key={slide.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={slide.label}
                    style={{ width: "100%", aspectRatio: aspect, objectFit: "cover", borderRadius: 14, border: "1px solid rgba(179,152,91,0.25)", display: "block", background: "#141210" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: "#cfc7b6", fontSize: 14, fontWeight: 600 }}>{String(i + 1).padStart(2, "0")} · {slide.label}</span>
                    <a href={src} download={`contenido-${idea.id}-${slide.id}-${formato}.png`} style={{ color: "#0a0a0a", background: GOLD, fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: 8, textDecoration: "none" }}>
                      Descargar
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Otras ideas del mismo pilar (regenerar) */}
          {alternativas.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <div style={{ color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>
                Otra opción de este pilar
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {alternativas.map((a) => (
                  <a
                    key={a.id}
                    href={`?pieza=${a.id}&formato=${formato}`}
                    style={{ color: "#fff", background: "#141210", border: "1px solid rgba(179,152,91,0.28)", borderRadius: 10, padding: "10px 14px", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
                  >
                    {a.tituloGold} {a.tituloWhite}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Modo calendario: una tarjeta por semana ────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "40px 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <a href="/marketing/diseno" style={{ color: "#8a8578", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          ← Diseño
        </a>
        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginTop: 10 }}>
          Contenido informativo
        </h1>
        <p style={{ color: "#8a8578", fontSize: 15, marginTop: 8, marginBottom: 28 }}>
          Una pieza de valor por semana, ya desarrollada. {plan.length} semanas hasta el 31 de diciembre de 2026. Abre cada una para verla, cambiar formato o elegir otra opción del mismo pilar.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 22 }}>
          {plan.map((semana) => {
            const thumb = `/api/diseno/render?template=contenido-informativo&pieza=${semana.idea.id}&slide=gancho&formato=cuadrado`;
            return (
              <a
                key={semana.key}
                href={`?pieza=${semana.idea.id}&formato=story`}
                style={{ display: "flex", flexDirection: "column", gap: 10, textDecoration: "none" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb}
                  alt={`${semana.idea.tituloGold} ${semana.idea.tituloWhite}`}
                  style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 12, border: "1px solid rgba(179,152,91,0.22)", display: "block", background: "#141210" }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ color: "#8a8578", fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
                    Sem {semana.week} · {fechaCorta(semana.lunes)}
                  </span>
                  <span style={{ color: GOLD, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
                    {PILAR_LABEL[semana.idea.pilar]}
                  </span>
                  <span style={{ color: "#e8e2d6", fontSize: 13.5, fontWeight: 600, lineHeight: 1.25 }}>
                    {semana.idea.tituloGold} {semana.idea.tituloWhite}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
