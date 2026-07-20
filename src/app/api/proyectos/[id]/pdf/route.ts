import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { FichaTecnicaPDF } from "@/components/FichaTecnicaPDF";
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
      cliente: { select: { nombre: true, empresa: true, telefono: true, correo: true } },
      encargado: { select: { name: true } },
      cotizacion: { select: { numeroCotizacion: true, granTotal: true } },
      personal: {
        include: {
          tecnico: { select: { nombre: true, celular: true, rol: { select: { nombre: true } } } },
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

  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(FichaTecnicaPDF, { proyecto: proyectoSerialized as any, logoSrc }) as React.ReactElement<React.ComponentProps<typeof Document>>
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
"Content-Disposition": `${isPreview ? 'inline' : 'attachment'}; filename="FichaTecnica-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
