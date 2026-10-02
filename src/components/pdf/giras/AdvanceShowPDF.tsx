/**
 * AdvanceShowPDF.tsx — El advance del show.
 *
 * Tres columnas y una pregunta: qué pide el rider, qué pone la casa y qué falta.
 * Es el documento con el que se cierra el advance por escrito, así que no lleva
 * costos ni nombres de proveedor: eso se queda del lado nuestro y el documento
 * se puede mandar al foro tal cual.
 */
import React from "react";
import {
  Alerta, BandaGira, Cuerpo, Datos, Document, HeroGira, Nota, PaginaGira, PieGira, Seccion, Tabla,
  type ColumnaTabla, type Dato, type ItemBanda, type RenglonTabla,
} from "./GiraDocBase";
import { C } from "../PdfShared";

export interface AdvanceLineaDoc {
  id: string;
  disciplinaLabel: string;
  concepto: string;
  cantidadPedida: number;
  prioridadLabel: string;
  ofrecidoCasa: string | null;
  cantidadCasa: number;
  cubiertoPorLabel: string;
  cantidadCubierta: number;
  estadoLabel: string;
  resuelta: boolean;
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
  lineas: AdvanceLineaDoc[];
  logoSrc: string | null;
  logoArtistaSrc: string | null;
  generadoEn: string;
}

const COLS: ColumnaTabla[] = [
  { label: "Pide el rider", flex: 4 },
  { label: "Cant.", ancho: 32, alinear: "right" },
  { label: "Lo que pone la casa", flex: 3 },
  { label: "Cómo se cubre", flex: 3 },
  { label: "Estado", ancho: 68 },
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
  for (const l of data.lineas) {
    if (l.disciplinaLabel !== disciplinaActual) {
      disciplinaActual = l.disciplinaLabel;
      renglones.push({ tipo: "grupo", clave: `grupo-${l.id}`, texto: disciplinaActual });
    }
    renglones.push({
      tipo: "fila",
      clave: l.id,
      celdas: [
        { texto: l.concepto, sub: [l.prioridadLabel, l.notas].filter(Boolean).join(" · ") || null, fuerte: true },
        { texto: String(l.cantidadPedida), fuerte: true },
        { texto: l.ofrecidoCasa ?? "—", sub: l.cantidadCasa ? `${l.cantidadCasa} pza` : null },
        { texto: l.cubiertoPorLabel, sub: l.cantidadCubierta ? `${l.cantidadCubierta} pza` : null },
        { texto: l.estadoLabel, color: l.resuelta ? C.verde : C.amarillo },
      ],
    });
  }

  // Lo que falta se saca aparte y arriba: es la única razón por la que alguien
  // abre este documento dos días antes del show.
  const peso = (prioridad: string) => (prioridad === "Indispensable" ? 0 : prioridad === "Importante" ? 1 : 2);
  const faltantes = data.lineas
    .filter((l) => !l.resuelta)
    .sort((a, b) => peso(a.prioridadLabel) - peso(b.prioridadLabel))
    .map((l) => `${l.cantidadPedida} × ${l.concepto} (${l.disciplinaLabel}) — ${l.prioridadLabel.toLowerCase()} · ${l.cubiertoPorLabel.toLowerCase()}`);

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

          <Seccion
            titulo="Rider pedido contra lo que pone la casa"
            nota="Una fila por concepto del rider. Lo que queda sin cubrir es lo que hay que rentar o negociar."
          >
            <Tabla columnas={COLS} renglones={renglones} />
          </Seccion>
        </Cuerpo>
      </PaginaGira>
    </Document>
  );
}
