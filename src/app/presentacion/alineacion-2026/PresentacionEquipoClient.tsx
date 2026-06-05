"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS  (brand colors from logo)
───────────────────────────────────────────────────────────── */
const G   = "#AA9040";                          // brand gold
const G_A = (a: number) => `rgba(170,144,64,${a})`;
const W   = "#F0F0F0";
const W_A = (a: number) => `rgba(240,240,240,${a})`;
const BG  = "#080808";
const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const TOTAL = 13;

/* ─────────────────────────────────────────────────────────────
   ANIMATION WRAPPER
───────────────────────────────────────────────────────────── */
function A({
  children, delay = 0, style: ext = {}, className = "",
}: {
  children: React.ReactNode; delay?: number;
  style?: React.CSSProperties; className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        animation: `mspFadeUp 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms both`,
        ...ext,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SHARED SUBCOMPONENTS
───────────────────────────────────────────────────────────── */

/** Large section label — PROPÓSITO / VISIÓN / MISIÓN etc. */
function SectionLabel({
  children, delay = 0, center = false,
}: { children: React.ReactNode; delay?: number; center?: boolean }) {
  return (
    <A delay={delay}>
      <p style={{
        color: G,
        fontSize: "clamp(13px, 1.4vw, 18px)",
        fontWeight: 500,
        letterSpacing: "0.28em",
        textTransform: "uppercase",
        marginBottom: 20,
        textAlign: center ? "center" : "left",
      }}>
        {children}
      </p>
    </A>
  );
}

function GoldLine({ delay = 0, width = 48, center = false }: { delay?: number; width?: number; center?: boolean }) {
  return (
    <A delay={delay} style={{ display: "flex", justifyContent: center ? "center" : "flex-start" }}>
      <div style={{ width, height: 1.5, background: G, marginBottom: 28 }} />
    </A>
  );
}

function NumberedItem({
  n, title, body, delay = 0, gold = false,
}: { n: string; title: string; body: string; delay?: number; gold?: boolean }) {
  return (
    <A delay={delay}>
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 20,
        padding: "15px 0",
        borderBottom: `1px solid ${G_A(0.07)}`,
      }}>
        <span style={{
          flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: gold ? G_A(0.18) : G_A(0.07),
          color: G, fontSize: 10, fontWeight: 700,
        }}>{n}</span>
        <div>
          <p style={{ color: W, fontWeight: 700, fontSize: "clamp(14px, 1.4vw, 17px)", marginBottom: 4 }}>{title}</p>
          <p style={{ color: W_A(0.45), fontSize: "clamp(12px, 1.1vw, 14px)", lineHeight: 1.65 }}>{body}</p>
        </div>
      </div>
    </A>
  );
}

/* ─────────────────────────────────────────────────────────────
   DECORATIVE BACKGROUNDS
───────────────────────────────────────────────────────────── */
function GridTexture() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      backgroundImage: `linear-gradient(${G_A(1)} 1px,transparent 1px),linear-gradient(90deg,${G_A(1)} 1px,transparent 1px)`,
      backgroundSize: "80px 80px", opacity: 0.022,
    }} />
  );
}
function RadialGlow({ x = 50, y = 50, intensity = 0.05 }: { x?: number; y?: number; intensity?: number }) {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      background: `radial-gradient(ellipse 70% 60% at ${x}% ${y}%, ${G_A(intensity)} 0%, transparent 70%)`,
    }} />
  );
}
function PulseRings({ size = 280, step = 130, count = 3 }: { size?: number; step?: number; count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: size + i * step, height: size + i * step,
          borderRadius: "50%",
          border: `1px solid ${G_A(0.12 - i * 0.03)}`,
          animation: `mspPulse ${3.5 + i * 0.9}s ease-out ${i * 1.1}s infinite`,
          pointerEvents: "none",
        }} />
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 01 — PORTADA
───────────────────────────────────────────────────────────── */
function Slide01() {
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      <GridTexture />
      <RadialGlow intensity={0.07} />
      <PulseRings />

      <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 40px" }}>
        {/* Real logo */}
        <A delay={100} style={{ display: "flex", justifyContent: "center", marginBottom: 52 }}>
          <Image
            src="/logo-white.png"
            alt="Mainstage Pro"
            width={460}
            height={90}
            style={{ width: "clamp(260px, 32vw, 460px)", height: "auto" }}
            priority
          />
        </A>

        {/* Divider */}
        <A delay={300}>
          <div style={{
            width: "50%", height: 1, margin: "0 auto 32px",
            background: `linear-gradient(to right, transparent, ${G}, transparent)`,
          }} />
        </A>

        {/* Subtitle */}
        <A delay={440}>
          <p style={{
            color: G, fontSize: "clamp(11px, 1.2vw, 14px)", fontWeight: 500,
            letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 16,
          }}>
            Alineación Estratégica · 2026
          </p>
        </A>

        {/* Region */}
        <A delay={600}>
          <p style={{ color: W_A(0.18), fontSize: "clamp(10px, 1vw, 12px)", letterSpacing: "0.3em" }}>
            Querétaro · CDMX · Bajío
          </p>
        </A>

        {/* Hint */}
        <A delay={900}>
          <p style={{ marginTop: 60, color: W_A(0.12), fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase" }}>
            Presiona → para avanzar
          </p>
        </A>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 02 — PROPÓSITO INTRO  (centered, wide)
───────────────────────────────────────────────────────────── */
function Slide02() {
  return (
    <div style={{
      height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 clamp(40px, 8vw, 120px)",
      position: "relative", overflow: "hidden",
    }}>
      <RadialGlow x={50} y={50} intensity={0.04} />

      <div style={{ width: "100%", maxWidth: 900, textAlign: "center", position: "relative", zIndex: 1 }}>
        <SectionLabel delay={0} center>01 — Propósito</SectionLabel>

        <A delay={120}>
          <h1 style={{
            fontSize: "clamp(2.8rem, 6vw, 5.5rem)", fontWeight: 800, lineHeight: 1.0,
            letterSpacing: "-0.04em", color: W, marginBottom: 36,
          }}>
            Por qué existimos.
          </h1>
        </A>

        {/* Centered gold line */}
        <A delay={240}>
          <div style={{ width: 48, height: 1.5, background: G, margin: "0 auto 28px" }} />
        </A>

        <A delay={340}>
          <p style={{
            color: W_A(0.45), fontSize: "clamp(0.95rem, 1.6vw, 1.2rem)",
            lineHeight: 1.8, maxWidth: 640, margin: "0 auto",
          }}>
            Existimos por la pasión por los eventos en vivo — y por lo que un espectáculo
            bien producido puede generar en las personas.
          </p>
        </A>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 03 — PROPÓSITO DECLARACIÓN
───────────────────────────────────────────────────────────── */
function Slide03() {
  return (
    <div style={{
      height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 clamp(40px, 8vw, 120px)",
      position: "relative", overflow: "hidden",
    }}>
      <RadialGlow intensity={0.05} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/presentacion/musicales/Musicales-016.jpg" alt=""
        draggable={false} style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", opacity: 0.04, pointerEvents: "none",
        }} />

      <div style={{ maxWidth: 800, position: "relative", zIndex: 1 }}>
        <GoldLine delay={0} width={48} />
        <A delay={120}>
          <blockquote style={{
            fontSize: "clamp(1.8rem, 4.2vw, 3.8rem)", fontWeight: 700, lineHeight: 1.12,
            letterSpacing: "-0.03em", color: W, marginBottom: 36,
          }}>
            "Creamos experiencias<br />
            <span style={{ color: G }}>que generan impacto."</span>
          </blockquote>
        </A>
        <A delay={320}>
          <p style={{
            color: W_A(0.45), fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)",
            lineHeight: 1.75, maxWidth: 580,
          }}>
            Contribuimos a la experiencia desde la parte técnica — asegurando que el show
            funcione, suene, se vea y se viva al nivel que el proyecto merece.
          </p>
        </A>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 04 — VISIÓN  (centered, wide)
───────────────────────────────────────────────────────────── */
function Slide04() {
  return (
    <div style={{
      height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 clamp(40px, 8vw, 120px)",
      position: "relative", overflow: "hidden",
    }}>
      <RadialGlow x={50} y={50} intensity={0.04} />

      <div style={{ width: "100%", maxWidth: 900, textAlign: "center", position: "relative", zIndex: 1 }}>
        <SectionLabel delay={0} center>02 — Visión</SectionLabel>

        <A delay={120}>
          <h1 style={{
            fontSize: "clamp(2.8rem, 6vw, 5.5rem)", fontWeight: 800, lineHeight: 1.0,
            letterSpacing: "-0.04em", color: W, marginBottom: 36,
          }}>
            Hacia dónde vamos.
          </h1>
        </A>

        <A delay={240}>
          <div style={{ width: 48, height: 1.5, background: G, margin: "0 auto 28px" }} />
        </A>

        <A delay={340}>
          <p style={{
            color: W_A(0.45), fontSize: "clamp(0.95rem, 1.6vw, 1.2rem)",
            lineHeight: 1.8, maxWidth: 680, margin: "0 auto",
          }}>
            Ser el aliado técnico de confianza de marcas, artistas y promotores a nivel
            nacional — parte real de su equipo de producción, no solo un proveedor.
          </p>
        </A>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 05 — MISIÓN
───────────────────────────────────────────────────────────── */
function Slide05() {
  const cols = [
    { n: "01", title: "Claridad", body: "Desde la primera llamada hasta el último cable recogido." },
    { n: "02", title: "Confianza", body: "Equipos confiables, procesos claros, comunicación honesta." },
    { n: "03", title: "Consistencia", body: "Ejecución sin improvisación, sin sorpresas, en cada evento." },
  ];
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "clamp(40px, 6vh, 80px) clamp(48px, 8vw, 120px)",
    }}>
      <SectionLabel delay={0}>03 — Misión</SectionLabel>
      <A delay={100}>
        <h2 style={{
          fontSize: "clamp(2rem, 4.5vw, 3.8rem)", fontWeight: 800,
          letterSpacing: "-0.035em", color: W, marginBottom: 12,
        }}>
          Qué hacemos y cómo.
        </h2>
      </A>
      <A delay={200}>
        <p style={{
          color: W_A(0.45), fontSize: "clamp(0.9rem, 1.4vw, 1.05rem)",
          lineHeight: 1.7, marginBottom: 40, maxWidth: 560,
        }}>
          Potenciamos proyectos, artistas y marcas a través de la producción técnica
          impecable de sus eventos.
        </p>
      </A>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        {cols.map((c, i) => (
          <A key={c.n} delay={300 + i * 90}>
            <div style={{
              borderRadius: 16, padding: "28px 26px",
              background: i === 0 ? G_A(0.05) : "rgba(255,255,255,0.025)",
              border: `1px solid ${i === 0 ? G_A(0.16) : "rgba(255,255,255,0.06)"}`,
              height: "100%",
            }}>
              <p style={{ color: G, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", marginBottom: 16 }}>{c.n}</p>
              <p style={{ color: W, fontWeight: 700, fontSize: "clamp(18px, 2vw, 24px)", marginBottom: 12, letterSpacing: "-0.02em" }}>{c.title}</p>
              <p style={{ color: W_A(0.45), fontSize: "clamp(12px, 1.1vw, 14px)", lineHeight: 1.7 }}>{c.body}</p>
            </div>
          </A>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 06 — PROPUESTA DE VALOR
───────────────────────────────────────────────────────────── */
function Slide06() {
  const svcs = [
    {
      id: "L1", name: "Renta de Equipo",
      desc: "Inventario propio, disponible y respaldado.",
      para: "Empresas de producción, production managers y técnicos.",
      img: "/images/presentacion/sociales/s-hacienda-iluminada.jpg",
    },
    {
      id: "L2", name: "Producción Técnica",
      desc: "Planeación y ejecución completa del área técnica.",
      para: "Organizadores, marcas y artistas.",
      img: "/images/presentacion/empresariales/e-carpa-led.jpg",
    },
    {
      id: "L3", name: "Dirección Técnica",
      desc: "Involucramiento desde el inicio, responsabilidad total.",
      para: "Artistas y marcas con proyecto directo.",
      img: "/images/presentacion/musicales/DSC07491.jpg",
    },
  ];
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)",
    }}>
      <SectionLabel delay={0}>Propuesta de valor</SectionLabel>
      <A delay={80}>
        <h2 style={{
          fontSize: "clamp(1.8rem, 4vw, 3.4rem)", fontWeight: 800,
          letterSpacing: "-0.03em", color: W, marginBottom: 32,
        }}>
          La solución que cada proyecto necesita.
        </h2>
      </A>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, flex: 1, maxHeight: "52vh" }}>
        {svcs.map((s, i) => (
          <A key={s.id} delay={200 + i * 100} style={{ height: "100%" }}>
            <div style={{
              borderRadius: 16, overflow: "hidden", height: "100%",
              display: "flex", flexDirection: "column", position: "relative",
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <div style={{ position: "relative", height: "40%", flexShrink: 0, overflow: "hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.img} alt="" draggable={false}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(8,8,8,0.95) 0%, rgba(8,8,8,0.15) 70%)",
                }} />
                <p style={{ position: "absolute", bottom: 10, left: 18, color: G, fontSize: 10, fontWeight: 700, letterSpacing: "0.22em" }}>{s.id}</p>
              </div>
              <div style={{ flex: 1, padding: "20px 22px 22px", background: "rgba(255,255,255,0.025)" }}>
                <p style={{ color: G, fontWeight: 700, fontSize: "clamp(15px, 1.6vw, 20px)", marginBottom: 10, letterSpacing: "-0.01em" }}>{s.name}</p>
                <p style={{ color: W, fontSize: "clamp(12px, 1.1vw, 15px)", lineHeight: 1.6, marginBottom: 12 }}>{s.desc}</p>
                <p style={{ color: W_A(0.3), fontSize: 11 }}>
                  <span style={{ color: G_A(0.6), fontWeight: 600 }}>Para: </span>{s.para}
                </p>
              </div>
            </div>
          </A>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 07 — DIFERENCIADORES
───────────────────────────────────────────────────────────── */
function Slide07() {
  const items = [
    { title: "Calidad humana y cultura de servicio", body: "Actitud, respeto y profesionalismo bajo presión — siempre. El cliente lo siente desde la primera llamada hasta el cierre del evento." },
    { title: "Pasión genuina por los eventos", body: "Dentro de Mainstage trabajamos personas realmente apasionadas por los shows. Eso se nota en la calidad de cada entrega." },
    { title: "Soluciones integrales de producción", body: "Capacidad técnica y humana para resolver cualquier necesidad — desde un equipo puntual hasta una dirección técnica completa." },
    { title: "Ritmo y seguimiento", body: "Procesos claros y comunicación constante que mantienen orden y personalización en cada proyecto, sin importar su escala." },
  ];
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)",
    }}>
      <SectionLabel delay={0}>El estándar que representamos</SectionLabel>
      <A delay={80}>
        <h2 style={{
          fontSize: "clamp(1.8rem, 4.5vw, 3.8rem)", fontWeight: 800,
          letterSpacing: "-0.035em", color: W, marginBottom: 28,
        }}>
          Así operamos.
        </h2>
      </A>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 14, flex: 1, maxHeight: "58vh" }}>
        {items.map((item, i) => (
          <A key={i} delay={160 + i * 70} style={{ height: "100%" }}>
            <div style={{
              borderRadius: 14, padding: "22px 26px", height: "100%",
              background: i % 2 === 0 ? G_A(0.045) : "rgba(255,255,255,0.025)",
              border: `1px solid ${i % 2 === 0 ? G_A(0.15) : "rgba(255,255,255,0.06)"}`,
            }}>
              <p style={{ color: W, fontWeight: 700, fontSize: "clamp(15px, 1.6vw, 20px)", marginBottom: 10, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{item.title}</p>
              <p style={{ color: W_A(0.42), fontSize: "clamp(12px, 1.1vw, 14px)", lineHeight: 1.7 }}>{item.body}</p>
            </div>
          </A>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 08 — VALORES
───────────────────────────────────────────────────────────── */
function Slide08() {
  const values = [
    { n: "01", title: "Responsabilidad", body: "Cumplir con lo prometido, cuidar el equipo, al cliente y la seguridad del evento." },
    { n: "02", title: "Compromiso", body: "Dar el máximo en cada proyecto, desde el más pequeño hasta el más grande." },
    { n: "03", title: "Trabajo en equipo", body: "Generosidad, apoyo mutuo y comunicación clara — el resultado es de todos." },
    { n: "04", title: "Profesionalismo", body: "Presentarse, operar y comunicar con seriedad, aunque el trato sea cercano." },
    { n: "05", title: "Pasión por los eventos", body: "Mantener la energía que dio origen a la empresa: audio, luces, escenarios y shows en vivo." },
  ];
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)",
    }}>
      <SectionLabel delay={0}>Valores</SectionLabel>
      <A delay={80}>
        <h2 style={{
          fontSize: "clamp(1.8rem, 4.5vw, 3.8rem)", fontWeight: 800,
          letterSpacing: "-0.035em", color: W, marginBottom: 28,
        }}>
          Cómo vivimos el trabajo.
        </h2>
      </A>
      <div>
        {values.map((v, i) => (
          <NumberedItem key={v.n} n={v.n} title={v.title} body={v.body} delay={160 + i * 60} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 09 — PRINCIPIOS RECTORES
───────────────────────────────────────────────────────────── */
function Slide09() {
  const items = [
    { n: "01", title: "Verdad y claridad primero", body: "Si no está claro, se clarifica antes de ejecutar." },
    { n: "02", title: "Responsabilidad total", body: "No culpamos. Resolvemos, aprendemos y mejoramos." },
    { n: "03", title: "Calidad y seguridad", body: "Excelencia repetible, sin riesgos y sin excepciones — siempre." },
    { n: "04", title: "Resolución de problema", body: "Actuamos con criterio propio en beneficio del proyecto y la empresa." },
    { n: "05", title: "Cada quien es dueño de sus resultados", body: "Iniciativa real. Cada persona lidera su puesto con compromiso." },
  ];
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)",
    }}>
      <SectionLabel delay={0}>Principios rectores</SectionLabel>
      <A delay={80}>
        <h2 style={{
          fontSize: "clamp(1.8rem, 4.5vw, 3.8rem)", fontWeight: 800,
          letterSpacing: "-0.035em", color: W, marginBottom: 28,
        }}>
          Cómo tomamos decisiones.
        </h2>
      </A>
      <div>
        {items.map((item, i) => (
          <NumberedItem key={item.n} n={item.n} title={item.title} body={item.body} delay={160 + i * 60} gold />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 10 — REGLAS DE ORO
───────────────────────────────────────────────────────────── */
function Slide10() {
  const rules = [
    { n: "01", rule: "Respeto siempre — incluso bajo presión." },
    { n: "02", rule: "Comunicación a tiempo." },
    { n: "03", rule: "Cumplimos lo prometido o renegociamos con anticipación." },
    { n: "04", rule: "Cuidamos los recursos como si fueran propios: tiempo, dinero y equipo." },
    { n: "05", rule: "Escalamos a tiempo cuando el problema supera nuestro alcance." },
  ];
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)",
    }}>
      <SectionLabel delay={0}>Reglas de oro</SectionLabel>
      <A delay={80}>
        <h2 style={{
          fontSize: "clamp(1.8rem, 4.5vw, 3.8rem)", fontWeight: 800,
          letterSpacing: "-0.035em", color: W, marginBottom: 36,
        }}>
          Cómo nos comportamos.
        </h2>
      </A>
      <div>
        {rules.map((r, i) => (
          <A key={r.n} delay={160 + i * 80}>
            <div style={{
              display: "flex", alignItems: "baseline", gap: 24,
              padding: "18px 0",
              borderBottom: i < rules.length - 1 ? `1px solid ${W_A(0.04)}` : "none",
            }}>
              <span style={{ color: G_A(0.35), fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", flexShrink: 0 }}>{r.n}</span>
              <span style={{ color: W, fontSize: "clamp(1rem, 2vw, 1.45rem)", fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.3 }}>
                {r.rule}
              </span>
            </div>
          </A>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 11 — LA MARCA
───────────────────────────────────────────────────────────── */
function Slide11() {
  const pillars = [
    { title: "Confiabilidad", body: "El cliente sabe que con Mainstage el show funciona. Esa certeza es nuestra reputación — la construimos en cada evento." },
    { title: "Altura Técnica", body: "Operamos al nivel que los proyectos merecen. No improvisamos, no cortamos esquinas, no aceptamos menos de lo mejor que podemos dar." },
    { title: "Presencia Profesional", body: "Somos el espejo de la empresa en cada producción. La forma en que nos presentamos y trabajamos es la imagen de Mainstage." },
  ];
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)",
    }}>
      <SectionLabel delay={0}>La marca</SectionLabel>
      <A delay={80}>
        <h2 style={{
          fontSize: "clamp(1.6rem, 3.8vw, 3.2rem)", fontWeight: 800,
          letterSpacing: "-0.03em", color: W, marginBottom: 40, maxWidth: 600,
        }}>
          Lo que representamos cada vez que llegamos.
        </h2>
      </A>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {pillars.map((p, i) => (
          <A key={p.title} delay={200 + i * 100} style={{ height: "100%" }}>
            <div style={{
              borderRadius: 18, padding: "32px 28px", height: "100%",
              background: G_A(0.045), border: `1px solid ${G_A(0.15)}`,
              display: "flex", flexDirection: "column",
            }}>
              <div style={{ width: 36, height: 1.5, background: G, marginBottom: 24 }} />
              <p style={{ color: G, fontWeight: 800, fontSize: "clamp(12px, 1.2vw, 14px)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>{p.title}</p>
              <p style={{ color: W_A(0.5), fontSize: "clamp(12px, 1.2vw, 15px)", lineHeight: 1.75 }}>{p.body}</p>
            </div>
          </A>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 12 — MENTALIDAD MAINSTAGE
───────────────────────────────────────────────────────────── */
function Slide12() {
  const points = [
    "Esperamos iniciativa y criterio — proponer soluciones e impulsar mejoras.",
    "Ver más allá de la tarea inmediata.",
    "Cada persona en Mainstage lidera su puesto con compromiso real.",
    "El objetivo: elevar la experiencia del cliente y ejecutar con altura profesional, en cada evento, sin excepción.",
  ];
  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", position: "relative", overflow: "hidden" }}>
      {/* Left */}
      <div style={{
        padding: "clamp(48px, 8vw, 120px)",
        borderRight: `1px solid ${W_A(0.05)}`,
        height: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 80% at 20% 50%, ${G_A(0.04)} 0%, transparent 70%)`, pointerEvents: "none" }} />
        <SectionLabel delay={0}>Mentalidad Mainstage</SectionLabel>
        <A delay={100}>
          <h2 style={{
            fontSize: "clamp(2rem, 4.5vw, 4rem)", fontWeight: 800,
            letterSpacing: "-0.04em", lineHeight: 1.02, color: W,
          }}>
            "No solo<br />ejecutas.<br /><span style={{ color: G }}>Construyes."</span>
          </h2>
        </A>
      </div>
      {/* Right */}
      <div style={{
        padding: "clamp(48px, 8vw, 120px)",
        height: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
      }}>
        {points.map((p, i) => (
          <A key={i} delay={150 + i * 90}>
            <div style={{
              display: "flex", gap: 18, alignItems: "flex-start",
              padding: "18px 0",
              borderBottom: i < points.length - 1 ? `1px solid ${W_A(0.04)}` : "none",
            }}>
              <span style={{ color: G, flexShrink: 0, fontSize: 16, marginTop: 1, fontWeight: 300 }}>→</span>
              <p style={{ color: W_A(0.5), fontSize: "clamp(13px, 1.2vw, 15px)", lineHeight: 1.7 }}>{p}</p>
            </div>
          </A>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 13 — CIERRE
───────────────────────────────────────────────────────────── */
function Slide13() {
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      <GridTexture />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/presentacion/musicales/Afrodise-59.jpg" alt="" draggable={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.06, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 70% at 50% 50%, ${G_A(0.07)} 0%, transparent 65%)`, pointerEvents: "none" }} />
      <PulseRings />

      <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 40px" }}>
        <A delay={0}>
          <p style={{ color: W_A(0.22), fontSize: "clamp(0.9rem, 2vw, 1.2rem)", fontWeight: 200, letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 20 }}>
            Esto es
          </p>
          <h1 style={{ fontSize: "clamp(4rem, 12vw, 11rem)", fontWeight: 900, lineHeight: 0.85, letterSpacing: "-0.05em", marginBottom: 8, color: G }}>
            Mainstage
          </h1>
          <p style={{ fontSize: "clamp(4rem, 12vw, 11rem)", fontWeight: 900, lineHeight: 0.85, letterSpacing: "-0.05em", marginBottom: 48, color: W_A(0.1) }}>
            Pro.
          </p>
        </A>

        <A delay={280}>
          <div style={{ width: 80, height: 1, background: `linear-gradient(to right, transparent, ${G}, transparent)`, margin: "0 auto 28px" }} />
        </A>

        <A delay={400}>
          <p style={{ color: W_A(0.3), fontSize: "clamp(0.75rem, 1.2vw, 0.95rem)", letterSpacing: "0.05em", lineHeight: 1.9 }}>
            Producción técnica impecable. · Profesionalismo sin excepción. · Pasión por cada show.
          </p>
        </A>
        <A delay={560}>
          <p style={{ color: W_A(0.12), fontSize: 12, letterSpacing: "0.04em", marginTop: 20 }}>
            Esto es lo que representamos. Esto es lo que construimos juntos.
          </p>
        </A>

        {/* Real logo at close */}
        <A delay={760} style={{ display: "flex", justifyContent: "center", marginTop: 52 }}>
          <Image
            src="/logo-white.png"
            alt="Mainstage Pro"
            width={300}
            height={60}
            style={{ width: "clamp(180px, 22vw, 300px)", height: "auto" }}
          />
        </A>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE MAP
───────────────────────────────────────────────────────────── */
const SLIDES = [
  Slide01, Slide02, Slide03, Slide04, Slide05, Slide06, Slide07,
  Slide08, Slide09, Slide10, Slide11, Slide12, Slide13,
];

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function PresentacionEquipoClient() {
  const [slide, setSlide]     = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const touchX = useRef(0);

  const goTo = useCallback((n: number) => {
    if (n < 0 || n >= TOTAL) return;
    setOpacity(0);
    setTimeout(() => {
      setSlide(n);
      setAnimKey((k) => k + 1);
      setOpacity(1);
    }, 250);
  }, []);

  const next = useCallback(() => goTo(slide + 1), [slide, goTo]);
  const prev = useCallback(() => goTo(slide - 1), [slide, goTo]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft")                   { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [next, prev]);

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    const dx = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) dx > 0 ? next() : prev();
  };

  const SlideComp = SLIDES[slide];

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: BG, color: W,
        fontFamily: FONT, overflow: "hidden", userSelect: "none",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes mspFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mspPulse {
          0%   { transform: scale(1);   opacity: 0.45; }
          100% { transform: scale(2.7); opacity: 0; }
        }
        button { font-family: inherit; }
        .nav-btn:hover { background: rgba(170,144,64,0.08) !important; border-color: rgba(170,144,64,0.3) !important; color: rgba(240,240,240,0.7) !important; }
      `}</style>

      {/* ── Logo nav (top-left, hidden on slide 1) ── */}
      <div style={{
        position: "fixed", top: 18, left: 24, zIndex: 100,
        opacity: slide > 0 ? 0.6 : 0,
        transition: "opacity 0.5s ease", pointerEvents: "none",
      }}>
        <Image src="/logo-white.png" alt="Mainstage Pro" width={160} height={32}
          style={{ width: 160, height: "auto" }} />
      </div>

      {/* ── Counter (top-right) ── */}
      <div style={{
        position: "fixed", top: 22, right: 26, zIndex: 100,
        display: "flex", alignItems: "center", gap: 5,
      }}>
        <span style={{ color: G, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em" }}>
          {String(slide + 1).padStart(2, "0")}
        </span>
        <span style={{ color: W_A(0.18), fontSize: 11 }}>/</span>
        <span style={{ color: W_A(0.18), fontSize: 11 }}>{TOTAL}</span>
      </div>

      {/* ── Prev ── */}
      {slide > 0 && (
        <button className="nav-btn" onClick={prev} aria-label="Anterior" style={{
          position: "fixed", left: 16, top: "50%", transform: "translateY(-50%)",
          zIndex: 100, background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50%",
          width: 42, height: 42, cursor: "pointer", color: W_A(0.35),
          fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
        }}>‹</button>
      )}

      {/* ── Next ── */}
      {slide < TOTAL - 1 && (
        <button className="nav-btn" onClick={next} aria-label="Siguiente" style={{
          position: "fixed", right: 16, top: "50%", transform: "translateY(-50%)",
          zIndex: 100, background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50%",
          width: 42, height: 42, cursor: "pointer", color: W_A(0.35),
          fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
        }}>›</button>
      )}

      {/* ── Progress dots ── */}
      <div style={{
        position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)",
        zIndex: 100, display: "flex", gap: 6, alignItems: "center",
      }}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <button key={i} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`}
            style={{
              width: i === slide ? 24 : 5, height: 5, borderRadius: 3,
              border: "none", cursor: "pointer", padding: 0,
              background: i === slide ? G : W_A(0.15),
              transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
            }} />
        ))}
      </div>

      {/* ── Slide content ── */}
      <div key={animKey} style={{ width: "100%", height: "100%", opacity, transition: "opacity 0.25s ease" }}>
        <SlideComp />
      </div>
    </div>
  );
}
