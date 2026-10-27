// src/lib/pdf-gira/notas.ts
//
// Notas y aprendizajes: el documento de un show (sus temas con hallazgos y
// comentarios) y el de la gira completa, que junta el de cada show con
// contenido y, al final, los temas generales de la producción más el resumen
// ejecutivo y los aciertos a repetir. Si no hay nada capturado, no hay
// documento que emitir.

import React from "react";
import type { Document } from "@react-pdf/renderer";
import path from "path";
import { prisma } from "@/lib/prisma";
import { fmtFechaLarga } from "@/lib/giras";
import {
  TEMAS_GIRA,
  TEMAS_SHOW,
  giraEvaluacionTieneContenido,
  parseGiraEvaluacion,
  parseGiraShowEvaluacion,
  showEvaluacionTieneContenido,
  temaTieneContenido,
  type GiraEvaluacionData,
  type GiraShowEvaluacionData,
  type TemaEvaluacion,
} from "@/lib/gira-evaluacion";
import { logoBase64, nowStr, resolvePdfImage } from "@/components/pdf/PdfShared";
import type { TemaPdf } from "@/components/pdf/giras/NotasBloques";
import { NotasAprendizajesPDF, type NotaShow, type NotasAprendizajesData } from "@/components/pdf/giras/NotasAprendizajesPDF";
import { NotasShowPDF, type NotasShowData } from "@/components/pdf/giras/NotasShowPDF";
import { bufferDePdf, type PdfGira } from "./render";

function temaAPdf(id: string, titulo: string, tema: TemaEvaluacion): TemaPdf | null {
  if (!temaTieneContenido(tema)) return null;
  return {
    id,
    titulo,
    hallazgos: tema.hallazgos
      .filter((h) => h.falla.trim() || h.solucion.trim() || h.propuestaMejora.trim())
      .map((h) => ({ severidad: h.severidad, falla: h.falla, solucion: h.solucion, propuestaMejora: h.propuestaMejora })),
    comentarios: tema.comentarios.trim() || null,
  };
}

function temasShowAPdf(evaluacion: GiraShowEvaluacionData): TemaPdf[] {
  return TEMAS_SHOW.map((t) => temaAPdf(t.id, t.label, evaluacion.temas[t.id])).filter((t): t is TemaPdf => t !== null);
}

function temasGiraAPdf(evaluacion: GiraEvaluacionData): TemaPdf[] {
  return TEMAS_GIRA.map((t) => temaAPdf(t.id, t.label, evaluacion.temas[t.id])).filter((t): t is TemaPdf => t !== null);
}

export async function generarNotasAprendizajes(giraId: string): Promise<PdfGira | null> {
  const gira = await prisma.gira.findUnique({
    where: { id: giraId },
    select: {
      id: true,
      nombre: true,
      evaluacion: true,
      artista: { select: { nombre: true, logoUrl: true } },
      shows: {
        orderBy: { fecha: "asc" },
        select: { id: true, fecha: true, ciudad: true, evaluacion: true, venue: { select: { nombre: true } } },
      },
    },
  });
  if (!gira) return null;

  const giraEvaluacion = parseGiraEvaluacion(gira.evaluacion);
  const showsConContenido = gira.shows.filter((s) => showEvaluacionTieneContenido(parseGiraShowEvaluacion(s.evaluacion)));

  if (showsConContenido.length === 0 && !giraEvaluacionTieneContenido(giraEvaluacion)) return null;

  const shows: NotaShow[] = showsConContenido.map((s) => ({
    id: s.id,
    fecha: fmtFechaLarga(s.fecha),
    lugar: [s.ciudad, s.venue?.nombre].filter(Boolean).join(" · ") || null,
    temas: temasShowAPdf(parseGiraShowEvaluacion(s.evaluacion)),
  }));
  const temasGira = temasGiraAPdf(giraEvaluacion);
  const resumenGeneral = giraEvaluacion.resumenGeneral.trim() || null;
  const aciertos = giraEvaluacion.aciertos.trim() || null;
  const agradecimientos = giraEvaluacion.agradecimientos.trim() || null;

  const publicDir = path.join(process.cwd(), "public");

  const data: NotasAprendizajesData = {
    giraNombre: gira.nombre,
    artistaNombre: gira.artista.nombre,
    shows,
    resumenGeneral,
    temasGira,
    aciertos,
    agradecimientos,
    logoSrc: logoBase64(publicDir),
    logoArtistaSrc: await resolvePdfImage(gira.artista.logoUrl, publicDir),
    generadoEn: nowStr(),
  };

  const buf = await bufferDePdf(
    React.createElement(NotasAprendizajesPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>,
  );

  const slug = gira.nombre.replace(/[^\w-]+/g, "-");
  return { buf, filename: `NotasAprendizajes-${slug || gira.id}.pdf` };
}

export async function generarNotasShow(showId: string): Promise<PdfGira | null> {
  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: {
      id: true,
      fecha: true,
      ciudad: true,
      evaluacion: true,
      venue: { select: { nombre: true } },
      gira: { select: { nombre: true, artista: { select: { nombre: true, logoUrl: true } } } },
    },
  });
  if (!show) return null;

  const evaluacion = parseGiraShowEvaluacion(show.evaluacion);
  const temas = temasShowAPdf(evaluacion);
  if (temas.length === 0) return null;

  const publicDir = path.join(process.cwd(), "public");
  const subtitulo = [show.ciudad, show.venue?.nombre].filter(Boolean).join(" · ");

  const data: NotasShowData = {
    giraNombre: show.gira.nombre,
    artistaNombre: show.gira.artista.nombre,
    showTitulo: fmtFechaLarga(show.fecha),
    showSubtitulo: subtitulo || null,
    temas,
    logoSrc: logoBase64(publicDir),
    logoArtistaSrc: await resolvePdfImage(show.gira.artista.logoUrl, publicDir),
    generadoEn: nowStr(),
  };

  const buf = await bufferDePdf(
    React.createElement(NotasShowPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>,
  );

  const slug = `${show.gira.nombre}-${fmtFechaLarga(show.fecha)}`.replace(/[^\w-]+/g, "-");
  return { buf, filename: `NotasShow-${slug || show.id}.pdf` };
}
