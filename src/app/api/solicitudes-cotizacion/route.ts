import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureSolicitudTables } from "@/lib/solicitudes-cotizacion";

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
      id: true, folio: true, clienteNombre: true, contactoTelefono: true,
      fechaEvento: true, lugarEvento: true, tipoEvento: true, tipoServicio: true,
      estado: true, entregable: true, createdAt: true, tratoId: true, clienteId: true,
      vendedor: { select: { id: true, name: true } },
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

    // Resolver cliente: existente (clienteId) o nuevo (clienteNuevo → se da de alta)
    let clienteId: string | null = body.clienteId || null;
    let clienteNombre: string = (body.clienteNombre || "").trim();
    let contactoTelefono: string | null = body.contactoTelefono || null;

    if (body.clienteNuevo && body.clienteNuevo.nombre?.trim()) {
      const c = body.clienteNuevo;
      const nuevo = await prisma.cliente.create({
        data: {
          nombre: c.nombre.trim(),
          empresa: c.empresa || null,
          telefono: c.telefono || null,
          correo: c.correo || null,
          tipoCliente: "POR_DESCUBRIR",
          clasificacion: "NUEVO",
          vendedorId: body.vendedorId || session.id,
        },
        select: { id: true, nombre: true, telefono: true },
      });
      clienteId = nuevo.id;
      clienteNombre = nuevo.nombre;
      if (!contactoTelefono) contactoTelefono = nuevo.telefono;
    } else if (clienteId) {
      const existente = await prisma.cliente.findUnique({
        where: { id: clienteId },
        select: { nombre: true, telefono: true },
      });
      if (existente) {
        if (!clienteNombre) clienteNombre = existente.nombre;
        if (!contactoTelefono) contactoTelefono = existente.telefono;
      }
    }

    if (!clienteNombre) {
      return NextResponse.json({ error: "El nombre del cliente es requerido" }, { status: 400 });
    }

    const vendedorId = body.vendedorId || null;

    const solicitud = await prisma.solicitudCotizacion.create({
      data: {
        clienteNombre,
        contactoTelefono,
        clienteId,
        fechaEvento: body.fechaEvento ? new Date(body.fechaEvento) : null,
        lugarEvento: body.lugarEvento || null,
        etapa: body.etapa || null,
        tipoEvento: body.tipoEvento || null,
        tipoServicio: body.tipoServicio || null,
        asistentes: body.asistentes ? parseInt(body.asistentes) : null,
        equiposDescripcion: body.equiposDescripcion || null,
        requiereTransporte: Boolean(body.requiereTransporte),
        transporteConcepto: body.requiereTransporte ? (body.transporteConcepto || null) : null,
        llevaDescuento: Boolean(body.llevaDescuento),
        descuentoDetalle: body.llevaDescuento ? (body.descuentoDetalle || null) : null,
        notaEspecial: body.notaEspecial || null,
        observaciones: body.observaciones || null,
        sumaComision: Boolean(body.sumaComision),
        entregable: body.entregable || "SOLO_PDF",
        estado: vendedorId ? "ASIGNADA" : "NUEVA",
        vendedorId,
        creadoPorId: session.id,
      },
    });

    return NextResponse.json({ solicitud }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear la solicitud" }, { status: 500 });
  }
}
