import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { FichaClientePDF } from "@/components/FichaClientePDF";
import React from "react";
import path from "path";
import fs from "fs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proyecto = await (prisma.proyecto.findUnique as any)({
    where: { id },
    include: {
      cliente: { select: { nombre: true, empresa: true, telefono: true } },
      encargado: { select: { id: true, name: true } }, // User model has no phone
      cotizacion: {
        include: {
          lineas: {
            where: { tipo: "PROPIO" },
            include: {
              equipo: { select: { descripcion: true, marca: true } },
            },
          },
        },
      },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const equipos = (proyecto.cotizacion?.lineas ?? []).map((l: any) => ({
    descripcion: l.equipo?.descripcion ?? "",
    marca: l.equipo?.marca ?? null,
    cantidad: l.cantidad,
  }));

  const data = {
    nombre: proyecto.nombre,
    numeroProyecto: proyecto.numeroProyecto,
    tipoServicio: proyecto.tipoServicio ?? null,
    tipoEvento: proyecto.tipoEvento,
    fechaEvento: proyecto.fechaEvento?.toISOString() ?? null,
    horaInicio: proyecto.horaInicio ?? null,
    lugarEvento: proyecto.lugarEvento ?? null,
    direccionVenue: proyecto.direccionVenue ?? null,
    linkMaps: proyecto.linkMaps ?? null,
    indicacionesCliente: proyecto.indicacionesCliente ?? null,
    encargadoNombre: proyecto.encargado?.name ?? null,
    encargadoCelular: null, // User model has no phone field
    cliente: {
      nombre: proyecto.cliente.nombre,
      empresa: proyecto.cliente.empresa ?? null,
    },
    equipos,
    logoSrc,
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(FichaClientePDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
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
"Content-Disposition": `${isPreview ? 'inline' : 'attachment'}; filename="FichaCliente-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
