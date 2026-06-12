import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { FichaTecnicosPDF } from "@/components/FichaTecnicosPDF";
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
      encargado: { select: { id: true, name: true } }, // User model has no phone field
      personal: {
        include: {
          tecnico: { select: { nombre: true, celular: true, rol: { select: { nombre: true } } } },
          rolTecnico: { select: { nombre: true } },
        },
        orderBy: { id: "asc" },
      },
      equipos: {
        include: {
          equipo: { select: { descripcion: true, marca: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const data = {
    nombre: proyecto.nombre,
    numeroProyecto: proyecto.numeroProyecto,
    fechaEvento: proyecto.fechaEvento?.toISOString() ?? null,
    horaSalidaBodega: proyecto.horaSalidaBodega ?? null,
    puntoSalidaBodega: proyecto.puntoSalidaBodega ?? null,
    horaMontaje: proyecto.horaMontaje ?? null,
    horaInicio: proyecto.horaInicio ?? null,
    horaDesmontaje: proyecto.horaDesmontaje ?? null,
    lugarEvento: proyecto.lugarEvento ?? null,
    direccionVenue: proyecto.direccionVenue ?? null,
    linkMaps: proyecto.linkMaps ?? null,
    indicacionesAcceso: proyecto.indicacionesAcceso ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    equipos: (proyecto.equipos ?? []).map((e: any) => ({
      descripcion: e.equipo?.descripcion ?? "",
      marca: e.equipo?.marca ?? null,
      cantidad: e.cantidad,
      tipo: e.tipo,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    personal: (proyecto.personal ?? [])
      .filter((p: any) => p.tecnico)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => ({
        nombre: p.tecnico.nombre,
        rolEnEvento: p.rolEnEvento ?? null,
        rolTecnico: p.rolTecnico?.nombre ?? p.tecnico?.rol?.nombre ?? null,
        celular: p.tecnico.celular ?? null,
      })),
    encargadoNombre: proyecto.encargado?.name ?? null,
    encargadoCelular: null, // User model has no phone field
    encargadoCliente: proyecto.encargadoCliente ?? null,
    encargadoClienteContacto: proyecto.encargadoClienteContacto ?? null,
    logoSrc,
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(FichaTecnicosPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
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
"Content-Disposition": `${isPreview ? 'inline' : 'attachment'}; filename="BriefTecnicos-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
