import Link from "next/link";
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
  siguienteEnPilar,
} from "@/lib/diseno/contenido/data";
import { poolIdeas } from "@/lib/diseno/contenido/inventario";
import { seleccionesDe, seleccionSemana } from "@/lib/diseno/contenido/seleccion";
import { aprobarAction } from "./actions";

export const dynamic = "force-dynamic";

const GOLD = "#B3985B";
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fechaCorta = (d: Date) => `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;

// Horizonte del plan: de hoy hasta el 31 de diciembre de 2026.
const HASTA = new Date(Date.UTC(2026, 11, 31));

const FORMATOS_LIST: FormatoId[] = ["story", "post", "cuadrado"];

export default async function ContenidoInformativo({
  searchParams,
}: {
  searchParams: Promise<{ pieza?: string; formato?: string; semana?: string }>;
}) {
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) notFound();

  const { pieza, formato: formatoParam, semana } = await searchParams;
  const formato: FormatoId = FORMATOS_LIST.includes(formatoParam as FormatoId)
    ? (formatoParam as FormatoId)
    : "story";

  // Pool = ideas curadas + inventario real (pilar "equipo" dinámico).
  const pool = await poolIdeas();

  // ── Modo detalle: una pieza (3 slides) ─────────────────────────────────────
  const idea = getIdea(pieza, pool);
  if (idea) {
    const fmt = FORMATOS[formato];
    const aspect = `${fmt.w} / ${fmt.h}`;
    const alternativas = alternativasEnPilar(idea.pilar, idea.id, pool);
    const semQ = semana ? `&semana=${semana}` : "";
    const seleccion = semana ? await seleccionSemana(semana) : null;
    const aprobadaEsta = seleccion?.estado === "APROBADO" && seleccion.ideaId === idea.id;
    const guardadoEsta = seleccion && seleccion.ideaId === idea.id ? seleccion : null;
    const siguiente = siguienteEnPilar(idea.pilar, idea.id, pool);

    const slideSrc = (slideId: string) =>
      guardadoEsta
        ? `/api/diseno/render?disenoId=${guardadoEsta.id}&slide=${slideId}&formato=${formato}`
        : `/api/diseno/render?template=contenido-informativo&pieza=${idea.id}&slide=${slideId}&formato=${formato}`;

    return (
      <div className="ms-page-form">
        <Link href="/marketing/diseno/contenido-informativo" className="ms-subtitle hover:text-white transition-colors">
          ← Calendario
        </Link>

        <div className="mt-3">
          <div className="ms-section-label">{PILAR_LABEL[idea.pilar]}</div>
          <h1 className="ms-h1 mt-1">
            {idea.tituloGold} <span style={{ color: GOLD }}>{idea.tituloWhite}</span>
          </h1>
          <p className="ms-subtitle mt-2 max-w-2xl">{idea.gancho}</p>
        </div>

        {/* Criterio: aclara que el pilar es el tipo de contenido, no la disciplina */}
        <div className="ms-card-deep mt-4 px-4 py-3 max-w-2xl">
          <p className="text-[12.5px] text-[#a8a294] leading-relaxed">
            <span className="text-[#cfc7b6] font-semibold">Criterio de esta ranura: {PILAR_LABEL[idea.pilar]}.</span>{" "}
            El calendario se organiza por <span className="text-white">tipo de contenido</span> (tip, error, FAQ, equipo…),
            no por disciplina. Al <span className="text-white">regenerar</span> obtienes otra pieza del mismo tipo —puede
            tocar audio, luz o video— pero siempre dentro de este pilar.
          </p>
        </div>

        {/* Barra de decisión: aprobar (un botón) o regenerar otra opción del pilar */}
        {semana && (
          <div
            className="mt-6 flex items-center gap-3 flex-wrap rounded-xl px-4 py-3.5"
            style={{
              background: aprobadaEsta ? "rgba(60,110,60,0.14)" : "#111",
              border: `1px solid ${aprobadaEsta ? "rgba(120,190,120,0.4)" : "#1e1e1e"}`,
            }}
          >
            <span className="text-[13.5px] font-medium flex-1 min-w-[220px]" style={{ color: "#cfc7b6" }}>
              {aprobadaEsta
                ? "✓ Aprobada para esta semana. Puedes cambiarla cuando quieras."
                : "¿Te gusta esta pieza para la semana? Apruébala o genera otra opción del mismo pilar."}
            </span>
            <Link
              href={`/marketing/diseno/contenido-informativo/editor?semana=${semana}&pieza=${idea.id}`}
              className="ms-btn-secondary"
            >
              Editar contenido y fotos
            </Link>
            <Link href={`?pieza=${siguiente.id}&formato=${formato}${semQ}`} className="ms-btn-secondary">
              ↻ Regenerar otra opción
            </Link>
            <form action={aprobarAction} className="m-0">
              <input type="hidden" name="pieza" value={idea.id} />
              <input type="hidden" name="semana" value={semana} />
              <button type="submit" className="ms-btn-primary">
                {aprobadaEsta ? "Volver a aprobar" : "Aprobar esta pieza"}
              </button>
            </form>
          </div>
        )}

        {/* Selector de formato */}
        <div className="mt-7 flex gap-2.5 flex-wrap">
          {FORMATOS_LIST.map((k) => {
            const activo = k === formato;
            return (
              <Link
                key={k}
                href={`?pieza=${idea.id}&formato=${k}${semQ}`}
                className={activo ? "ms-tab-active" : "ms-tab border border-[#1e1e1e]"}
              >
                {FORMATOS[k].label}
              </Link>
            );
          })}
        </div>

        {/* Los 3 slides */}
        <div className="mt-6 grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {contenidoSlides().map((slide, i) => {
            const src = slideSrc(slide.id);
            return (
              <div key={slide.id} className="flex flex-col gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={slide.label}
                  className="w-full rounded-xl border border-[#1e1e1e] block bg-[#111]"
                  style={{ aspectRatio: aspect, objectFit: "cover" }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium" style={{ color: "#cfc7b6" }}>
                    {String(i + 1).padStart(2, "0")} · {slide.label}
                  </span>
                  <a href={src} download={`contenido-${idea.id}-${slide.id}-${formato}.png`} className="ms-btn-ghost">
                    Descargar
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Otras ideas del mismo pilar (regenerar) */}
        {alternativas.length > 0 && (
          <div className="mt-10">
            <div className="ms-section-label mb-3.5">Otra opción de este pilar</div>
            <div className="flex flex-wrap gap-2.5">
              {alternativas.slice(0, 12).map((a) => (
                <Link
                  key={a.id}
                  href={`?pieza=${a.id}&formato=${formato}${semQ}`}
                  className="ms-card px-3.5 py-2.5 text-[13px] font-medium text-white hover:border-[#2a2a2a] transition-colors"
                >
                  {a.tituloGold} {a.tituloWhite}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Modo calendario: una tarjeta por semana ────────────────────────────────
  const plan = planSemanal(new Date(), HASTA, pool);
  const selecciones = await seleccionesDe(plan.map((s) => s.key));
  const aprobadas = [...selecciones.values()].filter((s) => s.estado === "APROBADO").length;

  return (
    <div className="ms-page">
      <Link href="/marketing/diseno" className="ms-subtitle hover:text-white transition-colors">
        ← Diseño
      </Link>
      <div className="mt-3 mb-6">
        <h1 className="ms-h1">Contenido informativo</h1>
        <p className="ms-subtitle mt-1.5 max-w-3xl">
          Una pieza de valor por semana, ya desarrollada, organizada por{" "}
          <span className="text-[#cfc7b6]">pilar de contenido</span>. {plan.length} semanas hasta el 31 de diciembre de 2026
          {aprobadas > 0 ? ` · ${aprobadas} aprobada${aprobadas === 1 ? "" : "s"}` : ""}. Abre cada una para verla, cambiar
          formato, editar textos y fotos, elegir otra opción del mismo pilar o aprobarla con un botón.
        </p>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
        {plan.map((semana) => {
          const sel = selecciones.get(semana.key);
          const ideaSem = (sel && getIdea(sel.ideaId, pool)) || semana.idea;
          const aprobada = sel?.estado === "APROBADO";
          const editado = sel?.editado ?? false;
          const thumb = sel
            ? `/api/diseno/render?disenoId=${sel.id}&slide=gancho&formato=cuadrado`
            : `/api/diseno/render?template=contenido-informativo&pieza=${ideaSem.id}&slide=gancho&formato=cuadrado`;
          return (
            <Link
              key={semana.key}
              href={`?pieza=${ideaSem.id}&formato=story&semana=${semana.key}`}
              className="flex flex-col gap-2.5 no-underline group"
            >
              <div className="relative flex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb}
                  alt={`${ideaSem.tituloGold} ${ideaSem.tituloWhite}`}
                  className="w-full rounded-xl block bg-[#111] transition-colors"
                  style={{
                    aspectRatio: "1 / 1",
                    objectFit: "cover",
                    border: `1px solid ${aprobada ? "rgba(120,190,120,0.55)" : "#1e1e1e"}`,
                  }}
                />
                {(aprobada || editado) && (
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    {aprobada && (
                      <span className="text-[10.5px] font-extrabold tracking-wide px-2 py-[3px] rounded-full" style={{ color: "#0a0a0a", background: "#7cc47c" }}>
                        ✓ APROBADA
                      </span>
                    )}
                    {editado && (
                      <span className="text-[10.5px] font-extrabold tracking-wide px-2 py-[3px] rounded-full" style={{ color: "#0a0a0a", background: GOLD }}>
                        EDITADA
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold tracking-wide" style={{ color: "#8a8578" }}>
                  Sem {semana.week} · {fechaCorta(semana.lunes)}
                </span>
                <span className="text-[10.5px] font-bold tracking-wide uppercase" style={{ color: GOLD }}>
                  {PILAR_LABEL[ideaSem.pilar]}
                </span>
                <span className="text-[13.5px] font-medium leading-tight" style={{ color: "#e8e2d6" }}>
                  {ideaSem.tituloGold} {ideaSem.tituloWhite}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
