import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generarPeriodosGastosRecurrentes } from "@/lib/gastos-recurrentes";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const gasto = await prisma.gastoRecurrente.findUnique({
      where: { id: params.id },
      include: {
        proveedor: true,
        empresa: true,
        categoria: true,
        periodos: {
          orderBy: { fechaInicio: 'desc' },
          include: {
            cuentaPagar: {
              include: {
                abonos: true,
                movimiento: true
              }
            }
          }
        },
        historial: {
          orderBy: { createdAt: "desc" },
          take: 10
        }
      }
    });

    if (!gasto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    return NextResponse.json(gasto);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const data = await req.json();
    const oldGasto = await prisma.gastoRecurrente.findUnique({ where: { id: params.id } });
    
    if (!oldGasto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const cambios = [];
    if (oldGasto.montoBase !== data.montoBase) cambios.push(`Monto: ${oldGasto.montoBase} -> ${data.montoBase}`);
    if (oldGasto.estado !== data.estado) cambios.push(`Estado: ${oldGasto.estado} -> ${data.estado}`);
    if (oldGasto.frecuencia !== data.frecuencia) cambios.push(`Frecuencia: ${oldGasto.frecuencia} -> ${data.frecuencia}`);
    
    const cambioLog = cambios.length > 0 ? cambios.join(", ") : "Actualización general";

    const gasto = await prisma.gastoRecurrente.update({
      where: { id: params.id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        tipoMonto: data.tipoMonto,
        montoBase: data.montoBase ? parseFloat(data.montoBase) : null,
        frecuencia: data.frecuencia,
        fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : undefined,
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
        diaVencimiento: data.diaVencimiento ? parseInt(data.diaVencimiento, 10) : null,
        proveedorId: data.proveedorId,
        empresaId: data.empresaId,
        acreedorLibre: data.acreedorLibre,
        categoriaId: data.categoriaId,
        proyectoId: data.proyectoId,
        estado: data.estado,
        historial: {
          create: {
            cambio: cambioLog,
            creadoPor: session.id
          }
        }
      }
    });

    if (gasto.estado === "ACTIVO") {
      await generarPeriodosGastosRecurrentes();
    }

    return NextResponse.json(gasto);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
