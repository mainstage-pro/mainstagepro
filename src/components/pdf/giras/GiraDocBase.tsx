/**
 * GiraDocBase.tsx — Base visual de los documentos de gira.
 *
 * Los cuatro documentos (day sheet, rider, listas de canales y advance) se
 * mandan al mismo correo y los lee la misma gente, así que comparten hero,
 * banda de datos, secciones y tabla. Si cada uno trajera su propio diseño,
 * el paquete se vería como si lo hubieran armado cuatro proveedores.
 *
 * Hereda la paleta de PdfShared para que un documento de gira y una ficha de
 * proyecto se reconozcan como de la misma casa.
 *
 * La escala tipográfica está pensada para leerse de pie y con media luz: estos
 * papeles se consultan en el foro, de noche, no en un escritorio. De ahí que el
 * cuerpo arranque en 10 pt y que no haya texto por debajo de 7 pt, y de ahí que
 * el adorno se haya quitado — rellenos, bordes y zebras en gris clarito no se
 * ven en penumbra y sí le quitan aire a la letra.
 */
import React from "react";
import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { C } from "../PdfShared";

/// El dorado de marca sobre blanco no alcanza contraste en 6 pt; para texto
/// chico se usa esta variante oscurecida. En fondos negros o dorados va C.dorado.
export const DORADO_TXT = "#8a6f33";

/// Margen lateral de todo el documento. El hero y la banda sangran a los dos
/// bordes, así que lo aplica cada bloque y no la página.
const MARGEN = 30;

export const g = StyleSheet.create({
  // El padding de arriba existe para las páginas de continuación, que no
  // llevan hero y si no arrancan pegadas al borde. En la primera lo cancela
  // el margen negativo del hero, que sí tiene que sangrar hasta el filo.
  page: {
    backgroundColor: C.blanco,
    fontFamily: "Helvetica",
    paddingTop: 30,
    paddingBottom: 54,
    paddingHorizontal: 0,
    fontSize: 10,
    color: C.negro,
  },
  // Hero negro de ancho completo
  hero: {
    backgroundColor: C.negro,
    marginTop: -30,
    paddingHorizontal: MARGEN,
    paddingTop: 24,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroLeft: { flex: 1, paddingRight: 16 },
  heroTag: { fontSize: 7.5, color: C.dorado, textTransform: "uppercase", letterSpacing: 2, marginBottom: 7 },
  heroTitulo: { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.blanco, lineHeight: 1.18 },
  heroSub: { fontSize: 11, color: "#d6d6d6", marginTop: 6 },
  heroMeta: { fontSize: 8.5, color: "#8f8f8f", marginTop: 4 },
  heroRight: { alignItems: "flex-end" },
  heroLogo: { width: 100, height: 28, objectFit: "contain" },
  heroLogoArtista: { width: 54, height: 54, objectFit: "contain", marginTop: 12 },
  // Banda dorada de datos duros
  banda: { flexDirection: "row", backgroundColor: C.dorado, paddingHorizontal: MARGEN, paddingVertical: 9 },
  bandaItem: { flex: 1, paddingRight: 8 },
  bandaLabel: { fontSize: 7, color: "#5e4315", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2.5 },
  bandaVal: { fontSize: 12.5, fontFamily: "Helvetica-Bold", color: C.negro },
  bandaSub: { fontSize: 7.2, color: "#5e4315", marginTop: 1.5 },
  // Cuerpo
  body: { paddingHorizontal: MARGEN, paddingTop: 20 },
  seccion: { marginBottom: 18 },
  // Un filete dorado en vez del recuadro negro: a esta escala la barra rellena
  // pesaba más que el contenido que anuncia.
  secTitulo: {
    fontSize: 9, fontFamily: "Helvetica-Bold", color: C.negro,
    textTransform: "uppercase", letterSpacing: 1.6,
    paddingBottom: 5, borderBottomWidth: 1.2, borderBottomColor: C.dorado, borderBottomStyle: "solid",
  },
  secNota: { fontSize: 8, color: C.grisMedio, marginTop: 6, lineHeight: 1.45 },
  secBody: { marginTop: 10 },
  // Pares clave-valor
  kvGrid: { flexDirection: "row", flexWrap: "wrap" },
  kvLabel: { fontSize: 7.2, color: C.grisMedio, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  kvVal: { fontSize: 10, color: C.negro, lineHeight: 1.4 },
  kvLink: { fontSize: 9.5, color: "#1a73e8" },
  // Tabla: sin marco ni relleno, las columnas alineadas al margen del cuerpo y
  // solo filetes horizontales. Lo que separa los renglones es el aire.
  tabla: { width: "100%" },
  tablaHd: {
    flexDirection: "row",
    paddingBottom: 5,
    borderBottomWidth: 1, borderBottomColor: C.negro, borderBottomStyle: "solid",
  },
  tablaHdTxt: {
    fontSize: 7.2, fontFamily: "Helvetica-Bold", color: C.negro,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  tablaFila: {
    flexDirection: "row", paddingVertical: 6.5,
    borderBottomWidth: 0.4, borderBottomColor: "#e2e2e2", borderBottomStyle: "solid",
    alignItems: "flex-start",
  },
  tablaGrupo: {
    flexDirection: "row", alignItems: "center",
    paddingTop: 13, paddingBottom: 5,
    borderBottomWidth: 0.6, borderBottomColor: C.grisLinea, borderBottomStyle: "solid",
  },
  tablaGrupoTxt: {
    fontSize: 8.2, fontFamily: "Helvetica-Bold", color: C.negro,
    textTransform: "uppercase", letterSpacing: 1.1,
  },
  tablaGrupoChip: { width: 7, height: 7, borderRadius: 2, marginRight: 6 },
  celda: { fontSize: 9.8, color: C.negro, lineHeight: 1.35 },
  celdaFuerte: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.negro },
  celdaSub: { fontSize: 8.2, color: C.grisMedio, marginTop: 1.5, lineHeight: 1.35 },
  // Caja de nota
  nota: {
    backgroundColor: "#fffbf2", borderLeftWidth: 3, borderLeftColor: C.dorado, borderLeftStyle: "solid",
    paddingVertical: 9, paddingHorizontal: 11, borderRadius: 2, marginBottom: 9,
  },
  notaLabel: {
    fontSize: 7.2, fontFamily: "Helvetica-Bold", color: DORADO_TXT,
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 4,
  },
  notaTxt: { fontSize: 10, color: C.negro, lineHeight: 1.5 },
  // Caja de alerta (lo que falta)
  alerta: {
    backgroundColor: C.rojoFondo, borderLeftWidth: 3, borderLeftColor: C.rojo, borderLeftStyle: "solid",
    paddingVertical: 9, paddingHorizontal: 11, borderRadius: 2, marginBottom: 9,
  },
  alertaLabel: {
    fontSize: 7.2, fontFamily: "Helvetica-Bold", color: C.rojo,
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 4,
  },
  alertaItem: { fontSize: 9.8, color: C.negro, lineHeight: 1.5 },
  vacio: { fontSize: 9.5, color: C.grisMedio, fontStyle: "italic" },
  // Pie fijo
  pie: {
    position: "absolute", bottom: 18, left: MARGEN, right: MARGEN,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopWidth: 0.5, borderTopColor: C.grisLinea, borderTopStyle: "solid", paddingTop: 6,
  },
  pieTxt: { fontSize: 7.2, color: C.grisMedio },
});

// ── Hero ──────────────────────────────────────────────────────────────────────

export function HeroGira({
  tag, titulo, subtitulo, meta, logoSrc, logoArtistaSrc,
}: {
  tag: string;
  titulo: string;
  subtitulo?: string | null;
  meta?: string | null;
  logoSrc: string | null;
  logoArtistaSrc?: string | null;
}) {
  return (
    <View style={g.hero}>
      <View style={g.heroLeft}>
        <Text style={g.heroTag}>{tag}</Text>
        <Text style={g.heroTitulo}>{titulo}</Text>
        {subtitulo ? <Text style={g.heroSub}>{subtitulo}</Text> : null}
        {meta ? <Text style={g.heroMeta}>{meta}</Text> : null}
      </View>
      <View style={g.heroRight}>
        {logoSrc ? <Image src={logoSrc} style={g.heroLogo} /> : null}
        {logoArtistaSrc ? <Image src={logoArtistaSrc} style={g.heroLogoArtista} /> : null}
      </View>
    </View>
  );
}

// ── Banda de datos duros ──────────────────────────────────────────────────────

export interface ItemBanda {
  label: string;
  valor: string;
  sub?: string | null;
}

export function BandaGira({ items }: { items: ItemBanda[] }) {
  if (items.length === 0) return null;
  return (
    <View style={g.banda}>
      {items.map((i) => (
        <View key={i.label} style={g.bandaItem}>
          <Text style={g.bandaLabel}>{i.label}</Text>
          <Text style={g.bandaVal}>{i.valor}</Text>
          {i.sub ? <Text style={g.bandaSub}>{i.sub}</Text> : null}
        </View>
      ))}
    </View>
  );
}

// ── Sección ───────────────────────────────────────────────────────────────────

export function Seccion({
  titulo, nota, children,
}: {
  titulo: string;
  nota?: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={g.seccion}>
      <Text style={g.secTitulo}>{titulo}</Text>
      {nota ? <Text style={g.secNota}>{nota}</Text> : null}
      <View style={g.secBody}>{children}</View>
    </View>
  );
}

// ── Pares clave-valor ─────────────────────────────────────────────────────────

export interface Dato {
  label: string;
  valor: string;
  link?: string | null;
  /// Fracción del ancho: 2 = media página, 4 = completa. Default 2.
  ancho?: 1 | 2 | 3 | 4;
}

export function Datos({ datos }: { datos: Dato[] }) {
  const llenos = datos.filter((d) => d.valor && d.valor !== "—");
  if (llenos.length === 0) return <Text style={g.vacio}>Sin capturar.</Text>;
  return (
    <View style={g.kvGrid}>
      {llenos.map((d) => (
        <View key={d.label} style={{ width: `${((d.ancho ?? 2) / 4) * 100}%`, paddingRight: 12, marginBottom: 6 }}>
          <Text style={g.kvLabel}>{d.label}</Text>
          <Text style={g.kvVal}>{d.valor}</Text>
          {d.link ? (
            <Link src={d.link} style={g.kvLink}>
              {d.link.replace(/^https?:\/\//, "").slice(0, 70)}
            </Link>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ── Tabla ─────────────────────────────────────────────────────────────────────

export interface ColumnaTabla {
  label: string;
  /// Ancho fijo en puntos a la escala vieja de 8.2 pt; `estiloColumna` lo crece
  /// con la letra. Si falta, la columna reparte el resto con `flex`.
  ancho?: number;
  flex?: number;
  alinear?: "left" | "right" | "center";
}

export interface CeldaTabla {
  texto: string;
  sub?: string | null;
  fuerte?: boolean;
  color?: string;
}

export type RenglonTabla =
  /// `color` pinta una viñeta del color del grupo, para cruzar el papel con otro
  /// donde el mismo grupo ya viene de color (el setlist y su hoja de escenario).
  | { tipo: "grupo"; clave: string; texto: string; color?: string | null }
  | { tipo: "fila"; clave: string; celdas: CeldaTabla[] };

/// Los anchos fijos de cada documento (teléfonos, horas, fechas) se midieron
/// para la celda de 8.2 pt. Al crecer la letra se crecen con ella en un solo
/// lugar, para no reescribir cuarenta números a ojo en cinco archivos.
const ESCALA_ANCHO = 1.2;

function estiloColumna(c: ColumnaTabla): { width?: number; flex?: number; paddingRight: number } {
  if (c.ancho) return { width: Math.round(c.ancho * ESCALA_ANCHO), paddingRight: 6 };
  return { flex: c.flex ?? 1, paddingRight: 6 };
}

export function Tabla({ columnas, renglones }: { columnas: ColumnaTabla[]; renglones: RenglonTabla[] }) {
  if (renglones.length === 0) return <Text style={g.vacio}>Sin renglones todavía.</Text>;

  return (
    <View style={g.tabla}>
      <View style={g.tablaHd} fixed>
        {columnas.map((c) => (
          <View key={c.label} style={estiloColumna(c)}>
            <Text style={[g.tablaHdTxt, { textAlign: c.alinear ?? "left" }]}>{c.label}</Text>
          </View>
        ))}
      </View>

      {renglones.map((r) => {
        if (r.tipo === "grupo") {
          return (
            <View key={r.clave} style={g.tablaGrupo} wrap={false}>
              {r.color ? <View style={[g.tablaGrupoChip, { backgroundColor: r.color }]} /> : null}
              <Text style={g.tablaGrupoTxt}>{r.texto}</Text>
            </View>
          );
        }
        return (
          <View key={r.clave} style={g.tablaFila} wrap={false}>
            {columnas.map((c, i) => {
              const celda = r.celdas[i] ?? { texto: "" };
              return (
                <View key={c.label} style={estiloColumna(c)}>
                  <Text
                    style={[
                      celda.fuerte ? g.celdaFuerte : g.celda,
                      { textAlign: c.alinear ?? "left" },
                      celda.color ? { color: celda.color } : {},
                    ]}
                  >
                    {celda.texto || "—"}
                  </Text>
                  {celda.sub ? (
                    <Text style={[g.celdaSub, { textAlign: c.alinear ?? "left" }]}>{celda.sub}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

// ── Cajas de texto libre ──────────────────────────────────────────────────────

/// Sin label cuando el título de arriba ya dice de qué habla el párrafo:
/// repetirlo lee como si fueran dos cosas distintas.
export function Nota({ label, texto }: { label?: string | null; texto: string | null | undefined }) {
  if (!texto || !texto.trim()) return null;
  return (
    <View style={g.nota} wrap={false}>
      {label ? <Text style={g.notaLabel}>{label}</Text> : null}
      <Text style={g.notaTxt}>{texto.trim()}</Text>
    </View>
  );
}

export function Alerta({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={g.alerta}>
      <Text style={g.alertaLabel}>{label}</Text>
      {items.map((t, i) => (
        <Text key={`${i}-${t}`} style={g.alertaItem}>
          • {t}
        </Text>
      ))}
    </View>
  );
}

// ── Pie ───────────────────────────────────────────────────────────────────────

export function PieGira({ izquierda, derecha }: { izquierda: string; derecha: string }) {
  return (
    <View style={g.pie} fixed>
      <Text style={g.pieTxt}>{izquierda}</Text>
      <Text style={g.pieTxt} render={({ pageNumber, totalPages }) => `${derecha} · ${pageNumber}/${totalPages}`} />
    </View>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

/// Todas las páginas de un documento de gira son carta. El padding no va en la
/// página porque el hero y la banda sangran a los dos bordes; lo pone `Cuerpo`.
export function PaginaGira({ children }: { children: React.ReactNode }) {
  return <Page size="LETTER" style={g.page}>{children}</Page>;
}

export function Cuerpo({ children }: { children: React.ReactNode }) {
  return <View style={g.body}>{children}</View>;
}

export { Document, Text, View };
