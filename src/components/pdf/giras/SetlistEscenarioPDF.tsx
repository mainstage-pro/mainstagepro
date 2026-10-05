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
 * Una sola canción por renglón, a todo el ancho del papel. Dos columnas cabrían
 * en menos hojas pero a costa de la mitad de la letra, y la hoja no se lee desde
 * el otro extremo del escenario. Cuando el repertorio no cabe se reparte en
 * varias hojas: el papel es barato y la cinta también.
 *
 * El tamaño de letra no está escrito: se calcula para que el setlist llene la
 * hoja con la letra más grande que el ancho permita, y de ahí sale cuántas hojas
 * son — no al revés.
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
const MARGEN_ENCABEZADO = 6;
const ANCHO_BARRA = 17;
const SANGRIA_CUERPO = 7;
/// Más grande que esto deja de ganarse legibilidad y solo se gasta papel: a 40pt
/// el título ya se lee desde el fondo del foro, y el repertorio completo cabe en
/// dos o tres hojas en vez de media resma.
const FUENTE_MAXIMA = 40;
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
    marginBottom: MARGEN_ENCABEZADO,
  },
  encabezadoTxt: { fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 1.2, textTransform: "uppercase" },
  encabezadoMeta: { fontSize: 8, color: "#666666", letterSpacing: 0.6, textTransform: "uppercase" },
  cuerpoHoja: { flex: 1 },
  renglon: { flexDirection: "row", alignItems: "stretch" },
  barra: { width: ANCHO_BARRA, alignItems: "center", justifyContent: "center" },
  barraNum: { fontFamily: "Helvetica-Bold", color: "#000000" },
  // El paddingRight compensa la barra de color para que el texto quede centrado
  // en la hoja, no en el hueco que deja la barra.
  cuerpo: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: SANGRIA_CUERPO,
    paddingRight: ANCHO_BARRA + SANGRIA_CUERPO,
  },
  tituloRenglon: { flexDirection: "row", alignItems: "baseline", justifyContent: "center" },
  titulo: { fontFamily: "Helvetica-Bold", color: "#000000" },
  momento: {
    fontFamily: "Helvetica-Bold",
    color: GRIS_MOMENTO,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  detalle: { color: GRIS_MOMENTO, marginTop: 2, textAlign: "center" },
  bloqueNombre: { fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center" },
});

/// Reparte el repertorio en hojas parejas. Parejas y no "llenar la primera y lo
/// que sobre a la segunda": una hoja con tres canciones sueltas al final se ve
/// como un error de impresión y el crew busca la que falta.
///
/// El corte busca el momento (pausa, presentación) más cercano al punto ideal:
/// así el bloque no queda partido a media tanda, que es justo lo que el cantante
/// usa para ubicarse. Si no hay ninguno cerca se corta donde toque.
function repartir(renglones: RenglonEscenario[], porHoja: number): RenglonEscenario[][] {
  const hojas = Math.max(1, Math.ceil(renglones.length / porHoja));
  if (hojas === 1) return [renglones];

  const hechas: RenglonEscenario[][] = [];
  let desde = 0;
  for (let h = 1; h < hojas; h++) {
    const ideal = Math.round((renglones.length * h) / hojas);
    // El margen de maniobra es lo que sobra en la hoja: mover el corte más allá
    // obligaría a achicar la letra, que es lo que se está defendiendo.
    const margen = Math.max(1, porHoja - Math.ceil(renglones.length / hojas));
    let corte = ideal;
    for (let i = Math.max(desde + 1, ideal - margen); i <= Math.min(renglones.length - 1, ideal + margen); i++) {
      if (renglones[i].abreBloque || renglones[i].posicion === null) {
        if (Math.abs(i - ideal) < Math.abs(corte - ideal) || corte === ideal) corte = i;
      }
    }
    hechas.push(renglones.slice(desde, corte));
    desde = corte;
  }
  hechas.push(renglones.slice(desde));
  return hechas.filter((h) => h.length > 0);
}

export function SetlistEscenarioPDF({ data }: { data: SetlistEscenarioData }) {
  const alto = ALTO_PAGINA - PADDING * 2 - ALTO_ENCABEZADO - MARGEN_ENCABEZADO;
  const ancho = ANCHO_PAGINA - PADDING * 2 - (ANCHO_BARRA + SANGRIA_CUERPO) * 2;

  // La letra la manda el ancho: si solo se mirara el alto, "Tiempo perfecto" se
  // partiría en dos renglones y la hoja dejaría de leerse de un vistazo.
  //
  // 0.55 em por carácter es el ancho medio de Helvetica-Bold en mayúsculas y
  // minúsculas mezcladas; el 1.75 es lo que ocupa el número con su punto.
  const caracteres = Math.max(...data.renglones.map((r) => (r.posicion === null ? 0 : r.titulo.length)), 1);
  const porAncho = Math.min(ancho / (0.55 * caracteres + 1.75), FUENTE_MAXIMA);

  // Cuántos renglones caben con esa letra; de ahí salen las hojas. Al revés
  // (hojas primero) es como se llega a un setlist ilegible.
  const hojas = repartir(data.renglones, Math.max(1, Math.floor(alto / (porAncho / 0.68))));
  const porHoja = Math.max(...hojas.map((h) => h.length), 1);

  const fuente = Math.min(porAncho, (alto / porHoja) * 0.68);
  const fuenteMomento = Math.max(fuente * 0.5, 7);
  const fuenteDetalle = Math.max(fuente * 0.28, 6);

  return (
    <Document
      title={`Setlist ${data.artista} — ${data.contexto}`}
      author="Mainstage Pro"
      subject="Setlist de escenario"
    >
      {/* wrap={false}: el reparto en hojas ya está decidido arriba. Si una se
          pasara de alto por un redondeo, que se recorte y no que escupa una hoja
          extra a medio llenar que nadie va a pegar. */}
      {hojas.map((hoja, h) => (
        <Page key={h} size={[ANCHO_PAGINA, ALTO_PAGINA]} style={s.page} wrap={false}>
          <View style={[s.encabezado, { height: ALTO_ENCABEZADO }]}>
            <Text style={s.encabezadoTxt}>{data.artista}</Text>
            <Text style={s.encabezadoMeta}>
              {data.contexto} · {data.totalCanciones} canciones
              {/* El crew pega las hojas en orden y de prisa: la numeración le
                  evita tener que leer el repertorio para saber cuál va primero. */}
              {hojas.length > 1 ? ` · Hoja ${h + 1} de ${hojas.length}` : ""}
            </Text>
          </View>

          <View style={s.cuerpoHoja}>
            {hoja.map((r) => (
              <View key={r.id} style={[s.renglon, { height: alto / hoja.length }]}>
                <View style={[s.barra, { backgroundColor: r.color ?? "#d9d9d9" }]}>
                  {r.abreBloque && r.bloque !== null ? (
                    <Text style={[s.barraNum, { fontSize: Math.min(fuente * 0.5, 15) }]}>{r.bloque}</Text>
                  ) : null}
                </View>

                <View style={s.cuerpo}>
                  {r.posicion === null ? (
                    <>
                      <Text style={[s.momento, { fontSize: fuenteMomento }]}>{r.titulo}</Text>
                      {r.detalle ? <Text style={[s.detalle, { fontSize: fuenteDetalle }]}>{r.detalle}</Text> : null}
                    </>
                  ) : (
                    <>
                      {r.bloqueNombre ? (
                        <Text style={[s.bloqueNombre, { fontSize: fuenteDetalle, color: r.color ?? "#000000" }]}>
                          {r.bloqueNombre}
                        </Text>
                      ) : null}
                      <View style={s.tituloRenglon}>
                        {/* El número va pegado al título y no en su propia
                            columna: centrado, una columna fija dejaría el
                            conjunto descuadrado hacia la derecha. */}
                        <Text style={[s.titulo, { fontSize: fuente, marginRight: fuente * 0.45 }]}>{r.posicion}.</Text>
                        <Text style={[s.titulo, { fontSize: fuente }]}>{r.titulo}</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}
