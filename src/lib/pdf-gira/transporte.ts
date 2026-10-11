// src/lib/pdf-gira/transporte.ts
//
// El schedule de transporte de producción de un show: los traslados que mueve
// Mainstage (crew, equipo, choferes) para esa fecha. Lo que es del artista
// —viaje con persona asignada o crew de su propio origen— no entra: ese
// transporte es suyo y no se reparte con el equipo técnico.

import React from "react";
import type { Document } from "@react-pdf/renderer";
import path from "path";
import { prisma } from "@/lib/prisma";
import { TIPO_VIAJE_LABEL, fmtFechaHora, fmtFechaLarga, nombreCrew } from "@/lib/giras";
import { INCLUDE_VIAJE } from "@/lib/logistica-gira";
import { logoBase64, nowStr, resolvePdfImage } from "@/components/pdf/PdfShared";
import {
  TransporteProduccionPDF,
  type TransporteData,
  type TransporteViaje,
} from "@/components/pdf/giras/TransporteProduccionPDF";
import { bufferDePdf, type PdfGira } from "./render";

type ViajeConCrew = Awaited<ReturnType<typeof prisma.giraViaje.findMany<{ include: typeof INCLUDE_VIAJE }>>>[number];

function esDeArtista(v: ViajeConCrew): boolean {
  return !!v.personaId || v.crew?.origen === "ARTISTA";
}

function quienViaja(v: ViajeConCrew): string {
  if (v.crew) return nombreCrew(v.crew);
  if (v.nombreLibre) return v.nombreLibre;
  return v.esGrupal ? "Todo el grupo" : "Sin asignar";
}

export async function generarTransporteProduccion(showId: string): Promise<PdfGira | null> {
  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    include: {
      venue: { select: { ciudad: true } },
      gira: { select: { nombre: true, artista: { select: { nombre: true, logoUrl: true } } } },
    },
  });
  if (!show) return null;

  const viajesTodos = await prisma.giraViaje.findMany({
    where: { showId },
    orderBy: [{ salida: "asc" }, { orden: "asc" }],
    include: INCLUDE_VIAJE,
  });

  const viajes = viajesTodos.filter((v) => !esDeArtista(v));
  if (viajes.length === 0) return null;

  const ciudad = show.ciudad ?? show.venue?.ciudad ?? null;
  const publicDir = path.join(process.cwd(), "public");

  const data: TransporteData = {
    giraNombre: show.gira.nombre,
    artistaNombre: show.gira.artista.nombre,
    fechaLarga: fmtFechaLarga(show.fecha),
    ciudad,
    viajes: viajes.map(
      (v): TransporteViaje => ({
        id: v.id,
        tipoLabel: TIPO_VIAJE_LABEL[v.tipo] ?? v.tipo,
        quien: quienViaja(v),
        concepto: v.concepto,
        // Y no "→": la Helvetica del PDF no trae esa flecha y la imprime como
        // un apóstrofo suelto.
        ruta: [v.origen, v.destino].filter(Boolean).join(" » ") || "Sin ruta",
        salida: fmtFechaHora(v.salida),
        llegada: fmtFechaHora(v.llegada),
        operador: v.operador,
        identificador: v.identificador,
        notas: v.notas,
      }),
    ),
    logoSrc: logoBase64(publicDir),
    logoArtistaSrc: await resolvePdfImage(show.gira.artista.logoUrl, publicDir),
    generadoEn: nowStr(),
  };

  const buf = await bufferDePdf(
    React.createElement(TransporteProduccionPDF, { data }) as React.ReactElement<
      React.ComponentProps<typeof Document>
    >,
  );

  const slug = [ciudad, show.fecha.toISOString().slice(0, 10)].filter(Boolean).join("-").replace(/[^\w-]+/g, "");
  return { buf, filename: `Transporte-${slug || show.id}.pdf` };
}
