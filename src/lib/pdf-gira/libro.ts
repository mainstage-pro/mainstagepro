// src/lib/pdf-gira/libro.ts
//
// El libro de la gira: el documento maestro. En vez de emitir un PDF por
// sección (routing, crew, logística, repertorio, advance, pendientes) se emite
// uno con secciones conmutables, porque nadie manda siete archivos por correo.
// Pedir una sola sección da un documento de una página, así que la flexibilidad
// no cuesta un segundo diseño.
//
// Como se reparte al crew del artista y al promotor, aquí NO entra dinero: el
// costo del vuelo y del hotel se queda del lado nuestro aunque el modelo lo
// traiga, igual que en el advance.

import React from "react";
import type { Document } from "@react-pdf/renderer";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  ESTADO_GIRA_LABEL,
  ESTADO_SHOW_LABEL,
  ORIGEN_CREW_LABEL,
  PRIORIDAD_LABEL,
  ROL_PERSONA_LABEL,
  SECCIONES_LIBRO,
  SEMAFORO_LABEL,
  TIPO_FORMACION_LABEL,
  TIPO_HABITACION_LABEL,
  TIPO_REGISTRO_LABEL,
  TIPO_SHOW_LABEL,
  TIPO_VIAJE_LABEL,
  avanceGira,
  fmtDuracion,
  fmtFechaCorta,
  fmtFechaHora,
  fmtMinSeg,
  fmtRango,
  nombreCrew,
  resumirAdvance,
  segmentarSetlist,
  type SeccionLibro,
} from "@/lib/giras";
import { ESTADOS_CHECKLIST, FRENTES } from "@/lib/gira-advance-checklist";
import { logoBase64, nowStr, resolvePdfImage } from "@/components/pdf/PdfShared";
import {
  LibroGiraPDF,
  type LibroAdvanceShow,
  type LibroContacto,
  type LibroGiraData,
  type LibroHotel,
  type LibroPendiente,
  type LibroPersona,
  type LibroRooming,
  type LibroSetlist,
  type LibroShow,
  type LibroViaje,
} from "@/components/pdf/giras/LibroGiraPDF";
import { bufferDePdf, type PdfGira } from "./render";

const FRENTE_LABEL: Record<string, string> = Object.fromEntries(FRENTES.map((f) => [f.key, f.label]));
const ESTADO_CHECKLIST_LABEL: Record<string, string> = Object.fromEntries(
  ESTADOS_CHECKLIST.map((e) => [e.key, e.label]),
);

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/// El libro completo cuando nadie pidió secciones. Se respeta el orden del
/// vocabulario, no el orden en que llegaron en la URL: el documento siempre se
/// lee igual.
export function parseSecciones(crudo: string | null | undefined): SeccionLibro[] {
  if (!crudo?.trim()) return [...SECCIONES_LIBRO];
  const pedidas = new Set(crudo.split(",").map((s) => s.trim()));
  const validas = SECCIONES_LIBRO.filter((s) => pedidas.has(s));
  return validas.length ? [...validas] : [...SECCIONES_LIBRO];
}

function slugArchivo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/// Las fechas del sistema viven al mediodía UTC, así que el día de la semana se
/// lee en UTC o se corre una fecha en husos negativos.
function diaSemana(d: Date): string {
  return DIAS[d.getUTCDay()];
}

function etiquetaShow(s: { fecha: Date; ciudad: string | null; venue?: { nombre: string } | null }): string {
  return [fmtFechaCorta(s.fecha), s.ciudad ?? s.venue?.nombre].filter(Boolean).join(" · ");
}

/// Un renglón del libro puede hablar de toda la gira o de una fecha. El lector
/// necesita saber cuál de las dos sin ir a buscar a otra sección.
function alcanceDe(show: { fecha: Date; ciudad: string | null } | null): string {
  return show ? etiquetaShow(show) : "Toda la gira";
}

export async function generarLibroGira(giraId: string, secciones: SeccionLibro[]): Promise<PdfGira | null> {
  const pide = (s: SeccionLibro) => secciones.includes(s);

  const gira = await prisma.gira.findUnique({
    where: { id: giraId },
    include: {
      artista: {
        select: { nombre: true, logoUrl: true, genero: true, origen: true, tipoFormacion: true, integrantesNum: true },
      },
      cliente: { select: { nombre: true, empresa: true } },
      rider: { select: { nombre: true, version: true } },
      contactoPrincipal: { select: { nombre: true, rol: true, telefono: true, email: true } },
      shows: {
        orderBy: [{ fecha: "asc" }, { orden: "asc" }],
        include: {
          venue: {
            select: {
              nombre: true,
              ciudad: true,
              direccion: true,
              contactoTecnicoNombre: true,
              contactoTecnicoTelefono: true,
              contactoTecnicoEmail: true,
            },
          },
          riderLineas: {
            orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
            select: { concepto: true, prioridad: true, estado: true, cubiertoPor: true },
          },
        },
      },
    },
  });

  if (!gira) return null;

  const [crewFilas, viajeFilas, hotelFilas, roomingFilas, setlistFilas, checklistFilas] = await Promise.all([
    pide("crew")
      ? prisma.giraCrew.findMany({
          where: { giraId, activo: true },
          orderBy: [{ origen: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
          include: {
            tecnico: { select: { nombre: true, celular: true } },
            persona: { select: { nombre: true, telefono: true, email: true } },
            rolTecnico: { select: { nombre: true } },
            show: { select: { fecha: true, ciudad: true } },
          },
        })
      : [],
    pide("logistica")
      ? prisma.giraViaje.findMany({
          where: { giraId },
          orderBy: [{ salida: "asc" }, { orden: "asc" }],
          include: {
            show: { select: { fecha: true, ciudad: true } },
            crew: { select: { nombreLibre: true, tecnico: { select: { nombre: true } }, persona: { select: { nombre: true } } } },
          },
        })
      : [],
    pide("logistica")
      ? prisma.giraHospedaje.findMany({ where: { giraId }, orderBy: [{ checkIn: "asc" }, { ciudad: "asc" }] })
      : [],
    pide("logistica")
      ? prisma.giraRooming.findMany({
          where: { giraId },
          orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
          include: {
            hospedaje: { select: { hotelNombre: true, ciudad: true } },
            show: { select: { fecha: true, ciudad: true } },
            crew: { select: { nombreLibre: true, funcion: true, tecnico: { select: { nombre: true } }, persona: { select: { nombre: true } } } },
            persona: { select: { nombre: true, rol: true } },
          },
        })
      : [],
    pide("setlist")
      ? prisma.giraSetlist.findMany({
          where: { giraId },
          orderBy: [{ esBase: "desc" }, { createdAt: "asc" }],
          include: {
            show: { select: { fecha: true, ciudad: true } },
            canciones: { orderBy: { orden: "asc" } },
          },
        })
      : [],
    pide("pendientes")
      ? prisma.giraChecklistItem.findMany({
          where: { giraId, estado: { in: ["PENDIENTE", "PEDIDO"] } },
          orderBy: [{ frente: "asc" }, { orden: "asc" }],
          include: { show: { select: { fecha: true, ciudad: true } } },
        })
      : [],
  ]);

  // El rol de Mainstage se guarda como JSON de claves de ServicioPM; sin los
  // nombres del catálogo el documento imprimiría "ADVANCE_PLAZA".
  const clavesRol: string[] = (() => {
    if (!gira.rolMainstage) return [];
    try {
      const parsed = JSON.parse(gira.rolMainstage);
      return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
    } catch {
      return [];
    }
  })();

  const servicios = clavesRol.length
    ? await prisma.servicioPM.findMany({ where: { clave: { in: clavesRol } }, select: { clave: true, nombre: true } })
    : [];
  const nombrePorClave = new Map(servicios.map((s) => [s.clave, s.nombre]));

  // ── Shows ───────────────────────────────────────────────────────────────────
  const shows: LibroShow[] = gira.shows.map((s) => ({
    id: s.id,
    fechaCorta: fmtFechaCorta(s.fecha),
    diaSemana: diaSemana(s.fecha),
    ciudad: s.ciudad ?? s.venue?.ciudad ?? null,
    venueNombre: s.venue?.nombre ?? null,
    venueDireccion: s.venue?.direccion ?? null,
    estadoLabel: ESTADO_SHOW_LABEL[s.estado] ?? s.estado,
    tipoShowLabel: s.tipoShow ? (TIPO_SHOW_LABEL[s.tipoShow] ?? s.tipoShow) : null,
    aforoEsperado: s.aforoEsperado,
    horaLoadIn: s.horaLoadIn,
    horaSoundcheck: s.horaSoundcheck,
    horaDoors: s.horaDoors,
    horaShow: s.horaShow,
    curfew: s.curfew,
    promotorNombre: [s.promotorNombre, s.promotorContacto].filter(Boolean).join(" · ") || null,
    promotorTelefono: s.promotorTelefono,
  }));

  // ── Crew y contactos ────────────────────────────────────────────────────────
  const crew: LibroPersona[] = crewFilas.map((c) => ({
    id: c.id,
    nombre: nombreCrew(c),
    funcion: c.funcion || c.rolTecnico?.nombre || "Sin función",
    origenLabel: ORIGEN_CREW_LABEL[c.origen] ?? c.origen,
    alcance: alcanceDe(c.show),
    telefono: c.telefono || c.tecnico?.celular || c.persona?.telefono || null,
    email: c.email || c.persona?.email || null,
  }));

  const contactos: LibroContacto[] = [];
  if (gira.contactoPrincipal) {
    contactos.push({
      id: "contacto-principal",
      alcance: "Toda la gira",
      rol: ROL_PERSONA_LABEL[gira.contactoPrincipal.rol] ?? "Contacto principal",
      nombre: gira.contactoPrincipal.nombre,
      telefono: gira.contactoPrincipal.telefono,
      email: gira.contactoPrincipal.email,
    });
  }
  for (const s of gira.shows) {
    const alcance = etiquetaShow(s);
    if (s.promotorNombre || s.promotorTelefono || s.promotorEmail) {
      contactos.push({
        id: `${s.id}-promotor`,
        alcance,
        rol: "Promotor",
        nombre: [s.promotorNombre, s.promotorContacto].filter(Boolean).join(" · ") || "Sin nombre",
        telefono: s.promotorTelefono,
        email: s.promotorEmail,
      });
    }
    if (s.contactoCasaNombre || s.contactoCasaTelefono || s.contactoCasaEmail) {
      contactos.push({
        id: `${s.id}-casa`,
        alcance,
        rol: "Producción de la casa",
        nombre: s.contactoCasaNombre ?? "Sin nombre",
        telefono: s.contactoCasaTelefono,
        email: s.contactoCasaEmail,
      });
    }
    if (s.venue?.contactoTecnicoNombre || s.venue?.contactoTecnicoTelefono) {
      contactos.push({
        id: `${s.id}-tecnico`,
        alcance,
        rol: "Técnico del foro",
        nombre: s.venue.contactoTecnicoNombre ?? "Sin nombre",
        telefono: s.venue.contactoTecnicoTelefono,
        email: s.venue.contactoTecnicoEmail,
      });
    }
  }

  // ── Logística ───────────────────────────────────────────────────────────────
  const nombreDeCrew = (c: { nombreLibre: string | null; tecnico: { nombre: string } | null; persona: { nombre: string } | null } | null) =>
    c ? (c.tecnico?.nombre ?? c.persona?.nombre ?? c.nombreLibre ?? "Sin nombre") : null;

  const viajes: LibroViaje[] = viajeFilas.map((v) => ({
    id: v.id,
    grupo: alcanceDe(v.show),
    tipoLabel: TIPO_VIAJE_LABEL[v.tipo] ?? v.tipo,
    concepto: v.concepto,
    ruta: [v.origen, v.destino].filter(Boolean).join(" → ") || "Sin ruta",
    salida: fmtFechaHora(v.salida),
    llegada: fmtFechaHora(v.llegada),
    operador: v.operador,
    identificador: v.identificador,
    reserva: v.reserva,
    quien: v.esGrupal ? "Todo el grupo" : (nombreDeCrew(v.crew) ?? "Por asignar"),
  }));

  const hoteles: LibroHotel[] = hotelFilas.map((h) => ({
    id: h.id,
    hotelNombre: h.hotelNombre,
    ciudad: h.ciudad,
    direccion: h.direccion,
    linkMaps: h.linkMaps,
    telefono: h.telefono,
    checkIn: fmtFechaHora(h.checkIn),
    checkOut: fmtFechaHora(h.checkOut),
    confirmacion: h.confirmacion,
    notas: h.notas,
  }));

  const roomings: LibroRooming[] = roomingFilas.map((r) => ({
    id: r.id,
    grupo:
      [r.hospedaje?.hotelNombre, r.hospedaje?.ciudad].filter(Boolean).join(" · ") ||
      (r.show ? alcanceDe(r.show) : "Hotel por asignar"),
    habitacion: r.habitacion,
    tipoLabel: r.tipoHabitacion ? (TIPO_HABITACION_LABEL[r.tipoHabitacion] ?? r.tipoHabitacion) : null,
    quien: nombreDeCrew(r.crew) ?? r.persona?.nombre ?? r.nombreLibre ?? "Sin asignar",
    comparteCon: r.comparteCon,
    notas: r.notas,
  }));

  // ── Repertorio ──────────────────────────────────────────────────────────────
  const setlists: LibroSetlist[] = setlistFilas.map((sl) => {
    const segundos = sl.canciones.reduce((t, c) => t + (c.duracionSeg ?? 0), 0);

    // La posición y el bloque se derivan aquí una vez para que el PDF solo
    // imprima; el que no es canción va sin número y corta el bloque.
    const ubicacion = new Map<string, { posicion: number | null; bloque: number | null }>();
    for (const seg of segmentarSetlist(sl.canciones)) {
      if (seg.clase === "momento") ubicacion.set(seg.fila.id, { posicion: null, bloque: null });
      else for (const c of seg.canciones) ubicacion.set(c.fila.id, { posicion: c.posicion, bloque: seg.numero });
    }

    return {
      id: sl.id,
      nombre: sl.nombre,
      alcance: sl.esBase ? "Base" : alcanceDe(sl.show),
      duracion: segundos > 0 ? fmtMinSeg(segundos) : fmtDuracion(sl.duracionMin ?? null),
      notas: sl.notas,
      canciones: sl.canciones.map((c) => ({
        id: c.id,
        tipo: c.tipo,
        posicion: ubicacion.get(c.id)?.posicion ?? null,
        bloque: ubicacion.get(c.id)?.bloque ?? null,
        titulo: c.titulo,
        duracion: c.duracionSeg ? fmtMinSeg(c.duracionSeg) : "—",
        tonalidad: c.tonalidad,
        bpm: c.bpm,
        conTrack: c.conTrack,
        cues:
          [
            c.cambioInstrumento ? `Cambio: ${c.cambioInstrumento}` : null,
            c.notasAudio ? `Audio: ${c.notasAudio}` : null,
            c.notasLuces ? `Luces: ${c.notasLuces}` : null,
            c.notasVideo ? `Video: ${c.notasVideo}` : null,
            c.notas,
          ]
            .filter(Boolean)
            .join(" · ") || null,
      })),
    };
  });

  // ── Advance consolidado ─────────────────────────────────────────────────────
  const resuelta = (l: { estado: string; cubiertoPor: string }) =>
    l.cubiertoPor === "NO_APLICA" ? true : l.cubiertoPor === "NO_CUBIERTO" ? false : ["CONFIRMADO", "SUSTITUCION_APROBADA"].includes(l.estado);

  const advance: LibroAdvanceShow[] = gira.shows.map((s) => {
    const r = resumirAdvance(s.riderLineas);
    return {
      id: s.id,
      etiqueta: etiquetaShow(s),
      total: r.total,
      resueltas: r.resueltas,
      abiertas: r.abiertas,
      indispensables: r.indispensablesTotal
        ? `${r.indispensablesResueltas}/${r.indispensablesTotal}`
        : "—",
      avance: r.avance,
      semaforoLabel: SEMAFORO_LABEL[r.semaforo] ?? r.semaforo,
      cerradoEn: s.advanceCerradoEn ? fmtFechaHora(s.advanceCerradoEn) : null,
      pendientes: s.riderLineas
        .filter((l) => l.prioridad === "INDISPENSABLE" && !resuelta(l))
        .map((l) => `${l.concepto} (${PRIORIDAD_LABEL[l.prioridad] ?? l.prioridad})`),
    };
  });

  // ── Pendientes ──────────────────────────────────────────────────────────────
  const pendientes: LibroPendiente[] = checklistFilas.map((c) => ({
    id: c.id,
    frenteLabel: FRENTE_LABEL[c.frente] ?? c.frente,
    alcance: alcanceDe(c.show),
    item: c.item,
    detalle: c.detalle,
    estadoLabel: ESTADO_CHECKLIST_LABEL[c.estado] ?? c.estado,
    responsable: c.responsable,
  }));

  const resumenGira = avanceGira(gira.shows.map((s) => ({ riderLineas: s.riderLineas })));
  const ciudades = new Set(
    gira.shows.map((s) => (s.ciudad ?? s.venue?.ciudad ?? "").trim().toLowerCase()).filter(Boolean),
  );

  const publicDir = path.join(process.cwd(), "public");

  const data: LibroGiraData = {
    secciones,
    giraNombre: gira.nombre,
    tipoRegistroLabel: TIPO_REGISTRO_LABEL[gira.tipo] ?? gira.tipo,
    artistaNombre: gira.artista.nombre,
    artistaGenero: gira.artista.genero,
    artistaOrigen: gira.artista.origen,
    tipoFormacionLabel: gira.artista.tipoFormacion
      ? (TIPO_FORMACION_LABEL[gira.artista.tipoFormacion] ?? gira.artista.tipoFormacion)
      : null,
    integrantesNum: gira.artista.integrantesNum,
    clienteNombre: gira.cliente ? (gira.cliente.empresa ?? gira.cliente.nombre) : null,
    estadoLabel: ESTADO_GIRA_LABEL[gira.estado] ?? gira.estado,
    rango: fmtRango(gira.fechaInicio, gira.fechaFin),
    moneda: gira.moneda,
    riderNombre: gira.rider?.nombre ?? null,
    riderVersion: gira.rider?.version ?? null,
    contactoPrincipal: contactos.find((c) => c.id === "contacto-principal") ?? null,
    rolMainstage: clavesRol.map((c) => nombrePorClave.get(c) ?? c),
    notas: gira.notas,
    showsTotal: gira.shows.length,
    showsConfirmados: gira.shows.filter((s) => s.estado === "CONFIRMADO" || s.estado === "EJECUTADO").length,
    ciudades: ciudades.size,
    avanceGira: resumenGira.avance,
    shows,
    crew,
    contactos,
    viajes,
    hoteles,
    roomings,
    setlists,
    advance,
    pendientes,
    logoSrc: logoBase64(publicDir),
    logoArtistaSrc: await resolvePdfImage(gira.artista.logoUrl, publicDir),
    generadoEn: nowStr(),
  };

  const buf = await bufferDePdf(
    React.createElement(LibroGiraPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>,
  );

  // El nombre dice qué trae: un libro completo y un rooming suelto no se pueden
  // llamar igual en la carpeta de descargas.
  const sufijo = secciones.length === SECCIONES_LIBRO.length ? "" : `-${secciones.join("-")}`;
  return { buf, filename: `LibroGira-${slugArchivo(gira.nombre)}${sufijo}.pdf` };
}
