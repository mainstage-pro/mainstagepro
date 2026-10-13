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
import { fmtFechaCorta, segmentarSetlist, tituloDeFila, TIPO_FILA_SETLIST_LABEL } from "@/lib/giras";
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
    for (const r of seg.renglones) {
      // El bloque puede abrir con una pausa o con la propia canción: la barra
      // se pinta en la fila que de verdad lo ancla, no en la primera del tipo
      // que sea.
      const esAncla = r.fila.id === seg.anclaId;

      if (r.clase === "momento") {
        const c = r.fila;
        const etiqueta = TIPO_FILA_SETLIST_LABEL[c.tipo] ?? c.tipo;
        renglones.push({
          id: c.id,
          posicion: null,
          // El título repetido ("Pausa" bajo la etiqueta Pausa) no dice nada: se
          // imprime uno solo.
          titulo: c.titulo.trim().toLowerCase() === etiqueta.toLowerCase() ? etiqueta : `${etiqueta} · ${c.titulo}`,
          detalle: c.notas,
          bloque: esAncla ? seg.numero : null,
          bloqueNombre: esAncla ? seg.nombre : null,
          color: esAncla ? seg.color : null,
          abreBloque: esAncla,
        });
        continue;
      }

      canciones += 1;
      renglones.push({
        id: r.fila.id,
        posicion: r.posicion,
        titulo: tituloDeFila(r.fila.titulo, r.fila.artistaInvitado),
        detalle: r.fila.notas,
        bloque: seg.numero,
        bloqueNombre: esAncla ? seg.nombre : null,
        color: seg.color,
        abreBloque: esAncla,
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
