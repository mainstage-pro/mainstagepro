import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST /api/finanzas/pasivos/[id]/plan-pagos
// Body: { cuotas: [{ monto, fechaVencimiento, estado? }], cuentaOrigenId? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const body = await req.json();
  const { cuotas, cuentaOrigenId } = body as {
    cuotas: { monto: number; fechaVencimiento: string; estado?: string }[];
    cuentaOrigenId?: string;
  };

  if (!cuotas || !Array.isArray(cuotas) || cuotas.length === 0)
    return NextResponse.json({ error: "Se requieren cuotas" }, { status: 400 });

  const pasivo = await prisma.pasivoDeuda.findUnique({
    where: { id },
    include: { proveedor: true },
  });
  if (!pasivo) return NextResponse.json({ error: "Pasivo no encontrado" }, { status: 404 });

  // Eliminar cuotas y CXP anteriores si las hubiera
  const cuotasExistentes = await prisma.cuotaDeuda.findMany({ where: { pasivoDeudaId: id } });
  for (const c of cuotasExistentes) {
    if (c.cuentaPagarId) {
      await prisma.cuentaPagar.delete({ where: { id: c.cuentaPagarId } }).catch(() => null);
    }
  }
  await prisma.cuotaDeuda.deleteMany({ where: { pasivoDeudaId: id } });

  // Crear cuotas + CXP automáticas
  const creadas = [];
  let totalPagado = 0;
  let totalMonto = 0;

  for (let i = 0; i < cuotas.length; i++) {
    const c = cuotas[i];
    const cuotaMonto = parseFloat(String(c.monto)) || 0;
    const estado = c.estado || "PENDIENTE";
    const esPagada = estado === "PAGADO";

    totalMonto += cuotaMonto;
    if (esPagada) totalPagado += cuotaMonto;

    // Crear CXP en cobros-pagos
    const cxp = await prisma.cuentaPagar.create({
      data: {
        tipoAcreedor: pasivo.proveedorId ? "PROVEEDOR" : "OTRO",
        proveedorId: pasivo.proveedorId || null,
        concepto: `Cuota ${i + 1}/${cuotas.length} — ${pasivo.nombre}`,
        monto: cuotaMonto,
        montoPagado: esPagada ? cuotaMonto : 0,
        estado: esPagada ? "LIQUIDADO" : "PENDIENTE",
        fechaCompromiso: new Date(c.fechaVencimiento),
        cuentaOrigenId: cuentaOrigenId || null,
        esDeuda: true,
        notas: `Generada automáticamente del pasivo: ${pasivo.nombre}`,
      },
    });

    // Crear CuotaDeuda vinculada a la CXP
    const cuotaDeuda = await prisma.cuotaDeuda.create({
      data: {
        pasivoDeudaId: id,
        numeroCuota: i + 1,
        monto: cuotaMonto,
        fechaVencimiento: new Date(c.fechaVencimiento),
        estado,
        cuentaPagarId: cxp.id,
      },
    });
    creadas.push(cuotaDeuda);
  }

  // Actualizar totales y estado en el PasivoDeuda
  const totalCalculado = Math.round(totalMonto * 100) / 100;
  const pagadoCalculado = Math.round(totalPagado * 100) / 100;
  const estadoFinal = pagadoCalculado >= totalCalculado && totalCalculado > 0 ? "LIQUIDADO" : "ACTIVO";

  await prisma.pasivoDeuda.update({
    where: { id },
    data: {
      montoTotal: totalCalculado,
      montoPagado: pagadoCalculado,
      estado: estadoFinal,
    },
  });

  return NextResponse.json({ cuotas: creadas, total: creadas.length }, { status: 201 });
}
