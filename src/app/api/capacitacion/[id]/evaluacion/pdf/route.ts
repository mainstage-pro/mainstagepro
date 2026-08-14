import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import React from "react";
import { EvaluacionCapacitacionPDF, type EvaluacionPDFData, type PreguntaPDF } from "@/components/pdf/CapacitacionPDF";

export const maxDuration = 60;

// GET /api/capacitacion/[id]/evaluacion/pdf — Examen + hoja de respuestas en PDF.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const sesion = await prisma.sesionCapacitacion.findUnique({
    where: { id },
    include: {
      categoria: { select: { nombre: true } },
      evaluacion: { select: { preguntas: true, minAprobar: true } },
    },
  });
  if (!sesion) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  if (!sesion.evaluacion) return NextResponse.json({ error: "Esta sesión no tiene evaluación generada" }, { status: 404 });

  const preguntas = (sesion.evaluacion.preguntas as unknown as PreguntaPDF[]).filter(
    (p) => p && typeof p.pregunta === "string" && Array.isArray(p.opciones),
  );

  const data: EvaluacionPDFData = {
    numero: sesion.numero,
    titulo: sesion.titulo,
    area: sesion.categoria?.nombre ?? "General",
    minAprobar: sesion.evaluacion.minAprobar,
    preguntas,
    generadoEn: new Date().toISOString(),
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(EvaluacionCapacitacionPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>,
  );
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const slug = `sesion-${String(sesion.numero).padStart(2, "0")}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}-evaluacion.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
