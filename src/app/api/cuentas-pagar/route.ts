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
    categoriaId,
    esRecurrente, frecuencia, fechaFin, diaVencimiento
  } = body;

  if (!concepto || !monto || !fechaCompromiso) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const resolvedTipo = empresaId ? "EMPRESA" : socioId ? "SOCIO" : tipoAcreedor;
  const montoFloat = parseFloat(monto);
  const fechaInicio = new Date(fechaCompromiso);

  if (esRecurrente && frecuencia) {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the new GastoRecurrente instead of SerieRecurrente
      const gasto = await tx.gastoRecurrente.create({
        data: {
          nombre: concepto,
          descripcion: notas || null,
          tipoMonto: "FIJO",
          montoBase: montoFloat,
          frecuencia,
          fechaInicio,
          fechaFin: fechaFin ? new Date(fechaFin) : null,
          diaVencimiento: diaVencimiento ? parseInt(diaVencimiento, 10) : null,
          proveedorId: proveedorId || null,
          empresaId: empresaId || null,
          categoriaId: categoriaId || null,
          proyectoId: proyectoId || null,
          estado: "ACTIVO",
          ultimaGeneracion: new Date(),
        }
      });

      // Se generarán los periodos mediante la función central.
      return gasto;
    });

    // Llamamos asíncronamente (o de inmediato) a la utilidad central
    const { generarPeriodosGastosRecurrentes } = await import("@/lib/gastos-recurrentes");
    await generarPeriodosGastosRecurrentes();

    // Fetch the first generated CuentaPagar to return
    const primeraCxP = await prisma.cuentaPagar.findFirst({
      where: { gastoRecurrenteId: result.id },
      orderBy: { fechaCompromiso: "asc" }
    });

    return NextResponse.json({ cxp: primeraCxP || { id: "generando..." } });
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
          categoriaId: categoriaId || null,
    },
  });

  return NextResponse.json({ cxp });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const socioId = searchParams.get("socioId");

  const whereClause: any = socioId ? { socioId } : {
    NOT: [
      { socio: { nombre: { contains: "Mauricio Hernández" } } },
      { proveedor: { nombre: { contains: "Mauricio Hernández" } } },
      { tecnico: { nombre: { contains: "Mauricio Hernández" } } },
      { empresa: { nombre: { contains: "Mauricio Hernández" } } },
    ]
  };

  const cuentas = await prisma.cuentaPagar.findMany({
    where: whereClause,
    include: {
      tecnico: { select: { id: true, nombre: true, celular: true } },
      proveedor: { select: { id: true, nombre: true, telefono: true } },
      empresa: { select: { id: true, nombre: true, telefono: true } },
      socio: { select: { id: true, nombre: true, email: true } },
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true } },
      cuentaOrigen: { select: { id: true, nombre: true, banco: true } },
      categoria: { select: { id: true, nombre: true } },
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
