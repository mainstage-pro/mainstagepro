import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image,
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
  logoPlaceholder: {
    width: 32,
    height: 32,
  },
});

export interface CartaResponsivaProps {
  // Datos del proyecto
  numeroProyecto: string;
  nombreEvento: string;
  fechaEvento: string;       // "15 de abril de 2026"
  lugarEvento: string;
  ciudad: string;
  descripcionServicio: string; // "producción técnica integral (audio, iluminación y video)"
  descripcionEquipo: string;   // texto libre del equipo a instalar

  // Datos del firmante (manual)
  destinatario: string;      // institución/dependencia
  responsableNombre: string; // quien firma
  cargo: string;
  telefono: string;
  correo: string;

  // Fecha de la carta
  fechaCarta: string;        // "Guadalajara, 13 de abril de 2026"
}

export function CartaResponsivaPDF(p: CartaResponsivaProps) {
  return (
    <Document title={`Carta Responsiva — ${p.nombreEvento}`}>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRODUCCIONES</Text>
            <Text style={s.tagline}>PRODUCCIÓN TÉCNICA · AUDIO · ILUMINACIÓN · VIDEO</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTipo}>CARTA RESPONSIVA</Text>
            <Text style={s.docFecha}>Proyecto {p.numeroProyecto}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        {/* Cuerpo */}
        <View style={s.body}>
          {/* Fecha y ciudad */}
          <Text style={s.dateCity}>{p.fechaCarta}</Text>

          {/* Destinatario */}
          <Text style={s.dest}>{p.destinatario || "____________________________________________"}</Text>
          <Text style={s.presente}>Presente</Text>

          {/* Párrafo 1 */}
          <Text style={s.parrafo}>
            Por medio de la presente, quien suscribe <Text style={{ fontFamily: "Helvetica-Bold" }}>{p.responsableNombre || "___________________________"}</Text>, en representación de{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Mainstage Producciones</Text>, manifiesta que, con motivo del evento{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{p.nombreEvento}</Text> a celebrarse el día{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{p.fechaEvento}</Text> en{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{p.lugarEvento || "___________________________"}</Text>, ubicado en{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{p.ciudad || "___________________________"}</Text>, nuestra empresa realizará las actividades correspondientes a{" "}
            {p.descripcionServicio}.
          </Text>

          {/* Párrafo 2 */}
          <Text style={s.parrafo}>
            Para dicho evento, se contempla la instalación y operación de{" "}
            {p.descripcionEquipo || "los equipos, estructuras y sistemas indicados en la cotización correspondiente"},{" "}
            mismos que serán montados por personal capacitado, aplicando las medidas de seguridad necesarias y observando las disposiciones técnicas correspondientes.
          </Text>

          {/* Párrafo 3 */}
          <Text style={s.parrafo}>
            Asimismo, nos comprometemos a cumplir con la normativa aplicable en materia de seguridad y protección civil dentro del alcance de los servicios proporcionados por nuestra empresa, así como a colaborar con las autoridades competentes en todo lo necesario para contribuir al desarrollo seguro del evento.
          </Text>

          {/* Párrafo 4 */}
          <Text style={s.parrafo}>
            Se hace constar que la responsabilidad respecto a las condiciones estructurales, resistencia y seguridad general del inmueble o recinto corresponde a sus propietarios, administradores o responsables, quienes autorizan su uso para la realización del montaje y desarrollo del evento.
          </Text>

          {/* Cierre */}
          <Text style={s.parrafo}>
            Sin otro particular, quedo a sus órdenes para cualquier aclaración o información adicional.
          </Text>

          <View style={s.separator} />

          <Text style={s.atentamente}>Atentamente,</Text>

          {/* Firma */}
          <View style={s.firmaBlock}>
            <View style={s.firmaCol}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaNombre}>Mainstage Producciones</Text>
              <Text style={s.firmaNombre}>{p.responsableNombre || "___________________________"}</Text>
              <Text style={s.firmaDetalle}>{p.cargo || "Responsable"}</Text>
              {p.telefono ? <Text style={s.firmaGold}>{p.telefono}</Text> : null}
              {p.correo   ? <Text style={s.firmaDetalle}>{p.correo}</Text> : null}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>MAINSTAGE PRODUCCIONES</Text>
          <Text style={s.footerNote}>Documento confidencial · Uso exclusivo de las partes</Text>
        </View>
      </Page>
    </Document>
  );
}
