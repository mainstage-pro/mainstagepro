import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const responsableId = searchParams.get("responsableId");

  const where: Record<string, unknown> = {};
  if (responsableId) where.responsableId = responsableId;
  // Vendedores (área VENTAS) solo ven sus propios tratos
  if (session.role !== "ADMIN" && (session as { area?: string }).area === "VENTAS") where.responsableId = session.id;

  const tratos = await prisma.trato.findMany({
    where,
    select: {
      id: true, etapa: true, tipoEvento: true, nombreEvento: true,
      fechaEventoEstimada: true, presupuestoEstimado: true, lugarEstimado: true,
      origenLead: true, fechaProximaAccion: true, createdAt: true,
      cliente: { select: { id: true, nombre: true, empresa: true, telefono: true } },
      responsable: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tratos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();

    // Si viene clienteNuevo, crearlo primero
    let clienteId = body.clienteId;
    if (!clienteId && body.clienteNuevo) {
      const c = body.clienteNuevo;
      const cliente = await prisma.cliente.create({
        data: {
          nombre: c.nombre,
          empresa: c.empresa || null,
          tipoCliente: c.tipoCliente || "POR_DESCUBRIR",
          clasificacion: c.clasificacion || "NUEVO",
          telefono: c.telefono || null,
          correo: c.correo || null,
        },
      });
      clienteId = cliente.id;
    }

    if (!clienteId) {
      return NextResponse.json({ error: "Cliente requerido" }, { status: 400 });
    }

    const trato = await prisma.trato.create({
      data: {
        clienteId,
        responsableId: body.responsableId || session.id,
        tipoEvento: body.tipoEvento || "OTRO",
        tipoLead: body.tipoLead || "INBOUND",
        origenLead: body.origenLead || "ORGANICO",
        origenVenta: body.origenVenta || "CLIENTE_PROPIO",
        vendedorOrigenId: body.vendedorOrigenId || null,
        estatusContacto: "PENDIENTE",
        etapa: "DESCUBRIMIENTO",
        clasificacion: body.clasificacion || "PROSPECTO",
        tipoServicio: body.tipoServicio || null,
        tipoProspecto: body.tipoProspecto || "ACTIVO",
        canalAtencion: body.canalAtencion || null,
        rutaEntrada: body.rutaEntrada || "DESCUBRIR",
        etapaContratacion: body.etapaContratacion || null,
        nombreEvento: body.nombreEvento || null,
        lugarEstimado: body.lugarEstimado || null,
        asistentesEstimados: body.asistentesEstimados ? parseInt(body.asistentesEstimados) : null,
        fechaEventoEstimada: body.fechaEventoEstimada ? new Date(body.fechaEventoEstimada) : null,
        presupuestoEstimado: body.presupuestoEstimado ? parseFloat(body.presupuestoEstimado) : null,
        notas: body.notas || null,
        proximaAccion: body.proximaAccion || null,
        fechaProximaAccion: body.fechaProximaAccion ? new Date(body.fechaProximaAccion) : null,
      },
    });

    // Si la clasificación cambió respecto al cliente actual, actualizarla
    if (body.clasificacion && body.clasificacionOriginal !== body.clasificacion) {
      await prisma.cliente.update({
        where: { id: clienteId },
        data: { clasificacion: body.clasificacion },
      });
    }

    return NextResponse.json({ trato });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear trato" }, { status: 500 });
  }
}
