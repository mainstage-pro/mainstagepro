import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { VehiculoPDF } from "@/components/VehiculoPDF";
import React from "react";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const vehiculo = await prisma.vehiculo.findUnique({
    where: { id },
    include: { mantenimientos: { orderBy: { fecha: "desc" } } },
  });

  if (!vehiculo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const totalCosto = vehiculo.mantenimientos.reduce((sum, m) => sum + (m.costo ?? 0), 0);

  const pdfData = {
    nombre: vehiculo.nombre,
    marca: vehiculo.marca,
    modelo: vehiculo.modelo,
    anio: vehiculo.anio,
    placas: vehiculo.placas,
    color: vehiculo.color,
    kilometraje: vehiculo.kilometraje,
    proximoServicioKm: vehiculo.proximoServicioKm,
    proximoServicioFecha: vehiculo.proximoServicioFecha ? vehiculo.proximoServicioFecha.toISOString() : null,
    notas: vehiculo.notas,
    totalCosto,
    mantenimientos: vehiculo.mantenimientos.map(m => ({
      id: m.id,
      fecha: m.fecha.toISOString(),
      km: m.km,
      tipoRegistro: m.tipoRegistro,
      servicio: m.servicio,
      aceite: m.aceite,
      anticongelante: m.anticongelante,
      estadoLlantas: m.estadoLlantas,
      proximoKm: m.proximoKm,
      proximaFecha: m.proximaFecha ? m.proximaFecha.toISOString() : null,
      estatus: m.estatus,
      costo: m.costo,
      comentarios: m.comentarios,
    })),
    generadoEn: new Date().toISOString(),
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(VehiculoPDF, { data: pdfData }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const slug = vehiculo.nombre.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "vehiculo";
  const fecha = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Vehiculo-${slug}-${fecha}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
