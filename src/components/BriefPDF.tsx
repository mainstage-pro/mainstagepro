import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const GOLD  = "#B3985B";
const BLACK = "#0a0a0a";
const DARK  = "#111111";
const DARK2 = "#1a1a1a";
const WHITE = "#FFFFFF";
const GRAY  = "#888888";
const GRAY2 = "#555555";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: BLACK,
    fontSize: 10,
    color: WHITE,
  },
  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: DARK,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 24,
    borderBottomWidth: 3,
    borderBottomColor: GOLD,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoImg: {
    height: 28,
    objectFit: "contain",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerLabel: {
    fontSize: 7,
    color: GRAY,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  headerNum: {
    fontSize: 11,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    marginTop: 3,
  },
  // ── Badge ─────────────────────────────────────────────────────────────────────
  badgeWrap: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 20,
  },
  badgeLine: {
    width: 36,
    height: 2,
    backgroundColor: GOLD,
    marginBottom: 14,
  },
  badgeTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    letterSpacing: 1,
  },
  badgeSub: {
    fontSize: 8.5,
    color: GRAY,
    marginTop: 5,
    letterSpacing: 1,
  },
  // ── Body ─────────────────────────────────────────────────────────────────────
  body: {
    paddingHorizontal: 40,
    paddingTop: 4,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: DARK,
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 4,
    marginBottom: 14,
    overflow: "hidden",
  },
  cardHeader: {
    backgroundColor: DARK2,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  cardTitle: {
    fontSize: 7,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  // ── Info row ─────────────────────────────────────────────────────────────────
  infoRow: {
    flexDirection: "row",
    marginBottom: 9,
    alignItems: "flex-start",
  },
  infoLabel: {
    width: 88,
    fontSize: 7.5,
    color: GRAY,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingTop: 1.5,
  },
  infoValue: {
    flex: 1,
    fontSize: 11,
    color: WHITE,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.3,
  },
  infoValueSub: {
    flex: 1,
    fontSize: 10,
    color: WHITE,
    lineHeight: 1.3,
  },
  // ── Equipos ──────────────────────────────────────────────────────────────────
  equipoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e1e",
  },
  equipoCant: {
    width: 32,
    fontSize: 11,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
  },
  equipoName: {
    flex: 1,
    fontSize: 10,
    color: WHITE,
  },
  // ── Link ─────────────────────────────────────────────────────────────────────
  linkBox: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  linkLabel: {
    fontSize: 7,
    color: GRAY2,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
  },
  linkText: {
    fontSize: 9,
    color: GOLD,
  },
  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#222222",
  },
  footerText: {
    fontSize: 7,
    color: GRAY2,
  },
  footerGold: {
    fontSize: 7,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BriefData {
  id: string;
  numeroProyecto: string;
  nombre: string;
  tipoEvento: string;
  tipoServicio: string | null;
  fechaEvento: string | null;
  lugarEvento: string | null;
  cliente: { nombre: string; empresa: string | null };
  equipos: {
    cantidad: number;
    equipo: { descripcion: string; marca: string | null; modelo: string | null };
  }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined): string {
  if (!s) return "Por confirmar";
  return new Date(s).toLocaleDateString("es-MX", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

const TIPO_SERVICIO_LABEL: Record<string, string> = {
  PRODUCCION_TECNICA: "Produccion tecnica",
  RENTA: "Renta de equipo",
  DIRECCION_TECNICA: "Direccion tecnica",
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function BriefPDF({
  proyecto,
  logoSrc,
}: {
  proyecto: BriefData;
  logoSrc: string | null;
}) {
  const tipoLabel = proyecto.tipoServicio
    ? (TIPO_SERVICIO_LABEL[proyecto.tipoServicio] ?? proyecto.tipoServicio)
    : (proyecto.tipoEvento ?? "Servicio");

  const accesoLink = `https://mainstagepro.vercel.app/proyectos/${proyecto.id}`;

  const generado = new Date().toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header con logo ── */}
        <View style={s.header} fixed>
          {logoSrc ? (
            <Image src={logoSrc} style={s.logoImg} />
          ) : (
            <View>
              <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 3 }}>
                MAINSTAGE PRO
              </Text>
            </View>
          )}
          <View style={s.headerRight}>
            <Text style={s.headerLabel}>Brief del servicio</Text>
            <Text style={s.headerNum}>{proyecto.numeroProyecto}</Text>
          </View>
        </View>

        {/* ── Badge servicio confirmado ── */}
        <View style={s.badgeWrap}>
          <View style={s.badgeLine} />
          <Text style={s.badgeTitle}>SERVICIO CONFIRMADO</Text>
          <Text style={s.badgeSub}>MAINSTAGE PRO · {tipoLabel.toUpperCase()}</Text>
        </View>

        {/* ── Body ── */}
        <View style={s.body}>

          {/* Card: Datos del servicio */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Datos del servicio</Text>
            </View>
            <View style={s.cardBody}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Cliente</Text>
                <Text style={s.infoValue}>
                  {proyecto.cliente.nombre}
                  {proyecto.cliente.empresa ? `  /  ${proyecto.cliente.empresa}` : ""}
                </Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Proyecto</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.infoValue}>{proyecto.nombre}</Text>
                </View>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Servicio</Text>
                <Text style={s.infoValue}>{tipoLabel}</Text>
              </View>
              <View style={[s.infoRow, { marginBottom: 0 }]}>
                <Text style={s.infoLabel}>Fecha</Text>
                <Text style={s.infoValue}>{fmtDate(proyecto.fechaEvento)}</Text>
              </View>
              {proyecto.lugarEvento && (
                <View style={[s.infoRow, { marginTop: 9, marginBottom: 0 }]}>
                  <Text style={s.infoLabel}>Lugar</Text>
                  <Text style={s.infoValue}>{proyecto.lugarEvento}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Card: Equipos */}
          {proyecto.equipos.length > 0 && (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>Equipos incluidos</Text>
              </View>
              <View style={s.cardBody}>
                {proyecto.equipos.map((e, i) => (
                  <View
                    key={i}
                    style={[
                      s.equipoRow,
                      i === proyecto.equipos.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <Text style={s.equipoCant}>x{e.cantidad}</Text>
                    <Text style={s.equipoName}>
                      {e.equipo.descripcion}
                      {e.equipo.marca ? `  ${e.equipo.marca}` : ""}
                      {e.equipo.modelo ? ` ${e.equipo.modelo}` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Card: Acceso */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Acceso al proyecto</Text>
            </View>
            <View style={s.cardBody}>
              <View style={s.linkBox}>
                <Text style={s.linkLabel}>Consulta los detalles completos en:</Text>
                <Text style={s.linkText}>{accesoLink}</Text>
              </View>
            </View>
          </View>

        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerGold}>MAINSTAGE PRO</Text>
          <Text style={s.footerText}>Brief generado el {generado}</Text>
          <Text style={s.footerText}>{proyecto.numeroProyecto}</Text>
        </View>

      </Page>
    </Document>
  );
}
