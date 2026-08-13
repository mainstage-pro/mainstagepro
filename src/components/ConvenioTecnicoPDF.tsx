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
  titulo: { fontSize: 13, fontFamily: "Helvetica-Bold", color: BLACK, textAlign: "center", marginTop: 12, marginBottom: 4, letterSpacing: 0.5 },
  subtitulo: { fontSize: 8, color: LIGHT, textAlign: "center", marginBottom: 14 },
  partes: { backgroundColor: CREAM, borderRadius: 4, padding: 12, marginBottom: 14 },
  parteLabel: { fontSize: 7, color: LIGHT, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  parteNombre: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 2 },
  parteDetalle: { fontSize: 8, color: GRAY },
  intro: { fontSize: 8.5, color: BLACK, lineHeight: 1.6, marginBottom: 10 },
  seccionTitulo: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1, textTransform: "uppercase", borderBottomWidth: 1, borderBottomColor: "#e5e5e5", paddingBottom: 4, marginBottom: 8, marginTop: 14 },
  texto: { fontSize: 8.5, color: BLACK, lineHeight: 1.6, marginBottom: 6 },
  bold: { fontFamily: "Helvetica-Bold" },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 10, fontSize: 8.5, color: GOLD },
  bulletText: { flex: 1, fontSize: 8.5, color: BLACK, lineHeight: 1.5 },
  ejemplo: { backgroundColor: CREAM, borderLeftWidth: 2, borderLeftColor: GOLD, paddingVertical: 8, paddingHorizontal: 10, marginVertical: 6 },
  ejemploTxt: { fontSize: 8, color: GRAY, lineHeight: 1.5 },
  firmaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 30 },
  firmaCol: { width: "44%" },
  firmaLinea: { borderBottomWidth: 1, borderBottomColor: "#999", paddingBottom: 24, marginBottom: 8 },
  firmaNombre: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLACK },
  firmaDetalle: { fontSize: 8, color: LIGHT },
  footer: { position: "absolute", bottom: 22, left: 0, right: 0, paddingHorizontal: 44, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e0e0e0", paddingTop: 8 },
  footerBrand: { fontSize: 6.5, color: "#aaa", letterSpacing: 1 },
  footerPage: { fontSize: 6.5, color: "#aaa" },
});

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <View style={s.bullet}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>{children}</Text></View>
);

export function ConvenioTecnicoPDF(p: DocLaboralSnapshot) {
  return (
    <Document title={`Convenio de Operación Técnica — ${p.personaNombre}`}>
      <Page size="LETTER" style={s.page} wrap>
        <View style={s.header} fixed>
          <View>
            <Text style={s.brand}>MAINSTAGE PRODUCCIONES</Text>
            <Text style={s.tagline}>PRODUCCIÓN TÉCNICA · AUDIO · ILUMINACIÓN · VIDEO</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTipo}>CONVENIO TÉCNICO</Text>
            <Text style={s.docSub}>{p.fechaDocumento}</Text>
          </View>
        </View>
        <View style={s.goldBar} fixed />

        <View style={s.body}>
          <Text style={s.titulo}>CONVENIO INDIVIDUAL DE OPERACIÓN TÉCNICA EN EVENTOS</Text>
          <Text style={s.subtitulo}>Compensación por operación técnica en días de evento</Text>

          <View style={s.partes}>
            <Text style={s.parteLabel}>El/La Colaborador(a)</Text>
            <Text style={s.parteNombre}>{p.personaNombre}</Text>
            <Text style={s.parteDetalle}>{p.puestoNombre}{p.area ? ` · ${p.area}` : ""}</Text>
            {p.personaCorreo && <Text style={s.parteDetalle}>{p.personaCorreo}</Text>}
          </View>

          <Text style={s.intro}>
            El presente convenio establece las condiciones bajo las cuales los colaboradores de Mainstage Producciones que
            desempeñen funciones técnicas en eventos —ya sea en producción, coordinación, fotografía, video u otra área—
            serán compensados en los días en que dicha operación técnica coincida con su jornada laboral ordinaria. Este
            documento complementa el Reglamento Interno de Operación de Mainstage Producciones y forma parte de la relación
            de colaboración de cada persona que lo suscribe.
          </Text>

          <Text style={s.seccionTitulo}>Cláusula 1 — Ámbito de aplicación</Text>
          <Text style={s.texto}>
            Este convenio aplica a todo colaborador que, dentro de su jornada laboral ordinaria de lunes a viernes, sea
            asignado a desempeñar un rol técnico en un evento. Esto incluye, de manera enunciativa mas no limitativa:
          </Text>
          <Bullet>Operación técnica de audio, iluminación, video o energía.</Bullet>
          <Bullet>Coordinación de montaje o desmontaje en campo.</Bullet>
          <Bullet>Documentación fotográfica o en video del evento.</Bullet>
          <Bullet>Cualquier otra función técnica o de apoyo directo en la operación del evento.</Bullet>

          <Text style={s.seccionTitulo}>Cláusula 2 — Esquema de compensación en días de evento</Text>
          <Text style={s.texto}>
            Cuando un día laborable coincida con operación técnica en evento, el pago de ese día se integrará de la
            siguiente manera:
          </Text>
          <Bullet>El valor del día laborable ordinario se aplica como parte del pago total de la operación técnica en el evento.</Bullet>
          <Bullet>Si el pago acordado por la operación técnica es mayor al valor del día laborable, el colaborador recibe únicamente la diferencia como compensación adicional.</Bullet>
          <Bullet>Si el pago acordado por la operación técnica es igual o menor al valor del día laborable, no se genera compensación adicional por ese concepto.</Bullet>
          <View style={s.ejemplo}>
            <Text style={s.ejemploTxt}>
              Ejemplo: si el valor del día laborable es de $500 MXN y el pago técnico acordado por el evento es de $800 MXN,
              el colaborador recibe $300 MXN adicionales como complemento. El día de oficina ya está cubierto dentro del total.
            </Text>
          </View>

          <Text style={s.seccionTitulo}>Cláusula 3 — Condición de excepción: semana cubierta</Text>
          <Text style={s.texto}>
            Si el colaborador cumple íntegramente con todos sus entregables, tareas y plan de trabajo correspondientes a esa
            semana antes del inicio de la operación técnica en el evento, Mainstage Producciones reconoce el día laborable
            como trabajado en su totalidad. En ese caso, el pago del día de oficina y el pago de la operación técnica se
            liquidan de forma independiente, sin aplicar el esquema de compensación integrada de la Cláusula 2.
          </Text>
          <Text style={s.texto}>Se entiende por semana cubierta cuando el colaborador tiene entregados, antes del inicio del evento:</Text>
          <Bullet>Su reporte semanal de área en la plataforma Mainstage.</Bullet>
          <Bullet>Todos los entregables y tareas definidos en su plan de trabajo para esa semana.</Bullet>
          <Bullet>Cualquier compromiso adicional acordado en la junta del lunes o comunicado por Dirección durante la semana.</Bullet>
          <Text style={s.texto}>
            Administración es el área responsable de verificar y confirmar si la semana está cubierta antes del evento. Su
            evaluación se basa en los registros de la plataforma y es definitiva.
          </Text>

          <Text style={s.seccionTitulo}>Cláusula 4 — Comunicación y asignación</Text>
          <Bullet>La asignación a operación técnica en evento se comunica por Dirección o el área de Producción con la mayor anticipación posible.</Bullet>
          <Bullet>El pago técnico acordado por evento se comunica al colaborador antes de la operación y queda registrado en la plataforma Mainstage.</Bullet>
          <Bullet>El colaborador confirma su disponibilidad y acepta las condiciones antes de ser considerado parte del equipo del evento.</Bullet>

          <Text style={s.seccionTitulo}>Cláusula 5 — Liquidación</Text>
          <Bullet>El complemento económico por operación técnica, cuando aplique, se liquida el miércoles de la semana siguiente.</Bullet>
          <Bullet>Cualquier ajuste o aclaración sobre el pago se gestiona directamente con Administración dentro de las 48 horas siguientes al evento.</Bullet>

          <Text style={s.seccionTitulo}>Cláusula 6 — Vigencia y modificaciones</Text>
          <Text style={s.texto}>
            Este convenio entra en vigor en la fecha de su firma y permanece vigente mientras dure la relación de
            colaboración con Mainstage Producciones, salvo modificación acordada por escrito entre ambas partes. Cualquier
            ajuste a las condiciones aquí establecidas deberá comunicarse con al menos 15 días de anticipación y requerirá
            la firma de un nuevo convenio o adenda.
          </Text>

          <Text style={s.seccionTitulo}>Acuse, entendimiento y aceptación</Text>
          <Text style={s.texto}>
            El/La Colaborador(a) declara haber recibido, leído y comprendido en su totalidad el presente Convenio Individual
            de Operación Técnica en Eventos, manifiesta su acuerdo con las condiciones aquí establecidas y se compromete a
            cumplirlas, entendiendo que complementa el Reglamento Interno de Operación de Mainstage Producciones.
          </Text>

          <View style={s.firmaRow}>
            <View style={s.firmaCol}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaNombre}>{p.personaNombre}</Text>
              <Text style={s.firmaDetalle}>{p.puestoNombre}</Text>
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
          <Text style={s.footerBrand}>MAINSTAGE PRODUCCIONES · Convenio de Operación Técnica v1.0</Text>
          <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
