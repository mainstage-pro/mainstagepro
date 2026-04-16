import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { portalToken: token },
    select: {
      id: true,
      nombre: true,
      numeroProyecto: true,
      estado: true,
      tipoEvento: true,
      fechaEvento: true,
      horaInicioEvento: true,
      horaFinEvento: true,
      lugarEvento: true,
      descripcionGeneral: true,
      cliente: { select: { nombre: true, empresa: true, telefono: true, correo: true } },
      personal: {
        where: { confirmado: true },
        select: {
          tecnico: { select: { nombre: true } },
          rolTecnico: { select: { nombre: true } },
        },
      },
      cotizacion: {
        select: {
          numeroCotizacion: true,
          granTotal: true,
          estado: true,
        },
      },
      cuentasCobrar: {
        select: {
          concepto: true,
          monto: true,
          montoCobrado: true,
          estado: true,
          fechaCompromiso: true,
          tipoPago: true,
        },
        orderBy: { fechaCompromiso: "asc" },
      },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "Portal no encontrado" }, { status: 404 });

  return NextResponse.json({ proyecto });
}
