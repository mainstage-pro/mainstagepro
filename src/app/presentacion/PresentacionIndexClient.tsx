"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PRESENTACIONES_COMERCIAL } from "@/lib/presentaciones-catalogo";

const GOLD = "#B3985B";

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}

function Card({ item, i }: { item: (typeof PRESENTACIONES_COMERCIAL)[number]; i: number }) {
  const { ref, vis } = useReveal();
  return (
    <Link
      href={item.href}
      ref={ref as unknown as React.Ref<HTMLAnchorElement>}
      className="group relative flex flex-col justify-between gap-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 overflow-hidden transition-all duration-500 hover:border-white/20 hover:bg-white/[0.04]"
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s ${i * 0.06}s ease, transform 0.7s ${i * 0.06}s ease, border-color 0.4s ease, background-color 0.4s ease`,
      }}
    >
      <div
        className="absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: GOLD }}
      />
      <item.icon strokeWidth={1.25} className="h-8 w-8 shrink-0" style={{ color: GOLD }} />
      <div>
        <span className="text-[11px] uppercase tracking-[0.16em] text-white/30">{item.audience}</span>
        <h3 className="mt-2 text-2xl font-semibold text-white">{item.label}</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/45">{item.desc}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-transform duration-300 group-hover:translate-x-1">
          Ver <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}

export default function PresentacionIndexClient() {
  return (
    <div
      className="min-h-screen bg-[#080808] text-white"
      style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}
    >
      <section className="mx-auto max-w-5xl px-6 pt-28 pb-16 sm:pt-36">
        <span className="text-[11px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
          Mainstage Pro
        </span>
        <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Todo resuelto.
          <br />
          <span className="text-white/40">Tú solo disfruta.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-white/50 sm:text-lg">
          Producción técnica de audio, iluminación y video para eventos. Explora lo que hacemos.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-32">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PRESENTACIONES_COMERCIAL.map((item, i) => (
            <Card key={item.key} item={item} i={i} />
          ))}
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-10">
        <div className="mx-auto max-w-5xl text-center text-xs text-white/30">
          Mainstage Pro · Producción técnica de eventos
        </div>
      </footer>
    </div>
  );
}
