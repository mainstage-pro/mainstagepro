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
import { condensarTextosLargos } from "./resumen-ia";
import { bufferDePdf, type PdfGira } from "./render";

// Saca, en el mismo orden en que `reconstruirTemas` los vuelve a repartir, los
// textos libres de uno o varios juegos de temas (falla/solución/propuesta de
// cada hallazgo + el comentario del tema), más los textos sueltos del cierre
// del documento (resumen ejecutivo, aciertos, agradecimientos).
function extraerTextosTemas(gruposDeTemas: TemaPdf[][], extras: (string | null)[] = []): string[] {
  const acc: string[] = [];
  for (const temas of gruposDeTemas) {
    for (const t of temas) {
      for (const h of t.hallazgos) acc.push(h.falla, h.solucion, h.propuestaMejora);
      acc.push(t.comentarios ?? "");
    }
  }
  acc.push(...extras.map((e) => e ?? ""));
  return acc;
}

function reconstruirTemas(temas: TemaPdf[], condensados: string[], cursor: { i: number }): TemaPdf[] {
  return temas.map((t) => ({
    ...t,
    hallazgos: t.hallazgos.map((h) => ({
      ...h,
      falla: condensados[cursor.i++] || h.falla,
      solucion: condensados[cursor.i++] || h.solucion,
      propuestaMejora: condensados[cursor.i++] || h.propuestaMejora,
    })),
    comentarios: condensados[cursor.i++] || t.comentarios,
  }));
}

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

  const showsRaw = showsConContenido.map((s) => ({
    id: s.id,
    fecha: fmtFechaLarga(s.fecha),
    lugar: [s.ciudad, s.venue?.nombre].filter(Boolean).join(" · ") || null,
    temas: temasShowAPdf(parseGiraShowEvaluacion(s.evaluacion)),
  }));
  const temasGiraRaw = temasGiraAPdf(giraEvaluacion);
  const extrasRaw: (string | null)[] = [
    giraEvaluacion.resumenGeneral.trim() || null,
    giraEvaluacion.aciertos.trim() || null,
    giraEvaluacion.agradecimientos.trim() || null,
  ];

  // Un solo lote a la IA por todo el documento: cada hallazgo, comentario y
  // texto de cierre que sea largo sale condensado; lo corto se queda igual.
  const condensados = await condensarTextosLargos(
    extraerTextosTemas([...showsRaw.map((s) => s.temas), temasGiraRaw], extrasRaw),
  );
  const cursor = { i: 0 };
  const shows: NotaShow[] = showsRaw.map((s) => ({ ...s, temas: reconstruirTemas(s.temas, condensados, cursor) }));
  const temasGira = reconstruirTemas(temasGiraRaw, condensados, cursor);
  const resumenGeneral = condensados[cursor.i++] || extrasRaw[0];
  const aciertos = condensados[cursor.i++] || extrasRaw[1];
  const agradecimientos = condensados[cursor.i++] || extrasRaw[2];

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
  const temasRaw = temasShowAPdf(evaluacion);
  if (temasRaw.length === 0) return null;

  const condensados = await condensarTextosLargos(extraerTextosTemas([temasRaw]));
  const temas = reconstruirTemas(temasRaw, condensados, { i: 0 });

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
