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
 */
import React from "react";
import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { C } from "../PdfShared";

/// El dorado de marca sobre blanco no alcanza contraste en 6 pt; para texto
/// chico se usa esta variante oscurecida. En fondos negros o dorados va C.dorado.
export const DORADO_TXT = "#8a6f33";

export const g = StyleSheet.create({
  // El padding de arriba existe para las páginas de continuación, que no
  // llevan hero y si no arrancan pegadas al borde. En la primera lo cancela
  // el margen negativo del hero, que sí tiene que sangrar hasta el filo.
  page: {
    backgroundColor: C.blanco,
    fontFamily: "Helvetica",
    paddingTop: 28,
    paddingBottom: 50,
    paddingHorizontal: 0,
    fontSize: 8.5,
    color: C.negro,
  },
  // Hero negro de ancho completo
  hero: {
    backgroundColor: C.negro,
    marginTop: -28,
    paddingHorizontal: 34,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroLeft: { flex: 1, paddingRight: 14 },
  heroTag: { fontSize: 6.5, color: C.dorado, textTransform: "uppercase", letterSpacing: 1.6, marginBottom: 5 },
  heroTitulo: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.blanco, lineHeight: 1.2 },
  heroSub: { fontSize: 9.5, color: "#cccccc", marginTop: 4 },
  heroMeta: { fontSize: 7.5, color: "#777777", marginTop: 3 },
  heroRight: { alignItems: "flex-end" },
  heroLogo: { width: 92, height: 26, objectFit: "contain" },
  heroLogoArtista: { width: 50, height: 50, objectFit: "contain", marginTop: 10 },
  // Banda dorada de datos duros
  banda: { flexDirection: "row", backgroundColor: C.dorado, paddingHorizontal: 34, paddingVertical: 7 },
  bandaItem: { flex: 1, paddingRight: 6 },
  bandaLabel: { fontSize: 5.8, color: "#6b4e1a", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  bandaVal: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.negro },
  bandaSub: { fontSize: 6, color: "#6b4e1a", marginTop: 1 },
  // Cuerpo
  body: { paddingHorizontal: 34, paddingTop: 16 },
  seccion: { marginBottom: 14 },
  secTitulo: {
    fontSize: 7.2, fontFamily: "Helvetica-Bold", color: C.blanco,
    textTransform: "uppercase", letterSpacing: 1.3,
    backgroundColor: C.negro, paddingVertical: 4.5, paddingHorizontal: 8, borderRadius: 3,
  },
  secNota: { fontSize: 6.8, color: C.grisClaro, marginTop: 4 },
  secBody: { marginTop: 7 },
  // Pares clave-valor
  kvGrid: { flexDirection: "row", flexWrap: "wrap" },
  kvLabel: { fontSize: 6.2, color: C.grisClaro, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 1.5 },
  kvVal: { fontSize: 8.5, color: C.negro, lineHeight: 1.4 },
  kvLink: { fontSize: 8, color: "#1a73e8" },
  // Tabla
  tabla: { width: "100%", borderWidth: 0.5, borderColor: C.grisLinea, borderStyle: "solid", borderRadius: 3 },
  tablaHd: {
    flexDirection: "row", backgroundColor: C.grisFondo,
    paddingVertical: 4, paddingHorizontal: 7,
    borderBottomWidth: 0.5, borderBottomColor: C.grisLinea, borderBottomStyle: "solid",
  },
  tablaHdTxt: {
    fontSize: 6.2, fontFamily: "Helvetica-Bold", color: C.grisMedio,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  tablaFila: {
    flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 7,
    borderBottomWidth: 0.3, borderBottomColor: "#f0f0f0", borderBottomStyle: "solid",
    alignItems: "flex-start",
  },
  tablaFilaAlt: { backgroundColor: "#fafafa" },
  tablaGrupo: {
    flexDirection: "row", backgroundColor: "#f1f1f1",
    paddingVertical: 3.2, paddingHorizontal: 7,
    borderBottomWidth: 0.5, borderBottomColor: C.grisLinea, borderBottomStyle: "solid",
  },
  tablaGrupoTxt: {
    fontSize: 6.4, fontFamily: "Helvetica-Bold", color: C.negro,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  celda: { fontSize: 8.2, color: C.negro, lineHeight: 1.35 },
  celdaFuerte: { fontSize: 8.4, fontFamily: "Helvetica-Bold", color: C.negro },
  celdaSub: { fontSize: 6.6, color: C.grisMedio, marginTop: 1, lineHeight: 1.35 },
  // Caja de nota
  nota: {
    backgroundColor: "#fffbf2", borderLeftWidth: 2.5, borderLeftColor: C.dorado, borderLeftStyle: "solid",
    paddingVertical: 7, paddingHorizontal: 9, borderRadius: 2, marginBottom: 7,
  },
  notaLabel: {
    fontSize: 6.2, fontFamily: "Helvetica-Bold", color: DORADO_TXT,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3,
  },
  notaTxt: { fontSize: 8.4, color: C.negro, lineHeight: 1.55 },
  // Caja de alerta (lo que falta)
  alerta: {
    backgroundColor: C.rojoFondo, borderLeftWidth: 2.5, borderLeftColor: C.rojo, borderLeftStyle: "solid",
    paddingVertical: 7, paddingHorizontal: 9, borderRadius: 2, marginBottom: 7,
  },
  alertaLabel: {
    fontSize: 6.2, fontFamily: "Helvetica-Bold", color: C.rojo,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3,
  },
  alertaItem: { fontSize: 8.2, color: C.negro, lineHeight: 1.5 },
  vacio: { fontSize: 8, color: C.grisClaro, fontStyle: "italic" },
  // Pie fijo
  pie: {
    position: "absolute", bottom: 16, left: 34, right: 34,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopWidth: 0.5, borderTopColor: C.grisLinea, borderTopStyle: "solid", paddingTop: 5,
  },
  pieTxt: { fontSize: 6.3, color: C.grisClaro },
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
  /// Ancho fijo en puntos; si falta, la columna reparte el resto con `flex`.
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
  | { tipo: "grupo"; clave: string; texto: string }
  | { tipo: "fila"; clave: string; celdas: CeldaTabla[] };

function estiloColumna(c: ColumnaTabla): { width?: number; flex?: number; paddingRight: number } {
  if (c.ancho) return { width: c.ancho, paddingRight: 4 };
  return { flex: c.flex ?? 1, paddingRight: 4 };
}

export function Tabla({ columnas, renglones }: { columnas: ColumnaTabla[]; renglones: RenglonTabla[] }) {
  if (renglones.length === 0) return <Text style={g.vacio}>Sin renglones todavía.</Text>;

  let alterna = 0;

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
          alterna = 0;
          return (
            <View key={r.clave} style={g.tablaGrupo} wrap={false}>
              <Text style={g.tablaGrupoTxt}>{r.texto}</Text>
            </View>
          );
        }
        const impar = alterna++ % 2 === 1;
        return (
          <View key={r.clave} style={impar ? [g.tablaFila, g.tablaFilaAlt] : g.tablaFila} wrap={false}>
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

export function Nota({ label, texto }: { label: string; texto: string | null | undefined }) {
  if (!texto || !texto.trim()) return null;
  return (
    <View style={g.nota} wrap={false}>
      <Text style={g.notaLabel}>{label}</Text>
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
