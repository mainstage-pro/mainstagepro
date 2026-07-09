import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureSolicitudTables } from "@/lib/solicitudes-cotizacion";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureSolicitudTables();
  const { id } = await params;

  const solicitud = await prisma.solicitudCotizacion.findUnique({
    where: { id },
    include: {
      equipos: { orderBy: { orden: "asc" } },
      vendedor: { select: { id: true, name: true } },
      creadoPor: { select: { id: true, name: true } },
      trato: { select: { id: true, nombreEvento: true } },
    },
  });

  if (!solicitud) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({ solicitud });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureSolicitudTables();
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};

  if (body.clienteNombre !== undefined) data.clienteNombre = String(body.clienteNombre).trim();
  if (body.fechaEvento !== undefined) data.fechaEvento = body.fechaEvento ? new Date(body.fechaEvento) : null;
  if (body.lugarEvento !== undefined) data.lugarEvento = body.lugarEvento || null;
  if (body.etapa !== undefined) data.etapa = body.etapa || null;
  if (body.tipoEvento !== undefined) data.tipoEvento = body.tipoEvento || null;
  if (body.tipoServicio !== undefined) data.tipoServicio = body.tipoServicio || null;
  if (body.asistentes !== undefined) data.asistentes = body.asistentes ? parseInt(body.asistentes) : null;
  if (body.requiereTransporte !== undefined) data.requiereTransporte = Boolean(body.requiereTransporte);
  if (body.transporteConcepto !== undefined) data.transporteConcepto = body.transporteConcepto || null;
  if (body.llevaDescuento !== undefined) data.llevaDescuento = Boolean(body.llevaDescuento);
  if (body.descuentoDetalle !== undefined) data.descuentoDetalle = body.descuentoDetalle || null;
  if (body.notaEspecial !== undefined) data.notaEspecial = body.notaEspecial || null;
  if (body.sumaComision !== undefined) data.sumaComision = Boolean(body.sumaComision);
  if (body.entregable !== undefined) data.entregable = body.entregable || "SOLO_PDF";
  if (body.estado !== undefined) data.estado = body.estado;

  // Asignar vendedor: si se asigna y la solicitud estaba NUEVA, pasa a ASIGNADA
  if (body.vendedorId !== undefined) {
    data.vendedorId = body.vendedorId || null;
    if (body.estado === undefined) {
      const actual = await prisma.solicitudCotizacion.findUnique({ where: { id }, select: { estado: true } });
      if (body.vendedorId && actual?.estado === "NUEVA") data.estado = "ASIGNADA";
    }
  }

  // Reemplazar líneas de equipos si vienen en el body
  if (Array.isArray(body.equipos)) {
    await prisma.solicitudCotizacionEquipo.deleteMany({ where: { solicitudId: id } });
    data.equipos = {
      create: body.equipos
        .filter((e: { categoria?: string; equipo?: string }) => e.categoria || e.equipo)
        .map((e: { categoria?: string; equipo?: string; cantidad?: number | string; notas?: string }, i: number) => ({
          categoria: e.categoria || null,
          equipo: e.equipo || null,
          cantidad: e.cantidad ? parseInt(String(e.cantidad)) : 1,
          notas: e.notas || null,
          orden: i,
        })),
    };
  }

  const solicitud = await prisma.solicitudCotizacion.update({
    where: { id },
    data,
    include: {
      equipos: { orderBy: { orden: "asc" } },
      vendedor: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ solicitud });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureSolicitudTables();
  const { id } = await params;

  await prisma.solicitudCotizacion.update({ where: { id }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
