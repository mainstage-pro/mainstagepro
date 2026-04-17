import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cotizaciones = await prisma.cotizacion.findMany({
    include: {
      cliente: { select: { nombre: true, empresa: true, tipoCliente: true } },
      trato: { select: { tipoEvento: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ cotizaciones });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();

    // Generar número de cotización — busca el número más alto existente para evitar colisiones
    const last = await prisma.cotizacion.findFirst({
      orderBy: { numeroCotizacion: "desc" },
      select: { numeroCotizacion: true },
    });
    const lastNum = last ? parseInt(last.numeroCotizacion.replace("COT-", "")) || 0 : 0;
    const numeroCotizacion = `COT-${String(lastNum + 1).padStart(4, "0")}`;

    const {
      tratoId,
      clienteId,
      lineas = [],
      // Descuentos adicionales opcionales
      descuentoPatrocinioPct = 0,
      descuentoPatrocinioNota = null,
      descuentoEspecialPct = 0,
      descuentoEspecialNota = null,
      tipoBeneficio = null,
      aplicaIva = false,
      observaciones = null,
      terminosComerciales = null,
      vigenciaDias = 30,
      notasSecciones = null,
      incluirChofer = false,
      ...campos
    } = body;

    if (!tratoId || !clienteId) {
      return NextResponse.json({ error: "tratoId y clienteId requeridos" }, { status: 400 });
    }

    const cotizacion = await prisma.cotizacion.create({
      data: {
        numeroCotizacion,
        tratoId,
        clienteId,
        creadaPorId: session.id,
        descuentoPatrocinioPct,
        descuentoPatrocinioNota,
        descuentoEspecialPct,
        descuentoEspecialNota,
        tipoBeneficio,
        aplicaIva,
        incluirChofer,
        observaciones,
        terminosComerciales,
        vigenciaDias,
        notasSecciones: notasSecciones ?? null,
        nombreEvento: campos.nombreEvento || null,
        tipoEvento: campos.tipoEvento || null,
        tipoServicio: campos.tipoServicio || null,
        fechaEvento: campos.fechaEvento ? new Date(campos.fechaEvento) : null,
        lugarEvento: campos.lugarEvento || null,
        horasOperacion: campos.horasOperacion ? parseFloat(campos.horasOperacion) : null,
        tipoJornada: campos.tipoJornada || null,
        diasEquipo: campos.diasEquipo ? parseInt(campos.diasEquipo) : 1,
        diasOperacion: campos.diasOperacion ? parseInt(campos.diasOperacion) : 1,
        diasTransporte: campos.diasTransporte ? parseInt(campos.diasTransporte) : 1,
        diasHospedaje: campos.diasHospedaje ? parseInt(campos.diasHospedaje) : 1,
        diasComidas: campos.diasComidas ? parseInt(campos.diasComidas) : 1,
        subtotalEquiposBruto: campos.subtotalEquiposBruto || 0,
        descuentoVolumenPct: campos.descuentoVolumenPct || 0,
        descuentoB2bPct: campos.descuentoB2bPct || 0,
        descuentoMultidiaPct: campos.descuentoMultidiaPct || 0,
        descuentoTotalPct: campos.descuentoTotalPct || 0,
        montoDescuento: campos.montoDescuento || 0,
        subtotalEquiposNeto: campos.subtotalEquiposNeto || 0,
        subtotalPaquetes: campos.subtotalPaquetes || 0,
        subtotalTerceros: campos.subtotalTerceros || 0,
        subtotalOperacion: campos.subtotalOperacion || 0,
        subtotalTransporte: campos.subtotalTransporte || 0,
        subtotalComidas: campos.subtotalComidas || 0,
        subtotalHospedaje: campos.subtotalHospedaje || 0,
        total: campos.total || 0,
        montoIva: campos.montoIva || 0,
        granTotal: campos.granTotal || 0,
        montoBeneficio: campos.montoBeneficio || 0,
        costosTotalesEstimados: campos.costosTotalesEstimados || 0,
        utilidadEstimada: campos.utilidadEstimada || 0,
        porcentajeUtilidad: campos.porcentajeUtilidad || 0,
        lineas: {
          create: lineas.map((l: Record<string, unknown>, i: number) => ({
            tipo: l.tipo,
            orden: i,
            equipoId: l.equipoId || null,
            rolTecnicoId: l.rolTecnicoId || null,
            descripcion: String(l.descripcion || ""),
            marca: l.marca as string || null,
            nivel: l.nivel as string || null,
            jornada: l.jornada as string || null,
            esExterno: Boolean(l.esExterno),
            proveedorId: l.proveedorId as string || null,
            costoExterno: l.costoExterno ? parseFloat(String(l.costoExterno)) : null,
            cantidad: parseFloat(String(l.cantidad || 1)),
            dias: parseInt(String(l.dias || 1)),
            precioUnitario: parseFloat(String(l.precioUnitario || 0)),
            costoUnitario: parseFloat(String(l.costoUnitario || 0)),
            subtotal: parseFloat(String(l.subtotal || 0)),
            esIncluido: Boolean(l.esIncluido),
            notas: l.notas as string || null,
          })),
        },
      },
      include: { lineas: true },
    });

    await logActividad(session.id, "CREAR", "cotizacion", cotizacion.id, `Cotización ${numeroCotizacion} creada`);
    return NextResponse.json({ cotizacion });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[POST /api/cotizaciones]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
