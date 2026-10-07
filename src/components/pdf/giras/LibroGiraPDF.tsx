/**
 * LibroGiraPDF.tsx — El libro de la gira.
 *
 * Un solo documento en vez de siete: el routing, el crew, la logística, el
 * repertorio, el estado del advance y los pendientes. Las secciones se piden
 * desde la página de Documentos, así que el mismo generador sirve para mandar
 * el libro completo al tour manager y para mandarle al crew nada más el rooming.
 *
 * No lleva dinero: se reparte al crew del artista y al promotor igual que el
 * day sheet. Los costos de viajes y hoteles se quedan en la app.
 */
import React from "react";
import {
  BandaGira, Cuerpo, Datos, Document, HeroGira, Nota, PaginaGira, PieGira, Seccion, Tabla, View,
  type ColumnaTabla, type Dato, type ItemBanda, type RenglonTabla,
} from "./GiraDocBase";
import { fmtHora } from "../PdfShared";
import { SECCIONES_LIBRO, SECCION_LIBRO_LABEL, TIPO_FILA_SETLIST_LABEL, type SeccionLibro } from "@/lib/giras";

export interface LibroShow {
  id: string;
  fechaCorta: string;
  diaSemana: string | null;
  ciudad: string | null;
  venueNombre: string | null;
  venueDireccion: string | null;
  estadoLabel: string;
  tipoShowLabel: string | null;
  aforoEsperado: number | null;
  horaLoadIn: string | null;
  horaSoundcheck: string | null;
  horaDoors: string | null;
  horaShow: string | null;
  curfew: string | null;
  promotorNombre: string | null;
  promotorTelefono: string | null;
}

export interface LibroPersona {
  id: string;
  nombre: string;
  funcion: string;
  origenLabel: string;
  alcance: string;
  telefono: string | null;
  email: string | null;
}

export interface LibroContacto {
  id: string;
  alcance: string;
  rol: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
}

export interface LibroViaje {
  id: string;
  grupo: string;
  tipoLabel: string;
  concepto: string | null;
  ruta: string;
  salida: string;
  llegada: string;
  operador: string | null;
  identificador: string | null;
  reserva: string | null;
  quien: string;
}

export interface LibroHotel {
  id: string;
  hotelNombre: string;
  ciudad: string | null;
  direccion: string | null;
  linkMaps: string | null;
  telefono: string | null;
  checkIn: string;
  checkOut: string;
  confirmacion: string | null;
  notas: string | null;
}

export interface LibroRooming {
  id: string;
  grupo: string;
  habitacion: string | null;
  tipoLabel: string | null;
  quien: string;
  comparteCon: string | null;
  notas: string | null;
}

export interface LibroCancion {
  id: string;
  tipo: string;
  /// Null en los momentos que no se cantan: la numeración es del repertorio, no
  /// del renglón, para que el "12" del papel sea el "12" que pide el artista.
  posicion: number | null;
  bloque: number | null;
  /// Como le dice el crew a la tanda. Solo viene en la canción que la abre.
  bloqueNombre: string | null;
  titulo: string;
  duracion: string;
  tonalidad: string | null;
  bpm: number | null;
  conTrack: boolean;
  cues: string | null;
}

export interface LibroSetlist {
  id: string;
  nombre: string;
  alcance: string;
  duracion: string;
  notas: string | null;
  canciones: LibroCancion[];
}

export interface LibroAdvanceShow {
  id: string;
  etiqueta: string;
  total: number;
  resueltas: number;
  abiertas: number;
  indispensables: string;
  avance: number;
  semaforoLabel: string;
  cerradoEn: string | null;
  /// Los indispensables que siguen abiertos, en texto: es lo único que el tour
  /// manager persigue cuando abre esta sección.
  pendientes: string[];
}

export interface LibroPendiente {
  id: string;
  /// Toda la gira, o la fecha a la que pertenece: es con lo que se agrupa.
  alcance: string;
  item: string;
  detalle: string | null;
  prioridadLabel: string;
  cuando: string | null;
  responsable: string | null;
}

export interface LibroGiraData {
  secciones: SeccionLibro[];
  giraNombre: string;
  tipoRegistroLabel: string;
  artistaNombre: string;
  artistaGenero: string | null;
  artistaOrigen: string | null;
  tipoFormacionLabel: string | null;
  integrantesNum: number | null;
  clienteNombre: string | null;
  estadoLabel: string;
  rango: string;
  moneda: string;
  riderNombre: string | null;
  riderVersion: number | null;
  contactoPrincipal: LibroContacto | null;
  rolMainstage: string[];
  notas: string | null;
  // Totales de la banda dorada
  showsTotal: number;
  showsConfirmados: number;
  ciudades: number;
  avanceGira: number;
  // Secciones
  shows: LibroShow[];
  crew: LibroPersona[];
  contactos: LibroContacto[];
  viajes: LibroViaje[];
  hoteles: LibroHotel[];
  roomings: LibroRooming[];
  setlists: LibroSetlist[];
  advance: LibroAdvanceShow[];
  pendientes: LibroPendiente[];
  logoSrc: string | null;
  logoArtistaSrc: string | null;
  generadoEn: string;
}

const COLS_SHOWS: ColumnaTabla[] = [
  { label: "Fecha", ancho: 56 },
  { label: "Ciudad y foro", flex: 3 },
  { label: "Load in", ancho: 44 },
  { label: "Show", ancho: 44 },
  { label: "Estado", flex: 2 },
  { label: "Promotor", flex: 2 },
];

const COLS_CREW: ColumnaTabla[] = [
  { label: "Quién", flex: 3 },
  { label: "Función", flex: 3 },
  { label: "Teléfono", ancho: 74 },
  { label: "Correo", flex: 3 },
];

const COLS_CONTACTOS: ColumnaTabla[] = [
  { label: "Plaza", flex: 2 },
  { label: "Rol", flex: 2 },
  { label: "Nombre", flex: 3 },
  { label: "Teléfono", ancho: 74 },
  { label: "Correo", flex: 3 },
];

const COLS_VIAJES: ColumnaTabla[] = [
  { label: "Tipo", ancho: 48 },
  { label: "Ruta", flex: 3 },
  { label: "Sale", ancho: 70 },
  { label: "Llega", ancho: 70 },
  { label: "Operador", flex: 2 },
  { label: "Quién", flex: 2 },
];

const COLS_HOTEL: ColumnaTabla[] = [
  { label: "Hotel", flex: 3 },
  { label: "Dirección", flex: 3 },
  { label: "Teléfono", ancho: 74 },
  { label: "Check in", ancho: 70 },
  { label: "Check out", ancho: 70 },
];

const COLS_ROOMING: ColumnaTabla[] = [
  { label: "Cuarto", ancho: 56 },
  { label: "Tipo", ancho: 56 },
  { label: "Quién", flex: 3 },
  { label: "Comparte con", flex: 3 },
];

const COLS_CANCIONES: ColumnaTabla[] = [
  { label: "#", ancho: 22 },
  { label: "Canción", flex: 4 },
  { label: "Dura", ancho: 40 },
  { label: "Tono", ancho: 36 },
  { label: "BPM", ancho: 32, alinear: "right" },
];

const COLS_ADVANCE: ColumnaTabla[] = [
  { label: "Show", flex: 3 },
  { label: "Renglones", ancho: 54, alinear: "right" },
  { label: "Cerrados", ancho: 54, alinear: "right" },
  { label: "Abiertos", ancho: 54, alinear: "right" },
  { label: "Indispensables", ancho: 72, alinear: "right" },
  { label: "Semáforo", flex: 2 },
];

const COLS_PENDIENTES: ColumnaTabla[] = [
  { label: "Pendiente", flex: 5 },
  { label: "Prioridad", ancho: 56 },
  { label: "Para cuándo", ancho: 70 },
  { label: "Quién", flex: 2 },
];

/// Agrupa renglones ya ordenados metiendo un encabezado cada vez que cambia el
/// grupo. Si todo cae en el mismo grupo no pone encabezados: un solo título
/// repetido arriba de la tabla no informa nada.
function agrupar<T>(
  filas: T[],
  grupo: (f: T) => string,
  celdas: (f: T) => RenglonTabla,
): RenglonTabla[] {
  const grupos = new Set(filas.map(grupo));
  if (grupos.size <= 1) return filas.map(celdas);

  const out: RenglonTabla[] = [];
  let actual: string | null = null;
  for (const f of filas) {
    const g = grupo(f);
    if (g !== actual) {
      out.push({ tipo: "grupo", clave: `grupo-${g}`, texto: g });
      actual = g;
    }
    out.push(celdas(f));
  }
  return out;
}

/// El setlist impreso se lee de corrido: el encabezado del bloque y el momento
/// que lo abre (intro, pausa, cierre) van como renglón de grupo, y solo las
/// canciones ocupan una fila con tono y BPM.
function renglonesDeSetlist(sl: LibroSetlist): RenglonTabla[] {
  const out: RenglonTabla[] = [];
  let bloque: number | null = null;

  for (const c of sl.canciones) {
    if (c.posicion === null) {
      bloque = null;
      out.push({
        tipo: "grupo",
        clave: c.id,
        texto: [TIPO_FILA_SETLIST_LABEL[c.tipo] ?? c.tipo, c.titulo, c.duracion !== "—" ? c.duracion : null, c.cues]
          .filter(Boolean)
          .join(" · "),
      });
      continue;
    }

    if (c.bloque !== bloque) {
      bloque = c.bloque;
      out.push({
        tipo: "grupo",
        clave: `${sl.id}-bloque-${c.bloque}`,
        texto: c.bloqueNombre ? `Bloque ${c.bloque} · ${c.bloqueNombre}` : `Bloque ${c.bloque}`,
      });
    }

    out.push({
      tipo: "fila",
      clave: c.id,
      celdas: [
        { texto: String(c.posicion) },
        {
          texto: c.titulo,
          sub: [c.conTrack ? "Con track" : null, c.cues].filter(Boolean).join(" · ") || null,
          grande: true,
        },
        { texto: c.duracion },
        { texto: c.tonalidad ?? "—" },
        { texto: c.bpm ? String(c.bpm) : "—" },
      ],
    });
  }

  return out;
}

export function LibroGiraPDF({ data }: { data: LibroGiraData }) {
  const activa = (s: SeccionLibro) => data.secciones.includes(s);

  const banda: ItemBanda[] = (
    [
      {
        label: data.showsTotal === 1 ? "Show" : "Shows",
        valor: String(data.showsTotal),
        sub: data.showsConfirmados > 0 ? `${data.showsConfirmados} confirmados` : null,
      },
      { label: data.ciudades === 1 ? "Ciudad" : "Ciudades", valor: data.ciudades > 0 ? String(data.ciudades) : "" },
      { label: "Fechas", valor: data.rango },
      { label: "Estado", valor: data.estadoLabel },
      { label: "Avance", valor: data.showsTotal > 0 ? `${data.avanceGira}%` : "" },
    ] satisfies ItemBanda[]
  ).filter((i) => i.valor);

  const datosGira: Dato[] = [
    { label: "Artista", valor: data.artistaNombre, ancho: 2 },
    {
      label: "Formación",
      valor:
        [data.tipoFormacionLabel, data.integrantesNum ? `${data.integrantesNum} integrantes` : null]
          .filter(Boolean)
          .join(" · ") || "—",
      ancho: 2,
    },
    { label: "Género", valor: data.artistaGenero ?? "—", ancho: 2 },
    { label: "Origen", valor: data.artistaOrigen ?? "—", ancho: 2 },
    { label: "Cliente", valor: data.clienteNombre ?? "—", ancho: 2 },
    { label: "Registro", valor: data.tipoRegistroLabel, ancho: 2 },
    {
      label: "Rider enganchado",
      valor: data.riderNombre ? `${data.riderNombre}${data.riderVersion ? ` · v${data.riderVersion}` : ""}` : "—",
      ancho: 4,
    },
  ];

  const datosContacto: Dato[] = data.contactoPrincipal
    ? [
        { label: "Contacto principal", valor: data.contactoPrincipal.nombre, ancho: 2 },
        { label: "Rol", valor: data.contactoPrincipal.rol, ancho: 2 },
        { label: "Teléfono", valor: data.contactoPrincipal.telefono ?? "—", ancho: 2 },
        { label: "Correo", valor: data.contactoPrincipal.email ?? "—", ancho: 2 },
      ]
    : [];

  const shows: RenglonTabla[] = data.shows.map((s) => ({
    tipo: "fila",
    clave: s.id,
    celdas: [
      { texto: s.fechaCorta, sub: s.diaSemana, fuerte: true },
      {
        texto: [s.ciudad, s.venueNombre].filter(Boolean).join(" · ") || "Por definir",
        sub: s.venueDireccion,
        grande: true,
      },
      { texto: fmtHora(s.horaLoadIn) || "—" },
      { texto: fmtHora(s.horaShow) || "—", sub: s.curfew ? `curfew ${fmtHora(s.curfew)}` : null },
      {
        texto: s.estadoLabel,
        sub:
          [s.tipoShowLabel, s.aforoEsperado ? `${s.aforoEsperado.toLocaleString("es-MX")} pax` : null]
            .filter(Boolean)
            .join(" · ") || null,
      },
      { texto: s.promotorNombre ?? "—", sub: s.promotorTelefono },
    ],
  }));

  const crew: RenglonTabla[] = agrupar(
    data.crew,
    (p) => p.origenLabel,
    (p) => ({
      tipo: "fila",
      clave: p.id,
      celdas: [
        { texto: p.nombre, sub: p.alcance, fuerte: true },
        { texto: p.funcion },
        { texto: p.telefono ?? "—" },
        { texto: p.email ?? "—" },
      ],
    }),
  );

  const contactos: RenglonTabla[] = data.contactos.map((c) => ({
    tipo: "fila",
    clave: c.id,
    celdas: [
      { texto: c.alcance },
      { texto: c.rol },
      { texto: c.nombre, fuerte: true },
      { texto: c.telefono ?? "—" },
      { texto: c.email ?? "—" },
    ],
  }));

  const viajes: RenglonTabla[] = agrupar(
    data.viajes,
    (v) => v.grupo,
    (v) => ({
      tipo: "fila",
      clave: v.id,
      celdas: [
        { texto: v.tipoLabel },
        { texto: v.ruta, sub: v.concepto, fuerte: true },
        { texto: v.salida },
        { texto: v.llegada },
        { texto: v.operador ?? "—", sub: [v.identificador, v.reserva].filter(Boolean).join(" · ") || null },
        { texto: v.quien },
      ],
    }),
  );

  const hoteles: RenglonTabla[] = data.hoteles.map((h) => ({
    tipo: "fila",
    clave: h.id,
    celdas: [
      { texto: h.hotelNombre, sub: h.ciudad, fuerte: true },
      { texto: h.direccion ?? "—", sub: h.notas },
      { texto: h.telefono ?? "—" },
      { texto: h.checkIn },
      { texto: h.checkOut, sub: h.confirmacion ? `conf. ${h.confirmacion}` : null },
    ],
  }));

  const roomings: RenglonTabla[] = agrupar(
    data.roomings,
    (r) => r.grupo,
    (r) => ({
      tipo: "fila",
      clave: r.id,
      celdas: [
        { texto: r.habitacion ?? "—", fuerte: true },
        { texto: r.tipoLabel ?? "—" },
        { texto: r.quien, sub: r.notas, fuerte: true },
        { texto: r.comparteCon ?? "—" },
      ],
    }),
  );

  const advance: RenglonTabla[] = data.advance.map((a) => ({
    tipo: "fila",
    clave: a.id,
    celdas: [
      { texto: a.etiqueta, sub: a.cerradoEn ? `cerrado ${a.cerradoEn}` : null, fuerte: true },
      { texto: String(a.total) },
      { texto: String(a.resueltas) },
      { texto: String(a.abiertas), fuerte: a.abiertas > 0 },
      { texto: a.indispensables },
      { texto: a.semaforoLabel, sub: `${a.avance}% cerrado` },
    ],
  }));

  const pendientes: RenglonTabla[] = agrupar(
    data.pendientes,
    (p) => p.alcance,
    (p) => ({
      tipo: "fila",
      clave: p.id,
      celdas: [
        { texto: p.item, sub: p.detalle, fuerte: true },
        { texto: p.prioridadLabel },
        { texto: p.cuando ?? "Sin agendar" },
        { texto: p.responsable ?? "Sin asignar" },
      ],
    }),
  );

  const abiertosDelAdvance = data.advance.flatMap((a) =>
    a.pendientes.map((t) => `${a.etiqueta} — ${t}`),
  );

  return (
    <Document
      title={`Libro de gira — ${data.artistaNombre} — ${data.giraNombre}`}
      author="Mainstage Pro"
      creator="Mainstage Pro"
    >
      <PaginaGira>
        <HeroGira
          tag="Libro de gira"
          titulo={data.giraNombre}
          subtitulo={data.artistaNombre}
          meta={`${data.tipoRegistroLabel} · ${data.estadoLabel} · ${data.rango}`}
          logoSrc={data.logoSrc}
          logoArtistaSrc={data.logoArtistaSrc}
        />
        <BandaGira items={banda} />

        <PieGira
          izquierda={`${data.artistaNombre} · ${data.giraNombre}`}
          derecha={`Libro de gira · ${data.generadoEn}`}
        />

        <Cuerpo>
          {/* Un libro recortado lo dice en la cara: si al lector le falta algo,
              sabe que es porque no se imprimió, no porque no se planeó. */}
          {data.secciones.length < SECCIONES_LIBRO.length && (
            <Nota
              label="Este libro va recortado"
              texto={`Incluye solo: ${data.secciones.map((s) => SECCION_LIBRO_LABEL[s]).join(" · ")}.`}
            />
          )}

          {activa("resumen") ? (
            <>
              <Seccion titulo="La gira">
                <Datos datos={datosGira} />
              </Seccion>

              {datosContacto.length > 0 ? (
                <Seccion titulo="Management">
                  <Datos datos={datosContacto} />
                </Seccion>
              ) : null}

              {data.rolMainstage.length > 0 ? (
                <Seccion titulo="Qué asume Mainstage" nota="Los servicios que esta gira trae contratados con nosotros.">
                  <Datos
                    datos={data.rolMainstage.map((r, i) => ({
                      label: `Servicio ${i + 1}`,
                      valor: r,
                      ancho: 2 as const,
                    }))}
                  />
                </Seccion>
              ) : null}

              {data.notas ? (
                <Seccion titulo="Notas de la gira">
                  <Nota label="Lo que hay que saber" texto={data.notas} />
                </Seccion>
              ) : null}
            </>
          ) : null}

          {activa("shows") ? (
            <Seccion titulo="Calendario de shows" nota="En orden de fecha. Los horarios son los del show, no los de la corrida del día.">
              <Tabla columnas={COLS_SHOWS} renglones={shows} />
            </Seccion>
          ) : null}

          {activa("crew") ? (
            <>
              <Seccion titulo="Quién viaja" nota="Agrupado por de dónde sale cada persona.">
                <Tabla columnas={COLS_CREW} renglones={crew} />
              </Seccion>

              <Seccion titulo="A quién se le marca en cada plaza">
                <Tabla columnas={COLS_CONTACTOS} renglones={contactos} />
              </Seccion>
            </>
          ) : null}

          {activa("logistica") ? (
            <>
              <Seccion titulo="Vuelos y traslados">
                <Tabla columnas={COLS_VIAJES} renglones={viajes} />
              </Seccion>

              <Seccion titulo="Hoteles">
                <Tabla columnas={COLS_HOTEL} renglones={hoteles} />
              </Seccion>

              <Seccion titulo="Rooming list">
                <Tabla columnas={COLS_ROOMING} renglones={roomings} />
              </Seccion>
            </>
          ) : null}

          {activa("setlist") ? (
            <Seccion titulo="Repertorio">
              {data.setlists.length === 0 ? (
                <Tabla columnas={COLS_CANCIONES} renglones={[]} />
              ) : (
                data.setlists.map((sl) => (
                  <View key={sl.id} style={{ marginBottom: 10 }}>
                    <Datos
                      datos={[
                        { label: "Setlist", valor: sl.nombre, ancho: 2 },
                        { label: "Alcance", valor: sl.alcance, ancho: 1 },
                        { label: "Duración", valor: sl.duracion, ancho: 1 },
                      ]}
                    />
                    <Tabla columnas={COLS_CANCIONES} renglones={renglonesDeSetlist(sl)} />
                    {sl.notas ? <Nota label="Notas del setlist" texto={sl.notas} /> : null}
                  </View>
                ))
              )}
            </Seccion>
          ) : null}

          {activa("advance") ? (
            <>
              <Seccion titulo="Estado del advance" nota="Un renglón por show. Sin costos ni proveedores: el detalle vive en el advance de cada fecha.">
                <Tabla columnas={COLS_ADVANCE} renglones={advance} />
              </Seccion>

              {abiertosDelAdvance.length > 0 ? (
                <Seccion titulo="Indispensables abiertos">
                  <Nota label="Esto es lo que falta cerrar" texto={abiertosDelAdvance.join("\n")} />
                </Seccion>
              ) : null}
            </>
          ) : null}

          {activa("pendientes") ? (
            <Seccion titulo="Pendientes por cerrar" nota="Agrupados por fecha. Solo lo que sigue abierto.">
              <Tabla columnas={COLS_PENDIENTES} renglones={pendientes} />
            </Seccion>
          ) : null}
        </Cuerpo>
      </PaginaGira>
    </Document>
  );
}
