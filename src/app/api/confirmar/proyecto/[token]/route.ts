import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isTokenExpired } from "@/lib/tokens";

// Campos que el cliente puede confirmar/completar desde el resumen del proyecto.
const CAMPOS_TEXTO = [
  "lugarEvento",
  "direccionVenue",
  "linkMaps",
  "indicacionesAcceso",
  "horaInicioEvento",
  "horaFinEvento",
  "encargadoCliente",
  "encargadoClienteContacto",
  "encargadoLugar",
  "encargadoLugarContacto",
] as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`confirmar-proyecto:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "Enlace expirado" }, { status: 410 });

  const proyecto = await prisma.proyecto.findUnique({
    where: { infoToken: token },
    select: {
      nombre: true,
      numeroProyecto: true,
      fechaEvento: true,
      lugarEvento: true,
      direccionVenue: true,
      linkMaps: true,
      indicacionesAcceso: true,
      horaInicioEvento: true,
      horaFinEvento: true,
      encargadoCliente: true,
      encargadoClienteContacto: true,
      encargadoLugar: true,
      encargadoLugarContacto: true,
      infoRecibidoEn: true,
      cliente: { select: { nombre: true, empresa: true } },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "Enlace no encontrado" }, { status: 404 });

  return NextResponse.json({ proyecto });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`confirmar-proyecto:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "Enlace expirado" }, { status: 410 });

  const proyecto = await prisma.proyecto.findUnique({
    where: { infoToken: token },
    select: { id: true },
  });
  if (!proyecto) return NextResponse.json({ error: "Enlace no encontrado" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  for (const key of CAMPOS_TEXTO) {
    if (key in body) {
      const val = typeof body[key] === "string" ? body[key].trim() : body[key];
      data[key] = val === "" || val == null ? null : val;
    }
  }

  if ("fechaEvento" in body) {
    const raw = typeof body.fechaEvento === "string" ? body.fechaEvento.trim() : "";
    if (raw) data.fechaEvento = new Date(raw.substring(0, 10) + "T12:00:00Z");
  }

  data.infoRecibidoEn = new Date();

  await prisma.proyecto.update({ where: { id: proyecto.id }, data });

  return NextResponse.json({ ok: true });
}
