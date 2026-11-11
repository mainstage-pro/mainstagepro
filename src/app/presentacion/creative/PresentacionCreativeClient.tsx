"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import {
  Eye,
  Lightbulb,
  Crosshair,
  Telescope,
  Target,
  AlertTriangle,
  CheckCircle2,
  Link2,
  Rocket,
  MessageCircle,
  Workflow,
  Clock,
  RefreshCw,
  ShieldCheck,
  PenTool,
  Layers,
  Gem,
  FileText,
  Layout,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

/* ── Design tokens: mismo lenguaje visual de Brandbook/Cultura/Live — dorado como acento predominante ── */
const G = "#B3985B";
const G_A = (a: number) => `rgba(179,152,91,${a})`;
const W = "#F0F0F0";
const W_A = (a: number) => `rgba(240,240,240,${a})`;
const BG = "#080808";
const RED = "#f87171";
const GREEN = "#4ade80";
const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const WA_CONTACTO = "https://wa.me/524461432565?text=" + encodeURIComponent("Hola, vi la presentación de Mainstage Creative y me gustaría más información para mi show.");

// Renders reales de Mainstage Creative (banco transversal /ventas/configuracion/tipos-evento → RenderComercial).
const FOTO = {
  portada: "https://h3qmxgz93fcfnngh.public.blob.vercel-storage.com/WhatsApp%20Image%202026-07-21%20at%2019.46.52-6deHE1nzvyOvH3fiey0dDnAamUvUWl.jpeg",
  quienesSomos: "https://h3qmxgz93fcfnngh.public.blob.vercel-storage.com/1%20copia%202-Qy6Ws4DZXM6Mf7DvoUXZGCVyjkz9tv.jpg",
  queNosMueve: "https://h3qmxgz93fcfnngh.public.blob.vercel-storage.com/4-STjXaxKb1QQnkRaDfolT5szk2s4yqh.jpg",
  mision: "https://h3qmxgz93fcfnngh.public.blob.vercel-storage.com/2-KkQrs1aXd0QE9ADwGtz8QYZPbw4F2g.jpg",
  vision: "https://h3qmxgz93fcfnngh.public.blob.vercel-storage.com/1-zDqLxo74w5SoTkCmfNeqlVsqJcRorg.jpg",
  estructura: "https://h3qmxgz93fcfnngh.public.blob.vercel-storage.com/3-gJzLRbfe4MsoIm4hNg0qh0ddgAdntm.jpg",
  proceso: "https://h3qmxgz93fcfnngh.public.blob.vercel-storage.com/WhatsApp%20Image%202026-07-21%20at%2018.47.33-VIq7kkhstIW5rW8dPScl2sHnyHHza5.jpeg",
  paraQuien: "https://h3qmxgz93fcfnngh.public.blob.vercel-storage.com/2%20copia%202-oq45ayGt5ztpEHuiLSpVo2AeA3Uf3G.jpg",
  problemas: "https://h3qmxgz93fcfnngh.public.blob.vercel-storage.com/1-EK3mFDFw8vP0DLHtpSW3yQD3BHVzQX.png",
  soluciones: "https://h3qmxgz93fcfnngh.public.blob.vercel-storage.com/4-COj8StjSNCWhWKaoYExiIP3JN7ph7z.png",
  alianza: "https://h3qmxgz93fcfnngh.public.blob.vercel-storage.com/1-nw6F6rhdWHH1A7Lz2rRdtpGXMF6fA3.jpg",
  porQue: "https://h3qmxgz93fcfnngh.public.blob.vercel-storage.com/WhatsApp%20Image%202026-07-21%20at%2010.56.32-hp786JsbCoL3v2nrkSg7X7xuP7SMui.jpeg",
  cierre: "https://h3qmxgz93fcfnngh.public.blob.vercel-storage.com/5-yfN6yvz0cTczRfVk4ICyvVjCoRLp29.jpg",
};

/* ── Primitivas de animación y fondo (mismo patrón que Live/Cultura) ── */
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
          <h1 style={{ fontSize: "clamp(2rem, 4.4vw, 4rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.04em", color: W, marginBottom: 32 }}>
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
          <Image src="/logo-creative.png" alt="Mainstage Creative" width={132} height={132} style={{ width: "clamp(88px, 11vw, 132px)", height: "auto", borderRadius: 26 }} priority />
        </A>
        <A delay={220}>
          <h1 style={{ fontSize: "clamp(2.6rem, 7vw, 6rem)", fontWeight: 800, letterSpacing: "-0.04em", color: W, lineHeight: 0.98, marginBottom: 28 }}>
            Mainstage <span style={{ color: G }}>Creative</span>
          </h1>
        </A>
        <A delay={360}>
          <div style={{ width: "50%", height: 1, margin: "0 auto 28px", background: `linear-gradient(to right, transparent, ${G}, transparent)` }} />
        </A>
        <A delay={460}>
          <p style={{ color: W_A(0.6), fontSize: "clamp(1rem, 1.8vw, 1.3rem)", maxWidth: 560, margin: "0 auto 22px", lineHeight: 1.6 }}>
            El show, visible antes de montarlo.
          </p>
        </A>
        <A delay={580}>
          <p style={{ color: G, fontSize: "clamp(11px, 1.2vw, 14px)", fontWeight: 500, letterSpacing: "0.26em", textTransform: "uppercase" }}>
            Diseño de iluminación · Renders 3D · Documentación técnica
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
      titulo={"No vendemos una imagen bonita.\nVendemos el show que se monta."}
      cuerpo={
        "Nacimos dentro de Grupo Mainstage, que ya produce cientos de shows al año — y que con Mainstage Live, ejecuta en piso lo que aquí se diseña. Entregamos el render junto con el patch, el plot y el fixture schedule: todo lo que un montaje real necesita."
      }
      foto={FOTO.quienesSomos}
      icono={Eye}
    />
  );
}

function SlideQueNosMueve() {
  return (
    <SlideDeclaracion
      rotulo="Qué nos mueve"
      titulo={"Que el render en pantalla\nsea el show real en el escenario."}
      cuerpo={
        "Vemos renders espectaculares que nadie puede montar porque no traen patch, plot ni fixture schedule. Un diseño que no se puede ejecutar no es diseño — es una imagen bonita."
      }
      foto={FOTO.queNosMueve}
      icono={Lightbulb}
    />
  );
}

function SlideMision() {
  return (
    <SlideDeclaracion
      rotulo="Misión"
      titulo="Que cualquier show se vea tan grande como se diseñó."
      cuerpo={
        "Entregamos el render, el patch y los planos de cada show, listos para montarse igual en cualquier venue."
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
      titulo={"Ser el estándar de diseño técnico\nde la nueva generación de shows en México."}
      cuerpo={
        "Que ningún show tenga que elegir entre verse increíble y poder montarse de verdad. Las dos cosas se diseñan juntas."
      }
      foto={FOTO.vision}
      icono={Telescope}
    />
  );
}

function NivelCard({ icono: Icono, nivel, desc, delay }: { icono: LucideIcon; nivel: string; desc: string; delay: number }) {
  return (
    <A delay={delay} style={{ flex: 1, minWidth: 220 }}>
      <div style={{ height: "100%", borderRadius: 16, padding: "26px 24px", background: G_A(0.05), border: `1px solid ${G_A(0.2)}` }}>
        <div style={{ marginBottom: 16 }}>
          <IconoMarco icono={Icono} tam={40} />
        </div>
        <p style={{ color: G, fontWeight: 800, fontSize: "clamp(16px, 1.8vw, 21px)", letterSpacing: "-0.02em", marginBottom: 12 }}>Nivel {nivel}</p>
        <p style={{ color: W_A(0.55), fontSize: "clamp(12px, 1.05vw, 14px)", lineHeight: 1.7 }}>{desc}</p>
      </div>
    </A>
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
        <SectionLabel delay={0}>Qué hacemos</SectionLabel>
        <A delay={80}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.9rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 14 }}>
            Del concepto al plano, listo para montarse.
          </h2>
        </A>
        <A delay={160}>
          <p style={{ color: W_A(0.45), fontSize: "clamp(0.85rem, 1.2vw, 1.05rem)", lineHeight: 1.7, maxWidth: 680, marginBottom: 36 }}>
            Un servicio, tres entregables conectados — no piezas sueltas.
          </p>
        </A>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <ServicioCard
            icono={FileText}
            nombre="Conceptualización"
            desc="Partimos de tu brief: rider, referencias y la dirección creativa del show."
            delay={260}
          />
          <ServicioCard
            icono={Layout}
            nombre="Diseño de escenario y renders"
            desc="El render de cómo se va a ver el show, ajustado al escenario real del venue."
            delay={330}
          />
          <ServicioCard
            icono={ClipboardList}
            nombre="Plots de producción"
            desc="Patch, plot y fixture schedule — la documentación para montarlo igual en cualquier venue."
            delay={400}
          />
        </div>
      </div>
    </div>
  );
}

function SlideNiveles() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={FOTO.estructura} opacity={0.085} />
      <RadialGlow x={78} y={40} intensity={0.05} />
      <div style={{ position: "relative", zIndex: 1, margin: "auto 0" }}>
        <SectionLabel delay={0}>Niveles de servicio</SectionLabel>
        <A delay={80}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.9rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 14 }}>
            Tres niveles. Mismo estándar, mismo cuidado.
          </h2>
        </A>
        <A delay={160}>
          <p style={{ color: W_A(0.45), fontSize: "clamp(0.85rem, 1.2vw, 1.05rem)", lineHeight: 1.7, maxWidth: 680, marginBottom: 36 }}>
            El nivel depende del rig, no del tipo de evento. Documentación técnica incluida siempre, en los tres.
          </p>
        </A>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
          <NivelCard
            icono={PenTool}
            nivel="A"
            desc="Shows de una fecha o rigs compactos. Entrega en 1 día hábil."
            delay={260}
          />
          <NivelCard
            icono={Layers}
            nivel="AA"
            desc="Giras cortas y rigs con más de un elemento escénico. Entrega en 2 días hábiles."
            delay={330}
          />
          <NivelCard
            icono={Gem}
            nivel="AAA"
            desc="Rigs grandes, festivales y shows con escenografía propia. Entrega en 3 días hábiles."
            delay={400}
          />
        </div>
        <A delay={480}>
          <p style={{ color: W_A(0.3), fontSize: 12, letterSpacing: "0.04em" }}>
            + Add-ons: <span style={{ color: W_A(0.55) }}>Audio · Pantallas LED · Stage/entarimado · Rigging · Estructuras adicionales · Modelado de venue</span>
          </p>
        </A>
      </div>
    </div>
  );
}

function SlideProceso() {
  const items = [
    { t: "Brief", d: "Nos mandas el rider, las referencias y el rig que tienes en mente." },
    { t: "Render + documentación", d: "Imagen del show, patch, plot y fixture schedule — siempre juntos, nunca por separado." },
    { t: "Revisiones", d: "3 rondas de ajustes incluidas en cualquier nivel, sin letra chica." },
    { t: "Entrega ejecutable", d: "El archivo final que cualquier casa de producción puede montar, en el venue que sea." },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={FOTO.proceso} opacity={0.08} />
      <RadialGlow x={75} y={55} intensity={0.05} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 940, margin: "auto 0" }}>
        <A delay={0} style={{ marginBottom: 24 }}>
          <IconoMarco icono={Workflow} />
        </A>
        <SectionLabel delay={80}>Cómo trabajamos</SectionLabel>
        <A delay={160}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.9rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 32, lineHeight: 1.1 }}>
            De tu rider a un show montable, en días — no semanas.
          </h2>
        </A>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map(({ t, d }, i) => (
            <A key={i} delay={260 + i * 80}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "14px 20px", borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: G, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginTop: 2, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ color: W_A(0.68), fontSize: "clamp(13px, 1.1vw, 15px)", lineHeight: 1.6 }}>
                  <strong style={{ color: W_A(0.88), fontWeight: 700 }}>{t}.</strong> {d}
                </span>
              </div>
            </A>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideParaQuien() {
  const items = [
    "Van a presentarle el show a un promotor o festival y necesitan mostrarlo, no describirlo.",
    "Tienen el rider, pero nadie lo tradujo en algo visual y ejecutable.",
    "Tocan en distintos venues y necesitan que el diseño se monte igual en todos.",
    "Van a dejar el show improvisado por uno con identidad visual propia.",
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
            Shows que hay que mostrar antes de poder venderlos.
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
    "El diseño vive en la cabeza del LD, no en un documento que otros puedan usar.",
    "El render se ve increíble — y nadie puede montarlo con eso.",
    "Cada venue interpreta la idea distinto porque no hay un plot que seguir.",
    "Los cambios de último minuto no quedan registrados en ninguna versión.",
    "No hay fixture schedule ni patch — se improvisa el día del montaje.",
    "Vender un show sin poder mostrarlo primero, a ciegas.",
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={FOTO.problemas} opacity={0.08} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(153,27,27,0.12) 0%, transparent 70%)" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 940, margin: "auto 0" }}>
        <A delay={0} style={{ marginBottom: 24 }}>
          <IconoMarco icono={AlertTriangle} color={RED} />
        </A>
        <SectionLabel delay={80} color={RED}>Los problemas que detectamos</SectionLabel>
        <A delay={160}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.9rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 32 }}>
            Lo que vemos cuando el diseño se queda solo en una cabeza.
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
    "Documentación técnica incluida siempre, nunca como extra opcional.",
    "Versionado controlado: cada cambio queda registrado, nada se pierde.",
    "Un estándar de diseño que viaja contigo, venue tras venue.",
    "Revisiones incluidas en cada nivel, sin fricción por un ajuste razonable.",
    "SLA de 1 a 3 días hábiles según el tamaño del rig — sabes cuándo lo tienes.",
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
            Un diseño que se muestra, se vende y se monta.
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
            Grupo Mainstage está detrás de cada render.
          </h2>
        </A>
        <A delay={240}>
          <p style={{ color: W_A(0.42), fontSize: "clamp(0.85rem, 1.2vw, 1.02rem)", lineHeight: 1.75, maxWidth: 760, marginBottom: 32 }}>
            Creative es una de tres unidades de Grupo Mainstage — el render nace con el inventario real detrás.
          </p>
        </A>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <AlianzaCard
            logo="/logo-icon.png"
            nombre="Mainstage Pro"
            desc="El inventario real detrás de cada render — lo que diseñamos existe y se puede rentar."
            delay={340}
          />
          <AlianzaCard
            logo="/logo-live.png"
            nombre="Mainstage Live"
            desc="Creative diseña, Live lo ejecuta en piso, fecha tras fecha."
            delay={410}
          />
        </div>
        <A delay={500}>
          <p style={{ color: W_A(0.3), fontSize: "clamp(12px, 1.05vw, 14px)", lineHeight: 1.7, maxWidth: 760 }}>
            Diseño, producción y equipo técnico hablan el mismo idioma porque vienen de la misma casa.
          </p>
        </A>
      </div>
    </div>
  );
}

function SlidePorQue() {
  const items = [
    { icono: Workflow, t: "Sabemos qué es ejecutable: el mismo grupo produce shows en vivo cada fin de semana." },
    { icono: Clock, t: "SLA claro desde el día uno: 1, 2 o 3 días hábiles según el rig, sin sorpresas." },
    { icono: RefreshCw, t: "Revisiones incluidas, no un lujo que se cobra aparte a la primera corrección." },
    { icono: ShieldCheck, t: "Documentación técnica que se queda contigo, show tras show — no un archivo que se pierde." },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)", position: "relative", overflowY: "auto", overflowX: "hidden" }}>
      <Foto src={FOTO.porQue} opacity={0.085} />
      <RadialGlow x={30} y={35} intensity={0.05} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 940, margin: "auto 0" }}>
        <A delay={0} style={{ marginBottom: 24 }}>
          <IconoMarco icono={Rocket} />
        </A>
        <SectionLabel delay={80}>Por qué Mainstage Creative</SectionLabel>
        <A delay={160}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.9rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, marginBottom: 32, lineHeight: 1.1 }}>
            Entregamos un show montable, no solo una imagen.
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
          <p style={{ color: W_A(0.42), fontSize: "clamp(0.95rem, 1.8vw, 1.3rem)", lineHeight: 1.7, maxWidth: 760, margin: "0 auto 40px" }}>
            Un show no debería perder fuerza entre la idea y el escenario.
          </p>
          <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 5rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.04em", color: G, maxWidth: 820, margin: "0 auto 44px" }}>
            Debería llegar intacto.
          </h1>
        </A>
        <A delay={280}>
          <div style={{ width: 80, height: 1, background: `linear-gradient(to right, transparent, ${G}, transparent)`, margin: "0 auto 26px" }} />
        </A>
        <A delay={380}>
          <p style={{ color: W_A(0.5), fontSize: "clamp(0.9rem, 1.5vw, 1.1rem)", marginBottom: 40 }}>
            Hablemos de tu próximo show, o de tu próxima gira completa.
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
          <Image src="/logo-creative.png" alt="Mainstage Creative" width={64} height={64} style={{ width: 64, height: "auto", borderRadius: 14 }} />
        </A>
      </div>
    </div>
  );
}

/* ── Componente principal ── */
export default function PresentacionCreativeClient() {
  const slides = useMemo<React.ReactNode[]>(
    () => [
      <SlidePortada key="portada" />,
      <SlideQuienesSomos key="quienes" />,
      <SlideQueNosMueve key="mueve" />,
      <SlideMision key="mision" />,
      <SlideVision key="vision" />,
      <SlideEstructura key="estructura" />,
      <SlideNiveles key="niveles" />,
      <SlideProceso key="proceso" />,
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
        h1, h2 { text-wrap: balance; }
        @keyframes mspFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mspPulse { 0% { transform: scale(1); opacity: 0.45; } 100% { transform: scale(2.7); opacity: 0; } }
        button { font-family: inherit; }
        .nav-btn:hover { background: ${G_A(0.1)} !important; border-color: ${G_A(0.35)} !important; color: rgba(240,240,240,0.7) !important; }
      `}</style>

      <div style={{ position: "fixed", top: 18, left: 24, zIndex: 100, opacity: slide > 0 ? 0.65 : 0, transition: "opacity 0.5s ease", display: "flex", alignItems: "center", gap: 10, pointerEvents: "none" }}>
        <Image src="/logo-creative.png" alt="Mainstage Creative" width={22} height={22} style={{ width: 22, height: 22, borderRadius: 6 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: W_A(0.6) }}>Mainstage Creative</span>
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
