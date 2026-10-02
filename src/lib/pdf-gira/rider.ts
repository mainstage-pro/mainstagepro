// src/lib/pdf-gira/rider.ts
//
// El rider técnico del artista y las listas de canales. Las dos lecturas salen
// del mismo rider maestro versionado, así que viven en el mismo archivo: si
// mañana cambia cómo se ordenan los canales, cambia en un solo lugar.

import React from "react";
import type { Document } from "@react-pdf/renderer";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  DISCIPLINAS,
  DISCIPLINA_LABEL,
  PRIORIDAD_LABEL,
  PROVISTO_POR_LABEL,
  SOPORTE_MIC_LABEL,
  TIPO_FORMACION_LABEL,
  TIPO_SALIDA_LABEL,
  UNIDAD_RIDER_LABEL,
} from "@/lib/giras";
import { logoBase64, nowStr, resolvePdfImage } from "@/components/pdf/PdfShared";
import { RiderArtistaPDF, type RiderArtistaData, type RiderLineaDoc } from "@/components/pdf/giras/RiderArtistaPDF";
import {
  ListaCanalesPDF,
  type CanalInput,
  type CanalOutput,
  type ListaCanalesData,
} from "@/components/pdf/giras/ListaCanalesPDF";
import { bufferDePdf, type PdfGira } from "./render";

const ORDEN_DISCIPLINA: Record<string, number> = Object.fromEntries(DISCIPLINAS.map((d, i) => [d, i]));

type RiderCompleto = NonNullable<Awaited<ReturnType<typeof leerRider>>>;

/// El rider de una gira es el que trae enganchado; si la gira no trae ninguno se
/// cae al rider activo del artista, que es el que el tour manager espera ver.
async function leerRider(riderId: string) {
  return prisma.artistaRider.findUnique({
    where: { id: riderId },
    include: {
      artista: { select: { nombre: true, logoUrl: true, tipoFormacion: true } },
      canales: {
        orderBy: [{ tipo: "asc" }, { numero: "asc" }],
        include: { persona: { select: { nombre: true } } },
      },
      lineas: { orderBy: [{ orden: "asc" }, { createdAt: "asc" }] },
    },
  });
}

function slugArchivo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function partirCanales(rider: RiderCompleto): { inputs: CanalInput[]; outputs: CanalOutput[] } {
  const inputs: CanalInput[] = rider.canales
    .filter((c) => c.tipo === "INPUT")
    .map((c) => ({
      id: c.id,
      numero: c.numero,
      nombre: c.nombre,
      instrumento: c.instrumento,
      microfono: c.microfono,
      alternativas: c.alternativas,
      soporteLabel: c.soporte ? (SOPORTE_MIC_LABEL[c.soporte] ?? c.soporte) : null,
      phantom: c.phantom,
      inserto: c.inserto,
      notas: c.notas,
    }));

  const outputs: CanalOutput[] = rider.canales
    .filter((c) => c.tipo === "OUTPUT")
    .map((c) => ({
      id: c.id,
      numero: c.numero,
      nombre: c.nombre,
      tipoSalidaLabel: c.tipoSalida ? (TIPO_SALIDA_LABEL[c.tipoSalida] ?? c.tipoSalida) : null,
      estereo: c.estereo,
      paraQuien: c.persona ? c.persona.nombre : null,
      notas: c.notas,
    }));

  return { inputs, outputs };
}

/// Los renglones se agrupan por disciplina en el orden del vocabulario, no por
/// orden de captura: así la casa reparte el rider entre su gente de audio y su
/// gente de luces sin leerlo completo.
function lineasPorDisciplina(rider: RiderCompleto): RiderLineaDoc[] {
  return [...rider.lineas]
    .sort((a, b) => {
      const da = ORDEN_DISCIPLINA[a.disciplina] ?? 99;
      const db = ORDEN_DISCIPLINA[b.disciplina] ?? 99;
      if (da !== db) return da - db;
      return a.orden - b.orden;
    })
    .map((l) => ({
      id: l.id,
      disciplinaLabel: DISCIPLINA_LABEL[l.disciplina] ?? l.disciplina,
      concepto: l.concepto,
      cantidad: l.cantidad,
      unidadLabel: l.unidad ? (UNIDAD_RIDER_LABEL[l.unidad] ?? l.unidad) : "pza",
      preferido: l.preferido,
      aceptables: l.aceptables,
      noAceptable: l.noAceptable,
      prioridadLabel: PRIORIDAD_LABEL[l.prioridad] ?? l.prioridad,
      provistoPorLabel: PROVISTO_POR_LABEL[l.provistoPor] ?? l.provistoPor,
      notas: l.notas,
    }));
}

/// Resuelve el rider a imprimir desde una gira: el enganchado o, en su defecto,
/// el activo del artista de la gira.
export async function riderDeGira(giraId: string): Promise<{ riderId: string; giraNombre: string } | null> {
  const gira = await prisma.gira.findUnique({
    where: { id: giraId },
    select: { nombre: true, riderId: true, artistaId: true },
  });
  if (!gira) return null;
  if (gira.riderId) return { riderId: gira.riderId, giraNombre: gira.nombre };

  const activo = await prisma.artistaRider.findFirst({
    where: { artistaId: gira.artistaId, activo: true, esActivo: true },
    orderBy: { version: "desc" },
    select: { id: true },
  });
  return activo ? { riderId: activo.id, giraNombre: gira.nombre } : null;
}

export async function generarRiderArtista(riderId: string, giraNombre: string | null): Promise<PdfGira | null> {
  const rider = await leerRider(riderId);
  if (!rider) return null;

  const publicDir = path.join(process.cwd(), "public");
  const { inputs, outputs } = partirCanales(rider);

  const data: RiderArtistaData = {
    artistaNombre: rider.artista.nombre,
    tipoFormacionLabel: rider.artista.tipoFormacion
      ? (TIPO_FORMACION_LABEL[rider.artista.tipoFormacion] ?? rider.artista.tipoFormacion)
      : null,
    riderNombre: rider.nombre,
    version: rider.version,
    esActivo: rider.esActivo,
    formacion: rider.formacion,
    giraNombre,
    requerimientosGenerales: rider.requerimientosGenerales,
    notas: [
      { label: "FOH", texto: rider.notasFoh },
      { label: "Monitoreo", texto: rider.notasMonitoreo },
      { label: "Backline", texto: rider.notasBackline },
      { label: "Iluminación", texto: rider.notasIluminacion },
      { label: "Video", texto: rider.notasVideo },
      { label: "Energía", texto: rider.notasEnergia },
      { label: "Escenario", texto: rider.notasEscenario },
      { label: "Hospitalidad", texto: rider.notasHospitalidad },
      { label: "Crew requerido", texto: rider.notasCrewRequerido },
    ],
    escenario: {
      anchoM: rider.escenarioAnchoM,
      profundoM: rider.escenarioProfundoM,
      alturaM: rider.escenarioAlturaM,
      stagePlotUrl: rider.stagePlotUrl,
    },
    canalesMinimos: rider.canalesMinimos,
    mixesMonitor: rider.mixesMonitor,
    tiempoSoundcheckMin: rider.tiempoSoundcheckMin,
    tiempoCambioMin: rider.tiempoCambioMin,
    lineas: lineasPorDisciplina(rider),
    inputs,
    outputs,
    logoSrc: logoBase64(publicDir),
    logoArtistaSrc: await resolvePdfImage(rider.artista.logoUrl, publicDir),
    generadoEn: nowStr(),
  };

  const buf = await bufferDePdf(
    React.createElement(RiderArtistaPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>,
  );

  return { buf, filename: `Rider-${slugArchivo(rider.artista.nombre)}-v${rider.version}.pdf` };
}

export async function generarListaCanales(riderId: string, giraNombre: string | null): Promise<PdfGira | null> {
  const rider = await leerRider(riderId);
  if (!rider) return null;

  const publicDir = path.join(process.cwd(), "public");
  const { inputs, outputs } = partirCanales(rider);

  const data: ListaCanalesData = {
    artistaNombre: rider.artista.nombre,
    riderNombre: rider.nombre,
    version: rider.version,
    giraNombre,
    inputs,
    outputs,
    logoSrc: logoBase64(publicDir),
    logoArtistaSrc: await resolvePdfImage(rider.artista.logoUrl, publicDir),
    generadoEn: nowStr(),
  };

  const buf = await bufferDePdf(
    React.createElement(ListaCanalesPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>,
  );

  return { buf, filename: `InputList-${slugArchivo(rider.artista.nombre)}-v${rider.version}.pdf` };
}
