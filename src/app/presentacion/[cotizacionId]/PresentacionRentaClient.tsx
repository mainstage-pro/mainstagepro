"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Linea {
  id: string;
  tipo: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  cantidad: number;
  subtotal: number;
  esIncluido: boolean;
  notas: string | null;
  jornada: string | null;
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
  granTotal: number;
  total: number;
  aplicaIva: boolean;
  montoIva: number;
  descuentoTotalPct: number;
  observaciones: string | null;
  terminosComerciales: string | null;
  cliente: { nombre: string; empresa: string | null; telefono: string | null; correo: string | null };
  trato: { tipoEvento: string; ideasReferencias?: string | null } | null;
  lineas: Linea[];
}

// ─── Equipment images ─────────────────────────────────────────────────────────
const MARCA_POOL: Record<string, string[]> = {
  "rcf":           ["/images/presentacion/rcf-hdl30a.png", "/images/presentacion/rcf-sub8006.png"],
  "electro voice": ["/images/presentacion/ev-ekx12p.png", "/images/presentacion/ev-ekx18p.png"],
  "electro-voice": ["/images/presentacion/ev-ekx12p.png", "/images/presentacion/ev-ekx18p.png"],
  "ev":            ["/images/presentacion/ev-ekx12p.png", "/images/presentacion/ev-ekx18p.png"],
  "allen & heath": ["/images/presentacion/allen-heath-dlive.png", "/images/presentacion/allen-heath-sq5.png"],
  "allen&heath":   ["/images/presentacion/allen-heath-dlive.png", "/images/presentacion/allen-heath-sq5.png"],
  "shure":         ["/images/presentacion/shure-axient.png", "/images/presentacion/shure-slxd.png", "/images/presentacion/shure-sm58.png", "/images/presentacion/shure-beta52a.png"],
  "pioneer":       ["/images/presentacion/pioneer-cdj3000.png", "/images/presentacion/pioneer-djmv10.png"],
  "pioneer dj":    ["/images/presentacion/pioneer-cdj3000.png", "/images/presentacion/pioneer-djmv10.png"],
  "grand ma":      ["/images/presentacion/grandma-ma3.png", "/images/presentacion/ma-command-wing.png"],
  "grandma":       ["/images/presentacion/grandma-ma3.png", "/images/presentacion/ma-command-wing.png"],
  "ma":            ["/images/presentacion/grandma-ma3.png", "/images/presentacion/ma-command-wing.png"],
  "ma lighting":   ["/images/presentacion/grandma-ma3.png", "/images/presentacion/ma-command-wing.png"],
  "chauvet":       ["/images/presentacion/chauvet-spot260.png", "/images/presentacion/chauvet-slimpar.png", "/images/presentacion/chauvet-pinspot-bar.png"],
  "lite tek":      ["/images/presentacion/lite-tek-beam280.png", "/images/presentacion/lite-tek-bar824i.png", "/images/presentacion/lite-tek-blinder200.png", "/images/presentacion/lite-tek-flasher200.png", "/images/presentacion/lite-tek-par.png"],
  "litetek":       ["/images/presentacion/lite-tek-beam280.png", "/images/presentacion/lite-tek-bar824i.png", "/images/presentacion/lite-tek-blinder200.png", "/images/presentacion/lite-tek-par.png"],
  "lumos":         ["/images/presentacion/lumos-l7.png", "/images/presentacion/lumos-l1-retro.png", "/images/presentacion/lumos-maple-lamp.png", "/images/presentacion/lumos-sixaline.png"],
  "sunstar":       ["/images/presentacion/sunstar-kaleidos.png", "/images/presentacion/sunstar-soul-rgbw.png"],
  "sun star":      ["/images/presentacion/sunstar-kaleidos.png", "/images/presentacion/sunstar-soul-rgbw.png"],
};
const MARCA_IMAGES: Record<string, string> = {
  "midas":      "/images/presentacion/midas-m32.png",
  "sennheiser": "/images/presentacion/sennheiser-iem.png",
  "rode":       "/images/presentacion/rode-m5.png",
  "astera":     "/images/presentacion/astera-ax1.png",
  "steel pro":  "/images/presentacion/steel-pro-razor.png",
  "blackmagic": "/images/presentacion/blackmagic-atem.png",
  "predator":   "/images/presentacion/predator-9500.png",
  "wacker":     "/images/presentacion/wacker-g120.png",
};

function idHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const MODELO_IMAGES: Record<string, string> = {
  "DJM A9": "/images/presentacion/pioneer-djmv10.png",
  "DJM V10": "/images/presentacion/pioneer-djmv10.png",
  "DJM-V10": "/images/presentacion/pioneer-djmv10.png",
  "DJM 900 NXS2": "/images/presentacion/pioneer-djmv10.png",
  "DJM S11": "/images/presentacion/pioneer-djmv10.png",
  "EKX 18P": "/images/presentacion/ev-ekx18p.png",
  "EKX 12P": "/images/presentacion/ev-ekx12p.png",
  "HDL 30A": "/images/presentacion/rcf-hdl30a.png",
  "HDL 6A": "/images/presentacion/rcf-hdl30a.png",
  "SUB 8006 AS": "/images/presentacion/rcf-sub8006.png",
  "SQ5": "/images/presentacion/allen-heath-sq5.png",
  "AR24/12": "/images/presentacion/allen-heath-dlive.png",
  "SLXD B58": "/images/presentacion/shure-slxd.png",
  "BLX24 SM58": "/images/presentacion/shure-slxd.png",
  "AXIENT B58/SM58": "/images/presentacion/shure-axient.png",
  "IEM G4": "/images/presentacion/sennheiser-iem.png",
  "EK IEM G4": "/images/presentacion/sennheiser-iem.png",
  "PSM1000": "/images/presentacion/shure-axient.png",
  "BAR 824i": "/images/presentacion/lite-tek-bar824i.png",
  "BEAM 280": "/images/presentacion/lite-tek-beam280.png",
  "BLINDER 200": "/images/presentacion/lite-tek-blinder200.png",
  "FLASHER 200": "/images/presentacion/lite-tek-flasher200.png",
  "18X10 Ambar": "/images/presentacion/lite-tek-par.png",
  "Fazer 1500": "/images/presentacion/lite-tek-fazer1500.png",
  "Int SPOT 260": "/images/presentacion/chauvet-spot260.png",
  "Slimpar Q12 BT": "/images/presentacion/chauvet-slimpar.png",
  "Pinspot Bar": "/images/presentacion/chauvet-pinspot-bar.png",
  "KALEIDOS": "/images/presentacion/sunstar-kaleidos.png",
  "SM58": "/images/presentacion/shure-sm58.png",
  "SM57": "/images/presentacion/shure-sm58.png",
  "SM31": "/images/presentacion/shure-sm58.png",
  "SM81": "/images/presentacion/shure-sm58.png",
  "BETA 52A": "/images/presentacion/shure-beta52a.png",
  "BETA91A": "/images/presentacion/shure-beta52a.png",
  "Command Wing": "/images/presentacion/ma-command-wing.png",
  "MA3 Compact XT": "/images/presentacion/grandma-ma3.png",
  "L7": "/images/presentacion/lumos-l7.png",
  "L1 Retro": "/images/presentacion/lumos-l1-retro.png",
  "Maple Lamp": "/images/presentacion/lumos-maple-lamp.png",
  "Sixaline": "/images/presentacion/lumos-sixaline.png",
  "SOUL RGBW": "/images/presentacion/sunstar-soul-rgbw.png",
  "Atem Mini Pro": "/images/presentacion/blackmagic-atem.png",
  "Truss": "/images/presentacion/truss.png",
};

function getEquipoImage(linea: Linea): string | null {
  if (linea.modelo && MODELO_IMAGES[linea.modelo]) return MODELO_IMAGES[linea.modelo];
  const marca = (linea.marca ?? "").toLowerCase().trim();
  for (const key of Object.keys(MARCA_POOL)) {
    if (marca.includes(key) || key.includes(marca)) {
      const pool = MARCA_POOL[key];
      return pool[idHash(linea.id) % pool.length];
    }
  }
  for (const key of Object.keys(MARCA_IMAGES)) {
    if (marca.includes(key) || key.includes(marca)) return MARCA_IMAGES[key];
  }
  return null;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const fn = () => setY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return y;
}

// ─── Animation wrapper ────────────────────────────────────────────────────────
function R({ children, delay = 0, y = 32, className = "" }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const { ref, vis } = useReveal();
  return (
    <div ref={ref} className={className}
         style={{
           transitionDelay: `${delay}ms`,
           opacity: vis ? 1 : 0,
           transform: vis ? "translateY(0)" : `translateY(${y}px)`,
           transition: "opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)",
         }}>
      {children}
    </div>
  );
}

// ─── Utils ────────────────────────────────────────────────────────────────────
const GOLD = "#B3985B";

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return null;
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function fmtDateShort(s: string | null | undefined) {
  if (!s) return null;
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

function groupByCategory(lineas: Linea[]) {
  const isEquipo = (l: Linea) => l.tipo === "EQUIPO_PROPIO" || l.tipo === "EQUIPO_EXTERNO";
  const map: Record<string, Linea[]> = {};
  for (const l of lineas) {
    if (!isEquipo(l)) continue;
    const cat = l.equipo?.categoria?.nombre ?? "Equipo adicional";
    if (!map[cat]) map[cat] = [];
    map[cat].push(l);
  }
  return map;
}

// Category icon
function CatIcon({ cat }: { cat: string }) {
  const c = cat.toLowerCase();
  if (c.includes("audio") || c.includes("micr") || c.includes("monitor")) return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: GOLD }}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  );
  if (c.includes("ilum") || c.includes("luz") || c.includes("led") || c.includes("beam") || c.includes("par")) return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: GOLD }}>
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
  if (c.includes("dj") || c.includes("tornamesа") || c.includes("mixer") || c.includes("console")) return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: GOLD }}>
      <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    </svg>
  );
  if (c.includes("video") || c.includes("pantalla") || c.includes("led wall") || c.includes("proy")) return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: GOLD }}>
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: GOLD }}>
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-8M12 3v4"/>
    </svg>
  );
}

// ─── Single equipment row (technical, spec-focused) ───────────────────────────
function EquipoRow({ linea, index }: { linea: Linea; index: number }) {
  const img = getEquipoImage(linea);
  return (
    <R delay={index * 50} y={20}>
      <div className="flex items-center gap-4 py-4 border-b border-white/[0.06] group"
           style={{ borderColor: "rgba(179,152,91,0.08)" }}>
        {/* Thumbnail */}
        <div className="shrink-0 w-14 h-14 rounded-lg bg-[#0d0d0d] border border-white/[0.06] flex items-center justify-center overflow-hidden">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={linea.modelo ?? linea.descripcion} draggable={false}
                 className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-400" />
          ) : (
            <span className="text-[#B3985B]/50 text-xs font-bold">
              {(linea.marca ?? linea.descripcion).charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            {linea.marca && (
              <span className="text-[#B3985B]/70 text-[10px] font-semibold uppercase tracking-widest">{linea.marca}</span>
            )}
            <p className="text-white text-sm font-semibold leading-tight">
              {linea.modelo ?? linea.descripcion}
            </p>
          </div>
          {linea.modelo && linea.descripcion !== linea.modelo && (
            <p className="text-white/35 text-xs mt-0.5 truncate">{linea.descripcion}</p>
          )}
          {linea.notas && (
            <p className="text-white/30 text-xs mt-1 italic">{linea.notas}</p>
          )}
        </div>

        {/* Qty badge */}
        <div className="shrink-0 flex flex-col items-center">
          <span className="text-[#B3985B] font-bold text-lg tabular-nums leading-none">×{linea.cantidad}</span>
          <span className="text-white/20 text-[9px] uppercase tracking-wider mt-0.5">unid</span>
        </div>

        {/* Price — only if not incluido */}
        {!linea.esIncluido && linea.subtotal > 0 && (
          <div className="shrink-0 text-right hidden sm:block">
            <span className="text-white/50 text-xs">{fmt(linea.subtotal)}</span>
          </div>
        )}
      </div>
    </R>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────
function CategorySection({ cat, lineas, index }: { cat: string; lineas: Linea[]; index: number }) {
  return (
    <R delay={index * 80} y={24}>
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
               style={{ background: "rgba(179,152,91,0.08)", border: "1px solid rgba(179,152,91,0.15)" }}>
            <CatIcon cat={cat} />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">{cat}</p>
            <p className="text-white/30 text-xs">{lineas.length} {lineas.length === 1 ? "equipo" : "equipos"}</p>
          </div>
          <div className="flex-1 h-px ml-2" style={{ background: "rgba(179,152,91,0.12)" }} />
        </div>
        <div className="pl-0">
          {lineas.map((l, i) => <EquipoRow key={l.id} linea={l} index={i} />)}
        </div>
      </div>
    </R>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PresentacionRentaClient({ cotizacion }: { cotizacion: Cotizacion }) {
  const scrollY    = useScrollY();
  const [contractOpen, setContract] = useState(false);

  const tipoEvento  = cotizacion.trato?.tipoEvento ?? cotizacion.tipoEvento ?? "";
  const evento      = cotizacion.nombreEvento ?? tipoEvento ?? "Tu Evento";
  const fecha       = fmtDate(cotizacion.fechaEvento);
  const tel         = cotizacion.cliente.telefono?.replace(/\D/g, "");
  const waMsg       = encodeURIComponent(`Hola, acabo de revisar la propuesta de renta ${cotizacion.numeroCotizacion} para ${evento}. Quiero confirmar el servicio.`);
  const waUrl       = tel ? `https://wa.me/52${tel}?text=${waMsg}` : null;

  // Parse rental logistics from trato
  let rentaData: Record<string, string> = {};
  try {
    if (cotizacion.trato?.ideasReferencias) {
      const d = JSON.parse(cotizacion.trato.ideasReferencias);
      if (d && typeof d === "object" && d.nivelServicio) rentaData = d;
    }
  } catch { /* noop */ }

  const NIVEL_LABELS: Record<string, string> = {
    SOLO_RENTA: "Cliente recoge en bodega",
    RENTA_ENTREGA: "Renta + entrega a domicilio",
    RENTA_MONTAJE: "Renta + entrega y montaje",
    RENTA_FULL: "Renta + entrega, montaje y operación",
  };

  const grouped = groupByCategory(cotizacion.lineas);
  const categories = Object.keys(grouped);
  const totalEquipos = cotizacion.lineas
    .filter(l => l.tipo === "EQUIPO_PROPIO" || l.tipo === "EQUIPO_EXTERNO")
    .reduce((a, l) => a + l.cantidad, 0);

  const navOpacity = Math.min(0.95, scrollY / 80);

  const DEFAULT_TERMS = `CONDICIONES DE RENTA

1. VIGENCIA DE LA PROPUESTA
Esta propuesta tiene vigencia de 15 días naturales. Pasado este plazo, precios y disponibilidad quedan sujetos a actualización.

2. ANTICIPO Y PAGO
• 50% del monto total para confirmar y reservar el equipo.
• 50% restante liquidado antes de la entrega del equipo.
• Formas de pago: transferencia bancaria, depósito o SPEI.

3. ENTREGA Y DEVOLUCIÓN
El equipo se entrega revisado y en óptimas condiciones. El cliente deberá devolverlo en el mismo estado. Cualquier daño o faltante será cargado al cliente según el valor comercial del equipo.

4. RESPONSABILIDAD
El cliente asume plena responsabilidad del equipo desde el momento de la entrega hasta su devolución formal, incluyendo daños por uso inadecuado, accidentes o robo.

5. CANCELACIÓN
• Cancelación con más de 15 días de anticipación: reembolso del 80% del anticipo.
• Cancelación con menos de 15 días: anticipo no reembolsable.

6. SOPORTE TÉCNICO
Mainstage Pro puede proveer soporte técnico básico vía WhatsApp durante el uso del equipo. El equipo se entrega con manuales o instrucciones básicas de operación cuando aplique.`;

  return (
    <main className="bg-[#060606] text-white overflow-x-hidden"
          style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scanline { from { transform:translateY(-100%); } to { transform:translateY(100vh); } }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 sm:px-10 h-14 transition-all duration-400"
           style={{
             background: `rgba(6,6,6,${navOpacity})`,
             backdropFilter: scrollY > 20 ? "blur(20px)" : "none",
             borderBottom: scrollY > 20 ? "1px solid rgba(255,255,255,0.04)" : "none",
           }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 opacity-90" draggable={false} />
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-white/25 text-xs tracking-wide">
            {cotizacion.numeroCotizacion} · Renta de Equipo
          </span>
          <div className="w-px h-3 bg-white/10" />
          <span className="text-white/25 text-xs">{cotizacion.cliente.empresa ?? cotizacion.cliente.nombre}</span>
        </div>
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noreferrer"
             className="text-[11px] font-semibold px-3.5 py-1.5 rounded-full hidden sm:flex items-center gap-1.5 transition-colors"
             style={{ border: `1px solid ${GOLD}50`, color: GOLD }}
             onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(179,152,91,0.08)"}
             onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Confirmar
          </a>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col justify-end pb-16 pt-32 px-6 sm:px-12 overflow-hidden">
        {/* Grid background — technical feel */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.035,
          backgroundImage: "linear-gradient(rgba(179,152,91,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(179,152,91,0.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px" }} />
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
             style={{ background: "radial-gradient(ellipse at center, rgba(179,152,91,0.06) 0%, transparent 65%)" }} />

        <div className="relative z-10 max-w-5xl">
          {/* Tag */}
          <div className="flex items-center gap-3 mb-8"
               style={{ animation: "fadeUp 0.7s ease forwards 0.1s", opacity: 0 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                 style={{ border: "1px solid rgba(179,152,91,0.25)", background: "rgba(179,152,91,0.05)" }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
                Renta de Equipo · {cotizacion.numeroCotizacion}
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="font-bold text-white leading-[1.0] mb-6"
              style={{ fontSize: "clamp(2.6rem,7vw,6.5rem)", letterSpacing: "-0.03em",
                       animation: "fadeUp 0.8s ease forwards 0.25s", opacity: 0 }}>
            El equipo que<br />
            <span style={{ color: GOLD }}>necesitas,</span><br />
            <span className="text-white/55">listo para tu fecha.</span>
          </h1>

          {/* Event info row */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-10"
               style={{ animation: "fadeUp 0.8s ease forwards 0.45s", opacity: 0 }}>
            {fecha && (
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: GOLD }}>
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span className="text-white/60 text-sm capitalize">{fecha}</span>
              </div>
            )}
            {cotizacion.lugarEvento && (
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: GOLD }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span className="text-white/60 text-sm">{cotizacion.lugarEvento}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: GOLD }}>
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-8M12 3v4"/>
              </svg>
              <span className="text-white/60 text-sm">{totalEquipos} equipos · {categories.length} categorías</span>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center gap-3"
               style={{ animation: "fadeUp 0.8s ease forwards 0.6s", opacity: 0 }}>
            <a href="#inventario"
               className="px-7 py-3.5 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105"
               style={{ background: GOLD }}>
              Ver inventario de renta
            </a>
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noreferrer"
                 className="px-7 py-3.5 rounded-full font-semibold text-white/70 text-sm tracking-wide border border-white/15 hover:border-white/35 transition-all duration-300">
                Confirmar por WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-30"
             style={{ animation: "fadeUp 0.8s ease forwards 1.2s" }}>
          <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/40 to-transparent" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-white/40">Scroll</span>
        </div>
      </section>

      {/* ── LOGÍSTICA DE RENTA ── */}
      {(rentaData.nivelServicio || rentaData.fechaEntrega || rentaData.fechaDevolucion || rentaData.direccionEntrega) && (
        <section className="py-16 px-6 sm:px-12 border-t border-b border-white/[0.04]" style={{ background: "#040404" }}>
          <div className="max-w-5xl mx-auto">
            <R>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-6" style={{ color: GOLD }}>
                Logística acordada
              </p>
            </R>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {rentaData.nivelServicio && (
                <R delay={0}>
                  <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-white/35 text-[10px] uppercase tracking-wider mb-2">Modalidad</p>
                    <p className="text-white text-sm font-semibold leading-snug">{NIVEL_LABELS[rentaData.nivelServicio] ?? rentaData.nivelServicio}</p>
                  </div>
                </R>
              )}
              {rentaData.fechaEntrega && (
                <R delay={60}>
                  <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-white/35 text-[10px] uppercase tracking-wider mb-2">Entrega de equipo</p>
                    <p className="text-white text-sm font-semibold">{fmtDateShort(rentaData.fechaEntrega)}</p>
                    {rentaData.horaEntrega && <p className="text-white/40 text-xs mt-0.5">{rentaData.horaEntrega}</p>}
                  </div>
                </R>
              )}
              {rentaData.fechaDevolucion && (
                <R delay={120}>
                  <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-white/35 text-[10px] uppercase tracking-wider mb-2">Devolución</p>
                    <p className="text-white text-sm font-semibold">{fmtDateShort(rentaData.fechaDevolucion)}</p>
                    {rentaData.horaDevolucion && <p className="text-white/40 text-xs mt-0.5">{rentaData.horaDevolucion}</p>}
                  </div>
                </R>
              )}
              {rentaData.direccionEntrega && (
                <R delay={180}>
                  <div className="rounded-xl p-5 col-span-1 sm:col-span-2 lg:col-span-1" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-white/35 text-[10px] uppercase tracking-wider mb-2">Dirección de entrega</p>
                    <p className="text-white text-sm font-semibold leading-snug">{rentaData.direccionEntrega}</p>
                  </div>
                </R>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── INVENTARIO ── */}
      <section id="inventario" className="py-20 px-6 sm:px-12">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>
              Inventario de renta
            </p>
            <h2 className="font-bold text-white mb-3 leading-tight"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.022em" }}>
              Equipo incluido en esta propuesta
            </h2>
            <p className="text-white/40 text-sm mb-12 max-w-xl leading-relaxed">
              Todo el equipo listado es propiedad de Mainstage Pro. Sale revisado desde bodega
              y se entrega en condiciones óptimas de funcionamiento y estética.
            </p>
          </R>

          {categories.length > 0 ? (
            categories.map((cat, i) => (
              <CategorySection key={cat} cat={cat} lineas={grouped[cat]} index={i} />
            ))
          ) : (
            <R>
              <p className="text-white/30 text-sm italic">El equipo específico se coordinará directamente.</p>
            </R>
          )}
        </div>
      </section>

      {/* ── GARANTÍAS DEL EQUIPO ── */}
      <section className="py-20 px-6 sm:px-12" style={{ background: "#040404" }}>
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>Por qué rentar con nosotros</p>
            <h2 className="font-bold text-white mb-14 leading-tight"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.022em" }}>
              Equipo propio.<br />Sin intermediarios.
            </h2>
          </R>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: "shield",
                title: "Sale revisado desde bodega",
                body: "Cada equipo se prueba antes de salir. Verificamos funcionamiento, estética y que todos los accesorios estén completos.",
                delay: 0,
              },
              {
                icon: "package",
                title: "Todo el inventario es nuestro",
                body: "No rentamos a terceros para cubrir tu pedido. Lo que cotizamos es lo que tenemos. Disponibilidad real, sin sorpresas.",
                delay: 80,
              },
              {
                icon: "tool",
                title: "Accesorios incluidos",
                body: "Cables de corriente, tripies, bases, clamps — lo necesario para que el equipo funcione va incluido sin costo adicional.",
                delay: 160,
              },
              {
                icon: "clock",
                title: "Entrega puntual",
                body: "Coordinamos la entrega con tiempo de sobra para que no haya carreras antes del evento. La hora acordada se respeta.",
                delay: 240,
              },
              {
                icon: "chat",
                title: "Soporte por WhatsApp",
                body: "Si tienes una duda técnica durante el uso del equipo, estamos disponibles. No te dejamos solo con el inventario.",
                delay: 320,
              },
              {
                icon: "repeat",
                title: "Proceso de devolución simple",
                body: "Recoges el equipo, lo usas, lo devuelves. Sin burocracia — siempre y cuando todo regrese en las mismas condiciones.",
                delay: 400,
              },
            ].map((item) => (
              <R key={item.title} delay={item.delay}>
                <div className="rounded-2xl p-6 h-full"
                     style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="mb-4">
                    {item.icon === "shield" && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    )}
                    {item.icon === "package" && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5">
                        <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                      </svg>
                    )}
                    {item.icon === "tool" && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                      </svg>
                    )}
                    {item.icon === "clock" && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    )}
                    {item.icon === "chat" && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill={GOLD}>
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    )}
                    {item.icon === "repeat" && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5">
                        <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                        <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                      </svg>
                    )}
                  </div>
                  <h4 className="text-white font-semibold mb-2 text-sm leading-tight">{item.title}</h4>
                  <p className="text-white/40 text-xs leading-relaxed">{item.body}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESUMEN DE COSTOS ── */}
      <section className="py-20 px-6 sm:px-12">
        <div className="max-w-2xl mx-auto">
          <R>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>Resumen de costos</p>
            <h2 className="font-bold text-white mb-10 leading-tight"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.022em" }}>
              Inversión total
            </h2>
          </R>

          <R delay={80}>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              {/* Line items */}
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                {cotizacion.lineas.filter(l => !l.esIncluido && l.subtotal > 0).map((l, i) => (
                  <div key={l.id} className="flex items-center gap-4 px-6 py-3"
                       style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent" }}>
                    <span className="text-white/30 text-xs w-5 text-center">×{l.cantidad}</span>
                    <span className="flex-1 text-white/70 text-sm truncate">{l.modelo ?? l.descripcion}</span>
                    <span className="text-white/50 text-sm shrink-0">{fmt(l.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="px-6 py-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {cotizacion.descuentoTotalPct > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400/70">Descuento ({cotizacion.descuentoTotalPct}%)</span>
                    <span className="text-green-400/70">aplicado</span>
                  </div>
                )}
                {cotizacion.aplicaIva && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">IVA (16%)</span>
                    <span className="text-white/40">{fmt(cotizacion.montoIva)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t" style={{ borderColor: "rgba(179,152,91,0.2)" }}>
                  <span className="text-white font-bold text-base">Total</span>
                  <span className="font-bold text-2xl" style={{ color: GOLD }}>{fmt(cotizacion.granTotal)}</span>
                </div>
              </div>
            </div>
          </R>

          {cotizacion.observaciones && (
            <R delay={120}>
              <div className="mt-6 px-5 py-4 rounded-xl" style={{ background: "rgba(179,152,91,0.04)", border: "1px solid rgba(179,152,91,0.12)" }}>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: GOLD }}>Nota del equipo</p>
                <p className="text-white/55 text-sm leading-relaxed">{cotizacion.observaciones}</p>
              </div>
            </R>
          )}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-6 sm:px-12" style={{ background: "#040404" }}>
        <div className="max-w-3xl mx-auto text-center">
          <R>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-5" style={{ color: GOLD }}>
              Siguiente paso
            </p>
            <h2 className="font-bold text-white mb-6 leading-[1.0]"
                style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.03em" }}>
              Confirma tu fecha.<br />
              <span style={{ color: GOLD }}>El equipo es tuyo.</span>
            </h2>
            <p className="text-white/40 mb-10 leading-relaxed max-w-lg mx-auto">
              Para reservar el equipo necesitamos confirmar la fecha y el anticipo del 50%.
              Escríbenos por WhatsApp y cerramos en minutos.
            </p>
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-bold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105"
                 style={{ background: GOLD }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Confirmar por WhatsApp
              </a>
            )}
          </R>
        </div>
      </section>

      {/* ── TÉRMINOS ── */}
      <section className="py-10 px-6 sm:px-12 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => setContract(c => !c)}
                  className="flex items-center gap-2 text-white/25 hover:text-white/50 transition-colors text-xs tracking-wide">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 style={{ transform: contractOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            Condiciones de renta
          </button>
          {contractOpen && (
            <div className="mt-4 p-5 rounded-xl text-[11px] text-white/30 leading-relaxed whitespace-pre-wrap"
                 style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
              {cotizacion.terminosComerciales || DEFAULT_TERMS}
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 text-center border-t border-white/[0.04]">
        <p className="text-white/15 text-xs tracking-wide">
          © {new Date().getFullYear()} Mainstage Pro · mainstagepro.mx · (446) 143 2565
        </p>
      </footer>

    </main>
  );
}
