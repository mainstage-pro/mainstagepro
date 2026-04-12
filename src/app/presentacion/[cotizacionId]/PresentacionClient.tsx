"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Linea {
  id: string;
  tipo: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  esIncluido: boolean;
  notas: string | null;
  equipo?: { categoria: { nombre: string } | null } | null;
}

interface Cotizacion {
  id: string;
  numeroCotizacion: string;
  nombreEvento: string | null;
  tipoEvento: string | null;
  tipoServicio: string | null;
  fechaEvento: string | null;
  lugarEvento: string | null;
  horasOperacion: number | null;
  granTotal: number;
  total: number;
  aplicaIva: boolean;
  montoIva: number;
  observaciones: string | null;
  terminosComerciales: string | null;
  cliente: { nombre: string; empresa: string | null; telefono: string | null; correo: string | null };
  trato: { tipoEvento: string } | null;
  lineas: Linea[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const AUDIO_CATS = ["Equipo de Audio", "Sistemas de Microfonía", "Monitoreo In-Ear", "Consolas de Audio"];
const ILUM_CATS  = ["Equipo de Iluminación", "Consolas de Iluminación"];
const DJ_CATS    = ["Consolas/Equipo para DJ", "DJ Booths", "Entarimado"];
const VIDEO_CATS = ["Pantalla / Video"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(s: string | null) {
  if (!s) return null;
  return new Date(s).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function getLineasBySection(lineas: Linea[]) {
  const isEquipo = (l: Linea) => l.tipo === "EQUIPO_PROPIO" || l.tipo === "EQUIPO_EXTERNO";
  const cat = (l: Linea) => l.equipo?.categoria?.nombre ?? "";

  return {
    audio:  lineas.filter(l => isEquipo(l) && AUDIO_CATS.includes(cat(l))),
    ilum:   lineas.filter(l => isEquipo(l) && ILUM_CATS.includes(cat(l))),
    dj:     lineas.filter(l => l.tipo === "DJ" || (isEquipo(l) && DJ_CATS.includes(cat(l)))),
    video:  lineas.filter(l => isEquipo(l) && VIDEO_CATS.includes(cat(l))),
    staff:  lineas.filter(l => l.tipo === "OPERACION_TECNICA"),
    otros:  lineas.filter(l =>
      !["EQUIPO_PROPIO","EQUIPO_EXTERNO","DJ","OPERACION_TECNICA","DESCUENTO_BENEFICIO"].includes(l.tipo)
    ),
  };
}

// ─── Scroll Reveal Hook ───────────────────────────────────────────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({
  children, delay = 0, className = "", y = 50,
}: {
  children: React.ReactNode; delay?: number; className?: string; y?: number;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        transform: visible ? "translateY(0)" : `translateY(${y}px)`,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.9s ease, transform 0.9s ease",
      }}
      className={className}
    >
      {children}
    </div>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────────
function Divider() {
  return <div className="w-16 h-px bg-[#B3985B]/40 mx-auto" />;
}

// ─── Equipment Card ───────────────────────────────────────────────────────────
function EquipoCard({ linea, delay = 0 }: { linea: Linea; delay?: number }) {
  return (
    <Reveal delay={delay}>
      <div className="border border-white/8 rounded-2xl p-5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
        {linea.marca && (
          <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-[0.15em] mb-2">
            {linea.marca}
          </p>
        )}
        <p className="text-white text-lg font-semibold leading-tight mb-1">
          {linea.modelo ?? linea.descripcion}
        </p>
        {linea.modelo && (
          <p className="text-white/40 text-sm">{linea.descripcion}</p>
        )}
        {linea.cantidad > 1 && (
          <p className="text-white/25 text-xs mt-2">× {linea.cantidad} unidades</p>
        )}
      </div>
    </Reveal>
  );
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────
function Section({
  children, className = "", gradient,
}: {
  children: React.ReactNode; className?: string;
  gradient?: string;
}) {
  return (
    <section
      className={`relative py-32 px-6 overflow-hidden ${className}`}
      style={gradient ? { background: gradient } : undefined}
    >
      {children}
    </section>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-[0.2em] mb-6">
      {children}
    </p>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PresentacionClient({ cotizacion }: { cotizacion: Cotizacion }) {
  const heroRef    = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { audio, ilum, dj, video, staff } = getLineasBySection(cotizacion.lineas);

  const hasAudio = audio.length > 0;
  const hasIlum  = ilum.length > 0;
  const hasDJ    = dj.length > 0;
  const hasVideo = video.length > 0;
  const hasStaff = staff.length > 0;

  const fecha  = fmtDate(cotizacion.fechaEvento);
  const evento = cotizacion.nombreEvento ?? cotizacion.tipoEvento ?? "Tu Evento";
  const tipoEvento = cotizacion.trato?.tipoEvento ?? cotizacion.tipoEvento ?? "";

  // Pick headline based on event type
  const heroTagline =
    tipoEvento === "MUSICAL"    ? "Sonido que mueve multitudes." :
    tipoEvento === "SOCIAL"     ? "La noche que todos recordarán." :
    tipoEvento === "EMPRESARIAL"? "Producción que impresiona." :
                                  "Una experiencia que no se olvida.";

  const heroSub =
    tipoEvento === "MUSICAL"    ? "Diseñada para cada nota, cada frecuencia, cada instante." :
    tipoEvento === "SOCIAL"     ? "Cada detalle técnico, afinado para que tú solo disfrutes." :
    tipoEvento === "EMPRESARIAL"? "Tecnología de concierto al servicio de tu marca." :
                                  "Tecnología de primer nivel. Operadores de élite.";

  const heroOpacity = Math.max(0, 1 - scrollY / 500);
  const heroY       = scrollY * 0.35;

  const telefono = cotizacion.cliente.telefono?.replace(/\D/g, "");
  const waHref   = telefono
    ? `https://wa.me/52${telefono}?text=${encodeURIComponent("Hola, quiero confirmar la propuesta de Mainstage Pro.")}`
    : null;

  return (
    <main
      className="bg-black text-white overflow-x-hidden"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
    >
      {/* ── Sticky Nav ─────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{
          backgroundColor: `rgba(0,0,0,${Math.min(0.9, scrollY / 120)})`,
          backdropFilter: scrollY > 40 ? "blur(20px)" : "none",
          borderBottom: scrollY > 40 ? "1px solid rgba(255,255,255,0.06)" : "none",
          transition: "background-color 0.3s ease, border-color 0.3s ease",
        }}
      >
        <Image src="/logo-white.png" alt="Mainstage Pro" width={140} height={28} className="opacity-90" />
        <span className="text-white/40 text-sm hidden sm:block">
          Propuesta para {cotizacion.cliente.empresa ?? cotizacion.cliente.nombre}
        </span>
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold px-4 py-2 rounded-full border border-[#B3985B]/60 text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors hidden sm:block"
          >
            Contactar →
          </a>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 60%, rgba(179,152,91,0.07) 0%, transparent 70%)",
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        <div
          ref={heroRef}
          style={{ opacity: heroOpacity, transform: `translateY(${heroY}px)` }}
          className="relative z-10 max-w-5xl mx-auto"
        >
          {/* Label */}
          <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-[0.25em] mb-8 animate-fade-in">
            Mainstage Pro · Propuesta Exclusiva
          </p>

          {/* Event name */}
          <h1
            className="font-bold text-white leading-[1.05] mb-6"
            style={{ fontSize: "clamp(2.8rem, 8vw, 6.5rem)", letterSpacing: "-0.02em" }}
          >
            {evento}
          </h1>

          {/* Tagline */}
          <p
            className="text-white/80 font-light mb-4"
            style={{ fontSize: "clamp(1.4rem, 3.5vw, 2.4rem)", letterSpacing: "-0.01em" }}
          >
            {heroTagline}
          </p>
          <p
            className="text-white/40 mb-12"
            style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)" }}
          >
            {heroSub}
          </p>

          {/* Meta: fecha / lugar */}
          {(fecha || cotizacion.lugarEvento) && (
            <div className="flex items-center justify-center gap-6 flex-wrap text-white/35 text-sm">
              {fecha && (
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span className="capitalize">{fecha}</span>
                </span>
              )}
              {cotizacion.lugarEvento && (
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" />
                  </svg>
                  {cotizacion.lugarEvento}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Scroll cue */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ opacity: heroOpacity }}
        >
          <span className="text-white/20 text-xs tracking-widest uppercase">Descubrir</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </section>

      {/* ── Promise ─────────────────────────────────────────────────────────── */}
      <Section className="bg-[#050505] text-center max-w-4xl mx-auto">
        <Reveal>
          <p className="text-white/25 text-sm uppercase tracking-[0.2em] mb-6">La experiencia</p>
          <h2
            className="text-white font-semibold leading-[1.1] mb-8"
            style={{ fontSize: "clamp(2rem, 5vw, 3.8rem)", letterSpacing: "-0.02em" }}
          >
            No es sonido.
            <br />
            <span className="text-white/50">Es la sensación de que algo</span>
            <br />
            increíble está por suceder.
          </h2>
        </Reveal>
        <Reveal delay={200}>
          <p className="text-white/45 text-lg leading-relaxed max-w-2xl mx-auto">
            Diseñamos cada detalle técnico para que el audio, la iluminación y la producción
            no solo funcionen — sino que transformen el espacio y a las personas dentro de él.
          </p>
        </Reveal>
      </Section>

      {/* ── Audio ─────────────────────────────────────────────────────────── */}
      {hasAudio && (
        <Section
          gradient="radial-gradient(ellipse 70% 60% at 10% 50%, rgba(56,189,248,0.04) 0%, transparent 60%), #000"
        >
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-20 items-start">
              {/* Left: copy */}
              <div>
                <Reveal>
                  <SectionLabel>Sistema de audio</SectionLabel>
                  <h2
                    className="text-white font-bold leading-[1.05] mb-6"
                    style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", letterSpacing: "-0.02em" }}
                  >
                    Cada nota,
                    <br />
                    donde tiene
                    <br />
                    que estar.
                  </h2>
                </Reveal>
                <Reveal delay={150}>
                  <p className="text-white/45 text-lg leading-relaxed">
                    Sistemas de line array con cobertura milimétrica, consolas digitales de referencia
                    y micrófonos que capturan cada matiz. El sonido que escuchan en la última fila
                    es el mismo que escuchan en el frente.
                  </p>
                </Reveal>

                {/* Key specs */}
                <Reveal delay={250}>
                  <div className="mt-10 grid grid-cols-2 gap-4">
                    {audio.slice(0, 4).map((l, i) => (
                      <div key={l.id} className="border-t border-white/8 pt-4"
                        style={{ transitionDelay: `${i * 60}ms` }}>
                        {l.marca && <p className="text-[#B3985B] text-xs font-semibold tracking-wider mb-1">{l.marca}</p>}
                        <p className="text-white font-semibold text-sm">{l.modelo ?? l.descripcion}</p>
                        {l.modelo && <p className="text-white/30 text-xs">{l.descripcion}</p>}
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>

              {/* Right: equipment cards */}
              <div className="grid gap-3">
                {audio.map((l, i) => (
                  <EquipoCard key={l.id} linea={l} delay={i * 60} />
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ── Iluminación ──────────────────────────────────────────────────────── */}
      {hasIlum && (
        <Section
          gradient="radial-gradient(ellipse 70% 60% at 90% 50%, rgba(179,152,91,0.06) 0%, transparent 65%), #000"
        >
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-20 items-start">
              {/* Left: equipment cards (reversed order) */}
              <div className="grid gap-3 order-2 lg:order-1">
                {ilum.map((l, i) => (
                  <EquipoCard key={l.id} linea={l} delay={i * 60} />
                ))}
              </div>

              {/* Right: copy */}
              <div className="order-1 lg:order-2">
                <Reveal>
                  <SectionLabel>Diseño de iluminación</SectionLabel>
                  <h2
                    className="text-white font-bold leading-[1.05] mb-6"
                    style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", letterSpacing: "-0.02em" }}
                  >
                    La luz que
                    <br />
                    convierte un espacio
                    <br />
                    en un mundo.
                  </h2>
                </Reveal>
                <Reveal delay={150}>
                  <p className="text-white/45 text-lg leading-relaxed">
                    Cabezas móviles, sistemas beam, efectos de píxel y control total desde consolas
                    Grand MA. Cada cue programado para el momento exacto. Iluminación que no adorna
                    — que transforma.
                  </p>
                </Reveal>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ── DJ Setup ─────────────────────────────────────────────────────────── */}
      {hasDJ && (
        <Section
          gradient="radial-gradient(ellipse 60% 50% at 50% 80%, rgba(139,92,246,0.04) 0%, transparent 60%), #050505"
        >
          <div className="max-w-6xl mx-auto text-center">
            <Reveal>
              <SectionLabel>Setup DJ</SectionLabel>
              <h2
                className="text-white font-bold leading-[1.05] mb-6"
                style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", letterSpacing: "-0.02em" }}
              >
                El setup que usan
                <br />
                los mejores DJs
                <br />
                del mundo.
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="text-white/45 text-lg leading-relaxed max-w-2xl mx-auto mb-14">
                Pioneer CDJ 3000, mezcladoras de referencia y booth premium.
                La misma cadena técnica que encontrarás en los clubs y festivales más exigentes.
              </p>
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dj.map((l, i) => (
                <EquipoCard key={l.id} linea={l} delay={i * 60} />
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* ── Video ────────────────────────────────────────────────────────────── */}
      {hasVideo && (
        <Section gradient="#000">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <SectionLabel>Producción de video</SectionLabel>
              <h2
                className="text-white font-bold leading-[1.05] mb-6"
                style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", letterSpacing: "-0.02em" }}
              >
                Visual que
                <br />
                impacta.
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="text-white/45 text-lg leading-relaxed max-w-xl mb-14">
                Pantallas LED de alta densidad, switchers profesionales y producción de contenido.
                Imagen que complementa cada beat.
              </p>
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {video.map((l, i) => (
                <EquipoCard key={l.id} linea={l} delay={i * 60} />
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* ── Staff ────────────────────────────────────────────────────────────── */}
      {hasStaff && (
        <Section className="bg-[#050505]">
          <div className="max-w-6xl mx-auto text-center">
            <Reveal>
              <SectionLabel>Equipo técnico</SectionLabel>
              <h2
                className="text-white font-bold leading-[1.05] mb-6"
                style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", letterSpacing: "-0.02em" }}
              >
                Detrás de cada
                <br />
                gran evento,
                <br />
                hay grandes manos.
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="text-white/45 text-lg leading-relaxed max-w-2xl mx-auto mb-14">
                Operadores certificados, ingenieros de audio con oído clínico y técnicos
                que han trabajado en los escenarios más exigentes de México.
                Tu evento en las mejores manos.
              </p>
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {staff.map((l, i) => (
                <Reveal key={l.id} delay={i * 80}>
                  <div className="border border-white/8 rounded-2xl p-6 text-left bg-white/[0.02]">
                    <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider mb-2">Operación técnica</p>
                    <p className="text-white font-semibold text-lg">{l.descripcion}</p>
                    {l.notas && <p className="text-white/35 text-sm mt-2">{l.notas}</p>}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* ── Por qué Mainstage ──────────────────────────────────────────────── */}
      <Section className="bg-black">
        <div className="max-w-5xl mx-auto text-center">
          <Reveal>
            <SectionLabel>Por qué Mainstage Pro</SectionLabel>
            <h2
              className="text-white font-bold leading-[1.05] mb-6"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", letterSpacing: "-0.02em" }}
            >
              No producimos eventos.
              <br />
              <span className="text-white/45">Creamos momentos.</span>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-white/40 text-lg mb-20 max-w-xl mx-auto">
              Cuatro compromisos que hacemos realidad en cada producción.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-px bg-white/5 rounded-3xl overflow-hidden">
            {[
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ),
                label: "Equipo de primer nivel",
                desc: "RCF, Allen & Heath, Pioneer, Grand MA, Shure — las marcas líderes que usan los mejores productores del mundo.",
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                ),
                label: "Técnicos certificados",
                desc: "Operadores con años de experiencia en conciertos, bodas y eventos corporativos de alto perfil en México.",
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                ),
                label: "Zero estrés en el día",
                desc: "Llegamos, montamos, verificamos y operamos. Tú llegas a tu evento con todo listo. Sin sorpresas, sin improvisación.",
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ),
                label: "Compromiso garantizado",
                desc: "Cada elemento de esta propuesta está cotizado, reservado y asegurado. Tu fecha es nuestra fecha.",
              },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="bg-[#050505] p-10 text-left">
                  <div className="text-[#B3985B] mb-5">{item.icon}</div>
                  <p className="text-white font-semibold text-xl mb-3">{item.label}</p>
                  <p className="text-white/40 text-base leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Inversión ───────────────────────────────────────────────────────── */}
      <Section
        className="bg-black text-center"
        gradient="radial-gradient(ellipse 60% 70% at 50% 50%, rgba(179,152,91,0.05) 0%, transparent 65%), #000"
      >
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <Divider />
            <p className="text-white/25 text-sm uppercase tracking-[0.2em] mt-10 mb-4">Tu inversión</p>
            <p
              className="text-white font-bold leading-none mb-4"
              style={{ fontSize: "clamp(4rem, 12vw, 8rem)", letterSpacing: "-0.03em" }}
            >
              {fmt(cotizacion.granTotal)}
            </p>
            {cotizacion.aplicaIva && (
              <p className="text-white/30 text-lg mb-2">
                Incluye IVA ({fmt(cotizacion.montoIva)})
              </p>
            )}
            <p className="text-white/25 text-base mb-16">Incluye equipo, operación, transporte y montaje</p>
          </Reveal>

          {/* Observaciones */}
          {cotizacion.observaciones && (
            <Reveal delay={100}>
              <div className="border border-white/8 rounded-2xl p-8 text-left bg-white/[0.02] mb-10">
                <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider mb-3">Notas de la propuesta</p>
                <p className="text-white/50 text-base leading-relaxed whitespace-pre-line">
                  {cotizacion.observaciones}
                </p>
              </div>
            </Reveal>
          )}

          {/* Términos */}
          {cotizacion.terminosComerciales && (
            <Reveal delay={150}>
              <div className="border border-white/8 rounded-2xl p-8 text-left bg-white/[0.02]">
                <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider mb-3">Términos comerciales</p>
                <p className="text-white/50 text-base leading-relaxed whitespace-pre-line">
                  {cotizacion.terminosComerciales}
                </p>
              </div>
            </Reveal>
          )}
        </div>
      </Section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <Section className="bg-[#050505] text-center">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <Image
              src="/logo-white.png"
              alt="Mainstage Pro"
              width={160}
              height={32}
              className="mx-auto mb-14 opacity-60"
            />
            <h2
              className="text-white font-bold leading-[1.05] mb-6"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", letterSpacing: "-0.02em" }}
            >
              Listos para crear
              <br />
              algo extraordinario.
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="text-white/40 text-lg mb-12">
              Cuéntanos cómo quieres avanzar. Estamos listos para hacer de{" "}
              <span className="text-white/70">{evento}</span> una experiencia única.
            </p>
          </Reveal>
          <Reveal delay={250}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 px-8 py-4 rounded-full bg-[#B3985B] text-black font-semibold text-base hover:bg-[#c9a96a] transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Confirmar propuesta
                </a>
              )}
              {cotizacion.cliente.correo && (
                <a
                  href={`mailto:${cotizacion.cliente.correo}`}
                  className="flex items-center gap-2.5 px-8 py-4 rounded-full border border-white/15 text-white/70 font-semibold text-base hover:border-white/30 hover:text-white transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  Escribir por correo
                </a>
              )}
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image src="/logo-white.png" alt="Mainstage Pro" width={110} height={22} className="opacity-30" />
          <p className="text-white/20 text-xs text-center">
            Cotización {cotizacion.numeroCotizacion} · Propuesta para {cotizacion.cliente.nombre}
          </p>
          <p className="text-white/20 text-xs">Querétaro, México</p>
        </div>
      </footer>

      {/* Global styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 1s ease both; }
      `}</style>
    </main>
  );
}
