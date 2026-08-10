"use client";
import { useEffect, useState } from "react";
import PresentacionNav from "@/components/presentacion/PresentacionNav";
import { usePresentacionEdit, EditableImage } from "@/components/presentacion/editable";
import { R, GOLD } from "@/components/presentacion/anim";
import { waLink, WA_URL } from "@/components/presentacion/descubrimiento";
import {
  BENEFICIOS,
  SERVICIOS_COMPACT,
  FAQ,
  CONTACTO,
  type PerfilPresentacion,
} from "@/lib/presentacion-perfiles";

type Foto = { url: string; caption: string };

const EVENTOS = [
  { slug: "musical", label: "Musicales", desc: "Conciertos, festivales y DJ sets." },
  { slug: "social", label: "Sociales", desc: "Bodas, XV años y fiestas privadas." },
  { slug: "empresarial", label: "Empresariales", desc: "Conferencias, lanzamientos y corporativos." },
] as const;

// Carga la galería viva del tipo de evento (misma que ven las otras presentaciones),
// con fallback a las imágenes locales de la categoría.
function useGaleria(eventoSlug: string, fallback: Foto[]) {
  const [fotos, setFotos] = useState<Foto[]>(fallback);
  useEffect(() => {
    let ok = true;
    fetch(`/api/tipos-evento/${eventoSlug}/publico`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ok || !d?.tipo?.fotos?.length) return;
        setFotos(
          (d.tipo.fotos as { url: string; caption: string | null }[]).map((f) => ({
            url: f.url,
            caption: f.caption || "",
          })),
        );
      })
      .catch(() => {});
    return () => { ok = false; };
  }, [eventoSlug]);
  return fotos;
}

const KICKER = "text-[11px] sm:text-xs font-semibold tracking-[0.22em] uppercase";

export default function PerfilClient({ p }: { p: PerfilPresentacion }) {
  const edit = usePresentacionEdit();
  const fotos = useGaleria(p.cat.eventoSlug, p.cat.gallery.map((g) => ({ url: g.src, caption: g.caption })));
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const waContacto = waLink(p.copy.contacto);

  return (
    <main className="bg-[#080808] text-white overflow-x-hidden">
      <PresentacionNav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-end">
        <EditableImage
          edit={edit}
          okey={`perfil.${p.slug}.hero`}
          fallback={p.cat.heroFallback}
          alt={p.label}
          wrapClassName="absolute inset-0"
          imgClassName="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #080808 4%, rgba(8,8,8,0.55) 45%, rgba(8,8,8,0.35) 100%)" }} />
        <div className="relative z-10 max-w-7xl mx-auto w-full px-5 sm:px-8 pb-16 sm:pb-24">
          <R>
            <p className={KICKER} style={{ color: GOLD }}>{p.copy.kicker}</p>
            <h1 className="mt-4 font-semibold leading-[1.04] whitespace-pre-line" style={{ fontSize: "clamp(2.5rem,7vw,5.2rem)" }}>
              {p.copy.headline}
            </h1>
            <p className="mt-5 text-white/70 max-w-2xl" style={{ fontSize: "clamp(1rem,2.2vw,1.35rem)" }}>
              {p.copy.sub}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={waContacto} target="_blank" rel="noopener noreferrer"
                className="px-7 py-3.5 rounded-full font-semibold text-sm tracking-wide transition-transform hover:scale-[1.03]"
                style={{ background: GOLD, color: "#000" }}>
                Hablar con nosotros
              </a>
              <a href="#trabajo"
                className="px-7 py-3.5 rounded-full font-semibold text-sm tracking-wide text-white border border-white/20 hover:border-white/45 transition-colors">
                Ver nuestro trabajo
              </a>
            </div>
          </R>
        </div>
      </section>

      {/* ── Quiénes somos + servicios ────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <R>
          <p className={KICKER} style={{ color: GOLD }}>Quiénes somos</p>
          <p className="mt-5 font-medium leading-snug max-w-4xl" style={{ fontSize: "clamp(1.4rem,3.4vw,2.4rem)" }}>
            En Mainstage Pro producimos <span style={{ color: GOLD }}>audio, iluminación y video</span> para eventos. Llevamos el equipo, la gente que lo opera y la coordinación, para que todo se vea y se escuche impecable sin que tú te preocupes por lo técnico.
          </p>
        </R>
        <div className="mt-14 grid sm:grid-cols-3 gap-6">
          {SERVICIOS_COMPACT.map((s, i) => (
            <R key={s.slug} delay={i * 80}>
              <a href={`/presentacion/servicio/${s.slug}`} className="group block h-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 hover:border-[#B3985B]/40 transition-colors">
                <span className="text-xs font-bold tabular-nums" style={{ color: GOLD }}>{s.n}</span>
                <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">{s.linea}</p>
                <span className="mt-4 inline-block text-[13px] font-medium text-white/40 group-hover:text-[#B3985B] transition-colors">Ver más →</span>
              </a>
            </R>
          ))}
        </div>
      </section>

      {/* ── Problemas que resolvemos ─────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <R>
            <p className={KICKER} style={{ color: GOLD }}>Lo que resolvemos</p>
            <h2 className="mt-4 font-semibold leading-tight" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)" }}>
              Los dolores de cabeza, resueltos.
            </h2>
          </R>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {p.copy.problemas.map((pr, i) => (
              <R key={i} delay={i * 90}>
                <div className="h-full rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-7">
                  <p className="text-[15px] font-semibold text-white/85">{pr.t}</p>
                  <div className="my-4 h-px w-10" style={{ background: GOLD }} />
                  <p className="text-sm text-white/55 leading-relaxed">{pr.b}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Beneficios / por qué con nosotros ────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <R>
          <p className={KICKER} style={{ color: GOLD }}>Por qué Mainstage Pro</p>
          <h2 className="mt-4 font-semibold leading-tight" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)" }}>
            La tranquilidad de que todo va a salir bien.
          </h2>
        </R>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {BENEFICIOS.map((b, i) => (
            <R key={i} delay={i * 70}>
              <div className="h-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
                <h3 className="text-base font-semibold" style={{ color: GOLD }}>{b.t}</h3>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">{b.b}</p>
              </div>
            </R>
          ))}
        </div>
      </section>

      {/* ── Nuestro trabajo (galería) ────────────────────────────────────── */}
      <section id="trabajo" className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <R>
            <p className={KICKER} style={{ color: GOLD }}>Nuestro trabajo</p>
            <h2 className="mt-4 font-semibold leading-tight" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)" }}>
              Míralo por ti mismo.
            </h2>
          </R>
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {fotos.slice(0, 9).map((f, i) => (
              <R key={f.url + i} delay={(i % 3) * 60} className={i === 0 ? "col-span-2 lg:col-span-2 lg:row-span-2" : ""}>
                <div className="group relative overflow-hidden rounded-xl bg-white/[0.03] h-full min-h-[160px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={f.caption || p.label} loading="lazy" draggable={false}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  {f.caption && (
                    <span className="absolute bottom-0 inset-x-0 p-3 text-[11px] text-white/80 bg-gradient-to-t from-black/70 to-transparent">{f.caption}</span>
                  )}
                </div>
              </R>
            ))}
          </div>
          <div className="mt-8">
            <a href="/presentacion/galeria" className="text-sm font-medium text-white/50 hover:text-[#B3985B] transition-colors">Ver galería completa →</a>
          </div>
        </div>
      </section>

      {/* ── Otros tipos de eventos ───────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] bg-white/[0.015]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <R>
            <p className={KICKER} style={{ color: GOLD }}>También hacemos</p>
            <h2 className="mt-4 font-semibold leading-tight" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)" }}>
              Producimos todo tipo de eventos.
            </h2>
          </R>
          <div className="mt-12 grid sm:grid-cols-3 gap-6">
            {EVENTOS.map((e, i) => {
              const actual = e.slug === p.cat.eventoSlug;
              return (
                <R key={e.slug} delay={i * 70}>
                  <a href={`/presentacion/evento/${e.slug}`}
                    className="group block h-full rounded-2xl border p-7 transition-colors"
                    style={{ borderColor: actual ? `${GOLD}55` : "rgba(255,255,255,0.08)", background: actual ? "rgba(179,152,91,0.06)" : "rgba(255,255,255,0.02)" }}>
                    {actual && <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>Tu categoría</span>}
                    <h3 className="mt-1 text-xl font-semibold">{e.label}</h3>
                    <p className="mt-2 text-sm text-white/55 leading-relaxed">{e.desc}</p>
                    <span className="mt-4 inline-block text-[13px] font-medium text-white/40 group-hover:text-[#B3985B] transition-colors">Ver presentación →</span>
                  </a>
                </R>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Inventario + Paquetes ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28 grid md:grid-cols-2 gap-6">
        <R>
          <a href="/presentacion/inventario" className="group block h-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 hover:border-[#B3985B]/40 transition-colors">
            <p className={KICKER} style={{ color: GOLD }}>Inventario</p>
            <h3 className="mt-3 text-2xl font-semibold">Todo nuestro equipo, a la vista.</h3>
            <p className="mt-3 text-sm text-white/55 leading-relaxed">Audio, iluminación, video, DJ y escenarios. Explora el catálogo completo con precios y arma tu cotización.</p>
            <span className="mt-5 inline-block text-[13px] font-medium text-white/40 group-hover:text-[#B3985B] transition-colors">Ver inventario →</span>
          </a>
        </R>
        <R delay={90}>
          <div className="h-full rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015] p-8">
            <div className="flex items-center gap-3">
              <p className={KICKER} style={{ color: GOLD }}>Paquetes</p>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full text-white/50 border border-white/15">Próximamente</span>
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-white/80">Paquetes armados por tipo de evento.</h3>
            <p className="mt-3 text-sm text-white/45 leading-relaxed">Estamos preparando paquetes listos para cotizar, pensados para {p.cat.eventoLabel.toLowerCase()}. Mientras tanto, cuéntanos tu evento y te armamos una propuesta a la medida.</p>
          </div>
        </R>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] bg-white/[0.015]">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <R>
            <p className={KICKER} style={{ color: GOLD }}>Preguntas frecuentes</p>
            <h2 className="mt-4 font-semibold leading-tight" style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>
              Aclaremos lo importante.
            </h2>
          </R>
          <div className="mt-10 divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {FAQ.map((f, i) => {
              const open = faqOpen === i;
              return (
                <div key={i}>
                  <button type="button" onClick={() => setFaqOpen(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left">
                    <span className="text-[15px] sm:text-base font-medium text-white/85">{f.q}</span>
                    <span className="shrink-0 text-xl leading-none transition-transform" style={{ color: GOLD, transform: open ? "rotate(45deg)" : "none" }}>+</span>
                  </button>
                  <div className="grid transition-all duration-300" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
                    <div className="overflow-hidden">
                      <p className="pb-5 text-sm text-white/55 leading-relaxed">{f.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Contacto directo ─────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
        <R>
          <p className={KICKER} style={{ color: GOLD }}>Hablemos</p>
          <h2 className="mt-4 font-semibold leading-[1.1]" style={{ fontSize: "clamp(2rem,5vw,3.4rem)" }}>
            Cuéntanos de tu evento.
          </h2>
          <p className="mt-5 text-white/60 max-w-xl mx-auto" style={{ fontSize: "clamp(1rem,2vw,1.2rem)" }}>
            Escríbenos directo por WhatsApp. Del otro lado te contesta una persona, no un formulario, y te ayudamos a resolver lo que necesites.
          </p>
          <div className="mt-9 flex flex-col items-center gap-4">
            <a href={waContacto} target="_blank" rel="noopener noreferrer"
              className="px-9 py-4 rounded-full font-semibold text-sm tracking-wide transition-transform hover:scale-[1.03]"
              style={{ background: GOLD, color: "#000" }}>
              Iniciar conversación por WhatsApp
            </a>
            <div className="text-sm text-white/45">
              <span className="text-white/70 font-medium">{CONTACTO.nombre}</span> · {CONTACTO.rol}
            </div>
          </div>
        </R>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-6 object-contain opacity-80" draggable={false} />
          <div className="flex items-center gap-6 text-sm text-white/45">
            <a href="/presentacion" className="hover:text-white transition-colors">Conócenos</a>
            <a href="/presentacion/inventario" className="hover:text-white transition-colors">Inventario</a>
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
