import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { FormRespuestasPDF } from "@/components/FormRespuestasPDF";
import React from "react";
import fs from "fs";
import path from "path";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const trato = await prisma.trato.findUnique({
    where: { id },
    select: {
      nombreEvento: true,
      tipoServicio: true,
      tipoEvento: true,
      rutaEntrada: true,
      fechaEventoEstimada: true,
      lugarEstimado: true,
      asistentesEstimados: true,
      formRespuestas: true,
      formEstado: true,
      createdAt: true,
      cliente: { select: { nombre: true, empresa: true } },
    },
  });

  if (!trato) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!trato.formRespuestas) return NextResponse.json({ error: "Sin respuestas de formulario" }, { status: 400 });

  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const fechaImpresion = new Date().toLocaleDateString("es-MX", {
    day: "numeric", month: "long", year: "numeric",
  });

  const tratoData = {
    nombreEvento: trato.nombreEvento,
    tipoServicio: trato.tipoServicio,
    tipoEvento: trato.tipoEvento,
    rutaEntrada: trato.rutaEntrada,
    fechaEventoEstimada: trato.fechaEventoEstimada?.toISOString() ?? null,
    lugarEstimado: trato.lugarEstimado,
    asistentesEstimados: trato.asistentesEstimados,
    formRespuestas: trato.formRespuestas,
    cliente: trato.cliente,
    createdAt: trato.createdAt.toISOString(),
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(FormRespuestasPDF, { trato: tratoData, logoSrc, fechaImpresion }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  const nombre = trato.nombreEvento ?? "Formulario";
  const safeName = nombre.replace(/[^a-zA-Z0-9\-_áéíóúÁÉÍÓÚñÑ ]/g, "").trim();

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Formulario-${safeName}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
