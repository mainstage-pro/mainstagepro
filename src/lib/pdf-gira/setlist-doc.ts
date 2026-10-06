// src/lib/pdf-gira/setlist-doc.ts
//
// El setlist como documento de la casa, el que se reparte junto al day sheet y
// el advance. Es otro papel que la hoja de escenario: esa se pega al piso en
// letra gigante y sin membrete, esta se lee en la mano y carga el detalle
// (tono, BPM, track, cues de audio, luces y video).
//
// Se emite por gira o por show. Si el show no capturó su variante se imprime el
// repertorio base y el documento lo dice: un papel heredado que no se anuncia
// es peor que no tenerlo.
//
// Los bloques salen de segmentarSetlist, igual que en pantalla, en el libro de
// gira y en la hoja de escenario.

import React from "react";
import type { Document } from "@react-pdf/renderer";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  fmtFechaCorta,
  fmtFechaLarga,
  fmtMinSeg,
  segmentarSetlist,
  tituloDeFila,
  TIPO_FILA_SETLIST_LABEL,
} from "@/lib/giras";
import { logoBase64, nowStr, resolvePdfImage } from "@/components/pdf/PdfShared";
import { SetlistDocPDF, type SetlistDocData, type SetlistDocFila } from "@/components/pdf/giras/SetlistDocPDF";
import { bufferDePdf, type PdfGira } from "./render";

function slugArchivo(texto: string): string {
  return (
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "gira"
  );
}

export async function generarSetlistDoc(giraId: string, showId?: string | null): Promise<PdfGira | null> {
  // Primero se decide QUÉ setlist se imprime y luego se trae con canciones: una
  // gira de veinte fechas tiene veinte variantes y no hay por qué leerlas todas.
  const candidatos = await prisma.giraSetlist.findMany({
    where: { giraId },
    select: { id: true, showId: true, esBase: true },
    orderBy: { createdAt: "asc" },
  });
  if (candidatos.length === 0) return null;

  const propio = showId ? (candidatos.find((s) => s.showId === showId) ?? null) : null;
  const elegido = propio ?? candidatos.find((s) => s.esBase) ?? candidatos[0];
  const heredado = !!showId && !propio;

  const [setlist, show] = await Promise.all([
    prisma.giraSetlist.findUnique({
      where: { id: elegido.id },
      select: {
        id: true,
        nombre: true,
        esBase: true,
        duracionMin: true,
        notas: true,
        gira: { select: { nombre: true, slug: true, artista: { select: { nombre: true, logoUrl: true } } } },
        show: { select: { fecha: true, ciudad: true } },
        canciones: { orderBy: { orden: "asc" } },
      },
    }),
    showId
      ? prisma.giraShow.findUnique({
          where: { id: showId },
          select: { fecha: true, ciudad: true, venue: { select: { nombre: true, ciudad: true } } },
        })
      : null,
  ]);
  if (!setlist) return null;

  const filas: SetlistDocFila[] = [];
  let canciones = 0;
  let momentos = 0;
  let bloques = 0;
  let segCanciones = 0;
  let segMomentos = 0;
  let sinDuracion = 0;

  /// Lo que no cambia entre una canción y un momento: el detalle técnico.
  const detalle = (c: (typeof setlist.canciones)[number]) => ({
    duracion: fmtMinSeg(c.duracionSeg) || "",
    tonalidad: c.tonalidad,
    bpm: c.bpm,
    conTrack: c.conTrack,
    cues:
      [
        c.notasAudio ? `Audio: ${c.notasAudio}` : null,
        c.notasLuces ? `Luces: ${c.notasLuces}` : null,
        c.notasVideo ? `Video: ${c.notasVideo}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    cambio: c.cambioInstrumento,
    notas: c.notas,
  });

  for (const seg of segmentarSetlist(setlist.canciones)) {
    if (seg.clase === "momento") {
      const c = seg.fila;
      momentos += 1;
      segMomentos += c.duracionSeg ?? 0;
      const etiqueta = TIPO_FILA_SETLIST_LABEL[c.tipo] ?? c.tipo;
      filas.push({
        id: c.id,
        posicion: null,
        bloque: null,
        bloqueNombre: null,
        bloqueColor: null,
        abreBloque: false,
        etiqueta,
        // El título repetido ("Pausa" debajo de la etiqueta Pausa) no informa:
        // se imprime uno solo.
        titulo: c.titulo.trim().toLowerCase() === etiqueta.toLowerCase() ? "" : c.titulo,
        ...detalle(c),
      });
      continue;
    }

    bloques += 1;
    for (const [i, c] of seg.canciones.entries()) {
      canciones += 1;
      segCanciones += c.fila.duracionSeg ?? 0;
      if (!c.fila.duracionSeg) sinDuracion += 1;
      filas.push({
        id: c.fila.id,
        posicion: c.posicion,
        bloque: seg.numero,
        bloqueNombre: i === 0 ? seg.nombre : null,
        bloqueColor: i === 0 ? seg.color : null,
        abreBloque: i === 0,
        etiqueta: null,
        titulo: tituloDeFila(c.fila.titulo, c.fila.artistaInvitado),
        ...detalle(c.fila),
      });
    }
  }

  // En el encabezado la fecha va larga: el papel se lee meses después y "09-oct"
  // no dice de qué año ni de qué día de la semana se habla.
  const contexto = show
    ? [fmtFechaLarga(show.fecha), show.ciudad ?? show.venue?.ciudad, show.venue?.nombre].filter(Boolean).join(" · ")
    : setlist.show
      ? [fmtFechaLarga(setlist.show.fecha), setlist.show.ciudad].filter(Boolean).join(" · ")
      : null;

  const publicDir = path.join(process.cwd(), "public");

  const data: SetlistDocData = {
    giraNombre: setlist.gira.nombre,
    artistaNombre: setlist.gira.artista.nombre,
    setlistNombre: setlist.nombre,
    esBase: setlist.esBase,
    heredado,
    contexto: contexto || null,
    totalCanciones: canciones,
    totalMomentos: momentos,
    bloques,
    minutosCantados: Math.round(segCanciones / 60),
    minutosEnPapel: Math.round((segCanciones + segMomentos) / 60),
    sinDuracion,
    slotMin: setlist.duracionMin,
    notas: setlist.notas,
    filas,
    logoSrc: logoBase64(publicDir),
    logoArtistaSrc: await resolvePdfImage(setlist.gira.artista.logoUrl, publicDir),
    generadoEn: nowStr(),
  };

  const sufijo = show
    ? slugArchivo([fmtFechaCorta(show.fecha), show.ciudad ?? show.venue?.ciudad].filter(Boolean).join("-"))
    : setlist.esBase
      ? "base"
      : slugArchivo(setlist.nombre);

  // "Repertorio" y no "Setlist" para no pisar el archivo de la hoja de
  // escenario, que ya se llama Setlist-*: quien baje los dos los distingue en
  // la carpeta de descargas.
  return {
    buf: await bufferDePdf(
      React.createElement(SetlistDocPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>,
    ),
    filename: `Repertorio-${setlist.gira.slug ?? slugArchivo(setlist.gira.nombre)}-${sufijo}.pdf`,
  };
}
