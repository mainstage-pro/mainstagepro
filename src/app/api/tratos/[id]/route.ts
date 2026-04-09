import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const trato = await prisma.trato.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true, tipoCliente: true, clasificacion: true, telefono: true, correo: true } },
      responsable: { select: { id: true, name: true } },
      vendedorOrigen: { select: { id: true, name: true } },
      cotizaciones: {
        select: { id: true, numeroCotizacion: true, estado: true, granTotal: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      archivos: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!trato) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ trato });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "etapa", "estatusContacto", "tipoEvento", "tipoServicio", "lugarEstimado",
    "fechaEventoEstimada", "presupuestoEstimado", "clasificacion", "notas",
    "proximaAccion", "fechaProximaAccion", "motivoPerdida", "origenLead", "tipoLead",
    "origenVenta", "vendedorOrigenId", "responsableId",
    // Descubrimiento
    "canalAtencion", "nombreEvento", "duracionEvento", "asistentesEstimados",
    "serviciosInteres", "ideasReferencias", "etapaContratacion", "continuarPor",
    "descubrimientoCompleto",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if ((key === "fechaEventoEstimada" || key === "fechaProximaAccion") && body[key]) {
        data[key] = new Date(body[key]);
      } else if (key === "presupuestoEstimado" && body[key] !== null && body[key] !== "") {
        data[key] = parseFloat(body[key]);
      } else if (key === "asistentesEstimados" && body[key] !== null && body[key] !== "") {
        data[key] = parseInt(body[key]);
      } else if (key === "descubrimientoCompleto") {
        data[key] = Boolean(body[key]);
      } else {
        data[key] = body[key] || null;
      }
    }
  }

  // Auto-set fechaCierre cuando etapa cambia a VENTA_CERRADA
  if (body.etapa === "VENTA_CERRADA" && !data.fechaCierre) {
    const current = await prisma.trato.findUnique({ where: { id }, select: { etapa: true, fechaCierre: true } });
    if (current && current.etapa !== "VENTA_CERRADA" && !current.fechaCierre) {
      data.fechaCierre = new Date();
    }
  }

  const trato = await prisma.trato.update({ where: { id }, data });
  return NextResponse.json({ trato });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.trato.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
