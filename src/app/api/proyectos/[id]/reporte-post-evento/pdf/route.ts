import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { ReportePostEventoPDF } from "@/components/ReportePostEventoPDF";
import React from "react";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      nombre: true,
      numeroProyecto: true,
      fechaEvento: true,
      cliente: { select: { nombre: true, empresa: true } },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const evaluacion = await prisma.evaluacionInterna.findUnique({
    where: { proyectoId: id },
    select: { reportePostEvento: true },
  });

  type ReporteItem = { area: string; problema: string; causa: string; solucion: string };
  let items: ReporteItem[] = [];
  try {
    if (evaluacion?.reportePostEvento) {
      items = JSON.parse(evaluacion.reportePostEvento) as ReporteItem[];
    }
  } catch {
    items = [];
  }

  const proyectoData = {
    nombre: proyecto.nombre,
    numeroProyecto: proyecto.numeroProyecto,
    fechaEvento: proyecto.fechaEvento?.toISOString() ?? null,
    cliente: proyecto.cliente
      ? { nombre: proyecto.cliente.nombre, empresa: proyecto.cliente.empresa ?? null }
      : null,
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(ReportePostEventoPDF, { proyecto: proyectoData, items }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const isPreview = req.nextUrl?.searchParams?.get("preview") === "1";
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
"Content-Disposition": `${isPreview ? 'inline' : 'attachment'}; filename="ReportePostEvento-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
