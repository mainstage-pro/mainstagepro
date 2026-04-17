import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST — agregar equipo desde el portal público
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

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

  const equipo = await prisma.equipoProveedor.create({
    data: {
      proveedorId: proveedor.id,
      categoria: categoria || "OTRO",
      descripcion: descripcion.trim(),
      marca: marca || null,
      modelo: modelo || null,
      anioFabricacion: anioFabricacion ? parseInt(anioFabricacion) : null,
      cantidad: parseInt(cantidad) || 1,
      potenciaW: potenciaW ? parseFloat(potenciaW) : null,
      voltaje: voltaje || null,
      amperaje: amperaje ? parseFloat(amperaje) : null,
      pesoKg: pesoKg ? parseFloat(pesoKg) : null,
      dimensiones: dimensiones || null,
      incluyeCase: !!incluyeCase,
      tiempoSetupMin: tiempoSetupMin ? parseInt(tiempoSetupMin) : null,
      precioPublico: precioPublico ? parseFloat(precioPublico) : null,
      precioMainstage: precioMainstage ? parseFloat(precioMainstage) : null,
      notas: notas || null,
      fotosUrls: fotosUrls || null,
      fichaTecnicaUrl: fichaTecnicaUrl || null,
    },
  });

  return NextResponse.json({ equipo }, { status: 201 });
}
