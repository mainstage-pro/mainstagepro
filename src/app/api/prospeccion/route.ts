import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);

    const tipo          = searchParams.get("tipo");
    const etapa         = searchParams.get("etapa");
    const estado        = searchParams.get("estado");
    const tipoEvento    = searchParams.get("tipoEvento");
    const responsableId = searchParams.get("responsableId");
    const q             = searchParams.get("q")?.trim() || null;
    const showAll       = searchParams.get("showAll") === "true";

    const where: Record<string, unknown> = {};

    if (tipo)          where.tipo          = tipo;
    if (etapa)         where.etapa         = etapa;
    if (estado)        where.estado        = estado;
    if (tipoEvento)    where.tipoEvento    = tipoEvento;
    if (responsableId) where.responsableId = responsableId;

    if (!showAll && !estado) {
      where.estado = { notIn: ["CONVERTIDO", "CANCELADO"] };
    }

    if (q) {
      where.cliente = {
        nombre: { contains: q, mode: "insensitive" },
      };
    }

    const prospecciones = await prisma.prospeccion.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            empresa: true,
            telefono: true,
            correo: true,
            tipoCliente: true,
          },
        },
        responsable: {
          select: { id: true, name: true },
        },
        trato: {
          select: { id: true, etapa: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ prospecciones, total: prospecciones.length });
  } catch (error) {
    console.error("[GET /api/prospeccion]", error);
    return NextResponse.json({ error: "Error al obtener prospecciones" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();

    const {
      clienteId: bodyClienteId,
      nombre,
      telefono,
      correo,
      empresa,
      tipo,
      tipoEvento,
      origen,
      responsableId,
      etapa,
      notas,
      fechaProximoContacto,
    } = body;

    if (!tipo) {
      return NextResponse.json({ error: "El campo 'tipo' es requerido" }, { status: 400 });
    }
    if (!tipoEvento) {
      return NextResponse.json({ error: "El campo 'tipoEvento' es requerido" }, { status: 400 });
    }
    if (!origen) {
      return NextResponse.json({ error: "El campo 'origen' es requerido" }, { status: 400 });
    }

    let clienteId: string;

    if (bodyClienteId) {
      clienteId = bodyClienteId;
    } else if (nombre) {
      const nuevoCliente = await prisma.cliente.create({
        data: {
          nombre,
          telefono:   telefono   || null,
          correo:     correo     || null,
          empresa:    empresa    || null,
          tipoCliente: "POR_DESCUBRIR",
          esProspecto: true,
        },
      });
      clienteId = nuevoCliente.id;
    } else {
      return NextResponse.json(
        { error: "Se requiere clienteId o nombre para crear un cliente nuevo" },
        { status: 400 }
      );
    }

    const prospeccion = await prisma.prospeccion.create({
      data: {
        clienteId,
        tipo,
        tipoEvento,
        origen,
        responsableId:        responsableId        || null,
        etapa:                etapa                || "SIN_ETAPA",
        estado:               "ACTIVO",
        notas:                notas                || null,
        fechaProximoContacto: fechaProximoContacto ? new Date(fechaProximoContacto) : null,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            empresa: true,
            telefono: true,
            correo: true,
            tipoCliente: true,
          },
        },
        responsable: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ prospeccion }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/prospeccion]", error);
    return NextResponse.json({ error: "Error al crear prospeccion" }, { status: 500 });
  }
}
