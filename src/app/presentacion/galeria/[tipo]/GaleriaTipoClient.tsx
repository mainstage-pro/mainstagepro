"use client";
import { useEffect, useState } from "react";
import { Package, SlidersHorizontal, ArrowRight } from "lucide-react";
import PresentacionNav from "@/components/presentacion/PresentacionNav";
import { WA_URL, useDescubrimiento } from "@/components/presentacion/descubrimiento";
import { GOLD, Masonry, Reveal, WhatsAppIcon } from "@/components/presentacion/galeria-ui";
import {
  iconoPorSlug,
  familiaTipo,
  categoriasConRespaldo,
  type GaleriaCategoria as Categoria,
} from "@/lib/galeria-shared";

type Familia = "musical" | "social" | "empresarial";

const TIPO_EVENTO_MAP: Record<Familia, string> = { musical: "MUSICAL", social: "SOCIAL", empresarial: "EMPRESARIAL" };

// Copy por tipo de evento: kicker, encabezado y descripción que genera confianza,
// más los tres puntos de valor que resumen cómo trabajamos.
const CONFIG: Record<Familia, {
  kicker: string;
  titulo: string;
  lead: string;
  beneficios: { title: string; body: string }[];
}> = {
  musical: {
    kicker: "Eventos musicales",
    titulo: "Un poco de nuestros\neventos musicales.",
    lead: "Conciertos, festivales y shows en vivo donde el audio, la iluminación y el video trabajan a favor del artista. Esto es parte de lo que hemos montado —cada foto es producción real, montada y operada por nuestro equipo.",
    beneficios: [
      { title: "Sonido que llena el lugar", body: "Diseñamos el sistema para que el sonido llegue con la misma fuerza y claridad a cada rincón del venue." },
      { title: "Producción lista a tiempo", body: "Montamos y probamos con anticipación. Cuando arranca el show, cada cosa está en su lugar." },
      { title: "El show, acompañado", body: "Iluminación y video coordinados con cada momento del set, no perseguidos: llegan siempre juntos." },
    ],
  },
  social: {
    kicker: "Eventos sociales",
    titulo: "Un poco de nuestros\neventos sociales.",
    lead: "Bodas, XV años y celebraciones donde el sonido y la luz acompañan cada momento sin robar el protagonismo a los festejados. Esto es parte de lo que hemos producido —cada foto es un evento real que cuidamos de principio a fin.",
    beneficios: [
      { title: "Cada momento en su punto", body: "Ceremonia, brindis y pista: la producción sigue el programa que planeamos contigo desde antes." },
      { title: "Todo se escucha claro", body: "Micrófonos y audio cuidados por un técnico, para que cada palabra llegue a todas las mesas." },
      { title: "Presencia discreta", body: "Montamos con orden y nos hacemos a un lado. El protagonismo siempre es de los festejados." },
    ],
  },
  empresarial: {
    kicker: "Eventos empresariales",
    titulo: "Un poco de nuestros\neventos empresariales.",
    lead: "Conferencias, lanzamientos y corporativos donde cada mensaje se escucha claro y cada pantalla refuerza la imagen de tu marca. Esto es parte de lo que hemos producido —producción impecable, probada antes del primer invitado.",
    beneficios: [
      { title: "Probado antes del primer invitado", body: "Audio, video y presentaciones verificados con calma, sin ajustes sobre la marcha." },
      { title: "A la altura de tu marca", body: "Producción cuidada para que toda la atención esté en tu mensaje, no en la técnica." },
      { title: "Un solo responsable", body: "Nos integramos con tu equipo y coordinamos todo lo técnico desde un solo punto de contacto." },
    ],
  },
};

// ─── Main ────────────────────────────────────────────────────────────────────────
export default function GaleriaTipoClient({
  slug,
  initialCategorias,
}: {
  slug: Familia;
  initialCategorias?: Categoria[];
}) {
  const categorias = categoriasConRespaldo(initialCategorias ?? []);
  const actual = categorias.find(c => familiaTipo(c.id) === slug) ?? categorias[0];
  const otras = categorias.filter(c => familiaTipo(c.id) !== slug);
  const fotos = actual?.fotos ?? [];
  const c = CONFIG[slug];
  const { iniciar, loading } = useDescubrimiento();

  const heroFotos = fotos.slice(0, 6);
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    if (heroFotos.length < 2) return;
    const t = setInterval(() => setHeroIdx(i => (i + 1) % heroFotos.length), 5000);
    return () => clearInterval(t);
  }, [heroFotos.length]);

  return (
    <div className="text-white min-h-screen" style={{ backgroundColor: "#080808", fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <style>{`
        @keyframes kenBurns { from { transform: scale(1) translate(0,0); } to { transform: scale(1.07) translate(-1.2%,-0.6%); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #080808; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      <PresentacionNav />

      {/* ── Hero: encabezado + descripción que genera confianza ── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden py-24" style={{ minHeight: "72vh" }}>
        <div className="absolute inset-0">
          {heroFotos.map((s, i) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={s.src + i} src={s.src} alt="" draggable={false}
                 className="absolute inset-0 w-full h-full object-cover"
                 style={{
                   opacity: i === heroIdx ? 1 : 0,
                   transition: "opacity 1.4s ease",
                   animation: i === heroIdx ? "kenBurns 7s ease forwards" : undefined,
                 }} />
          ))}
          <div className="absolute inset-0"
               style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.55) 0%, rgba(8,8,8,0.72) 45%, rgba(8,8,8,0.92) 80%, #080808 100%)" }} />
        </div>
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <p className="text-[#B3985B] text-xs font-semibold tracking-[0.34em] uppercase mb-7"
             style={{ animation: "fadeUp 0.8s ease forwards 0.2s", opacity: 0 }}>
            {c.kicker}
          </p>
          <h1 className="font-bold text-white leading-[1.05]"
              style={{ fontSize: "clamp(2.2rem, 5.4vw, 4.2rem)", letterSpacing: "-0.03em", whiteSpace: "pre-line", animation: "fadeUp 0.95s ease forwards 0.4s", opacity: 0 }}>
            {c.titulo}
          </h1>
          <p className="text-white/55 mt-8 leading-relaxed max-w-xl mx-auto"
             style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.1rem)", animation: "fadeUp 0.95s ease forwards 0.65s", opacity: 0 }}>
            {c.lead}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
               style={{ animation: "fadeUp 0.95s ease forwards 0.85s", opacity: 0 }}>
            <button onClick={() => iniciar({ tipoEvento: TIPO_EVENTO_MAP[slug] })} disabled={loading}
                    className="px-9 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105 disabled:opacity-60"
                    style={{ background: GOLD }}>
              {loading ? "Abriendo…" : "Cotizar mi evento"}
            </button>
            <a href="#galeria" className="text-white/45 text-sm hover:text-white/75 transition-colors">Ver galería ↓</a>
          </div>
        </div>
      </section>

      {/* ── Galería ── */}
      <section id="galeria" className="py-20 sm:py-24 px-6" style={{ scrollMarginTop: "72px" }}>
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="mb-12">
              <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4">Galería</p>
              <h2 className="font-bold text-white leading-[1.05]" style={{ fontSize: "clamp(1.6rem, 3.4vw, 2.6rem)", letterSpacing: "-0.025em" }}>
                Lo que montamos, en fotos reales.
              </h2>
              <p className="text-white/30 text-xs mt-3">{fotos.length} fotos · click para ampliar</p>
            </div>
          </Reveal>
          <Masonry fotos={fotos} />
        </div>
      </section>

      {/* ── Por qué confiar (beneficios) ── */}
      <section className="py-20 px-6" style={{ backgroundColor: "#060606" }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4">Por qué confiar en nosotros</p>
            <h2 className="font-bold text-white leading-[1.05] mb-12" style={{ fontSize: "clamp(1.5rem, 3.2vw, 2.4rem)", letterSpacing: "-0.02em" }}>
              Cuidamos cada detalle.
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {c.beneficios.map((b, i) => (
              <Reveal key={b.title} delay={i * 80}>
                <div className="rounded-2xl p-7 h-full" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="font-mono mb-5" style={{ fontSize: "0.65rem", color: GOLD, letterSpacing: "0.12em" }}>{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="font-semibold text-white mb-3 leading-snug" style={{ fontSize: "clamp(1rem, 1.4vw, 1.1rem)" }}>{b.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{b.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Otras galerías ── */}
      {otras.length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <p className="text-white/20 text-xs uppercase tracking-widest mb-8 text-center">— Explora otras galerías —</p>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {otras.map((cat, i) => {
                const Icon = iconoPorSlug(cat.id);
                const href = `/presentacion/galeria/${familiaTipo(cat.id)}`;
                return (
                  <Reveal key={cat.id} delay={i * 90}>
                    <a href={href} className="relative overflow-hidden group block w-full"
                       style={{ height: "40vh", minHeight: "260px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.07)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cat.cover} alt={cat.label} draggable={false}
                           className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,6,6,0.9) 0%, rgba(6,6,6,0.4) 55%, rgba(6,6,6,0.2) 100%)" }} />
                      <div className="absolute inset-0 flex flex-col justify-end p-7">
                        <Icon strokeWidth={1.6} className="w-6 h-6 mb-3" style={{ color: GOLD }} />
                        <h3 className="font-bold text-white leading-tight mb-2" style={{ fontSize: "clamp(1.2rem, 2.2vw, 1.5rem)", letterSpacing: "-0.02em" }}>{cat.label}</h3>
                        <span className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: GOLD }}>
                          Ver galería <ArrowRight strokeWidth={2} className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </a>
                  </Reveal>
                );
              })}
            </div>

            {/* Inventario + servicios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {[
                { href: "/presentacion/inventario", icon: Package, label: "Inventario de equipo", desc: "El equipo con el que trabajamos, con precios de renta." },
                { href: "/presentacion/servicios", icon: SlidersHorizontal, label: "Servicios", desc: "Renta, producción y dirección técnica." },
              ].map((it, i) => (
                <Reveal key={it.href} delay={i * 90}>
                  <a href={it.href} className="group flex items-center gap-4 p-6 rounded-2xl h-full transition-colors"
                     style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-xl"
                          style={{ background: "rgba(179,152,91,0.12)", border: `1px solid ${GOLD}33` }}>
                      <it.icon strokeWidth={1.6} className="w-5 h-5" style={{ color: GOLD }} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-0.5 leading-snug text-sm">{it.label}</h3>
                      <p className="text-white/45 text-xs leading-relaxed">{it.desc}</p>
                    </div>
                    <ArrowRight strokeWidth={2} className="w-4 h-4 shrink-0 text-white/30 transition-all group-hover:text-white group-hover:translate-x-1" />
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA cierre ── */}
      <section className="py-24 px-6" style={{ backgroundColor: "#060606" }}>
        <div className="max-w-xl mx-auto text-center">
          <Reveal>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4">¿Te gustó lo que viste?</p>
            <h2 className="font-bold text-white mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>
              Producimos el tuyo.
            </h2>
            <p className="text-white/40 text-sm leading-relaxed mb-10">
              Cuéntanos de tu evento y te devolvemos una propuesta técnica en menos de 24 horas.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={() => iniciar({ tipoEvento: TIPO_EVENTO_MAP[slug] })} disabled={loading}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105 disabled:opacity-60"
                      style={{ background: GOLD }}>
                {loading ? "Abriendo…" : "Iniciar cotización"}
              </button>
              <a href={WA_URL} target="_blank" rel="noopener noreferrer"
                 className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full font-semibold text-white text-sm tracking-wide border border-white/15 hover:border-white/30 transition-all">
                <WhatsAppIcon /> WhatsApp
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-white/[0.04] text-center">
        <p className="text-white/18 text-xs tracking-wide">
          © {new Date().getFullYear()} Mainstage Pro · Producción audiovisual profesional
        </p>
      </footer>
    </div>
  );
}
