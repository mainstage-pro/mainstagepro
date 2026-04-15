import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const GOLD   = "#B3985B";
const BLACK  = "#0a0a0a";
const WHITE  = "#FFFFFF";
const GRAY   = "#555555";
const LIGHT  = "#888888";
const BG     = "#F7F5F0";
const BORDER = "#CCCCCC";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 0,
    paddingBottom: 28,
    paddingHorizontal: 0,
    fontSize: 8,
    color: BLACK,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 36,
    paddingTop: 22,
    paddingBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 2,
    marginBottom: 2,
  },
  brandSub: {
    fontSize: 6.5,
    color: "#888",
    letterSpacing: 1.5,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    marginBottom: 3,
  },
  docContact: {
    fontSize: 6.5,
    color: "#999",
    marginBottom: 2,
  },
  docFolio: {
    fontSize: 6.5,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
  },
  goldBand: {
    height: 3,
    backgroundColor: GOLD,
  },

  // ── Body ────────────────────────────────────────────────────────────────────
  body: {
    paddingHorizontal: 32,
    paddingTop: 16,
  },

  // ── Info grid ───────────────────────────────────────────────────────────────
  infoGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  infoLeft: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  infoRight: {
    width: 190,
  },
  infoRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 20,
  },
  infoRowLast: {
    flexDirection: "row",
    minHeight: 20,
  },
  infoLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    color: GRAY,
    width: 72,
    paddingVertical: 5,
    paddingHorizontal: 7,
    backgroundColor: BG,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  infoValue: {
    flex: 1,
    fontSize: 7.5,
    paddingVertical: 5,
    paddingHorizontal: 7,
    color: BLACK,
  },
  infoDateLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    color: GRAY,
    width: 96,
    paddingVertical: 5,
    paddingHorizontal: 7,
    backgroundColor: BG,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  infoDateValue: {
    flex: 1,
    fontSize: 7.5,
    paddingVertical: 5,
    paddingHorizontal: 7,
    color: BLACK,
  },
  commentRow: {
    flexDirection: "row",
    minHeight: 28,
  },

  // ── Section header ──────────────────────────────────────────────────────────
  sectionHeader: {
    backgroundColor: BLACK,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 0,
  },
  sectionHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: WHITE,
    textAlign: "center",
    letterSpacing: 1,
  },
  subSectionHeader: {
    backgroundColor: "#E8E5DF",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: BORDER,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subSectionHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: GRAY,
    letterSpacing: 0.5,
  },

  // ── Equipment table ─────────────────────────────────────────────────────────
  tableWrapper: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: BORDER,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    minHeight: 18,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    minHeight: 18,
    backgroundColor: "#FAFAF8",
  },
  colModelo: {
    flex: 4,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  colQty: {
    width: 32,
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    textAlign: "center",
  },
  colSerie: {
    flex: 3,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  colEstado: {
    width: 44,
    paddingVertical: 4,
    paddingHorizontal: 5,
    textAlign: "center",
  },
  colHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    color: GRAY,
    letterSpacing: 0.3,
  },
  cellText: {
    fontSize: 7.5,
    color: BLACK,
  },
  emptyRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    minHeight: 16,
  },

  // ── Checklist interno ───────────────────────────────────────────────────────
  checklistWrapper: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: BORDER,
    marginBottom: 12,
  },
  checklistRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    alignItems: "center",
    minHeight: 18,
  },
  checkBox: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: BORDER,
    height: 18,
  },
  checkBoxInner: {
    width: 11,
    height: 11,
    borderWidth: 1,
    borderColor: GRAY,
    borderRadius: 2,
  },
  checklistText: {
    flex: 1,
    fontSize: 7,
    color: GRAY,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  checkHeaderLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    color: GRAY,
    width: 34,
    textAlign: "center",
    paddingVertical: 4,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },

  // ── Conditions ──────────────────────────────────────────────────────────────
  conditionsWrapper: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: BORDER,
    marginBottom: 12,
    padding: 9,
  },
  conditionItem: {
    flexDirection: "row",
    marginBottom: 4,
    gap: 6,
  },
  conditionBullet: {
    fontSize: 7,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    marginTop: 0.5,
  },
  conditionText: {
    flex: 1,
    fontSize: 6.5,
    color: GRAY,
    lineHeight: 1.5,
  },

  // ── Signature sections ───────────────────────────────────────────────────────
  signatureSection: {
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 8,
  },
  signatureSectionHeader: {
    backgroundColor: GOLD,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  signatureSectionHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: BLACK,
    textAlign: "center",
    letterSpacing: 0.8,
  },
  signatureBody: {
    padding: 12,
  },
  signatureRow: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 20,
  },
  signatureField: {
    flex: 1,
  },
  signatureFieldNarrow: {
    width: 130,
  },
  signatureLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: GRAY,
    marginBottom: 12,
  },
  signatureLabelSm: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: GRAY,
    marginBottom: 4,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 2,
  },
  signatureNote: {
    fontSize: 6,
    color: LIGHT,
  },
  observacionesBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    minHeight: 32,
    padding: 5,
    marginTop: 2,
    backgroundColor: "#FAFAF8",
  },
  observacionesPlaceholder: {
    fontSize: 6.5,
    color: "#CCCCCC",
    fontStyle: "italic",
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  footerText: {
    fontSize: 6,
    color: LIGHT,
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface EquipoItem {
  descripcion: string;
  marca: string | null;
  categoria: { nombre: string } | null;
}
interface ProyectoEquipo {
  cantidad: number;
  equipo: EquipoItem | null;
  descripcionManual?: string | null;
}
interface ProyectoData {
  numeroProyecto: string;
  nombre: string;
  fechaEvento: string | null;
  lugarEvento: string | null;
  encargadoCliente: string | null;
  logisticaRenta: string | null;
  cliente: { nombre: string; empresa: string | null; telefono?: string | null } | null;
  equipos: ProyectoEquipo[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(s?: string | null) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return s; }
}

function EmptyRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={s.emptyRow}>
          <View style={[s.colModelo, { borderRightWidth: 1, borderRightColor: BORDER }]}><Text> </Text></View>
          <View style={[s.colQty, { borderRightWidth: 1, borderRightColor: BORDER }]}><Text> </Text></View>
          <View style={[s.colSerie, { borderRightWidth: 1, borderRightColor: BORDER }]}><Text> </Text></View>
          <View style={s.colEstado}><Text> </Text></View>
        </View>
      ))}
    </>
  );
}

const NIVEL_LABELS: Record<string, string> = {
  SOLO_RENTA:    "Solo renta (cliente recoge)",
  RENTA_ENTREGA: "Renta + entrega",
  RENTA_MONTAJE: "Renta + montaje",
  RENTA_FULL:    "Renta + operación",
};

// ─── Component ────────────────────────────────────────────────────────────────
export function HojaEntregaRentaPDF({ proyecto }: { proyecto: ProyectoData }) {
  let rentaData: Record<string, string> = {};
  try { if (proyecto.logisticaRenta) rentaData = JSON.parse(proyecto.logisticaRenta); } catch { /* noop */ }

  const fechaEntrega    = rentaData.fechaEntrega    ? `${fmtDate(rentaData.fechaEntrega)}${rentaData.horaEntrega    ? "  " + rentaData.horaEntrega    : ""}` : "";
  const fechaDevolucion = rentaData.fechaDevolucion ? `${fmtDate(rentaData.fechaDevolucion)}${rentaData.horaDevolucion ? "  " + rentaData.horaDevolucion : ""}` : "";
  const modalidad       = rentaData.nivelServicio   ? (NIVEL_LABELS[rentaData.nivelServicio] ?? rentaData.nivelServicio) : "";
  const direccion       = rentaData.direccionEntrega ?? "";

  // Folio: PRY-XXX-YYYYMMDD
  const hoy = new Date();
  const folioDate = `${hoy.getFullYear()}${String(hoy.getMonth()+1).padStart(2,"0")}${String(hoy.getDate()).padStart(2,"0")}`;
  const folio = `FOLIO: ${proyecto.numeroProyecto}-${folioDate}`;

  // Group equipos by category
  const grouped: Record<string, ProyectoEquipo[]> = {};
  for (const eq of proyecto.equipos) {
    const cat = eq.equipo?.categoria?.nombre ?? "Otros";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(eq);
  }
  const categories = Object.keys(grouped);

  const clienteNombre = proyecto.cliente?.empresa
    ? `${proyecto.cliente.nombre} · ${proyecto.cliente.empresa}`
    : proyecto.cliente?.nombre ?? "";

  return (
    <Document>
      <Page size="LETTER" style={s.page} wrap>

        {/* ── Header ── */}
        <View style={s.header} fixed>
          <View>
            <Text style={s.brand}>MAINSTAGE</Text>
            <Text style={s.brandSub}>PRO · SOLUCIONES AUDIOVISUALES</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>HOJA DE ENTREGA DE EQUIPOS (RENTA)</Text>
            <Text style={s.docContact}>TEL/WHATSAPP (446) 143 2565  ·  MAINSTAGEQRO@GMAIL.COM</Text>
            <Text style={s.docFolio}>{folio}</Text>
          </View>
        </View>
        <View style={s.goldBand} fixed />

        <View style={s.body}>

          {/* ── Info grid ── */}
          <View style={s.infoGrid}>
            {/* Left column */}
            <View style={s.infoLeft}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>CLIENTE</Text>
                <Text style={s.infoValue}>{clienteNombre}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>CONTACTO</Text>
                <Text style={s.infoValue}>{proyecto.encargadoCliente ?? ""}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>EVENTO</Text>
                <Text style={s.infoValue}>{proyecto.nombre}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>MODALIDAD</Text>
                <Text style={s.infoValue}>{modalidad}</Text>
              </View>
              <View style={[s.commentRow, { borderTopWidth: 0 }]}>
                <Text style={[s.infoLabel, { height: "100%" }]}>DIRECCIÓN</Text>
                <Text style={s.infoValue}>{direccion}</Text>
              </View>
            </View>
            {/* Right column */}
            <View style={s.infoRight}>
              <View style={s.infoRow}>
                <Text style={s.infoDateLabel}>FECHA DE ENTREGA</Text>
                <Text style={s.infoDateValue}>{fechaEntrega}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoDateLabel}>FECHA DE EVENTO</Text>
                <Text style={s.infoDateValue}>{fmtDate(proyecto.fechaEvento)}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoDateLabel}>FECHA DE DEVOLUCIÓN</Text>
                <Text style={s.infoDateValue}>{fechaDevolucion}</Text>
              </View>
              <View style={[s.infoRow, { minHeight: 26 }]}>
                <Text style={s.infoDateLabel}>LUGAR DEL EVENTO</Text>
                <Text style={s.infoDateValue}>{proyecto.lugarEvento ?? ""}</Text>
              </View>
              <View style={[s.infoRowLast, { minHeight: 20 }]}>
                <Text style={s.infoDateLabel}>PROYECTO</Text>
                <Text style={s.infoDateValue}>{proyecto.numeroProyecto}</Text>
              </View>
            </View>
          </View>

          {/* ── Equipment section ── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionHeaderText}>RELACIÓN DE EQUIPOS ENTREGADOS</Text>
          </View>

          {categories.length > 0 ? (
            categories.map((cat) => (
              <View key={cat}>
                <View style={s.subSectionHeader}>
                  <Text style={s.subSectionHeaderText}>{cat.toUpperCase()}</Text>
                </View>
                <View style={s.tableWrapper}>
                  {/* Table header */}
                  <View style={s.tableHeader}>
                    <View style={s.colModelo}><Text style={s.colHeaderText}>MARCA / MODELO / DESCRIPCIÓN</Text></View>
                    <View style={s.colQty}><Text style={[s.colHeaderText, { textAlign: "center" }]}>QTY</Text></View>
                    <View style={s.colSerie}><Text style={s.colHeaderText}>NÚMERO DE SERIE / ID INVENTARIO</Text></View>
                    <View style={s.colEstado}><Text style={[s.colHeaderText, { textAlign: "center" }]}>ESTADO ✓</Text></View>
                  </View>
                  {/* Equipment rows */}
                  {grouped[cat].map((eq, i) => {
                    const nombre = eq.equipo
                      ? `${eq.equipo.marca ? eq.equipo.marca + " " : ""}${eq.equipo.descripcion}`
                      : (eq.descripcionManual ?? "");
                    return (
                      <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                        <View style={s.colModelo}><Text style={s.cellText}>{nombre}</Text></View>
                        <View style={s.colQty}><Text style={[s.cellText, { textAlign: "center" }]}>{eq.cantidad}</Text></View>
                        <View style={s.colSerie}><Text style={s.cellText}> </Text></View>
                        <View style={s.colEstado}><Text style={[s.cellText, { textAlign: "center" }]}> </Text></View>
                      </View>
                    );
                  })}
                  {/* Extra blank rows */}
                  <EmptyRows count={Math.max(1, 4 - grouped[cat].length)} />
                </View>
              </View>
            ))
          ) : (
            <View>
              <View style={s.subSectionHeader}>
                <Text style={s.subSectionHeaderText}>EQUIPO</Text>
              </View>
              <View style={s.tableWrapper}>
                <View style={s.tableHeader}>
                  <View style={s.colModelo}><Text style={s.colHeaderText}>MARCA / MODELO / DESCRIPCIÓN</Text></View>
                  <View style={s.colQty}><Text style={[s.colHeaderText, { textAlign: "center" }]}>QTY</Text></View>
                  <View style={s.colSerie}><Text style={s.colHeaderText}>NÚMERO DE SERIE / ID INVENTARIO</Text></View>
                  <View style={s.colEstado}><Text style={[s.colHeaderText, { textAlign: "center" }]}>ESTADO ✓</Text></View>
                </View>
                <EmptyRows count={12} />
              </View>
            </View>
          )}

          {/* ── Checklist interno ── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionHeaderText}>CHECKLIST DE ENTREGA</Text>
          </View>
          <View style={s.checklistWrapper}>
            <View style={[s.tableHeader, { borderBottomWidth: 1, borderBottomColor: BORDER }]}>
              <Text style={[s.checklistText, { fontFamily: "Helvetica-Bold", fontSize: 6.5, color: GRAY }]}>ÍTEM A VERIFICAR ANTES DE ENTREGAR</Text>
              <Text style={s.checkHeaderLabel}>✓</Text>
            </View>
            {[
              "Equipo completo según la lista — ningún ítem faltante",
              "Todo el equipo probado y en buen funcionamiento antes de salir de bodega",
              "Accesorios incluidos: cables, soportes, clamps, fundas, adaptadores (según corresponda)",
              "Número de serie / ID de inventario registrado en esta hoja para cada equipo",
              "Número de bultos contabilizado y anotado en la sección de firma",
              "Fotografías del equipo tomadas antes de la entrega (para respaldo en caso de daños)",
              "Firma y nombre completo del cliente obtenidos al momento de entregar",
            ].map((item, i) => (
              <View key={i} style={s.checklistRow}>
                <Text style={s.checklistText}>{item}</Text>
                <View style={s.checkBox}><View style={s.checkBoxInner} /></View>
              </View>
            ))}
          </View>

          {/* ── Conditions ── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionHeaderText}>CONDICIONES PARA LA RENTA DEL EQUIPO</Text>
          </View>
          <View style={s.conditionsWrapper}>
            {[
              "El contratante se responsabiliza de los daños que puedan ocasionarse por un uso inadecuado de los equipos.",
              "El equipo entregado debe ser devuelto en las mismas condiciones estéticas y de funcionamiento en las que fue recibido.",
              "Todo daño, pérdida o falta de equipo listado en el presente documento será repuesto o cubierto económicamente por el cliente.",
              "Al firmar la presente hoja, el cliente acepta haber recibido el equipo conforme y se hace responsable de su cuidado y devolución.",
              "Mainstage Pro se reserva el derecho de documentar el estado del equipo con fotografías al momento de entrega y devolución.",
            ].map((cond, i) => (
              <View key={i} style={s.conditionItem}>
                <Text style={s.conditionBullet}>▸</Text>
                <Text style={s.conditionText}><Text style={{ fontFamily: "Helvetica-Bold" }}>{i + 1}. </Text>{cond}</Text>
              </View>
            ))}
          </View>

          {/* ── Firma: RECIBO ── */}
          <View style={s.signatureSection}>
            <View style={s.signatureSectionHeader}>
              <Text style={s.signatureSectionHeaderText}>RECIBO LOS EQUIPOS MENCIONADOS EN EL PRESENTE DOCUMENTO — ENTREGA AL CLIENTE</Text>
            </View>
            <View style={s.signatureBody}>
              <View style={s.signatureRow}>
                <View style={s.signatureField}>
                  <Text style={s.signatureLabel}>NOMBRE COMPLETO DEL CLIENTE / REPRESENTANTE:</Text>
                  <View style={s.signatureLine} />
                </View>
                <View style={s.signatureFieldNarrow}>
                  <Text style={s.signatureLabel}>FECHA Y HORA DE ENTREGA:</Text>
                  <View style={s.signatureLine} />
                </View>
                <View style={{ width: 70 }}>
                  <Text style={s.signatureLabel}>NÚMERO DE BULTOS:</Text>
                  <View style={s.signatureLine} />
                </View>
              </View>
              <View style={[s.signatureRow, { marginBottom: 0 }]}>
                <View style={s.signatureField}>
                  <Text style={s.signatureLabelSm}>FIRMA DE PERSONAL MAINSTAGE QUE ENTREGA:</Text>
                  <View style={[s.signatureLine, { marginTop: 26 }]} />
                  <Text style={s.signatureNote}>Nombre legible abajo</Text>
                </View>
                <View style={s.signatureField}>
                  <Text style={s.signatureLabelSm}>FIRMA DEL CLIENTE QUE RECIBE:</Text>
                  <View style={[s.signatureLine, { marginTop: 26 }]} />
                  <Text style={s.signatureNote}>Nombre legible abajo</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Firma: DEVOLUCIÓN ── */}
          <View style={s.signatureSection}>
            <View style={[s.signatureSectionHeader, { backgroundColor: "#2a2a2a" }]}>
              <Text style={[s.signatureSectionHeaderText, { color: WHITE }]}>REGRESO / DEVOLUCIÓN DE EQUIPOS</Text>
            </View>
            <View style={s.signatureBody}>
              <View style={s.signatureRow}>
                <View style={s.signatureField}>
                  <Text style={s.signatureLabel}>NOMBRE COMPLETO DEL CLIENTE / REPRESENTANTE:</Text>
                  <View style={s.signatureLine} />
                </View>
                <View style={s.signatureFieldNarrow}>
                  <Text style={s.signatureLabel}>FECHA Y HORA DE DEVOLUCIÓN:</Text>
                  <View style={s.signatureLine} />
                </View>
                <View style={{ width: 70 }}>
                  <Text style={s.signatureLabel}>BULTOS RECIBIDOS:</Text>
                  <View style={s.signatureLine} />
                </View>
              </View>
              {/* Observaciones de devolución */}
              <View style={{ marginBottom: 14 }}>
                <Text style={s.signatureLabelSm}>OBSERVACIONES AL REGRESAR EL EQUIPO (daños, faltantes, comentarios):</Text>
                <View style={s.observacionesBox}>
                  <Text style={s.observacionesPlaceholder}> </Text>
                </View>
              </View>
              <View style={[s.signatureRow, { marginBottom: 0 }]}>
                <View style={s.signatureField}>
                  <Text style={s.signatureLabelSm}>FIRMA DE PERSONAL MAINSTAGE QUE RECIBE:</Text>
                  <View style={[s.signatureLine, { marginTop: 26 }]} />
                  <Text style={s.signatureNote}>Nombre legible abajo</Text>
                </View>
                <View style={s.signatureField}>
                  <Text style={s.signatureLabelSm}>FIRMA DEL CLIENTE QUE DEVUELVE:</Text>
                  <View style={[s.signatureLine, { marginTop: 26 }]} />
                  <Text style={s.signatureNote}>Nombre legible abajo</Text>
                </View>
              </View>
            </View>
          </View>

        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>MAINSTAGE PRO · mainstagepro.mx</Text>
          <Text style={s.footerText}>Proyecto {proyecto.numeroProyecto}  ·  {proyecto.lugarEvento ?? ""}  ·  {fmtDate(proyecto.fechaEvento)}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}  ·  ${folio}`} />
        </View>

      </Page>
    </Document>
  );
}
