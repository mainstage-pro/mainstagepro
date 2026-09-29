"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import {
  Compass,
  Crosshair,
  Telescope,
  ShieldOff,
  Gem,
  Flag,
  Layers,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import { ESTADO_OBJETIVO_META, formatValorMeta, type EstadoObjetivo } from "@/lib/estrategia";
import { fmtDate } from "@/lib/dates";

/* ── Design tokens: los mismos de las presentaciones actuales ── */
const G = "#AA9040";
const G_A = (a: number) => `rgba(170,144,64,${a})`;
const W = "#F0F0F0";
const W_A = (a: number) => `rgba(240,240,240,${a})`;
const BG = "#080808";
const RED = "#f87171";
const FONT = "'Inter',system-ui,-apple-system,sans-serif";

/* ── Fotos del banco de la plataforma ── */
const FOTO = {
  portada: "/images/presentacion/musicales/Musicales-140.jpg",
  proposito: "/images/presentacion/musicales/Musicales-016.jpg",
  frase: "/images/presentacion/musicales/Musicales-194.jpg",
  mision: "/images/presentacion/operacion/crew-foh.jpg",
  vision: "/images/presentacion/musicales/Musicales-126.jpg",
  filo: "/images/presentacion/musicales/Musicales-055.jpg",
  valores: "/images/presentacion/operacion/oficio-manos.jpg",
  noNegociables: "/images/presentacion/operacion/road-cases.jpg",
  meta: "/images/presentacion/operacion/consola-audio.jpg",
  indicadores: "/images/presentacion/musicales/Musicales-111.jpg",
  areas: "/images/presentacion/musicales/Musicales-045.jpg",
  area: "/images/presentacion/musicales/Afrodise-59.jpg",
  cierre: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg",
};

const FOTO_VALOR = [
  "/images/presentacion/musicales/Musicales-017.jpg",
  "/images/presentacion/musicales/Musicales-108.jpg",
  "/images/presentacion/musicales/Musicales-076.jpg",
  "/images/presentacion/musicales/Musicales-129.jpg",
  "/images/presentacion/musicales/Musicales-154.jpg",
  "/images/presentacion/musicales/Musicales-037.jpg",
  "/images/presentacion/musicales/Musicales-220.jpg",
  "/images/presentacion/musicales/Musicales-083.jpg",
];

/* ── Datos que entrega el servidor ── */
export interface DeckData {
  identidad: {
    proposito: string;
    mision: string;
    vision: string;
    frase: string | null;
    aQuienNoServimos: string | null;
    version: number;
  } | null;
  valores: {
    id: string;
    nombre: string;
    descripcion: string | null;
    comoSeVive: string | null;
    esperadas: string[];
    inaceptables: string[];
  }[];
  noNegociables: string[];
  meta: {
    periodo: string;
    titulo: string;
    descripcion: string | null;
    fechaInicio: string;
    fechaFin: string;
    indicadores: {
      id: string;
      nombre: string;
      unidad: string;
      lineaBase: number | null;
      valorMeta: number | null;
      valorActual: number | null;
    }[];
  } | null;
  areas: {
    id: string;
    nombre: string;
    areaPermiso: string;
    proposito: string | null;
    progreso: number;
    enRiesgo: number;
    objetivos: {
      id: string;
      descripcion: string;
      metrica: string;
      unidad: string;
      valorMeta: number | null;
      valorActual: number | null;
      fechaLimite: string | null;
      progreso: number;
      estadoCalc: EstadoObjetivo;
      tacticas: number;
      hechas: number;
      vencidas: number;
    }[];
  }[];
  resumen: { objetivos: number; tacticas: number; progreso: number };
}

/* ── Primitivas de animación y fondo ── */
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
    <div
      className={className}
      style={{ animation: `mspFadeUp 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms both`, ...ext }}
    >
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

function RadialGlow({ x = 50, y = 50, intensity = 0.05 }: { x?: number; y?: number; intensity?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(ellipse 70% 60% at ${x}% ${y}%, ${G_A(intensity)} 0%, transparent 70%)`,
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
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

function SectionLabel({
  children,
  delay = 0,
  center = false,
  color = G,
}: {
  children: React.ReactNode;
  delay?: number;
  center?: boolean;
  color?: string;
}) {
  return (
    <A delay={delay}>
      <p
        style={{
          color,
          fontSize: "clamp(12px, 1.3vw, 16px)",
          fontWeight: 500,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          marginBottom: 20,
          textAlign: center ? "center" : "left",
        }}
      >
        {children}
      </p>
    </A>
  );
}

/** Marco dorado con icono: la firma visual del módulo, repetida aquí. */
function IconoMarco({ icono: Icono, color = G, tam = 52 }: { icono: LucideIcon; color?: string; tam?: number }) {
  return (
    <div
      style={{
        width: tam,
        height: tam,
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `${color}14`,
        border: `1px solid ${color}44`,
      }}
    >
      <Icono strokeWidth={1.5} style={{ width: tam * 0.42, height: tam * 0.42, color }} />
    </div>
  );
}

/** Anillo de avance — el mismo lenguaje del módulo. */
function Anillo({ pct, tam = 84, color = G, grosor = 4 }: { pct: number; tam?: number; color?: string; grosor?: number }) {
  const r = (tam - grosor) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: tam, height: tam, flexShrink: 0 }}>
      <svg width={tam} height={tam} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={W_A(0.07)} strokeWidth={grosor} />
        <circle
          cx={tam / 2}
          cy={tam / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (Math.max(0, Math.min(100, pct)) / 100) * circ}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: tam * 0.27,
          fontWeight: 700,
          color: pct > 0 ? color : W_A(0.25),
        }}
      >
        {pct}
      </span>
    </div>
  );
}

/* ── Plantillas de slide ── */

/** Declaración a pantalla completa: rótulo, título enorme, filete y cuerpo. */
function SlideDeclaracion({
  rotulo,
  titulo,
  cuerpo,
  foto,
  icono,
  acento = G,
  centrado = true,
}: {
  rotulo: string;
  titulo: string;
  cuerpo: string;
  foto: string;
  icono: LucideIcon;
  acento?: string;
  centrado?: boolean;
}) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 clamp(40px, 8vw, 120px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Foto src={foto} opacity={0.055} />
      <RadialGlow intensity={0.045} />

      <div
        style={{
          width: "100%",
          maxWidth: 940,
          textAlign: centrado ? "center" : "left",
          position: "relative",
          zIndex: 1,
        }}
      >
        <A delay={0} style={{ display: "flex", justifyContent: centrado ? "center" : "flex-start", marginBottom: 26 }}>
          <IconoMarco icono={icono} color={acento} />
        </A>

        <SectionLabel delay={80} center={centrado} color={acento}>
          {rotulo}
        </SectionLabel>

        <A delay={180}>
          <h1
            style={{
              fontSize: "clamp(2.2rem, 5vw, 4.6rem)",
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              color: W,
              marginBottom: 32,
            }}
          >
            {titulo}
          </h1>
        </A>

        <A delay={300}>
          <div
            style={{
              width: 48,
              height: 1.5,
              background: acento,
              margin: centrado ? "0 auto 30px" : "0 0 30px",
            }}
          />
        </A>

        <A delay={400}>
          <p
            style={{
              color: W_A(0.5),
              fontSize: "clamp(0.95rem, 1.5vw, 1.2rem)",
              lineHeight: 1.85,
              maxWidth: 720,
              margin: centrado ? "0 auto" : 0,
              whiteSpace: "pre-line",
            }}
          >
            {cuerpo}
          </p>
        </A>
      </div>
    </div>
  );
}

/* ── Slides concretos ── */

function SlidePortada({ periodo, version }: { periodo: string | null; version: number | null }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Foto src={FOTO.portada} opacity={0.08} />
      <GridTexture />
      <RadialGlow intensity={0.08} />
      <PulseRings />

      <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 40px" }}>
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

        <A delay={300}>
          <div
            style={{
              width: "50%",
              height: 1,
              margin: "0 auto 32px",
              background: `linear-gradient(to right, transparent, ${G}, transparent)`,
            }}
          />
        </A>

        <A delay={440}>
          <p
            style={{
              color: G,
              fontSize: "clamp(11px, 1.2vw, 14px)",
              fontWeight: 500,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Cultura y estrategia{periodo ? ` · ${periodo}` : ""}
          </p>
        </A>

        <A delay={600}>
          <p style={{ color: W_A(0.2), fontSize: "clamp(10px, 1vw, 12px)", letterSpacing: "0.26em" }}>
            Quiénes somos · Qué no somos · A dónde vamos
          </p>
        </A>

        <A delay={880}>
          <p
            style={{
              marginTop: 58,
              color: W_A(0.12),
              fontSize: 10,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
            }}
          >
            {version ? `Identidad v${version} · ` : ""}Presiona → para avanzar
          </p>
        </A>
      </div>
    </div>
  );
}

function SlideFrase({ frase }: { frase: string }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 clamp(40px, 8vw, 120px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Foto src={FOTO.frase} opacity={0.07} />
      <RadialGlow intensity={0.06} />

      <div style={{ maxWidth: 880, position: "relative", zIndex: 1, textAlign: "center" }}>
        <A delay={0}>
          <div style={{ width: 48, height: 1.5, background: G, margin: "0 auto 34px" }} />
        </A>
        <A delay={140}>
          <blockquote
            style={{
              fontSize: "clamp(2rem, 5.4vw, 4.8rem)",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
              color: G,
            }}
          >
            {frase}
          </blockquote>
        </A>
        <A delay={380}>
          <p style={{ color: W_A(0.22), fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", marginTop: 38 }}>
            Frase de marca
          </p>
        </A>
      </div>
    </div>
  );
}

function SlideValoresIntro({ valores }: { valores: DeckData["valores"] }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Foto src={FOTO.valores} opacity={0.07} />
      <RadialGlow x={20} y={40} intensity={0.05} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionLabel delay={0}>Valores</SectionLabel>
        <A delay={80}>
          <h2
            style={{
              fontSize: "clamp(1.9rem, 4.4vw, 3.8rem)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              color: W,
              marginBottom: 14,
            }}
          >
            Cómo se trabaja aquí.
          </h2>
        </A>
        <A delay={180}>
          <p style={{ color: W_A(0.45), fontSize: "clamp(0.9rem, 1.4vw, 1.05rem)", lineHeight: 1.7, maxWidth: 620, marginBottom: 44 }}>
            Un valor solo sirve si se puede observar. Cada uno de estos se traduce en conductas concretas
            que entran al acuerdo de alineación, a la oferta de trabajo y a la evaluación.
          </p>
        </A>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {valores.map((v, i) => (
            <A key={v.id} delay={280 + i * 70}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 24px 16px 18px",
                  borderRadius: 14,
                  background: i % 2 === 0 ? G_A(0.05) : "rgba(255,255,255,0.025)",
                  border: `1px solid ${i % 2 === 0 ? G_A(0.16) : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <span style={{ color: G, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ color: W, fontWeight: 700, fontSize: "clamp(16px, 1.8vw, 22px)", letterSpacing: "-0.02em" }}>
                  {v.nombre}
                </span>
              </div>
            </A>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideValor({ valor, indice, total }: { valor: DeckData["valores"][number]; indice: number; total: number }) {
  const foto = FOTO_VALOR[indice % FOTO_VALOR.length];
  const tieneConductas = valor.esperadas.length > 0 || valor.inaceptables.length > 0;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Foto src={foto} opacity={0.055} />
      <RadialGlow x={78} y={30} intensity={0.05} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1000 }}>
        <A delay={0} style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
          <IconoMarco icono={Gem} tam={46} />
          <span style={{ color: G, fontSize: 12, fontWeight: 600, letterSpacing: "0.26em" }}>
            VALOR {String(indice + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </A>

        <A delay={110}>
          <h2
            style={{
              fontSize: "clamp(2rem, 4.8vw, 4rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: W,
              marginBottom: valor.comoSeVive ? 24 : 32,
              lineHeight: 1.05,
            }}
          >
            {valor.nombre}
          </h2>
        </A>

        {valor.comoSeVive && (
          <A delay={220}>
            <div style={{ display: "flex", gap: 18, marginBottom: 30, maxWidth: 780 }}>
              <div
                style={{
                  width: 2,
                  flexShrink: 0,
                  borderRadius: 2,
                  background: `linear-gradient(to bottom, ${G}, ${G_A(0.1)})`,
                }}
              />
              <p style={{ color: G, fontSize: "clamp(1rem, 1.8vw, 1.45rem)", lineHeight: 1.55, fontWeight: 500 }}>
                {valor.comoSeVive}
              </p>
            </div>
          </A>
        )}

        {valor.descripcion && (
          <A delay={300}>
            <p style={{ color: W_A(0.42), fontSize: "clamp(0.85rem, 1.2vw, 1rem)", lineHeight: 1.75, maxWidth: 680, marginBottom: 32 }}>
              {valor.descripcion}
            </p>
          </A>
        )}

        {tieneConductas ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 940 }}>
            <A delay={400}>
              <p style={{ color: "#4ade80", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 14 }}>
                Así se ve
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
                {valor.esperadas.map((c, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <Check strokeWidth={2.4} style={{ width: 14, height: 14, color: "#4ade80", flexShrink: 0, marginTop: 3 }} />
                    <span style={{ color: W_A(0.6), fontSize: "clamp(12px, 1.05vw, 14px)", lineHeight: 1.6 }}>{c}</span>
                  </li>
                ))}
              </ul>
            </A>
            <A delay={480}>
              <p style={{ color: RED, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 14 }}>
                Así no
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
                {valor.inaceptables.map((c, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <X strokeWidth={2.4} style={{ width: 14, height: 14, color: RED, flexShrink: 0, marginTop: 3 }} />
                    <span style={{ color: W_A(0.6), fontSize: "clamp(12px, 1.05vw, 14px)", lineHeight: 1.6 }}>{c}</span>
                  </li>
                ))}
              </ul>
            </A>
          </div>
        ) : (
          <A delay={400}>
            <p
              style={{
                color: W_A(0.22),
                fontSize: 13,
                padding: "16px 20px",
                borderRadius: 12,
                border: `1px dashed ${G_A(0.22)}`,
                maxWidth: 560,
              }}
            >
              Este valor todavía no tiene conductas observables capturadas.
            </p>
          </A>
        )}
      </div>
    </div>
  );
}

function SlideNoNegociables({ lista }: { lista: string[] }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Foto src={FOTO.noNegociables} opacity={0.06} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(153,27,27,0.14) 0%, transparent 70%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900 }}>
        <A delay={0} style={{ marginBottom: 24 }}>
          <IconoMarco icono={ShieldOff} color={RED} />
        </A>
        <SectionLabel delay={80} color={RED}>
          No negociables
        </SectionLabel>
        <A delay={160}>
          <h2
            style={{
              fontSize: "clamp(1.9rem, 4.4vw, 3.6rem)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              color: W,
              marginBottom: 14,
            }}
          >
            Lo que cuesta el puesto.
          </h2>
        </A>
        <A delay={240}>
          <p style={{ color: W_A(0.42), fontSize: "clamp(0.85rem, 1.2vw, 1rem)", lineHeight: 1.7, maxWidth: 620, marginBottom: 36 }}>
            No son advertencias. Son las conductas que terminan la relación laboral el mismo día, y están
            escritas en el acuerdo que cada persona firma.
          </p>
        </A>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lista.map((c, i) => (
            <A key={i} delay={330 + i * 70}>
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  padding: "14px 20px",
                  borderRadius: 12,
                  background: "rgba(69,10,10,0.2)",
                  border: "1px solid rgba(153,27,27,0.36)",
                }}
              >
                <X strokeWidth={2.4} style={{ width: 16, height: 16, color: RED, flexShrink: 0, marginTop: 2 }} />
                <span style={{ color: W_A(0.78), fontSize: "clamp(13px, 1.2vw, 16px)", lineHeight: 1.6 }}>{c}</span>
              </div>
            </A>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideMeta({ meta }: { meta: NonNullable<DeckData["meta"]> }) {
  const rango = `${fmtDate(meta.fechaInicio, { dateStyle: "long" })} — ${fmtDate(meta.fechaFin, {
    dateStyle: "long",
  })}`;
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 clamp(40px, 8vw, 120px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Foto src={FOTO.meta} opacity={0.06} />
      <RadialGlow intensity={0.06} />

      <div style={{ maxWidth: 940, position: "relative", zIndex: 1, textAlign: "center" }}>
        <A delay={0} style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>
          <IconoMarco icono={Flag} />
        </A>
        <SectionLabel delay={80} center>
          Meta global {meta.periodo}
        </SectionLabel>
        <A delay={180}>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 4.4rem)",
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: "-0.04em",
              color: W,
              marginBottom: 30,
            }}
          >
            {meta.titulo}
          </h1>
        </A>
        <A delay={320}>
          <div style={{ width: 48, height: 1.5, background: G, margin: "0 auto 28px" }} />
        </A>
        {meta.descripcion && (
          <A delay={400}>
            <p
              style={{
                color: W_A(0.48),
                fontSize: "clamp(0.9rem, 1.4vw, 1.12rem)",
                lineHeight: 1.85,
                maxWidth: 700,
                margin: "0 auto 30px",
                whiteSpace: "pre-line",
              }}
            >
              {meta.descripcion}
            </p>
          </A>
        )}
        <A delay={520}>
          <p style={{ color: W_A(0.22), fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase" }}>{rango}</p>
        </A>
      </div>
    </div>
  );
}

function SlideIndicadores({ meta }: { meta: NonNullable<DeckData["meta"]> }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Foto src={FOTO.indicadores} opacity={0.05} />
      <GridTexture />

      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionLabel delay={0}>Cómo se mide el periodo</SectionLabel>
        <A delay={80}>
          <h2
            style={{
              fontSize: "clamp(1.8rem, 4.2vw, 3.4rem)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              color: W,
              marginBottom: 40,
            }}
          >
            Los números que mandan.
          </h2>
        </A>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, meta.indicadores.length))}, 1fr)`,
            gap: 18,
          }}
        >
          {meta.indicadores.map((ind, i) => {
            const pct =
              ind.valorMeta && ind.valorActual != null
                ? Math.min(100, Math.round((ind.valorActual / ind.valorMeta) * 100))
                : null;
            const sinMeta = ind.valorMeta == null;
            return (
              <A key={ind.id} delay={200 + i * 100}>
                <div
                  style={{
                    borderRadius: 16,
                    padding: "28px 26px",
                    height: "100%",
                    background: i === 0 ? G_A(0.05) : "rgba(255,255,255,0.025)",
                    border: `1px solid ${i === 0 ? G_A(0.16) : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: W_A(0.4), fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>{ind.nombre}</p>
                      <p
                        style={{
                          fontSize: "clamp(26px, 3vw, 42px)",
                          fontWeight: 800,
                          letterSpacing: "-0.035em",
                          color: sinMeta ? W_A(0.2) : W,
                        }}
                      >
                        {sinMeta ? "Sin meta" : formatValorMeta(ind.valorMeta, ind.unidad)}
                      </p>
                    </div>
                    {pct !== null && <Anillo pct={pct} tam={56} grosor={3} />}
                  </div>
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${G_A(0.12)}`, display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: W_A(0.25) }}>Línea base</span>
                      <span style={{ color: W_A(0.5) }}>{formatValorMeta(ind.lineaBase, ind.unidad)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: W_A(0.25) }}>Actual</span>
                      <span style={{ color: W_A(0.5) }}>{formatValorMeta(ind.valorActual, ind.unidad)}</span>
                    </div>
                  </div>
                </div>
              </A>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SlideAreasIntro({ areas, resumen }: { areas: DeckData["areas"]; resumen: DeckData["resumen"] }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Foto src={FOTO.areas} opacity={0.05} />
      <RadialGlow x={25} y={35} intensity={0.05} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionLabel delay={0}>La meta se reparte</SectionLabel>
        <A delay={80}>
          <h2
            style={{
              fontSize: "clamp(1.8rem, 4.2vw, 3.4rem)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              color: W,
              marginBottom: 14,
            }}
          >
            Quién responde por qué.
          </h2>
        </A>
        <A delay={160}>
          <p style={{ color: W_A(0.42), fontSize: "clamp(0.85rem, 1.2vw, 1rem)", lineHeight: 1.7, maxWidth: 640, marginBottom: 38 }}>
            {resumen.objetivos} objetivos y {resumen.tacticas} tácticas cuelgan de la meta. El avance no se
            captura a mano: sube solo conforme las tácticas se completan.
          </p>
        </A>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, areas.length))}, 1fr)`,
            gap: 16,
          }}
        >
          {areas.map((a, i) => (
            <A key={a.id} delay={260 + i * 80}>
              <div
                style={{
                  borderRadius: 16,
                  padding: "24px 22px",
                  height: "100%",
                  background: "rgba(255,255,255,0.025)",
                  border: `1px solid ${a.enRiesgo > 0 ? "rgba(153,27,27,0.34)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                  <Anillo pct={a.progreso} tam={46} grosor={3} />
                  <p style={{ color: W, fontWeight: 700, fontSize: "clamp(15px, 1.5vw, 19px)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                    {a.nombre}
                  </p>
                </div>
                <p style={{ color: W_A(0.38), fontSize: 12, lineHeight: 1.65 }}>
                  {a.proposito ?? "Sin propósito redactado."}
                </p>
                {a.enRiesgo > 0 && (
                  <p style={{ color: RED, fontSize: 11, marginTop: 12 }}>{a.enRiesgo} objetivo(s) en riesgo</p>
                )}
              </div>
            </A>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideArea({ area }: { area: DeckData["areas"][number] }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "clamp(36px, 5vh, 64px) clamp(48px, 8vw, 120px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Foto src={FOTO.area} opacity={0.045} />
      <RadialGlow x={80} y={70} intensity={0.045} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1040 }}>
        <A delay={0} style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 12 }}>
          <IconoMarco icono={Layers} tam={46} />
          <div>
            <p style={{ color: G, fontSize: 11, letterSpacing: "0.26em", textTransform: "uppercase", marginBottom: 6 }}>
              Área
            </p>
            <h2 style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.035em", color: W, lineHeight: 1.05 }}>
              {area.nombre}
            </h2>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Anillo pct={area.progreso} tam={72} />
          </div>
        </A>

        {area.proposito && (
          <A delay={140}>
            <p style={{ color: W_A(0.42), fontSize: "clamp(0.85rem, 1.2vw, 1rem)", lineHeight: 1.7, maxWidth: 680, marginBottom: 30 }}>
              {area.proposito}
            </p>
          </A>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {area.objetivos.map((o, i) => {
            const est = ESTADO_OBJETIVO_META[o.estadoCalc];
            return (
              <A key={o.id} delay={240 + i * 80}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 18,
                    padding: "16px 22px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.025)",
                    borderLeft: `2px solid ${est.color}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: W_A(0.85), fontSize: "clamp(13px, 1.25vw, 16px)", lineHeight: 1.55 }}>
                      {o.descripcion}
                    </p>
                    <p style={{ color: W_A(0.28), fontSize: 11, marginTop: 7 }}>
                      {o.metrica} · meta{" "}
                      <span style={{ color: G_A(0.9) }}>{formatValorMeta(o.valorMeta, o.unidad)}</span>
                      {o.tacticas > 0 && ` · ${o.hechas} de ${o.tacticas} tácticas`}
                      {o.fechaLimite &&
                        ` · ${fmtDate(o.fechaLimite, { dateStyle: "medium" })}`}
                    </p>
                  </div>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: `${est.color}1f`,
                      color: est.color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {o.progreso}%
                  </span>
                </div>
              </A>
            );
          })}
          {area.objetivos.length === 0 && (
            <A delay={240}>
              <p style={{ color: W_A(0.22), fontSize: 13 }}>Esta área todavía no tiene objetivos capturados.</p>
            </A>
          )}
        </div>
      </div>
    </div>
  );
}

function SlideCierre({ frase, progreso }: { frase: string | null; progreso: number }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Foto src={FOTO.cierre} opacity={0.07} />
      <GridTexture />
      <RadialGlow intensity={0.07} />
      <PulseRings />

      <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 40px" }}>
        <A delay={0}>
          <p
            style={{
              color: W_A(0.22),
              fontSize: "clamp(0.85rem, 1.8vw, 1.1rem)",
              fontWeight: 200,
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              marginBottom: 22,
            }}
          >
            Esto es
          </p>
          <h1
            style={{
              fontSize: "clamp(3.4rem, 11vw, 10rem)",
              fontWeight: 900,
              lineHeight: 0.86,
              letterSpacing: "-0.05em",
              marginBottom: 6,
              color: G,
            }}
          >
            Mainstage
          </h1>
          <p
            style={{
              fontSize: "clamp(3.4rem, 11vw, 10rem)",
              fontWeight: 900,
              lineHeight: 0.86,
              letterSpacing: "-0.05em",
              marginBottom: 44,
              color: W_A(0.1),
            }}
          >
            Pro.
          </p>
        </A>

        <A delay={280}>
          <div style={{ width: 80, height: 1, background: `linear-gradient(to right, transparent, ${G}, transparent)`, margin: "0 auto 26px" }} />
        </A>

        {frase && (
          <A delay={380}>
            <p style={{ color: W_A(0.34), fontSize: "clamp(0.85rem, 1.4vw, 1.05rem)", lineHeight: 1.8 }}>{frase}</p>
          </A>
        )}

        <A delay={520}>
          <p style={{ color: W_A(0.14), fontSize: 12, marginTop: 18 }}>
            Avance del periodo: {progreso}% · leído en vivo del sistema
          </p>
        </A>

        <A delay={720} style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
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

/* ── Componente principal ── */
export default function PresentacionCulturaClient({ data }: { data: DeckData }) {
  const slides = useMemo(() => {
    const s: React.ReactNode[] = [];
    const i = data.identidad;

    s.push(<SlidePortada periodo={data.meta?.periodo ?? null} version={i?.version ?? null} />);

    if (i) {
      s.push(
        <SlideDeclaracion
          rotulo="Propósito"
          titulo="Por qué existimos."
          cuerpo={i.proposito}
          foto={FOTO.proposito}
          icono={Compass}
        />
      );
      if (i.frase) s.push(<SlideFrase frase={i.frase} />);
      s.push(
        <SlideDeclaracion
          rotulo="Misión"
          titulo="Qué hacemos hoy."
          cuerpo={i.mision}
          foto={FOTO.mision}
          icono={Crosshair}
        />
      );
      s.push(
        <SlideDeclaracion
          rotulo="Visión"
          titulo="Hacia dónde vamos."
          cuerpo={i.vision}
          foto={FOTO.vision}
          icono={Telescope}
        />
      );
      if (i.aQuienNoServimos) {
        s.push(
          <SlideDeclaracion
            rotulo="A quién no servimos"
            titulo="El filo de la misión."
            cuerpo={i.aQuienNoServimos}
            foto={FOTO.filo}
            icono={ShieldOff}
            acento={RED}
          />
        );
      }
    }

    if (data.valores.length) {
      s.push(<SlideValoresIntro valores={data.valores} />);
      data.valores.forEach((v, idx) => {
        s.push(<SlideValor valor={v} indice={idx} total={data.valores.length} />);
      });
    }

    if (data.noNegociables.length) s.push(<SlideNoNegociables lista={data.noNegociables} />);

    if (data.meta) {
      s.push(<SlideMeta meta={data.meta} />);
      if (data.meta.indicadores.length) s.push(<SlideIndicadores meta={data.meta} />);
    }

    if (data.areas.length) {
      s.push(<SlideAreasIntro areas={data.areas} resumen={data.resumen} />);
      data.areas.forEach(a => s.push(<SlideArea area={a} />));
    }

    s.push(<SlideCierre frase={i?.frase ?? null} progreso={data.resumen.progreso} />);
    return s;
  }, [data]);

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
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [next, prev]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) dx > 0 ? next() : prev();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: BG,
        color: W,
        fontFamily: FONT,
        overflow: "hidden",
        userSelect: "none",
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

      <div
        style={{
          position: "fixed",
          top: 18,
          left: 24,
          zIndex: 100,
          opacity: slide > 0 ? 0.6 : 0,
          transition: "opacity 0.5s ease",
          pointerEvents: "none",
        }}
      >
        <Image src="/logo-white.png" alt="Mainstage Pro" width={160} height={32} style={{ width: 160, height: "auto" }} />
      </div>

      <div style={{ position: "fixed", top: 22, right: 26, zIndex: 100, display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ color: G, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em" }}>
          {String(slide + 1).padStart(2, "0")}
        </span>
        <span style={{ color: W_A(0.18), fontSize: 11 }}>/</span>
        <span style={{ color: W_A(0.18), fontSize: 11 }}>{total}</span>
      </div>

      {slide > 0 && (
        <button
          className="nav-btn"
          onClick={prev}
          aria-label="Anterior"
          style={{
            position: "fixed",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 100,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "50%",
            width: 42,
            height: 42,
            cursor: "pointer",
            color: W_A(0.35),
            fontSize: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
        >
          ‹
        </button>
      )}

      {slide < total - 1 && (
        <button
          className="nav-btn"
          onClick={next}
          aria-label="Siguiente"
          style={{
            position: "fixed",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 100,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "50%",
            width: 42,
            height: 42,
            cursor: "pointer",
            color: W_A(0.35),
            fontSize: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
        >
          ›
        </button>
      )}

      <div
        style={{
          position: "fixed",
          bottom: 22,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          display: "flex",
          gap: 5,
          alignItems: "center",
          maxWidth: "70vw",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            style={{
              width: i === slide ? 24 : 5,
              height: 5,
              borderRadius: 3,
              border: "none",
              cursor: "pointer",
              padding: 0,
              background: i === slide ? G : W_A(0.15),
              transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        ))}
      </div>

      <div key={animKey} style={{ width: "100%", height: "100%", opacity, transition: "opacity 0.25s ease" }}>
        {slides[slide]}
      </div>
    </div>
  );
}
