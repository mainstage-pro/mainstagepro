import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { HojaEntregaRentaPDF } from "@/components/HojaEntregaRentaPDF";
import React from "react";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      cliente: { select: { nombre: true, empresa: true } },
      equipos: {
        include: {
          equipo: {
            select: {
              descripcion: true,
              marca: true,
              categoria: { select: { nombre: true } },
            },
          },
        },
        orderBy: [{ equipo: { categoriaId: "asc" } }, { id: "asc" }],
      },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const proyectoData = {
    ...proyecto,
    fechaEvento: proyecto.fechaEvento?.toISOString() ?? null,
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(HojaEntregaRentaPDF, { proyecto: proyectoData as any }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="HojaEntrega-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
