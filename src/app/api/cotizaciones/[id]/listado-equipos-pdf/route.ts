import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { RiderPDF, type RiderPDFData } from "@/components/RiderPDF";
import React from "react";
import fs from "fs";
import path from "path";

import { validarTokenPresentacion } from "@/lib/presentacion-token";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const token = req.nextUrl.searchParams.get("token");
  const session = await getSession();
  
  if (!session && !validarTokenPresentacion(id, token ?? undefined)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true, telefono: true, correo: true, tipoCliente: true } },
      trato: { select: { tradeCalificado: true } },
      lineas: {
        orderBy: { orden: "asc" },
        select: {
          id: true, tipo: true, descripcion: true, marca: true, modelo: true,
          cantidad: true, notas: true, esExterno: true,
          equipo: { select: { imagenUrl: true, categoria: { select: { nombre: true } } } },
        },
      },
    },
  });

  if (!cotizacion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const iconPath = path.join(process.cwd(), "public", "logo-icon.png");
  const logoIconSrc = fs.existsSync(iconPath)
    ? `data:image/png;base64,${fs.readFileSync(iconPath).toString("base64")}`
    : null;

  function resolveImg(url: string | null | undefined): string | null {
    if (!url) return logoIconSrc;
    if (url.startsWith("data:")) return url;
    if (url.startsWith("/")) {
      const filePath = path.join(process.cwd(), "public", url);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).slice(1).toLowerCase();
        const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
      }
    }
    return logoIconSrc;
  }

  // Filtrar solo las líneas que son equipo y mapear a la estructura de equipos del Rider
  const lineasEquipos = cotizacion.lineas.filter(l => 
    ["EQUIPO_PROPIO", "EQUIPO_EXTERNO", "PAQUETE"].includes(l.tipo)
  );

  const data: RiderPDFData = {
    numeroProyecto: cotizacion.numeroCotizacion,
    nombre: cotizacion.nombreEvento || cotizacion.nombreCotizacion || `Cotización ${cotizacion.numeroCotizacion}`,
    fechaEvento: cotizacion.fechaEvento ? cotizacion.fechaEvento.toISOString() : null,
    fechaMontaje: null,
    lugarEvento: cotizacion.lugarEvento || null,
    horaInicio: null,
    horaFin: null,
    horaMontaje: null,
    horaDesmontaje: null,
    direccionVenue: null,
    linkMaps: null,
    indicacionesAcceso: null,
    horaSalidaBodega: null,
    puntoSalidaBodega: null,
    choferNombre: null,
    contactosEmergencia: null,
    encargadoCliente: null,
    encargadoClienteContacto: null,
    encargadoLugar: null,
    encargadoLugarContacto: null,
    cliente: {
      nombre: cotizacion.cliente.nombre,
      empresa: cotizacion.cliente.empresa || null,
      telefono: cotizacion.cliente.telefono || null,
    },
    equipos: lineasEquipos.map(l => ({
      id: l.id,
      tipo: l.esExterno || l.tipo === "EQUIPO_EXTERNO" ? "EXTERNO" : "PROPIO",
      cantidad: l.cantidad,
      notas: l.notas,
      equipo: {
        descripcion: l.descripcion,
        marca: l.marca || null,
        modelo: l.modelo || null,
        imagenUrl: resolveImg(l.equipo?.imagenUrl),
        categoria: l.equipo?.categoria || { nombre: "Sin categoría" },
      },
      riderAccesorios: [], // No aplica para cotizaciones
    })),
    equiposRiderExtra: [], // No aplica para cotizaciones
    cotizacionLineas: [], // Ya pasamos todas las lineas a equipos para que se rendericen visualmente agrupadas
    logoSrc,
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(RiderPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  const filename = `ListadoEquipos-${cotizacion.numeroCotizacion}${cotizacion.nombreEvento ? `-${cotizacion.nombreEvento.replace(/\s+/g, "-")}` : ""}.pdf`;

  const isPreview = req.nextUrl?.searchParams?.get("preview") === "1";
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
      "Cache-Control": "no-store",
    },
  });
}
