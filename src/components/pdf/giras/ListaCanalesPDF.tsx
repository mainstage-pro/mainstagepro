/**
 * ListaCanalesPDF.tsx — Input list y output list.
 *
 * Van juntas en un documento aparte porque el ingeniero de la casa pide
 * exactamente esto y nada más: no quiere leer el rider completo para parchar la
 * consola. El mismo bloque se reusa dentro del rider para que no haya dos
 * versiones de la lista circulando.
 */
import React from "react";
import {
  BandaGira, Cuerpo, Document, HeroGira, PaginaGira, PieGira, Seccion, Tabla,
  type ColumnaTabla, type ItemBanda, type RenglonTabla,
} from "./GiraDocBase";

export interface CanalInput {
  id: string;
  numero: number;
  nombre: string;
  instrumento: string | null;
  microfono: string | null;
  alternativas: string | null;
  soporteLabel: string | null;
  phantom: boolean;
  inserto: string | null;
  notas: string | null;
}

export interface CanalOutput {
  id: string;
  numero: number;
  nombre: string;
  tipoSalidaLabel: string | null;
  estereo: boolean;
  paraQuien: string | null;
  notas: string | null;
}

export interface ListaCanalesData {
  artistaNombre: string;
  riderNombre: string;
  version: number;
  giraNombre: string | null;
  inputs: CanalInput[];
  outputs: CanalOutput[];
  logoSrc: string | null;
  logoArtistaSrc: string | null;
  generadoEn: string;
}

const COLS_INPUT: ColumnaTabla[] = [
  { label: "#", ancho: 22, alinear: "right" },
  { label: "Canal", flex: 3 },
  { label: "Micrófono / DI", flex: 3 },
  { label: "Soporte", ancho: 64 },
  { label: "48 V", ancho: 28, alinear: "center" },
];

const COLS_OUTPUT: ColumnaTabla[] = [
  { label: "#", ancho: 22, alinear: "right" },
  { label: "Mix", flex: 3 },
  { label: "Tipo", ancho: 76 },
  { label: "Formato", ancho: 48 },
  { label: "Para quién", flex: 2 },
];

/// El bloque de las dos tablas, sin encabezado de documento: lo usa el documento
/// propio y también la segunda página del rider.
export function ListaCanales({ inputs, outputs }: { inputs: CanalInput[]; outputs: CanalOutput[] }) {
  const filasInput: RenglonTabla[] = inputs.map((c) => ({
    tipo: "fila",
    clave: c.id,
    celdas: [
      { texto: String(c.numero), fuerte: true },
      {
        texto: c.nombre,
        sub: [c.instrumento, c.inserto ? `Inserto: ${c.inserto}` : null, c.notas].filter(Boolean).join(" · ") || null,
        fuerte: true,
      },
      { texto: c.microfono ?? "—", sub: c.alternativas ? `o ${c.alternativas}` : null },
      { texto: c.soporteLabel ?? "—" },
      { texto: c.phantom ? "Sí" : "—" },
    ],
  }));

  const filasOutput: RenglonTabla[] = outputs.map((c) => ({
    tipo: "fila",
    clave: c.id,
    celdas: [
      { texto: String(c.numero), fuerte: true },
      { texto: c.nombre, sub: c.notas, fuerte: true },
      { texto: c.tipoSalidaLabel ?? "—" },
      { texto: c.estereo ? "Estéreo" : "Mono" },
      { texto: c.paraQuien ?? "—" },
    ],
  }));

  return (
    <>
      <Seccion titulo="Input list" nota="El orden del patch es el número de canal: no se reacomoda en sitio.">
        <Tabla columnas={COLS_INPUT} renglones={filasInput} />
      </Seccion>

      <Seccion titulo="Output list" nota="Un mix por renglón; el estéreo ocupa dos salidas de consola.">
        <Tabla columnas={COLS_OUTPUT} renglones={filasOutput} />
      </Seccion>
    </>
  );
}

export function ListaCanalesPDF({ data }: { data: ListaCanalesData }) {
  const banda: ItemBanda[] = [
    { label: "Entradas", valor: String(data.inputs.length) },
    { label: "Salidas", valor: String(data.outputs.length) },
    { label: "Phantom", valor: String(data.inputs.filter((i) => i.phantom).length) },
    { label: "Mixes estéreo", valor: String(data.outputs.filter((o) => o.estereo).length) },
  ];

  return (
    <Document
      title={`Input y output list — ${data.artistaNombre} v${data.version}`}
      author="Mainstage Pro"
      creator="Mainstage Pro"
    >
      <PaginaGira>
        <HeroGira
          tag="Input list y output list"
          titulo={data.artistaNombre}
          subtitulo={`${data.riderNombre} · versión ${data.version}`}
          meta={data.giraNombre}
          logoSrc={data.logoSrc}
          logoArtistaSrc={data.logoArtistaSrc}
        />
        <BandaGira items={banda} />
        <PieGira
          izquierda={`${data.artistaNombre} · ${data.riderNombre} v${data.version}`}
          derecha={`Input / output list · ${data.generadoEn}`}
        />
        <Cuerpo>
          <ListaCanales inputs={data.inputs} outputs={data.outputs} />
        </Cuerpo>
      </PaginaGira>
    </Document>
  );
}
