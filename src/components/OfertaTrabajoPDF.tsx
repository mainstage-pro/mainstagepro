import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { DocLaboralSnapshot } from "@/lib/documentos-laborales";

const GOLD = "#B3985B";
const BLACK = "#0a0a0a";
const GRAY = "#4a4a4a";
const LIGHT = "#888888";
const WHITE = "#FFFFFF";
const CREAM = "#f7f5f0";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: WHITE, paddingTop: 36, paddingBottom: 72, paddingHorizontal: 0, fontSize: 9, color: BLACK },
  header: { backgroundColor: BLACK, paddingHorizontal: 44, paddingTop: 26, paddingBottom: 20, marginTop: -36, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  brand: { fontSize: 15, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 2 },
  tagline: { fontSize: 6.5, color: LIGHT, letterSpacing: 1 },
  docTipo: { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 1 },
  docSub: { fontSize: 8, color: LIGHT, marginTop: 2, textAlign: "right" },
  goldBar: { height: 2, backgroundColor: GOLD },
  body: { paddingHorizontal: 44, paddingTop: 20 },
  titulo: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BLACK, textAlign: "center", marginVertical: 14, letterSpacing: 1 },
  intro: { fontSize: 9, color: GRAY, lineHeight: 1.65, marginBottom: 14 },
  partes: { backgroundColor: CREAM, borderRadius: 4, padding: 12, marginBottom: 14, flexDirection: "row", justifyContent: "space-between" },
  parteCol: { width: "46%" },
  parteLabel: { fontSize: 7, color: LIGHT, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  parteNombre: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 2 },
  parteDetalle: { fontSize: 8, color: GRAY },
  seccionTitulo: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1, textTransform: "uppercase", borderBottomWidth: 1, borderBottomColor: "#e5e5e5", paddingBottom: 4, marginBottom: 8, marginTop: 14 },
  texto: { fontSize: 8.5, color: BLACK, lineHeight: 1.65, marginBottom: 6 },
  bold: { fontFamily: "Helvetica-Bold" },
  row2: { flexDirection: "row", gap: 20, marginBottom: 8 },
  campo: { flex: 1 },
  campoLabel: { fontSize: 7, color: LIGHT, marginBottom: 2 },
  campoValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 10, fontSize: 8.5, color: GOLD },
  bulletText: { flex: 1, fontSize: 8.5, color: BLACK, lineHeight: 1.5 },
  firmaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 30 },
  firmaCol: { width: "44%" },
  firmaLinea: { borderBottomWidth: 1, borderBottomColor: "#999", paddingBottom: 24, marginBottom: 8 },
  firmaNombre: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLACK },
  firmaDetalle: { fontSize: 8, color: LIGHT },
  footer: { position: "absolute", bottom: 22, left: 0, right: 0, paddingHorizontal: 44, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e0e0e0", paddingTop: 8 },
  footerBrand: { fontSize: 6.5, color: "#aaa", letterSpacing: 1 },
  footerPage: { fontSize: 6.5, color: "#aaa" },
});

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
const MODALIDAD: Record<string, string> = {
  PRESENCIAL: "presencial en las instalaciones de la empresa",
  REMOTO: "remota / home office",
  HIBRIDO: "híbrida (combinación presencial y remota)",
};
const PERIODO: Record<string, string> = { MENSUAL: "mensual", QUINCENAL: "quincenal", SEMANAL: "semanal", POR_EVENTO: "por evento" };

export function OfertaTrabajoPDF(p: DocLaboralSnapshot) {
  const funciones = p.funciones.length ? p.funciones : p.responsabilidades;
  return (
    <Document title={`Oferta — ${p.personaNombre}`}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRODUCCIONES</Text>
            <Text style={s.tagline}>PRODUCCIÓN TÉCNICA · AUDIO · ILUMINACIÓN · VIDEO</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTipo}>OFERTA DE TRABAJO</Text>
            <Text style={s.docSub}>{p.fechaDocumento}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        <View style={s.body}>
          <Text style={s.titulo}>CARTA OFERTA DE TRABAJO</Text>

          <Text style={s.intro}>
            Estimado(a) <Text style={s.bold}>{p.personaNombre}</Text>, nos complace extenderle la presente oferta para incorporarse
            al equipo de Mainstage Producciones. A continuación se detallan las condiciones del puesto ofrecido.
          </Text>

          <View style={s.partes}>
            <View style={s.parteCol}>
              <Text style={s.parteLabel}>La Empresa</Text>
              <Text style={s.parteNombre}>Mainstage Producciones</Text>
              <Text style={s.parteDetalle}>Producción técnica integral · Querétaro, México</Text>
            </View>
            <View style={s.parteCol}>
              <Text style={s.parteLabel}>Candidato(a)</Text>
              <Text style={s.parteNombre}>{p.personaNombre}</Text>
              {p.personaTelefono && <Text style={s.parteDetalle}>{p.personaTelefono}</Text>}
              {p.personaCorreo && <Text style={s.parteDetalle}>{p.personaCorreo}</Text>}
            </View>
          </View>

          <Text style={s.seccionTitulo}>Puesto ofrecido</Text>
          <View style={s.row2}>
            <View style={s.campo}><Text style={s.campoLabel}>PUESTO</Text><Text style={s.campoValue}>{p.puestoNombre}</Text></View>
            <View style={s.campo}><Text style={s.campoLabel}>ÁREA</Text><Text style={s.campoValue}>{p.area}</Text></View>
            {p.fechaIngreso && <View style={s.campo}><Text style={s.campoLabel}>INICIO PROPUESTO</Text><Text style={s.campoValue}>{p.fechaIngreso}</Text></View>}
          </View>
          {p.misionPuesto && <Text style={s.texto}>{p.misionPuesto}</Text>}

          {funciones.length > 0 && (
            <>
              <Text style={s.seccionTitulo}>Funciones principales</Text>
              {funciones.map((fn, i) => (
                <View key={i} style={s.bullet}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>{fn}</Text></View>
              ))}
            </>
          )}

          <Text style={s.seccionTitulo}>Condiciones</Text>
          <View style={s.row2}>
            {p.salario != null && <View style={s.campo}><Text style={s.campoLabel}>COMPENSACIÓN</Text><Text style={s.campoValue}>{fmt(p.salario)} {PERIODO[p.periodoPago] ?? ""}</Text></View>}
            {p.tipoContrato && <View style={s.campo}><Text style={s.campoLabel}>TIPO</Text><Text style={s.campoValue}>{p.tipoContrato}</Text></View>}
            {p.modalidad && <View style={s.campo}><Text style={s.campoLabel}>MODALIDAD</Text><Text style={s.campoValue}>{p.modalidad}</Text></View>}
          </View>
          <Text style={s.texto}>
            La modalidad de trabajo será <Text style={s.bold}>{MODALIDAD[p.modalidad ?? ""] ?? "presencial"}</Text>.
            {p.horario && <> El horario será <Text style={s.bold}>{p.horario}</Text>, ajustable según las necesidades operativas de los eventos.</>}
            {" "}Por la naturaleza del giro (producción de eventos), la disponibilidad podrá requerirse en fines de semana y horarios nocturnos conforme al calendario de eventos.
          </Text>

          {p.beneficios.length > 0 && (
            <>
              <Text style={s.seccionTitulo}>Beneficios</Text>
              {p.beneficios.map((b, i) => (
                <View key={i} style={s.bullet}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>{b}</Text></View>
              ))}
            </>
          )}

          <Text style={s.seccionTitulo}>Vigencia de la oferta</Text>
          <Text style={s.texto}>
            La presente oferta está sujeta a la aceptación del candidato y a la formalización del acuerdo laboral correspondiente.
            La aceptación de este documento no constituye una relación laboral hasta la firma del acuerdo definitivo.
          </Text>

          <View style={s.firmaRow}>
            <View style={s.firmaCol}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaNombre}>{p.personaNombre}</Text>
              <Text style={s.firmaDetalle}>Candidato(a)</Text>
              <Text style={s.firmaDetalle}>Fecha: ____/____/______</Text>
            </View>
            <View style={s.firmaCol}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaNombre}>{p.responsableNombre}</Text>
              <Text style={s.firmaDetalle}>Mainstage Producciones</Text>
              <Text style={s.firmaDetalle}>Fecha: ____/____/______</Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>MAINSTAGE PRODUCCIONES</Text>
          <Text style={s.footerPage}>Oferta confidencial · Uso exclusivo de las partes</Text>
        </View>
      </Page>
    </Document>
  );
}
