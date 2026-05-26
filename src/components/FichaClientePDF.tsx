import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";

const C = {
  black: "#0a0a0a",
  gold: "#B3985B",
  gray: "#6b7280",
  lightGray: "#f3f4f6",
  border: "#e5e7eb",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: { backgroundColor: C.white, paddingHorizontal: 48, paddingVertical: 48, fontFamily: "Helvetica" },
  logoWrap: { alignItems: "center", marginBottom: 28 },
  logo: { width: 120, height: 32, objectFit: "contain" },
  logoFallback: { fontSize: 11, color: C.gold, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.black, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 11, color: C.gray, textAlign: "center", marginBottom: 6 },
  numero: { fontSize: 9, color: C.gold, textAlign: "center", marginBottom: 24, letterSpacing: 0.5 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 18 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 },
  row: { flexDirection: "row", marginBottom: 5 },
  rowLabel: { fontSize: 9, color: C.gray, width: 100, flexShrink: 0 },
  rowValue: { fontSize: 9, color: C.black, flex: 1, fontFamily: "Helvetica-Bold" },
  link: { fontSize: 9, color: "#2563eb" },
  equipoItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  equipoBullet: { fontSize: 9, color: C.gold, marginRight: 6, marginTop: 1 },
  equipoText: { fontSize: 9, color: C.black, flex: 1 },
  indicaciones: { fontSize: 9, color: C.black, lineHeight: 1.6, backgroundColor: C.lightGray, padding: 10, borderRadius: 4, marginTop: 4 },
  footer: { position: "absolute", bottom: 30, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerText: { fontSize: 8, color: C.gray },
  footerGold: { fontSize: 8, color: C.gold },
});

export interface FichaClienteData {
  nombre: string;
  numeroProyecto: string;
  tipoServicio: string | null;
  tipoEvento: string;
  fechaEvento: string | null;
  horaInicio: string | null;
  lugarEvento: string | null;
  direccionVenue: string | null;
  linkMaps: string | null;
  indicacionesCliente: string | null;
  encargadoNombre: string | null;      // encargado interno
  encargadoCelular: string | null;
  cliente: { nombre: string; empresa: string | null };
  equipos: { descripcion: string; marca: string | null; cantidad: number }[];
  logoSrc: string | null;
}

function fmtFecha(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-MX", {
    timeZone: "UTC", weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

export function FichaClientePDF({ data }: { data: FichaClienteData }) {
  const { nombre, numeroProyecto, fechaEvento, horaInicio, lugarEvento, direccionVenue,
    linkMaps, indicacionesCliente, encargadoNombre, encargadoCelular, equipos, logoSrc, tipoServicio, tipoEvento } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Logo */}
        <View style={styles.logoWrap}>
          {logoSrc
            ? <Image src={logoSrc} style={styles.logo} />
            : <Text style={styles.logoFallback}>Mainstage Pro</Text>
          }
        </View>

        {/* Título */}
        <Text style={styles.title}>{nombre}</Text>
        {data.cliente.empresa
          ? <Text style={styles.subtitle}>{data.cliente.nombre} · {data.cliente.empresa}</Text>
          : <Text style={styles.subtitle}>{data.cliente.nombre}</Text>
        }
        <Text style={styles.numero}>{numeroProyecto}</Text>
        <View style={styles.divider} />

        {/* Fecha y lugar */}
        {(fechaEvento || horaInicio || lugarEvento || direccionVenue) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Fecha y lugar</Text>
            {fechaEvento && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Fecha</Text>
                <Text style={styles.rowValue}>{fmtFecha(fechaEvento)}</Text>
              </View>
            )}
            {horaInicio && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Hora de inicio</Text>
                <Text style={styles.rowValue}>{horaInicio} hrs</Text>
              </View>
            )}
            {lugarEvento && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Venue</Text>
                <Text style={styles.rowValue}>{lugarEvento}</Text>
              </View>
            )}
            {direccionVenue && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Dirección</Text>
                <Text style={styles.rowValue}>{direccionVenue}</Text>
              </View>
            )}
            {linkMaps && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Maps</Text>
                <Text style={styles.link}>{linkMaps}</Text>
              </View>
            )}
          </View>
        )}

        {/* Servicio contratado */}
        {(tipoServicio || tipoEvento || equipos.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Servicio contratado</Text>
            {(tipoServicio || tipoEvento) && (
              <View style={[styles.row, { marginBottom: 8 }]}>
                <Text style={styles.rowLabel}>Servicio</Text>
                <Text style={styles.rowValue}>
                  {[tipoServicio, tipoEvento].filter(Boolean).join(" · ")}
                </Text>
              </View>
            )}
            {equipos.map((eq, i) => (
              <View key={i} style={styles.equipoItem}>
                <Text style={styles.equipoBullet}>·</Text>
                <Text style={styles.equipoText}>
                  {eq.cantidad > 1 ? `${eq.cantidad}x ` : ""}
                  {eq.marca ? `${eq.marca} ` : ""}{eq.descripcion}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Coordinador */}
        {encargadoNombre && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tu coordinador</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Nombre</Text>
              <Text style={styles.rowValue}>{encargadoNombre}</Text>
            </View>
            {encargadoCelular && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Contacto</Text>
                <Text style={styles.rowValue}>{encargadoCelular}</Text>
              </View>
            )}
          </View>
        )}

        {/* Indicaciones */}
        {indicacionesCliente && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Lo que necesitamos de tu parte</Text>
            <Text style={styles.indicaciones}>{indicacionesCliente}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerGold}>Mainstage Pro</Text>
          <Text style={styles.footerText}>mainstagepro.mx</Text>
        </View>

      </Page>
    </Document>
  );
}
