// src/lib/pdf-propuesta.ts
//
// El PDF de la propuesta de servicios. Sale por dos puertas —la descarga con
// sesión y el enlace público del cliente— y las dos llaman aquí, así que el
// papel que ve el cliente es el mismo que ve el vendedor.
//
// Reusa el render de los documentos del proyecto y la base visual de los
// documentos de gira: una propuesta y un rider se reconocen como de la misma
// casa porque literalmente comparten el componente.

import React from "react";
import type { Document } from "@react-pdf/renderer";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  ESTADO_PROPUESTA_LABEL,
  GRUPO_SUBTOTAL,
  MODELO_COBRO_LABEL,
  TIPO_LINEA_PROPUESTA_LABEL,
  UNIDAD_COBRO_LABEL,
  fmtFechaCorta,
  fmtFechaLarga,
} from "@/lib/giras";
import { contarGira } from "@/lib/propuesta-servicio";
import { logoBase64, nowStr, resolvePdfImage } from "@/components/pdf/PdfShared";
import {
  PropuestaServicioPDF,
  type PropuestaLineaDoc,
  type PropuestaServicioData,
} from "@/components/pdf/giras/PropuestaServicioPDF";
import { bufferDePdf, type PdfProyecto } from "@/lib/pdf-proyecto/render";

export type PdfPropuesta = PdfProyecto;
export { respuestaPdf } from "@/lib/pdf-proyecto/render";

/// "Propuesta - Cliente - Gira - PS-0001.pdf". El número va al final porque es
/// lo que distingue dos versiones que de otro modo compartirían nombre.
function nombreArchivo(partes: (string | null | undefined)[], numero: string, version: number): string {
  const limpiar = (t: string) => t.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
  const base = ["Propuesta", ...partes.filter((x): x is string => Boolean(x?.trim())).map(limpiar)]
    .join(" - ")
    .slice(0, 110)
    .trim();
  return `${base} - ${numero}${version > 1 ? `v${version}` : ""}.pdf`;
}

export async function generarPropuestaServicio(id: string): Promise<PdfPropuesta | null> {
  const propuesta = await prisma.propuestaServicio.findUnique({
    where: { id },
    include: {
      cliente: { select: { nombre: true, empresa: true } },
      artista: { select: { nombre: true, logoUrl: true } },
      gira: {
        select: {
          nombre: true,
          shows: {
            select: {
              id: true,
              fecha: true,
              ciudad: true,
              estado: true,
              venueId: true,
              venue: { select: { nombre: true } },
            },
            orderBy: { fecha: "asc" },
          },
        },
      },
      lineas: {
        include: {
          servicio: { select: { entregables: true } },
          show: { select: { fecha: true, ciudad: true } },
        },
        orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!propuesta || !propuesta.activo) return null;

  const publicDir = path.join(process.cwd(), "public");
  const shows = propuesta.gira?.shows ?? [];
  const vivos = shows.filter((s) => s.estado !== "CANCELADO");

  const lineas: PropuestaLineaDoc[] = propuesta.lineas.map((l) => ({
    id: l.id,
    // Una línea marcada como reembolsable viaja a ese grupo aunque su tipo diga
    // otra cosa: es el mismo criterio que usa el motor de cálculo.
    grupo: l.esReembolsable ? "reembolsables" : (GRUPO_SUBTOTAL[l.tipo] ?? "honorarios"),
    tipoLabel: TIPO_LINEA_PROPUESTA_LABEL[l.tipo] ?? l.tipo,
    concepto: l.concepto,
    descripcion: l.descripcion,
    entregables: l.servicio?.entregables ?? null,
    unidadLabel: UNIDAD_COBRO_LABEL[l.unidad] ?? l.unidad,
    cantidad: l.cantidad,
    precioUnitario: l.precioUnitario,
    subtotal: l.esIncluido ? 0 : l.cantidad * l.precioUnitario,
    esIncluido: l.esIncluido,
    esReembolsable: l.esReembolsable,
    showEtiqueta: l.show
      ? [fmtFechaCorta(l.show.fecha), l.show.ciudad].filter(Boolean).join(" · ")
      : null,
  }));

  const data: PropuestaServicioData = {
    numero: propuesta.numero,
    version: propuesta.version,
    titulo: propuesta.titulo?.trim() || "Production management",
    estadoLabel: ESTADO_PROPUESTA_LABEL[propuesta.estado] ?? propuesta.estado,
    clienteNombre: propuesta.cliente?.empresa?.trim() || propuesta.cliente?.nombre || null,
    artistaNombre: propuesta.artista?.nombre ?? null,
    giraNombre: propuesta.gira?.nombre ?? null,
    modeloCobroLabel: MODELO_COBRO_LABEL[propuesta.modeloCobro] ?? propuesta.modeloCobro,
    moneda: propuesta.moneda || "MXN",
    vigenciaHasta: propuesta.vigenciaHasta ? fmtFechaLarga(propuesta.vigenciaHasta) : null,
    alcance: propuesta.alcance,
    exclusiones: propuesta.exclusiones,
    supuestos: propuesta.supuestos,
    condicionesPago: propuesta.condicionesPago,
    aplicaIva: propuesta.aplicaIva,
    totales: {
      honorarios: propuesta.subtotalHonorarios,
      equipo: propuesta.subtotalEquipo,
      logistica: propuesta.subtotalLogistica,
      reembolsables: propuesta.subtotalReembolsables,
      descuentoMonto: propuesta.descuentoMonto,
      descuentoRazon: propuesta.descuentoRazon,
      subtotal: propuesta.subtotal,
      montoIva: propuesta.montoIva,
      granTotal: propuesta.granTotal,
    },
    conteo: contarGira(vivos),
    shows: vivos.map((s) => ({
      id: s.id,
      fechaLarga: fmtFechaLarga(s.fecha),
      ciudad: s.ciudad,
      venue: s.venue?.nombre ?? null,
    })),
    lineas,
    aprobacion: propuesta.aprobacionFecha
      ? { nombre: propuesta.aprobacionNombre, fecha: fmtFechaLarga(propuesta.aprobacionFecha) }
      : null,
    logoSrc: logoBase64(publicDir),
    logoArtistaSrc: await resolvePdfImage(propuesta.artista?.logoUrl, publicDir),
    generadoEn: nowStr(),
  };

  const buf = await bufferDePdf(
    React.createElement(PropuestaServicioPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>,
  );

  return {
    buf,
    filename: nombreArchivo(
      [data.clienteNombre, data.giraNombre ?? data.artistaNombre, data.titulo],
      propuesta.numero,
      propuesta.version,
    ),
  };
}
