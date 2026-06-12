import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { HojaEntregaRentaPDF } from "@/components/HojaEntregaRentaPDF";
import React from "react";
import path from "path";
import fs from "fs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      cliente: { select: { nombre: true, empresa: true, telefono: true } },
      trato: { select: { ideasReferencias: true } },
      cotizacion: {
        select: {
          numeroCotizacion: true,
          observaciones: true,
          notasSecciones: true,
          lineas: {
            where: { tipo: { in: ["EQUIPO_PROPIO", "EQUIPO_EXTERNO", "PAQUETE", "OTRO"] } },
            select: { id: true, tipo: true, descripcion: true, marca: true, cantidad: true, notas: true },
            orderBy: { orden: "asc" },
          },
        },
      },
      equipos: {
        include: {
          equipo: {
            select: {
              descripcion: true,
              marca: true,
              imagenUrl: true,
              categoria: { select: { nombre: true } },
            },
          },
          riderAccesorios: {
            select: { nombre: true, cantidad: true, categoria: true },
            orderBy: { orden: "asc" },
          },
        },
        orderBy: [{ equipo: { categoriaId: "asc" } }, { id: "asc" }],
      },
    },
  });


  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const proyectoData = {
    ...proyecto,
    fechaEvento: proyecto.fechaEvento?.toISOString() ?? null,
    tratoIdeasReferencias: proyecto.trato?.ideasReferencias ?? null,
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(HojaEntregaRentaPDF, { proyecto: proyectoData as any, logoSrc }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  const isPreview = req.nextUrl?.searchParams?.get("preview") === "1";
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
"Content-Disposition": `${isPreview ? 'inline' : 'attachment'}; filename="HojaEntrega-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
