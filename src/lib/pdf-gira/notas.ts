// src/lib/pdf-gira/notas.ts
//
// Notas y aprendizajes de la gira: un solo PDF que junta lo de cada show con
// contenido y, al final, la autocrítica general. Si ni la gira ni ningún show
// tienen nada capturado, no hay documento que emitir.

import React from "react";
import type { Document } from "@react-pdf/renderer";
import path from "path";
import { prisma } from "@/lib/prisma";
import { fmtFechaLarga } from "@/lib/giras";
import {
  CAMPOS_EVALUACION_GIRA,
  CAMPOS_EVALUACION_SHOW,
  giraEvaluacionTieneContenido,
  showEvaluacionTieneContenido,
  type GiraEvaluacionData,
  type GiraShowEvaluacionData,
} from "@/lib/gira-evaluacion";
import { logoBase64, nowStr, resolvePdfImage } from "@/components/pdf/PdfShared";
import { NotasAprendizajesPDF, type NotaShow, type NotasAprendizajesData } from "@/components/pdf/giras/NotasAprendizajesPDF";
import { bufferDePdf, type PdfGira } from "./render";

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

  const giraEvaluacion = gira.evaluacion as GiraEvaluacionData | null;
  const showsConContenido = gira.shows.filter((s) => showEvaluacionTieneContenido(s.evaluacion as GiraShowEvaluacionData | null));

  if (showsConContenido.length === 0 && !giraEvaluacionTieneContenido(giraEvaluacion)) return null;

  const shows: NotaShow[] = showsConContenido.map((s) => {
    const evaluacion = s.evaluacion as GiraShowEvaluacionData;
    return {
      id: s.id,
      titulo: [fmtFechaLarga(s.fecha), [s.ciudad, s.venue?.nombre].filter(Boolean).join(" · ")].filter(Boolean).join(" — "),
      campos: CAMPOS_EVALUACION_SHOW.map((c) => ({ label: c.label, texto: evaluacion[c.id] })),
    };
  });

  const giraCampos = CAMPOS_EVALUACION_GIRA.map((c) => ({
    label: c.label,
    texto: giraEvaluacion ? giraEvaluacion[c.id] : null,
  }));

  const publicDir = path.join(process.cwd(), "public");

  const data: NotasAprendizajesData = {
    giraNombre: gira.nombre,
    artistaNombre: gira.artista.nombre,
    shows,
    giraCampos,
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
