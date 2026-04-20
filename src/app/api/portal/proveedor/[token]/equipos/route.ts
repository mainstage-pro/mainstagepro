import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isTokenExpired } from "@/lib/tokens";

// POST — agregar equipo desde el portal público
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`proveedor-equipo:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "Enlace expirado" }, { status: 410 });

  const proveedor = await prisma.proveedor.findUnique({
    where: { portalToken: token },
    select: { id: true },
  });
  if (!proveedor) return NextResponse.json({ error: "Link inválido" }, { status: 404 });

  const body = await req.json();
  const {
    categoria, descripcion, marca, modelo, anioFabricacion,
    cantidad,
    potenciaW, voltaje, amperaje, pesoKg, dimensiones, incluyeCase, tiempoSetupMin,
    precioPublico, precioMainstage,
    notas, fotosUrls, fichaTecnicaUrl,
  } = body;

  if (!descripcion?.trim()) return NextResponse.json({ error: "La descripción es requerida" }, { status: 400 });

  const parsedAnio = anioFabricacion ? parseInt(anioFabricacion) : null;
  const currentYear = new Date().getFullYear();
  if (parsedAnio !== null && (parsedAnio < 1900 || parsedAnio > currentYear + 1)) {
    return NextResponse.json({ error: "Año de fabricación inválido" }, { status: 400 });
  }

  const parsedPrecioPublico = precioPublico ? parseFloat(precioPublico) : null;
  const parsedPrecioMainstage = precioMainstage ? parseFloat(precioMainstage) : null;
  if (parsedPrecioPublico !== null && parsedPrecioPublico < 0) {
    return NextResponse.json({ error: "El precio público no puede ser negativo" }, { status: 400 });
  }
  if (parsedPrecioMainstage !== null && parsedPrecioMainstage < 0) {
    return NextResponse.json({ error: "El precio Mainstage no puede ser negativo" }, { status: 400 });
  }

  const equipo = await prisma.equipoProveedor.create({
    data: {
      proveedorId: proveedor.id,
      categoria: categoria || "OTRO",
      descripcion: descripcion.trim(),
      marca: marca || null,
      modelo: modelo || null,
      anioFabricacion: parsedAnio,
      cantidad: Math.max(1, parseInt(cantidad) || 1),
      potenciaW: potenciaW ? parseFloat(potenciaW) : null,
      voltaje: voltaje || null,
      amperaje: amperaje ? parseFloat(amperaje) : null,
      pesoKg: pesoKg ? parseFloat(pesoKg) : null,
      dimensiones: dimensiones || null,
      incluyeCase: !!incluyeCase,
      tiempoSetupMin: tiempoSetupMin ? parseInt(tiempoSetupMin) : null,
      precioPublico: parsedPrecioPublico,
      precioMainstage: parsedPrecioMainstage,
      notas: notas || null,
      fotosUrls: fotosUrls || null,
      fichaTecnicaUrl: fichaTecnicaUrl || null,
    },
  });

  return NextResponse.json({ equipo }, { status: 201 });
}
