import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { ContratoPDF } from "@/components/ContratoPDF";
import React from "react";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tratoId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { tratoId } = await params;

  const trato = await prisma.trato.findUnique({
    where: { id: tratoId },
    include: {
      cliente: true,
      responsable: { select: { name: true } },
      cotizaciones: {
        where: { estado: { in: ["APROBADA", "ENVIADA", "EN_REVISION", "REENVIADA"] } },
        include: {
          lineas: { orderBy: { orden: "asc" } },
          cuentasCobrar: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!trato) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const cotizacionRaw = trato.cotizaciones[0] ?? await prisma.cotizacion.findFirst({
    where: { tratoId },
    include: {
      lineas: { orderBy: { orden: "asc" } },
      cuentasCobrar: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const appUrl = req.nextUrl.origin;

  // Serializar fechas Date → string para ContratoPDF
  const tratoSer = {
    ...trato,
    fechaEventoEstimada: trato.fechaEventoEstimada?.toISOString() ?? null,
  };
  const cotizacion = cotizacionRaw ? {
    ...cotizacionRaw,
    cuentasCobrar: cotizacionRaw.cuentasCobrar.map(c => ({
      ...c,
      fechaCompromiso: c.fechaCompromiso instanceof Date ? c.fechaCompromiso.toISOString() : c.fechaCompromiso,
    })),
  } : null;

  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(ContratoPDF, { trato: tratoSer as any, cotizacion: cotizacion as any, appUrl, logoSrc }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  const nombre = trato.nombreEvento
    ? `Contrato-${trato.nombreEvento.replace(/\s+/g, "-")}`
    : `Contrato-${trato.cliente.nombre.replace(/\s+/g, "-")}`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
