import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureSolicitudTables } from "@/lib/solicitudes-cotizacion";

const ENTREGABLE_LABELS: Record<string, string> = {
  PRESENTACION_DESCUENTO: "Presentación descuento ventas",
  SOLO_PDF: "Solo PDF",
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureSolicitudTables();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const solicitud = await prisma.solicitudCotizacion.findUnique({
    where: { id },
    include: { equipos: { orderBy: { orden: "asc" } } },
  });
  if (!solicitud) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (solicitud.tratoId) {
    return NextResponse.json({ error: "Esta solicitud ya fue convertida", tratoId: solicitud.tratoId }, { status: 409 });
  }

  // Cliente: usar el indicado, o reusar por nombre, o crear uno nuevo
  let clienteId: string | undefined = body.clienteId || undefined;
  if (!clienteId) {
    const existente = await prisma.cliente.findFirst({
      where: { nombre: { equals: solicitud.clienteNombre, mode: "insensitive" } },
      select: { id: true },
    });
    if (existente) {
      clienteId = existente.id;
    } else {
      const nuevo = await prisma.cliente.create({
        data: {
          nombre: solicitud.clienteNombre,
          tipoCliente: "POR_DESCUBRIR",
          clasificacion: "NUEVO",
          vendedorId: solicitud.vendedorId || session.id,
        },
        select: { id: true },
      });
      clienteId = nuevo.id;
    }
  }

  // Notas: resumen del brief para que el vendedor tenga todo el contexto
  const lineas: string[] = [`Convertido desde Solicitud de Cotización #${solicitud.folio}.`];
  if (solicitud.equipos.length) {
    lineas.push("", "Equipos a cotizar:");
    for (const e of solicitud.equipos) {
      const cat = e.categoria ? `[${e.categoria}] ` : "";
      const nota = e.notas ? ` — ${e.notas}` : "";
      lineas.push(`• ${cat}${e.equipo || ""} x${e.cantidad}${nota}`);
    }
  }
  if (solicitud.requiereTransporte) lineas.push("", `Transporte: ${solicitud.transporteConcepto || "sí"}`);
  if (solicitud.llevaDescuento) lineas.push(`Descuento: ${solicitud.descuentoDetalle || "sí"}`);
  lineas.push(`Comisión 10%: ${solicitud.sumaComision ? "Sí" : "No"}`);
  lineas.push(`Entregable: ${ENTREGABLE_LABELS[solicitud.entregable] || solicitud.entregable}`);
  if (solicitud.notaEspecial) lineas.push("", `Nota especial: ${solicitud.notaEspecial}`);
  const notas = lineas.join("\n");

  const trato = await prisma.trato.create({
    data: {
      clienteId: clienteId!,
      responsableId: solicitud.vendedorId || session.id,
      vendedorId: solicitud.vendedorId || session.id,
      etapa: solicitud.etapa || "DESCUBRIMIENTO",
      tipoEvento: solicitud.tipoEvento || "OTRO",
      tipoServicio: solicitud.tipoServicio || null,
      tipoLead: "INBOUND",
      origenLead: "ORGANICO",
      origenVenta: "CLIENTE_PROPIO",
      estatusContacto: "PENDIENTE",
      clasificacion: "PROSPECTO",
      lugarEstimado: solicitud.lugarEvento || null,
      asistentesEstimados: solicitud.asistentes || null,
      fechaEventoEstimada: solicitud.fechaEvento || null,
      notas,
    },
    select: { id: true },
  });

  const actualizada = await prisma.solicitudCotizacion.update({
    where: { id },
    data: { estado: "CONVERTIDA", tratoId: trato.id },
    select: { id: true, estado: true, tratoId: true },
  });

  return NextResponse.json({ trato, solicitud: actualizada }, { status: 201 });
}
