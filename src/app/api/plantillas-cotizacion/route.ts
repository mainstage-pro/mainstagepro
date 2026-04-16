import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET — listar plantillas
export async function GET() {
  try {
        const plantillas = await prisma.plantillaCotizacion.findMany({
      where: { activo: true },
      include: {
        lineas: { orderBy: { orden: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ plantillas });
  } catch {
    return NextResponse.json({ plantillas: [] });
  }
}

// POST — crear plantilla (desde cotización existente o desde cero)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, descripcion, tipoEvento, tipoServicio, cotizacionId, lineas, ...campos } = body;

  let lineasData = lineas ?? [];

  // Si viene cotizacionId → copiar líneas de la cotización
  if (cotizacionId && !lineas) {
    const cot = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: { lineas: { orderBy: { orden: "asc" } } },
    });
    if (cot) {
      lineasData = cot.lineas.map((l, i) => ({
        tipo: l.tipo,
        equipoId: l.equipoId ?? null,
        rolTecnicoId: l.rolTecnicoId ?? null,
        descripcion: l.descripcion,
        marca: l.marca ?? null,
        modelo: l.modelo ?? null,
        nivel: l.nivel ?? null,
        jornada: l.jornada ?? null,
        esExterno: l.esExterno,
        cantidad: l.cantidad,
        dias: l.dias,
        precioUnitario: l.precioUnitario,
        costoUnitario: l.costoUnitario,
        subtotal: l.subtotal,
        esIncluido: l.esIncluido,
        notas: l.notas ?? null,
        orden: i,
      }));
    }
  }

  try {
    const plantilla = await prisma.plantillaCotizacion.create({
      data: {
        nombre,
        descripcion: descripcion ?? null,
        tipoEvento: tipoEvento ?? null,
        tipoServicio: tipoServicio ?? null,
        creadaPorId: session.id,
        diasEquipo: campos.diasEquipo ?? 1,
        diasOperacion: campos.diasOperacion ?? 1,
        diasTransporte: campos.diasTransporte ?? 1,
        diasHospedaje: campos.diasHospedaje ?? 1,
        diasComidas: campos.diasComidas ?? 1,
        observaciones: campos.observaciones ?? null,
        vigenciaDias: campos.vigenciaDias ?? 30,
        aplicaIva: campos.aplicaIva ?? false,
        lineas: { create: lineasData },
      },
      include: { lineas: true },
    });
    return NextResponse.json({ plantilla });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
