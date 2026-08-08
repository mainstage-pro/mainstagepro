"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import PresentacionNav from "@/components/presentacion/PresentacionNav";

const GOLD = "#B3985B";
const WA_BASE = "https://wa.me/524461432565?text=";

function wa(msg: string) { return WA_BASE + encodeURIComponent(msg); }

type Equipo = { id: string; descripcion: string | null; marca: string | null; modelo: string | null; precioRenta: number | null; imagenUrl: string | null; categoria?: { nombre: string } | null };
type ProductoLite = { id: string; nombre: string; categoria: string | null; imagenUrl: string | null; precioFinal: number };
type Item = { id: string; tipo: string; cantidad: number; equipo: Equipo | null; producto: ProductoLite | null };
type Concepto = { id: string; tipo: string; descripcion: string };
type Imagen = { id: string; url: string; orden: number };
type Paquete = {
  id: string; nombre: string; tipoEvento: string; rangoPersonas: string | null;
  subtiposEvento: string | null; resumen: string | null; descripcion: string | null;
  propuestaValor: string | null; items: Item[]; conceptos: Concepto[]; imagenes: Imagen[];
};
type Producto = { id: string; nombre: string; descripcion: string | null; categoria: string | null; tiposEvento: string | null; imagenUrl: string | null; precioFinal: number };

const TABS = [
  { key: "SOCIAL", label: "Sociales", sub: "Bodas · XV años · Fiestas" },
  { key: "MUSICAL", label: "Musicales", sub: "Conciertos · Festivales · DJ" },
  { key: "EMPRESARIAL", label: "Empresariales", sub: "Congresos · Lanzamientos" },
];

function useReveal(threshold = 0.14) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}

function R({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, vis } = useReveal();
  return (
    <div ref={ref} className={className}
      style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.7s ${delay}ms ease, transform 0.7s ${delay}ms ease` }}>
      {children}
    </div>
  );
}

function money(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

function parseJSON(s: string | null): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}

function itemLabel(it: Item): string {
  if (it.tipo === "PRODUCTO" && it.producto) return it.producto.nombre;
  if (it.equipo) return it.equipo.descripcion || [it.equipo.marca, it.equipo.modelo].filter(Boolean).join(" ") || "Equipo";
  return "Equipo";
}

function PaqueteCard({ p }: { p: Paquete }) {
  const [abierto, setAbierto] = useState(false);
  const portada = p.imagenes[0]?.url ?? null;
  const subtipos = parseJSON(p.subtiposEvento);
  const incluye = [
    ...p.items.map((it) => `${it.cantidad > 1 ? it.cantidad + "× " : ""}${itemLabel(it)}`),
    ...p.conceptos.map((c) => c.descripcion),
  ].filter(Boolean);
  const visibles = abierto ? incluye : incluye.slice(0, 6);

  return (
    <div className="flex flex-col rounded-3xl overflow-hidden h-full" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
      <div className="relative aspect-[16/10] overflow-hidden">
        {portada ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={portada} alt={p.nombre} draggable={false} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: "radial-gradient(circle at 30% 20%, rgba(179,152,91,0.22), #0c0c0c 65%)" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,8,8,0.7), transparent 55%)" }} />
        {p.rangoPersonas && (
          <span className="absolute top-4 left-4 text-[11px] font-medium px-3 py-1.5 rounded-full"
            style={{ background: "rgba(8,8,8,0.6)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)" }}>
            {p.rangoPersonas} personas
          </span>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-semibold text-white leading-snug mb-2" style={{ fontSize: "1.25rem", letterSpacing: "-0.01em" }}>{p.nombre}</h3>
        {(p.resumen || p.propuestaValor) && (
          <p className="text-white/45 text-sm leading-relaxed mb-4">{p.resumen || p.propuestaValor}</p>
        )}

        {subtipos.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {subtipos.map((s, i) => (
              <span key={i} className="text-[11px] text-white/55 px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>{s}</span>
            ))}
          </div>
        )}

        {incluye.length > 0 && (
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/30 mb-2.5">Qué incluye</p>
            <ul className="space-y-1.5">
              {visibles.map((t, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-white/65">
                  <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
                  {t}
                </li>
              ))}
            </ul>
            {incluye.length > 6 && (
              <button onClick={() => setAbierto((v) => !v)} className="mt-2.5 text-xs font-medium transition-colors" style={{ color: GOLD }}>
                {abierto ? "Ver menos" : `Ver ${incluye.length - 6} más`}
              </button>
            )}
          </div>
        )}

        <a href={wa(`Hola, me interesa el paquete "${p.nombre}". ¿Me pueden dar más información y cotización?`)} target="_blank" rel="noopener noreferrer"
          className="mt-auto text-center text-sm font-semibold px-6 py-3.5 rounded-full transition-all hover:scale-[1.02]" style={{ background: GOLD, color: "#000" }}>
          Solicitar este paquete
        </a>
      </div>
    </div>
  );
}

function ProductoCard({ p }: { p: Producto }) {
  return (
    <div className="rounded-2xl overflow-hidden h-full flex flex-col" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
      <div className="relative aspect-[4/3] overflow-hidden">
        {p.imagenUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={p.imagenUrl} alt={p.nombre} draggable={false} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: "radial-gradient(circle at 40% 30%, rgba(179,152,91,0.16), #0c0c0c 70%)" }} />
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        {p.categoria && <p className="text-[10px] uppercase tracking-[0.14em] text-white/30 mb-1.5">{p.categoria}</p>}
        <h4 className="font-medium text-white leading-snug text-sm mb-2">{p.nombre}</h4>
        {p.precioFinal > 0 && (
          <p className="mt-auto text-sm font-semibold" style={{ color: GOLD }}>{money(p.precioFinal)} <span className="text-white/30 font-normal text-xs">/ renta</span></p>
        )}
      </div>
    </div>
  );
}

const TIPOS_VALIDOS = ["SOCIAL", "MUSICAL", "EMPRESARIAL"];

export default function PaquetesClient({ defaultTab }: { defaultTab?: string } = {}) {
  const inicial = defaultTab && TIPOS_VALIDOS.includes(defaultTab) ? defaultTab : "SOCIAL";
  const [tab, setTab] = useState(inicial);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    fetch(`/api/paquetes/publico?tipoEvento=${tab}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPaquetes(Array.isArray(d?.paquetes) ? d.paquetes : []))
      .catch(() => setPaquetes([]))
      .finally(() => setCargando(false));
  }, [tab]);

  useEffect(() => {
    fetch(`/api/productos/publico`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProductos(Array.isArray(d?.productos) ? d.productos : []))
      .catch(() => setProductos([]));
  }, []);

  const productosTab = useMemo(
    () => productos.filter((p) => parseJSON(p.tiposEvento).includes(tab)).slice(0, 8),
    [productos, tab]
  );

  return (
    <div className="min-h-screen bg-[#080808] text-white" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <style>{`
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #080808; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      {/* Nav unificada */}
      <PresentacionNav />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-32 pb-10 sm:pt-40">
        <span className="text-[11px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>Paquetes</span>
        <h1 className="mt-5 font-bold leading-[1.05] tracking-tight" style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}>
          Todo listo,<br /><span className="text-white/40">en un solo paquete.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-white/50 sm:text-lg">
          Combinaciones armadas para cada tipo de evento. Sabes exactamente qué incluye cada uno antes de cotizar.
        </p>
      </section>

      {/* Tabs */}
      <section className="mx-auto max-w-6xl px-6 sticky top-16 z-40 py-4" style={{ background: "rgba(8,8,8,0.85)", backdropFilter: "blur(12px)" }}>
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const activo = t.key === tab;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="px-5 py-2.5 rounded-full text-sm transition-all"
                style={{
                  background: activo ? GOLD : "rgba(255,255,255,0.04)",
                  color: activo ? "#000" : "rgba(255,255,255,0.65)",
                  border: `1px solid ${activo ? GOLD : "rgba(255,255,255,0.08)"}`,
                  fontWeight: activo ? 600 : 400,
                }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Paquetes grid */}
      <section className="mx-auto max-w-6xl px-6 pt-8 pb-24">
        {cargando ? (
          <p className="text-white/30 text-sm py-16 text-center">Cargando paquetes…</p>
        ) : paquetes.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-white/40 text-sm mb-6">Aún no tenemos paquetes publicados para esta categoría.</p>
            <a href={wa("Hola, me gustaría un paquete a la medida para mi evento.")} target="_blank" rel="noopener noreferrer"
              className="inline-block text-sm font-semibold px-7 py-3.5 rounded-full" style={{ background: GOLD, color: "#000" }}>
              Pedir paquete a la medida
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paquetes.map((p, i) => (
              <R key={p.id} delay={i * 60}><PaqueteCard p={p} /></R>
            ))}
          </div>
        )}
      </section>

      {/* Productos destacados */}
      {productosTab.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4">Productos</p>
            <h2 className="font-bold text-white leading-[1.05] mb-3" style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)", letterSpacing: "-0.025em" }}>
              O arma el tuyo a la medida.
            </h2>
            <p className="text-white/40 text-sm sm:text-base leading-relaxed max-w-2xl mb-10">
              Componentes que puedes combinar según lo que tu evento necesite.
            </p>
          </R>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {productosTab.map((p, i) => (
              <R key={p.id} delay={i * 50}><ProductoCard p={p} /></R>
            ))}
          </div>
          <div className="mt-10">
            <a href="/presentacion/inventario" className="text-sm font-medium transition-colors hover:text-white" style={{ color: GOLD }}>
              Ver inventario completo →
            </a>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-6 pb-32">
        <div className="max-w-3xl mx-auto text-center">
          <R>
            <h2 className="font-bold text-white leading-[1.08] mb-5" style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)", letterSpacing: "-0.025em" }}>
              ¿No encuentras lo que buscas?
            </h2>
            <p className="text-white/45 text-sm sm:text-base leading-relaxed mb-9 max-w-xl mx-auto">
              Cada evento es distinto. Cuéntanos qué necesitas y armamos un paquete a tu medida en menos de 24 horas.
            </p>
            <a href={wa("Hola, me gustaría un paquete a la medida para mi evento.")} target="_blank" rel="noopener noreferrer"
              className="inline-block text-sm font-semibold px-9 py-4 rounded-full transition-all hover:scale-105" style={{ background: GOLD, color: "#000" }}>
              Hablar con nosotros
            </a>
          </R>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-10">
        <div className="max-w-6xl mx-auto text-center text-xs text-white/30">
          Mainstage Pro · Producción técnica de eventos
        </div>
      </footer>
    </div>
  );
}
