/**
 * RiderArtistaPDF.tsx — El rider técnico del artista.
 *
 * Es lo que se manda al venue cuando se abre el advance: lo que el artista pide
 * y quién lo tiene que poner. Se arma del rider maestro versionado, así que el
 * PDF siempre dice qué versión está leyendo quien lo recibe; si no, cada show
 * negociaría contra un rider distinto.
 *
 * Se lee como un rider común: secciones numeradas, una por departamento, cada
 * una con su párrafo y enseguida su lista de equipo.
 */
import React from "react";
import { Image, View } from "@react-pdf/renderer";
import {
  BandaGira, Cuerpo, Datos, Document, HeroGira, Nota, PaginaGira, PieGira, Seccion, Tabla, Text,
  type ColumnaTabla, type Dato, type ItemBanda, type RenglonTabla,
} from "./GiraDocBase";
import { ListaCanales, type CanalInput, type CanalOutput } from "./ListaCanalesPDF";

/// Hueco útil de una página carta con hero: 612 − 68 de margen horizontal,
/// 792 menos el hero, el pie y los paddings. Es el marco en el que se encaja un
/// plano sin deformarlo.
const MARCO_ANEXO = { ancho: 544, alto: 578 };

export interface RiderContactoDoc {
  id: string;
  nombre: string;
  rolLabel: string;
  telefono: string | null;
  email: string | null;
  notas: string | null;
}

export interface RiderAnexoDoc {
  id: string;
  nombre: string;
  tipoLabel: string;
  notas: string | null;
  /// Resuelta a data URI; null cuando el anexo es PDF (ese se pega al final del
  /// documento, no se dibuja) o cuando la imagen no se pudo leer.
  imagenSrc: string | null;
  proporcion: number;
}

export interface RiderBloqueDoc {
  id: string;
  titulo: string;
  tipoLabel: string;
  duracionLabel: string;
  responsable: string | null;
  contenido: string | null;
}

export interface RiderLineaDoc {
  id: string;
  concepto: string;
  cantidad: number;
  unidadLabel: string;
  preferido: string | null;
  aceptables: string | null;
  noAceptable: string | null;
  /// Null cuando es indispensable: en un rider eso es el default y escribirlo en
  /// cada renglón no dice nada.
  prioridadLabel: string | null;
  provistoPorLabel: string;
  notas: string | null;
}

/// Un departamento del rider: su párrafo y su equipo, en ese orden.
export interface RiderSeccionDoc {
  clave: string;
  titulo: string;
  notas: { label: string | null; texto: string }[];
  lineas: RiderLineaDoc[];
}

export interface RiderArtistaData {
  artistaNombre: string;
  tipoFormacionLabel: string | null;
  riderNombre: string;
  version: number;
  esActivo: boolean;
  /// Para qué tipo de evento es este rider (tour, festival, privado…). Un artista
  /// tiene varios y el que lo recibe tiene que saber cuál está leyendo.
  contextoLabel: string;
  formacion: string | null;
  /// Contexto opcional: cuando el rider se emite desde una gira, el encabezado
  /// dice para qué gira se mandó. El rider en sí no cambia.
  giraNombre: string | null;
  requerimientosGenerales: string | null;
  escenario: { anchoM: number | null; profundoM: number | null; alturaM: number | null; stagePlotUrl: string | null };
  canalesMinimos: number | null;
  mixesMonitor: number | null;
  tiempoSoundcheckMin: number | null;
  tiempoCambioMin: number | null;
  /// Duraciones y responsables del montaje, en el orden del rider. La hora de
  /// reloj la pone el day sheet de cada fecha.
  bloques: RiderBloqueDoc[];
  /// Ya en el orden en que se imprimen, con sus notas y su equipo.
  secciones: RiderSeccionDoc[];
  totalLineas: number;
  inputs: CanalInput[];
  outputs: CanalOutput[];
  contactos: RiderContactoDoc[];
  anexos: RiderAnexoDoc[];
  logoSrc: string | null;
  logoArtistaSrc: string | null;
  generadoEn: string;
}

const COLS_EQUIPO: ColumnaTabla[] = [
  { label: "Cant.", ancho: 38, alinear: "right" },
  { label: "Equipo", flex: 5 },
  { label: "Lo pone", ancho: 64 },
];

const COLS_BLOQUES: ColumnaTabla[] = [
  { label: "Bloque", flex: 3 },
  { label: "Duración", ancho: 62, alinear: "right" },
  { label: "Lo ejecuta", ancho: 86 },
  { label: "Qué queda listo", flex: 4 },
];

const COLS_CONTACTOS: ColumnaTabla[] = [
  { label: "Rol", ancho: 108 },
  { label: "Nombre", flex: 3 },
  { label: "Teléfono", ancho: 86 },
  { label: "Correo", flex: 3 },
];

/// El plano se encaja en el marco por el lado que primero topa: si lo estiramos a
/// la página, un escenario de 12 × 8 m se imprime como uno de 12 × 12 y el venue
/// monta con medidas equivocadas.
function medidaAnexo(proporcion: number): { width: number; height: number } {
  const porAncho = { width: MARCO_ANEXO.ancho, height: MARCO_ANEXO.ancho / proporcion };
  if (porAncho.height <= MARCO_ANEXO.alto) return porAncho;
  return { width: MARCO_ANEXO.alto * proporcion, height: MARCO_ANEXO.alto };
}

function renglonesDeEquipo(lineas: RiderLineaDoc[]): RenglonTabla[] {
  return lineas.map((l) => {
    const detalle = [
      l.preferido ? `Preferido: ${l.preferido}` : null,
      l.aceptables ? `Aceptables: ${l.aceptables}` : null,
      l.noAceptable ? `No aceptable: ${l.noAceptable}` : null,
      l.prioridadLabel,
      l.notas,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      tipo: "fila" as const,
      clave: l.id,
      celdas: [
        { texto: `${l.cantidad}`, sub: l.unidadLabel, fuerte: true },
        { texto: l.concepto, sub: detalle || null, grande: true },
        { texto: l.provistoPorLabel },
      ],
    };
  });
}

export function RiderArtistaPDF({ data }: { data: RiderArtistaData }) {
  const banda: ItemBanda[] = (
    [
      { label: "Canales de entrada", valor: data.canalesMinimos ? String(data.canalesMinimos) : String(data.inputs.length || "") },
      { label: "Mixes de monitor", valor: data.mixesMonitor ? String(data.mixesMonitor) : String(data.outputs.length || "") },
      { label: "Soundcheck", valor: data.tiempoSoundcheckMin ? `${data.tiempoSoundcheckMin} min` : "" },
      { label: "Cambio", valor: data.tiempoCambioMin ? `${data.tiempoCambioMin} min` : "" },
      { label: "Renglones del rider", valor: String(data.totalLineas) },
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

  const renglonesBloque: RenglonTabla[] = data.bloques.map((b) => ({
    tipo: "fila",
    clave: b.id,
    celdas: [
      { texto: b.titulo, sub: b.tipoLabel, fuerte: true },
      { texto: b.duracionLabel },
      { texto: b.responsable ?? "—" },
      { texto: b.contenido ?? "—" },
    ],
  }));

  const renglonesContacto: RenglonTabla[] = data.contactos.map((c) => ({
    tipo: "fila",
    clave: c.id,
    celdas: [
      { texto: c.rolLabel },
      { texto: c.nombre, sub: c.notas, fuerte: true },
      { texto: c.telefono ?? "—" },
      { texto: c.email ?? "—" },
    ],
  }));

  const anexosImagen = data.anexos.filter((a) => a.imagenSrc);

  // Las secciones van numeradas como en cualquier rider: el venue contesta "en
  // el punto 6 no tenemos tal cosa" sin transcribir el título. La primera de
  // departamento arranca después de las fijas que de verdad se imprimieron.
  const hayContactos = renglonesContacto.length > 0;
  const hayBloques = renglonesBloque.length > 0;
  const primerDepartamento = 2 + (hayContactos ? 1 : 0) + (hayBloques ? 1 : 0);

  return (
    <Document
      title={`Rider técnico — ${data.artistaNombre} v${data.version}`}
      author="Mainstage Pro"
      creator="Mainstage Pro"
    >
      <PaginaGira>
        <HeroGira
          tag={`Rider técnico · ${data.contextoLabel}`}
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
          <Seccion titulo="1. Formación y escenario">
            <Datos datos={datosEscenario} />
            <Nota label="Requerimientos generales" texto={data.requerimientosGenerales} />
          </Seccion>

          {hayContactos ? (
            <Seccion
              titulo="2. Contactos de producción"
              nota="Todo lo que no esté aquí se resuelve con el tour manager."
            >
              <Tabla columnas={COLS_CONTACTOS} renglones={renglonesContacto} />
            </Seccion>
          ) : null}

          {hayBloques ? (
            <Seccion
              titulo={`${hayContactos ? 3 : 2}. Montaje y soundcheck`}
              nota="Son duraciones mínimas, no horas de reloj: el venue las acomoda en su horario y confirma el llamado."
            >
              <Tabla columnas={COLS_BLOQUES} renglones={renglonesBloque} />
            </Seccion>
          ) : null}

          {data.secciones.map((s, i) => (
            <Seccion key={s.clave} titulo={`${primerDepartamento + i}. ${s.titulo}`}>
              {s.notas.map((n) => (
                <Nota key={n.label ?? s.clave} label={n.label} texto={n.texto} />
              ))}
              {s.lineas.length > 0 ? (
                <Tabla columnas={COLS_EQUIPO} renglones={renglonesDeEquipo(s.lineas)} />
              ) : null}
            </Seccion>
          ))}
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

      {anexosImagen.map((a) => {
        const medida = medidaAnexo(a.proporcion);
        return (
          <PaginaGira key={a.id}>
            <HeroGira
              tag={a.tipoLabel}
              titulo={a.nombre}
              subtitulo={`${data.artistaNombre} · ${data.riderNombre} v${data.version}`}
              meta={a.notas}
              logoSrc={data.logoSrc}
            />
            <PieGira
              izquierda={`${data.artistaNombre} · ${data.riderNombre} v${data.version}`}
              derecha={`${a.tipoLabel} · ${data.generadoEn}`}
            />
            <Cuerpo>
              <View style={{ alignItems: "center", paddingTop: 4 }}>
                <Image src={a.imagenSrc!} style={{ width: medida.width, height: medida.height, objectFit: "contain" }} />
              </View>
            </Cuerpo>
          </PaginaGira>
        );
      })}
    </Document>
  );
}

/// Portada de los anexos que vienen en PDF. El documento del artista se pega tal
/// cual después de esta hoja, así que sin ella el lector pasa de la input list a
/// un plano suelto sin saber de dónde salió.
export function PortadaAnexosPDF({
  data,
  anexos,
}: {
  data: Pick<RiderArtistaData, "artistaNombre" | "riderNombre" | "version" | "logoSrc" | "generadoEn">;
  anexos: { id: string; nombre: string; tipoLabel: string; notas: string | null }[];
}) {
  return (
    <Document title={`Anexos — ${data.artistaNombre}`} author="Mainstage Pro" creator="Mainstage Pro">
      <PaginaGira>
        <HeroGira
          tag="Anexos del rider"
          titulo={data.artistaNombre}
          subtitulo={`${data.riderNombre} · versión ${data.version}`}
          meta={`${anexos.length} ${anexos.length === 1 ? "documento adjunto" : "documentos adjuntos"}`}
          logoSrc={data.logoSrc}
        />
        <PieGira
          izquierda={`${data.artistaNombre} · ${data.riderNombre} v${data.version}`}
          derecha={`Anexos · ${data.generadoEn}`}
        />
        <Cuerpo>
          <Seccion titulo="Lo que viene en las páginas siguientes">
            <Tabla
              columnas={[
                { label: "Tipo", ancho: 110 },
                { label: "Documento", flex: 4 },
              ]}
              renglones={anexos.map((a) => ({
                tipo: "fila" as const,
                clave: a.id,
                celdas: [{ texto: a.tipoLabel }, { texto: a.nombre, sub: a.notas, fuerte: true }],
              }))}
            />
          </Seccion>
          <Text style={{ fontSize: 8.5, color: "#6a6a6a" }}>
            Los documentos se anexan tal como los entregó el artista; no se recortan ni se reescalan.
          </Text>
        </Cuerpo>
      </PaginaGira>
    </Document>
  );
}
