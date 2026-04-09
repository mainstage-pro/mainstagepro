import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { FichaTecnicaPDF } from "@/components/FichaTecnicaPDF";
import React from "react";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      cliente: { select: { nombre: true, empresa: true, telefono: true, correo: true } },
      encargado: { select: { name: true } },
      cotizacion: { select: { numeroCotizacion: true, granTotal: true } },
      personal: {
        include: {
          tecnico: { include: { rol: { select: { nombre: true } } } },
          rolTecnico: { select: { nombre: true } },
        },
        orderBy: { id: "asc" },
      },
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
        orderBy: { id: "asc" },
      },
      checklist: { orderBy: { orden: "asc" } },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Serialize Date fields to ISO strings for the PDF component
  const proyectoSerialized = {
    ...proyecto,
    fechaEvento: proyecto.fechaEvento?.toISOString() ?? null,
    fechaMontaje: proyecto.fechaMontaje?.toISOString() ?? null,
    createdAt: proyecto.createdAt?.toISOString() ?? null,
    personal: proyecto.personal.map((p) => ({
      ...p,
      participacion: p.participacion ?? null,
    })),
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(FichaTecnicaPDF, { proyecto: proyectoSerialized as any }) as React.ReactElement<React.ComponentProps<typeof Document>>
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
      "Content-Disposition": `attachment; filename="FichaTecnica-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
