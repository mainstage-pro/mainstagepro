import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { BriefPDF } from "@/components/BriefPDF";
import React from "react";
import path from "path";
import fs from "fs";

export async function GET(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
            select: { descripcion: true, marca: true, modelo: true },
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
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(BriefPDF, { proyecto: proyectoData as any, logoSrc }) as React.ReactElement<React.ComponentProps<typeof Document>>
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
"Content-Disposition": `${isPreview ? 'inline' : 'attachment'}; filename="Brief-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
