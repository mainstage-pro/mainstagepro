"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import {
  Users,
  Flame,
  Crosshair,
  Telescope,
  Target,
  AlertTriangle,
  CheckCircle2,
  Link2,
  Rocket,
  MessageCircle,
  Package,
  Workflow,
  Music,
  Heart,
  Building2,
  Sparkles,
  MapPin,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/* ── Design tokens: mismo lenguaje visual de Live/Creative — dorado como acento predominante ── */
const G = "#B3985B";
const G_A = (a: number) => `rgba(179,152,91,${a})`;
const W = "#F0F0F0";
const W_A = (a: number) => `rgba(240,240,240,${a})`;
const BG = "#080808";
const RED = "#f87171";
const GREEN = "#4ade80";
const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const WA_CONTACTO = "https://wa.me/524461432565?text=" + encodeURIComponent("Hola, vi la presentación de Mainstage Pro y me gustaría más información para mi evento.");

const FOTO = {
  portada: "/images/presentacion/musicales/Musicales-150.jpg",
  quienesSomos: "/images/presentacion/operacion/crew-foh.jpg",
  queNosMueve: "/images/presentacion/sociales/s-piano-pista.jpg",
  mision: "/images/presentacion/operacion/consola-audio.jpg",
  vision: "/images/presentacion/empresariales/e-carpa-led.jpg",
  estructura: "/images/presentacion/operacion/road-cases.jpg",
  tiposEvento: "/images/presentacion/musicales/Musicales-083.jpg",
  zonas: "/images/presentacion/empresariales/e-edificio-azul.jpg",
  paraQuien: "/images/presentacion/sociales/s-hacienda-aerea.jpg",
  problemas: "/images/presentacion/operacion/oficio-manos.jpg",
  soluciones: "/images/presentacion/musicales/Musicales-129.jpg",
  alianza: "/images/presentacion/musicales/Afrodise-59.jpg",
  porQue: "/images/presentacion/empresariales/e-proyeccion-mural.jpg",
  cierre: "/images/presentacion/sociales/s-hacienda-iluminada.jpg",
};

/* ── Primitivas de animación y fondo (mismo patrón que Live/Creative/Cultura) ── */
function A({
  children,
  delay = 0,
  style: ext = {},
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div className={className} style={{ animation: `mspFadeUp 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms both`, ...ext }}>
      {children}
    </div>
  );
}

function GridTexture() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: `linear-gradient(${G_A(1)} 1px,transparent 1px),linear-gradient(90deg,${G_A(1)} 1px,transparent 1px)`,
        backgroundSize: "80px 80px",
        opacity: 0.022,
      }}
    />
  );
}

function RadialGlow({ x = 50, y = 50, intensity = 0.05, color = G }: { x?: number; y?: number; intensity?: number; color?: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(ellipse 70% 60% at ${x}% ${y}%, ${color}${Math.round(intensity * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
      }}
    />
  );
}

function PulseRings({ size = 280, step = 130, count = 3 }: { size?: number; step?: number; count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: size + i * step,
            height: size + i * step,
            borderRadius: "50%",
            border: `1px solid ${G_A(0.12 - i * 0.03)}`,
            animation: `mspPulse ${3.5 + i * 0.9}s ease-out ${i * 1.1}s infinite`,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

function Foto({ src, opacity = 0.05 }: { src: string; opacity?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity, pointerEvents: "none" }}
    />
  );
}

function SectionLabel({ children, delay = 0, center = false, color = G }: { children: React.ReactNode; delay?: number; center?: boolean; color?: string }) {
  return (
    <A delay={delay} style={{ display: "flex", justifyContent: center ? "center" : "flex-start", marginBottom: 26 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          color,
          fontSize: "clamp(12px, 1.2vw, 14px)",
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          padding: "7px 16px",
          borderRadius: 5,
          border: `1px solid ${color}70`,
          background: `${color}12`,
        }}
      >
        {children}
      </span>
    </A>
  );
}

function IconoMarco({ icono: Icono, color = G, tam = 52 }: { icono: LucideIcon; color?: string; tam?: number }) {
  return (
    <div style={{ width: tam, height: tam, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: `${color}14`, border: `1px solid ${color}44` }}>
      <Icono strokeWidth={1.5} style={{ width: tam * 0.42, height: tam * 0.42, color }} />
    </div>
  );
}

/* ── Plantilla: declaración a pantalla completa ── */
function SlideDeclaracion({
  rotulo,
  titulo,
  cuerpo,
  foto,
  icono,
  acento = G,
}: {
  rotulo: string;
  titulo: string;
  cuerpo: string;
  foto: string;
  icono: LucideIcon;
  acento?: string;
}) {
  return (
    <div style={{ height: "100%", display: "flex", padding: "0 clamp(40px, 8vw, 120px)", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={foto} opacity={0.08} />
      <RadialGlow intensity={0.045} color={acento} />
      <div style={{ width: "100%", maxWidth: 940, textAlign: "center", position: "relative", zIndex: 1, margin: "auto", padding: "32px 0" }}>
        <A delay={0} style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>
          <IconoMarco icono={icono} color={acento} />
        </A>
        <SectionLabel delay={80} center color={acento}>{rotulo}</SectionLabel>
        <A delay={180}>
          <h1 style={{ fontSize: "clamp(2rem, 4.4vw, 4rem)", fontWeight: 800, lineHeight: 1.02, letterSpacing: "-0.04em", color: W, marginBottom: 32 }}>
            {titulo}
          </h1>
        </A>
        <A delay={300}>
          <div style={{ width: 48, height: 1.5, background: acento, margin: "0 auto 30px" }} />
        </A>
        <A delay={400}>
          <p style={{ color: W_A(0.5), fontSize: "clamp(0.95rem, 1.5vw, 1.2rem)", lineHeight: 1.85, maxWidth: 720, margin: "0 auto", whiteSpace: "pre-line" }}>
            {cuerpo}
          </p>
        </A>
      </div>
    </div>
  );
}

/* ── Slides concretos ── */

function SlidePortada() {
  return (
    <div style={{ height: "100%", display: "flex", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={FOTO.portada} opacity={0.12} />
      <GridTexture />
      <RadialGlow intensity={0.09} />
      <PulseRings />
      <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 40px", margin: "auto" }}>
        <A delay={100} style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
          <Image src="/logo-icon.png" alt="Mainstage Pro" width={132} height={132} style={{ width: "clamp(88px, 11vw, 132px)", height: "auto", borderRadius: 26 }} priority />
        </A>
        <A delay={220}>
          <h1 style={{ fontSize: "clamp(2.6rem, 7vw, 6rem)", fontWeight: 800, letterSpacing: "-0.04em", color: W, lineHeight: 0.98, marginBottom: 28 }}>
            Mainstage <span style={{ color: G }}>Pro</span>
          </h1>
        </A>
        <A delay={360}>
          <div style={{ width: "50%", height: 1, margin: "0 auto 28px", background: `linear-gradient(to right, transparent, ${G}, transparent)` }} />
        </A>
        <A delay={460}>
          <p style={{ color: W_A(0.6), fontSize: "clamp(1rem, 1.8vw, 1.3rem)", maxWidth: 560, margin: "0 auto 22px", lineHeight: 1.6 }}>
            Todo resuelto. Tú solo disfruta.
          </p>
        </A>
        <A delay={580}>
          <p style={{ color: G, fontSize: "clamp(11px, 1.2vw, 14px)", fontWeight: 500, letterSpacing: "0.26em", textTransform: "uppercase" }}>
            Audio · Iluminación · Video · Producción técnica
          </p>
        </A>
        <A delay={820}>
          <p style={{ marginTop: 58, color: W_A(0.14), fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase" }}>
            Presiona → para avanzar
          </p>
        </A>
      </div>
    </div>
  );
}

const STATS = [
  { value: "7+", label: "Años de experiencia" },
  { value: "750+", label: "Eventos realizados" },
  { value: "5", label: "Zonas de servicio" },
  { value: "100%", label: "Compromiso" },
];

function SlideQuienesSomos() {
  return (
    <div style={{ height: "100%", display: "flex", padding: "0 clamp(40px, 8vw, 120px)", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={FOTO.quienesSomos} opacity={0.08} />
      <RadialGlow intensity={0.045} />
      <div style={{ width: "100%", maxWidth: 940, textAlign: "center", position: "relative", zIndex: 1, margin: "auto", padding: "32px 0" }}>
        <A delay={0} style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>
          <IconoMarco icono={Users} />
        </A>
        <SectionLabel delay={80} center>Quiénes somos</SectionLabel>
        <A delay={180}>
          <h1 style={{ fontSize: "clamp(2rem, 4.4vw, 4rem)", fontWeight: 800, lineHeight: 1.02, letterSpacing: "-0.04em", color: W, marginBottom: 32 }}>
            {"Audio, iluminación y video,\ncon la gente que los opera."}
          </h1>
        </A>
        <A delay={300}>
          <div style={{ width: 48, height: 1.5, background: G, margin: "0 auto 30px" }} />
        </A>
        <A delay={400}>
          <p style={{ color: W_A(0.5), fontSize: "clamp(0.95rem, 1.5vw, 1.2rem)", lineHeight: 1.85, maxWidth: 720, margin: "0 auto", whiteSpace: "pre-line" }}>
            {"Somos la unidad de producción técnica de Grupo Mainstage. Montamos, probamos, operamos y desmontamos — del primer invitado al último aplauso."}
          </p>
        </A>
        <div style={{ display: "flex", justifyContent: "center", gap: "clamp(20px, 4vw, 48px)", flexWrap: "wrap", marginTop: 44 }}>
          {STATS.map((s, i) => (
            <A key={s.label} delay={560 + i * 70} style={{ textAlign: "center" }}>
              <p style={{ color: G, fontWeight: 800, fontSize: "clamp(1.6rem, 3vw, 2.6rem)", letterSpacing: "-0.02em" }}>{s.value}</p>
              <p style={{ color: W_A(0.4), fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 6 }}>{s.label}</p>
            </A>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideQueNosMueve() {
  return (
    <SlideDeclaracion
      rotulo="Qué nos mueve"
      titulo={"Un evento se vive una sola vez.\nLa técnica decide cómo se recuerda."}
      cuerpo={
        "El audio que no llega, la luz que no acompaña, el micrófono que falla en el discurso. Son detalles técnicos, pero son los que la gente recuerda.\n\nNos mueve que esa parte nunca sea el motivo por el que algo no salió como se imaginó."
      }
      foto={FOTO.queNosMueve}
      icono={Flame}
    />
  );
}

function SlideMision() {
  return (
    <SlideDeclaracion
      rotulo="Misión"
      titulo="Que la técnica se sienta, no se note."
      cuerpo={
        "Resolver el audio, la iluminación y el video de cada evento con el mismo estándar, sin importar si son cien invitados o diez mil.\n\nQue quien organiza llegue a disfrutar su propio evento, no a resolverlo."
      }
      foto={FOTO.mision}
      icono={Crosshair}
    />
  );
}

function SlideVision() {
  return (
    <SlideDeclaracion
      rotulo="Visión"
      titulo={"Ser el estándar de producción técnica\nde México, evento tras evento."}
      cuerpo={
        "Ser el aliado técnico al que promotores, venues, agencias y familias regresan, porque ya saben exactamente lo que van a recibir."
      }
      foto={FOTO.vision}
      icono={Telescope}
    />
  );
}

function ServicioCard({ icono: Icono, nombre, desc, delay }: { icono: LucideIcon; nombre: string; desc: string; delay: number }) {
  return (
    <A delay={delay} style={{ flex: "1 1 260px", minWidth: 240 }}>
      <div style={{ height: "100%", borderRadius: 16, padding: "26px 24px", background: G_A(0.05), border: `1px solid ${G_A(0.2)}` }}>
        <div style={{ marginBottom: 16 }}>
          <IconoMarco icono={Icono} tam={40} />
        </div>
        <p style={{ color: G, fontWeight: 800, fontSize: "clamp(16px, 1.8vw, 21px)", letterSpacing: "-0.02em", marginBottom: 12 }}>{nombre}</p>
        <p style={{ color: W_A(0.55), fontSize: "clamp(12px, 1.05vw, 14px)", lineHeight: 1.7 }}>{desc}</p>
      </div>
    </A>
  );
}

function SlideEstructura() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={FOTO.estructura} opacity={0.085} />
      <RadialGlow x={20} y={40} intensity={0.05} />
      <div style={{ position: "relative", zIndex: 1, margin: "auto 0" }}>
        <SectionLabel delay={0}>Nuestros servicios</SectionLabel>
        <A delay={80}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.9rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 14 }}>
            Dos servicios. El mismo estándar.
          </h2>
        </A>
        <A delay={160}>
          <p style={{ color: W_A(0.45), fontSize: "clamp(0.85rem, 1.2vw, 1.05rem)", lineHeight: 1.7, maxWidth: 680, marginBottom: 36 }}>
            Tú decides cuánto necesitas de nosotros. El equipo y la gente que lo opera no cambian.
          </p>
        </A>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
          <ServicioCard
            icono={Package}
            nombre="Renta de equipo"
            desc="Line arrays, subwoofers, consolas digitales, cabezas móviles y pantallas LED. Verificado en bodega antes de salir, con o sin operador."
            delay={260}
          />
          <ServicioCard
            icono={Workflow}
            nombre="Producción técnica"
            desc="Equipo y operadores: montaje, prueba de sonido y operación en vivo de principio a fin, con respaldo ante cualquier imprevisto."
            delay={340}
          />
        </div>
        <A delay={460}>
          <p style={{ color: W_A(0.3), fontSize: 12, letterSpacing: "0.04em" }}>
            + Disponible también: <span style={{ color: W_A(0.55) }}>Iluminación · Video y pantallas LED · DJ gear · Backline</span>
          </p>
        </A>
      </div>
    </div>
  );
}

function TipoEventoCard({ icono: Icono, nombre, sub, delay }: { icono: LucideIcon; nombre: string; sub: string; delay: number }) {
  return (
    <A delay={delay} style={{ flex: "1 1 220px", minWidth: 200 }}>
      <div style={{ height: "100%", borderRadius: 16, padding: "24px 22px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ marginBottom: 16 }}>
          <IconoMarco icono={Icono} tam={40} />
        </div>
        <p style={{ color: W, fontWeight: 800, fontSize: "clamp(15px, 1.6vw, 19px)", letterSpacing: "-0.02em", marginBottom: 8 }}>{nombre}</p>
        <p style={{ color: W_A(0.42), fontSize: "clamp(11px, 1vw, 13px)", lineHeight: 1.6 }}>{sub}</p>
      </div>
    </A>
  );
}

function SlideTiposEvento() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={FOTO.tiposEvento} opacity={0.08} />
      <RadialGlow x={78} y={40} intensity={0.05} />
      <div style={{ position: "relative", zIndex: 1, margin: "auto 0" }}>
        <SectionLabel delay={0}>Para qué eventos trabajamos</SectionLabel>
        <A delay={80}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.9rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 14 }}>
            La misma producción técnica, para cualquier tipo de evento.
          </h2>
        </A>
        <A delay={160}>
          <p style={{ color: W_A(0.45), fontSize: "clamp(0.85rem, 1.2vw, 1.05rem)", lineHeight: 1.7, maxWidth: 680, marginBottom: 36 }}>
            De un concierto a una boda, de un lanzamiento a un congreso.
          </p>
        </A>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <TipoEventoCard icono={Music} nombre="Musicales" sub="Conciertos · Festivales · DJ Sets" delay={260} />
          <TipoEventoCard icono={Heart} nombre="Sociales" sub="Bodas · XV años · Fiestas privadas" delay={330} />
          <TipoEventoCard icono={Building2} nombre="Empresariales" sub="Conferencias · Lanzamientos · Ferias" delay={400} />
          <TipoEventoCard icono={Sparkles} nombre="Otros eventos" sub="Deportivos · Teatro · Comedia · Prensa" delay={470} />
        </div>
      </div>
    </div>
  );
}

const ZONAS = [
  { ciudad: "Querétaro", detalle: "Base de operaciones", primary: true },
  { ciudad: "León", detalle: "El Bajío", primary: true },
  { ciudad: "Ciudad de México", detalle: "CDMX y ZMVM", primary: true },
  { ciudad: "San Miguel de Allende", detalle: "Guanajuato", primary: false },
  { ciudad: "Puebla", detalle: "Puebla · Tlaxcala", primary: false },
];

function SlideZonas() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={FOTO.zonas} opacity={0.08} />
      <RadialGlow x={22} y={55} intensity={0.05} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "auto 0" }}>
        <A delay={0} style={{ marginBottom: 24 }}>
          <IconoMarco icono={MapPin} />
        </A>
        <SectionLabel delay={80}>Dónde trabajamos</SectionLabel>
        <A delay={160}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 32, lineHeight: 1.1 }}>
            Presencia en el centro del país.<br />Alcance en toda la República.
          </h2>
        </A>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ZONAS.map((z, i) => (
            <A key={z.ciudad} delay={260 + i * 70}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 20px", borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: z.primary ? G : W_A(0.2), flexShrink: 0 }} />
                  <span style={{ color: z.primary ? W : W_A(0.55), fontWeight: 700, fontSize: "clamp(14px, 1.3vw, 17px)", letterSpacing: "-0.01em" }}>{z.ciudad}</span>
                </div>
                <span style={{ color: W_A(0.3), fontSize: 12 }}>{z.detalle}</span>
              </div>
            </A>
          ))}
        </div>
        <A delay={660}>
          <p style={{ color: W_A(0.3), fontSize: "clamp(12px, 1.05vw, 14px)", lineHeight: 1.7, marginTop: 24 }}>
            ¿Tu evento es fuera de estas ciudades? Nos desplazamos a cualquier punto de la República.
          </p>
        </A>
      </div>
    </div>
  );
}

function SlideParaQuien() {
  const items = [
    "Promotores y productores que necesitan producción lista a tiempo, sin sorpresas el día del evento.",
    "Venues y foros que buscan un aliado técnico confiable para cada evento que reciben.",
    "Familias organizando bodas o XV años, que quieren vivir la fiesta, no producirla.",
    "Empresas y agencias que necesitan presencia impecable en un lanzamiento o congreso.",
    "Colegas de renta que necesitan complementar equipo u operadores cuando el evento crece.",
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={FOTO.paraQuien} opacity={0.085} />
      <RadialGlow x={78} y={30} intensity={0.05} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "auto 0" }}>
        <A delay={0} style={{ marginBottom: 24 }}>
          <IconoMarco icono={Target} />
        </A>
        <SectionLabel delay={80}>A quién va dirigido</SectionLabel>
        <A delay={160}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 32, lineHeight: 1.1 }}>
            Quien organiza, y quien recibe el evento.
          </h2>
        </A>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((t, i) => (
            <A key={i} delay={260 + i * 80}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 20px", borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: G, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginTop: 2 }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ color: W_A(0.65), fontSize: "clamp(13px, 1.15vw, 15px)", lineHeight: 1.6 }}>{t}</span>
              </div>
            </A>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideProblemas() {
  const items = [
    "El equipo llega sin probar, y falla justo cuando más se necesita.",
    "Cada proveedor —audio, luz, video— trabaja por su cuenta, sin un responsable único.",
    "El sonido llega distinto según en qué parte del lugar estés.",
    "Nadie coordinó los horarios de montaje con el venue y los demás proveedores.",
    "La cotización no deja claro qué está incluido y qué no.",
    "Si algo se tuerce a media noche, no hay a quién llamar.",
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={FOTO.problemas} opacity={0.08} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(153,27,27,0.12) 0%, transparent 70%)" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 940, margin: "auto 0" }}>
        <A delay={0} style={{ marginBottom: 24 }}>
          <IconoMarco icono={AlertTriangle} color={RED} />
        </A>
        <SectionLabel delay={80} color={RED}>Los problemas que resolvemos</SectionLabel>
        <A delay={160}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.9rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 32 }}>
            Lo que pasa cuando nadie amarra la parte técnica.
          </h2>
        </A>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {items.map((t, i) => (
            <A key={i} delay={260 + i * 60}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "13px 18px", borderRadius: 12, background: "rgba(69,10,10,0.18)", border: "1px solid rgba(153,27,27,0.3)", height: "100%" }}>
                <AlertTriangle strokeWidth={2.2} style={{ width: 15, height: 15, color: RED, flexShrink: 0, marginTop: 2 }} />
                <span style={{ color: W_A(0.72), fontSize: "clamp(12px, 1.05vw, 14px)", lineHeight: 1.55 }}>{t}</span>
              </div>
            </A>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideSoluciones() {
  const items = [
    "Equipo propio, verificado en bodega antes de salir.",
    "Operadores que viven en escenario — no improvisan esa noche.",
    "Sistema diseñado para que el sonido llegue igual en cada rincón del lugar.",
    "Coordinamos horarios de montaje con el venue y los demás proveedores.",
    "Una cotización clara, y un solo punto de contacto del inicio al cierre.",
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={FOTO.soluciones} opacity={0.085} />
      <RadialGlow x={25} y={60} intensity={0.05} color={GREEN} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 940, margin: "auto 0" }}>
        <A delay={0} style={{ marginBottom: 24 }}>
          <IconoMarco icono={CheckCircle2} color={GREEN} />
        </A>
        <SectionLabel delay={80} color={GREEN}>Cómo lo resolvemos</SectionLabel>
        <A delay={160}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.9rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 32 }}>
            Un solo equipo, un solo responsable, un solo estándar.
          </h2>
        </A>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((t, i) => (
            <A key={i} delay={260 + i * 70}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 20px", borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <CheckCircle2 strokeWidth={2.2} style={{ width: 16, height: 16, color: GREEN, flexShrink: 0, marginTop: 2 }} />
                <span style={{ color: W_A(0.68), fontSize: "clamp(13px, 1.1vw, 15px)", lineHeight: 1.6 }}>{t}</span>
              </div>
            </A>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlianzaCard({ logo, nombre, desc, delay }: { logo: string; nombre: string; desc: string; delay: number }) {
  return (
    <A delay={delay} style={{ flex: 1, minWidth: 260 }}>
      <div style={{ height: "100%", borderRadius: 16, padding: "28px 26px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <Image src={logo} alt={nombre} width={40} height={40} style={{ width: 40, height: 40, borderRadius: 10, marginBottom: 14, objectFit: "contain" }} />
        <p style={{ color: G, fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 10 }}>{nombre}</p>
        <p style={{ color: W_A(0.6), fontSize: "clamp(12px, 1.1vw, 14.5px)", lineHeight: 1.75 }}>{desc}</p>
      </div>
    </A>
  );
}

function SlideAlianza() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={FOTO.alianza} opacity={0.08} />
      <RadialGlow x={80} y={70} intensity={0.045} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1040, margin: "auto 0" }}>
        <A delay={0} style={{ marginBottom: 24 }}>
          <IconoMarco icono={Link2} />
        </A>
        <SectionLabel delay={80}>Por qué trabajar con nosotros</SectionLabel>
        <A delay={160}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.9rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 16, lineHeight: 1.08 }}>
            Grupo Mainstage está detrás de cada evento.
          </h2>
        </A>
        <A delay={240}>
          <p style={{ color: W_A(0.42), fontSize: "clamp(0.85rem, 1.2vw, 1.02rem)", lineHeight: 1.75, maxWidth: 760, marginBottom: 32 }}>
            Pro es una de tres unidades del mismo grupo. Eso nos permite ofrecer algo que una renta independiente no puede.
          </p>
        </A>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <AlianzaCard
            logo="/logo-live.png"
            nombre="Mainstage Live"
            desc="Production, tour y stage management para giras completas. Si tu evento es una gira, Live coordina cada fecha con el mismo estándar de Pro."
            delay={340}
          />
          <AlianzaCard
            logo="/logo-creative.png"
            nombre="Mainstage Creative"
            desc="Diseño de iluminación, renders y documentación técnica. Creative diseña, y Pro lo ejecuta en piso."
            delay={410}
          />
        </div>
        <A delay={500}>
          <p style={{ color: W_A(0.3), fontSize: "clamp(12px, 1.05vw, 14px)", lineHeight: 1.7, maxWidth: 760 }}>
            Producción, diseño y equipo técnico hablan el mismo idioma porque vienen de la misma casa.
          </p>
        </A>
      </div>
    </div>
  );
}

function SlidePorQue() {
  const items = [
    { icono: ShieldCheck, t: "Equipo propio y verificado — no dependemos de terceros de último momento." },
    { icono: Rocket, t: "7+ años y más de 750 eventos resueltos, del concierto a la boda." },
    { icono: Workflow, t: "Un solo punto de contacto para audio, iluminación, video y operación." },
    { icono: Flame, t: "Llegas a disfrutar tu propio evento. Nosotros nos encargamos del resto." },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={FOTO.porQue} opacity={0.085} />
      <RadialGlow x={30} y={35} intensity={0.05} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 940, margin: "auto 0" }}>
        <A delay={0} style={{ marginBottom: 24 }}>
          <IconoMarco icono={Rocket} />
        </A>
        <SectionLabel delay={80}>Por qué Mainstage Pro</SectionLabel>
        <A delay={160}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.9rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 32, lineHeight: 1.1 }}>
            Resolvemos el problema antes de que exista.
          </h2>
        </A>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map(({ icono: Icono, t }, i) => (
            <A key={i} delay={260 + i * 80}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 20px", borderRadius: 12, background: G_A(0.045), border: `1px solid ${G_A(0.18)}` }}>
                <Icono strokeWidth={2} style={{ width: 17, height: 17, color: G, flexShrink: 0, marginTop: 1 }} />
                <span style={{ color: W_A(0.68), fontSize: "clamp(13px, 1.1vw, 15px)", lineHeight: 1.6 }}>{t}</span>
              </div>
            </A>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideCierre() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={FOTO.cierre} opacity={0.11} />
      <GridTexture />
      <RadialGlow intensity={0.08} />
      <PulseRings />
      <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 40px", margin: "auto" }}>
        <A delay={0}>
          <h1 style={{ fontSize: "clamp(1.8rem, 4.4vw, 3.6rem)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.04em", color: W, maxWidth: 820, margin: "0 auto 10px" }}>
            La técnica no debería ser la razón de que algo salga mal.
          </h1>
          <h1 style={{ fontSize: "clamp(1.8rem, 4.4vw, 3.6rem)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.04em", color: G, maxWidth: 820, margin: "0 auto 44px" }}>
            Debería ser la razón de que todo salga bien.
          </h1>
        </A>
        <A delay={280}>
          <div style={{ width: 80, height: 1, background: `linear-gradient(to right, transparent, ${G}, transparent)`, margin: "0 auto 26px" }} />
        </A>
        <A delay={380}>
          <p style={{ color: W_A(0.5), fontSize: "clamp(0.9rem, 1.5vw, 1.1rem)", marginBottom: 40 }}>
            Hablemos de tu próximo evento, o de tu próxima gira completa.
          </p>
        </A>
        <A delay={480} style={{ display: "flex", justifyContent: "center" }}>
          <a
            href={WA_CONTACTO}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 9, padding: "14px 28px", borderRadius: 999,
              background: G, color: "#0a0a0a", fontWeight: 700, fontSize: "clamp(13px, 1.1vw, 15px)",
              textDecoration: "none", letterSpacing: "-0.01em",
            }}
          >
            <MessageCircle strokeWidth={2.2} style={{ width: 17, height: 17 }} />
            Hablar por WhatsApp
          </a>
        </A>
        <A delay={620} style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
          <Image src="/logo-icon.png" alt="Mainstage Pro" width={64} height={64} style={{ width: 64, height: "auto", borderRadius: 14 }} />
        </A>
      </div>
    </div>
  );
}

/* ── Componente principal ── */
export default function PresentacionProClient() {
  const slides = useMemo<React.ReactNode[]>(
    () => [
      <SlidePortada key="portada" />,
      <SlideQuienesSomos key="quienes" />,
      <SlideQueNosMueve key="mueve" />,
      <SlideMision key="mision" />,
      <SlideVision key="vision" />,
      <SlideEstructura key="estructura" />,
      <SlideTiposEvento key="tipos" />,
      <SlideZonas key="zonas" />,
      <SlideParaQuien key="paraquien" />,
      <SlideProblemas key="problemas" />,
      <SlideSoluciones key="soluciones" />,
      <SlideAlianza key="alianza" />,
      <SlidePorQue key="porque" />,
      <SlideCierre key="cierre" />,
    ],
    []
  );

  const total = slides.length;
  const [slide, setSlide] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const touchX = useRef(0);

  const goTo = useCallback(
    (n: number) => {
      if (n < 0 || n >= total) return;
      setOpacity(0);
      setTimeout(() => {
        setSlide(n);
        setAnimKey(k => k + 1);
        setOpacity(1);
      }, 250);
    },
    [total]
  );

  const next = useCallback(() => goTo(slide + 1), [slide, goTo]);
  const prev = useCallback(() => goTo(slide - 1), [slide, goTo]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [next, prev]);

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) { if (dx > 0) next(); else prev(); }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: BG, color: W, fontFamily: FONT, overflow: "hidden", userSelect: "none" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        h1, h2 { text-wrap: balance; }
        @keyframes mspFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mspPulse { 0% { transform: scale(1); opacity: 0.45; } 100% { transform: scale(2.7); opacity: 0; } }
        button { font-family: inherit; }
        .nav-btn:hover { background: ${G_A(0.1)} !important; border-color: ${G_A(0.35)} !important; color: rgba(240,240,240,0.7) !important; }
      `}</style>

      <div style={{ position: "fixed", top: 18, left: 24, zIndex: 100, opacity: slide > 0 ? 0.65 : 0, transition: "opacity 0.5s ease", display: "flex", alignItems: "center", gap: 10, pointerEvents: "none" }}>
        <Image src="/logo-icon.png" alt="Mainstage Pro" width={22} height={22} style={{ width: 22, height: 22, borderRadius: 6 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: W_A(0.6) }}>Mainstage Pro</span>
      </div>

      <div style={{ position: "fixed", top: 18, right: 26, zIndex: 100, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ color: G, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em" }}>{String(slide + 1).padStart(2, "0")}</span>
          <span style={{ color: W_A(0.18), fontSize: 11 }}>/</span>
          <span style={{ color: W_A(0.18), fontSize: 11 }}>{total}</span>
        </div>
      </div>

      {slide > 0 && (
        <button
          className="nav-btn"
          onClick={prev}
          aria-label="Anterior"
          style={{ position: "fixed", left: 16, top: "50%", transform: "translateY(-50%)", zIndex: 100, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50%", width: 42, height: 42, cursor: "pointer", color: W_A(0.35), fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
        >
          ‹
        </button>
      )}

      {slide < total - 1 && (
        <button
          className="nav-btn"
          onClick={next}
          aria-label="Siguiente"
          style={{ position: "fixed", right: 16, top: "50%", transform: "translateY(-50%)", zIndex: 100, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50%", width: 42, height: 42, cursor: "pointer", color: W_A(0.35), fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
        >
          ›
        </button>
      )}

      <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 100, display: "flex", gap: 5, alignItems: "center", maxWidth: "70vw", flexWrap: "wrap", justifyContent: "center" }}>
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            style={{ width: i === slide ? 24 : 5, height: 5, borderRadius: 3, border: "none", cursor: "pointer", padding: 0, background: i === slide ? G : W_A(0.15), transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)" }}
          />
        ))}
      </div>

      <div key={animKey} style={{ width: "100%", height: "100%", opacity, transition: "opacity 0.25s ease" }}>
        {slides[slide]}
      </div>
    </div>
  );
}
