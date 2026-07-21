import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSolicitudTables } from "@/lib/solicitudes-cotizacion";

// Endpoint PÚBLICO (sin auth) para grabar una solicitud de cotización desde el
// cotizador público de /presentacion/inventario. Entra como NUEVA sin vendedor.
export async function POST(request: NextRequest) {
  try {
    await ensureSolicitudTables();

    const body = await request.json();

    const clienteNombre = (body.clienteNombre || "").trim();
    if (!clienteNombre) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const asistentes = (() => {
      const n = parseInt(String(body.asistentes ?? "").replace(/[^\d]/g, ""), 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    })();

    const fechaEvento = (() => {
      if (!body.fechaEvento) return null;
      const d = new Date(body.fechaEvento);
      return isNaN(d.getTime()) ? null : d;
    })();

    const solicitud = await prisma.solicitudCotizacion.create({
      data: {
        clienteNombre,
        contactoTelefono: body.contactoTelefono?.trim() || null,
        fechaEvento,
        lugarEvento: body.lugarEvento?.trim() || null,
        tipoEvento: body.tipoEvento?.trim() || null,
        asistentes,
        equiposDescripcion: body.equiposDescripcion?.trim() || null,
        notaEspecial: body.notaEspecial?.trim() || null,
        observaciones: "Solicitud desde cotizador público (/presentacion/inventario)",
        estado: "NUEVA",
      },
      select: { id: true, folio: true },
    });

    return NextResponse.json({ ok: true, folio: solicitud.folio }, { status: 201 });
  } catch (error) {
    console.error("solicitar-publico:", error);
    // No bloqueamos al cliente: WhatsApp sigue funcionando aunque falle el guardado.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
