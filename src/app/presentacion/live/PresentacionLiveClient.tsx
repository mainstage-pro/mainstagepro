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
  Mic,
  Wallet,
  FileText,
  Workflow,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/* ── Design tokens: mismo lenguaje visual de Brandbook/Cultura — dorado como acento predominante ── */
const G = "#B3985B";
const G_A = (a: number) => `rgba(179,152,91,${a})`;
const W = "#F0F0F0";
const W_A = (a: number) => `rgba(240,240,240,${a})`;
const BG = "#080808";
const RED = "#f87171";
const GREEN = "#4ade80";
const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const WA_CONTACTO = "https://wa.me/524461432565?text=" + encodeURIComponent("Hola, vi la presentación de Mainstage Live y me gustaría más información para mi gira.");

const FOTO = {
  portada: "/images/presentacion/musicales/Musicales-140.jpg",
  quienesSomos: "/images/presentacion/operacion/crew-foh.jpg",
  queNosMueve: "/images/presentacion/musicales/Musicales-055.jpg",
  mision: "/images/presentacion/operacion/road-cases.jpg",
  vision: "/images/presentacion/musicales/Musicales-220.jpg",
  estructura: "/images/presentacion/operacion/consola-audio.jpg",
  paraQuien: "/images/presentacion/musicales/Musicales-045.jpg",
  problemas: "/images/presentacion/operacion/oficio-manos.jpg",
  soluciones: "/images/presentacion/musicales/Musicales-016.jpg",
  alianza: "/images/presentacion/musicales/Afrodise-59.jpg",
  porQue: "/images/presentacion/musicales/Musicales-154.jpg",
  cierre: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg",
};

/* ── Primitivas de animación y fondo (mismo patrón que Cultura) ── */
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
    <A delay={delay}>
      <p style={{ color, fontSize: "clamp(12px, 1.3vw, 16px)", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 20, textAlign: center ? "center" : "left" }}>
        {children}
      </p>
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
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(40px, 8vw, 120px)", position: "relative", overflow: "hidden" }}>
      <Foto src={foto} opacity={0.055} />
      <RadialGlow intensity={0.045} color={acento} />
      <div style={{ width: "100%", maxWidth: 940, textAlign: "center", position: "relative", zIndex: 1 }}>
        <A delay={0} style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>
          <IconoMarco icono={icono} color={acento} />
        </A>
        <SectionLabel delay={80} center color={acento}>{rotulo}</SectionLabel>
        <A delay={180}>
          <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 4.6rem)", fontWeight: 800, lineHeight: 1.02, letterSpacing: "-0.04em", color: W, marginBottom: 32 }}>
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
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <Foto src={FOTO.portada} opacity={0.09} />
      <GridTexture />
      <RadialGlow intensity={0.09} />
      <PulseRings />
      <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 40px" }}>
        <A delay={100} style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
          <Image src="/logo-live.png" alt="Mainstage Live" width={132} height={132} style={{ width: "clamp(88px, 11vw, 132px)", height: "auto", borderRadius: 26 }} priority />
        </A>
        <A delay={220}>
          <h1 style={{ fontSize: "clamp(2.6rem, 7vw, 6rem)", fontWeight: 800, letterSpacing: "-0.04em", color: W, lineHeight: 0.98, marginBottom: 28 }}>
            Mainstage <span style={{ color: G }}>Live</span>
          </h1>
        </A>
        <A delay={360}>
          <div style={{ width: "50%", height: 1, margin: "0 auto 28px", background: `linear-gradient(to right, transparent, ${G}, transparent)` }} />
        </A>
        <A delay={460}>
          <p style={{ color: W_A(0.6), fontSize: "clamp(1rem, 1.8vw, 1.3rem)", maxWidth: 560, margin: "0 auto 22px", lineHeight: 1.6 }}>
            Que tu producción suene tan grande como tu música.
          </p>
        </A>
        <A delay={580}>
          <p style={{ color: G, fontSize: "clamp(11px, 1.2vw, 14px)", fontWeight: 500, letterSpacing: "0.26em", textTransform: "uppercase" }}>
            Production · Tour · Stage Management
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

function SlideQuienesSomos() {
  return (
    <SlideDeclaracion
      rotulo="Quiénes somos"
      titulo={"No somos una agencia de producción más.\nSomos el equipo que falta en tu equipo."}
      cuerpo={
        "Nacemos dentro de Grupo Mainstage, el mismo grupo que ya produce cientos de shows al año. Nuestra misión: que la producción nunca sea la razón por la que algo sale mal.\n\nNo somos un proveedor que se va al terminar el show. Somos la parte del equipo que lo sostiene, del advance al stage call."
      }
      foto={FOTO.quienesSomos}
      icono={Users}
    />
  );
}

function SlideQueNosMueve() {
  return (
    <SlideDeclaracion
      rotulo="Qué nos mueve"
      titulo={"Que un artista crezca,\ny que su producción crezca con él."}
      cuerpo={
        "Lo vemos siempre: un artista explota, las fechas se multiplican, y el management termina apagando incendios de logística en vez de construir carrera.\n\nLa parte técnica de una carrera musical merece el mismo cuidado que la música. Crecer rápido y crecer bien no deberían ser dos cosas distintas."
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
      titulo="Que toquen como grandes, desde su primera gira."
      cuerpo={
        "Ser la estructura de producción que un artista emergente necesita para sonar como uno grande desde la primera fecha.\n\nSomos la extensión operativa del management: resolvemos, anticipamos y ejecutamos, para que ellos se enfoquen en lo único que nadie más puede hacer — el desarrollo del artista."
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
      titulo={"Crecer rápido y sonar bien\nno deberían ser opuestos."}
      cuerpo={
        "Ser el estándar de producción de la nueva generación de talento urbano en México — y acompañarla a cualquier escenario al que su música la lleve."
      }
      foto={FOTO.vision}
      icono={Telescope}
    />
  );
}

function ServicioCard({ icono: Icono, nombre, desc, delay }: { icono: LucideIcon; nombre: string; desc: string; delay: number }) {
  return (
    <A delay={delay} style={{ flex: 1, minWidth: 220 }}>
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
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflow: "hidden" }}>
      <Foto src={FOTO.estructura} opacity={0.06} />
      <RadialGlow x={20} y={40} intensity={0.05} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionLabel delay={0}>Cómo se estructura nuestro servicio</SectionLabel>
        <A delay={80}>
          <h2 style={{ fontSize: "clamp(1.8rem, 4.2vw, 3.4rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 14 }}>
            Tres servicios. Independientes. Combinables.
          </h2>
        </A>
        <A delay={160}>
          <p style={{ color: W_A(0.45), fontSize: "clamp(0.85rem, 1.2vw, 1.05rem)", lineHeight: 1.7, maxWidth: 680, marginBottom: 36 }}>
            Contratas uno, dos o los tres — y crecen cuando tú creces. Lo que no cambia es el estándar.
          </p>
        </A>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
          <ServicioCard
            icono={FileText}
            nombre="Production Management"
            desc="Advance técnico con el venue y proveedores locales, documentación técnica y logística de crew, resuelto antes de que el artista llegue."
            delay={260}
          />
          <ServicioCard
            icono={Wallet}
            nombre="Tour Management"
            desc="Presupuesto de gira, representación frente a promotores, caja y per diem, y decisiones de logística de alto nivel."
            delay={330}
          />
          <ServicioCard
            icono={Mic}
            nombre="Stage Management"
            desc="Stage call, crew de escenario, enlace con el venue en montaje y show, y resolución de contingencias en vivo."
            delay={400}
          />
        </div>
        <A delay={480}>
          <p style={{ color: W_A(0.3), fontSize: 12, letterSpacing: "0.04em" }}>
            + Add-ons: <span style={{ color: W_A(0.55) }}>Audio · Iluminación · Video/Visuales · Backline</span>
          </p>
        </A>
      </div>
    </div>
  );
}

function SlideParaQuien() {
  const items = [
    "Ya tocan en más de una ciudad y las fechas chocan entre sí en logística.",
    "Su management es brillante en carrera, pero no tiene por qué ser experto en advance, riders o presupuestos de gira.",
    "Cada show se siente distinto según quién les tocó esa noche en el venue.",
    "Están por dar el salto a festivales o giras largas, y necesitan la producción lista antes de que llegue.",
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflow: "hidden" }}>
      <Foto src={FOTO.paraQuien} opacity={0.06} />
      <RadialGlow x={78} y={30} intensity={0.05} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1000 }}>
        <A delay={0} style={{ marginBottom: 24 }}>
          <IconoMarco icono={Target} />
        </A>
        <SectionLabel delay={80}>A quién va dirigido</SectionLabel>
        <A delay={160}>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 3.2rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 32, lineHeight: 1.1 }}>
            Artistas urbanos emergentes en la zona donde más se pierde si nadie la cuida.
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
        <A delay={620}>
          <p style={{ color: W_A(0.3), fontSize: "clamp(12px, 1.05vw, 14px)", lineHeight: 1.7, maxWidth: 760, marginTop: 28 }}>
            El momento exacto en el que cómo se construye su producción define qué tan lejos y qué tan rápido pueden llegar.
          </p>
        </A>
      </div>
    </div>
  );
}

function SlideProblemas() {
  const items = [
    "El advance se hace por WhatsApp, un día antes, con quien conteste.",
    "Cada fecha tiene un nivel de producción distinto, según el promotor local.",
    "El management improvisa de tour manager entre llamadas de negocio.",
    "No hay documentación técnica — cada fecha se reinventa desde cero.",
    "Per diem, presupuesto y settlement se manejan a ojo.",
    "El salto a \"gira real\" expone todo esto al mismo tiempo.",
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflow: "hidden" }}>
      <Foto src={FOTO.problemas} opacity={0.055} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(153,27,27,0.12) 0%, transparent 70%)" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 940 }}>
        <A delay={0} style={{ marginBottom: 24 }}>
          <IconoMarco icono={AlertTriangle} color={RED} />
        </A>
        <SectionLabel delay={80} color={RED}>Los problemas que detectamos</SectionLabel>
        <A delay={160}>
          <h2 style={{ fontSize: "clamp(1.8rem, 4.2vw, 3.4rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 32 }}>
            Lo que vemos siempre, la primera vez que entramos a un proyecto.
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
    "Un estándar que viaja con ustedes, no que depende del venue de esa noche.",
    "Un solo punto de contacto para producción, de 1 show a 25 fechas.",
    "Caja de gira con control real: per diem, transporte, hospedaje, settlement.",
    "Documentación técnica que se queda con ustedes, gira tras gira.",
    "Empiezan con un servicio y suman los otros cuando lo necesiten.",
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflow: "hidden" }}>
      <Foto src={FOTO.soluciones} opacity={0.06} />
      <RadialGlow x={25} y={60} intensity={0.05} color={GREEN} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 940 }}>
        <A delay={0} style={{ marginBottom: 24 }}>
          <IconoMarco icono={CheckCircle2} color={GREEN} />
        </A>
        <SectionLabel delay={80} color={GREEN}>Cómo lo resolvemos</SectionLabel>
        <A delay={160}>
          <h2 style={{ fontSize: "clamp(1.8rem, 4.2vw, 3.4rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 32 }}>
            La misma estructura de un artista consolidado, desde el día uno.
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
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflow: "hidden" }}>
      <Foto src={FOTO.alianza} opacity={0.055} />
      <RadialGlow x={80} y={70} intensity={0.045} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1040 }}>
        <A delay={0} style={{ marginBottom: 24 }}>
          <IconoMarco icono={Link2} />
        </A>
        <SectionLabel delay={80}>Por qué trabajar con nosotros</SectionLabel>
        <A delay={160}>
          <h2 style={{ fontSize: "clamp(1.8rem, 4.2vw, 3.4rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 16, lineHeight: 1.08 }}>
            No llegamos solos. Llegamos con todo Grupo Mainstage detrás.
          </h2>
        </A>
        <A delay={240}>
          <p style={{ color: W_A(0.42), fontSize: "clamp(0.85rem, 1.2vw, 1.02rem)", lineHeight: 1.75, maxWidth: 760, marginBottom: 32 }}>
            Live es una de tres unidades del mismo grupo — eso nos permite ofrecer algo que ningún tour manager independiente puede ofrecer solo.
          </p>
        </A>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <AlianzaCard
            logo="/logo-icon.png"
            nombre="Mainstage Pro"
            desc="Backline, audio e iluminación complementaria con acceso directo al inventario y estándar de la operación de renta técnica del grupo."
            delay={340}
          />
          <AlianzaCard
            logo="/logo-creative.png"
            nombre="Mainstage Creative"
            desc="Diseño de iluminación, renders y documentación técnica. Creative diseña, y Live lo ejecuta en piso, fecha tras fecha."
            delay={410}
          />
        </div>
        <A delay={500}>
          <p style={{ color: W_A(0.3), fontSize: "clamp(12px, 1.05vw, 14px)", lineHeight: 1.7, maxWidth: 760 }}>
            Producción, diseño y equipo técnico hablan el mismo idioma porque vienen de la misma casa. Cero fricción entre lo que se diseñó y lo que pasa la noche del show.
          </p>
        </A>
      </div>
    </div>
  );
}

function SlidePorQue() {
  const items = [
    { icono: Workflow, t: "Entendemos tu proyecto, no solo tu rider — se nota desde la primera fecha." },
    { icono: Rocket, t: "Crecemos con la velocidad real de tu carrera: un show, una gira corta, una gira nacional." },
    { icono: Flame, t: "Te devolvemos el tiempo que hoy gastas en logística, para ponerlo en el desarrollo del artista." },
    { icono: ShieldCheck, t: "Cuando algo se tuerce en gira, tienes a alguien que ya lo resolvió antes." },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflow: "hidden" }}>
      <Foto src={FOTO.porQue} opacity={0.06} />
      <RadialGlow x={30} y={35} intensity={0.05} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 940 }}>
        <A delay={0} style={{ marginBottom: 24 }}>
          <IconoMarco icono={Rocket} />
        </A>
        <SectionLabel delay={80}>Por qué hacernos parte de tu equipo</SectionLabel>
        <A delay={160}>
          <h2 style={{ fontSize: "clamp(1.8rem, 4.2vw, 3.4rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 32, lineHeight: 1.1 }}>
            No somos un proveedor que contratas por show. Somos el equipo que se queda.
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
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <Foto src={FOTO.cierre} opacity={0.08} />
      <GridTexture />
      <RadialGlow intensity={0.08} />
      <PulseRings />
      <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 40px" }}>
        <A delay={0}>
          <p style={{ color: W_A(0.42), fontSize: "clamp(0.95rem, 1.8vw, 1.3rem)", lineHeight: 1.7, maxWidth: 760, margin: "0 auto 40px" }}>
            La producción no debería ser lo que detiene tu crecimiento.
          </p>
          <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 5rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.04em", color: G, maxWidth: 820, margin: "0 auto 44px" }}>
            Debería ser lo que lo sostiene.
          </h1>
        </A>
        <A delay={280}>
          <div style={{ width: 80, height: 1, background: `linear-gradient(to right, transparent, ${G}, transparent)`, margin: "0 auto 26px" }} />
        </A>
        <A delay={380}>
          <p style={{ color: W_A(0.5), fontSize: "clamp(0.9rem, 1.5vw, 1.1rem)", marginBottom: 40 }}>
            Hablemos de tu próxima fecha, o de tu próxima gira completa.
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
          <Image src="/logo-live.png" alt="Mainstage Live" width={64} height={64} style={{ width: 64, height: "auto", borderRadius: 14 }} />
        </A>
      </div>
    </div>
  );
}

/* ── Componente principal ── */
export default function PresentacionLiveClient() {
  const slides = useMemo<React.ReactNode[]>(
    () => [
      <SlidePortada key="portada" />,
      <SlideQuienesSomos key="quienes" />,
      <SlideQueNosMueve key="mueve" />,
      <SlideMision key="mision" />,
      <SlideVision key="vision" />,
      <SlideEstructura key="estructura" />,
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
    if (Math.abs(dx) > 50) dx > 0 ? next() : prev();
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
        @keyframes mspFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mspPulse { 0% { transform: scale(1); opacity: 0.45; } 100% { transform: scale(2.7); opacity: 0; } }
        button { font-family: inherit; }
        .nav-btn:hover { background: ${G_A(0.1)} !important; border-color: ${G_A(0.35)} !important; color: rgba(240,240,240,0.7) !important; }
      `}</style>

      <div style={{ position: "fixed", top: 18, left: 24, zIndex: 100, opacity: slide > 0 ? 0.65 : 0, transition: "opacity 0.5s ease", display: "flex", alignItems: "center", gap: 10, pointerEvents: "none" }}>
        <Image src="/logo-live.png" alt="Mainstage Live" width={22} height={22} style={{ width: 22, height: 22, borderRadius: 6 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: W_A(0.6) }}>Mainstage Live</span>
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
