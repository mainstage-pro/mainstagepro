import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { STORY_ORDER } from "@/lib/diseno/brief-tecnico/data";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  portada: "01 · Portada",
  brief: "02 · Brief técnico",
  audio: "03 · Audio y microfonía",
  video: "04 · Video y pantalla",
  numeros: "05 · Los números del evento",
};

export default async function BriefTecnicoPreview() {
  // Módulo en fase privada: solo el dueño lo ve. Se "libera" quitando este guard
  // y el flag ownerOnly del nav.
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "40px 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>
          Brief Técnico — <span style={{ color: "#B3985B" }}>Expo Supraterra</span>
        </h1>
        <p style={{ color: "#8a8578", fontSize: 15, marginTop: 8, marginBottom: 36 }}>
          Prueba del módulo de diseño. 5 stories generadas con la directriz Mainstage. 1080×1920 · PNG.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 28 }}>
          {STORY_ORDER.map((story) => {
            const src = `/api/diseno/brief-tecnico?story=${story}`;
            return (
              <div key={story} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <img
                  src={src}
                  alt={LABELS[story]}
                  style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(179,152,91,0.25)", display: "block" }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#cfc7b6", fontSize: 14, fontWeight: 600 }}>{LABELS[story]}</span>
                  <a
                    href={`${src}&download=1`}
                    download={`brief-tecnico-${story}.png`}
                    style={{
                      color: "#0a0a0a",
                      background: "#B3985B",
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
