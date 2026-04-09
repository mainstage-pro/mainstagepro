import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/evaluacion-cliente/[token] — obtener datos del formulario (sin auth, público)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
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
  const { token } = await params;

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

  const data: Record<string, unknown> = { respondida: true, respondidaEn: new Date() };
  for (const c of campos) {
    if (c in body) data[c] = body[c] || null;
  }

  // Calcular promedio de los criterios numéricos (1-10)
  const numericos = ["satisfaccionGeneral", "calidadServicio", "puntualidad", "atencionEquipo", "claridadComunicacion", "relacionCalidadPrecio"];
  const vals = numericos.map(k => body[k] ? parseInt(body[k]) : 0).filter(v => v > 0);
  if (vals.length > 0) {
    data.promedioCalculado = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  const updated = await prisma.evaluacionCliente.update({
    where: { tokenAcceso: token },
    data,
  });

  return NextResponse.json({ evaluacion: updated });
}
