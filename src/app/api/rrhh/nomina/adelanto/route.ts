import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getCategoriaPersonalFreelance, getCategoriaSueldosYSalarios } from "@/lib/nomina-pagos";
import { PREFIJO_ADELANTO, type TipoPeriodoNomina } from "@/lib/nomina-periodo";
import { logActividad } from "@/lib/actividad";

const TIPOS: TipoPeriodoNomina[] = ["SEMANAL", "QUINCENAL", "MENSUAL"];
const ETIQUETA: Record<TipoPeriodoNomina, string> = {
  SEMANAL: "Nómina semanal",
  QUINCENAL: "Quincena",
  MENSUAL: "Nómina mensual",
};

// POST /api/rrhh/nomina/adelanto
// Paga HOY la nómina de un periodo que aún no llega (p. ej. la semana que entra).
// Crea el PagoNomina con la clave del periodo futuro ya PAGADO, su CxP liquidada,
// el abono y el gasto (un solo MovimientoFinanciero). Cuando el cron o "Generar
// nómina" lleguen a ese periodo, encuentran el pago y no crean otro.
// Si el pago de ese periodo ya existe PENDIENTE, lo liquida en vez de duplicarlo.
// body: { personalId, periodo, tipoPeriodo, monto, fechaPago, metodoPago, cuentaOrigenId, notas? }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const personalId: string | undefined = body.personalId;
  const periodo: string = String(body.periodo ?? "").trim();
  const tipoPeriodo = body.tipoPeriodo as TipoPeriodoNomina;
  const monto = Number(body.monto);
  const metodoPago: string = body.metodoPago || "EFECTIVO";
  const cuentaOrigenId: string | null = body.cuentaOrigenId || null;
  const notasExtra: string = String(body.notas ?? "").trim();
  const fechaPago = body.fechaPago ? new Date(`${String(body.fechaPago).slice(0, 10)}T12:00:00`) : new Date();

  if (!personalId || !periodo || !TIPOS.includes(tipoPeriodo)) {
    return NextResponse.json({ error: "Persona, periodo y tipo de periodo requeridos" }, { status: 400 });
  }
  if (!(monto > 0)) return NextResponse.json({ error: "El monto debe ser mayor a cero" }, { status: 400 });
  if (isNaN(fechaPago.getTime())) return NextResponse.json({ error: "Fecha de pago inválida" }, { status: 400 });
  if (!cuentaOrigenId) return NextResponse.json({ error: "Elige la cuenta de donde sale el dinero" }, { status: 400 });

  const persona = await prisma.personalInterno.findUnique({
    where: { id: personalId },
    select: { id: true, nombre: true, tipo: true },
  });
  if (!persona) return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });

  const existente = await prisma.pagoNomina.findFirst({
    where: { personalId, periodo, tipoPeriodo },
    select: { id: true, estado: true, cuentaPagarId: true, concepto: true },
  });
  if (existente?.estado === "PAGADO") {
    return NextResponse.json({ error: `El periodo ${periodo} de ${persona.nombre} ya está pagado` }, { status: 409 });
  }

  const concepto = `${PREFIJO_ADELANTO}${ETIQUETA[tipoPeriodo]} ${persona.nombre} — ${periodo}`;
  const fechaTxt = fechaPago.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  const notas = [`Adelanto de nómina del periodo ${periodo}, pagado el ${fechaTxt}.`, notasExtra].filter(Boolean).join(" ");

  const categoriaId =
    persona.tipo === "FREELANCE_RECURRENTE"
      ? await getCategoriaPersonalFreelance(prisma)
      : await getCategoriaSueldosYSalarios(prisma);

  const pago = await prisma.$transaction(async (tx) => {
    const movimiento = await tx.movimientoFinanciero.create({
      data: {
        fecha: fechaPago,
        tipo: "GASTO",
        concepto,
        monto,
        metodoPago,
        cuentaOrigenId,
        categoriaId,
        notas,
        creadoPor: session.name,
      },
    });

    let cuentaPagarId = existente?.cuentaPagarId ?? null;
    if (cuentaPagarId) {
      await tx.cuentaPagar.update({
        where: { id: cuentaPagarId },
        data: {
          concepto,
          monto,
          montoPagado: monto,
          estado: "LIQUIDADO",
          fechaPagoReal: fechaPago,
          cuentaOrigenId,
          movimientoId: movimiento.id,
        },
      });
    } else {
      const cxp = await tx.cuentaPagar.create({
        data: {
          tipoAcreedor: "PERSONAL_INTERNO",
          concepto,
          monto,
          montoPagado: monto,
          fechaCompromiso: fechaPago,
          fechaPagoReal: fechaPago,
          estado: "LIQUIDADO",
          esNomina: true,
          cuentaOrigenId,
          categoriaId,
          movimientoId: movimiento.id,
          notas,
        },
      });
      cuentaPagarId = cxp.id;
    }

    await tx.abonoPago.create({
      data: {
        cuentaPagarId,
        monto,
        fecha: fechaPago,
        metodoPago,
        cuentaOrigenId,
        movimientoId: movimiento.id,
        notas: "Adelanto de nómina (RRHH)",
        creadoPor: session.id,
      },
    });

    const data = {
      monto,
      concepto,
      estado: "PAGADO",
      fechaPago,
      metodoPago,
      cuentaOrigenId,
      movimientoId: movimiento.id,
      notas,
    };
    return existente
      ? tx.pagoNomina.update({ where: { id: existente.id }, data })
      : tx.pagoNomina.create({ data: { ...data, personalId, periodo, tipoPeriodo, cuentaPagarId } });
  });

  await logActividad(session.id, "CREAR", "PagoNomina", pago.id, `${concepto} · $${monto.toLocaleString("es-MX")}`, {
    periodo,
    tipoPeriodo,
    cuentaOrigenId,
  });

  return NextResponse.json({ pago });
}
