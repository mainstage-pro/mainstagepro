/**
 * ListaCanalesPDF.tsx — Input list y output list.
 *
 * Van juntas en un documento aparte porque el ingeniero del venue pide
 * exactamente esto y nada más: no quiere leer el rider completo para parchar la
 * consola. El mismo bloque se reusa dentro del rider para que no haya dos
 * versiones de la lista circulando.
 */
import React from "react";
import {
  BandaGira, Cuerpo, Document, HeroGira, PaginaGira, PieGira, Seccion, Tabla,
  type ColumnaTabla, type ItemBanda, type RenglonTabla,
} from "./GiraDocBase";
import { expandirSalida, numerarSalidas, totalCanalesSalida } from "@/lib/giras";

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

export interface PuertoPrePatch {
  id: string;
  puerto: number;
  nombre: string;
  notas: string | null;
}

export interface ListaCanalesData {
  artistaNombre: string;
  riderNombre: string;
  version: number;
  giraNombre: string | null;
  inputs: CanalInput[];
  outputs: CanalOutput[];
  /// Solo si la gira parcha una interfaz antes de la consola. No va dentro del
  /// rider: la interfaz es de la casa, no del artista.
  prePatch: { entradas: PuertoPrePatch[]; salidas: PuertoPrePatch[] } | null;
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

const COLS_PRE_PATCH: ColumnaTabla[] = [
  { label: "Puerto", ancho: 36, alinear: "right" },
  { label: "Qué se cablea", flex: 3 },
  { label: "Notas", flex: 3 },
];

function tablaPrePatch(puertos: PuertoPrePatch[]): RenglonTabla[] {
  return puertos.map((p) => ({
    tipo: "fila",
    clave: p.id,
    celdas: [
      { texto: String(p.puerto), fuerte: true },
      { texto: p.nombre, grande: true },
      { texto: p.notas ?? "—" },
    ],
  }));
}

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
        // El nombre del canal es lo que se grita entre escenario y FOH.
        grande: true,
      },
      { texto: c.microfono ?? "—", sub: c.alternativas ? `o ${c.alternativas}` : null },
      { texto: c.soporteLabel ?? "—" },
      { texto: c.phantom ? "Sí" : "—" },
    ],
  }));

  // Un renglón por canal de consola: el mix estéreo se abre en L y R porque lo
  // que el ingeniero del venue parcha son canales, no mixes.
  const filasOutput: RenglonTabla[] = numerarSalidas(outputs).flatMap((c) =>
    expandirSalida(c.canal, c.estereo).map(({ canal, lado }) => ({
      tipo: "fila" as const,
      clave: lado ? `${c.id}-${lado}` : c.id,
      celdas: [
        { texto: String(canal), fuerte: true },
        { texto: lado ? `${c.nombre} ${lado}` : c.nombre, sub: c.notas, grande: true },
        { texto: c.tipoSalidaLabel ?? "—" },
        { texto: c.estereo ? "Estéreo" : "Mono" },
        { texto: c.paraQuien ?? "—" },
      ],
    })),
  );

  return (
    <>
      <Seccion titulo="Input list" nota="El orden del patch es el número de canal: no se reacomoda en sitio.">
        <Tabla columnas={COLS_INPUT} renglones={filasInput} />
      </Seccion>

      <Seccion titulo="Output list" nota="Un renglón por salida de consola: el mix estéreo se abre en L y R.">
        <Tabla columnas={COLS_OUTPUT} renglones={filasOutput} />
      </Seccion>
    </>
  );
}

export function ListaCanalesPDF({ data }: { data: ListaCanalesData }) {
  const banda: ItemBanda[] = [
    { label: "Entradas", valor: String(data.inputs.length) },
    { label: "Salidas", valor: String(totalCanalesSalida(data.outputs)) },
    { label: "Phantom", valor: String(data.inputs.filter((i) => i.phantom).length) },
    { label: "Mixes", valor: String(data.outputs.length) },
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

          {/* Otra lista, no una continuación: el puerto de la interfaz no tiene
              que coincidir con el canal de consola de arriba. */}
          {data.prePatch?.entradas.length ? (
            <Seccion
              titulo="Pre-patch de interfaz — entradas"
              nota="Qué entra por cada puerto físico de la interfaz, antes de la consola. La numeración es propia: no sigue al input list."
            >
              <Tabla columnas={COLS_PRE_PATCH} renglones={tablaPrePatch(data.prePatch.entradas)} />
            </Seccion>
          ) : null}

          {data.prePatch?.salidas.length ? (
            <Seccion titulo="Pre-patch de interfaz — salidas" nota="Qué sale por cada puerto de la interfaz.">
              <Tabla columnas={COLS_PRE_PATCH} renglones={tablaPrePatch(data.prePatch.salidas)} />
            </Seccion>
          ) : null}
        </Cuerpo>
      </PaginaGira>
    </Document>
  );
}
