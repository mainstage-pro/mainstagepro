import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActividad } from "@/lib/actividad";

// Public endpoint — no session required (accessed by client via shared URL)

type TradeData = {
  activo: boolean;
  pct: number;
  entregables: string[];
  checklist: Record<string, boolean>;
  checklistCompleto: boolean;
  nivelSeleccionado: number | null;
  nivelAplicado: number | null;
  bonoVariable: string | null;
  clienteSeleccionoEn: string | null;
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const cot = await prisma.cotizacion.findUnique({
    where: { tradeToken: token },
    select: {
      id: true,
      numeroCotizacion: true,
      nombreEvento: true,
      tipoEvento: true,
      fechaEvento: true,
      lugarEvento: true,
      subtotalEquiposBruto: true,
      montoDescuento: true,
      subtotalEquiposNeto: true,
      subtotalOperacion: true,
      subtotalTransporte: true,
      subtotalComidas: true,
      subtotalHospedaje: true,
      total: true,
      aplicaIva: true,
      montoIva: true,
      granTotal: true,
      mainstageTradeData: true,
      cliente: { select: { nombre: true, empresa: true } },
    },
  });

  if (!cot) return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 });

  let trade: TradeData = { activo: false, pct: 5, entregables: [], checklist: {}, checklistCompleto: false, nivelSeleccionado: null, nivelAplicado: null, bonoVariable: null, clienteSeleccionoEn: null };
  try { if (cot.mainstageTradeData) trade = { ...trade, ...JSON.parse(cot.mainstageTradeData) }; } catch { /* noop */ }

  // If client already selected, don't allow change
  const yaSelecciono = trade.nivelSeleccionado !== null;

  return NextResponse.json({ cot: { ...cot, mainstageTradeData: undefined }, trade, yaSelecciono });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json();
  const { nivel, bonoVariable } = body;

  if (![1, 2, 3].includes(nivel)) return NextResponse.json({ error: "Nivel inválido" }, { status: 400 });

  const cot = await prisma.cotizacion.findUnique({
    where: { tradeToken: token },
    select: {
      id: true, numeroCotizacion: true, nombreEvento: true,
      mainstageTradeData: true, creadaPorId: true,
      subtotalEquiposBruto: true, montoDescuento: true,
      subtotalEquiposNeto: true, subtotalPaquetes: true, subtotalTerceros: true,
      subtotalOperacion: true, subtotalTransporte: true, subtotalComidas: true,
      subtotalHospedaje: true, aplicaIva: true,
    },
  });

  if (!cot) return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 });

  let trade: TradeData = { activo: false, pct: 5, entregables: [], checklist: {}, checklistCompleto: false, nivelSeleccionado: null, nivelAplicado: null, bonoVariable: null, clienteSeleccionoEn: null };
  try { if (cot.mainstageTradeData) trade = { ...trade, ...JSON.parse(cot.mainstageTradeData) }; } catch { /* noop */ }

  if (trade.nivelSeleccionado !== null) {
    return NextResponse.json({ error: "Ya se registró una selección para esta propuesta" }, { status: 409 });
  }

  const pctMap: Record<number, number> = { 1: 5, 2: 10, 3: 12 };
  const pct = pctMap[nivel];

  const updated: TradeData = {
    ...trade,
    activo: true,
    nivelSeleccionado: nivel,
    nivelAplicado: nivel,
    pct,
    bonoVariable: nivel === 3 ? (bonoVariable ?? null) : null,
    clienteSeleccionoEn: new Date().toISOString(),
  };

  // Aplicar descuento Trade directamente en la cotización para que
  // la presentación y el PDF reflejen automáticamente el nuevo total
  const tradeDescuento = Math.round(cot.subtotalEquiposBruto * (pct / 100) * 100) / 100;
  const nuevoMontoDescuento = Math.round((cot.montoDescuento + tradeDescuento) * 100) / 100;
  const nuevoSubtotalNeto = Math.round((cot.subtotalEquiposBruto - nuevoMontoDescuento) * 100) / 100;
  const nuevoTotal = Math.round((
    nuevoSubtotalNeto +
    (cot.subtotalPaquetes ?? 0) +
    (cot.subtotalTerceros ?? 0) +
    (cot.subtotalOperacion ?? 0) +
    (cot.subtotalTransporte ?? 0) +
    (cot.subtotalComidas ?? 0) +
    (cot.subtotalHospedaje ?? 0)
  ) * 100) / 100;
  const nuevoIva = cot.aplicaIva ? Math.round(nuevoTotal * 0.16 * 100) / 100 : 0;
  const nuevoGranTotal = Math.round((nuevoTotal + nuevoIva) * 100) / 100;

  await prisma.cotizacion.update({
    where: { id: cot.id },
    data: {
      mainstageTradeData: JSON.stringify(updated),
      montoDescuento: nuevoMontoDescuento,
      subtotalEquiposNeto: nuevoSubtotalNeto,
      total: nuevoTotal,
      montoIva: nuevoIva,
      granTotal: nuevoGranTotal,
    },
  });

  const nivelLabels: Record<number, string> = { 1: "Base", 2: "Estratégico", 3: "Premium" };
  await logActividad(
    cot.creadaPorId ?? "sistema",
    "TRADE",
    "cotizacion",
    cot.id,
    `Cliente eligió Mainstage Trade Nivel ${nivel} (${nivelLabels[nivel]} · ${pct}%) en ${cot.nombreEvento ?? cot.numeroCotizacion}. Descuento aplicado: $${tradeDescuento.toLocaleString("es-MX")}`
  ).catch(() => { /* no bloquear si falla el log */ });

  return NextResponse.json({ ok: true, nivel, pct, tradeDescuento, granTotal: nuevoGranTotal });
}
