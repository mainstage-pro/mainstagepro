import { prisma } from "./src/lib/prisma";
import { renderToBuffer, Document } from "@react-pdf/renderer";
import { RiderPDF, type RiderPDFData } from "./src/components/RiderPDF";
import React from "react";
import fs from "fs";
import path from "path";

async function test() {
  const cotizaciones = await prisma.cotizacion.findMany({
    take: 5,
    select: { id: true, numeroCotizacion: true }
  });
  
  if (cotizaciones.length === 0) {
    console.log("No cotizaciones found in database.");
    return;
  }
  
  console.log("Found cotizaciones:", cotizaciones);
  const id = cotizaciones[0].id;
  console.log("Testing with cotizacion ID:", id);

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

  if (!cotizacion) {
    console.log("Cotizacion not found in DB.");
    return;
  }

  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  function resolveImg(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.startsWith("data:")) return url;
    if (url.startsWith("/")) {
      const filePath = path.join(process.cwd(), "public", url);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).slice(1).toLowerCase();
        const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
      }
    }
    return null;
  }

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
      riderAccesorios: [],
    })),
    equiposRiderExtra: [],
    cotizacionLineas: [],
    logoSrc,
  };

  try {
    console.log("Rendering PDF to buffer...");
    const pdfBuffer = await renderToBuffer(
      React.createElement(RiderPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
    );
    console.log("PDF generated successfully. Size:", pdfBuffer.length, "bytes");
  } catch (err) {
    console.error("Error during PDF rendering:", err);
  }
}

test().catch(console.error);
