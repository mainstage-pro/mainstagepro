import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generarFechasRecurrentes, FrecuenciaRecurrencia } from "@/lib/recurrencia-finanzas";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const {
    tipoAcreedor = "OTRO",
    concepto,
    monto,
    fechaCompromiso,
    notas,
    proveedorId,
    tecnicoId,
    empresaId,
    socioId,
    proyectoId,
    esRecurrente, frecuencia, fechaFin, diaVencimiento
  } = body;

  if (!concepto || !monto || !fechaCompromiso) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const resolvedTipo = empresaId ? "EMPRESA" : socioId ? "SOCIO" : tipoAcreedor;
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
          tipo: "CXP",
          frecuencia,
          intervalo: 1,
          fechaInicio,
          fechaFin: fechaFin ? new Date(fechaFin) : null,
          diaVencimiento: diaVencimiento ? parseInt(diaVencimiento, 10) : null,
          concepto,
          monto: montoFloat,
          empresaId: empresaId || null,
          proveedorId: proveedorId || null,
          socioId: socioId || null,
          tecnicoId: tecnicoId || null,
          proyectoId: proyectoId || null,
          ultimaGeneracion: new Date(),
        }
      });

      // 2. Create the child accounts
      const cuentas = await Promise.all(fechas.map((fecha, idx) => 
        tx.cuentaPagar.create({
          data: {
            tipoAcreedor: resolvedTipo,
            concepto: `${concepto} (${idx + 1})`,
            monto: montoFloat,
            fechaCompromiso: fecha,
            estado: "PENDIENTE",
            notas: notas || null,
            proveedorId: proveedorId || null,
            tecnicoId: tecnicoId || null,
            empresaId: empresaId || null,
            socioId: socioId || null,
            proyectoId: proyectoId || null,
            serieRecurrenteId: serie.id,
            numeroPeriodo: idx + 1,
          }
        })
      ));

      return cuentas[0]; // return the first one as response
    });

    return NextResponse.json({ cxp: result });
  }

  // Normal creation (non-recurrent)
  const cxp = await prisma.cuentaPagar.create({
    data: {
      tipoAcreedor: resolvedTipo,
      concepto,
      monto: montoFloat,
      fechaCompromiso: fechaInicio,
      estado: "PENDIENTE",
      notas: notas || null,
      proveedorId: proveedorId || null,
      tecnicoId: tecnicoId || null,
      empresaId: empresaId || null,
      socioId: socioId || null,
      proyectoId: proyectoId || null,
    },
  });

  return NextResponse.json({ cxp });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const socioId = searchParams.get("socioId");

  const cuentas = await prisma.cuentaPagar.findMany({
    where: socioId ? { socioId } : undefined,
    include: {
      tecnico: { select: { id: true, nombre: true, celular: true } },
      proveedor: { select: { id: true, nombre: true, telefono: true } },
      empresa: { select: { id: true, nombre: true, telefono: true } },
      socio: { select: { id: true, nombre: true, email: true } },
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true } },
      cuentaOrigen: { select: { id: true, nombre: true, banco: true } },
      pagoNomina: { select: { id: true, personal: { select: { id: true, nombre: true } } } },
      abonos: { orderBy: { fecha: "asc" } },
    },
    orderBy: [
      { proyecto: { fechaEvento: "asc" } },
      { fechaCompromiso: "asc" },
    ],
  });

  return NextResponse.json(cuentas);
}
