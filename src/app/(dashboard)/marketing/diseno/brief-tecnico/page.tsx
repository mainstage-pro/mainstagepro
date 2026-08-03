import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { prisma } from "@/lib/prisma";
import { SUPRATERRA, briefSlides } from "@/lib/diseno/brief-tecnico/data";
import { buildBriefStructure } from "@/lib/diseno/brief-tecnico/build";

export const dynamic = "force-dynamic";

const GOLD = "#B3985B";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fechaCorta = (d: Date) => `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

export default async function BriefTecnicoPreview({
  searchParams,
}: {
  searchParams: Promise<{ proyectoId?: string }>;
}) {
  // Módulo en fase privada: solo el dueño lo ve. Se "libera" quitando este guard
  // y el flag ownerOnly del nav.
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) notFound();

  const { proyectoId } = await searchParams;

  // Lista de eventos para el selector (más recientes primero).
  const proyectos = await prisma.proyecto.findMany({
    where: { estado: { not: "CANCELADO" } },
    select: {
      id: true,
      numeroProyecto: true,
      nombre: true,
      fechaEvento: true,
      cliente: { select: { empresa: true, nombre: true } },
    },
    orderBy: { fechaEvento: "desc" },
    take: 300,
  });

  const seleccionado = proyectoId ? proyectos.find((p) => p.id === proyectoId) : null;
  const qs = seleccionado ? `&proyectoId=${encodeURIComponent(seleccionado.id)}` : "";
  const tituloEvento = seleccionado
    ? `${seleccionado.nombre}`
    : "Muestra (Expo Supraterra)";

  // La lista de slides es DINÁMICA: los slides de equipo dependen de las
  // categorías reales del evento. Se arma la estructura (sin IA) para saber
  // cuántos slides pintar y con qué etiqueta.
  const data = seleccionado ? (await buildBriefStructure(seleccionado.id)) ?? SUPRATERRA : SUPRATERRA;
  const slides = briefSlides(data).map((s, i) => ({
    ...s,
    numero: `${String(i + 1).padStart(2, "0")} · ${s.label}`,
  }));

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "40px 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <a href="/marketing/diseno" style={{ color: "#8a8578", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          ← Diseño
        </a>
        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginTop: 10 }}>
          Brief Técnico — <span style={{ color: GOLD }}>{tituloEvento}</span>
        </h1>
        <p style={{ color: "#8a8578", fontSize: 15, marginTop: 8, marginBottom: 24 }}>
          Elige un evento y genera sus 5 stories con datos reales del proyecto. 1080×1920 · PNG.
        </p>

        {/* Selector de evento (form GET, sin JS) */}
        <form method="get" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 36, flexWrap: "wrap" }}>
          <select
            name="proyectoId"
            defaultValue={seleccionado?.id ?? ""}
            style={{
              background: "#141210",
              color: "#fff",
              border: "1px solid rgba(179,152,91,0.35)",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 14,
              minWidth: 360,
              maxWidth: "100%",
            }}
          >
            <option value="">— Muestra (Expo Supraterra) —</option>
            {proyectos.map((p) => {
              const cli = p.cliente?.empresa || p.cliente?.nombre || "";
              return (
                <option key={p.id} value={p.id}>
                  {p.numeroProyecto} · {p.nombre}{cli ? ` — ${cli}` : ""} · {fechaCorta(p.fechaEvento)}
                </option>
              );
            })}
          </select>
          <button
            type="submit"
            style={{
              color: "#0a0a0a",
              background: GOLD,
              fontSize: 14,
              fontWeight: 700,
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
            }}
          >
            Generar brief
          </button>
          {seleccionado && (
            <a href="/marketing/diseno/brief-tecnico" style={{ color: "#8a8578", fontSize: 13, textDecoration: "none" }}>
              Limpiar
            </a>
          )}
        </form>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 28 }}>
          {slides.map((story) => {
            const src = `/api/diseno/render?template=brief-tecnico&slide=${story.id}${qs}`;
            return (
              <div key={story.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <img
                  src={src}
                  alt={story.numero}
                  style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(179,152,91,0.25)", display: "block" }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#cfc7b6", fontSize: 14, fontWeight: 600 }}>{story.numero}</span>
                  <a
                    href={src}
                    download={`brief-${seleccionado?.numeroProyecto ?? "muestra"}-${story.id}.png`}
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
