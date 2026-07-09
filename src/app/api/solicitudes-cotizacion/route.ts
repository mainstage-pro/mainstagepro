import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureSolicitudTables } from "@/lib/solicitudes-cotizacion";

interface EquipoInput {
  categoria?: string | null;
  equipo?: string | null;
  cantidad?: number | string;
  notas?: string | null;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureSolicitudTables();

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado");
  const vendedorId = searchParams.get("vendedorId");

  const where: Record<string, unknown> = { activo: true };
  if (estado) where.estado = estado;
  if (vendedorId) where.vendedorId = vendedorId;

  const solicitudes = await prisma.solicitudCotizacion.findMany({
    where,
    select: {
      id: true, folio: true, clienteNombre: true, fechaEvento: true, lugarEvento: true,
      tipoEvento: true, tipoServicio: true, estado: true, entregable: true,
      createdAt: true, tratoId: true,
      vendedor: { select: { id: true, name: true } },
      _count: { select: { equipos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ solicitudes });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureSolicitudTables();

  try {
    const body = await request.json();

    if (!body.clienteNombre || !String(body.clienteNombre).trim()) {
      return NextResponse.json({ error: "El nombre del cliente es requerido" }, { status: 400 });
    }

    const equipos: EquipoInput[] = Array.isArray(body.equipos) ? body.equipos : [];
    const vendedorId = body.vendedorId || null;

    const solicitud = await prisma.solicitudCotizacion.create({
      data: {
        clienteNombre: String(body.clienteNombre).trim(),
        fechaEvento: body.fechaEvento ? new Date(body.fechaEvento) : null,
        lugarEvento: body.lugarEvento || null,
        etapa: body.etapa || null,
        tipoEvento: body.tipoEvento || null,
        tipoServicio: body.tipoServicio || null,
        asistentes: body.asistentes ? parseInt(body.asistentes) : null,
        requiereTransporte: Boolean(body.requiereTransporte),
        transporteConcepto: body.requiereTransporte ? (body.transporteConcepto || null) : null,
        llevaDescuento: Boolean(body.llevaDescuento),
        descuentoDetalle: body.llevaDescuento ? (body.descuentoDetalle || null) : null,
        notaEspecial: body.notaEspecial || null,
        sumaComision: Boolean(body.sumaComision),
        entregable: body.entregable || "SOLO_PDF",
        estado: vendedorId ? "ASIGNADA" : "NUEVA",
        vendedorId,
        creadoPorId: session.id,
        equipos: {
          create: equipos
            .filter((e) => (e.categoria || e.equipo))
            .map((e, i) => ({
              categoria: e.categoria || null,
              equipo: e.equipo || null,
              cantidad: e.cantidad ? parseInt(String(e.cantidad)) : 1,
              notas: e.notas || null,
              orden: i,
            })),
        },
      },
      include: { equipos: { orderBy: { orden: "asc" } } },
    });

    return NextResponse.json({ solicitud }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear la solicitud" }, { status: 500 });
  }
}
