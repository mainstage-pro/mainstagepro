// src/lib/pdf-gira/day-sheet.ts
//
// El day sheet de un show. Lee el show, su corrida, el crew que lo trabaja y
// los contactos, y arma el PDF. Si nadie capturó bloques todavía, la corrida se
// deriva de los horarios gruesos del show con SIEMBRA_BLOQUES: un day sheet
// vacío no sirve de nada y el tour manager lo pide igual.

import React from "react";
import type { Document } from "@react-pdf/renderer";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  ESTADO_SHOW_LABEL,
  ORIGEN_CREW_LABEL,
  ROL_PERSONA_LABEL,
  SIEMBRA_BLOQUES,
  TIPO_BLOQUE_LABEL,
  TIPO_SHOW_LABEL,
  TIPO_VIAJE_LABEL,
  duracionBloque,
  esCancion,
  fmtDuracion,
  fmtFechaHora,
  fmtFechaLarga,
  nombreCrew,
  ordenarBloques,
} from "@/lib/giras";
import { logoBase64, nowStr, resolvePdfImage } from "@/components/pdf/PdfShared";
import {
  DaySheetPDF,
  type DaySheetBloque,
  type DaySheetContacto,
  type DaySheetData,
} from "@/components/pdf/giras/DaySheetPDF";
import { bufferDePdf, type PdfGira } from "./render";

export async function generarDaySheet(showId: string): Promise<PdfGira | null> {
  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    include: {
      venue: true,
      bloques: { orderBy: { orden: "asc" } },
      gira: {
        select: {
          id: true,
          nombre: true,
          artista: { select: { nombre: true, logoUrl: true } },
          contactoPrincipal: { select: { nombre: true, rol: true, telefono: true, email: true } },
        },
      },
    },
  });

  if (!show) return null;

  // El crew del show son los que viajan toda la gira más los refuerzos del
  // día: el day sheet se reparte a los dos grupos por igual.
  const [crew, viajes, hospedajes, setlist] = await Promise.all([
    prisma.giraCrew.findMany({
      where: { giraId: show.giraId, activo: true, OR: [{ showId: null }, { showId }] },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      include: {
        tecnico: { select: { nombre: true, celular: true } },
        persona: { select: { nombre: true, telefono: true } },
        rolTecnico: { select: { nombre: true } },
      },
    }),
    prisma.giraViaje.findMany({
      where: { showId },
      orderBy: [{ salida: "asc" }, { orden: "asc" }],
    }),
    prisma.giraHospedaje.findMany({
      where: { giraId: show.giraId },
      orderBy: { checkIn: "asc" },
    }),
    prisma.giraSetlist.findFirst({
      where: { giraId: show.giraId, OR: [{ showId }, { esBase: true }] },
      orderBy: [{ showId: "desc" }, { esBase: "desc" }],
      select: { nombre: true, canciones: { select: { tipo: true } } },
    }),
  ]);

  const camposHora = show as unknown as Record<string, string | null>;

  const bloques: DaySheetBloque[] = show.bloques.length
    ? ordenarBloques(show.bloques).map((b) => ({
        id: b.id,
        hora: b.hora,
        horaFin: b.horaFin,
        titulo: b.titulo,
        tipoLabel: TIPO_BLOQUE_LABEL[b.tipo] ?? b.tipo,
        duracion: fmtDuracion(duracionBloque(b.hora, b.horaFin)),
        responsable: b.responsable,
        lugar: b.lugar,
        notas: b.notas,
      }))
    : ordenarBloques(
        SIEMBRA_BLOQUES.filter((s) => !!camposHora[s.campo]).map((s, i) => ({
          id: `derivado-${s.campo}`,
          hora: camposHora[s.campo],
          horaFin: s.campoFin ? (camposHora[s.campoFin] ?? null) : null,
          titulo: s.titulo,
          tipo: s.tipo,
          orden: i * 10,
        })),
      ).map((b) => ({
        id: b.id,
        hora: b.hora,
        horaFin: b.horaFin,
        titulo: b.titulo,
        tipoLabel: TIPO_BLOQUE_LABEL[b.tipo] ?? b.tipo,
        duracion: fmtDuracion(duracionBloque(b.hora, b.horaFin)),
        responsable: null,
        lugar: null,
        notas: null,
      }));

  const contactos: DaySheetContacto[] = [];
  if (show.gira.contactoPrincipal) {
    contactos.push({
      rol: ROL_PERSONA_LABEL[show.gira.contactoPrincipal.rol] ?? "Contacto principal",
      nombre: show.gira.contactoPrincipal.nombre,
      telefono: show.gira.contactoPrincipal.telefono,
      email: show.gira.contactoPrincipal.email,
    });
  }
  if (show.promotorNombre || show.promotorTelefono || show.promotorEmail) {
    contactos.push({
      rol: "Promotor",
      nombre: [show.promotorNombre, show.promotorContacto].filter(Boolean).join(" · ") || "Sin nombre",
      telefono: show.promotorTelefono,
      email: show.promotorEmail,
    });
  }
  if (show.contactoCasaNombre || show.contactoCasaTelefono || show.contactoCasaEmail) {
    contactos.push({
      rol: "Producción de la casa",
      nombre: show.contactoCasaNombre ?? "Sin nombre",
      telefono: show.contactoCasaTelefono,
      email: show.contactoCasaEmail,
    });
  }
  if (show.venue?.contactoTecnicoNombre || show.venue?.contactoTecnicoTelefono) {
    contactos.push({
      rol: "Técnico del foro",
      nombre: show.venue.contactoTecnicoNombre ?? "Sin nombre",
      telefono: show.venue.contactoTecnicoTelefono,
      email: show.venue.contactoTecnicoEmail,
    });
  }
  if (show.venue?.contacto || show.venue?.telefonoContacto) {
    contactos.push({
      rol: "Operación del lugar",
      nombre: show.venue.contacto ?? "Sin nombre",
      telefono: show.venue.telefonoContacto,
      email: show.venue.emailContacto,
    });
  }

  const ciudad = show.ciudad ?? show.venue?.ciudad ?? null;
  const publicDir = path.join(process.cwd(), "public");

  const data: DaySheetData = {
    giraNombre: show.gira.nombre,
    artistaNombre: show.gira.artista.nombre,
    fechaLarga: fmtFechaLarga(show.fecha),
    ciudad,
    estadoLabel: ESTADO_SHOW_LABEL[show.estado] ?? show.estado,
    tipoShowLabel: show.tipoShow ? (TIPO_SHOW_LABEL[show.tipoShow] ?? show.tipoShow) : null,
    aforoEsperado: show.aforoEsperado,
    venue: show.venue
      ? {
          nombre: show.venue.nombre,
          direccion: show.venue.direccion,
          linkMaps: show.venue.linkMaps,
          telefonoContacto: show.venue.telefonoContacto,
          camerinos: show.venue.camerinos,
          puntoDescarga: show.venue.puntoDescarga,
          accesoEscenario: show.venue.accesoEscenario,
          horarioCarga: show.venue.horarioCarga,
          restriccionHorario: show.venue.restriccionHorario,
        }
      : null,
    horas: {
      loadIn: show.horaLoadIn,
      montaje: show.horaMontaje,
      lineCheck: show.horaLineCheck,
      soundcheck: show.horaSoundcheck,
      doors: show.horaDoors,
      show: show.horaShow,
      fin: show.horaFin,
      loadOut: show.horaLoadOut,
      curfew: show.curfew,
    },
    bloques,
    bloquesDerivados: show.bloques.length === 0 && bloques.length > 0,
    crew: crew.map((c) => ({
      id: c.id,
      nombre: nombreCrew(c),
      funcion: c.funcion || c.rolTecnico?.nombre || "Sin función",
      origenLabel: ORIGEN_CREW_LABEL[c.origen] ?? c.origen,
      llamado: c.llamado,
      telefono: c.telefono || c.tecnico?.celular || c.persona?.telefono || null,
    })),
    contactos,
    viajes: viajes.map((v) => ({
      id: v.id,
      tipoLabel: TIPO_VIAJE_LABEL[v.tipo] ?? v.tipo,
      concepto: v.concepto,
      ruta: [v.origen, v.destino].filter(Boolean).join(" → ") || "Sin ruta",
      salida: fmtFechaHora(v.salida),
      llegada: fmtFechaHora(v.llegada),
      operador: v.operador,
      identificador: v.identificador,
    })),
    // Un hotel por ciudad: se muestra el del show y, si la ciudad no coincide
    // con ninguno, se callan todos antes que mandar al crew al hotel equivocado.
    hoteles: hospedajes
      .filter((h) => !ciudad || !h.ciudad || h.ciudad.toLowerCase() === ciudad.toLowerCase())
      .map((h) => ({
        id: h.id,
        hotelNombre: h.hotelNombre,
        ciudad: h.ciudad,
        direccion: h.direccion,
        telefono: h.telefono,
        checkIn: fmtFechaHora(h.checkIn),
        checkOut: fmtFechaHora(h.checkOut),
      })),
    setlistNombre: setlist?.nombre ?? null,
    setlistCanciones: setlist?.canciones.filter((c) => esCancion(c.tipo)).length ?? 0,
    notas: show.notas,
    logoSrc: logoBase64(publicDir),
    logoArtistaSrc: await resolvePdfImage(show.gira.artista.logoUrl, publicDir),
    generadoEn: nowStr(),
  };

  const buf = await bufferDePdf(
    React.createElement(DaySheetPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>,
  );

  const slug = [ciudad, show.fecha.toISOString().slice(0, 10)].filter(Boolean).join("-").replace(/[^\w-]+/g, "");
  return { buf, filename: `DaySheet-${slug || show.id}.pdf` };
}
