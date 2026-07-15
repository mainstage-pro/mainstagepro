import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PUT — editar plantilla (solo la plantilla; nunca la cotización original)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { nombre, descripcion, tipoEvento, tipoServicio, lineas, ...campos } = body;

  try {
    await prisma.plantillaCotizacion.update({
      where: { id },
      data: {
        ...(nombre !== undefined ? { nombre } : {}),
        descripcion: descripcion ?? null,
        tipoEvento: tipoEvento ?? null,
        tipoServicio: tipoServicio ?? null,
        ...(campos.diasEquipo !== undefined ? { diasEquipo: campos.diasEquipo } : {}),
        ...(campos.diasOperacion !== undefined ? { diasOperacion: campos.diasOperacion } : {}),
        ...(campos.diasTransporte !== undefined ? { diasTransporte: campos.diasTransporte } : {}),
        ...(campos.diasHospedaje !== undefined ? { diasHospedaje: campos.diasHospedaje } : {}),
        ...(campos.diasComidas !== undefined ? { diasComidas: campos.diasComidas } : {}),
        observaciones: campos.observaciones ?? null,
        ...(campos.vigenciaDias !== undefined ? { vigenciaDias: campos.vigenciaDias } : {}),
        ...(campos.aplicaIva !== undefined ? { aplicaIva: campos.aplicaIva } : {}),
      },
    });

    // Reemplazar líneas si vienen en el payload
    if (Array.isArray(lineas)) {
      await prisma.plantillaCotizacionLinea.deleteMany({ where: { plantillaId: id } });
      if (lineas.length > 0) {
        await prisma.plantillaCotizacionLinea.createMany({
          data: lineas.map((l, i: number) => {
            const cantidad = Number(l.cantidad) || 0;
            const dias = Number(l.dias) || 0;
            const precioUnitario = Number(l.precioUnitario) || 0;
            return {
              plantillaId: id,
              tipo: l.tipo ?? "OTRO",
              equipoId: l.equipoId ?? null,
              rolTecnicoId: l.rolTecnicoId ?? null,
              descripcion: l.descripcion ?? "",
              marca: l.marca ?? null,
              modelo: l.modelo ?? null,
              nivel: l.nivel ?? null,
              jornada: l.jornada ?? null,
              esExterno: l.esExterno ?? false,
              cantidad,
              dias,
              precioUnitario,
              costoUnitario: Number(l.costoUnitario) || 0,
              subtotal: l.esIncluido ? 0 : precioUnitario * cantidad * dias,
              esIncluido: l.esIncluido ?? false,
              notas: l.notas ?? null,
              orden: i,
            };
          }),
        });
      }
    }

    const plantilla = await prisma.plantillaCotizacion.findUnique({
      where: { id },
      include: { lineas: { orderBy: { orden: "asc" } } },
    });
    return NextResponse.json({ plantilla });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE — archivar plantilla
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  try {
    await prisma.plantillaCotizacion.update({ where: { id }, data: { activo: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
