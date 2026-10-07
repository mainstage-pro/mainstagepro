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
  DISCIPLINA_LABEL,
  PRIORIDAD_LABEL,
  PROVISTO_POR_LABEL,
  ROL_PERSONA_LABEL,
  SECCIONES_RIDER,
  SOPORTE_MIC_LABEL,
  TIPO_ARCHIVO_RIDER_LABEL,
  TIPO_BLOQUE_LABEL,
  TIPO_FORMACION_LABEL,
  TIPO_SALIDA_LABEL,
  UNIDAD_RIDER_LABEL,
  esImagenArchivo,
  fmtFechaLarga,
  leerSeccionesExtra,
} from "@/lib/giras";
import { listasDelShow } from "@/lib/show-canales";
import { logoBase64, nowStr, resolvePdfImage } from "@/components/pdf/PdfShared";
import {
  PortadaAnexosPDF,
  RiderArtistaPDF,
  type RiderAnexoDoc,
  type RiderArtistaData,
  type RiderBloqueDoc,
  type RiderContactoDoc,
  type RiderLineaDoc,
  type RiderSeccionDoc,
} from "@/components/pdf/giras/RiderArtistaPDF";
import {
  ListaCanalesPDF,
  type CanalInput,
  type CanalOutput,
  type ListaCanalesData,
} from "@/components/pdf/giras/ListaCanalesPDF";
import { leerPdfAnexo, resolverImagenAnexo, unirPdfs } from "./anexos";
import { bufferDePdf, type PdfGira } from "./render";

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
      bloques: { orderBy: [{ orden: "asc" }, { createdAt: "asc" }] },
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

function aLineaDoc(l: RiderCompleto["lineas"][number]): RiderLineaDoc {
  return {
    id: l.id,
    concepto: l.concepto,
    cantidad: l.cantidad,
    unidadLabel: l.unidad ? (UNIDAD_RIDER_LABEL[l.unidad] ?? l.unidad) : "pza",
    preferido: l.preferido,
    aceptables: l.aceptables,
    noAceptable: l.noAceptable,
    // En un rider todo lo listado es requerido; lo que sí admite negociación es
    // lo que tiene que decirlo. Marcar también los indispensables llenaría la
    // columna de una palabra repetida que nadie lee.
    prioridadLabel: l.prioridad === "INDISPENSABLE" ? null : (PRIORIDAD_LABEL[l.prioridad] ?? l.prioridad),
    provistoPorLabel: PROVISTO_POR_LABEL[l.provistoPor] ?? l.provistoPor,
    notas: l.notas,
  };
}

/// El documento se arma sección por sección, en el orden del vocabulario: cada
/// departamento con su párrafo y enseguida su lista de equipo. Es como se lee un
/// rider y es lo que permite repartirlo entre el ingeniero de audio y el jefe de
/// luces sin que ninguno lea el documento completo.
function seccionesDelRider(rider: RiderCompleto): RiderSeccionDoc[] {
  const porDepartamento = new Map<string, RiderLineaDoc[]>();
  for (const l of [...rider.lineas].sort((a, b) => a.orden - b.orden)) {
    const lista = porDepartamento.get(l.disciplina);
    if (lista) lista.push(aLineaDoc(l));
    else porDepartamento.set(l.disciplina, [aLineaDoc(l)]);
  }

  const secciones: RiderSeccionDoc[] = [];

  for (const s of SECCIONES_RIDER) {
    const notas = s.notas
      .map((n) => ({ label: n.label, texto: (rider[n.campo as keyof RiderCompleto] as string | null) ?? null }))
      .filter((n): n is { label: string | null; texto: string } => Boolean(n.texto?.trim()));
    const lineas = porDepartamento.get(s.departamento) ?? [];
    porDepartamento.delete(s.departamento);
    if (notas.length === 0 && lineas.length === 0) continue;
    secciones.push({ clave: s.departamento, titulo: s.titulo, notas, lineas });
  }

  // Un departamento que no está en el vocabulario (dato viejo, importación) no
  // se calla: se imprime al final con su propio nombre. Perder renglones de un
  // rider es peor que imprimir una sección fea.
  for (const [departamento, lineas] of porDepartamento) {
    secciones.push({
      clave: departamento,
      titulo: DISCIPLINA_LABEL[departamento] ?? departamento,
      notas: [],
      lineas,
    });
  }

  for (const extra of leerSeccionesExtra(rider.seccionesExtra)) {
    if (!extra.contenido?.trim()) continue;
    secciones.push({
      clave: `extra-${extra.id}`,
      titulo: extra.titulo?.trim() || "Sección adicional",
      notas: [{ label: null, texto: extra.contenido }],
      lineas: [],
    });
  }

  return secciones;
}

/// Los bloques sin duración son previos que el venue deja listos antes del
/// arribo: no consumen el llamado del crew, así que se imprimen como "previo"
/// en vez de un hueco que alguien tendría que interpretar.
function bloquesDelRider(rider: RiderCompleto): RiderBloqueDoc[] {
  return rider.bloques.map((b) => ({
    id: b.id,
    titulo: b.titulo,
    tipoLabel: TIPO_BLOQUE_LABEL[b.tipo] ?? b.tipo,
    duracionLabel: b.duracionMin ? `${b.duracionMin} min` : "Previo",
    responsable: b.responsable,
    contenido: b.contenido,
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

export async function generarRiderArtista(riderId: string, giraNombre: string | null): Promise<PdfGira | null> {
  const rider = await leerRider(riderId);
  if (!rider) return null;

  const publicDir = path.join(process.cwd(), "public");
  const nombreArchivo = `Rider-${slugArchivo(rider.artista.nombre)}-v${rider.version}.pdf`;

  // El PDF que mandó el artista se queda adjunto en su ficha para consulta y no
  // sale por aquí: el documento de la casa siempre se maqueta con lo que esté
  // capturado en la ficha, que es la transcripción del suyo.
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
    bloques: bloquesDelRider(rider),
    secciones: seccionesDelRider(rider),
    totalLineas: rider.lineas.length,
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

/// Qué fecha es, para que el papel no se confunda con el de otra plaza. Mismo
/// armado que el encabezado del setlist de la fecha.
async function contextoDeFecha(showId: string): Promise<string | null> {
  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { fecha: true, ciudad: true, venue: { select: { nombre: true, ciudad: true } } },
  });
  if (!show) return null;
  return (
    [fmtFechaLarga(show.fecha), show.ciudad ?? show.venue?.ciudad, show.venue?.nombre]
      .filter(Boolean)
      .join(" · ") || null
  );
}

/// Las dos listas tal como quedan en una fecha: el rider maestro más lo que los
/// invitados de ese show agregaron a la cola. Es la misma unificación que ve la
/// pestaña Invitados, así que el papel que recibe el ingeniero del venue dice
/// exactamente lo que la app muestra.
async function canalesDeLaFecha(showId: string): Promise<{ inputs: CanalInput[]; outputs: CanalOutput[] }> {
  const { inputs, outputs } = await listasDelShow(showId);
  return {
    inputs: inputs.map((f) => ({
      id: f.id,
      numero: f.numero,
      nombre: f.nombre,
      instrumento: f.instrumento,
      microfono: f.microfono,
      alternativas: f.alternativas,
      soporteLabel: f.soporte ? (SOPORTE_MIC_LABEL[f.soporte] ?? f.soporte) : null,
      phantom: f.phantom,
      inserto: f.inserto,
      notas: f.notas,
    })),
    outputs: outputs.map((f) => ({
      id: f.id,
      numero: f.numero,
      nombre: f.nombre,
      tipoSalidaLabel: f.tipoSalida ? (TIPO_SALIDA_LABEL[f.tipoSalida] ?? f.tipoSalida) : null,
      estereo: f.estereo,
      paraQuien: f.paraQuien,
      notas: f.notas,
    })),
  };
}

export async function generarListaCanales(
  riderId: string,
  giraNombre: string | null,
  /// Si se emite desde una fecha, la lista incluye los canales de los invitados
  /// de ese show. Sin él sale la del rider maestro, que es la de toda la gira.
  showId?: string | null,
): Promise<PdfGira | null> {
  const rider = await leerRider(riderId);
  if (!rider) return null;

  const publicDir = path.join(process.cwd(), "public");
  const { inputs, outputs } = showId ? await canalesDeLaFecha(showId) : partirCanales(rider);
  const fecha = showId ? await contextoDeFecha(showId) : null;

  const data: ListaCanalesData = {
    artistaNombre: rider.artista.nombre,
    riderNombre: rider.nombre,
    version: rider.version,
    giraNombre: [giraNombre, fecha].filter(Boolean).join(" · ") || null,
    inputs,
    outputs,
    logoSrc: logoBase64(publicDir),
    logoArtistaSrc: await resolvePdfImage(rider.artista.logoUrl, publicDir),
    generadoEn: nowStr(),
  };

  const buf = await bufferDePdf(
    React.createElement(ListaCanalesPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>,
  );

  const sufijo = fecha ? `-${slugArchivo(fecha)}` : `-v${rider.version}`;
  return { buf, filename: `InputList-${slugArchivo(rider.artista.nombre)}${sufijo}.pdf` };
}
