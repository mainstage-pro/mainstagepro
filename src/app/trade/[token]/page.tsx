"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";

interface TradeData {
  activo: boolean;
  pct: number;
  nivelSeleccionado: number | null;
  nivelAplicado: number | null;
  bonoVariable: string | null;
  clienteSeleccionoEn: string | null;
}

interface Cotizacion {
  id: string;
  numeroCotizacion: string;
  nombreEvento: string | null;
  tipoEvento: string | null;
  fechaEvento: string | null;
  lugarEvento: string | null;
  subtotalEquiposBruto: number;
  montoDescuento: number;
  subtotalEquiposNeto: number;
  subtotalOperacion: number;
  subtotalTransporte: number;
  subtotalComidas: number;
  subtotalHospedaje: number;
  total: number;
  aplicaIva: boolean;
  montoIva: number;
  granTotal: number;
  cliente: { nombre: string; empresa: string | null };
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return null;
  return new Date(s).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const NIVELES = [
  {
    nivel: 1,
    nombre: "Base",
    pct: 5,
    tagline: "Presencia de marca esencial",
    color: { border: "#2a2a2a", borderHover: "#3a3a3a", bg: "rgba(255,255,255,0.02)", accent: "#aaa", badge: "rgba(255,255,255,0.06)" },
    beneficios: [
      "Logo de Mainstage Pro en flyer y/o backdrop del evento",
      "1 mención del animador o MC durante el evento",
      "Material básico de foto y video para nuestras redes sociales",
      "2 a 4 accesos al evento para el equipo Mainstage",
    ],
  },
  {
    nivel: 2,
    nombre: "Estratégico",
    pct: 10,
    destacado: true,
    tagline: "Alianza visible con contenido",
    color: { border: "#B3985B", borderHover: "#c4aa6b", bg: "rgba(179,152,91,0.06)", accent: "#B3985B", badge: "rgba(179,152,91,0.15)" },
    beneficios: [
      "Todo lo incluido en Nivel Base",
      "Logo en cartel principal y mesa de control visible del evento",
      "1 publicación o reel en Instagram/Facebook etiquetando @mainstage.pro",
      "Material de calidad profesional para nuestro portafolio",
      "4 a 8 accesos al evento para el equipo Mainstage",
    ],
  },
  {
    nivel: 3,
    nombre: "Premium",
    pct: 12,
    tagline: "Partner técnico oficial del evento",
    color: { border: "#6b5a2e", borderHover: "#8b7a4e", bg: "rgba(179,152,91,0.04)", accent: "#C4A96B", badge: "rgba(100,80,30,0.3)" },
    beneficios: [
      "Todo lo incluido en Nivel Estratégico",
      "Mainstage Pro como partner técnico oficial del evento",
      "Pieza de contenido enfocada en producción técnica (reel o video corto)",
      "Material premium de foto y video — uso sin restricciones",
      "6 a 12 accesos al evento para el equipo Mainstage",
      "Bono variable adicional acordado directamente con nuestro equipo",
    ],
  },
];

export default function TradePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [cot, setCot] = useState<Cotizacion | null>(null);
  const [trade, setTrade] = useState<TradeData | null>(null);
  const [yaSelecciono, setYaSelecciono] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionando, setSeleccionando] = useState(false);
  const [nivelElegido, setNivelElegido] = useState<number | null>(null);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/trade/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else {
          setCot(d.cot);
          setTrade(d.trade);
          setYaSelecciono(d.yaSelecciono);
          if (d.trade?.nivelSeleccionado) {
            setNivelElegido(d.trade.nivelSeleccionado);
            setConfirmado(true);
          }
        }
        setLoading(false);
      })
      .catch(() => { setError("Error de conexión"); setLoading(false); });
  }, [token]);

  async function confirmarSeleccion() {
    if (!confirmando || seleccionando) return;
    setSeleccionando(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/trade/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nivel: confirmando }),
      });
      const d = await res.json();
      if (res.ok) {
        setNivelElegido(confirmando);
        setYaSelecciono(true);
        setConfirmado(true);
        setConfirmando(null);
        if (cot && d.granTotal) setCot(prev => prev ? { ...prev, granTotal: d.granTotal } : prev);
      } else {
        setActionError(d.error ?? "Error al registrar selección");
      }
    } finally {
      setSeleccionando(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="w-8 h-8 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin mx-auto" />
          <p className="text-gray-600 text-sm">Cargando propuesta…</p>
        </div>
      </div>
    );
  }

  if (error || !cot || !trade) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-gray-500 text-sm">{error ?? "Esta propuesta no existe o ya no está disponible."}</p>
        </div>
      </div>
    );
  }

  const ivaFactor = cot.aplicaIva ? 1.16 : 1;

  return (
    <div className="min-h-screen bg-black text-white"
         style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      {/* Fondo con gradiente sutil */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(179,152,91,0.08)_0%,transparent_60%)]" />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo-icon.png" alt="Mainstage Pro" width={26} height={26} className="opacity-90" />
          <span className="text-[#B3985B] font-bold text-sm tracking-wide">Mainstage Pro</span>
        </div>
        <span className="text-[10px] text-gray-700 tracking-widest uppercase">Propuesta de Colaboración</span>
      </header>

      <div className="relative max-w-5xl mx-auto px-4 py-12 space-y-14">

        {/* ── HERO ── */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-block px-3 py-1 rounded-full border border-[#B3985B]/30 bg-[#B3985B]/5 text-[#B3985B] text-[11px] font-semibold tracking-widest uppercase mb-2">
            Mainstage Trade
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
            {cot.nombreEvento ?? "Tu evento"}
          </h1>
          <p className="text-gray-500 text-sm">
            Para <span className="text-gray-300 font-medium">{cot.cliente.nombre}{cot.cliente.empresa ? ` · ${cot.cliente.empresa}` : ""}</span>
            {cot.fechaEvento && <> &nbsp;·&nbsp; <span>{fmtDate(cot.fechaEvento)}</span></>}
            {cot.lugarEvento && <> &nbsp;·&nbsp; <span>{cot.lugarEvento}</span></>}
          </p>
        </div>

        {/* ── QUÉ ES TRADE ── */}
        <div className="max-w-2xl mx-auto bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-3">
          <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-widest">¿Qué es Mainstage Trade?</p>
          <p className="text-gray-300 text-sm leading-relaxed">
            Es un programa de colaboración donde <strong className="text-white">Mainstage Pro te ofrece un descuento adicional sobre tu cotización</strong> a cambio de visibilidad de marca en tu evento.
          </p>
          <p className="text-gray-500 text-sm leading-relaxed">
            Tú obtienes un menor costo. Nosotros obtenemos presencia de marca, contenido y conexión con tus invitados.
            <strong className="text-white"> Los dos ganamos.</strong>
          </p>
          <div className="pt-2 grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Total original", value: fmt(cot.granTotal), sub: "sin Trade" },
              { label: "Descuento máximo", value: fmt(cot.subtotalEquiposBruto * 0.12 * ivaFactor), sub: "hasta 12%" },
              { label: "Total mínimo posible", value: fmt(cot.granTotal - cot.subtotalEquiposBruto * 0.12 * ivaFactor), sub: "con Trade Premium" },
            ].map(item => (
              <div key={item.label} className="bg-black/40 rounded-xl p-3 space-y-0.5">
                <p className="text-[10px] text-gray-600 uppercase tracking-wide">{item.label}</p>
                <p className="text-white font-bold text-base">{item.value}</p>
                <p className="text-[10px] text-gray-700">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── CONFIRMACIÓN POST-SELECCIÓN ── */}
        {confirmado && nivelElegido && (
          <div className="max-w-2xl mx-auto bg-green-950/40 border border-green-700/30 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-900/40 border border-green-700/40 flex items-center justify-center mx-auto text-green-400 text-xl">✓</div>
            <p className="text-green-400 font-semibold">¡Selección confirmada!</p>
            <p className="text-gray-400 text-sm">
              Elegiste <span className="text-white font-medium">Nivel {nivelElegido} — {NIVELES[nivelElegido - 1].nombre} ({NIVELES[nivelElegido - 1].pct}% descuento)</span>.
              Tu cotización ha sido actualizada automáticamente con el nuevo total.
            </p>
            <p className="text-gray-600 text-xs">El equipo de Mainstage Pro ha sido notificado y se pondrá en contacto contigo para coordinar los detalles de la colaboración.</p>
          </div>
        )}

        {/* ── CARDS DE NIVELES ── */}
        <div>
          <p className="text-center text-xs text-gray-600 uppercase tracking-widest mb-6">Elige tu nivel de colaboración</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {NIVELES.map(n => {
              const descuentoBase = cot.subtotalEquiposBruto * (n.pct / 100);
              const ahorro = Math.round(descuentoBase * ivaFactor * 100) / 100;
              const totalConTrade = cot.granTotal - ahorro;
              const isElegido = confirmado && nivelElegido === n.nivel;
              const isOpacado = confirmado && nivelElegido !== n.nivel;

              return (
                <div
                  key={n.nivel}
                  style={{
                    borderColor: isElegido ? "#22c55e" : n.color.border,
                    backgroundColor: isElegido ? "rgba(34,197,94,0.05)" : n.color.bg,
                  }}
                  className={`relative border rounded-2xl p-5 flex flex-col gap-5 transition-all duration-300 ${isOpacado ? "opacity-30" : ""}`}
                >
                  {/* Badge */}
                  {n.destacado && !confirmado && (
                    <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                      <span className="bg-[#B3985B] text-black text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg">
                        Más popular
                      </span>
                    </div>
                  )}
                  {isElegido && (
                    <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                      <span className="bg-green-500 text-black text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest">
                        Tu elección ✓
                      </span>
                    </div>
                  )}

                  {/* Encabezado del nivel */}
                  <div className="space-y-1 pt-1">
                    <div style={{ backgroundColor: n.color.badge }} className="inline-block px-2 py-0.5 rounded-full">
                      <span style={{ color: n.color.accent }} className="text-[10px] font-bold uppercase tracking-widest">
                        Nivel {n.nivel}
                      </span>
                    </div>
                    <p className="text-white font-black text-xl">{n.nombre}</p>
                    <p className="text-gray-600 text-xs">{n.tagline}</p>
                  </div>

                  {/* Descuento prominente */}
                  <div className="text-center py-3 border-y" style={{ borderColor: n.color.border }}>
                    <span style={{ color: n.color.accent }} className="text-5xl font-black">{n.pct}%</span>
                    <p className="text-gray-500 text-xs mt-1">de descuento sobre renta de equipos</p>
                  </div>

                  {/* Desglose financiero */}
                  <div className="bg-black/40 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Total sin colaboración</span>
                      <span className="line-through">{fmt(cot.granTotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: n.color.accent }}>
                      <span>Tu ahorro con Trade</span>
                      <span className="font-semibold">− {fmt(ahorro)}</span>
                    </div>
                    <div className="border-t pt-2" style={{ borderColor: n.color.border }}>
                      <div className="flex justify-between text-white font-black text-base">
                        <span>Total con Trade</span>
                        <span>{fmt(totalConTrade)}</span>
                      </div>
                      {cot.aplicaIva && (
                        <p className="text-[10px] text-gray-700 text-right mt-0.5">IVA incluido</p>
                      )}
                    </div>
                  </div>

                  {/* Lo que recibiremos */}
                  <div className="flex-1 space-y-2">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Mainstage Pro recibe</p>
                    <ul className="space-y-2">
                      {n.beneficios.map((b, i) => (
                        <li key={i} className="flex gap-2 text-xs text-gray-400 leading-relaxed">
                          <span style={{ color: n.color.accent }} className="shrink-0 mt-0.5 font-bold">·</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  {!confirmado && (
                    <button
                      onClick={() => setConfirmando(n.nivel)}
                      style={n.destacado ? { backgroundColor: n.color.accent, color: "#000" } : { borderColor: n.color.border, color: n.color.accent }}
                      className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${n.destacado ? "hover:opacity-90" : "border hover:opacity-80"}`}
                    >
                      Elegir Nivel {n.nivel} — {n.nombre}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FINE PRINT ── */}
        <div className="text-center space-y-1.5 text-[11px] text-gray-700 pb-8 max-w-xl mx-auto">
          <p>El descuento aplica únicamente sobre la renta de equipos Mainstage Pro — no sobre operación técnica, transporte, hospedaje ni alimentación.</p>
          <p>Al confirmar tu nivel, aceptas los compromisos de visibilidad descritos. Los entregables deben cumplirse en fechas acordadas con el equipo.</p>
          <p className="text-gray-800 pt-2">{cot.numeroCotizacion} · Mainstage Pro</p>
        </div>
      </div>

      {/* ── MODAL DE CONFIRMACIÓN ── */}
      {confirmando && !confirmado && (() => {
        const n = NIVELES[confirmando - 1];
        const ahorro = Math.round(cot.subtotalEquiposBruto * (n.pct / 100) * ivaFactor * 100) / 100;
        const totalFinal = cot.granTotal - ahorro;
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !seleccionando && setConfirmando(null)} />
            <div className="relative bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-2xl">
              <div className="text-center space-y-1">
                <p className="text-white font-bold text-lg">Confirmar elección</p>
                <p className="text-gray-500 text-sm">Nivel {n.nivel} — <span style={{ color: n.color.accent }} className="font-semibold">{n.nombre}</span></p>
              </div>

              <div className="bg-black/40 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Total original</span><span>{fmt(cot.granTotal)}</span>
                </div>
                <div className="flex justify-between text-xs" style={{ color: n.color.accent }}>
                  <span>Tu ahorro ({n.pct}%)</span><span>− {fmt(ahorro)}</span>
                </div>
                <div className="flex justify-between text-white font-bold border-t border-[#2a2a2a] pt-2">
                  <span>Tu total final</span><span className="text-xl">{fmt(totalFinal)}</span>
                </div>
              </div>

              <p className="text-gray-600 text-xs text-center">Esta selección quedará registrada como acuerdo formal. No podrá modificarse una vez confirmada.</p>

              {actionError && <p className="text-red-400 text-xs text-center">{actionError}</p>}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmando(null)}
                  disabled={seleccionando}
                  className="py-3 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm hover:text-white transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button
                  onClick={confirmarSeleccion}
                  disabled={seleccionando}
                  style={{ backgroundColor: n.color.accent }}
                  className="py-3 rounded-xl text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                  {seleccionando ? "Confirmando…" : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
