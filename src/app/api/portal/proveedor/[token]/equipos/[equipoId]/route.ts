import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Verificar que el token corresponde al proveedor dueño del equipo
async function verify(token: string, equipoId: string) {
  const proveedor = await prisma.proveedor.findUnique({
    where: { portalToken: token },
    select: { id: true },
  });
  if (!proveedor) return null;
  const equipo = await prisma.equipoProveedor.findUnique({
    where: { id: equipoId, proveedorId: proveedor.id },
  });
  return equipo ? proveedor : null;
}

// PATCH — editar equipo
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string; equipoId: string }> }) {
  const { token, equipoId } = await params;
  const proveedor = await verify(token, equipoId);
  if (!proveedor) return NextResponse.json({ error: "No autorizado o no encontrado" }, { status: 404 });

  const body = await req.json();
  const {
    categoria, descripcion, marca, modelo, serialNum, anioFabricacion,
    cantidad, condicion, disponibilidad,
    potenciaW, voltaje, amperaje, pesoKg, dimensiones, incluyeCase, tiempoSetupMin,
    precioDia, precioEventoFull, precioMinimoEvent,
    notas, fotosUrls, fichaTecnicaUrl,
  } = body;

  const equipo = await prisma.equipoProveedor.update({
    where: { id: equipoId },
    data: {
      ...(categoria !== undefined && { categoria }),
      ...(descripcion !== undefined && { descripcion }),
      ...(marca !== undefined && { marca: marca || null }),
      ...(modelo !== undefined && { modelo: modelo || null }),
      ...(serialNum !== undefined && { serialNum: serialNum || null }),
      ...(anioFabricacion !== undefined && { anioFabricacion: anioFabricacion ? parseInt(anioFabricacion) : null }),
      ...(cantidad !== undefined && { cantidad: parseInt(cantidad) || 1 }),
      ...(condicion !== undefined && { condicion }),
      ...(disponibilidad !== undefined && { disponibilidad }),
      ...(potenciaW !== undefined && { potenciaW: potenciaW ? parseFloat(potenciaW) : null }),
      ...(voltaje !== undefined && { voltaje: voltaje || null }),
      ...(amperaje !== undefined && { amperaje: amperaje ? parseFloat(amperaje) : null }),
      ...(pesoKg !== undefined && { pesoKg: pesoKg ? parseFloat(pesoKg) : null }),
      ...(dimensiones !== undefined && { dimensiones: dimensiones || null }),
      ...(incluyeCase !== undefined && { incluyeCase: !!incluyeCase }),
      ...(tiempoSetupMin !== undefined && { tiempoSetupMin: tiempoSetupMin ? parseInt(tiempoSetupMin) : null }),
      ...(precioDia !== undefined && { precioDia: precioDia ? parseFloat(precioDia) : null }),
      ...(precioEventoFull !== undefined && { precioEventoFull: precioEventoFull ? parseFloat(precioEventoFull) : null }),
      ...(precioMinimoEvent !== undefined && { precioMinimoEvent: precioMinimoEvent ? parseFloat(precioMinimoEvent) : null }),
      ...(notas !== undefined && { notas: notas || null }),
      ...(fotosUrls !== undefined && { fotosUrls: fotosUrls || null }),
      ...(fichaTecnicaUrl !== undefined && { fichaTecnicaUrl: fichaTecnicaUrl || null }),
    },
  });
  return NextResponse.json({ equipo });
}

// DELETE — eliminar equipo
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ token: string; equipoId: string }> }) {
  const { token, equipoId } = await params;
  const proveedor = await verify(token, equipoId);
  if (!proveedor) return NextResponse.json({ error: "No autorizado o no encontrado" }, { status: 404 });

  await prisma.equipoProveedor.delete({ where: { id: equipoId } });
  return NextResponse.json({ ok: true });
}
