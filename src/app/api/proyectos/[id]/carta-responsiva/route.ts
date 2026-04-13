import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { DocumentProps } from "@react-pdf/renderer";
import { CartaResponsivaPDF } from "@/components/CartaResponsivaPDF";
import React, { JSXElementConstructor, ReactElement } from "react";

const TIPO_SERVICIO_DESC: Record<string, string> = {
  RENTA: "renta e instalación de equipo de producción técnica",
  PRODUCCION_TECNICA: "producción técnica integral de audio, iluminación y video",
  DIRECCION_TECNICA: "dirección técnica del evento",
  MULTISERVICIO: "servicios integrales de producción técnica",
};

function fmtDateLong(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      trato: { select: { tipoServicio: true } },
      encargado: { select: { name: true } },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const url = req.nextUrl;
  const destinatario     = url.searchParams.get("destinatario")     ?? "";
  const responsable      = url.searchParams.get("responsable")      ?? proyecto.encargado?.name ?? "";
  const cargo            = url.searchParams.get("cargo")            ?? "Director de Producción";
  const telefono         = url.searchParams.get("telefono")         ?? "";
  const correo           = url.searchParams.get("correo")           ?? "";
  const descripcionEquipo = url.searchParams.get("descripcionEquipo") ?? "";
  const ciudad           = url.searchParams.get("ciudad")           ?? extraerCiudad(proyecto.lugarEvento ?? "");

  const tipoServ = proyecto.trato?.tipoServicio ?? "PRODUCCION_TECNICA";
  const descripcionServicio = TIPO_SERVICIO_DESC[tipoServ] ?? "producción técnica integral";

  const fechaEvento = fmtDateLong(new Date(proyecto.fechaEvento));
  const hoy = new Date();
  const fechaCarta = `${ciudad ? ciudad + ", " : ""}${fmtDateLong(hoy)}`;

  const props = {
    numeroProyecto:     proyecto.numeroProyecto,
    nombreEvento:       proyecto.nombre,
    fechaEvento,
    lugarEvento:        proyecto.lugarEvento ?? "",
    ciudad,
    descripcionServicio,
    descripcionEquipo,
    destinatario,
    responsableNombre:  responsable,
    cargo,
    telefono,
    correo,
    fechaCarta,
  };

  const element = React.createElement(CartaResponsivaPDF, props);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await ReactPDF.renderToStream(element as any);

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    (stream as NodeJS.ReadableStream).on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    (stream as NodeJS.ReadableStream).on("end", resolve);
    (stream as NodeJS.ReadableStream).on("error", reject);
  });

  const pdf = Buffer.concat(chunks);
  const filename = `Carta-Responsiva-${proyecto.numeroProyecto}.pdf`;

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function extraerCiudad(lugar: string): string {
  if (!lugar) return "";
  // Si tiene coma (ej: "Estadio Jalisco, Guadalajara"), tomar la parte después
  const parts = lugar.split(",");
  if (parts.length > 1) return parts[parts.length - 1].trim();
  return "";
}
