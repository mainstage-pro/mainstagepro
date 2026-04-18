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
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
    </div>
  );

  if (error || !cot) return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
      <div className="bg-[#111] border border-[#222] rounded-2xl p-10 max-w-sm w-full text-center">
        <p className="text-4xl mb-4">🔗</p>
        <h1 className="text-white text-xl font-bold mb-2">Link no válido</h1>
        <p className="text-gray-500 text-sm">{error ?? "Este link de aprobación no existe o ya fue procesado."}</p>
      </div>
    </div>
  );

  const lineasEquipo = cot.lineas.filter(l => l.tipo === "EQUIPO_PROPIO" || l.tipo === "EQUIPO_EXTERNO");
  const lineasOp = cot.lineas.filter(l => l.tipo === "OPERACION_TECNICA" || l.tipo === "DJ");
  const lineasLog = cot.lineas.filter(l => ["TRANSPORTE", "COMIDA", "HOSPEDAJE"].includes(l.tipo));

  // Agrupar equipo por categoría
  const equiposPorCat: Record<string, Linea[]> = {};
  for (const l of lineasEquipo) {
    const cat = l.notas?.startsWith("cat:") ? l.notas.slice(4) : "Equipos";
    if (!equiposPorCat[cat]) equiposPorCat[cat] = [];
    equiposPorCat[cat].push(l);
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] bg-[#0d0d0d] sticky top-0 z-10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#B3985B] flex items-center justify-center">
              <span className="text-black text-xs font-bold">M</span>
            </div>
            <span className="text-white font-semibold text-sm">Mainstage Pro</span>
          </div>
          <span className="text-gray-500 text-xs font-mono">{cot.numeroCotizacion} v{cot.version}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Estado aprobada */}
        {aprobada && (
          <div className="bg-green-900/20 border border-green-700/40 rounded-2xl p-6 text-center">
            <p className="text-4xl mb-3">✓</p>
            <h2 className="text-green-300 text-xl font-bold mb-1">Cotización aprobada</h2>
            {cot.aprobacionNombre && (
              <p className="text-gray-400 text-sm">Aprobada por {cot.aprobacionNombre}</p>
            )}
            {cot.aprobacionFecha && (
              <p className="text-gray-500 text-xs mt-1">{fmtDate(cot.aprobacionFecha)}</p>
            )}
            <p className="text-gray-500 text-sm mt-4">El equipo de Mainstage Pro se pondrá en contacto contigo para coordinar los siguientes pasos.</p>
          </div>
        )}

        {/* Info del evento */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider mb-2">Cotización para</p>
            <h1 className="text-2xl font-bold text-white">{cot.nombreEvento || "Evento"}</h1>
            <p className="text-gray-400 text-sm mt-0.5">{cot.cliente.nombre}{cot.cliente.empresa ? ` · ${cot.cliente.empresa}` : ""}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {cot.fechaEvento && (
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Fecha del evento</p>
                <p className="text-white">{fmtDate(cot.fechaEvento)}</p>
              </div>
            )}
            {cot.lugarEvento && (
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Lugar</p>
                <p className="text-white">{cot.lugarEvento}</p>
              </div>
            )}
            {cot.tipoEvento && (
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Tipo de evento</p>
                <p className="text-white capitalize">{cot.tipoEvento.toLowerCase().replace(/_/g, " ")}</p>
              </div>
            )}
            {cot.fechaVencimiento && (
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Cotización vigente hasta</p>
                <p className="text-yellow-300">{fmtDate(cot.fechaVencimiento)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Desglose */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e1e1e]">
            <p className="text-white font-semibold">Desglose del servicio</p>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {Object.entries(equiposPorCat).map(([cat, items]) => (
              <div key={cat} className="px-5 py-4">
                <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider mb-3">{cat}</p>
                <div className="space-y-2">
                  {items.map(l => (
                    <div key={l.id} className="flex justify-between items-start gap-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="text-white">{l.descripcion}</span>
                        {l.marca && <span className="text-gray-500 ml-1.5">{l.marca}</span>}
                        {l.cantidad > 1 && <span className="text-gray-600 ml-1.5 text-xs">×{l.cantidad}</span>}
                        {l.esIncluido && <span className="ml-2 text-[10px] bg-[#B3985B]/20 text-[#B3985B] px-1.5 py-0.5 rounded-full">Incluido</span>}
                      </div>
                      {!l.esIncluido && <span className="text-gray-400 shrink-0">{fmt(l.subtotal)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {lineasOp.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider mb-3">Personal técnico</p>
                <div className="space-y-2">
                  {lineasOp.map(l => (
                    <div key={l.id} className="flex justify-between items-start gap-3 text-sm">
                      <div className="flex-1">
                        <span className="text-white">{l.descripcion}</span>
                        {l.cantidad > 1 && <span className="text-gray-600 ml-1.5 text-xs">×{l.cantidad}</span>}
                        {l.esIncluido && <span className="ml-2 text-[10px] bg-[#B3985B]/20 text-[#B3985B] px-1.5 py-0.5 rounded-full">Incluido</span>}
                      </div>
                      {!l.esIncluido && <span className="text-gray-400 shrink-0">{fmt(l.subtotal)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {lineasLog.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider mb-3">Logística</p>
                <div className="space-y-2">
                  {lineasLog.map(l => (
                    <div key={l.id} className="flex justify-between items-start gap-3 text-sm">
                      <span className="text-white flex-1">{l.descripcion}</span>
                      <span className="text-gray-400 shrink-0">{fmt(l.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Totales */}
          <div className="px-5 py-4 bg-[#0d0d0d] border-t border-[#1e1e1e] space-y-2">
            {cot.montoDescuento > 0 && (
              <div className="flex justify-between text-sm text-gray-400">
                <span>Descuento</span>
                <span className="text-green-400">-{fmt(cot.montoDescuento)}</span>
              </div>
            )}
            {cot.aplicaIva && (
              <div className="flex justify-between text-sm text-gray-400">
                <span>Subtotal</span>
                <span>{fmt(cot.total)}</span>
              </div>
            )}
            {cot.aplicaIva && (
              <div className="flex justify-between text-sm text-gray-400">
                <span>IVA (16%)</span>
                <span>{fmt(cot.montoIva)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-[#1e1e1e]">
              <span>Total</span>
              <span className="text-[#B3985B] text-xl">{fmt(cot.granTotal)}</span>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        {cot.observaciones && (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl px-5 py-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Notas</p>
            <p className="text-gray-300 text-sm whitespace-pre-line leading-relaxed">{cot.observaciones}</p>
          </div>
        )}

        {/* Bloque de aprobación */}
        {!aprobada && (
          <div className="bg-[#111] border border-[#B3985B]/30 rounded-2xl p-6 space-y-4">
            <div>
              <p className="text-white font-semibold text-base mb-1">Aprobar cotización</p>
              <p className="text-gray-500 text-sm">Al presionar el botón confirmas que estás de acuerdo con los servicios y el monto cotizado.</p>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Tu nombre completo</label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Juan García"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B] placeholder-gray-600"
              />
            </div>
            <button
              onClick={aprobar}
              disabled={aprobando || !nombre.trim()}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-bold text-sm py-3 rounded-xl transition-colors"
            >
              {aprobando ? "Confirmando..." : "Aprobar cotización"}
            </button>
            <p className="text-gray-600 text-xs text-center">
              Elaborada por {cot.creadaPor?.name ?? "Mainstage Pro"} · Mainstage Pro
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
