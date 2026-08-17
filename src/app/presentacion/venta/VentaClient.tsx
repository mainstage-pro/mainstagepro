"use client";
import { useCallback, useEffect, useState } from "react";
import PresentacionNav from "@/components/presentacion/PresentacionNav";
import { waLink } from "@/components/presentacion/descubrimiento";
import { CONDICION_LABEL } from "@/lib/equipo-venta-shared";

const GOLD = "#B3985B";

type Item = {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precioVenta: number | null;
  unidades: number;
  condicion: string;
  copy: string | null;
  fotos: string[];
};
type Categoria = { nombre: string; items: Item[] };

function fmx(n: number | null) {
  return n == null ? "Precio a consultar" : `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
}

const WA_GENERAL = waLink("Hola, vi el equipo que tienen en venta y me interesa. ¿Me pueden dar más información?");

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [vis, setVis] = useState(false);
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [el]);
  return (
    <div ref={setEl} className={className}
         style={{ transitionDelay: `${delay}ms`, opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(32px)", transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
      {children}
    </div>
  );
}

function ItemCard({ item, onFotos, delay }: { item: Item; onFotos: (item: Item, index: number) => void; delay: number }) {
  const [hover, setHover] = useState(false);
  const portada = item.fotos[0];
  const wa = waLink(`Hola, me interesa comprar el ${item.nombre} que tienen en venta${item.precioVenta ? ` en ${fmx(item.precioVenta)}` : ""}. ¿Sigue disponible?`);
  return (
    <Reveal delay={delay}>
      <div className="rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300"
           onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
           style={{ background: hover ? "rgba(179,152,91,0.045)" : "rgba(255,255,255,0.025)", border: `1px solid ${hover ? GOLD + "45" : "rgba(255,255,255,0.07)"}`, boxShadow: hover ? "0 10px 44px rgba(0,0,0,0.45)" : "none" }}>
        {/* Foto */}
        <div className="relative flex items-center justify-center overflow-hidden"
             style={{ height: "220px", background: "#050505", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {portada ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portada} alt={item.nombre} draggable={false} loading="lazy"
                 onClick={() => onFotos(item, 0)}
                 className="w-full h-full object-cover cursor-pointer transition-transform duration-700"
                 style={{ transform: hover ? "scale(1.05)" : "scale(1)" }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo-icon.png" alt="Mainstage Pro" draggable={false} className="w-16 h-16 object-contain opacity-10" />
          )}
          <div className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
               style={{ background: "rgba(0,0,0,0.65)", color: GOLD, border: `1px solid ${GOLD}45`, backdropFilter: "blur(6px)" }}>
            {CONDICION_LABEL[item.condicion] ?? "Usado"}
          </div>
          {item.fotos.length > 1 && (
            <button onClick={() => onFotos(item, 0)}
                    className="absolute bottom-3 right-3 rounded-full px-2.5 py-1.5 text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors"
                    style={{ background: "rgba(0,0,0,0.65)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.16)", backdropFilter: "blur(6px)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              {item.fotos.length} fotos
            </button>
          )}
        </div>

        {/* Datos */}
        <div className="p-5 flex-1 flex flex-col">
          <p className="text-white font-semibold text-[15px] leading-snug">{item.nombre}</p>
          {item.nombre !== item.descripcion && <p className="text-white/40 text-xs mt-1 leading-snug">{item.descripcion}</p>}
          {item.copy && <p className="text-white/55 text-[13px] mt-3 leading-relaxed">{item.copy}</p>}

          <div className="mt-4 pt-4 flex items-end justify-between gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <p className="font-bold tabular-nums leading-none" style={{ color: GOLD, fontSize: "1.6rem", letterSpacing: "-0.02em" }}>{fmx(item.precioVenta)}</p>
              <p className="text-white/30 text-[11px] mt-1.5">
                {item.precioVenta != null && "por unidad · "}{item.unidades} disponible{item.unidades > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <a href={wa} target="_blank" rel="noopener noreferrer"
             className="mt-4 w-full py-3 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
             style={{ background: GOLD, color: "#000" }}>
            Me interesa
          </a>
        </div>
      </div>
    </Reveal>
  );
}

export default function VentaClient({ categorias, totalPiezas }: { categorias: Categoria[]; totalPiezas: number }) {
  const [lightbox, setLightbox] = useState<{ fotos: string[]; index: number; alt: string } | null>(null);

  const abrir = useCallback((item: Item, index: number) => {
    if (!item.fotos.length) return;
    setLightbox({ fotos: item.fotos, index, alt: item.nombre });
  }, []);
  const cerrar = useCallback(() => setLightbox(null), []);
  const mover = useCallback((delta: number) => {
    setLightbox((lb) => (lb ? { ...lb, index: (lb.index + delta + lb.fotos.length) % lb.fotos.length } : lb));
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
      else if (e.key === "ArrowRight") mover(1);
      else if (e.key === "ArrowLeft") mover(-1);
    };
    window.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [lightbox, cerrar, mover]);

  const totalEquipos = categorias.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="bg-[#050505] text-white min-h-screen" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar       { width:3px; height:3px; }
        ::-webkit-scrollbar-track { background:#000; }
        ::-webkit-scrollbar-thumb { background:rgba(179,152,91,0.35); border-radius:2px; }
      `}</style>

      {/* Lightbox de la galería del equipo */}
      {lightbox && (
        <div onClick={cerrar} className="fixed inset-0 z-[9999] flex items-center justify-center"
             style={{ background: "#050505", animation: "fadeIn 0.2s ease" }}>
          <button onClick={cerrar} aria-label="Cerrar"
                  className="absolute top-6 right-6 w-11 h-11 rounded-full flex items-center justify-center text-white text-xl"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>✕</button>
          {lightbox.fotos.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); mover(-1); }} aria-label="Anterior"
                    className="absolute left-4 sm:left-8 w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>‹</button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.fotos[lightbox.index]} alt={lightbox.alt} onClick={(e) => e.stopPropagation()} draggable={false}
               style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: "12px" }} />
          {lightbox.fotos.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); mover(1); }} aria-label="Siguiente"
                    className="absolute right-4 sm:right-8 w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>›</button>
          )}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
            <p className="text-white/55 text-[13px] whitespace-nowrap">{lightbox.alt}</p>
            {lightbox.fotos.length > 1 && (
              <span className="text-white/35 text-[11px] tracking-widest">{lightbox.index + 1} / {lightbox.fotos.length}</span>
            )}
          </div>
        </div>
      )}

      <PresentacionNav />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden text-center" style={{ minHeight: "92svh" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(179,152,91,0.07) 0%, transparent 70%), linear-gradient(to bottom, #050505 0%, #080808 50%, #050505 100%)" }} />
        <div className="relative z-10 px-6 max-w-4xl mx-auto">
          <div className="mb-9" style={{ animation: "fadeUp 0.7s ease forwards 0.1s", opacity: 0 }}>
            <span className="inline-block max-w-full text-balance text-[10px] sm:text-xs tracking-[0.18em] sm:tracking-[0.3em] uppercase leading-relaxed px-4 py-2 rounded-full" style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}25` }}>
              Mainstage Pro · Venta de equipo
            </span>
          </div>
          <h1 className="font-bold leading-[0.95]" style={{ fontSize: "clamp(3rem,10vw,8rem)", letterSpacing: "-0.04em", animation: "fadeUp 0.9s ease forwards 0.3s", opacity: 0 }}>Nuestro equipo.</h1>
          <h1 className="font-bold leading-[0.95]" style={{ fontSize: "clamp(3rem,10vw,8rem)", letterSpacing: "-0.04em", color: GOLD, animation: "fadeUp 0.9s ease forwards 0.5s", opacity: 0 }}>En venta.</h1>
          <p className="text-white/45 mt-9 max-w-2xl mx-auto leading-relaxed" style={{ fontSize: "clamp(1rem,1.8vw,1.2rem)", animation: "fadeUp 0.9s ease forwards 0.75s", opacity: 0 }}>
            Audio, iluminación y video que hemos operado y mantenido nosotros mismos en eventos reales.
            Precio, condición y fotos a la vista. Puedes verlo y probarlo antes de comprar.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3 flex-wrap" style={{ animation: "fadeUp 0.9s ease forwards 0.95s", opacity: 0 }}>
            <a href="#catalogo" className="px-7 py-3.5 rounded-full font-semibold text-sm transition-transform hover:scale-[1.03]" style={{ background: GOLD, color: "#000" }}>
              Ver lo que está en venta
            </a>
            <a href={WA_GENERAL} target="_blank" rel="noopener noreferrer"
               className="px-7 py-3.5 rounded-full font-semibold text-sm text-white/75 hover:text-white transition-colors"
               style={{ border: "1px solid rgba(255,255,255,0.14)" }}>
              Preguntar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Por qué comprarnos */}
      <section className="px-6 py-20" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { t: "Equipo de trabajo, no de bodega", d: "Todo lo que vendemos salió a eventos con nosotros y se mantuvo con el uso al día." },
            { t: "Lo revisas antes de pagar", d: "Agenda una cita, préndelo, escúchalo y pruébalo con nuestro equipo técnico." },
            { t: "Sabemos qué te estás llevando", d: "Te decimos horas de uso, detalles y qué esperar de cada pieza. Sin sorpresas." },
            { t: "Te ayudamos a arrancar", d: "Resolvemos dudas de instalación y operación después de la compra." },
          ].map((b, i) => (
            <Reveal key={b.t} delay={i * 90}>
              <div className="rounded-2xl p-6 h-full" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-white font-semibold text-sm">{b.t}</p>
                <p className="text-white/40 text-[13px] mt-2 leading-relaxed">{b.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Catálogo */}
      <section id="catalogo" className="px-6 pb-24" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "5rem" }}>
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <span className="text-[11px] tracking-[0.28em] uppercase" style={{ color: GOLD }}>Disponible ahora</span>
              <h2 className="font-bold mt-4" style={{ fontSize: "clamp(2rem,5vw,3.4rem)", letterSpacing: "-0.03em" }}>Lo que está en venta</h2>
              {totalEquipos > 0 && (
                <p className="text-white/35 mt-4 text-sm">
                  {totalEquipos} {totalEquipos === 1 ? "equipo" : "equipos"} · {totalPiezas} {totalPiezas === 1 ? "pieza" : "piezas"} disponibles · precios en pesos mexicanos
                </p>
              )}
            </div>
          </Reveal>

          {totalEquipos === 0 ? (
            <Reveal>
              <div className="rounded-2xl p-10 text-center max-w-xl mx-auto" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-white font-semibold">Por ahora no tenemos equipo publicado en venta</p>
                <p className="text-white/40 text-sm mt-2 leading-relaxed">
                  Movemos inventario con frecuencia. Escríbenos y te avisamos en cuanto liberemos lo que buscas.
                </p>
                <a href={WA_GENERAL} target="_blank" rel="noopener noreferrer"
                   className="inline-block mt-6 px-6 py-3 rounded-full font-semibold text-sm" style={{ background: GOLD, color: "#000" }}>
                  Dime qué buscas
                </a>
              </div>
            </Reveal>
          ) : (
            <div className="space-y-16">
              {categorias.map((cat) => (
                <div key={cat.nombre}>
                  <Reveal>
                    <div className="flex items-center gap-4 mb-7">
                      <h3 className="text-white font-semibold text-lg whitespace-nowrap">{cat.nombre}</h3>
                      <span className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
                      <span className="text-white/30 text-xs">{cat.items.length}</span>
                    </div>
                  </Reveal>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {cat.items.map((item, i) => (
                      <ItemCard key={item.id} item={item} onFotos={abrir} delay={i * 70} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="px-6 py-20" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <span className="text-[11px] tracking-[0.28em] uppercase" style={{ color: GOLD }}>Cómo funciona</span>
              <h2 className="font-bold mt-4" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", letterSpacing: "-0.03em" }}>Comprar es simple</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { n: "01", t: "Nos escribes", d: "Dinos qué pieza te interesa. Te confirmamos disponibilidad y respondemos lo técnico." },
              { n: "02", t: "Lo pruebas", d: "Agendamos una cita en nuestras instalaciones para que lo veas funcionando." },
              { n: "03", t: "Cierras y te lo llevas", d: "Acordamos pago y entrega. Al vender la pieza sale de nuestro inventario de renta." },
            ].map((p, i) => (
              <Reveal key={p.n} delay={i * 100}>
                <div className="rounded-2xl p-7 h-full" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="font-bold tabular-nums" style={{ color: `${GOLD}55`, fontSize: "2rem", letterSpacing: "-0.03em" }}>{p.n}</span>
                  <p className="text-white font-semibold text-sm mt-3">{p.t}</p>
                  <p className="text-white/40 text-[13px] mt-2 leading-relaxed">{p.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Cierre */}
      <section className="px-6 py-24 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "radial-gradient(ellipse 70% 60% at 50% 60%, rgba(179,152,91,0.06) 0%, transparent 70%)" }}>
        <Reveal>
          <h2 className="font-bold" style={{ fontSize: "clamp(2rem,5vw,3.4rem)", letterSpacing: "-0.03em" }}>¿Te interesa algo?</h2>
          <p className="text-white/45 mt-5 max-w-xl mx-auto leading-relaxed">
            Escríbenos y te resolvemos precio, condición y entrega en la misma conversación.
          </p>
          <a href={WA_GENERAL} target="_blank" rel="noopener noreferrer"
             className="inline-block mt-9 px-8 py-4 rounded-full font-semibold text-sm transition-transform hover:scale-[1.03]"
             style={{ background: GOLD, color: "#000" }}>
            Hablar por WhatsApp
          </a>
          <p className="text-white/20 text-[11px] mt-10">
            Precios en pesos mexicanos, sujetos a cambio sin previo aviso. La venta se confirma al apartar la pieza.
          </p>
        </Reveal>
      </section>
    </div>
  );
}
