import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generarPeriodosGastosRecurrentes } from "@/lib/gastos-recurrentes";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const gastos = await prisma.gastoRecurrente.findMany({
      include: {
        proveedor: true,
        empresa: true,
        categoria: true,
        periodos: {
          orderBy: { fechaInicio: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(gastos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const data = await req.json();
    
    // Validaciones básicas
    if (!data.nombre || !data.frecuencia || !data.fechaInicio) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    if (data.tipoMonto === "FIJO" && !data.montoBase) {
      return NextResponse.json({ error: "Monto base es obligatorio para gastos fijos" }, { status: 400 });
    }

    const gasto = await prisma.gastoRecurrente.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        tipoMonto: data.tipoMonto || "FIJO",
        montoBase: data.montoBase ? parseFloat(data.montoBase) : null,
        frecuencia: data.frecuencia,
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
        diaVencimiento: data.diaVencimiento ? parseInt(data.diaVencimiento, 10) : null,
        proveedorId: data.proveedorId || null,
        empresaId: data.empresaId || null,
        acreedorLibre: data.acreedorLibre || null,
        categoriaId: data.categoriaId || null,
        proyectoId: data.proyectoId || null,
        estado: data.estado || "ACTIVO",
        historial: {
          create: {
            cambio: "Gasto recurrente creado",
            creadoPor: session.id
          }
        }
      }
    });

    // Disparar generación
    await generarPeriodosGastosRecurrentes();

    return NextResponse.json(gasto);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
