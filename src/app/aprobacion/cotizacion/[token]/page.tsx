"use client";

import { useEffect, useState, use } from "react";

interface Linea {
  id: string; tipo: string; descripcion: string; marca: string | null;
  cantidad: number; dias: number; precioUnitario: number; subtotal: number;
  esIncluido: boolean; notas: string | null;
}
interface Cotizacion {
  id: string; numeroCotizacion: string; version: number; estado: string;
  nombreEvento: string | null; tipoEvento: string | null; lugarEvento: string | null;
  fechaEvento: string | null; granTotal: number; total: number; montoIva: number;
  aplicaIva: boolean; subtotalEquiposBruto: number; montoDescuento: number;
  subtotalOperacion: number; subtotalTransporte: number; subtotalComidas: number;
  subtotalHospedaje: number; observaciones: string | null; vigenciaDias: number;
  fechaVencimiento: string | null; aprobacionFecha: string | null;
  aprobacionNombre: string | null;
  cliente: { nombre: string; empresa: string | null };
  creadaPor: { name: string } | null;
  lineas: Linea[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

export default function AprobacionCotizacionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [cot, setCot] = useState<Cotizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [aprobando, setAprobando] = useState(false);
  const [aprobada, setAprobada] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    fetch(`/api/aprobacion/cotizacion/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else {
          setCot(d.cotizacion);
          if (d.cotizacion.estado === "APROBADA") setAprobada(true);
        }
        setLoading(false);
      })
      .catch(() => { setError("Error al cargar la cotización"); setLoading(false); });
  }, [token]);

  async function aprobar() {
    if (!nombre.trim()) { setError("Por favor ingresa tu nombre para confirmar la aprobación."); return; }
    setAprobando(true);
    const res = await fetch(`/api/aprobacion/cotizacion/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim() }),
    });
    const d = await res.json();
    if (d.ok) { setAprobada(true); if (cot) setCot({ ...cot, estado: "APROBADA" }); }
    else { setError(d.error ?? "Error al aprobar"); }
    setAprobando(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center"
         style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <div className="w-6 h-6 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
    </div>
  );

  if (error || !cot) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6"
         style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <div className="bg-[#0d0d0d] border border-white/8 rounded-2xl p-10 max-w-sm w-full text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 mx-auto mb-8 opacity-40" draggable={false} />
        <p className="text-white/60 text-base font-semibold mb-2">Link no válido</p>
        <p className="text-white/25 text-sm">{error ?? "Este link de aprobación no existe o ya fue procesado."}</p>
      </div>
    </div>
  );

  const lineasEquipo = cot.lineas.filter(l => l.tipo === "EQUIPO_PROPIO" || l.tipo === "EQUIPO_EXTERNO");
  const lineasOp = cot.lineas.filter(l => l.tipo === "OPERACION_TECNICA" || l.tipo === "DJ");
  const lineasLog = cot.lineas.filter(l => ["TRANSPORTE", "COMIDA", "HOSPEDAJE"].includes(l.tipo));

  const equiposPorCat: Record<string, Linea[]> = {};
  for (const l of lineasEquipo) {
    const cat = l.notas?.startsWith("cat:") ? l.notas.slice(4) : "Equipos";
    if (!equiposPorCat[cat]) equiposPorCat[cat] = [];
    equiposPorCat[cat].push(l);
  }

  return (
    <div className="min-h-screen bg-black text-white"
         style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>

      <style>{`
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 h-14"
           style={{
             background: `rgba(0,0,0,${Math.min(0.92, scrollY / 80)})`,
             backdropFilter: scrollY > 20 ? "blur(24px) saturate(180%)" : "none",
             borderBottom: scrollY > 20 ? "1px solid rgba(255,255,255,0.06)" : "none",
             transition: "background 0.4s, border-color 0.4s",
           }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 opacity-80" draggable={false} />
        <span className="text-white/25 text-xs tracking-wide hidden sm:block">Propuesta · {cot.numeroCotizacion} v{cot.version}</span>
        <div className="w-20" />
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(179,152,91,0.07) 0%, transparent 70%)" }} />

        <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-[0.28em] mb-6">
          Mainstage Pro · Propuesta Exclusiva
        </p>
        <h1 className="text-white font-bold mb-3 leading-tight"
            style={{ fontSize: "clamp(2rem,6vw,4rem)", letterSpacing: "-0.025em" }}>
          {cot.nombreEvento || "Tu Evento"}
        </h1>
        <p className="text-white/40 mb-10"
           style={{ fontSize: "clamp(0.9rem,2vw,1.15rem)" }}>
          {cot.cliente.empresa ? `${cot.cliente.empresa} · ` : ""}{cot.cliente.nombre}
        </p>

        {/* Total prominent display */}
        <div className="inline-flex flex-col items-center gap-1">
          {cot.montoDescuento > 0 && (
            <p className="text-white/20 text-lg line-through" style={{ letterSpacing: "-0.02em" }}>
              {fmt(cot.granTotal + cot.montoDescuento)}
            </p>
          )}
          <p className="text-white font-black leading-none"
             style={{ fontSize: "clamp(3rem,12vw,7rem)", letterSpacing: "-0.04em" }}>
            {fmt(cot.granTotal)}
          </p>
          {cot.aplicaIva && (
            <p className="text-white/25 text-sm">IVA incluido ({fmt(cot.montoIva)})</p>
          )}
        </div>

        {/* Event pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8 text-white/30 text-xs">
          {cot.fechaEvento && (
            <span className="flex items-center gap-1.5 border border-white/8 rounded-full px-3.5 py-1.5 backdrop-blur-sm bg-white/[0.03]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {fmtDate(cot.fechaEvento)}
            </span>
          )}
          {cot.lugarEvento && (
            <span className="flex items-center gap-1.5 border border-white/8 rounded-full px-3.5 py-1.5 backdrop-blur-sm bg-white/[0.03]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              {cot.lugarEvento}
            </span>
          )}
          {cot.fechaVencimiento && (
            <span className="flex items-center gap-1.5 border border-[#B3985B]/30 rounded-full px-3.5 py-1.5 bg-[#B3985B]/5 text-[#B3985B]/70">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Vigente hasta {fmtDate(cot.fechaVencimiento)}
            </span>
          )}
        </div>
      </section>

      {/* ── SUCCESS BANNER ──────────────────────────────────────────────────── */}
      {aprobada && (
        <section className="px-6 pb-6 max-w-2xl mx-auto">
          <div className="border border-green-500/30 bg-green-950/20 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-900/30 border border-green-500/40 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Cotización aprobada</h2>
            {cot.aprobacionNombre && (
              <p className="text-white/40 text-sm">Aprobada por {cot.aprobacionNombre}</p>
            )}
            {cot.aprobacionFecha && (
              <p className="text-white/25 text-xs mt-1">{fmtDate(cot.aprobacionFecha)}</p>
            )}
            <p className="text-white/30 text-sm mt-4 max-w-xs mx-auto leading-relaxed">
              El equipo de Mainstage Pro se pondrá en contacto contigo para coordinar los siguientes pasos.
            </p>
          </div>
        </section>
      )}

      {/* ── BODY ────────────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 pb-24 space-y-4">

        {/* Desglose */}
        <div className="bg-white/[0.025] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/6">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">Desglose del servicio</p>
          </div>
          <div className="divide-y divide-white/5">
            {Object.entries(equiposPorCat).map(([cat, items]) => (
              <div key={cat} className="px-6 py-4">
                <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-3">{cat}</p>
                <div className="space-y-2.5">
                  {items.map(l => (
                    <div key={l.id} className="flex justify-between items-start gap-4 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="text-white/85">{l.descripcion}</span>
                        {l.marca && <span className="text-white/30 ml-2 text-xs">{l.marca}</span>}
                        {l.cantidad > 1 && <span className="text-white/20 ml-2 text-xs">×{l.cantidad}</span>}
                        {l.esIncluido && (
                          <span className="ml-2 text-[9px] bg-[#B3985B]/15 text-[#B3985B] px-1.5 py-0.5 rounded-full">Incluido</span>
                        )}
                      </div>
                      {!l.esIncluido && <span className="text-white/35 shrink-0 font-medium">{fmt(l.subtotal)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {lineasOp.length > 0 && (
              <div className="px-6 py-4">
                <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-3">Personal técnico</p>
                <div className="space-y-2.5">
                  {lineasOp.map(l => (
                    <div key={l.id} className="flex justify-between items-start gap-4 text-sm">
                      <div className="flex-1">
                        <span className="text-white/85">{l.descripcion}</span>
                        {l.cantidad > 1 && <span className="text-white/20 ml-2 text-xs">×{l.cantidad}</span>}
                        {l.esIncluido && <span className="ml-2 text-[9px] bg-[#B3985B]/15 text-[#B3985B] px-1.5 py-0.5 rounded-full">Incluido</span>}
                      </div>
                      {!l.esIncluido && <span className="text-white/35 shrink-0 font-medium">{fmt(l.subtotal)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {lineasLog.length > 0 && (
              <div className="px-6 py-4">
                <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-3">Logística</p>
                <div className="space-y-2.5">
                  {lineasLog.map(l => (
                    <div key={l.id} className="flex justify-between items-start gap-4 text-sm">
                      <span className="text-white/85 flex-1">{l.descripcion}</span>
                      <span className="text-white/35 shrink-0 font-medium">{fmt(l.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Totales */}
          <div className="px-6 py-5 bg-white/[0.015] border-t border-white/6 space-y-2">
            {cot.montoDescuento > 0 && (
              <div className="flex justify-between text-sm text-white/30">
                <span>Descuento</span>
                <span className="text-green-400/70">-{fmt(cot.montoDescuento)}</span>
              </div>
            )}
            {cot.aplicaIva && (
              <div className="flex justify-between text-sm text-white/30">
                <span>Subtotal</span><span>{fmt(cot.total)}</span>
              </div>
            )}
            {cot.aplicaIva && (
              <div className="flex justify-between text-sm text-white/30">
                <span>IVA (16%)</span><span>{fmt(cot.montoIva)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-white/6">
              <span className="text-white/60 text-sm font-semibold">Total</span>
              <span className="text-[#B3985B] text-2xl font-black" style={{ letterSpacing: "-0.02em" }}>{fmt(cot.granTotal)}</span>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        {cot.observaciones && (
          <div className="bg-white/[0.025] border border-white/8 rounded-2xl px-6 py-5">
            <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-3">Notas de la propuesta</p>
            <p className="text-white/40 text-sm whitespace-pre-line leading-relaxed">{cot.observaciones}</p>
          </div>
        )}

        {/* Bloque de aprobación */}
        {!aprobada && (
          <div className="bg-white/[0.025] border border-[#B3985B]/25 rounded-2xl p-6 space-y-5">
            <div>
              <p className="text-white font-semibold text-base mb-1.5">Aprobar cotización</p>
              <p className="text-white/35 text-sm leading-relaxed">
                Al confirmar, autorizas que los servicios y el monto cotizado están acordados. Mainstage Pro procederá con la reserva de fecha y equipo.
              </p>
            </div>
            {error && (
              <p className="text-red-400/80 text-sm bg-red-900/10 border border-red-500/20 rounded-xl px-4 py-2.5">{error}</p>
            )}
            <div>
              <label className="text-[11px] text-white/30 font-semibold uppercase tracking-widest mb-2 block">Tu nombre completo</label>
              <input
                value={nombre}
                onChange={e => { setNombre(e.target.value); setError(null); }}
                placeholder="Ej: Juan García"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B]/60 placeholder-white/15 transition-colors"
              />
            </div>
            <button
              onClick={aprobar}
              disabled={aprobando || !nombre.trim()}
              className="w-full bg-[#B3985B] hover:bg-[#c9a960] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm py-3.5 rounded-xl transition-colors shadow-[0_0_30px_rgba(179,152,91,0.2)]"
            >
              {aprobando ? "Confirmando..." : "Aprobar cotización"}
            </button>
            <p className="text-white/15 text-xs text-center">
              Elaborada por {cot.creadaPor?.name ?? "Mainstage Pro"} · Mainstage Pro
            </p>
          </div>
        )}
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-4 opacity-20" draggable={false} />
          <p className="text-white/15 text-xs text-center">
            Cotización {cot.numeroCotizacion} · Propuesta para {cot.cliente.nombre}
          </p>
          <p className="text-white/15 text-xs">Querétaro, México</p>
        </div>
      </footer>

    </div>
  );
}
