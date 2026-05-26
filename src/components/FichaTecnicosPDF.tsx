import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";

const C = {
  black: "#0a0a0a",
  gold: "#B3985B",
  gray: "#6b7280",
  white: "#ffffff",
  border: "#e5e7eb",
  lightGray: "#f9fafb",
};

// Large, bold, easy-to-read on phone — big font, generous spacing
const styles = StyleSheet.create({
  page: { backgroundColor: C.white, paddingHorizontal: 32, paddingVertical: 36, fontFamily: "Helvetica" },
  logoWrap: { alignItems: "center", marginBottom: 16 },
  logo: { width: 90, height: 24, objectFit: "contain" },
  logoFallback: { fontSize: 10, color: C.gold, fontFamily: "Helvetica-Bold" },
  // Title block
  titleBlock: { alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: C.gold },
  label: { fontSize: 8, color: C.gold, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.black, textAlign: "center" },
  titleSub: { fontSize: 10, color: C.gray, marginTop: 4 },
  // Section
  section: { marginBottom: 18 },
  sectionLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: C.border },
  // Bold data row
  dataRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 7 },
  dataLabel: { fontSize: 8.5, color: C.gray, width: 100, flexShrink: 0, paddingTop: 1 },
  dataValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.black, flex: 1 },
  dataValueSmall: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.black, flex: 1 },
  // Equipo list
  equipoRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  cantBadge: { backgroundColor: C.gold, color: C.white, fontFamily: "Helvetica-Bold", fontSize: 9, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, marginRight: 8, minWidth: 22, textAlign: "center" },
  equipoText: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.black, flex: 1 },
  // Personal
  personalCard: { borderWidth: 0.5, borderColor: C.border, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 5 },
  personalNombre: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.black },
  personalSub: { fontSize: 9, color: C.gray, marginTop: 2 },
  // Acceso note
  noteBox: { backgroundColor: C.lightGray, padding: 10, borderRadius: 4, lineHeight: 1.7, fontSize: 10, color: C.black },
  // Footer
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: C.gray },
  footerGold: { fontSize: 7, color: C.gold },
});

export interface FichaTecnicosData {
  nombre: string;
  numeroProyecto: string;
  fechaEvento: string | null;
  horaSalidaBodega: string | null;
  puntoSalidaBodega: string | null;
  horaMontaje: string | null;
  horaInicio: string | null;
  horaDesmontaje: string | null;
  lugarEvento: string | null;
  direccionVenue: string | null;
  linkMaps: string | null;
  indicacionesAcceso: string | null;
  equipos: { descripcion: string; marca: string | null; cantidad: number; tipo: string }[];
  personal: { nombre: string; rolEnEvento: string | null; rolTecnico: string | null; celular: string | null }[];
  encargadoNombre: string | null;
  encargadoCelular: string | null;
  encargadoCliente: string | null;
  encargadoClienteContacto: string | null;
  logoSrc: string | null;
}

function fmtFecha(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-MX", {
    timeZone: "UTC", weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

export function FichaTecnicosPDF({ data }: { data: FichaTecnicosData }) {
  const equiposPropios = data.equipos.filter(e => e.tipo === "PROPIO");

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Logo */}
        <View style={styles.logoWrap}>
          {data.logoSrc
            ? <Image src={data.logoSrc} style={styles.logo} />
            : <Text style={styles.logoFallback}>Mainstage Pro</Text>
          }
        </View>

        {/* Título */}
        <View style={styles.titleBlock}>
          <Text style={styles.label}>Brief de evento</Text>
          <Text style={styles.title}>{data.nombre}</Text>
          <Text style={styles.titleSub}>
            {data.numeroProyecto}
            {data.fechaEvento ? ` · ${fmtFecha(data.fechaEvento)}` : ""}
          </Text>
        </View>

        {/* CUÁNDO */}
        {(data.horaSalidaBodega || data.horaMontaje || data.horaInicio || data.horaDesmontaje) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Cuándo</Text>
            {data.horaSalidaBodega && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  Salida bodega{data.puntoSalidaBodega ? `\n${data.puntoSalidaBodega}` : ""}
                </Text>
                <Text style={styles.dataValue}>{data.horaSalidaBodega} hrs</Text>
              </View>
            )}
            {data.horaMontaje && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Llegada / montaje</Text>
                <Text style={styles.dataValue}>{data.horaMontaje} hrs</Text>
              </View>
            )}
            {data.horaInicio && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Inicio del evento</Text>
                <Text style={styles.dataValue}>{data.horaInicio} hrs</Text>
              </View>
            )}
            {data.horaDesmontaje && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Salida estimada</Text>
                <Text style={styles.dataValue}>{data.horaDesmontaje} hrs</Text>
              </View>
            )}
          </View>
        )}

        {/* DÓNDE */}
        {(data.lugarEvento || data.direccionVenue || data.linkMaps) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Dónde</Text>
            {data.lugarEvento && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Venue</Text>
                <Text style={styles.dataValue}>{data.lugarEvento}</Text>
              </View>
            )}
            {data.direccionVenue && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Dirección</Text>
                <Text style={styles.dataValueSmall}>{data.direccionVenue}</Text>
              </View>
            )}
            {data.linkMaps && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Maps</Text>
                <Text style={[styles.dataValueSmall, { color: "#2563eb" }]}>{data.linkMaps}</Text>
              </View>
            )}
          </View>
        )}

        {/* ACCESO */}
        {data.indicacionesAcceso && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Acceso</Text>
            <Text style={styles.noteBox}>{data.indicacionesAcceso}</Text>
          </View>
        )}

        {/* EQUIPOS */}
        {equiposPropios.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Equipos</Text>
            {equiposPropios.map((eq, i) => (
              <View key={i} style={styles.equipoRow}>
                <Text style={styles.cantBadge}>{eq.cantidad}</Text>
                <Text style={styles.equipoText}>
                  {eq.marca ? `${eq.marca} ` : ""}{eq.descripcion}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* EQUIPO DE TRABAJO */}
        {data.personal.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Equipo de trabajo</Text>
            {data.personal.map((p, i) => (
              <View key={i} style={styles.personalCard}>
                <Text style={styles.personalNombre}>{p.nombre}</Text>
                <Text style={styles.personalSub}>
                  {p.rolEnEvento ?? p.rolTecnico ?? "Técnico"}
                  {p.celular ? ` · ${p.celular}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* COORDINACIÓN EN SITIO */}
        {data.encargadoNombre && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Coordinación en sitio</Text>
            <View style={styles.personalCard}>
              <Text style={styles.personalNombre}>{data.encargadoNombre}</Text>
              {data.encargadoCelular && <Text style={styles.personalSub}>{data.encargadoCelular}</Text>}
            </View>
          </View>
        )}

        {/* CLIENTE EN SITIO */}
        {data.encargadoCliente && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Cliente en sitio</Text>
            <View style={styles.personalCard}>
              <Text style={styles.personalNombre}>{data.encargadoCliente}</Text>
              {data.encargadoClienteContacto && <Text style={styles.personalSub}>{data.encargadoClienteContacto}</Text>}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerGold}>Mainstage Pro · Brief para Técnicos</Text>
          <Text style={styles.footerText}>{data.numeroProyecto}</Text>
        </View>

      </Page>
    </Document>
  );
}
