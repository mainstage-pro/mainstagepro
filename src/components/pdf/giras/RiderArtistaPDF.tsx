/**
 * RiderArtistaPDF.tsx — El rider técnico del artista.
 *
 * Es lo que se manda a la casa cuando se abre el advance: lo que el artista
 * pide, con qué prioridad y quién lo tiene que poner. Se arma del rider maestro
 * versionado, así que el PDF siempre dice qué versión está leyendo quien lo
 * recibe; si no, cada show negociaría contra un rider distinto.
 */
import React from "react";
import {
  Alerta, BandaGira, Cuerpo, Datos, Document, HeroGira, Nota, PaginaGira, PieGira, Seccion, Tabla,
  type ColumnaTabla, type Dato, type ItemBanda, type RenglonTabla,
} from "./GiraDocBase";
import { ListaCanales, type CanalInput, type CanalOutput } from "./ListaCanalesPDF";

export interface RiderLineaDoc {
  id: string;
  disciplinaLabel: string;
  concepto: string;
  cantidad: number;
  unidadLabel: string;
  preferido: string | null;
  aceptables: string | null;
  noAceptable: string | null;
  prioridadLabel: string;
  provistoPorLabel: string;
  notas: string | null;
}

export interface RiderArtistaData {
  artistaNombre: string;
  tipoFormacionLabel: string | null;
  riderNombre: string;
  version: number;
  esActivo: boolean;
  formacion: string | null;
  /// Contexto opcional: cuando el rider se emite desde una gira, el encabezado
  /// dice para qué gira se mandó. El rider en sí no cambia.
  giraNombre: string | null;
  requerimientosGenerales: string | null;
  notas: { label: string; texto: string | null }[];
  escenario: { anchoM: number | null; profundoM: number | null; alturaM: number | null; stagePlotUrl: string | null };
  canalesMinimos: number | null;
  mixesMonitor: number | null;
  tiempoSoundcheckMin: number | null;
  tiempoCambioMin: number | null;
  /// Agrupadas por disciplina, ya en el orden en que se leen.
  lineas: RiderLineaDoc[];
  inputs: CanalInput[];
  outputs: CanalOutput[];
  logoSrc: string | null;
  logoArtistaSrc: string | null;
  generadoEn: string;
}

const COLS_EQUIPO: ColumnaTabla[] = [
  { label: "Cant.", ancho: 38, alinear: "right" },
  { label: "Concepto", flex: 4 },
  { label: "Prioridad", ancho: 62 },
  { label: "Lo pone", ancho: 62 },
];

export function RiderArtistaPDF({ data }: { data: RiderArtistaData }) {
  const banda: ItemBanda[] = (
    [
      { label: "Canales de entrada", valor: data.canalesMinimos ? String(data.canalesMinimos) : String(data.inputs.length || "") },
      { label: "Mixes de monitor", valor: data.mixesMonitor ? String(data.mixesMonitor) : String(data.outputs.length || "") },
      { label: "Soundcheck", valor: data.tiempoSoundcheckMin ? `${data.tiempoSoundcheckMin} min` : "" },
      { label: "Cambio", valor: data.tiempoCambioMin ? `${data.tiempoCambioMin} min` : "" },
      { label: "Renglones del rider", valor: String(data.lineas.length) },
    ] satisfies ItemBanda[]
  ).filter((i) => i.valor && i.valor !== "0");

  const datosEscenario: Dato[] = [
    { label: "Formación", valor: data.formacion ?? data.tipoFormacionLabel ?? "—", ancho: 2 },
    {
      label: "Escenario mínimo",
      valor:
        data.escenario.anchoM || data.escenario.profundoM
          ? `${data.escenario.anchoM ?? "?"} × ${data.escenario.profundoM ?? "?"} m${data.escenario.alturaM ? ` · ${data.escenario.alturaM} m de altura libre` : ""}`
          : "—",
      ancho: 2,
    },
    {
      label: "Stage plot",
      valor: data.escenario.stagePlotUrl ? "Ver el plano en línea" : "—",
      link: data.escenario.stagePlotUrl,
      ancho: 4,
    },
  ];

  // El equipo se lee por disciplina: así la casa reparte el rider entre su
  // ingeniero de audio y su jefe de luces sin tener que leerlo completo.
  const renglones: RenglonTabla[] = [];
  let disciplinaActual = "";
  for (const l of data.lineas) {
    if (l.disciplinaLabel !== disciplinaActual) {
      disciplinaActual = l.disciplinaLabel;
      renglones.push({ tipo: "grupo", clave: `grupo-${l.id}`, texto: disciplinaActual });
    }
    const detalle = [
      l.preferido ? `Preferido: ${l.preferido}` : null,
      l.aceptables ? `Aceptables: ${l.aceptables}` : null,
      l.noAceptable ? `No aceptable: ${l.noAceptable}` : null,
      l.notas,
    ]
      .filter(Boolean)
      .join(" · ");
    renglones.push({
      tipo: "fila",
      clave: l.id,
      celdas: [
        { texto: `${l.cantidad}`, sub: l.unidadLabel, fuerte: true },
        { texto: l.concepto, sub: detalle || null, fuerte: true },
        { texto: l.prioridadLabel },
        { texto: l.provistoPorLabel },
      ],
    });
  }

  const indispensables = data.lineas.filter((l) => l.prioridadLabel === "Indispensable");

  return (
    <Document
      title={`Rider técnico — ${data.artistaNombre} v${data.version}`}
      author="Mainstage Pro"
      creator="Mainstage Pro"
    >
      <PaginaGira>
        <HeroGira
          tag="Rider técnico"
          titulo={data.artistaNombre}
          subtitulo={`${data.riderNombre} · versión ${data.version}${data.esActivo ? "" : " (histórica)"}`}
          meta={[data.giraNombre, data.tipoFormacionLabel].filter(Boolean).join(" · ") || null}
          logoSrc={data.logoSrc}
          logoArtistaSrc={data.logoArtistaSrc}
        />
        <BandaGira items={banda} />

        <PieGira
          izquierda={`${data.artistaNombre} · ${data.riderNombre} v${data.version}`}
          derecha={`Rider técnico · ${data.generadoEn}`}
        />

        <Cuerpo>
          <Seccion titulo="Formación y escenario">
            <Datos datos={datosEscenario} />
            <Nota label="Requerimientos generales" texto={data.requerimientosGenerales} />
          </Seccion>

          <Seccion
            titulo="Equipo que pide el rider"
            nota="La prioridad es lo que se negocia: lo indispensable no se sustituye sin autorización del artista."
          >
            <Tabla columnas={COLS_EQUIPO} renglones={renglones} />
          </Seccion>

          {indispensables.length > 0 ? (
            <Alerta
              label={`Indispensables (${indispensables.length})`}
              items={indispensables.map((l) => `${l.cantidad} × ${l.concepto} — ${l.disciplinaLabel} · lo pone ${l.provistoPorLabel.toLowerCase()}`)}
            />
          ) : null}

          {data.notas.some((n) => n.texto) ? (
            <Seccion titulo="Notas por disciplina">
              {data.notas.map((n) => (
                <Nota key={n.label} label={n.label} texto={n.texto} />
              ))}
            </Seccion>
          ) : null}
        </Cuerpo>
      </PaginaGira>

      <PaginaGira>
        <HeroGira
          tag="Input list y output list"
          titulo={data.artistaNombre}
          subtitulo={`${data.riderNombre} · versión ${data.version}`}
          meta={`${data.inputs.length} entradas · ${data.outputs.length} salidas`}
          logoSrc={data.logoSrc}
        />
        <PieGira
          izquierda={`${data.artistaNombre} · ${data.riderNombre} v${data.version}`}
          derecha={`Rider técnico · ${data.generadoEn}`}
        />
        <Cuerpo>
          <ListaCanales inputs={data.inputs} outputs={data.outputs} />
        </Cuerpo>
      </PaginaGira>
    </Document>
  );
}
