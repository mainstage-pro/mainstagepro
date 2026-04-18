"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";

interface TradeData {
  activo: boolean;
  pct: number;
  entregables: string[];
  checklist: Record<string, boolean>;
  checklistCompleto: boolean;
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
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

const NIVELES = [
  {
    nivel: 1,
    nombre: "Base",
    pct: 5,
    color: "border-[#2a2a2a] hover:border-[#3a3a3a]",
    colorActive: "border-[#B3985B]/60 bg-[#B3985B]/5",
    badge: "bg-[#2a2a2a] text-gray-300",
    beneficios: [
      "Logo de Mainstage Pro en flyer y/o backdrop del evento",
      "1 mención del animador o maestro de ceremonias durante el evento",
      "Material básico de foto/video del evento para uso en redes",
      "2 a 4 cortesías de acceso al evento",
    ],
  },
  {
    nivel: 2,
    nombre: "Estratégico",
    pct: 10,
    destacado: true,
    color: "border-[#B3985B]/30 hover:border-[#B3985B]/60",
    colorActive: "border-[#B3985B] bg-[#B3985B]/8",
    badge: "bg-[#B3985B]/20 text-[#B3985B]",
    beneficios: [
      "Todo lo del Nivel Base",
      "Mayor presencia del logo (cartel principal, mesa de control visible)",
      "1 publicación o reel en Instagram y/o Facebook etiquetando Mainstage Pro",
      "Material de mayor calidad — foto y video para portafolio",
      "4 a 8 cortesías de acceso al evento",
    ],
  },
  {
    nivel: 3,
    nombre: "Premium",
    pct: 12,
    color: "border-[#8B6914]/40 hover:border-[#8B6914]/70",
    colorActive: "border-[#C4A96B] bg-[#C4A96B]/8",
    badge: "bg-[#8B6914]/20 text-[#C4A96B]",
    beneficios: [
      "Todo lo del Nivel Estratégico",
      "Mainstage Pro como partner técnico visible del evento",
      "Pieza de contenido enfocada en la producción técnica (reel o video corto)",
      "Material premium de foto y video — uso sin restricciones",
      "6 a 12 cortesías de acceso al evento",
      "Bono variable adicional (acordado con el equipo)",
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

  async function seleccionar(nivel: number) {
    if (yaSelecciono || seleccionando) return;
    setConfirmando(nivel);
  }

  async function confirmarSeleccion() {
    if (!confirmando || seleccionando) return;
    setSeleccionando(true);
    try {
      const res = await fetch(`/api/trade/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nivel: confirmando, bonoVariable: null }),
      });
      const d = await res.json();
      if (res.ok) {
        setNivelElegido(confirmando);
        setYaSelecciono(true);
        setConfirmado(true);
        setConfirmando(null);
      } else {
        setActionError(d.error ?? "Error al registrar selección");
      }
    } finally {
      setSeleccionando(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-500 text-sm">Cargando propuesta…</div>
      </div>
    );
  }

  if (error || !cot || !trade) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-sm">{error ?? "Propuesta no encontrada"}</p>
        </div>
      </div>
    );
  }

  const ivaFactor = cot.aplicaIva ? 1.16 : 1;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-4 flex items-center gap-3">
        <Image src="/logo-icon.png" alt="Mainstage Pro" width={28} height={28} className="opacity-80" />
        <span className="text-[#B3985B] font-semibold text-sm tracking-wide">Mainstage Pro</span>
        <span className="text-gray-700 text-sm ml-2">· Propuesta de Colaboración Trade</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Event info */}
        <div className="text-center space-y-2">
          <p className="text-gray-500 text-xs uppercase tracking-widest">Propuesta de colaboración</p>
          <h1 className="text-2xl font-bold text-white">{cot.nombreEvento ?? cot.numeroCotizacion}</h1>
          {cot.tipoEvento && <p className="text-gray-400 text-sm">{cot.tipoEvento}</p>}
          <div className="flex items-center justify-center gap-4 text-gray-500 text-xs mt-2">
            {cot.fechaEvento && <span>{fmtDate(cot.fechaEvento)}</span>}
            {cot.lugarEvento && <span>· {cot.lugarEvento}</span>}
          </div>
          <p className="text-gray-500 text-sm mt-1">Para: <span className="text-gray-300">{cot.cliente.nombre}{cot.cliente.empresa ? ` · ${cot.cliente.empresa}` : ""}</span></p>
        </div>

        {/* Intro */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 text-sm text-gray-400 leading-relaxed">
          <p className="text-white font-medium mb-2">¿Qué es Mainstage Trade?</p>
          <p>
            Es un esquema de colaboración donde <span className="text-[#B3985B]">Mainstage Pro ofrece un descuento sobre la renta de equipos</span> a cambio de visibilidad de marca y contenido en tu evento.
            Ambas partes ganan: tú pagas menos, nosotros crecemos juntos.
          </p>
          <p className="mt-2">A continuación encontrarás tres opciones con sus beneficios y el impacto real en tu cotización. <strong className="text-white">Elige la que mejor se adapte a tu evento.</strong></p>
        </div>

        {/* Already selected confirmation */}
        {confirmado && nivelElegido && (
          <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-5 space-y-4">
            <div className="text-center">
              <p className="text-green-400 text-sm font-semibold mb-1">✓ Selección registrada</p>
              <p className="text-gray-400 text-sm">
                Elegiste el <span className="text-white font-medium">Nivel {nivelElegido} — {NIVELES[nivelElegido - 1].nombre} ({NIVELES[nivelElegido - 1].pct}% descuento)</span>.
                El equipo de Mainstage Pro ha sido notificado y aplicará el descuento a tu cotización.
              </p>
            </div>
            <button
              onClick={() => {
                const n = NIVELES[nivelElegido - 1];
                const texto = `TÉRMINOS Y CONDICIONES — MAINSTAGE TRADE\nNivel ${nivelElegido}: ${n.nombre} (${n.pct}% descuento en equipos)\n\n` +
                  `EVENTO: ${cot.nombreEvento ?? cot.numeroCotizacion}\nCLIENTE: ${cot.cliente.nombre}${cot.cliente.empresa ? ` · ${cot.cliente.empresa}` : ""}\n\n` +
                  `COMPROMISOS DEL CLIENTE:\n${n.beneficios.map(b => `• ${b}`).join("\n")}\n\n` +
                  `DESCUENTO APLICADO: ${n.pct}% sobre subtotal de renta de equipos Mainstage Pro.\n` +
                  `El descuento NO aplica sobre operación técnica, transporte, hospedaje ni alimentación.\n\n` +
                  `Al confirmar este nivel, el cliente acepta cumplir con todos los entregables listados arriba en las fechas acordadas con el equipo de Mainstage Pro.\n\n` +
                  `Fecha de aceptación: ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}\n` +
                  `Referencia de cotización: ${cot.numeroCotizacion}\n\nMainstage Pro · mainstage.pro\n`;
                const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `TyC_Trade_Nivel${nivelElegido}_${cot.numeroCotizacion}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full py-2.5 rounded-xl border border-green-700/40 text-green-400 text-sm font-medium hover:bg-green-900/20 transition-colors"
            >
              Descargar Términos y Condiciones
            </button>
          </div>
        )}

        {/* Confirmation modal overlay */}
        {confirmando && !confirmado && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
            <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full space-y-4">
              <p className="text-white font-semibold text-center">Confirmar selección</p>
              <p className="text-gray-400 text-sm text-center">
                Vas a elegir el <span className="text-[#B3985B] font-medium">Nivel {confirmando} — {NIVELES[confirmando - 1].nombre}</span> con un descuento del {NIVELES[confirmando - 1].pct}% sobre equipos.
              </p>
              <p className="text-gray-500 text-xs text-center">Esta selección quedará registrada y no podrá modificarse.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmando(null)}
                  className="flex-1 py-2 rounded-lg border border-[#2a2a2a] text-gray-400 text-sm hover:text-white transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={confirmarSeleccion}
                  disabled={seleccionando}
                  className="flex-1 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c4aa6b] transition-colors disabled:opacity-50">
                  {seleccionando ? "Registrando…" : "Confirmar"}
                </button>
              </div>
              {actionError && (
                <p className="text-red-400 text-sm text-center mt-2">{actionError}</p>
              )}
            </div>
          </div>
        )}

        {/* Nivel cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {NIVELES.map(n => {
            const descuento = cot.subtotalEquiposBruto * (n.pct / 100);
            const ahorro = descuento * ivaFactor;
            const totalConTrade = cot.granTotal - ahorro;
            const isElegido = confirmado && nivelElegido === n.nivel;
            const isDestacado = n.destacado && !confirmado;

            return (
              <div
                key={n.nivel}
                className={`relative border rounded-2xl p-5 flex flex-col gap-4 transition-all ${isElegido ? n.colorActive + " shadow-lg" : confirmado ? "border-[#1e1e1e] opacity-50" : n.colorActive && !confirmado ? n.color : n.color}`}
              >
                {isDestacado && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#B3985B] text-black text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wide">Más popular</span>
                  </div>
                )}
                {isElegido && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-green-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wide">Tu elección</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${n.badge}`}>Nivel {n.nivel}</span>
                  </div>
                  <p className="text-white font-bold text-lg">{n.nombre}</p>
                  <p className="text-[#B3985B] text-2xl font-black mt-1">{n.pct}% <span className="text-sm font-normal text-gray-400">descuento en equipos</span></p>
                </div>

                {/* Pricing */}
                <div className="bg-black/30 rounded-xl p-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Total original</span>
                    <span>{fmt(cot.granTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-green-400">
                    <span>Ahorro con Trade</span>
                    <span>- {fmt(ahorro)}</span>
                  </div>
                  <div className="border-t border-[#2a2a2a] pt-2 mt-1 flex justify-between text-white font-bold">
                    <span>Total con Trade</span>
                    <span>{fmt(totalConTrade)}</span>
                  </div>
                  {cot.aplicaIva && (
                    <p className="text-[10px] text-gray-600 text-right">IVA incluido en ahorro</p>
                  )}
                </div>

                {/* Beneficios */}
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Mainstage Pro recibe</p>
                  <ul className="space-y-1.5">
                    {n.beneficios.map((b, i) => (
                      <li key={i} className="flex gap-2 text-xs text-gray-300 leading-relaxed">
                        <span className="text-[#B3985B] mt-0.5 shrink-0">·</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                {!confirmado && (
                  <button
                    onClick={() => seleccionar(n.nivel)}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${n.destacado ? "bg-[#B3985B] text-black hover:bg-[#c4aa6b]" : "bg-[#1a1a1a] text-gray-300 border border-[#2a2a2a] hover:border-[#B3985B]/40 hover:text-[#B3985B]"}`}>
                    Elegir este nivel
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Fine print */}
        <div className="text-center text-xs text-gray-700 space-y-1 pb-8">
          <p>El descuento aplica únicamente sobre la renta de equipos Mainstage Pro, no sobre servicios de operación, transporte, hospedaje o alimentación.</p>
          <p>La selección queda registrada como acuerdo formal entre las partes. Los entregables deben cumplirse en las fechas acordadas.</p>
          <p className="text-gray-800 mt-2">{cot.numeroCotizacion} · Mainstage Pro</p>
        </div>
      </div>
    </div>
  );
}
