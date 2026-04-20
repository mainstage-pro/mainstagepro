import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isTokenExpired } from "@/lib/tokens";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`portal:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "Enlace expirado" }, { status: 410 });

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
      fechaMontaje: true,
      horaInicioMontaje: true,
      lugarEvento: true,
      descripcionGeneral: true,
      notasPortal: true,
      cliente: { select: { nombre: true, empresa: true } },
      encargado: { select: { name: true } },
      personal: {
        where: { confirmado: true },
        select: {
          tecnico: { select: { nombre: true } },
          rolTecnico: { select: { nombre: true } },
        },
      },
      cotizacion: {
        select: {
          id: true,
          numeroCotizacion: true,
          granTotal: true,
          estado: true,
          aprobacionFecha: true,
          lineas: {
            select: {
              tipo: true,
              descripcion: true,
              cantidad: true,
              dias: true,
              esIncluido: true,
            },
            orderBy: { orden: "asc" },
          },
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
