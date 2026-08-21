import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";
import { getEquipoDisplayName } from "@/lib/equipoNombre";

const C = {
  black: "#0a0a0a",
  gold: "#B3985B",
  gray: "#6b7280",
  lightGray: "#f9fafb",
  border: "#e5e7eb",
  white: "#ffffff",
  darkLine: "#d1d5db",
};

const styles = StyleSheet.create({
  page: { backgroundColor: C.white, paddingHorizontal: 40, paddingVertical: 40, fontFamily: "Helvetica", fontSize: 9 },
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: C.gold },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: "flex-end" },
  logo: { width: 100, height: 26, objectFit: "contain" },
  logoFallback: { fontSize: 10, color: C.gold, fontFamily: "Helvetica-Bold" },
  headerTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.black, marginBottom: 3 },
  headerSub: { fontSize: 8, color: C.gray },
  headerBadge: { fontSize: 8, color: C.gold, fontFamily: "Helvetica-Bold" },
  headerDate: { fontSize: 7.5, color: C.gray, marginTop: 3 },
  // Section
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.gold, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: C.border },
  // Rows
  row: { flexDirection: "row", marginBottom: 3.5 },
  rowLabel: { width: 130, flexShrink: 0, color: C.gray },
  rowValue: { flex: 1, color: C.black, fontFamily: "Helvetica-Bold" },
  // Table
  table: { borderWidth: 0.5, borderColor: C.border, borderRadius: 2 },
  tableHeader: { flexDirection: "row", backgroundColor: C.lightGray, borderBottomWidth: 0.5, borderBottomColor: C.border, paddingVertical: 4, paddingHorizontal: 8 },
  tableHeaderCell: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.gray, textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: C.border },
  tableCell: { fontSize: 8.5, color: C.black },
  tableCellSub: { fontSize: 7, color: C.gray, marginTop: 1 },
  // List
  listItem: { flexDirection: "row", marginBottom: 3.5 },
  listBullet: { color: C.gold, marginRight: 5, marginTop: 1 },
  listText: { flex: 1, color: C.black },
  // Note
  noteBox: { backgroundColor: C.lightGray, padding: 8, borderRadius: 3, lineHeight: 1.6, color: C.black },
  // Footer
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: C.gray },
  footerGold: { fontSize: 7, color: C.gold },
  // Two column
  twoCol: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
});

export interface FichaCoordinadorData {
  nombre: string;
  numeroProyecto: string;
  tipoEvento: string;
  tipoServicio: string | null;
  fechaEvento: string | null;
  lugarEvento: string | null;
  direccionVenue: string | null;
  linkMaps: string | null;
  indicacionesAcceso: string | null;
  horaSalidaBodega: string | null;
  puntoSalidaBodega: string | null;
  horaMontaje: string | null;
  horaInicio: string | null;
  horaDesmontaje: string | null;
  indicacionesCliente: string | null;
  descripcionGeneral: string | null;
  // Cliente
  cliente: { nombre: string; empresa: string | null; telefono: string | null };
  encargadoCliente: string | null;
  encargadoClienteContacto: string | null;
  // Interno
  encargadoNombre: string | null;
  encargadoCelular: string | null;
  // Equipos
  equipos: { descripcion: string; marca: string | null; modelo: string | null; cantidad: number; tipo: string }[];
  // Personal
  personal: { nombre: string; rolEnEvento: string | null; rolTecnico: string | null; celular: string | null }[];
  // Proveedores
  proveedores: { nombreProveedor: string; servicioEquipo: string | null; telefonoProveedor: string | null }[];
  logoSrc: string | null;
  generadoEn: string;
}

function fmtFecha(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-MX", {
    timeZone: "UTC", weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

export function FichaCoordinadorPDF({ data }: { data: FichaCoordinadorData }) {
  const equiposPropios = data.equipos.filter(e => e.tipo === "PROPIO");

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {data.logoSrc
              ? <Image src={data.logoSrc} style={styles.logo} />
              : <Text style={styles.logoFallback}>Mainstage Pro</Text>
            }
            <Text style={styles.headerTitle}>{data.nombre}</Text>
            <Text style={styles.headerSub}>Ficha para coordinador</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerBadge}>{data.numeroProyecto}</Text>
            <Text style={styles.headerDate}>Generado: {data.generadoEn}</Text>
          </View>
        </View>

        {/* Datos del cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del cliente</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Cliente</Text>
            <Text style={styles.rowValue}>
              {data.cliente.nombre}{data.cliente.empresa ? ` · ${data.cliente.empresa}` : ""}
            </Text>
          </View>
          {data.cliente.telefono && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Teléfono cliente</Text>
              <Text style={styles.rowValue}>{data.cliente.telefono}</Text>
            </View>
          )}
          {data.encargadoCliente && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Encargado del cliente</Text>
              <Text style={styles.rowValue}>
                {data.encargadoCliente}{data.encargadoClienteContacto ? ` · ${data.encargadoClienteContacto}` : ""}
              </Text>
            </View>
          )}
        </View>

        {/* Datos del evento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del evento</Text>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              {data.tipoEvento && (
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Tipo de evento</Text>
                  <Text style={styles.rowValue}>{data.tipoEvento}</Text>
                </View>
              )}
              {data.tipoServicio && (
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Tipo de servicio</Text>
                  <Text style={styles.rowValue}>{data.tipoServicio}</Text>
                </View>
              )}
              {data.fechaEvento && (
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Fecha</Text>
                  <Text style={styles.rowValue}>{fmtFecha(data.fechaEvento)}</Text>
                </View>
              )}
            </View>
            <View style={styles.col}>
              {data.horaSalidaBodega && (
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Salida desde bodega</Text>
                  <Text style={styles.rowValue}>
                    {data.horaSalidaBodega} hrs{data.puntoSalidaBodega ? ` · ${data.puntoSalidaBodega}` : ""}
                  </Text>
                </View>
              )}
              {data.horaMontaje && (
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Llegada / montaje</Text>
                  <Text style={styles.rowValue}>{data.horaMontaje} hrs</Text>
                </View>
              )}
              {data.horaInicio && (
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Inicio del evento</Text>
                  <Text style={styles.rowValue}>{data.horaInicio} hrs</Text>
                </View>
              )}
              {data.horaDesmontaje && (
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Desmontaje estimado</Text>
                  <Text style={styles.rowValue}>{data.horaDesmontaje} hrs</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Venue */}
        {(data.lugarEvento || data.direccionVenue || data.linkMaps || data.indicacionesAcceso) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Venue</Text>
            {data.lugarEvento && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Nombre</Text>
                <Text style={styles.rowValue}>{data.lugarEvento}</Text>
              </View>
            )}
            {data.direccionVenue && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Dirección</Text>
                <Text style={styles.rowValue}>{data.direccionVenue}</Text>
              </View>
            )}
            {data.linkMaps && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Maps</Text>
                <Text style={[styles.rowValue, { color: "#2563eb" }]}>{data.linkMaps}</Text>
              </View>
            )}
            {data.indicacionesAcceso && (
              <View style={[styles.row, { marginTop: 4 }]}>
                <Text style={styles.rowLabel}>Acceso</Text>
                <Text style={[styles.rowValue, { fontFamily: "Helvetica", lineHeight: 1.5 }]}>{data.indicacionesAcceso}</Text>
              </View>
            )}
          </View>
        )}

        {/* Indicaciones para el cliente */}
        {data.indicacionesCliente && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Indicaciones para el cliente</Text>
            <Text style={styles.noteBox}>{data.indicacionesCliente}</Text>
          </View>
        )}

        {/* Servicio / Notas */}
        {data.descripcionGeneral && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas del proyecto</Text>
            <Text style={styles.noteBox}>{data.descripcionGeneral}</Text>
          </View>
        )}

        {/* Equipos propios */}
        {equiposPropios.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipos propios</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: 30 }]}>Cant.</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Equipo</Text>
              </View>
              {equiposPropios.map((eq, i) => (
                <View key={i} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.tableCell, { width: 30, fontFamily: "Helvetica-Bold" }]}>{eq.cantidad}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tableCell}>{getEquipoDisplayName(eq)}</Text>
                    {(eq.marca || eq.modelo) && (
                      <Text style={styles.tableCellSub}>{eq.descripcion}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Proveedores y subrentas */}
        {data.proveedores.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proveedores y subrentas</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Proveedor</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Equipo / Servicio</Text>
                <Text style={[styles.tableHeaderCell, { width: 80 }]}>Teléfono</Text>
              </View>
              {data.proveedores.map((p, i) => (
                <View key={i} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.tableCell, { flex: 1.2, fontFamily: "Helvetica-Bold" }]}>{p.nombreProveedor}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{p.servicioEquipo ?? "—"}</Text>
                  <Text style={[styles.tableCell, { width: 80 }]}>{p.telefonoProveedor ?? "—"}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Personal técnico */}
        {data.personal.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal técnico</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Nombre</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Rol en el evento</Text>
                <Text style={[styles.tableHeaderCell, { width: 80 }]}>Teléfono</Text>
              </View>
              {data.personal.map((p, i) => (
                <View key={i} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.tableCell, { flex: 1.2, fontFamily: "Helvetica-Bold" }]}>{p.nombre}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{p.rolEnEvento ?? p.rolTecnico ?? "—"}</Text>
                  <Text style={[styles.tableCell, { width: 80 }]}>{p.celular ?? "—"}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Coordinador interno */}
        {data.encargadoNombre && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coordinador interno</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Nombre</Text>
              <Text style={styles.rowValue}>{data.encargadoNombre}</Text>
            </View>
            {data.encargadoCelular && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Teléfono</Text>
                <Text style={styles.rowValue}>{data.encargadoCelular}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerGold}>Mainstage Pro · Ficha de Coordinador</Text>
          <Text style={styles.footerText}>{data.numeroProyecto}</Text>
        </View>

      </Page>
    </Document>
  );
}
