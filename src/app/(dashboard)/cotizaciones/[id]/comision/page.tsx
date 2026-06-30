"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Linea = {
  id: string;
  tipo: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  cantidad: number;
  dias: number;
  precioUnitario: number;
  subtotal: number;
  esIncluido: boolean;
  notas: string | null;
};

type Cotizacion = {
  id: string;
  numeroCotizacion: string;
  version: number;
  opcionLetra: string;
  nombreEvento: string | null;
  tipoEvento: string | null;
  fechaEvento: string | null;
  lugarEvento: string | null;

  subtotalEquiposBruto: number;
  descuentoTotalPct: number;
  montoDescuento: number;
  subtotalEquiposNeto: number;
  subtotalPaquetes: number;
  subtotalTerceros: number;
  subtotalOperacion: number;
  subtotalTransporte: number;
  subtotalComidas: number;
  subtotalHospedaje: number;
  total: number;
  aplicaIva: boolean;
  montoIva: number;
  granTotal: number;

  gastosProduccionActivo: boolean;
  gastosProduccionMonto: number;

  cliente: { nombre: string; empresa: string | null };
  lineas: Linea[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COMISION_PCT = 0.10; // 10% sobre equipos propios netos

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function Row({ label, value, sub, bold, gold, indent }: {
  label: string; value: string; sub?: string;
  bold?: boolean; gold?: boolean; indent?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-[#1a1a1a] last:border-0 ${indent ? "pl-4" : ""}`}>
      <div>
        <p className={`text-sm ${bold ? "font-semibold text-white" : "text-gray-300"} ${gold ? "text-[#C9A84C]" : ""}`}>{label}</p>
        {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
      <p className={`text-sm tabular-nums ${bold ? "font-bold text-white" : "text-gray-400"} ${gold ? "text-[#C9A84C] font-bold" : ""}`}>{value}</p>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-5 pb-1">
      <span className="text-[10px] font-bold text-[#B3985B] uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-[#1e1e1e]" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cot, setCot]     = useState<Cotizacion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/cotizaciones/${id}`)
      .then((r) => r.json())
      .then((d) => { setCot(d.cotizacion ?? null); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center text-gray-600 text-sm">
        Cargando…
      </div>
    );
  }

  if (!cot) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center">
        <p className="text-white">No encontrado. <Link href="/cotizaciones" className="text-[#B3985B]">Volver</Link></p>
      </div>
    );
  }

  // ─── Cálculos ───────────────────────────────────────────────────────────────

  const lineasPropias    = cot.lineas.filter((l) => l.tipo === "EQUIPO_PROPIO" && !l.esIncluido);
  const lineasExternas   = cot.lineas.filter((l) => l.tipo === "EQUIPO_EXTERNO" && !l.esIncluido);
  const lineasOperacion  = cot.lineas.filter((l) => l.tipo === "OPERACION_TECNICA" && !l.esIncluido);
  const lineasTransporte = cot.lineas.filter((l) => l.tipo === "TRANSPORTE"        && !l.esIncluido);
  const lineasComidas    = cot.lineas.filter((l) => l.tipo === "COMIDA"            && !l.esIncluido);
  const lineasHospedaje  = cot.lineas.filter((l) => l.tipo === "HOSPEDAJE"         && !l.esIncluido);

  // Subtotales brutos
  const brutoEquiposPropios = lineasPropias.reduce((s, l) => s + l.subtotal, 0);

  // Aplicar descuento global de equipos al bruto de propios
  // (el descuentoTotalPct aplica sobre equipos propios)
  const descuentoEquipos  = brutoEquiposPropios * (cot.descuentoTotalPct / 100);
  const netoEquiposPropios = brutoEquiposPropios - descuentoEquipos;

  // Comisión del 10% sobre los equipos propios netos (después de descuento)
  const comision = netoEquiposPropios * COMISION_PCT;

  const subtotalExterno    = lineasExternas.reduce((s, l) => s + l.subtotal, 0);
  const subtotalOperacion  = lineasOperacion.reduce((s, l) => s + l.subtotal, 0) || cot.subtotalOperacion;
  const subtotalTransporte = lineasTransporte.reduce((s, l) => s + l.subtotal, 0) || cot.subtotalTransporte;
  const subtotalComidas    = lineasComidas.reduce((s, l) => s + l.subtotal, 0) || cot.subtotalComidas;
  const subtotalHospedaje  = lineasHospedaje.reduce((s, l) => s + l.subtotal, 0) || cot.subtotalHospedaje;

  // Agrupar equipos propios por categoría
  const equiposPorCat: Record<string, Linea[]> = {};
  lineasPropias.forEach((l) => {
    const cat = l.notas?.startsWith("cat:") ? l.notas.split("|")[0].slice(4) : "Equipos";
    if (!equiposPorCat[cat]) equiposPorCat[cat] = [];
    equiposPorCat[cat].push(l);
  });

  const fechaDoc = new Date().toLocaleDateString("es-MX", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#090909] text-white print:bg-white print:text-black">

      {/* Header de navegación — solo visible en pantalla */}
      <div className="px-6 pt-5 pb-3 border-b border-[#141414] flex items-center gap-4 print:hidden">
        <Link href={`/cotizaciones/${id}`} className="text-gray-600 hover:text-white text-sm transition-colors">
          ← Cotización
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-600">Acuerdo privado de comisión</p>
          <h1 className="text-base font-semibold text-white truncate">
            {cot.numeroCotizacion}{cot.opcionLetra !== "A" ? ` · Op. ${cot.opcionLetra}` : ""}
            {cot.nombreEvento ? ` — ${cot.nombreEvento}` : ""}
          </h1>
        </div>
        <button
          onClick={() => window.print()}
          className="text-xs px-3 py-1.5 rounded-lg border border-[#B3985B]/30 text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors"
        >
          Imprimir / PDF
        </button>
      </div>

      {/* Documento principal */}
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-0">

        {/* Encabezado del documento */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-bold text-[#B3985B] uppercase tracking-widest mb-1">Documento privado</p>
              <h2 className="text-2xl font-bold text-white leading-tight">
                Acuerdo de Comisión
              </h2>
              <p className="text-gray-500 text-sm mt-1">por intermediación en venta de servicios</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Fecha</p>
              <p className="text-sm text-gray-400">{fechaDoc}</p>
              <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-wider">Ref.</p>
              <p className="text-sm text-gray-400 font-mono">{cot.numeroCotizacion}</p>
            </div>
          </div>

          {/* Info del evento */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Cliente</p>
              <p className="text-sm text-white">{cot.cliente.nombre}</p>
              {cot.cliente.empresa && <p className="text-xs text-gray-500">{cot.cliente.empresa}</p>}
            </div>
            {cot.nombreEvento && (
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Evento</p>
                <p className="text-sm text-white">{cot.nombreEvento}</p>
              </div>
            )}
            {cot.fechaEvento && (
              <div className="col-span-2">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Fecha del evento</p>
                <p className="text-sm text-white capitalize">{fmtFecha(cot.fechaEvento)}</p>
              </div>
            )}
            {cot.lugarEvento && (
              <div className="col-span-2">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Lugar</p>
                <p className="text-sm text-white">{cot.lugarEvento}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Desglose financiero ── */}
        <Divider label="Desglose financiero de la cotización" />
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden mb-2">

          {/* Equipos propios */}
          <div className="px-5 py-3 border-b border-[#1e1e1e] bg-[#0e0e0e]">
            <p className="text-[10px] font-semibold text-[#B3985B] uppercase tracking-widest">Equipos Mainstage</p>
          </div>
          <div className="px-5">
            {Object.entries(equiposPorCat).map(([cat, lins]) => {
              const catTotal = lins.reduce((s, l) => s + l.subtotal, 0);
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#151515]">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{cat}</p>
                    <p className="text-xs text-gray-500">{fmt(catTotal)}</p>
                  </div>
                  {lins.map((l) => (
                    <div key={l.id} className="flex items-center justify-between py-1.5 pl-3 border-b border-[#131313] last:border-0">
                      <div>
                        <p className="text-xs text-gray-400">{l.descripcion}{l.marca ? ` · ${l.marca}` : ""}</p>
                        <p className="text-[10px] text-gray-600">{l.cantidad} u × {l.dias} día{l.dias !== 1 ? "s" : ""} @ {fmt(l.precioUnitario)}</p>
                      </div>
                      <p className="text-xs text-gray-400 tabular-nums">{fmt(l.subtotal)}</p>
                    </div>
                  ))}
                </div>
              );
            })}
            <div className="flex items-center justify-between py-2.5 border-t border-[#222]">
              <p className="text-xs font-semibold text-gray-300">Subtotal equipos (bruto)</p>
              <p className="text-xs font-semibold text-white tabular-nums">{fmt(brutoEquiposPropios)}</p>
            </div>
            {cot.descuentoTotalPct > 0 && (
              <div className="flex items-center justify-between py-2 border-t border-[#1a1a1a]">
                <p className="text-xs text-red-400">Descuento aplicado ({cot.descuentoTotalPct.toFixed(1)}%)</p>
                <p className="text-xs text-red-400 tabular-nums">−{fmt(descuentoEquipos)}</p>
              </div>
            )}
            <div className="flex items-center justify-between py-2.5 border-t border-[#222] bg-[#0d0d0d] -mx-5 px-5">
              <p className="text-xs font-bold text-white">Equipos netos (base comisión)</p>
              <p className="text-sm font-bold text-white tabular-nums">{fmt(netoEquiposPropios)}</p>
            </div>
          </div>

          {/* Equipos externos */}
          {subtotalExterno > 0 && (
            <>
              <div className="px-5 py-3 border-t border-[#1e1e1e] bg-[#0e0e0e]">
                <p className="text-[10px] font-semibold text-blue-400/70 uppercase tracking-widest">Equipo de proveedor externo</p>
              </div>
              <div className="px-5">
                {lineasExternas.map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-[#131313] last:border-0">
                    <div>
                      <p className="text-xs text-gray-400">{l.descripcion}</p>
                      <p className="text-[10px] text-gray-600">{l.cantidad} u × {l.dias} día{l.dias !== 1 ? "s" : ""}</p>
                    </div>
                    <p className="text-xs text-gray-400 tabular-nums">{fmt(l.subtotal)}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 border-t border-[#1a1a1a]">
                  <p className="text-xs text-gray-400">Subtotal externo</p>
                  <p className="text-xs text-blue-400 tabular-nums">{fmt(subtotalExterno)}</p>
                </div>
              </div>
            </>
          )}

          {/* Operación técnica y viáticos */}
          <div className="px-5 py-3 border-t border-[#1e1e1e] bg-[#0e0e0e]">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Operación y viáticos</p>
          </div>
          <div className="px-5">
            {subtotalOperacion  > 0 && <Row label="Operación técnica"   value={fmt(subtotalOperacion)}  />}
            {subtotalTransporte > 0 && <Row label="Transporte / flete"  value={fmt(subtotalTransporte)} />}
            {subtotalComidas    > 0 && <Row label="Viáticos — comidas"  value={fmt(subtotalComidas)}    />}
            {subtotalHospedaje  > 0 && <Row label="Viáticos — hospedaje" value={fmt(subtotalHospedaje)} />}
            {(subtotalOperacion + subtotalTransporte + subtotalComidas + subtotalHospedaje) === 0 && (
              <p className="text-xs text-gray-600 py-3 italic">No aplica en esta cotización</p>
            )}
          </div>

          {/* Totales finales */}
          <div className="border-t border-[#2a2a2a]">
            <div className="px-5 py-3 space-y-2">
              {cot.gastosProduccionActivo && cot.gastosProduccionMonto > 0 && (
                <Row label="Gastos de producción" value={fmt(cot.gastosProduccionMonto)} />
              )}
              <Row label="Total antes de IVA" value={fmt(cot.total)} bold />
              {cot.aplicaIva && <Row label="IVA (16%)" value={fmt(cot.montoIva)} />}
              <div className="flex items-center justify-between pt-3 border-t border-[#333]">
                <p className="text-base font-bold text-white">Gran Total cotización</p>
                <p className="text-xl font-bold text-[#C9A84C] tabular-nums">{fmt(cot.granTotal)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Comisión ── */}
        <Divider label="Cálculo de comisión" />
        <div className="bg-[#0f0f0f] border border-[#B3985B]/20 rounded-xl overflow-hidden">
          <div className="px-5 py-4 space-y-0">
            <Row label="Base para comisión (equipos propios netos)" value={fmt(netoEquiposPropios)} bold />
            <Row label="Porcentaje de comisión pactado" value="10%" />
            <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#B3985B]/30">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Comisión total</p>
                <p className="text-base font-semibold text-gray-300">
                  {fmt(netoEquiposPropios)} × 10%
                </p>
              </div>
              <p className="text-3xl font-bold text-[#C9A84C] tabular-nums">{fmt(comision)}</p>
            </div>
          </div>
          <div className="px-5 py-3 bg-[#0b0b0b] border-t border-[#1e1e1e]">
            <p className="text-[10px] text-gray-600 leading-relaxed">
              La comisión se calcula sobre el subtotal de equipos Mainstage después de aplicar
              cualquier descuento ({cot.descuentoTotalPct > 0 ? `${cot.descuentoTotalPct.toFixed(1)}% en este caso` : "sin descuento en este caso"}).
              No incluye equipo externo, operación técnica ni viáticos.
            </p>
          </div>
        </div>

        {/* ── Condiciones ── */}
        <Divider label="Condiciones del acuerdo" />
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 text-xs text-gray-500 leading-relaxed space-y-2">
          <p>· El presente acuerdo es estrictamente entre las partes firmantes y no involucra ni compromete al cliente final en ningún aspecto.</p>
          <p>· La comisión será liquidada en una sola exhibición una vez que Mainstage Pro reciba el pago total del cliente.</p>
          <p>· Este documento no forma parte de ningún contrato, cotización o propuesta emitida al cliente final.</p>
          <p>· El importe de comisión está sujeto a la cotización de referencia y podrá ajustarse si la cotización sufre modificaciones antes de su aprobación.</p>
        </div>

        {/* ── Aviso de confidencialidad ── */}
        <div className="pt-8 pb-2 border-t border-[#1a1a1a] mt-8">
          <p className="text-[10px] text-gray-700 leading-relaxed text-center max-w-lg mx-auto">
            <span className="font-semibold text-gray-600">DOCUMENTO PRIVADO Y CONFIDENCIAL.</span>{" "}
            Este documento es de carácter estrictamente privado y su contenido está protegido por acuerdo de confidencialidad entre las partes.
            Queda estrictamente prohibida su reproducción, difusión, compartición o divulgación a terceros, incluido el cliente final.
            En caso de que Mainstage Pro tome conocimiento de que este documento ha sido compartido o divulgado sin autorización,
            se reserva el derecho de suspender de forma inmediata y definitiva cualquier relación comercial con las partes involucradas,
            sin responsabilidad alguna de su parte.
          </p>
          <p className="text-[9px] text-gray-700 text-center mt-3">
            Ref. {cot.numeroCotizacion} · {fechaDoc} · Mainstage Pro
          </p>
        </div>

      </div>
    </div>
  );
}
