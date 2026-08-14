import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { getTemplate } from "@/lib/diseno/registry";
import { getRenderer } from "@/lib/diseno/renderers";
import { FORMATOS, getFormato, type FormatoId } from "@/lib/diseno/formatos";

export const dynamic = "force-dynamic";

const GOLD = "#B3985B";

const FORMATO_OPCIONES: { key: FormatoId; label: string }[] = [
  { key: "story", label: "Story · 9:16" },
  { key: "post", label: "Post · 4:5" },
  { key: "cuadrado", label: "Cuadrado · 1:1" },
];

// Preview genérico de cualquier plantilla de catálogo (Servicios, Tipos de evento,
// Inventario…). El brief-tecnico tiene su propia página (carpeta estática que gana
// precedencia sobre este segmento dinámico).
export default async function TemplatePreview({
  params,
  searchParams,
}: {
  params: Promise<{ template: string }>;
  searchParams: Promise<{ formato?: string }>;
}) {
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) notFound();

  const { template } = await params;
  const { formato: formatoParam } = await searchParams;

  const meta = getTemplate(template);
  const renderer = getRenderer(template);
  if (!meta || !renderer || !meta.disponible) notFound();

  const formato: FormatoId = (["story", "post", "cuadrado"] as const).includes(formatoParam as FormatoId)
    ? (formatoParam as FormatoId)
    : "story";
  const fmt = getFormato(formato);

  const data = await renderer.buildData({ proyectoId: null });
  const slides = renderer.slides(data).map((s, i) => ({
    ...s,
    numero: `${String(i + 1).padStart(2, "0")} · ${s.label}`,
  }));

  const aspect = `${fmt.w} / ${fmt.h}`;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "40px 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <a href="/marketing/diseno" style={{ color: "#8a8578", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          ← Diseño
        </a>
        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginTop: 10 }}>
          {meta.nombre}
        </h1>
        <p style={{ color: "#8a8578", fontSize: 15, marginTop: 8, marginBottom: 24 }}>
          {meta.descripcion} Datos: {meta.fuente}.
        </p>

        {/* Selector de formato (links GET, sin JS) */}
        <div style={{ display: "flex", gap: 10, marginBottom: 36, flexWrap: "wrap" }}>
          {FORMATO_OPCIONES.map((o) => {
            const activo = o.key === formato;
            const f = FORMATOS[o.key];
            return (
              <a
                key={o.key}
                href={`?formato=${o.key}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  padding: "9px 18px",
                  borderRadius: 10,
                  textDecoration: "none",
                  background: activo ? GOLD : "transparent",
                  border: `1px solid ${activo ? GOLD : "rgba(179,152,91,0.35)"}`,
                }}
              >
                <span style={{ color: activo ? "#0a0a0a" : "#fff", fontSize: 14, fontWeight: 700 }}>{o.label}</span>
                <span style={{ color: activo ? "rgba(10,10,10,0.7)" : "#8a8578", fontSize: 11 }}>
                  {f.w}×{f.h}
                </span>
              </a>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 28 }}>
          {slides.map((slide) => {
            const src = `/api/diseno/render?template=${meta.id}&slide=${slide.id}&formato=${formato}`;
            return (
              <div key={slide.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={slide.numero}
                  style={{
                    width: "100%",
                    aspectRatio: aspect,
                    objectFit: "cover",
                    borderRadius: 14,
                    border: "1px solid rgba(179,152,91,0.25)",
                    display: "block",
                    background: "#141210",
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#cfc7b6", fontSize: 14, fontWeight: 600 }}>{slide.numero}</span>
                  <a
                    href={src}
                    download={`${meta.id}-${slide.id}-${formato}.png`}
                    style={{
                      color: "#0a0a0a",
                      background: GOLD,
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "6px 14px",
                      borderRadius: 8,
                      textDecoration: "none",
                    }}
                  >
                    Descargar
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
