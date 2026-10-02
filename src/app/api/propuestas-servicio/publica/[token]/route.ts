import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isTokenExpired } from "@/lib/tokens";

// Portal público de la propuesta de servicios. Sin auth: el token es la llave.
// El `select` es a mano y a propósito — costoUnitario, costoEstimado y
// notasInternas NUNCA salen de aquí.
const SELECT_PUBLICO = {
  numero: true,
  version: true,
  titulo: true,
  estado: true,
  modeloCobro: true,
  moneda: true,
  vigenciaHasta: true,
  alcance: true,
  exclusiones: true,
  supuestos: true,
  condicionesPago: true,
  aplicaIva: true,
  subtotalHonorarios: true,
  subtotalEquipo: true,
  subtotalLogistica: true,
  subtotalReembolsables: true,
  descuentoMonto: true,
  descuentoRazon: true,
  subtotal: true,
  montoIva: true,
  granTotal: true,
  aprobacionFecha: true,
  aprobacionNombre: true,
  enviadaEn: true,
  createdAt: true,
  cliente: { select: { nombre: true, empresa: true } },
  artista: { select: { nombre: true, logoUrl: true } },
  gira: {
    select: {
      nombre: true,
      fechaInicio: true,
      fechaFin: true,
      shows: {
        select: { id: true, fecha: true, ciudad: true, estado: true, venue: { select: { nombre: true } } },
        orderBy: { fecha: "asc" as const },
      },
    },
  },
  lineas: {
    select: {
      id: true,
      tipo: true,
      concepto: true,
      descripcion: true,
      unidad: true,
      cantidad: true,
      precioUnitario: true,
      subtotal: true,
      esIncluido: true,
      esReembolsable: true,
      servicio: { select: { entregables: true, incluye: true, noIncluye: true } },
      show: { select: { fecha: true, ciudad: true } },
    },
    orderBy: [{ orden: "asc" as const }, { createdAt: "asc" as const }],
  },
};

// GET: la propuesta, lista para que el cliente la lea
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`propuesta:get:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const { token } = await params;
  if (isTokenExpired(token)) {
    return NextResponse.json({ error: "Link no válido o expirado" }, { status: 410 });
  }

  const propuesta = await prisma.propuestaServicio.findUnique({
    where: { aprobacionToken: token },
    select: SELECT_PUBLICO,
  });

  if (!propuesta) return NextResponse.json({ error: "Link no válido o expirado" }, { status: 404 });

  return NextResponse.json({ propuesta });
}

// POST: el cliente aprueba escribiendo su nombre
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`propuesta:post:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "Link expirado" }, { status: 410 });

  const body = await req.json().catch(() => ({}));
  const nombre = (body.nombre as string | undefined)?.trim() || null;
  if (!nombre || nombre.length < 2 || nombre.length > 100) {
    return NextResponse.json({ error: "Nombre requerido (2–100 caracteres)" }, { status: 400 });
  }

  const propuesta = await prisma.propuestaServicio.findUnique({
    where: { aprobacionToken: token },
    select: { id: true, estado: true },
  });
  if (!propuesta) return NextResponse.json({ error: "Link no válido" }, { status: 404 });
  if (propuesta.estado === "APROBADA") return NextResponse.json({ ok: true, yaAprobada: true });
  if (propuesta.estado === "RECHAZADA") {
    return NextResponse.json({ error: "Esta propuesta ya fue cerrada" }, { status: 400 });
  }

  await prisma.propuestaServicio.update({
    where: { id: propuesta.id },
    data: { estado: "APROBADA", aprobacionFecha: new Date(), aprobacionNombre: nombre },
  });

  return NextResponse.json({ ok: true });
}
