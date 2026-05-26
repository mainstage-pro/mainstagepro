import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { FichaClientePDF } from "@/components/FichaClientePDF";
import React from "react";
import path from "path";
import fs from "fs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proyecto = await (prisma.proyecto.findUnique as any)({
    where: { id },
    include: {
      cliente: { select: { nombre: true, empresa: true, telefono: true } },
      encargado: { select: { name: true, phone: true } },
      cotizacion: {
        select: {
          lineas: {
            include: {
              equipo: { select: { descripcion: true, marca: true } },
            },
            where: { tipo: "PROPIO" },
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

  const equipos = (proyecto.cotizacion?.lineas ?? []).map((l: { cantidad: number; equipo: { descripcion: string; marca: string | null } | null }) => ({
    descripcion: l.equipo?.descripcion ?? "",
    marca: l.equipo?.marca ?? null,
    cantidad: l.cantidad,
  }));

  const data = {
    nombre: proyecto.nombre,
    numeroProyecto: proyecto.numeroProyecto,
    tipoServicio: proyecto.tipoServicio,
    tipoEvento: proyecto.tipoEvento,
    fechaEvento: proyecto.fechaEvento?.toISOString() ?? null,
    horaInicio: proyecto.horaInicio ?? null,
    lugarEvento: proyecto.lugarEvento ?? null,
    direccionVenue: proyecto.direccionVenue ?? null,
    linkMaps: proyecto.linkMaps ?? null,
    indicacionesCliente: proyecto.indicacionesCliente ?? null,
    encargadoNombre: proyecto.encargado?.name ?? null,
    encargadoCelular: proyecto.encargado?.phone ?? null,
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

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="FichaCliente-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
