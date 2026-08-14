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
      className="flex flex-col gap-2.5 rounded-xl px-5 py-4 h-full transition-colors"
      style={{
        background: t.disponible ? "rgba(179,152,91,0.06)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${t.disponible ? "rgba(179,152,91,0.28)" : "#1e1e1e"}`,
        opacity: t.disponible ? 1 : 0.62,
      }}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-[16px] font-bold text-white tracking-tight">{t.nombre}</span>
        <span
          className="shrink-0 text-[11px] font-bold tracking-wide uppercase px-2 py-[3px] rounded-full"
          style={{
            color: t.disponible ? "#0a0a0a" : "#9E9686",
            background: t.disponible ? GOLD : "rgba(255,255,255,0.06)",
          }}
        >
          {t.disponible ? "Activo" : "Próximamente"}
        </span>
      </div>
      <p className="text-[13.5px] leading-relaxed m-0" style={{ color: "#b8b0a0" }}>
        {t.descripcion}
      </p>
      <div className="flex gap-3.5 mt-1 text-[12px]" style={{ color: "#8a8578" }}>
        <span>{t.formato}</span>
        <span>·</span>
        <span>Datos: {t.fuente}</span>
      </div>
    </div>
  );

  if (t.disponible && t.href) {
    return (
      <Link href={t.href} className="no-underline">
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
    <div className="ms-page">
      <div className="mb-5">
        <h1 className="ms-h1">Diseño</h1>
        <p className="ms-subtitle mt-1.5 max-w-3xl">
          Generador de diseños Mainstage. Cada plantilla jala datos reales de la plataforma y arma las piezas con la
          directriz de marca.
        </p>
      </div>

      <Link
        href="/marketing/diseno/brandbook"
        className="flex items-center justify-between gap-4 rounded-xl px-5 py-4 mb-9 no-underline"
        style={{ background: "rgba(179,152,91,0.10)", border: `1px solid ${GOLD}` }}
      >
        <span className="flex flex-col gap-1">
          <span className="text-[16px] font-bold text-white tracking-tight">Directriz de marca</span>
          <span className="text-[13px]" style={{ color: "#b8b0a0" }}>
            La base exacta de toda pieza: color, tipografía y reglas. Vive en tokens.ts y se descarga el brandbook.
          </span>
        </span>
        <span className="shrink-0 text-[22px] font-bold" style={{ color: GOLD }}>
          →
        </span>
      </Link>

      {CATEGORIAS.map(({ key, label }) => {
        const items = templatesPorCategoria(key);
        if (items.length === 0) return null;
        return (
          <section key={key} className="mb-9">
            <h2 className="ms-section-label mb-4">{label}</h2>
            <div className="grid gap-4.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
              {items.map((t) => (
                <Card key={t.id} t={t} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
