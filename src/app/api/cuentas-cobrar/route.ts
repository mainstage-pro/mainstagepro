import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generarFechasRecurrentes, FrecuenciaRecurrencia } from "@/lib/recurrencia-finanzas";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { 
    clienteId, empresaId, proyectoId, cotizacionId, concepto, 
    tipoPago = "ANTICIPO", monto, fechaCompromiso, notas,
    esRecurrente, frecuencia, fechaFin, diaVencimiento
  } = body;

  if (!concepto || !monto || !fechaCompromiso) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }
  if (!clienteId && !empresaId) {
    return NextResponse.json({ error: "Se requiere cliente o empresa" }, { status: 400 });
  }

  const montoFloat = parseFloat(monto);
  const fechaInicio = new Date(fechaCompromiso);

  if (esRecurrente && frecuencia) {
    // Generate dates for the recurrence
    const fechas = generarFechasRecurrentes({
      frecuencia: frecuencia as FrecuenciaRecurrencia,
      fechaInicio,
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      diaVencimiento: diaVencimiento ? parseInt(diaVencimiento, 10) : null
    }, 24); // generate up to 24 months (2 years)

    if (fechas.length === 0) {
      return NextResponse.json({ error: "La configuración de recurrencia no genera ninguna fecha" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the template (SerieRecurrente)
      const serie = await tx.serieRecurrente.create({
        data: {
          tipo: "CXC",
          frecuencia,
          intervalo: 1,
          fechaInicio,
          fechaFin: fechaFin ? new Date(fechaFin) : null,
          diaVencimiento: diaVencimiento ? parseInt(diaVencimiento, 10) : null,
          concepto,
          monto: montoFloat,
          clienteId: clienteId || null,
          empresaId: empresaId || null,
          proyectoId: proyectoId || null,
          ultimaGeneracion: new Date(),
        }
      });

      // 2. Create the child accounts
      const cuentas = await Promise.all(fechas.map((fecha, idx) => 
        tx.cuentaCobrar.create({
          data: {
            clienteId: clienteId || null,
            empresaId: empresaId || null,
            proyectoId: proyectoId || null,
            cotizacionId: cotizacionId || null,
            serieRecurrenteId: serie.id,
            numeroPeriodo: idx + 1,
            concepto: `${concepto} (${idx + 1})`,
            tipoPago,
            monto: montoFloat,
            fechaCompromiso: fecha,
            estado: "PENDIENTE",
            notas: notas || null,
          }
        })
      ));

      return cuentas[0]; // return the first one as response
    });

    return NextResponse.json({ cxc: result });
  }

  // Normal creation (non-recurrent)
  const cxc = await prisma.cuentaCobrar.create({
    data: {
      clienteId: clienteId || null,
      empresaId: empresaId || null,
      proyectoId: proyectoId || null,
      cotizacionId: cotizacionId || null,
      concepto,
      tipoPago,
      monto: montoFloat,
      fechaCompromiso: fechaInicio,
      estado: "PENDIENTE",
      notas: notas || null,
    },
  });

  return NextResponse.json({ cxc });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const proyectoId = searchParams.get("proyectoId");
  const cotizacionId = searchParams.get("cotizacionId");
  const tipoPago = searchParams.get("tipoPago");

  const cuentas = await prisma.cuentaCobrar.findMany({
    where: {
      ...(proyectoId ? { proyectoId } : {}),
      ...(cotizacionId ? { cotizacionId } : {}),
      ...(tipoPago ? { tipoPago } : {}),
    },
    include: {
      cliente: { select: { id: true, nombre: true, telefono: true } },
      empresa: { select: { id: true, nombre: true, telefono: true } },
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true } },
      cotizacion: { select: { id: true, numeroCotizacion: true } },
      cuentaDestino: { select: { id: true, nombre: true, banco: true } },
      abonos: { orderBy: { fecha: "asc" }, select: { id: true, monto: true, fecha: true, metodoPago: true, notas: true } },
    },
    orderBy: [
      { proyecto: { fechaEvento: "asc" } },
      { fechaCompromiso: "asc" },
    ],
  });

  return NextResponse.json(cuentas);
}
