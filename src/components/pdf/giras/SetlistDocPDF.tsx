/**
 * SetlistDocPDF.tsx — El setlist en el formato de documento de la casa.
 *
 * No reemplaza la hoja de escenario: esa es letra gigante para pegarse al piso
 * y por eso va sin membrete. Este es el papel que se reparte con los demás
 * documentos de la gira (day sheet, advance, rider), así que comparte hero,
 * banda de datos y tabla con ellos y carga el detalle que la hoja de escenario
 * no puede llevar: tono, BPM, track y los cues de audio, luces y video.
 *
 * Los bloques llegan ya derivados del generador (segmentarSetlist), igual que
 * en pantalla y en el libro de gira: la numeración del papel y la de la app no
 * pueden diferir.
 */
import React from "react";
import { fmtDuracion } from "@/lib/giras";
import {
  BandaGira, Cuerpo, Document, DORADO_TXT, HeroGira, Nota, PaginaGira, PieGira, Seccion, Tabla,
  type ColumnaTabla, type ItemBanda, type RenglonTabla,
} from "./GiraDocBase";

export interface SetlistDocFila {
  id: string;
  /// Número de la canción. Null cuando la fila es un momento (intro, pausa,
  /// presentación, cierre): esos no se numeran ni en pantalla ni aquí.
  posicion: number | null;
  bloque: number | null;
  /// Como le dice el crew a la tanda, y de qué color la ve en la hoja de
  /// escenario. Solo vienen en la fila que la abre.
  bloqueNombre: string | null;
  bloqueColor: string | null;
  abreBloque: boolean;
  /// "Intro", "Pausa"… Solo en los momentos.
  etiqueta: string | null;
  titulo: string;
  duracion: string;
  tonalidad: string | null;
  bpm: number | null;
  conTrack: boolean;
  /// Audio, luces y video, ya en una sola línea.
  cues: string | null;
  cambio: string | null;
  notas: string | null;
}

export interface SetlistDocData {
  giraNombre: string;
  artistaNombre: string;
  setlistNombre: string;
  esBase: boolean;
  /// El show no tiene setlist propio y se está imprimiendo el base de la gira.
  /// El crew tiene que saberlo: si el show cambia el orden, este papel miente.
  heredado: boolean;
  /// Fecha y lugar, cuando el documento se emite desde un show.
  contexto: string | null;
  totalCanciones: number;
  totalMomentos: number;
  bloques: number;
  /// Minutos de las canciones y minutos de todo el papel (canciones + momentos).
  minutosCantados: number;
  minutosEnPapel: number;
  /// Canciones sin duración capturada: sin ellas la suma no se puede creer.
  sinDuracion: number;
  slotMin: number | null;
  notas: string | null;
  filas: SetlistDocFila[];
  logoSrc: string | null;
  logoArtistaSrc: string | null;
  generadoEn: string;
}

const COLS: ColumnaTabla[] = [
  { label: "#", ancho: 20 },
  { label: "Canción", flex: 4 },
  { label: "Dura", ancho: 34 },
  { label: "Tono", ancho: 32 },
  { label: "BPM", ancho: 28, alinear: "right" },
  { label: "Track", ancho: 30, alinear: "center" },
  { label: "Cues de audio, luces y video", flex: 4 },
];

const sinAcentos = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/// El encabezado del bloque se imprime en la fila que lo abre; cuando nadie
/// bautizó la tanda se llama por su número y ya. Si el nombre capturado ES el
/// número ("Bloque 3"), tampoco se repite: "Bloque 3 · Bloque 3" no informa.
function tituloBloque(numero: number, nombre: string | null): string {
  const limpio = nombre?.trim() ?? "";
  if (!limpio || sinAcentos(limpio) === `bloque ${numero}` || limpio === String(numero)) return `Bloque ${numero}`;
  return `Bloque ${numero} · ${limpio}`;
}

function renglones(filas: SetlistDocFila[]): RenglonTabla[] {
  const out: RenglonTabla[] = [];

  for (const f of filas) {
    if (f.abreBloque && f.bloque !== null) {
      out.push({
        tipo: "grupo",
        clave: `bloque-${f.bloque}`,
        texto: tituloBloque(f.bloque, f.bloqueNombre),
        color: f.bloqueColor,
      });
    }

    const esMomento = f.posicion === null;
    out.push({
      tipo: "fila",
      clave: f.id,
      celdas: [
        // El momento no lleva número: un punto deja claro que la columna no
        // aplica, sin fingir que la fila ocupa un lugar en el repertorio.
        { texto: esMomento ? "·" : String(f.posicion) },
        {
          texto: f.etiqueta ? [f.etiqueta, f.titulo].filter(Boolean).join(" · ") : f.titulo,
          sub: f.notas,
          fuerte: true,
          color: esMomento ? DORADO_TXT : undefined,
        },
        { texto: f.duracion },
        { texto: esMomento ? "" : (f.tonalidad ?? "") },
        { texto: esMomento || !f.bpm ? "" : String(f.bpm) },
        { texto: esMomento ? "" : f.conTrack ? "Sí" : "" },
        // El cambio de instrumento acompaña a los cues; cuando es lo único que
        // hay ocupa el renglón principal en vez de dejar un guion arriba.
        {
          texto: f.cues ?? (f.cambio ? `Cambio: ${f.cambio}` : ""),
          sub: f.cues && f.cambio ? `Cambio: ${f.cambio}` : null,
        },
      ],
    });
  }

  return out;
}

export function SetlistDocPDF({ data }: { data: SetlistDocData }) {
  const banda: ItemBanda[] = (
    [
      {
        label: data.totalCanciones === 1 ? "Canción" : "Canciones",
        valor: String(data.totalCanciones),
        sub: data.totalMomentos > 0 ? `+ ${data.totalMomentos} momentos` : null,
      },
      {
        label: "Cantados",
        valor: fmtDuracion(data.minutosCantados),
        sub:
          data.sinDuracion > 0
            ? `${data.sinDuracion} sin duración`
            : data.minutosEnPapel > data.minutosCantados
              ? `${fmtDuracion(data.minutosEnPapel)} con momentos`
              : null,
      },
      {
        label: "Slot contratado",
        valor: data.slotMin ? `${data.slotMin} min` : "",
        // Contra el slot lo que cuenta es todo el papel, no solo lo cantado: la
        // pausa de vestuario también se la come el reloj del foro.
        sub:
          data.slotMin && data.minutosEnPapel > 0
            ? data.minutosEnPapel > data.slotMin
              ? `${data.minutosEnPapel - data.slotMin} min de más`
              : `${data.slotMin - data.minutosEnPapel} min libres`
            : null,
      },
      {
        label: data.bloques === 1 ? "Bloque" : "Bloques",
        valor: data.bloques > 0 ? String(data.bloques) : "",
      },
    ] satisfies ItemBanda[]
  ).filter((i) => i.valor);

  // Media gira se llama como el artista ("AQUIHAYAQUIHAY — The Swaggiest
  // Tour"): repetirlo delante solo gasta renglón.
  const encabezado = sinAcentos(data.giraNombre).includes(sinAcentos(data.artistaNombre))
    ? data.giraNombre
    : `${data.artistaNombre} · ${data.giraNombre}`;

  return (
    <Document
      title={`Setlist — ${data.setlistNombre} · ${data.artistaNombre}`}
      author="Mainstage Pro"
      creator="Mainstage Pro"
    >
      <PaginaGira>
        <HeroGira
          tag="Setlist"
          titulo={data.setlistNombre}
          subtitulo={encabezado}
          meta={
            [
              data.contexto,
              data.heredado ? "Repertorio base de la gira" : data.esBase ? "Base de la gira" : null,
            ]
              .filter(Boolean)
              .join(" · ") || null
          }
          logoSrc={data.logoSrc}
          logoArtistaSrc={data.logoArtistaSrc}
        />
        <BandaGira items={banda} />

        <PieGira izquierda={encabezado} derecha={`Setlist · ${data.generadoEn}`} />

        <Cuerpo>
          {data.heredado ? (
            <Nota
              label="Repertorio heredado"
              texto={
                "Este show no tiene setlist propio: lo que sigue es el repertorio base de la gira. Si la fecha " +
                "cambia el orden o recorta canciones, captúrale su setlist y vuelve a emitir el documento."
              }
            />
          ) : null}

          <Seccion
            titulo="Repertorio"
            nota="Los bloques son las tandas que quedan entre dos momentos; la numeración solo cuenta canciones, así que intros, presentaciones y pausas van sin número."
          >
            <Tabla columnas={COLS} renglones={renglones(data.filas)} />
          </Seccion>

          <Nota label="Notas del setlist" texto={data.notas} />
        </Cuerpo>
      </PaginaGira>
    </Document>
  );
}
