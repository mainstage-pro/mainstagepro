import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF from "@react-pdf/renderer";
import { CartaResponsivaSubarrendadosPDF } from "@/components/CartaResponsivaSubarrendadosPDF";
import React from "react";

function fmtDateLong(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

function extraerCiudad(lugar: string): string {
  if (!lugar) return "";
  const parts = lugar.split(",");
  if (parts.length > 1) return parts[parts.length - 1].trim();
  return "";
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
  
  const nombreProveedor = url.searchParams.get("nombreProveedor") ?? "";
  const representanteProveedor = url.searchParams.get("representanteProveedor") ?? "";
  const descripcionEquipoSubarrendado = url.searchParams.get("descripcionEquipoSubarrendado") ?? "";

  const ciudad = url.searchParams.get("ciudad") ?? extraerCiudad(proyecto.lugarEvento ?? "");

  const fechaEvento = fmtDateLong(new Date(proyecto.fechaEvento));
  const hoy = new Date();
  const fechaCarta = `${ciudad ? ciudad + ", " : ""}${fmtDateLong(hoy)}`;

  const props = {
    numeroProyecto:     proyecto.numeroProyecto,
    nombreEvento:       proyecto.nombre,
    fechaEvento,
    lugarEvento:        proyecto.lugarEvento ?? "",
    ciudad,
    
    destinatario,
    responsableNombre:  responsable,
    cargo,
    telefono,
    correo,
    fechaCarta,
    
    nombreProveedor,
    representanteProveedor,
    descripcionEquipoSubarrendado,
  };

  const element = React.createElement(CartaResponsivaSubarrendadosPDF, props);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await ReactPDF.renderToStream(element as any);

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    (stream as NodeJS.ReadableStream).on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    (stream as NodeJS.ReadableStream).on("end", resolve);
    (stream as NodeJS.ReadableStream).on("error", reject);
  });

  const pdf = Buffer.concat(chunks);
  const filename = `Asignacion-Responsabilidad-Subarrendados-${proyecto.numeroProyecto}.pdf`;

  const isPreview = req.nextUrl?.searchParams?.get("preview") === "1";
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isPreview ? 'inline' : 'attachment'}; filename="${filename}"`,
    },
  });
}
