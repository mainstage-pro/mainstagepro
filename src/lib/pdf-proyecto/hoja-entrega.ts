import { prisma } from "@/lib/prisma";
import { Document } from "@react-pdf/renderer";
import { HojaEntregaRentaPDF } from "@/components/HojaEntregaRentaPDF";
import { makePdfImageResolver } from "@/components/pdf/PdfShared";
import { notaVisibleDeCotizacion } from "@/lib/notas-equipos";
import { resumenMontaje } from "@/lib/montaje-reportes";
import { bufferDePdf, type PdfProyecto } from "./render";
import React from "react";
import path from "path";
import fs from "fs";

export async function generarHojaEntrega(id: string): Promise<PdfProyecto | null> {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      cliente: { select: { nombre: true, empresa: true, telefono: true } },
      trato: { select: { ideasReferencias: true } },
      cotizacion: {
        select: {
          numeroCotizacion: true,
          observaciones: true,
          notasSecciones: true,
          lineas: {
            where: { tipo: { in: ["EQUIPO_PROPIO", "EQUIPO_EXTERNO", "PAQUETE", "OTRO"] } },
            select: {
              id: true, tipo: true, descripcion: true, marca: true, modelo: true, cantidad: true, notas: true,
              equipo: { select: { imagenUrl: true } },
            },
            orderBy: { orden: "asc" },
          },
        },
      },
      equipos: {
        // Lo que se quitó de la cotización no se entrega ni se firma.
        where: { necesitaRevision: false },
        include: {
          equipo: {
            select: {
              descripcion: true,
              marca: true,
              modelo: true,
              imagenUrl: true,
              categoria: { select: { nombre: true, disciplina: true } },
            },
          },
          riderAccesorios: {
            select: { nombre: true, cantidad: true, categoria: true },
            orderBy: { orden: "asc" },
          },
          posiciones: { orderBy: { orden: "asc" } },
        },
        orderBy: [{ equipo: { categoriaId: "asc" } }, { id: "asc" }],
      },
    },
  });

  if (!proyecto) return null;

  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const resolveImg = makePdfImageResolver(path.join(process.cwd(), "public"));
  const equipos = await Promise.all(
    proyecto.equipos.map(async (pe) => ({
      ...pe,
      montaje: resumenMontaje(pe.posiciones, pe.equipo?.categoria?.nombre, pe.equipo?.categoria?.disciplina),
      equipo: pe.equipo
        ? { ...pe.equipo, imagenUrl: await resolveImg(pe.equipo.imagenUrl) }
        : null,
    }))
  );

  const lineasCotizacion = await Promise.all(
    (proyecto.cotizacion?.lineas ?? []).map(async (l) => ({
      ...l,
      notas: notaVisibleDeCotizacion(l.notas),
      imagenUrl: await resolveImg(l.equipo?.imagenUrl ?? null),
    }))
  );

  const proyectoData = {
    ...proyecto,
    equipos,
    cotizacion: proyecto.cotizacion
      ? {
          ...proyecto.cotizacion,
          lineas: lineasCotizacion,
        }
      : null,
    fechaEvento: proyecto.fechaEvento?.toISOString() ?? null,
    tratoIdeasReferencias: proyecto.trato?.ideasReferencias ?? null,
  };

  const buf = await bufferDePdf(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(HojaEntregaRentaPDF, { proyecto: proyectoData as any, logoSrc }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  return { buf, filename: `HojaEntrega-${proyecto.numeroProyecto}.pdf` };
}
