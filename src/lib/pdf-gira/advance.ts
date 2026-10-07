// src/lib/pdf-gira/advance.ts
//
// El advance del show: quién pone qué, departamento por departamento. El PDF se
// manda al foro tal cual, así que aquí NO entra ni el costo ni el nombre del
// proveedor aunque el modelo los traiga: eso se queda del lado nuestro.

import React from "react";
import type { Document } from "@react-pdf/renderer";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  CUBIERTO_POR_LABEL,
  DISCIPLINAS,
  DISCIPLINA_LABEL,
  ESTADO_ADVANCE_LABEL,
  ESTADO_SHOW_LABEL,
  PRIORIDAD_LABEL,
  SEMAFORO_LABEL,
  fmtFechaHora,
  fmtFechaLarga,
  resumirAdvance,
} from "@/lib/giras";
import { fmtCantidad, panelDelShow, sigueAbierta } from "@/lib/advance-gira";
import { logoBase64, nowStr, resolvePdfImage } from "@/components/pdf/PdfShared";
import {
  AdvanceShowPDF,
  type AdvanceRepartoDoc,
  type AdvanceShowData,
} from "@/components/pdf/giras/AdvanceShowPDF";
import { bufferDePdf, type PdfGira } from "./render";

const ORDEN_DISCIPLINA: Record<string, number> = Object.fromEntries(DISCIPLINAS.map((d, i) => [d, i]));

export async function generarAdvanceShow(showId: string): Promise<PdfGira | null> {
  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    include: {
      venue: true,
      repartos: { orderBy: [{ orden: "asc" }, { createdAt: "asc" }] },
      gira: {
        select: {
          nombre: true,
          artista: { select: { nombre: true, logoUrl: true } },
          rider: { select: { nombre: true, version: true } },
        },
      },
    },
  });

  if (!show) return null;

  const resumen = resumirAdvance(
    show.repartos.map((r) => ({ prioridad: r.prioridad, estado: r.estado, cubiertoPor: r.cubiertoPor })),
  );

  const repartos: AdvanceRepartoDoc[] = [...show.repartos]
    .sort((a, b) => {
      const da = ORDEN_DISCIPLINA[a.disciplina] ?? 99;
      const db = ORDEN_DISCIPLINA[b.disciplina] ?? 99;
      if (da !== db) return da - db;
      return a.orden - b.orden;
    })
    .map((r) => ({
      id: r.id,
      disciplina: r.disciplina,
      disciplinaLabel: DISCIPLINA_LABEL[r.disciplina] ?? r.disciplina,
      descripcion: r.descripcion,
      cantidad: fmtCantidad(r.cantidad, r.unidad),
      especificaciones: r.especificaciones,
      prioridadLabel: PRIORIDAD_LABEL[r.prioridad] ?? r.prioridad,
      cubiertoPorLabel: CUBIERTO_POR_LABEL[r.cubiertoPor] ?? r.cubiertoPor,
      estadoLabel: ESTADO_ADVANCE_LABEL[r.estado] ?? r.estado,
      // Mismo criterio que el semáforo y que el advance consolidado, para que los
      // tres nunca se contradigan: confirmado o "no aplica" cuentan como cerrados.
      resuelto: !sigueAbierta(r),
      porConseguir: r.porConseguir,
      notas: r.notas,
    }));

  // Lo que el rider pide y no quedó en ningún renglón. El panel ya hace el cotejo
  // contra el rider de la gira; reproducirlo aquí lo dejaría desincronizado.
  const panel = await panelDelShow(showId);
  const sinRepartir = (panel?.disciplinas ?? []).flatMap((d) =>
    d.puntos
      .filter((p) => p.repartido === 0)
      .map((p) =>
        [`${fmtCantidad(p.cantidad, p.unidad)} ${p.concepto} (${d.label})`, p.especificaciones]
          .filter(Boolean)
          .join(" — "),
      ),
  );

  const ciudad = show.ciudad ?? show.venue?.ciudad ?? null;
  const publicDir = path.join(process.cwd(), "public");

  const data: AdvanceShowData = {
    giraNombre: show.gira.nombre,
    artistaNombre: show.gira.artista.nombre,
    riderNombre: show.gira.rider?.nombre ?? null,
    riderVersion: show.gira.rider?.version ?? null,
    fechaLarga: fmtFechaLarga(show.fecha),
    ciudad,
    estadoLabel: ESTADO_SHOW_LABEL[show.estado] ?? show.estado,
    venue: show.venue
      ? {
          nombre: show.venue.nombre,
          direccion: show.venue.direccion,
          contactoTecnicoNombre: show.venue.contactoTecnicoNombre,
          contactoTecnicoTelefono: show.venue.contactoTecnicoTelefono,
          contactoTecnicoEmail: show.venue.contactoTecnicoEmail,
          medidasEscenario: show.venue.medidasEscenario,
          voltajeDisponible: show.venue.voltajeDisponible,
          amperajeTotal: show.venue.amperajeTotal,
          fases: show.venue.fases,
          notasTecnicas: show.venue.notasTecnicas,
        }
      : null,
    resumen: {
      total: resumen.total,
      resueltas: resumen.resueltas,
      abiertas: resumen.abiertas,
      indispensablesTotal: resumen.indispensablesTotal,
      indispensablesResueltas: resumen.indispensablesResueltas,
      avance: resumen.avance,
      semaforoLabel: SEMAFORO_LABEL[resumen.semaforo] ?? resumen.semaforo,
    },
    cerradoEn: show.advanceCerradoEn ? fmtFechaHora(show.advanceCerradoEn) : null,
    repartos,
    sinRepartir,
    logoSrc: logoBase64(publicDir),
    logoArtistaSrc: await resolvePdfImage(show.gira.artista.logoUrl, publicDir),
    generadoEn: nowStr(),
  };

  const buf = await bufferDePdf(
    React.createElement(AdvanceShowPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>,
  );

  const slug = [ciudad, show.fecha.toISOString().slice(0, 10)].filter(Boolean).join("-").replace(/[^\w-]+/g, "");
  return { buf, filename: `Advance-${slug || show.id}.pdf` };
}
