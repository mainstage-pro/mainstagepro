import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const pasivo = await prisma.pasivoDeuda.findUnique({
    where: { id },
    include: {
      proveedor: { select: { id: true, nombre: true } },
      cuotas: {
        orderBy: { numeroCuota: "asc" },
        include: {
          cuentaPagar: {
            select: {
              id: true,
              monto: true,
              montoPagado: true,
              estado: true,
              fechaPagoReal: true,
              abonos: {
                select: {
                  id: true,
                  monto: true,
                  fecha: true,
                  metodoPago: true,
                },
                orderBy: { fecha: "asc" },
              },
            },
          },
        },
      },
    },
  });
  if (!pasivo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ pasivo });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const pasivo = await prisma.pasivoDeuda.update({
    where: { id },
    data: {
      nombre: body.nombre,
      proveedorId: body.proveedorId || null,
      acreedorNombre: body.acreedorNombre || null,
      descripcion: body.descripcion || null,
      montoTotal: body.montoTotal ? parseFloat(body.montoTotal) : undefined,
      categoria: body.categoria,
      estado: body.estado,
      tasaInteres: body.tasaInteres ? parseFloat(body.tasaInteres) : null,
      notas: body.notas || null,
    },
    include: { proveedor: { select: { id: true, nombre: true } }, cuotas: true },
  });
  return NextResponse.json({ pasivo });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (body.marcarTodasPagadas) {
    await prisma.cuotaDeuda.updateMany({
      where: { pasivoDeudaId: id },
      data: { estado: "PAGADO" },
    });
    // Obtener total para marcar montoPagado completo
    const cuotas = await prisma.cuotaDeuda.findMany({ where: { pasivoDeudaId: id } });
    const totalCuotas = cuotas.reduce((s, c) => s + c.monto, 0);
    const pasivo = await prisma.pasivoDeuda.update({
      where: { id },
      data: {
        montoPagado: totalCuotas > 0 ? totalCuotas : undefined,
        estado: "LIQUIDADO",
      },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        cuotas: { orderBy: { numeroCuota: "asc" } },
      },
    });
    return NextResponse.json({ pasivo });
  }

  // Actualizar cuota individual (estado, monto, fecha)
  if (body.cuotaId) {
    const cuotaData: { estado?: string; monto?: number; fechaVencimiento?: Date } = {};
    if (body.cuotaEstado || body.estado) {
      cuotaData.estado = body.cuotaEstado || body.estado;
    }
    if (body.monto !== undefined && !isNaN(parseFloat(body.monto))) {
      cuotaData.monto = parseFloat(body.monto);
    }
    if (body.fechaVencimiento) {
      cuotaData.fechaVencimiento = new Date(body.fechaVencimiento);
    }

    const cuotaActualizada = await prisma.cuotaDeuda.update({
      where: { id: body.cuotaId },
      data: cuotaData,
    });

    // Si tiene cuenta por pagar vinculada, sincronizar monto y fecha
    if (cuotaActualizada.cuentaPagarId) {
      await prisma.cuentaPagar.update({
        where: { id: cuotaActualizada.cuentaPagarId },
        data: {
          ...(cuotaData.monto !== undefined && { monto: cuotaData.monto }),
          ...(cuotaData.fechaVencimiento && { fechaCompromiso: cuotaData.fechaVencimiento }),
          ...(cuotaData.estado === "PAGADO" && { estado: "LIQUIDADO" }),
          ...(cuotaData.estado === "PENDIENTE" && { estado: "PENDIENTE" }),
        },
      }).catch(() => null);
    }
  }

  // Agregar cuota nueva
  if (body.agregarCuota) {
    const ultCuota = await prisma.cuotaDeuda.findFirst({
      where: { pasivoDeudaId: id },
      orderBy: { numeroCuota: "desc" },
    });
    const nuevoNum = (ultCuota?.numeroCuota ?? 0) + 1;
    const monto = parseFloat(body.agregarCuota.monto) || 0;
    const fechaVencimiento = body.agregarCuota.fechaVencimiento
      ? new Date(body.agregarCuota.fechaVencimiento)
      : new Date();
    const estado = body.agregarCuota.estado || "PENDIENTE";

    await prisma.cuotaDeuda.create({
      data: {
        pasivoDeudaId: id,
        numeroCuota: nuevoNum,
        monto,
        fechaVencimiento,
        estado,
      },
    });
  }

  // Eliminar cuota individual
  if (body.eliminarCuotaId) {
    const cuota = await prisma.cuotaDeuda.findUnique({
      where: { id: body.eliminarCuotaId },
    });
    if (cuota?.cuentaPagarId) {
      await prisma.cuentaPagar.delete({ where: { id: cuota.cuentaPagarId } }).catch(() => null);
    }
    await prisma.cuotaDeuda.delete({ where: { id: body.eliminarCuotaId } });
  }

  if (body.estado && !body.cuotaId) {
    await prisma.pasivoDeuda.update({
      where: { id },
      data: { estado: body.estado },
    });
  }

  // Recalcular montos del pasivo a partir de sus cuotas actuales
  const todasCuotas = await prisma.cuotaDeuda.findMany({
    where: { pasivoDeudaId: id },
  });

  if (todasCuotas.length > 0) {
    const totalCalculado = Math.round(todasCuotas.reduce((s, c) => s + c.monto, 0) * 100) / 100;
    const pagadoCalculado = Math.round(
      todasCuotas.filter(c => c.estado === "PAGADO").reduce((s, c) => s + c.monto, 0) * 100
    ) / 100;
    const estadoFinal = pagadoCalculado >= totalCalculado && totalCalculado > 0 ? "LIQUIDADO" : "ACTIVO";

    await prisma.pasivoDeuda.update({
      where: { id },
      data: {
        montoTotal: totalCalculado,
        montoPagado: pagadoCalculado,
        estado: estadoFinal,
      },
    });
  }

  const pasivo = await prisma.pasivoDeuda.findUnique({
    where: { id },
    include: {
      proveedor: { select: { id: true, nombre: true } },
      cuotas: {
        orderBy: { numeroCuota: "asc" },
        include: {
          cuentaPagar: {
            select: {
              id: true,
              monto: true,
              montoPagado: true,
              estado: true,
              fechaPagoReal: true,
              abonos: {
                select: {
                  id: true,
                  monto: true,
                  fecha: true,
                  metodoPago: true,
                },
                orderBy: { fecha: "asc" },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ pasivo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.pasivoDeuda.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
