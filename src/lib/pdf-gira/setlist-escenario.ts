// src/lib/pdf-gira/setlist-escenario.ts
//
// El setlist que se pega en el escenario. Se emite por setlist, no por gira ni
// por show: el base y la variante de una fecha son dos papeles distintos y los
// dos se pegan, así que cada uno tiene su propia descarga.
//
// Los bloques salen de segmentarSetlist, igual que en pantalla y que en el
// libro de gira: el papel del escenario y la pantalla del tour manager no
// pueden numerar distinto.

import React from "react";
import type { Document } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { fmtFechaCorta, segmentarSetlist, TIPO_FILA_SETLIST_LABEL } from "@/lib/giras";
import {
  SetlistEscenarioPDF,
  type RenglonEscenario,
  type SetlistEscenarioData,
} from "@/components/pdf/giras/SetlistEscenarioPDF";
import { bufferDePdf, type PdfGira } from "./render";

function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function generarSetlistEscenario(setlistId: string): Promise<PdfGira | null> {
  const setlist = await prisma.giraSetlist.findUnique({
    where: { id: setlistId },
    select: {
      id: true,
      nombre: true,
      esBase: true,
      gira: { select: { nombre: true, slug: true, artista: { select: { nombre: true } } } },
      show: { select: { fecha: true, ciudad: true } },
      canciones: { orderBy: { orden: "asc" } },
    },
  });
  if (!setlist) return null;

  const renglones: RenglonEscenario[] = [];
  let canciones = 0;

  for (const seg of segmentarSetlist(setlist.canciones)) {
    if (seg.clase === "momento") {
      const c = seg.fila;
      const etiqueta = TIPO_FILA_SETLIST_LABEL[c.tipo] ?? c.tipo;
      renglones.push({
        id: c.id,
        posicion: null,
        // El título repetido ("Pausa" bajo la etiqueta Pausa) no dice nada: se
        // imprime uno solo.
        titulo: c.titulo.trim().toLowerCase() === etiqueta.toLowerCase() ? etiqueta : `${etiqueta} · ${c.titulo}`,
        detalle: c.notas,
        bloque: null,
        bloqueNombre: null,
        color: null,
        abreBloque: false,
      });
      continue;
    }

    for (const [i, c] of seg.canciones.entries()) {
      canciones += 1;
      renglones.push({
        id: c.fila.id,
        posicion: c.posicion,
        titulo: c.fila.titulo,
        detalle: null,
        bloque: seg.numero,
        bloqueNombre: i === 0 ? seg.nombre : null,
        color: seg.color,
        abreBloque: i === 0,
      });
    }
  }

  const contexto = setlist.show
    ? [fmtFechaCorta(setlist.show.fecha), setlist.show.ciudad].filter(Boolean).join(" · ")
    : setlist.esBase
      ? "Base de la gira"
      : setlist.nombre;

  const data: SetlistEscenarioData = {
    artista: setlist.gira.artista.nombre,
    contexto,
    totalCanciones: canciones,
    renglones,
  };

  const sufijo = setlist.show
    ? slugify([fmtFechaCorta(setlist.show.fecha), setlist.show.ciudad].filter(Boolean).join("-"))
    : setlist.esBase
      ? "base"
      : slugify(setlist.nombre);

  return {
    buf: await bufferDePdf(
      React.createElement(SetlistEscenarioPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>,
    ),
    filename: `Setlist-${setlist.gira.slug ?? slugify(setlist.gira.nombre)}-${sufijo}.pdf`,
  };
}
