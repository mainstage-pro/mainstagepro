"use client";
import { useEffect, useState } from "react";
import { Boxes, SlidersHorizontal, Compass, type LucideIcon } from "lucide-react";
import type { Proyecto } from "@/lib/proyectos";
import { SERVICIOS_DETALLE } from "@/lib/presentacion-servicios";
import PresentacionNav from "@/components/presentacion/PresentacionNav";
import { R, StatCount, GOLD } from "@/components/presentacion/anim";
import { WA_URL, useDescubrimiento } from "@/components/presentacion/descubrimiento";
import { usePresentacionEdit, EditableImage, EditableFigure } from "@/components/presentacion/editable";

// Icono representativo de cada servicio (equipo · operación · coordinación).
const SERVICE_ICONS: Record<string, LucideIcon> = {
  RENTA: Boxes,
  PRODUCCION_TECNICA: SlidersHorizontal,
  DIRECCION_TECNICA: Compass,
};

const HERO_SLIDES = [
  { src: "/images/presentacion/musicales/Musicales-016.jpg", label: "Musicales" },
  { src: "/images/presentacion/sociales/s-hacienda-iluminada.jpg", label: "Sociales" },
  { src: "/images/presentacion/empresariales/e-sala-pantallas.jpg", label: "Empresariales" },
];

const EVENTOS = [
  { title: "Eventos musicales", sub: "Conciertos · Festivales · DJ Sets · Showcases", img: "/images/presentacion/musicales/Musicales-016.jpg", href: "/presentacion/evento/musical", para: "Promotores · Artistas" },
  { title: "Eventos sociales", sub: "Bodas · XV Años · Fiestas privadas", img: "/images/presentacion/sociales/s-hacienda-iluminada.jpg", href: "/presentacion/evento/social", para: "Parejas · Familias" },
  { title: "Eventos empresariales", sub: "Conferencias · Lanzamientos · Corporativos", img: "/images/presentacion/empresariales/e-sala-pantallas.jpg", href: "/presentacion/evento/empresarial", para: "Empresas · Agencias" },
];

const TIPO_LABEL: Record<string, string> = { MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial" };

function useProyectos() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  useEffect(() => {
    let ok = true;
    fetch("/api/proyectos/publico")
      .then((r) => r.json())
      .then((d) => { if (ok && Array.isArray(d?.proyectos)) setProyectos(d.proyectos); })
      .catch(() => {});
    return () => { ok = false; };
  }, []);
  return proyectos;
}

export default function PresentacionHomeClient() {
  const [heroIdx, setHeroIdx] = useState(0);
  const proyectos = useProyectos();
  const { iniciar, loading } = useDescubrimiento();
  const edit = usePresentacionEdit();

  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-[#080808] text-white min-h-screen" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        html { scroll-behavior: smooth; scroll-padding-top: 72px; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      <PresentacionNav />

      {/* ── Hero ── */}
      <section className="relative min-h-[82vh] flex flex-col items-center justify-center overflow-hidden py-24">
        {HERO_SLIDES.map((slide, i) => (
          <EditableImage
            key={slide.src}
            edit={edit}
            okey={`home.hero.${i}`}
            fallback={slide.src}
            alt={slide.label}
            showEditButton={i === heroIdx}
            wrapClassName="absolute inset-0"
            wrapStyle={{ zIndex: i === heroIdx ? 1 : 0 }}
            imgClassName="w-full h-full object-cover"
            imgStyle={{
              opacity: i === heroIdx ? 1 : 0,
              transform: i === heroIdx ? "scale(1.04)" : "scale(1)",
              transition: "opacity 1.4s ease-in-out, transform 8s ease-out",
            }}
          />
        ))}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.3) 0%, rgba(8,8,8,0.5) 40%, rgba(8,8,8,0.85) 82%, #080808 100%)" }} />

        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setHeroIdx(i)}
              className="px-3 py-1 rounded-full text-[10px] tracking-widest uppercase transition-all duration-500"
              style={{
                background: i === heroIdx ? `${GOLD}25` : "transparent",
                border: `1px solid ${i === heroIdx ? GOLD : "rgba(255,255,255,0.15)"}`,
                color: i === heroIdx ? GOLD : "rgba(255,255,255,0.4)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative z-20 text-center px-6 max-w-4xl mx-auto">
          <p className="text-[#B3985B] text-sm font-semibold tracking-[0.24em] uppercase mb-6" style={{ animation: "fadeUp 0.8s ease forwards 0.2s", opacity: 0 }}>
            Mainstage Pro · Experiencias que generan impacto
          </p>
          <h1 className="font-bold text-white leading-[1.03]" style={{ fontSize: "clamp(2.4rem,6.5vw,5.4rem)", letterSpacing: "-0.03em", animation: "fadeUp 0.9s ease forwards 0.4s", opacity: 0 }}>
            La producción técnica<br />
            detrás de cada <span style={{ color: GOLD }}>gran evento.</span>
          </h1>
          <p className="text-white/60 mt-8 max-w-2xl mx-auto" style={{ fontSize: "clamp(1rem,2vw,1.2rem)", animation: "fadeUp 0.9s ease forwards 0.65s", opacity: 0 }}>
            Desde el equipo exacto que tu evento necesita hasta la coordinación completa de la producción. Audio, iluminación y video en manos de un solo equipo que responde por cada detalle.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animation: "fadeUp 0.9s ease forwards 0.85s", opacity: 0 }}>
            <button onClick={() => iniciar()} disabled={loading} className="px-8 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105 disabled:opacity-60" style={{ background: GOLD }}>
              {loading ? "Abriendo…" : "Cotiza tu evento"}
            </button>
            <a href="#servicios" className="px-8 py-4 rounded-full font-semibold text-white/70 text-sm tracking-wide border border-white/15 hover:border-white/30 transition-all duration-300">
              Ver qué hacemos
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 z-20" style={{ animation: "fadeUp 1s ease forwards 1.2s" }}>
          <span className="text-xs tracking-[0.18em] uppercase text-white/50">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-14 px-6 border-b border-white/[0.05]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-4">
          <StatCount target={7} suffix="+" label="Años de experiencia" />
          <StatCount target={750} suffix="+" label="Eventos realizados" />
          <StatCount target={5} suffix="" label="Zonas de servicio" />
          <StatCount target={100} suffix="%" label="Compromiso" />
        </div>
      </section>

      {/* ── Problema / solución ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-sm tracking-[0.2em] uppercase mb-4">El problema que resolvemos</p>
            <h2 className="font-bold text-white leading-[1.1] mb-6" style={{ fontSize: "clamp(1.9rem,4.5vw,3.4rem)", letterSpacing: "-0.025em" }}>
              Un evento tiene mil piezas técnicas.<br />
              <span style={{ color: GOLD }}>Nosotros somos la única que necesitas coordinar.</span>
            </h2>
            <p className="text-white/45 text-base leading-relaxed max-w-2xl">
              Audio nítido y balanceado, iluminación que da forma a cada momento, video en alta definición y un equipo que lo opera con criterio. En lugar de coordinar proveedores sueltos, cuentas con un solo responsable de que todo llegue junto y a tiempo.
            </p>
          </R>
        </div>
      </section>

      {/* ── Quiénes somos ── */}
      <section className="py-24 px-6 bg-[#060606] border-y border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-sm tracking-[0.2em] uppercase mb-4">Quiénes somos</p>
            <h2 className="font-bold text-white leading-tight mb-12" style={{ fontSize: "clamp(1.5rem,3.3vw,2.5rem)", letterSpacing: "-0.02em" }}>
              Creamos experiencias<br /><span style={{ color: GOLD }}>que generan impacto.</span>
            </h2>
          </R>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { k: "Propósito", t: "Por qué existimos", b: "Por la pasión por los eventos en vivo — y por lo que un espectáculo bien producido genera en las personas." },
              { k: "Misión", t: "Qué hacemos", b: "Potenciamos proyectos, artistas y marcas a través de la producción técnica impecable de sus eventos." },
              { k: "Visión", t: "Hacia dónde vamos", b: "Ser el aliado técnico de confianza de marcas, artistas y promotores a nivel nacional — parte real de tu equipo, no solo un proveedor." },
            ].map((c, i) => (
              <R key={c.k} delay={i * 100}>
                <div className="rounded-2xl p-8 h-full" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[#B3985B] text-[11px] font-semibold tracking-[0.2em] uppercase mb-5">{c.k}</p>
                  <h3 className="font-bold text-white text-xl mb-3 leading-tight">{c.t}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{c.b}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Servicios ── */}
      <section id="servicios" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-sm tracking-[0.2em] uppercase mb-4">Lo que ofrecemos</p>
            <h2 className="font-bold text-white leading-tight mb-3" style={{ fontSize: "clamp(1.5rem,3.3vw,2.5rem)", letterSpacing: "-0.02em" }}>
              Tres formas de trabajar<br />con Mainstage Pro
            </h2>
            <p className="text-white/40 text-sm sm:text-base leading-relaxed max-w-2xl mb-12">
              Desde solo el equipo hasta la coordinación completa de tu evento. Elige el nivel que necesitas — puedes combinarlos.
            </p>
          </R>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SERVICIOS_DETALLE.map((s, i) => (
              <R key={s.slug} delay={i * 120}>
                <a
                  href={`/presentacion/servicio/${s.slug}`}
                  className="group relative rounded-2xl p-8 h-full flex flex-col transition-all duration-300 block"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${GOLD}40`; e.currentTarget.style.background = "rgba(179,152,91,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <EditableFigure
                      edit={edit}
                      okey={`home.servicio.${s.tipoServicio}.img`}
                      alt={s.title}
                      imgClassName="w-11 h-11 rounded-xl object-cover"
                      placeholder={(() => { const Icon = SERVICE_ICONS[s.tipoServicio]; return Icon ? <Icon size={30} strokeWidth={1.4} style={{ color: GOLD }} /> : <span />; })()}
                    />
                    <span className="text-[#B3985B]/40 text-xs font-mono tracking-widest">{s.n}</span>
                  </div>
                  <h3 className="font-bold text-white text-2xl mb-3 leading-tight">{s.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed flex-1">{s.tagline}</p>
                  <p className="text-[#B3985B]/60 text-xs mt-6 leading-relaxed border-t border-white/[0.05] pt-5">{s.detailChips}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 group-hover:text-white transition-transform duration-300 group-hover:translate-x-1">
                    Ver servicio <span aria-hidden>→</span>
                  </span>
                </a>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Eventos / para quién ── */}
      <section id="eventos" className="py-24 px-6 bg-[#060606]">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-sm tracking-[0.2em] uppercase mb-4">Para qué eventos trabajamos</p>
            <h2 className="font-bold text-white leading-tight mb-12" style={{ fontSize: "clamp(1.5rem,3.3vw,2.5rem)", letterSpacing: "-0.02em" }}>
              Cada evento, con la producción<br />que merece
            </h2>
          </R>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {EVENTOS.map((ev, i) => (
              <R key={ev.title} delay={i * 120}>
                <a href={ev.href} className="group block relative rounded-2xl overflow-hidden" style={{ height: "360px" }}>
                  <EditableImage
                    edit={edit}
                    okey={`home.evento.${i}.img`}
                    fallback={ev.img}
                    alt={ev.title}
                    wrapClassName="w-full h-full"
                    imgClassName="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.2) 55%, transparent 100%)" }} />
                  <div className="absolute bottom-0 left-0 right-0 p-7">
                    <p className="text-[#B3985B] text-[10px] tracking-[0.16em] uppercase mb-2">{ev.para}</p>
                    <h3 className="font-bold text-white text-xl mb-1">{ev.title}</h3>
                    <p className="text-white/50 text-xs">{ev.sub}</p>
                    <div className="flex items-center gap-2 mt-4 text-[#B3985B] text-xs font-semibold tracking-wide uppercase">
                      Ver presentación
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </div>
                  </div>
                </a>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Inventario teaser ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <R>
            <div className="rounded-3xl overflow-hidden relative" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <EditableImage
                edit={edit}
                okey="home.inventario.img"
                fallback="/images/presentacion/musicales/Musicales-126.jpg"
                alt="Inventario Mainstage Pro"
                wrapClassName="absolute inset-0"
                imgClassName="w-full h-full object-cover opacity-30"
              />
              <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to right, #060606 10%, rgba(6,6,6,0.7) 60%, rgba(6,6,6,0.4) 100%)" }} />
              <div className="relative p-10 sm:p-14 max-w-xl">
                <p className="text-[#B3985B] text-sm tracking-[0.2em] uppercase mb-4">Inventario de equipo</p>
                <h2 className="font-bold text-white leading-tight mb-4" style={{ fontSize: "clamp(1.6rem,3.5vw,2.6rem)", letterSpacing: "-0.02em" }}>
                  Explora el equipo y arma tu presupuesto.
                </h2>
                <p className="text-white/50 text-sm leading-relaxed mb-8">
                  Catálogo completo por categorías con lista de precios y cotizador en línea. Selecciona lo que necesitas y recibe una cotización exacta.
                </p>
                <a href="/presentacion/inventario" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105" style={{ background: GOLD }}>
                  Ver inventario y cotizador
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </a>
              </div>
            </div>
          </R>
        </div>
      </section>

      {/* ── Proyectos ── */}
      {proyectos.length > 0 && (
        <section id="proyectos" className="py-24 px-6 bg-[#060606]">
          <div className="max-w-6xl mx-auto">
            <R>
              <p className="text-[#B3985B] text-sm tracking-[0.2em] uppercase mb-4">Proyectos</p>
              <h2 className="font-bold text-white leading-tight mb-12" style={{ fontSize: "clamp(1.5rem,3.3vw,2.5rem)", letterSpacing: "-0.02em" }}>
                Eventos que hemos producido
              </h2>
            </R>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {proyectos.slice(0, 6).map((p, i) => (
                <R key={p.id} delay={i * 80}>
                  <a href={`/presentacion/proyecto/${p.slug}`} className="group block relative rounded-2xl overflow-hidden h-full" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="relative overflow-hidden" style={{ height: "220px" }}>
                      {p.portada ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.portada} alt={p.titulo} draggable={false} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full" style={{ background: "rgba(255,255,255,0.03)" }} />
                      )}
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent 60%)" }} />
                    </div>
                    <div className="p-6">
                      <p className="text-[#B3985B] text-[10px] tracking-[0.16em] uppercase mb-2">{TIPO_LABEL[p.tipoEvento] ?? p.tipoEvento}</p>
                      <h3 className="font-bold text-white text-lg leading-tight mb-1">{p.titulo}</h3>
                      {p.ubicacion && <p className="text-white/40 text-xs">{p.ubicacion}</p>}
                    </div>
                  </a>
                </R>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Pilares ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-sm tracking-[0.2em] uppercase mb-4">Por qué Mainstage Pro</p>
            <h2 className="font-bold text-white leading-tight mb-12" style={{ fontSize: "clamp(1.5rem,3.3vw,2.5rem)", letterSpacing: "-0.02em" }}>
              Lo que nos hace<br /><span style={{ color: GOLD }}>la opción correcta.</span>
            </h2>
          </R>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { t: "Claridad", b: "Desde la primera llamada hasta el último cable recogido. Sabes qué esperar en cada paso." },
              { t: "Confianza", b: "Equipos confiables, procesos claros y comunicación honesta. Sin sorpresas." },
              { t: "Consistencia", b: "Ejecución sin improvisación. La misma calidad en cada evento, sin importar el tamaño." },
            ].map((c, i) => (
              <R key={c.t} delay={i * 100}>
                <div className="rounded-2xl p-8 h-full" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-px mb-6" style={{ background: GOLD }} />
                  <h4 className="font-bold text-white text-lg mb-3">{c.t}</h4>
                  <p className="text-white/45 text-sm leading-relaxed">{c.b}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Galería teaser ── */}
      <section className="py-20 px-6 bg-[#060606]">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-sm tracking-[0.2em] uppercase mb-4">Nuestro trabajo</p>
            <h2 className="font-bold text-white leading-tight mb-10" style={{ fontSize: "clamp(1.5rem,3.3vw,2.5rem)", letterSpacing: "-0.02em" }}>
              Cada evento, una producción<br /><span style={{ color: GOLD }}>hecha a medida.</span>
            </h2>
          </R>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              "/images/presentacion/musicales/Musicales-016.jpg",
              "/images/presentacion/sociales/s-hacienda-iluminada.jpg",
              "/images/presentacion/empresariales/e-sala-pantallas.jpg",
              "/images/presentacion/musicales/Musicales-037.jpg",
              "/images/presentacion/sociales/s-piano-pista.jpg",
              "/images/presentacion/empresariales/e-auditorio.jpg",
            ].map((src, i) => (
              <R key={i} delay={i * 50} className="overflow-hidden rounded-xl">
                <EditableImage
                  edit={edit}
                  okey={`home.galeria.${i}`}
                  fallback={src}
                  alt="Producción Mainstage Pro"
                  wrapClassName="w-full h-full"
                  imgClassName="w-full h-full object-cover aspect-[4/3] hover:scale-105 transition-transform duration-500"
                />
              </R>
            ))}
          </div>
          <R delay={120}>
            <div className="mt-8 text-center">
              <a href="/presentacion/galeria" className="text-[#B3985B] text-sm font-semibold tracking-wide inline-flex items-center gap-2 hover:gap-3 transition-all">
                Ver galería completa
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </a>
            </div>
          </R>
        </div>
      </section>

      {/* ── Cómo trabajamos + Zonas ── */}
      <section className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <R>
              <p className="text-[#B3985B] text-sm tracking-[0.2em] uppercase mb-4">Cómo trabajamos</p>
              <h2 className="font-bold text-white leading-tight mb-10" style={{ fontSize: "clamp(1.5rem,3.3vw,2.3rem)", letterSpacing: "-0.02em" }}>
                Contratarnos, paso a paso
              </h2>
            </R>
            <div className="space-y-5">
              {[
                { n: "1", title: "Contáctanos", body: "Nos escribes y respondemos en menos de 24 horas." },
                { n: "2", title: "Descubrimiento de necesidades", body: "Entendemos tu evento, tu espacio y lo que quieres lograr." },
                { n: "3", title: "Desarrollamos tu cotización", body: "Armamos una propuesta a la medida, clara y sin letra chica." },
                { n: "4", title: "Presentación y negociación", body: "Te presentamos la propuesta y ajustamos hasta que encaje." },
                { n: "5", title: "Cierre del proyecto", body: "Confirmamos, bloqueamos la fecha y coordinamos la ejecución." },
              ].map((step, i) => (
                <R key={step.n} delay={i * 70}>
                  <div className="flex gap-4 items-start">
                    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(179,152,91,0.1)", color: GOLD, border: `1px solid ${GOLD}25` }}>{step.n}</div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">{step.title}</h4>
                      <p className="text-white/40 text-xs leading-relaxed">{step.body}</p>
                    </div>
                  </div>
                </R>
              ))}
            </div>
          </div>
          <div>
            <R>
              <p className="text-[#B3985B] text-sm tracking-[0.2em] uppercase mb-4">Zonas de servicio</p>
              <h2 className="font-bold text-white leading-tight mb-10" style={{ fontSize: "clamp(1.6rem,3.5vw,2.4rem)", letterSpacing: "-0.02em" }}>
                Dónde trabajamos
              </h2>
            </R>
            <R delay={80}>
              <div className="border-t border-white/[0.06]">
                {[
                  { ciudad: "Querétaro", detalle: "Base de operaciones", primary: true },
                  { ciudad: "León", detalle: "El Bajío", primary: true },
                  { ciudad: "San Miguel de Allende", detalle: "Guanajuato", primary: false },
                  { ciudad: "Ciudad de México", detalle: "CDMX y ZMVM", primary: true },
                  { ciudad: "Puebla", detalle: "Puebla · Tlaxcala", primary: false },
                ].map((z, i) => (
                  <div key={i} className="flex items-center justify-between py-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${z.primary ? "bg-[#B3985B]" : "bg-white/20"}`} />
                      <span className={`font-semibold tracking-tight ${z.primary ? "text-white" : "text-white/50"}`} style={{ fontSize: "clamp(1rem,2vw,1.2rem)" }}>{z.ciudad}</span>
                    </div>
                    <span className="text-white/30 text-xs">{z.detalle}</span>
                  </div>
                ))}
              </div>
            </R>
            <R delay={160}>
              <p className="text-white/25 text-xs leading-relaxed mt-6">
                ¿Tu evento es fuera de estas ciudades? Nos desplazamos a cualquier punto de la República.
              </p>
            </R>
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-28 px-6" style={{ background: "#040404" }}>
        <div className="max-w-3xl mx-auto text-center">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-6">Siguiente paso</p>
            <h2 className="font-bold text-white leading-tight mb-6" style={{ fontSize: "clamp(1.9rem,5vw,3.4rem)", letterSpacing: "-0.025em" }}>
              Tu próximo evento,<br /><span style={{ color: GOLD }}>en buenas manos.</span>
            </h2>
            <p className="text-white/45 mb-10">Cuéntanos de tu evento y prepara tu cotización. Respondemos en menos de 24 horas.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => iniciar()} disabled={loading} className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105 disabled:opacity-60" style={{ background: GOLD }}>
                {loading ? "Abriendo…" : "Iniciar cotización"}
              </button>
              <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-semibold text-white/80 text-sm tracking-wide border border-white/15 hover:border-white/30 transition-all duration-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            </div>
          </R>
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-white/[0.04] text-center">
        <p className="text-white/20 text-xs tracking-wide">© {new Date().getFullYear()} Mainstage Pro · Producción técnica de eventos</p>
      </footer>
    </div>
  );
}
