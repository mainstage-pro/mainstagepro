/**
 * TransporteProduccionPDF.tsx — Schedule de transporte de producción de un show.
 *
 * Solo los traslados que mueve Mainstage para esa fecha: quién sale, a qué hora
 * y en qué. Lo que es transporte propio del artista no entra —eso vive en su
 * logística y en el day sheet completo, no en esta hoja.
 */
import React from "react";
import {
  Cuerpo,
  Document,
  HeroGira,
  PaginaGira,
  PieGira,
  Seccion,
  Tabla,
  type CeldaTabla,
  type ColumnaTabla,
  type RenglonTabla,
} from "./GiraDocBase";

export interface TransporteViaje {
  id: string;
  tipoLabel: string;
  quien: string;
  concepto: string | null;
  ruta: string;
  salida: string;
  llegada: string;
  operador: string | null;
  identificador: string | null;
  notas: string | null;
}

export interface TransporteData {
  giraNombre: string;
  artistaNombre: string;
  fechaLarga: string;
  ciudad: string | null;
  viajes: TransporteViaje[];
  logoSrc: string | null;
  logoArtistaSrc: string | null;
  generadoEn: string;
}

const COLS_VIAJES: ColumnaTabla[] = [
  { label: "Tipo", ancho: 56 },
  { label: "Quién viaja", flex: 2 },
  { label: "Ruta", flex: 3 },
  { label: "Sale", ancho: 76 },
  { label: "Llega", ancho: 76 },
  { label: "Operador / unidad", flex: 2 },
];

export function TransporteProduccionPDF({ data }: { data: TransporteData }) {
  const lugar = data.ciudad ?? "Ciudad por definir";

  const viajes: RenglonTabla[] = data.viajes.map((v) => {
    const celdas: CeldaTabla[] = [
      { texto: v.tipoLabel },
      { texto: v.quien, fuerte: true },
      { texto: v.ruta, sub: [v.concepto, v.notas].filter(Boolean).join(" · ") || null },
      { texto: v.salida },
      { texto: v.llegada },
      { texto: v.operador ?? "—", sub: v.identificador },
    ];
    return { tipo: "fila", clave: v.id, celdas };
  });

  return (
    <Document
      title={`Transporte de producción — ${data.artistaNombre} — ${lugar}`}
      author="Mainstage Pro"
      creator="Mainstage Pro"
    >
      <PaginaGira>
        <HeroGira
          tag="Transporte de producción"
          titulo={lugar}
          subtitulo={data.fechaLarga}
          meta={`${data.artistaNombre} · ${data.giraNombre}`}
          logoSrc={data.logoSrc}
          logoArtistaSrc={data.logoArtistaSrc}
        />

        <PieGira
          izquierda={`${data.artistaNombre} · ${data.giraNombre} · ${data.fechaLarga}`}
          derecha={`Transporte de producción · ${data.generadoEn}`}
        />

        <Cuerpo>
          <Seccion titulo="Traslados de producción">
            <Tabla columnas={COLS_VIAJES} renglones={viajes} />
          </Seccion>
        </Cuerpo>
      </PaginaGira>
    </Document>
  );
}
