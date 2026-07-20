import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { ContratoPDF } from "@/components/ContratoPDF";
import React from "react";
import fs from "fs";
import path from "path";

import { validarTokenPresentacion } from "@/lib/presentacion-token";
import { ensureProcesoVentaColumns } from "@/lib/migraciones-lazy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tratoId: string }> }
) {
  const session = await getSession();
  const token = req.nextUrl.searchParams.get("token");
  const cotizacionId = req.nextUrl.searchParams.get("cotizacionId");

  if (!session) {
    if (!token || !cotizacionId || !validarTokenPresentacion(cotizacionId, token)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const { tratoId } = await params;

  // Lee el trato con `include`; garantizar columnas nuevas antes de consultar.
  await ensureProcesoVentaColumns();

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

  // Si un usuario autenticado pide una cotización específica del trato, úsala.
  const cotizacionRaw = (session && cotizacionId
    ? await prisma.cotizacion.findFirst({
        where: { id: cotizacionId, tratoId },
        include: {
          lineas: { orderBy: { orden: "asc" } },
          cuentasCobrar: { orderBy: { createdAt: "asc" } },
        },
      })
    : null)
    ?? trato.cotizaciones[0]
    ?? await prisma.cotizacion.findFirst({
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

  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(ContratoPDF, { trato: tratoSer as any, cotizacion: cotizacion as any, appUrl, logoSrc }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const nombre = trato.nombreEvento
    ? `Contrato-${trato.nombreEvento.replace(/\s+/g, "-")}`
    : `Contrato-${trato.cliente.nombre.replace(/\s+/g, "-")}`;

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
