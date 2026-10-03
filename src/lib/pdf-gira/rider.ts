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
  CONTEXTO_RIDER_LABEL,
  DISCIPLINAS,
  DISCIPLINA_LABEL,
  PRIORIDAD_LABEL,
  PROVISTO_POR_LABEL,
  ROL_PERSONA_LABEL,
  SOPORTE_MIC_LABEL,
  TIPO_ARCHIVO_RIDER_LABEL,
  TIPO_FORMACION_LABEL,
  TIPO_SALIDA_LABEL,
  UNIDAD_RIDER_LABEL,
  esImagenArchivo,
} from "@/lib/giras";
import { logoBase64, nowStr, resolvePdfImage } from "@/components/pdf/PdfShared";
import {
  PortadaAnexosPDF,
  RiderArtistaPDF,
  type RiderAnexoDoc,
  type RiderArtistaData,
  type RiderContactoDoc,
  type RiderLineaDoc,
} from "@/components/pdf/giras/RiderArtistaPDF";
import {
  ListaCanalesPDF,
  type CanalInput,
  type CanalOutput,
  type ListaCanalesData,
} from "@/components/pdf/giras/ListaCanalesPDF";
import { leerPdfAnexo, resolverImagenAnexo, unirPdfs } from "./anexos";
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
      contactos: { where: { enPdf: true }, orderBy: [{ orden: "asc" }, { createdAt: "asc" }] },
      archivos: { where: { incluirEnPdf: true }, orderBy: [{ orden: "asc" }, { createdAt: "asc" }] },
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

/// Contactos y anexos del rider, ya resueltos para el documento. Los anexos en
/// PDF no se dibujan: se separan para pegarlos al final del buffer.
function leerContactos(rider: RiderCompleto): RiderContactoDoc[] {
  return rider.contactos.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    rolLabel: ROL_PERSONA_LABEL[c.rol] ?? c.rol,
    telefono: c.telefono,
    email: c.email,
    notas: c.notas,
  }));
}

async function leerAnexos(
  rider: RiderCompleto,
  publicDir: string,
): Promise<{ imagenes: RiderAnexoDoc[]; pdfs: { id: string; nombre: string; tipoLabel: string; notas: string | null; url: string }[] }> {
  const imagenes: RiderAnexoDoc[] = [];
  const pdfs: { id: string; nombre: string; tipoLabel: string; notas: string | null; url: string }[] = [];

  for (const a of rider.archivos) {
    const tipoLabel = TIPO_ARCHIVO_RIDER_LABEL[a.tipo] ?? a.tipo;
    if (esImagenArchivo(a.url, a.mime)) {
      const img = await resolverImagenAnexo(a.url, publicDir);
      // Si la imagen no se pudo leer se cae a la lista de adjuntos: el rider dice
      // que existe un plano en vez de callárselo.
      if (img) {
        imagenes.push({
          id: a.id,
          nombre: a.nombre,
          tipoLabel,
          notas: a.notas,
          imagenSrc: img.dataUri,
          proporcion: img.proporcion,
        });
        continue;
      }
    }
    pdfs.push({ id: a.id, nombre: a.nombre, tipoLabel, notas: a.notas, url: a.url });
  }

  return { imagenes, pdfs };
}

/// Pega los anexos en PDF después del documento, con su portada. Los que no se
/// puedan descargar se ignoran: el rider sale igual.
async function anexarPdfs(
  base: Buffer,
  rider: RiderCompleto,
  pdfs: { id: string; nombre: string; tipoLabel: string; notas: string | null; url: string }[],
  publicDir: string,
): Promise<Buffer> {
  if (pdfs.length === 0) return base;

  const leidos: { meta: (typeof pdfs)[number]; bytes: Buffer }[] = [];
  for (const p of pdfs) {
    const bytes = await leerPdfAnexo(p.url, publicDir);
    if (bytes) leidos.push({ meta: p, bytes });
  }
  if (leidos.length === 0) return base;

  const portada = await bufferDePdf(
    React.createElement(PortadaAnexosPDF, {
      data: {
        artistaNombre: rider.artista.nombre,
        riderNombre: rider.nombre,
        version: rider.version,
        logoSrc: logoBase64(publicDir),
        generadoEn: nowStr(),
      },
      anexos: leidos.map((l) => l.meta),
    }) as React.ReactElement<React.ComponentProps<typeof Document>>,
  );

  return unirPdfs([base, portada, ...leidos.map((l) => l.bytes)]);
}

/// Resuelve el rider a imprimir desde una gira: el enganchado o, en su defecto,
/// el vigente del artista. Con riders por contexto puede haber varios vigentes a
/// la vez, así que se prefiere el general y, si no hay, el más reciente: la gira
/// que quiera el de festival lo engancha explícitamente.
export async function riderDeGira(giraId: string): Promise<{ riderId: string; giraNombre: string } | null> {
  const gira = await prisma.gira.findUnique({
    where: { id: giraId },
    select: { nombre: true, riderId: true, artistaId: true },
  });
  if (!gira) return null;
  if (gira.riderId) return { riderId: gira.riderId, giraNombre: gira.nombre };

  const vigentes = await prisma.artistaRider.findMany({
    where: { artistaId: gira.artistaId, activo: true, esActivo: true },
    orderBy: { version: "desc" },
    select: { id: true, contexto: true },
  });
  const elegido = vigentes.find((r) => r.contexto === "GENERAL") ?? vigentes[0];
  return elegido ? { riderId: elegido.id, giraNombre: gira.nombre } : null;
}

export async function generarRiderArtista(riderId: string, giraNombre: string | null): Promise<PdfGira | null> {
  const rider = await leerRider(riderId);
  if (!rider) return null;

  const publicDir = path.join(process.cwd(), "public");
  const nombreArchivo = `Rider-${slugArchivo(rider.artista.nombre)}-v${rider.version}.pdf`;

  // Rider cargado: el documento es el del artista. No se re-maqueta (perdería el
  // formato que ellos negocian) pero sí se le pegan los anexos que se hayan
  // subido aparte, que es lo que hace falta al mandarlo.
  if (rider.origen === "CARGADO" && rider.archivoUrl) {
    const original = await leerPdfAnexo(rider.archivoUrl, publicDir);
    if (original) {
      const { pdfs } = await leerAnexos(rider, publicDir);
      const buf = await anexarPdfs(original, rider, pdfs, publicDir);
      return { buf, filename: rider.archivoNombre || nombreArchivo };
    }
  }

  const { inputs, outputs } = partirCanales(rider);
  const { imagenes, pdfs } = await leerAnexos(rider, publicDir);

  const data: RiderArtistaData = {
    artistaNombre: rider.artista.nombre,
    tipoFormacionLabel: rider.artista.tipoFormacion
      ? (TIPO_FORMACION_LABEL[rider.artista.tipoFormacion] ?? rider.artista.tipoFormacion)
      : null,
    riderNombre: rider.nombre,
    version: rider.version,
    esActivo: rider.esActivo,
    contextoLabel: CONTEXTO_RIDER_LABEL[rider.contexto] ?? rider.contexto,
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
    contactos: leerContactos(rider),
    anexos: imagenes,
    logoSrc: logoBase64(publicDir),
    logoArtistaSrc: await resolvePdfImage(rider.artista.logoUrl, publicDir),
    generadoEn: nowStr(),
  };

  const base = await bufferDePdf(
    React.createElement(RiderArtistaPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>,
  );

  const buf = await anexarPdfs(base, rider, pdfs, publicDir);
  return { buf, filename: nombreArchivo };
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
