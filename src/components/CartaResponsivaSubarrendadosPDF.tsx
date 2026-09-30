import React from "react";
import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";

const GOLD  = "#B3985B";
const BLACK = "#0a0a0a";
const GRAY  = "#4a4a4a";
const LIGHT = "#888888";
const WHITE = "#FFFFFF";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 36,
    paddingBottom: 80,
    paddingHorizontal: 0,
    fontSize: 9.5,
    color: BLACK,
  },
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 48,
    paddingTop: 28,
    paddingBottom: 22,
    marginTop: -36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 2,
    marginBottom: 3,
  },
  tagline: {
    fontSize: 7,
    color: LIGHT,
    letterSpacing: 1,
  },
  docTipo: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    letterSpacing: 1,
  },
  docSubtipo: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 1,
    marginTop: 2,
    textAlign: "right",
  },
  docFecha: {
    fontSize: 8,
    color: LIGHT,
    marginTop: 2,
    textAlign: "right",
  },
  goldBar: {
    height: 2,
    backgroundColor: GOLD,
  },
  body: {
    paddingHorizontal: 48,
    paddingTop: 32,
  },
  dateCity: {
    fontSize: 9.5,
    color: BLACK,
    marginBottom: 20,
  },
  dest: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    marginBottom: 2,
  },
  presente: {
    fontSize: 9.5,
    color: BLACK,
    marginBottom: 24,
  },
  parrafo: {
    fontSize: 9.5,
    color: BLACK,
    lineHeight: 1.7,
    marginBottom: 14,
    textAlign: "justify",
  },
  separator: {
    height: 1,
    backgroundColor: "#e5e5e5",
    marginVertical: 24,
  },
  atentamente: {
    fontSize: 9.5,
    color: BLACK,
    marginBottom: 20,
  },
  firmaBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  firmaCol: {
    width: "45%",
  },
  firmaLinea: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginBottom: 8,
    paddingBottom: 28,
  },
  firmaNombre: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
  },
  firmaDetalle: {
    fontSize: 8.5,
    color: GRAY,
    marginTop: 2,
  },
  firmaGold: {
    fontSize: 8.5,
    color: GOLD,
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 0,
    right: 0,
    paddingHorizontal: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
    paddingTop: 10,
  },
  footerBrand: {
    fontSize: 7,
    color: "#555",
    letterSpacing: 1,
  },
  footerNote: {
    fontSize: 7,
    color: "#555",
  },
});

export interface CartaResponsivaSubarrendadosProps {
  numeroProyecto: string;
  nombreEvento: string;
  fechaEvento: string;
  lugarEvento: string;
  ciudad: string;
  
  destinatario: string;
  responsableNombre: string;
  cargo: string;
  telefono: string;
  correo: string;
  fechaCarta: string;

  nombreProveedor: string;
  representanteProveedor: string;
  descripcionEquipoSubarrendado: string;
}

export function CartaResponsivaSubarrendadosPDF(p: CartaResponsivaSubarrendadosProps) {
  return (
    <Document title={`Asignación de Responsabilidad — ${p.nombreEvento}`}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRODUCCIONES</Text>
            <Text style={s.tagline}>PRODUCCIÓN TÉCNICA · AUDIO · ILUMINACIÓN · VIDEO</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTipo}>ASIGNACIÓN DE RESPONSABILIDAD</Text>
            <Text style={s.docSubtipo}>SERVICIOS SUBARRENDADOS</Text>
            <Text style={s.docFecha}>Proyecto {p.numeroProyecto}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        <View style={s.body}>
          <Text style={s.dateCity}>{p.fechaCarta}</Text>

          <Text style={s.dest}>{p.destinatario || "A QUIEN CORRESPONDA:"}</Text>
          {p.destinatario ? <Text style={s.presente}>Presente</Text> : <Text style={s.presente}></Text>}

          <Text style={s.parrafo}>
            Por medio de la presente, quien suscribe <Text style={{ fontFamily: "Helvetica-Bold" }}>{p.responsableNombre || "___________________________"}</Text>, en representación de{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Mainstage Producciones</Text>, manifiesta que, con motivo del evento{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{p.nombreEvento}</Text> a celebrarse el día{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{p.fechaEvento}</Text> en{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{p.lugarEvento || "___________________________"}</Text>, ubicado en{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{p.ciudad || "___________________________"}</Text>, nuestra empresa fungirá como coordinador y/o integrador de servicios.
          </Text>

          <Text style={s.parrafo}>
            Para el desarrollo de dicho evento, se informa que los servicios y/o equipos correspondientes a{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{p.descripcionEquipoSubarrendado || "_________________________________________________"}</Text>{" "}
            son suministrados, instalados y operados por el proveedor externo{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{p.nombreProveedor || "___________________________"}</Text>.
          </Text>

          <Text style={s.parrafo}>
            Se establece expresamente que dicho proveedor externo asume la responsabilidad total sobre su alcance contratado, incluyendo de manera enunciativa más no limitativa: el estado del equipo, condiciones técnicas, seguridad, diseño (cuando aplique), cálculo estructural, capacidad de carga, instalación, montaje, anclajes, contrapesos, nivelación, estabilidad, operación, supervisión, personal utilizado, desmontaje y retiro. Asimismo, será el único responsable de cualquier falla, defecto, negligencia o incidente directamente atribuible a su servicio o equipo.
          </Text>

          <Text style={s.parrafo}>
            El proveedor <Text style={{ fontFamily: "Helvetica-Bold" }}>{p.nombreProveedor || "___________________________"}</Text> deberá proporcionar la documentación técnica y de seguridad que corresponda según el evento, recinto o autoridad competente, lo cual puede incluir (según aplique): carta responsiva técnica, memoria de cálculo, dictamen estructural, responsable técnico, fichas técnicas, certificaciones, póliza de responsabilidad civil, y cualquier otra documentación solicitada por Protección Civil o el recinto.
          </Text>

          <Text style={s.parrafo}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Mainstage Producciones</Text> conserva expresamente la responsabilidad correspondiente única y exclusivamente a los servicios, actividades y equipos que realiza y opera de forma directa con su propio personal, sin asumir responsabilidad técnica, de diseño, de fabricación, de cálculo estructural, de instalación, de operación o legal sobre el equipo suministrado y ejecutado por el proveedor externo mencionado.
          </Text>

          <View style={s.separator} />

          <Text style={s.atentamente}>De conformidad con lo anterior, firman:</Text>

          <View style={s.firmaBlock}>
            <View style={s.firmaCol}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaNombre}>Mainstage Producciones</Text>
              <Text style={s.firmaNombre}>{p.responsableNombre || "___________________________"}</Text>
              <Text style={s.firmaDetalle}>{p.cargo || "Responsable"}</Text>
              {p.telefono ? <Text style={s.firmaGold}>{p.telefono}</Text> : null}
              {p.correo   ? <Text style={s.firmaDetalle}>{p.correo}</Text> : null}
            </View>
            <View style={s.firmaCol}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaNombre}>{p.nombreProveedor || "Proveedor Externo"}</Text>
              <Text style={s.firmaNombre}>{p.representanteProveedor || "___________________________"}</Text>
              <Text style={s.firmaDetalle}>Representante Legal / Responsable Técnico</Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>MAINSTAGE PRODUCCIONES</Text>
          <Text style={s.footerNote}>Documento confidencial · Uso exclusivo de las partes</Text>
        </View>
      </Page>
    </Document>
  );
}
