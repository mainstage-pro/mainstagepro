import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isTokenExpired } from "@/lib/tokens";

// GET /api/evaluacion-cliente/[token] — obtener datos del formulario (sin auth, público)
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`eval:get:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  const { token } = await params;

  const evaluacion = await prisma.evaluacionCliente.findUnique({
    where: { tokenAcceso: token },
    include: {
      proyecto: {
        select: { nombre: true, fechaEvento: true, cliente: { select: { nombre: true } } },
      },
    },
  });

  if (!evaluacion) return NextResponse.json({ error: "Enlace inválido o expirado" }, { status: 404 });

  return NextResponse.json({ evaluacion });
}

// PATCH /api/evaluacion-cliente/[token] — guardar respuesta del cliente (sin auth, público)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`eval:patch:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "Enlace expirado" }, { status: 410 });

  const evaluacion = await prisma.evaluacionCliente.findUnique({
    where: { tokenAcceso: token },
  });

  if (!evaluacion) return NextResponse.json({ error: "Enlace inválido" }, { status: 404 });
  if (evaluacion.respondida) return NextResponse.json({ error: "Ya fue respondida" }, { status: 409 });

  const body = await req.json();

  const campos = [
    "satisfaccionGeneral", "calidadServicio", "puntualidad",
    "atencionEquipo", "claridadComunicacion", "relacionCalidadPrecio",
    "probabilidadRecontratacion", "loMejor", "loMejorable", "comentarioAdicional",
  ];

  const numericCampos = new Set(["satisfaccionGeneral", "calidadServicio", "puntualidad", "atencionEquipo", "claridadComunicacion", "relacionCalidadPrecio", "probabilidadRecontratacion"]);

  const data: Record<string, unknown> = { respondida: true, respondidaEn: new Date() };
  for (const c of campos) {
    if (!(c in body)) continue;
    if (numericCampos.has(c)) {
      const v = parseInt(body[c]);
      if (isNaN(v) || v < 1 || v > 10) return NextResponse.json({ error: `Campo ${c} debe ser un número entre 1 y 10` }, { status: 400 });
      data[c] = v;
    } else {
      data[c] = body[c] || null;
    }
  }

  // Calcular promedio de los criterios numéricos (1-10)
  const numericos = ["satisfaccionGeneral", "calidadServicio", "puntualidad", "atencionEquipo", "claridadComunicacion", "relacionCalidadPrecio"];
  const vals = numericos.map(k => typeof data[k] === "number" ? data[k] as number : 0).filter(v => v > 0);
  if (vals.length > 0) {
    data.promedioCalculado = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  const updated = await prisma.evaluacionCliente.update({
    where: { tokenAcceso: token },
    data,
  });

  return NextResponse.json({ evaluacion: updated });
}
