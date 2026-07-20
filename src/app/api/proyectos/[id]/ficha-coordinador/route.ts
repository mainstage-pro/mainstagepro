import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { FichaCoordinadorPDF } from "@/components/FichaCoordinadorPDF";
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
      proveedoresEvento: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const now = new Date().toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const data = {
    nombre: proyecto.nombre,
    numeroProyecto: proyecto.numeroProyecto,
    tipoEvento: proyecto.tipoEvento,
    tipoServicio: proyecto.tipoServicio ?? null,
    fechaEvento: proyecto.fechaEvento?.toISOString() ?? null,
    lugarEvento: proyecto.lugarEvento ?? null,
    direccionVenue: proyecto.direccionVenue ?? null,
    linkMaps: proyecto.linkMaps ?? null,
    indicacionesAcceso: proyecto.indicacionesAcceso ?? null,
    horaSalidaBodega: proyecto.horaSalidaBodega ?? null,
    puntoSalidaBodega: proyecto.puntoSalidaBodega ?? null,
    horaMontaje: proyecto.horaMontaje ?? null,
    horaInicio: proyecto.horaInicio ?? null,
    horaDesmontaje: proyecto.horaDesmontaje ?? null,
    indicacionesCliente: proyecto.indicacionesCliente ?? null,
    descripcionGeneral: proyecto.descripcionGeneral ?? null,
    cliente: {
      nombre: proyecto.cliente.nombre,
      empresa: proyecto.cliente.empresa ?? null,
      telefono: proyecto.cliente.telefono ?? null,
    },
    encargadoCliente: proyecto.encargadoCliente ?? null,
    encargadoClienteContacto: proyecto.encargadoClienteContacto ?? null,
    encargadoNombre: proyecto.encargado?.name ?? null,
    encargadoCelular: null, // User model has no phone field
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
        confirmado: p.confirmado ?? false,
        fechaJornada: p.fechaJornada ?? null,
        participacion: p.participacion ?? null,
        jornada: p.jornada ?? null,
      })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    proveedores: (proyecto.proveedoresEvento ?? []).map((p: any) => ({
      nombreProveedor: p.nombreProveedor,
      servicioEquipo: p.servicioEquipo ?? null,
      telefonoProveedor: p.telefonoProveedor ?? null,
    })),
    logoSrc,
    generadoEn: now,
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(FichaCoordinadorPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
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
"Content-Disposition": `${isPreview ? 'inline' : 'attachment'}; filename="FichaCoordinador-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
