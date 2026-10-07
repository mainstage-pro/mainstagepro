/**
 * DaySheetPDF.tsx — El day sheet del show.
 *
 * Es el documento que se reparte todos los días: a qué hora pasa cada cosa,
 * quién contesta por ella, dónde es y a quién se le marca si algo se cae. Se
 * manda igual al crew propio, al del artista y al promotor, así que no lleva
 * un solo número de dinero.
 */
import React from "react";
import {
  BandaGira, Cuerpo, Datos, Document, HeroGira, Nota, PaginaGira, PieGira, Seccion, Tabla,
  type CeldaTabla, type ColumnaTabla, type Dato, type ItemBanda, type RenglonTabla,
} from "./GiraDocBase";
import { fmtHora } from "../PdfShared";

/// Un momento del día. La corrida completa y la banda de horas de arriba salen
/// de esta misma lista: el esqueleto del día (`esAncla`) ya no vive aparte.
export interface DaySheetMomento {
  id: string;
  hora: string | null;
  horaFin: string | null;
  titulo: string;
  tipoLabel: string;
  duracion: string;
  esAncla: boolean;
  responsable: string | null;
  lugar: string | null;
  notas: string | null;
}

export interface DaySheetPersona {
  id: string;
  nombre: string;
  funcion: string;
  origenLabel: string;
  llamado: string | null;
  telefono: string | null;
}

export interface DaySheetContacto {
  rol: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
}

export interface DaySheetViaje {
  id: string;
  tipoLabel: string;
  concepto: string | null;
  ruta: string;
  salida: string;
  llegada: string;
  operador: string | null;
  identificador: string | null;
}

export interface DaySheetHotel {
  id: string;
  hotelNombre: string;
  ciudad: string | null;
  direccion: string | null;
  telefono: string | null;
  checkIn: string;
  checkOut: string;
}

export interface DaySheetData {
  giraNombre: string;
  artistaNombre: string;
  fechaLarga: string;
  ciudad: string | null;
  estadoLabel: string;
  tipoShowLabel: string | null;
  aforoEsperado: number | null;
  venue: {
    nombre: string;
    direccion: string | null;
    linkMaps: string | null;
    telefonoContacto: string | null;
    camerinos: string | null;
    puntoDescarga: string | null;
    accesoEscenario: string | null;
    horarioCarga: string | null;
    restriccionHorario: string | null;
  } | null;
  /// Las horas del esqueleto, buscadas por llave entre los momentos. Es lo que
  /// va en la banda de arriba; los renglones completos van en `momentos`.
  horas: {
    loadIn: string | null;
    montaje: string | null;
    lineCheck: string | null;
    soundcheck: string | null;
    doors: string | null;
    show: string | null;
    fin: string | null;
    loadOut: string | null;
    curfew: string | null;
  };
  momentos: DaySheetMomento[];
  /// true cuando el día tiene momentos pero ninguno tiene hora: el documento lo
  /// dice para que no se lea como un day sheet terminado.
  sinHoras: boolean;
  crew: DaySheetPersona[];
  contactos: DaySheetContacto[];
  viajes: DaySheetViaje[];
  hoteles: DaySheetHotel[];
  setlistNombre: string | null;
  setlistCanciones: number;
  notas: string | null;
  logoSrc: string | null;
  logoArtistaSrc: string | null;
  generadoEn: string;
}

const COLS_CORRIDA: ColumnaTabla[] = [
  { label: "Hora", ancho: 48 },
  { label: "Momento", flex: 3 },
  { label: "Responsable", flex: 2 },
  { label: "Dónde", flex: 2 },
];

const COLS_CREW: ColumnaTabla[] = [
  { label: "Quién", flex: 3 },
  { label: "Función", flex: 3 },
  { label: "Llamado", ancho: 52 },
  { label: "Teléfono", ancho: 70 },
];

const COLS_CONTACTOS: ColumnaTabla[] = [
  { label: "Rol", flex: 2 },
  { label: "Nombre", flex: 3 },
  { label: "Teléfono", ancho: 76 },
  { label: "Correo", flex: 3 },
];

const COLS_VIAJES: ColumnaTabla[] = [
  { label: "Tipo", ancho: 52 },
  { label: "Ruta", flex: 3 },
  { label: "Sale", ancho: 72 },
  { label: "Llega", ancho: 72 },
  { label: "Operador", flex: 2 },
];

const COLS_HOTEL: ColumnaTabla[] = [
  { label: "Hotel", flex: 3 },
  { label: "Dirección", flex: 3 },
  { label: "Teléfono", ancho: 76 },
  { label: "Check in", ancho: 72 },
  { label: "Check out", ancho: 72 },
];

export function DaySheetPDF({ data }: { data: DaySheetData }) {
  const lugar = [data.venue?.nombre, data.ciudad].filter(Boolean).join(" · ") || "Venue por definir";

  const banda: ItemBanda[] = (
    [
      { label: "Load in", valor: fmtHora(data.horas.loadIn) },
      { label: "Soundcheck", valor: fmtHora(data.horas.soundcheck || data.horas.lineCheck) },
      { label: "Puertas", valor: fmtHora(data.horas.doors) },
      { label: "Show", valor: fmtHora(data.horas.show), sub: data.horas.fin ? `termina ${fmtHora(data.horas.fin)}` : null },
      { label: "Load out", valor: fmtHora(data.horas.loadOut), sub: data.horas.curfew ? `curfew ${fmtHora(data.horas.curfew)}` : null },
    ] satisfies ItemBanda[]
  ).filter((i) => i.valor);

  const datosLugar: Dato[] = [
    { label: "Lugar", valor: data.venue?.nombre ?? "—", ancho: 2 },
    { label: "Ciudad", valor: data.ciudad ?? "—", ancho: 2 },
    {
      label: "Dirección",
      valor: data.venue?.direccion ?? "—",
      link: data.venue?.linkMaps ?? null,
      ancho: 4,
    },
    { label: "Teléfono del lugar", valor: data.venue?.telefonoContacto ?? "—" },
    { label: "Aforo esperado", valor: data.aforoEsperado ? data.aforoEsperado.toLocaleString("es-MX") : "—" },
    { label: "Acceso a escenario", valor: data.venue?.accesoEscenario ?? "—", ancho: 2 },
    { label: "Punto de descarga", valor: data.venue?.puntoDescarga ?? "—", ancho: 2 },
    { label: "Horario de carga", valor: data.venue?.horarioCarga ?? "—", ancho: 2 },
    { label: "Camerinos", valor: data.venue?.camerinos ?? "—", ancho: 2 },
    { label: "Restricción de horario", valor: data.venue?.restriccionHorario ?? "—", ancho: 4 },
  ];

  const corrida: RenglonTabla[] = data.momentos.map((m) => {
    const celdas: CeldaTabla[] = [
      {
        texto: fmtHora(m.hora) || "—",
        sub: m.horaFin ? fmtHora(m.horaFin) : m.duracion !== "—" ? m.duracion : null,
        fuerte: true,
      },
      // La corrida es la columna vertebral del papel: el momento se lee de un
      // vistazo desde el escenario y la hora lo acompaña, no al revés.
      { texto: m.titulo, sub: [m.tipoLabel, m.notas].filter(Boolean).join(" · ") || null, grande: true },
      { texto: m.responsable ?? "—" },
      { texto: m.lugar ?? "—" },
    ];
    return { tipo: "fila", clave: m.id, celdas };
  });

  const crew: RenglonTabla[] = data.crew.map((p) => ({
    tipo: "fila",
    clave: p.id,
    celdas: [
      { texto: p.nombre, grande: true },
      { texto: p.funcion, sub: p.origenLabel },
      { texto: fmtHora(p.llamado) || "—" },
      { texto: p.telefono ?? "—" },
    ],
  }));

  const contactos: RenglonTabla[] = data.contactos.map((c, i) => ({
    tipo: "fila",
    clave: `${i}-${c.rol}`,
    celdas: [
      { texto: c.rol },
      { texto: c.nombre, fuerte: true },
      { texto: c.telefono ?? "—" },
      { texto: c.email ?? "—" },
    ],
  }));

  const viajes: RenglonTabla[] = data.viajes.map((v) => ({
    tipo: "fila",
    clave: v.id,
    celdas: [
      { texto: v.tipoLabel },
      { texto: v.ruta, sub: v.concepto },
      { texto: v.salida },
      { texto: v.llegada },
      { texto: v.operador ?? "—", sub: v.identificador },
    ],
  }));

  const hoteles: RenglonTabla[] = data.hoteles.map((h) => ({
    tipo: "fila",
    clave: h.id,
    celdas: [
      { texto: h.hotelNombre, sub: h.ciudad, fuerte: true },
      { texto: h.direccion ?? "—" },
      { texto: h.telefono ?? "—" },
      { texto: h.checkIn },
      { texto: h.checkOut },
    ],
  }));

  return (
    <Document title={`Day sheet — ${data.artistaNombre} — ${lugar}`} author="Mainstage Pro" creator="Mainstage Pro">
      <PaginaGira>
        <HeroGira
          tag="Day sheet"
          titulo={lugar}
          subtitulo={data.fechaLarga}
          meta={`${data.artistaNombre} · ${data.giraNombre} · ${[data.estadoLabel, data.tipoShowLabel].filter(Boolean).join(" · ")}`}
          logoSrc={data.logoSrc}
          logoArtistaSrc={data.logoArtistaSrc}
        />
        <BandaGira items={banda} />

        <PieGira
          izquierda={`${data.artistaNombre} · ${data.giraNombre} · ${data.fechaLarga}`}
          derecha={`Day sheet · ${data.generadoEn}`}
        />

        <Cuerpo>
          <Seccion titulo="El lugar">
            <Datos datos={datosLugar} />
          </Seccion>

          <Seccion
            titulo="Corrida del día"
            nota={
              data.sinHoras
                ? "Los momentos del día están puestos pero ninguno tiene hora todavía: esto no es un day sheet cerrado."
                : null
            }
          >
            <Tabla columnas={COLS_CORRIDA} renglones={corrida} />
          </Seccion>

          <Seccion titulo="Quién trabaja este show">
            <Tabla columnas={COLS_CREW} renglones={crew} />
          </Seccion>

          <Seccion titulo="A quién se le marca">
            <Tabla columnas={COLS_CONTACTOS} renglones={contactos} />
          </Seccion>

          {viajes.length > 0 ? (
            <Seccion titulo="Viajes del día">
              <Tabla columnas={COLS_VIAJES} renglones={viajes} />
            </Seccion>
          ) : null}

          {hoteles.length > 0 ? (
            <Seccion titulo="Hotel">
              <Tabla columnas={COLS_HOTEL} renglones={hoteles} />
            </Seccion>
          ) : null}

          {data.setlistNombre ? (
            <Seccion titulo="Repertorio de la noche">
              <Datos
                datos={[
                  { label: "Setlist", valor: data.setlistNombre, ancho: 2 },
                  { label: "Canciones", valor: String(data.setlistCanciones), ancho: 2 },
                ]}
              />
            </Seccion>
          ) : null}

          {data.notas ? (
            <Seccion titulo="Notas del show">
              <Nota label="Pendientes y avisos" texto={data.notas} />
            </Seccion>
          ) : null}
        </Cuerpo>
      </PaginaGira>
    </Document>
  );
}
