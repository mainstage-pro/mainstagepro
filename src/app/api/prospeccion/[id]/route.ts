import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;

    const prospeccion = await prisma.prospeccion.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            empresa: true,
            empresaId: true,
            telefono: true,
            correo: true,
            tipoCliente: true,
            clasificacion: true,
          },
        },
        responsable: {
          select: { id: true, name: true },
        },
        trato: {
          select: {
            id: true,
            etapa: true,
            nombreEvento: true,
            createdAt: true,
          },
        },
      },
    });

    if (!prospeccion) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    return NextResponse.json({ prospeccion });
  } catch (error) {
    console.error("[GET /api/prospeccion/[id]]", error);
    return NextResponse.json({ error: "Error al obtener prospeccion" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    const scalarAllowed = [
      "etapa",
      "estado",
      "tipoEvento",
      "origen",
      "notas",
      "responsableId",
      "tipoServicioInteres",
      "lugarEstimado",
      "notasEvento",
    ];

    const dateFields = [
      "fechaProximoContacto",
      "fechaEventoEstimada",
      "contacto1Fecha",
      "contacto2Fecha",
      "contacto3Fecha",
      "contacto4Fecha",
      "contacto5Fecha",
    ];

    const boolFields = [
      "contacto1Hecho",
      "contacto2Hecho",
      "contacto3Hecho",
      "contacto4Hecho",
      "contacto5Hecho",
    ];

    const stringContactoFields = [
      "contacto1Nota",
      "contacto2Nota",
      "contacto3Nota",
      "contacto4Nota",
      "contacto5Nota",
    ];

    const data: Record<string, unknown> = {};

    for (const key of scalarAllowed) {
      if (key in body) {
        data[key] = body[key] !== undefined && body[key] !== "" ? body[key] : null;
      }
    }

    for (const key of dateFields) {
      if (key in body) {
        data[key] = body[key] ? new Date(body[key]) : null;
      }
    }

    for (const key of boolFields) {
      if (key in body) {
        data[key] = Boolean(body[key]);
      }
    }

    for (const key of stringContactoFields) {
      if (key in body) {
        data[key] = body[key] || null;
      }
    }

    if ("presupuestoAprox" in body) {
      data.presupuestoAprox =
        body.presupuestoAprox !== null && body.presupuestoAprox !== ""
          ? parseFloat(body.presupuestoAprox)
          : null;
    }

    const prospeccion = await prisma.prospeccion.update({
      where: { id },
      data,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            empresa: true,
            empresaId: true,
            telefono: true,
            correo: true,
            tipoCliente: true,
            clasificacion: true,
          },
        },
        responsable: {
          select: { id: true, name: true },
        },
        trato: {
          select: {
            id: true,
            etapa: true,
            nombreEvento: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ prospeccion });
  } catch (error) {
    console.error("[PATCH /api/prospeccion/[id]]", error);
    return NextResponse.json({ error: "Error al actualizar prospeccion" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;

    const prospeccion = await prisma.prospeccion.findUnique({
      where: { id },
      select: { id: true, estado: true },
    });

    if (!prospeccion) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    if (!["SIN_ETAPA", "CANCELADO"].includes(prospeccion.estado)) {
      return NextResponse.json(
        {
          error:
            "Solo se pueden eliminar prospecciones con estado SIN_ETAPA o CANCELADO",
        },
        { status: 409 }
      );
    }

    await prisma.prospeccion.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/prospeccion/[id]]", error);
    return NextResponse.json({ error: "Error al eliminar prospeccion" }, { status: 500 });
  }
}
