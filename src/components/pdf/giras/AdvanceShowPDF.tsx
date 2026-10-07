/**
 * AdvanceShowPDF.tsx — El advance del show, departamento por departamento.
 *
 * Una fila por renglón de reparto y una sola pregunta: quién pone qué. No es una
 * lista de cajas; es el acuerdo con el foro escrito como se negoció al teléfono
 * («el PA y la consola los pones tú, la microfonía la traemos»).
 *
 * Es el documento con el que se cierra el advance por escrito y se manda al foro
 * tal cual, así que no lleva costos ni nombres de proveedor: eso se queda del lado
 * nuestro.
 */
import React from "react";
import {
  Alerta, BandaGira, COLOR_DISCIPLINA, Cuerpo, Datos, Document, HeroGira, Nota, PaginaGira, PieGira, Seccion, Tabla,
  type ColumnaTabla, type Dato, type ItemBanda, type RenglonTabla,
} from "./GiraDocBase";
import { C } from "../PdfShared";

export interface AdvanceRepartoDoc {
  id: string;
  /// La llave del rider (AUDIO, ILUMINACION…), para pintar el grupo con el
  /// color de su disciplina. El label ya viene traducido y no sirve de llave.
  disciplina: string;
  disciplinaLabel: string;
  descripcion: string;
  /// Cantidad y unidad ya resueltas en una cadena: «6 wedges», «1 servicio», «—».
  cantidad: string;
  especificaciones: string | null;
  prioridadLabel: string;
  cubiertoPorLabel: string;
  estadoLabel: string;
  resuelto: boolean;
  porConseguir: string | null;
  notas: string | null;
}

export interface AdvanceShowData {
  giraNombre: string;
  artistaNombre: string;
  riderNombre: string | null;
  riderVersion: number | null;
  fechaLarga: string;
  ciudad: string | null;
  estadoLabel: string;
  venue: {
    nombre: string;
    direccion: string | null;
    contactoTecnicoNombre: string | null;
    contactoTecnicoTelefono: string | null;
    contactoTecnicoEmail: string | null;
    medidasEscenario: string | null;
    voltajeDisponible: string | null;
    amperajeTotal: number | null;
    fases: string | null;
    notasTecnicas: string | null;
  } | null;
  resumen: {
    total: number;
    resueltas: number;
    abiertas: number;
    indispensablesTotal: number;
    indispensablesResueltas: number;
    avance: number;
    semaforoLabel: string;
  };
  cerradoEn: string | null;
  repartos: AdvanceRepartoDoc[];
  /// Lo que el rider pide y no quedó en ningún renglón de reparto. Va en una
  /// alerta aparte: es lo único que de verdad cuesta caro descubrir en sitio.
  sinRepartir: string[];
  logoSrc: string | null;
  logoArtistaSrc: string | null;
  generadoEn: string;
}

/// La descripción se lleva el ancho que le sobra: es la columna que se lee y los
/// bloques son largos ("PA y consola de FOH con sistema de monitoreo in-ear").
/// «Qué falta» es la segunda más importante: sin ella el foro no sabe qué hacer.
const COLS: ColumnaTabla[] = [
  { label: "Qué es", flex: 5 },
  { label: "Cuánto", ancho: 50 },
  { label: "Quién lo pone", ancho: 70 },
  { label: "Cómo va", ancho: 52 },
  { label: "Qué falta para cerrarlo", flex: 3 },
];

export function AdvanceShowPDF({ data }: { data: AdvanceShowData }) {
  const lugar = [data.venue?.nombre, data.ciudad].filter(Boolean).join(" · ") || "Venue por definir";

  const banda: ItemBanda[] = [
    { label: "Avance", valor: `${data.resumen.avance}%`, sub: data.resumen.semaforoLabel },
    {
      label: "Indispensables",
      valor: `${data.resumen.indispensablesResueltas}/${data.resumen.indispensablesTotal}`,
      sub: "resueltos",
    },
    { label: "Renglones", valor: String(data.resumen.total) },
    { label: "Abiertos", valor: String(data.resumen.abiertas) },
    { label: "Advance", valor: data.cerradoEn ? "Cerrado" : "Abierto", sub: data.cerradoEn },
  ];

  const datosVenue: Dato[] = [
    { label: "Lugar", valor: data.venue?.nombre ?? "—", ancho: 2 },
    { label: "Dirección", valor: data.venue?.direccion ?? "—", ancho: 2 },
    {
      label: "Contacto técnico del foro",
      valor:
        [data.venue?.contactoTecnicoNombre, data.venue?.contactoTecnicoTelefono, data.venue?.contactoTecnicoEmail]
          .filter(Boolean)
          .join(" · ") || "—",
      ancho: 4,
    },
    { label: "Escenario", valor: data.venue?.medidasEscenario ?? "—", ancho: 2 },
    {
      label: "Energía",
      valor:
        [
          data.venue?.voltajeDisponible,
          data.venue?.amperajeTotal ? `${data.venue.amperajeTotal} A` : null,
          data.venue?.fases ? `${data.venue.fases} fases` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "—",
      ancho: 2,
    },
  ];

  const renglones: RenglonTabla[] = [];
  let disciplinaActual = "";
  for (const r of data.repartos) {
    if (r.disciplinaLabel !== disciplinaActual) {
      disciplinaActual = r.disciplinaLabel;
      renglones.push({
        tipo: "grupo",
        clave: `grupo-${r.id}`,
        texto: disciplinaActual,
        color: COLOR_DISCIPLINA[r.disciplina] ?? null,
      });
    }
    renglones.push({
      tipo: "fila",
      clave: r.id,
      celdas: [
        {
          texto: r.descripcion,
          sub: [r.especificaciones, r.prioridadLabel, r.notas].filter(Boolean).join(" · ") || null,
          grande: true,
        },
        { texto: r.cantidad, fuerte: true },
        { texto: r.cubiertoPorLabel },
        { texto: r.estadoLabel, color: r.resuelto ? C.verde : C.amarillo },
        { texto: r.porConseguir ?? "—" },
      ],
    });
  }

  // Lo que falta se saca aparte y arriba: es la única razón por la que alguien
  // abre este documento dos días antes del show.
  const peso = (prioridad: string) => (prioridad === "Indispensable" ? 0 : prioridad === "Importante" ? 1 : 2);
  const faltantes = data.repartos
    .filter((r) => !r.resuelto)
    .sort((a, b) => peso(a.prioridadLabel) - peso(b.prioridadLabel))
    .map((r) =>
      [
        `${r.cantidad} ${r.descripcion} (${r.disciplinaLabel})`,
        r.prioridadLabel.toLowerCase(),
        r.cubiertoPorLabel.toLowerCase(),
        r.porConseguir,
      ]
        .filter(Boolean)
        .join(" — "),
    );

  return (
    <Document title={`Advance — ${data.artistaNombre} — ${lugar}`} author="Mainstage Pro" creator="Mainstage Pro">
      <PaginaGira>
        <HeroGira
          tag="Advance técnico del show"
          titulo={lugar}
          subtitulo={data.fechaLarga}
          meta={[
            `${data.artistaNombre} · ${data.giraNombre}`,
            data.riderNombre ? `${data.riderNombre} v${data.riderVersion}` : null,
            data.estadoLabel,
          ]
            .filter(Boolean)
            .join(" · ")}
          logoSrc={data.logoSrc}
          logoArtistaSrc={data.logoArtistaSrc}
        />
        <BandaGira items={banda} />

        <PieGira
          izquierda={`${data.artistaNombre} · ${data.giraNombre} · ${data.fechaLarga}`}
          derecha={`Advance · ${data.generadoEn}`}
        />

        <Cuerpo>
          <Seccion titulo="El foro">
            <Datos datos={datosVenue} />
            <Nota label="Notas técnicas del foro" texto={data.venue?.notasTecnicas ?? null} />
          </Seccion>

          {faltantes.length > 0 ? (
            <Alerta label={`Falta cerrar (${faltantes.length})`} items={faltantes} />
          ) : null}

          {data.sinRepartir.length > 0 ? (
            <Alerta
              label={`El rider lo pide y no está repartido (${data.sinRepartir.length})`}
              items={data.sinRepartir}
            />
          ) : null}

          <Seccion
            titulo="Quién pone qué"
            nota="Un renglón por bloque del departamento. Lo que no pone el foro es lo que hay que rentar o pedirle al promotor."
          >
            <Tabla columnas={COLS} renglones={renglones} />
          </Seccion>
        </Cuerpo>
      </PaginaGira>
    </Document>
  );
}
