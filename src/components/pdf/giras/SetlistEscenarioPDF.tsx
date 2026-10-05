/**
 * SetlistEscenarioPDF.tsx — El setlist que se pega en el escenario.
 *
 * No es un documento de oficina: no lleva hero, ni logo, ni banda dorada, ni
 * pie. Es una hoja que alguien ve a dos o tres metros, de reojo, con media luz,
 * así que todo el papel se gasta en el nombre de la canción. Por eso tampoco
 * hereda de GiraDocBase: compartir la base significaría heredar el membrete,
 * que es justo lo que le quita espacio a la letra.
 *
 * Va en negro sobre blanco aunque el arte del artista sea oscuro: el papel se
 * imprime en cualquier impresora de hotel y se lee con la luz rebotada del
 * escenario. El color solo se usa en la barra del bloque, que es lo único que
 * se busca de un vistazo.
 *
 * El tamaño de letra no está escrito: se calcula para que el setlist llene la
 * hoja. Un repertorio de 12 canciones sale con letra enorme y uno de 34 sale
 * más apretado, pero los dos ocupan la hoja completa.
 */
import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export interface RenglonEscenario {
  id: string;
  /// Null en los momentos que no se cantan.
  posicion: number | null;
  titulo: string;
  detalle: string | null;
  /// Null en los momentos: la barra va gris y sin número.
  bloque: number | null;
  /// Como le dice el crew a la tanda. Solo viene en el renglón que la abre.
  bloqueNombre: string | null;
  color: string | null;
  /// Solo el primer renglón del bloque pinta el número dentro de la barra.
  abreBloque: boolean;
}

export interface SetlistEscenarioData {
  artista: string;
  /// La fecha y la plaza cuando el setlist es de un show; "Base de la gira"
  /// cuando es el de toda la gira. Es la única línea de contexto: sirve para no
  /// pegar en Guadalajara el setlist de Monterrey.
  contexto: string;
  totalCanciones: number;
  renglones: RenglonEscenario[];
}

const ALTO_PAGINA = 792;
const ANCHO_PAGINA = 612;
const PADDING = 18;
const ALTO_ENCABEZADO = 24;
const SEPARACION_COLUMNAS = 12;
const ANCHO_BARRA = 17;
const GRIS_MOMENTO = "#9a9a9a";

const s = StyleSheet.create({
  page: { backgroundColor: "#ffffff", fontFamily: "Helvetica", padding: PADDING },
  encabezado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 4,
    marginBottom: 6,
  },
  encabezadoTxt: { fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 1.2, textTransform: "uppercase" },
  encabezadoMeta: { fontSize: 8, color: "#666666", letterSpacing: 0.6, textTransform: "uppercase" },
  columnas: { flexDirection: "row", flex: 1 },
  renglon: { flexDirection: "row", alignItems: "stretch" },
  barra: { width: ANCHO_BARRA, alignItems: "center", justifyContent: "center" },
  barraNum: { fontFamily: "Helvetica-Bold", color: "#000000" },
  cuerpo: { flex: 1, justifyContent: "center", paddingLeft: 7 },
  titulo: { fontFamily: "Helvetica-Bold", color: "#000000" },
  momento: { fontFamily: "Helvetica-Bold", color: GRIS_MOMENTO, textTransform: "uppercase", letterSpacing: 0.8 },
  detalle: { color: GRIS_MOMENTO, marginTop: 2 },
  bloqueNombre: { fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8 },
});

/// Dos columnas desde que el repertorio no cabe grande en una. El corte busca
/// el momento (pausa, presentación) más cercano a la mitad en vez de partir por
/// número de renglones: así el bloque no queda cortado a media tanda, que es
/// justo lo que el cantante usa para ubicarse en la hoja.
function repartir(renglones: RenglonEscenario[]): RenglonEscenario[][] {
  if (renglones.length <= 16) return [renglones];

  const mitad = Math.ceil(renglones.length / 2);
  let corte = mitad;
  let mejor = Infinity;
  for (let i = 1; i < renglones.length; i++) {
    if (!renglones[i].abreBloque && renglones[i].posicion !== null) continue;
    const distancia = Math.abs(i - mitad);
    // Más de un cuarto de desbalanceo deja una columna casi vacía: ahí vale más
    // partir el bloque que desperdiciar media hoja.
    if (distancia < mejor && distancia <= renglones.length / 4) {
      mejor = distancia;
      corte = i;
    }
  }

  return [renglones.slice(0, corte), renglones.slice(corte)];
}

export function SetlistEscenarioPDF({ data }: { data: SetlistEscenarioData }) {
  const columnas = repartir(data.renglones);
  const porColumna = Math.max(...columnas.map((c) => c.length), 1);

  const alto = ALTO_PAGINA - PADDING * 2 - ALTO_ENCABEZADO;
  const altoRenglon = alto / porColumna;
  const anchoColumna = (ANCHO_PAGINA - PADDING * 2 - SEPARACION_COLUMNAS * (columnas.length - 1)) / columnas.length;

  // La letra la limita lo primero que se acabe: el alto del renglón o el ancho
  // de la columna. Si solo se mirara el alto, "Tiempo perfecto" se partiría en
  // dos renglones y la hoja dejaría de leerse de un vistazo.
  //
  // 0.55 em por carácter es el ancho medio de Helvetica-Bold en mayúsculas y
  // minúsculas mezcladas; el 1.75 es lo que ocupa el número con su punto.
  const caracteres = Math.max(...data.renglones.map((r) => (r.posicion === null ? 0 : r.titulo.length)), 1);
  const porAncho = (anchoColumna - ANCHO_BARRA - 7) / (0.55 * caracteres + 1.75);
  const fuente = Math.min(altoRenglon * 0.68, porAncho, 44);
  const fuenteMomento = Math.max(fuente * 0.5, 7);
  const fuenteDetalle = Math.max(fuente * 0.28, 6);
  const anchoNumero = fuente * 1.75;

  return (
    <Document
      title={`Setlist ${data.artista} — ${data.contexto}`}
      author="Mainstage Pro"
      subject="Setlist de escenario"
    >
      <Page size={[ANCHO_PAGINA, ALTO_PAGINA]} style={s.page}>
        <View style={[s.encabezado, { height: ALTO_ENCABEZADO }]}>
          <Text style={s.encabezadoTxt}>{data.artista}</Text>
          <Text style={s.encabezadoMeta}>
            {data.contexto} · {data.totalCanciones} canciones
          </Text>
        </View>

        <View style={s.columnas}>
          {columnas.map((columna, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                paddingRight: i < columnas.length - 1 ? SEPARACION_COLUMNAS : 0,
              }}
            >
              {columna.map((r) => (
                <View key={r.id} style={[s.renglon, { height: altoRenglon }]}>
                  <View style={[s.barra, { backgroundColor: r.color ?? "#d9d9d9" }]}>
                    {r.abreBloque && r.bloque !== null ? (
                      <Text style={[s.barraNum, { fontSize: Math.min(fuente * 0.5, 15) }]}>{r.bloque}</Text>
                    ) : null}
                  </View>

                  <View style={s.cuerpo}>
                    {r.posicion === null ? (
                      <>
                        <Text style={[s.momento, { fontSize: fuenteMomento }]}>{r.titulo}</Text>
                        {r.detalle ? (
                          <Text style={[s.detalle, { fontSize: fuenteDetalle }]}>{r.detalle}</Text>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {r.bloqueNombre ? (
                          <Text style={[s.bloqueNombre, { fontSize: fuenteDetalle, color: r.color ?? "#000000" }]}>
                            {r.bloqueNombre}
                          </Text>
                        ) : null}
                        <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                          <Text style={[s.titulo, { fontSize: fuente, width: anchoNumero }]}>{r.posicion}.</Text>
                          <Text style={[s.titulo, { fontSize: fuente, flex: 1 }]}>{r.titulo}</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
