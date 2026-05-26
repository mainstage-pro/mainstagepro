import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const GOLD  = "#B3985B";
const BLACK = "#0a0a0a";
const DARK  = "#111111";
const WHITE = "#FFFFFF";
const GRAY  = "#888888";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: BLACK,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    fontSize: 10,
    color: WHITE,
  },
  // Header brand
  header: {
    backgroundColor: DARK,
    paddingHorizontal: 36,
    paddingVertical: 28,
    borderBottomWidth: 3,
    borderBottomColor: GOLD,
    alignItems: "center",
  },
  brand: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 4,
  },
  brandSub: {
    fontSize: 7.5,
    color: GRAY,
    letterSpacing: 2,
    marginTop: 3,
  },
  // Confirmed badge
  badge: {
    marginTop: 20,
    marginBottom: 20,
    alignSelf: "center",
    backgroundColor: GOLD,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    letterSpacing: 1,
  },
  // Body
  body: {
    paddingHorizontal: 40,
    paddingTop: 10,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#2a2a2a",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 7,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  // Info row
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
  },
  infoLabel: {
    width: 90,
    fontSize: 8,
    color: GRAY,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingTop: 1,
  },
  infoValue: {
    flex: 1,
    fontSize: 11,
    color: WHITE,
    fontFamily: "Helvetica-Bold",
  },
  // Equipos
  equipoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    paddingLeft: 0,
  },
  bullet: {
    width: 16,
    fontSize: 10,
    color: GOLD,
  },
  equipoText: {
    flex: 1,
    fontSize: 10,
    color: WHITE,
  },
  equipoCant: {
    fontSize: 10,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    width: 30,
    textAlign: "right",
  },
  // Link
  linkBox: {
    backgroundColor: DARK,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  linkLabel: {
    fontSize: 7,
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  linkText: {
    fontSize: 9,
    color: GOLD,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 16,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },
  footerText: {
    fontSize: 7,
    color: "#555555",
  },
  footerGold: {
    fontSize: 7,
    color: GOLD,
  },
});

export interface BriefData {
  id: string;
  numeroProyecto: string;
  nombre: string;
  tipoEvento: string;
  tipoServicio: string | null;
  fechaEvento: string | null;
  lugarEvento: string | null;
  cliente: {
    nombre: string;
    empresa: string | null;
  };
  equipos: {
    cantidad: number;
    equipo: {
      descripcion: string;
      marca: string | null;
      modelo: string | null;
    };
  }[];
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "Por confirmar";
  return new Date(s).toLocaleDateString("es-MX", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

const TIPO_SERVICIO_LABEL: Record<string, string> = {
  PRODUCCION_TECNICA: "Producción técnica",
  RENTA: "Renta de equipo",
  DIRECCION_TECNICA: "Dirección técnica",
};

export function BriefPDF({ proyecto }: { proyecto: BriefData }) {
  const tipoLabel = proyecto.tipoServicio
    ? (TIPO_SERVICIO_LABEL[proyecto.tipoServicio] ?? proyecto.tipoServicio)
    : proyecto.tipoEvento ?? "—";

  const accesoLink = `https://mainstagepro.vercel.app/proyectos/${proyecto.id}`;
  const generado = new Date().toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.brand}>MAINSTAGE PRO</Text>
          <Text style={s.brandSub}>PRODUCCIONES · SERVICIOS AV</Text>
        </View>

        {/* Badge */}
        <View style={s.badge}>
          <Text style={s.badgeText}>🎉  ¡Servicio confirmado!</Text>
        </View>

        {/* Body */}
        <View style={s.body}>

          {/* Cliente y proyecto */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Información del servicio</Text>
            <View style={s.divider} />

            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Cliente</Text>
              <Text style={s.infoValue}>
                {proyecto.cliente.nombre}
                {proyecto.cliente.empresa ? `  /  ${proyecto.cliente.empresa}` : ""}
              </Text>
            </View>

            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Proyecto</Text>
              <Text style={s.infoValue}>
                {proyecto.nombre}{"  "}
                <Text style={{ color: GOLD, fontSize: 9 }}>({proyecto.numeroProyecto})</Text>
              </Text>
            </View>

            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Servicio</Text>
              <Text style={s.infoValue}>{tipoLabel}</Text>
            </View>

            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Fecha</Text>
              <Text style={s.infoValue}>{fmtDate(proyecto.fechaEvento)}</Text>
            </View>

            {proyecto.lugarEvento && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Lugar</Text>
                <Text style={s.infoValue}>{proyecto.lugarEvento}</Text>
              </View>
            )}
          </View>

          {/* Equipos */}
          {proyecto.equipos.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Equipos incluidos</Text>
              <View style={s.divider} />
              {proyecto.equipos.map((e, i) => (
                <View key={i} style={s.equipoItem}>
                  <Text style={s.bullet}>•</Text>
                  <Text style={s.equipoText}>
                    {e.equipo.descripcion}
                    {e.equipo.marca ? `  ${e.equipo.marca}` : ""}
                    {e.equipo.modelo ? ` ${e.equipo.modelo}` : ""}
                  </Text>
                  <Text style={s.equipoCant}>×{e.cantidad}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Link de acceso */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Acceso al proyecto</Text>
            <View style={s.divider} />
            <View style={s.linkBox}>
              <Text style={s.linkLabel}>Consulta los detalles en:</Text>
              <Text style={s.linkText}>{accesoLink}</Text>
            </View>
          </View>

        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerGold}>MAINSTAGE PRO</Text>
          <Text style={s.footerText}>Brief generado el {generado}</Text>
          <Text style={s.footerText}>{proyecto.numeroProyecto}</Text>
        </View>

      </Page>
    </Document>
  );
}
