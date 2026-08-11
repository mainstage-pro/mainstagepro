"use client";
import { useEffect, useMemo, useState } from "react";
import { Package, SlidersHorizontal, Sparkles, ArrowRight } from "lucide-react";
import PresentacionNav from "@/components/presentacion/PresentacionNav";
import { WA_URL } from "@/components/presentacion/descubrimiento";
import { GOLD, Masonry, Reveal, WhatsAppIcon } from "@/components/presentacion/galeria-ui";
import {
  categoriasConRespaldo,
  mezclarFotosCategorias,
  barajar,
  type GaleriaFoto as Foto,
  type GaleriaCategoria as Categoria,
} from "@/lib/galeria-shared";

// Galería única de eventos: mezcla las fotos de todos los tipos (musicales,
// sociales y empresariales) en un solo muro, sin agruparlas por categoría, para
// que el visitante vea de un vistazo todo el trabajo de Mainstage Pro.
export default function GaleriaHubClient({
  initialCategorias,
  initialHeroSlides,
}: {
  initialCategorias?: Categoria[];
  initialHeroSlides?: Foto[];
} = {}) {
  const categorias = categoriasConRespaldo(initialCategorias ?? []);

  // Orden estable para la primera pintura (SSR) y así no romper la hidratación;
  // al montar en el cliente se baraja para que cada visita se sienta distinta.
  const mezcladas = useMemo(() => mezclarFotosCategorias(categorias), [categorias]);
  const [fotos, setFotos] = useState<Foto[]>(mezcladas);
  useEffect(() => { setFotos(barajar(mezcladas)); }, [mezcladas]);

  const heroSlides: Foto[] = (initialHeroSlides?.length ?? 0) > 0
    ? initialHeroSlides!
    : mezcladas.slice(0, 6);

  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    if (heroSlides.length < 2) return;
    const t = setInterval(() => setHeroIdx(i => (i + 1) % heroSlides.length), 5000);
    return () => clearInterval(t);
  }, [heroSlides.length]);

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

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden" style={{ height: "70vh", minHeight: "460px" }}>
        <div className="absolute inset-0">
          {heroSlides.map((s, i) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={s.src + i} src={s.src} alt="" draggable={false}
                 className="absolute inset-0 w-full h-full object-cover"
                 style={{
                   opacity: i === heroIdx ? 1 : 0,
                   transition: "opacity 1.2s ease",
                   animation: i === heroIdx ? "kenBurns 6s ease forwards" : undefined,
                 }} />
          ))}
          <div className="absolute inset-0"
               style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.45) 0%, rgba(8,8,8,0.65) 45%, #080808 100%)" }} />
        </div>
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <p className="text-[#B3985B] text-xs font-medium tracking-[0.4em] uppercase mb-6"
             style={{ animation: "fadeUp 0.8s ease forwards 0.2s", opacity: 0 }}>
            Galería de eventos
          </p>
          <h1 className="font-bold text-white leading-tight"
              style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)", letterSpacing: "-0.03em", animation: "fadeUp 0.95s ease forwards 0.4s", opacity: 0 }}>
            Experiencias<br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>que creamos.</span>
          </h1>
          <p className="text-white/50 mt-7 text-sm sm:text-base leading-relaxed max-w-xl mx-auto"
             style={{ animation: "fadeUp 0.95s ease forwards 0.65s", opacity: 0 }}>
            Conciertos, bodas, lanzamientos y celebraciones, todo en un solo lugar: audio,
            iluminación y video que transforman cada evento en un momento que se recuerda.
          </p>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-20">
          <div className="w-px h-10 bg-gradient-to-b from-white/60 to-transparent mx-auto" />
        </div>
      </section>

      {/* ── Galería combinada ── */}
      <section className="py-16 sm:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="mb-12 text-center">
              <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4">Nuestro trabajo</p>
              <h2 className="font-bold text-white leading-[1.05] mx-auto max-w-2xl" style={{ fontSize: "clamp(1.6rem, 3.4vw, 2.6rem)", letterSpacing: "-0.025em" }}>
                Cada foto es producción real, montada y operada por nuestro equipo.
              </h2>
              {fotos.length > 0 && <p className="text-white/30 text-xs mt-4">{fotos.length} fotos · click para ampliar</p>}
            </div>
          </Reveal>
          <Masonry fotos={fotos} />
        </div>
      </section>

      {/* ── Explora más: inventario y servicios ── */}
      <section className="pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <p className="text-white/20 text-xs uppercase tracking-widest mb-6 text-center">— O conoce lo que ofrecemos —</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { href: "/presentacion#eventos", icon: Sparkles, label: "Eventos que realizamos", desc: "Musicales, sociales y empresariales. La producción que merece cada tipo de evento." },
              { href: "/presentacion/inventario", icon: Package, label: "Inventario de equipo", desc: "Audio, iluminación y video profesional. Catálogo completo con precios de renta." },
              { href: "/presentacion/servicios", icon: SlidersHorizontal, label: "Servicios", desc: "Renta, producción y dirección técnica. Cómo trabajamos y por qué elegirnos." },
            ].map((it, i) => (
              <Reveal key={it.href} delay={i * 90}>
                <a href={it.href}
                   className="group flex items-center gap-5 p-7 rounded-2xl h-full transition-colors"
                   style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl"
                        style={{ background: "rgba(179,152,91,0.12)", border: `1px solid ${GOLD}33` }}>
                    <it.icon strokeWidth={1.6} className="w-6 h-6" style={{ color: GOLD }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white mb-1 leading-snug">{it.label}</h3>
                    <p className="text-white/45 text-sm leading-relaxed">{it.desc}</p>
                  </div>
                  <ArrowRight strokeWidth={2} className="w-4 h-4 shrink-0 text-white/30 transition-all group-hover:text-white group-hover:translate-x-1" />
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6" style={{ backgroundColor: "#060606" }}>
        <div className="max-w-xl mx-auto text-center">
          <Reveal>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4">¿Listo para tu evento?</p>
            <h2 className="font-bold text-white mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>
              Cuéntanos qué tienes en mente.
            </h2>
            <p className="text-white/40 text-sm leading-relaxed mb-10">
              Dinos el tipo de evento, el venue y la fecha.<br />Propuesta técnica en menos de 24 horas.
            </p>
            <a href={WA_URL} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-3 px-10 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105 hover:opacity-90"
               style={{ background: GOLD }}>
              <WhatsAppIcon /> Hablar por WhatsApp
            </a>
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
