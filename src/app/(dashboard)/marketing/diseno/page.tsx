import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { CATEGORIAS, templatesPorCategoria, type DesignTemplateMeta } from "@/lib/diseno/registry";

export const dynamic = "force-dynamic";

const GOLD = "#B3985B";

function Card({ t }: { t: DesignTemplateMeta }) {
  const inner = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "20px 22px",
        borderRadius: 16,
        background: t.disponible ? "rgba(179,152,91,0.06)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${t.disponible ? "rgba(179,152,91,0.28)" : "rgba(255,255,255,0.07)"}`,
        opacity: t.disponible ? 1 : 0.62,
        height: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ color: "#fff", fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>{t.nombre}</span>
        <span
          style={{
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            padding: "3px 9px",
            borderRadius: 999,
            color: t.disponible ? "#0a0a0a" : "#9E9686",
            background: t.disponible ? GOLD : "rgba(255,255,255,0.06)",
          }}
        >
          {t.disponible ? "Activo" : "Próximamente"}
        </span>
      </div>
      <p style={{ color: "#b8b0a0", fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>{t.descripcion}</p>
      <div style={{ display: "flex", gap: 14, marginTop: 4, color: "#8a8578", fontSize: 12 }}>
        <span>{t.formato}</span>
        <span>·</span>
        <span>Datos: {t.fuente}</span>
      </div>
    </div>
  );

  if (t.disponible && t.href) {
    return (
      <Link href={t.href} style={{ textDecoration: "none" }}>
        {inner}
      </Link>
    );
  }
  return inner;
}

export default async function DisenoHub() {
  // Fase privada: solo el dueño. Se libera quitando este guard y el flag
  // ownerOnly del nav.
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "44px 36px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <h1 style={{ color: "#fff", fontSize: 30, fontWeight: 800, letterSpacing: -0.6, margin: 0 }}>
          Diseño
        </h1>
        <p style={{ color: "#8a8578", fontSize: 15, marginTop: 8, marginBottom: 40 }}>
          Generador de diseños Mainstage. Cada plantilla jala datos reales de la plataforma y arma las piezas con la directriz de marca.
        </p>

        {CATEGORIAS.map(({ key, label }) => {
          const items = templatesPorCategoria(key);
          if (items.length === 0) return null;
          return (
            <section key={key} style={{ marginBottom: 40 }}>
              <h2
                style={{
                  color: GOLD,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                {label}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
                {items.map((t) => (
                  <Card key={t.id} t={t} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
