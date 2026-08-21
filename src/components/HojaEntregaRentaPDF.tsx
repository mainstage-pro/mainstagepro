import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { getEquipoDisplayName } from "@/lib/equipoNombre";

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
  modelo: string | null;
  imagenUrl?: string | null;
  categoria: { nombre: string } | null;
}
interface RiderAccesorioItem {
  nombre: string;
  cantidad: number;
  categoria: string | null;
}
interface ProyectoEquipo {
  cantidad: number;
  equipo: EquipoItem | null;
  descripcionManual?: string | null;
  riderAccesorios?: RiderAccesorioItem[];
}
interface CotizacionLinea {
  id: string;
  tipo: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  cantidad: number;
  notas: string | null;
}
interface CotizacionData {
  numeroCotizacion: string;
  observaciones: string | null;
  notasSecciones: string | null;
  lineas: CotizacionLinea[];
}
interface ProyectoData {
  numeroProyecto: string;
  nombre: string;
  fechaEvento: string | null;
  lugarEvento: string | null;
  tipoServicio?: string | null;
  encargadoCliente: string | null;
  logisticaRenta: string | null;
  tratoIdeasReferencias?: string | null;
  cliente: { nombre: string; empresa: string | null; telefono?: string | null } | null;
  equipos: ProyectoEquipo[];
  cotizacion?: CotizacionData | null;
  equiposRiderExtra?: string | null;
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
          <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text> </Text></View>
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
export function HojaEntregaRentaPDF({ proyecto, logoSrc }: { proyecto: ProyectoData; logoSrc?: string | null }) {
  let rentaData: Record<string, string> = {};
  try {
    const src = proyecto.logisticaRenta || proyecto.tratoIdeasReferencias;
    if (src) {
      const parsed = JSON.parse(src);
      if (parsed && typeof parsed === "object" && (parsed.nivelServicio || parsed.modalidadServicio || parsed.fechaEntrega)) {
        rentaData = parsed;
      }
    }
  } catch { /* noop */ }

  const fechaEntrega    = rentaData.fechaEntrega    ? `${fmtDate(rentaData.fechaEntrega)}${rentaData.horaEntrega    ? "  " + rentaData.horaEntrega    : ""}` : "";
  const fechaDevolucion = rentaData.fechaDevolucion ? `${fmtDate(rentaData.fechaDevolucion)}${rentaData.horaDevolucion ? "  " + rentaData.horaDevolucion : ""}` : "";
  const nivelKey        = rentaData.nivelServicio ?? rentaData.modalidadServicio ?? "";
  const modalidad       = nivelKey ? (NIVEL_LABELS[nivelKey] ?? nivelKey) : "";
  const direccion       = rentaData.direccionEntrega ?? "";

  // Folio: PRY-XXX-YYYYMMDD
  const hoy = new Date();
  const folioDate = `${hoy.getFullYear()}${String(hoy.getMonth()+1).padStart(2,"0")}${String(hoy.getDate()).padStart(2,"0")}`;
  const folio = `FOLIO: ${proyecto.numeroProyecto}-${folioDate}`;

  // ─── Build equipment list ─────────────────────────────────────────────────
  // Primary: proyecto.equipos grouped by category (with inline accessories).
  // Supplement: cotización OTRO/EXTERNO lines not covered by inventory.
  const groupedInv: Record<string, ProyectoEquipo[]> = {};
  for (const eq of proyecto.equipos) {
    const cat = eq.equipo?.categoria?.nombre ?? "Otros";
    if (!groupedInv[cat]) groupedInv[cat] = [];
    groupedInv[cat].push(eq);
  }

  // Cotización lines shown as supplementary items (OTRO, EXTERNO, and PROPIO when no inventory)
  const tiposExtra = proyecto.equipos.length === 0
    ? ["EQUIPO_PROPIO", "EQUIPO_EXTERNO", "OTRO"]
    : ["EQUIPO_EXTERNO", "OTRO"];
  const cotExtras = (proyecto.cotizacion?.lineas ?? []).filter(
    l => tiposExtra.includes(l.tipo) && !!l.descripcion
  );

  const hasInventory = proyecto.equipos.length > 0;
  const hasCotExtras = cotExtras.length > 0;

  // ─── Equipos adicionales al rider (fuera de cotización) ───────────────────────
  // Se muestran igual que en el Rider de Carga para mantener uniformidad.
  type RiderExtra = { id: string; descripcion: string; cantidad: number; notas?: string };
  const equiposRiderExtra: RiderExtra[] = (() => {
    let parsed: RiderExtra[] = [];
    try {
      const raw = proyecto.equiposRiderExtra;
      if (typeof raw === "string" && raw) parsed = JSON.parse(raw);
      else if (Array.isArray(raw)) parsed = raw as RiderExtra[];
    } catch { /* noop */ }
    const norm = (v: string) => v.toLowerCase().replace(/\s+/g, " ").trim();
    const equiposKeys = new Set(
      proyecto.equipos.map(eq => norm(eq.equipo?.descripcion ?? eq.descripcionManual ?? ""))
    );
    const cotKeys = new Set(cotExtras.map(l => norm(l.descripcion)));
    const seen = new Set<string>();
    return parsed.filter(ex => {
      const key = norm(ex.descripcion);
      if (!key) return false;
      if ([...equiposKeys].some(k => k && (k === key || k.includes(key) || key.includes(k)))) return false;
      if (cotKeys.has(key)) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();
  const hasRiderExtras = equiposRiderExtra.length > 0;

  const clienteNombre = proyecto.cliente?.empresa
    ? `${proyecto.cliente.nombre} · ${proyecto.cliente.empresa}`
    : proyecto.cliente?.nombre ?? "";

  return (
    <Document>
      <Page size="LETTER" style={s.page} wrap>

        {/* ── Header ── */}
        <View style={s.header} fixed>
          <View style={{ justifyContent: "center" }}>
            {logoSrc
              ? <Image src={logoSrc} style={{ width: 110, height: 38, objectFit: "contain" }} />
              : <><Text style={s.brand}>MAINSTAGE</Text><Text style={s.brandSub}>PRO · SOLUCIONES AUDIOVISUALES</Text></>
            }
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
                <Text style={s.infoLabel}>NOMBRE</Text>
                <Text style={s.infoValue}>{proyecto.cliente?.nombre ?? ""}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>EMPRESA</Text>
                <Text style={s.infoValue}>{proyecto.cliente?.empresa ?? ""}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>CONTACTO</Text>
                <Text style={s.infoValue}>{proyecto.cliente?.telefono ?? ""}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>EVENTO</Text>
                <Text style={s.infoValue}>{proyecto.nombre}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>TIPO DE SERVICIO</Text>
                <Text style={s.infoValue}>{proyecto.tipoServicio === "RENTA" ? "Renta de Equipo" : proyecto.tipoServicio === "PRODUCCION_TECNICA" ? "Producción Técnica" : proyecto.tipoServicio === "DIRECCION_TECNICA" ? "Dirección Técnica" : proyecto.tipoServicio ?? "Renta de Equipo"}</Text>
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

          {/* ── Equipment section with inline accessories ── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionHeaderText}>RELACIÓN DE EQUIPOS ENTREGADOS</Text>
          </View>

          {hasInventory ? (
            /* ── Inventory equipos grouped by category, accessories as sub-rows ── */
            Object.entries(groupedInv).map(([cat, items]) => (
              <View key={cat}>
                <View style={s.subSectionHeader}>
                  <Text style={s.subSectionHeaderText}>{cat.toUpperCase()}</Text>
                </View>
                <View style={s.tableWrapper}>
                  {/* Table header */}
                  <View style={s.tableHeader}>
                    <View style={s.colModelo}><Text style={s.colHeaderText}>MARCA / MODELO / DESCRIPCIÓN</Text></View>
                    <View style={s.colQty}><Text style={[s.colHeaderText, { textAlign: "center" }]}>QTY</Text></View>
                    <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text style={s.colHeaderText}>NÚMERO DE SERIE / ID  ·  ✓</Text></View>
                  </View>
                  {items.map((eq, i) => {
                    const nombre = eq.equipo
                      ? getEquipoDisplayName(eq.equipo)
                      : (eq.descripcionManual ?? "");
                    const hasAcc = (eq.riderAccesorios?.length ?? 0) > 0;
                    return (
                      <View key={i}>
                        {/* Main equipment row */}
                        <View style={[
                          i % 2 === 0 ? s.tableRow : s.tableRowAlt,
                          hasAcc ? { borderBottomWidth: 0 } : {}
                        ]}>
                          <View style={[s.colModelo, { flexDirection: "row", alignItems: "center", gap: 4 }]}>
                            {eq.equipo?.imagenUrl ? (
                              <Image src={eq.equipo.imagenUrl} style={{ width: 28, height: 28, marginRight: 4, objectFit: "contain" }} />
                            ) : null}
                            <Text style={[s.cellText, { fontFamily: "Helvetica-Bold", flex: 1 }]}>{nombre}</Text>
                          </View>
                          <View style={s.colQty}>
                            <Text style={[s.cellText, { textAlign: "center", fontFamily: "Helvetica-Bold" }]}>{eq.cantidad}</Text>
                          </View>
                          <View style={[s.colSerie, { borderRightWidth: 0 }]}>
                            <Text style={s.cellText}> </Text>
                          </View>
                        </View>
                        {/* Accessory sub-rows inline */}
                        {(eq.riderAccesorios ?? []).map((acc, ai) => (
                          <View key={ai} style={{
                            flexDirection: "row",
                            borderBottomWidth: 1,
                            borderBottomColor: "#EBEBEB",
                            minHeight: 16,
                            backgroundColor: i % 2 === 0 ? "#FAFAF8" : "#F5F3EE",
                          }}>
                            <View style={[s.colModelo, { flexDirection: "row", gap: 5, paddingLeft: 16, alignItems: "center" }]}>
                              <Text style={{ fontSize: 6, color: GOLD }}>↳</Text>
                              <Text style={{ fontSize: 7, color: GRAY, flex: 1 }}>
                                {acc.nombre}{acc.categoria ? ` · ${acc.categoria}` : ""}
                              </Text>
                            </View>
                            <View style={[s.colQty, { alignItems: "center", justifyContent: "center" }]}>
                              <Text style={{ fontSize: 6.5, color: GRAY, textAlign: "center" }}>×{acc.cantidad}</Text>
                            </View>
                            <View style={[s.colSerie, { borderRightWidth: 0, alignItems: "center", justifyContent: "center" }]}>
                              <View style={{ width: 10, height: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 1 }} />
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                  <EmptyRows count={Math.max(1, 3 - items.length)} />
                </View>
              </View>
            ))
          ) : hasCotExtras ? (
            /* ── Cotización items only (no inventory linked) ── */
            <View>
              <View style={s.subSectionHeader}>
                <Text style={s.subSectionHeaderText}>EQUIPO</Text>
              </View>
              <View style={s.tableWrapper}>
                <View style={s.tableHeader}>
                  <View style={s.colModelo}><Text style={s.colHeaderText}>MARCA / MODELO / DESCRIPCIÓN</Text></View>
                  <View style={s.colQty}><Text style={[s.colHeaderText, { textAlign: "center" }]}>QTY</Text></View>
                  <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text style={s.colHeaderText}>NÚMERO DE SERIE / ID INVENTARIO</Text></View>
                </View>
                {cotExtras.map((l, i) => {
                  const nombre = getEquipoDisplayName(l);
                  return (
                    <View key={l.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
                      <View style={s.colModelo}>
                        <Text style={s.cellText}>{nombre}</Text>
                        {l.notas ? <Text style={{ fontSize: 6, color: LIGHT, fontStyle: "italic", marginTop: 1 }}>{l.notas}</Text> : null}
                      </View>
                      <View style={s.colQty}><Text style={[s.cellText, { textAlign: "center" }]}>{l.cantidad}</Text></View>
                      <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text style={s.cellText}> </Text></View>
                    </View>
                  );
                })}
                <EmptyRows count={Math.max(1, 4 - cotExtras.length)} />
              </View>
            </View>
          ) : (
            /* ── Empty state ── */
            <View>
              <View style={s.subSectionHeader}>
                <Text style={s.subSectionHeaderText}>EQUIPO</Text>
              </View>
              <View style={s.tableWrapper}>
                <View style={s.tableHeader}>
                  <View style={s.colModelo}><Text style={s.colHeaderText}>MARCA / MODELO / DESCRIPCIÓN</Text></View>
                  <View style={s.colQty}><Text style={[s.colHeaderText, { textAlign: "center" }]}>QTY</Text></View>
                  <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text style={s.colHeaderText}>NÚMERO DE SERIE / ID INVENTARIO</Text></View>
                </View>
                <EmptyRows count={12} />
              </View>
            </View>
          )}

          {/* ── Equipos adicionales de cotización (cuando SÍ hay inventario vinculado) ── */}
          {hasInventory && hasCotExtras && (
            <>
              <View style={[s.subSectionHeader, { marginTop: 4 }]}>
                <Text style={s.subSectionHeaderText}>EQUIPOS ADICIONALES / TERCEROS (COTIZACIÓN)</Text>
              </View>
              <View style={[s.tableWrapper, { marginBottom: 8 }]}>
                {cotExtras.map((l, i) => {
                  const nombre = getEquipoDisplayName(l);
                  return (
                    <View key={l.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
                      <View style={s.colModelo}>
                        <Text style={s.cellText}>{nombre}</Text>
                        {l.notas ? <Text style={{ fontSize: 6, color: LIGHT, fontStyle: "italic", marginTop: 1 }}>{l.notas}</Text> : null}
                      </View>
                      <View style={s.colQty}><Text style={[s.cellText, { textAlign: "center" }]}>{l.cantidad}</Text></View>
                      <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text style={s.cellText}> </Text></View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Equipos adicionales al rider (fuera de cotización) ── */}
          {hasRiderExtras && (
            <>
              <View style={[s.subSectionHeader, { marginTop: 4 }]}>
                <Text style={s.subSectionHeaderText}>EQUIPOS ADICIONALES AL RIDER</Text>
              </View>
              <View style={[s.tableWrapper, { marginBottom: 8 }]}>
                {equiposRiderExtra.map((ex, i) => (
                  <View key={ex.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
                    <View style={s.colModelo}>
                      <Text style={s.cellText}>{ex.descripcion}</Text>
                      {ex.notas ? <Text style={{ fontSize: 6, color: LIGHT, fontStyle: "italic", marginTop: 1 }}>{ex.notas}</Text> : null}
                    </View>
                    <View style={s.colQty}><Text style={[s.cellText, { textAlign: "center" }]}>{ex.cantidad}</Text></View>
                    <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text style={s.cellText}> </Text></View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── Observaciones de cotización ── */}
          {proyecto.cotizacion?.observaciones ? (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionHeaderText}>NOTAS Y OBSERVACIONES</Text>
              </View>
              <View style={{ borderWidth: 1, borderTopWidth: 0, borderColor: BORDER, marginBottom: 10, padding: 9 }}>
                <Text style={{ fontSize: 7, color: GRAY, lineHeight: 1.6 }}>{proyecto.cotizacion.observaciones}</Text>
              </View>
            </>
          ) : null}

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
              <Text style={s.signatureSectionHeaderText}>RECIBO DE EQUIPOS — ENTREGA AL CLIENTE</Text>
            </View>
            <View style={s.signatureBody}>
              <View style={s.signatureRow}>
                <View style={s.signatureField}>
                  <Text style={s.signatureLabel}>NOMBRE / REPRESENTANTE:</Text>
                  <View style={s.signatureLine} />
                </View>
                <View style={s.signatureFieldNarrow}>
                  <Text style={s.signatureLabel}>FECHA Y HORA:</Text>
                  <View style={s.signatureLine} />
                </View>
              </View>
              <View style={[s.signatureRow, { marginBottom: 0 }]}>
                <View style={s.signatureField}>
                  <Text style={s.signatureLabelSm}>ENTREGA (Mainstage)</Text>
                  <View style={[s.signatureLine, { marginTop: 28 }]} />
                </View>
                <View style={s.signatureField}>
                  <Text style={s.signatureLabelSm}>RECIBE (cliente)</Text>
                  <View style={[s.signatureLine, { marginTop: 28 }]} />
                </View>
              </View>
            </View>
          </View>

          {/* ── Firma: DEVOLUCIÓN ── */}
          <View style={s.signatureSection}>
            <View style={[s.signatureSectionHeader, { backgroundColor: "#2a2a2a" }]}>
              <Text style={[s.signatureSectionHeaderText, { color: WHITE }]}>DEVOLUCIÓN DE EQUIPOS</Text>
            </View>
            <View style={s.signatureBody}>
              <View style={s.signatureRow}>
                <View style={s.signatureField}>
                  <Text style={s.signatureLabel}>NOMBRE / REPRESENTANTE:</Text>
                  <View style={s.signatureLine} />
                </View>
                <View style={s.signatureFieldNarrow}>
                  <Text style={s.signatureLabel}>FECHA Y HORA:</Text>
                  <View style={s.signatureLine} />
                </View>
              </View>
              {/* Observaciones de devolución */}
              <View style={{ marginBottom: 14 }}>
                <Text style={s.signatureLabelSm}>OBSERVACIONES (daños, faltantes, comentarios):</Text>
                <View style={s.observacionesBox}>
                  <Text style={s.observacionesPlaceholder}> </Text>
                </View>
              </View>
              <View style={[s.signatureRow, { marginBottom: 0 }]}>
                <View style={s.signatureField}>
                  <Text style={s.signatureLabelSm}>RECIBE (Mainstage)</Text>
                  <View style={[s.signatureLine, { marginTop: 28 }]} />
                </View>
                <View style={s.signatureField}>
                  <Text style={s.signatureLabelSm}>DEVUELVE (cliente)</Text>
                  <View style={[s.signatureLine, { marginTop: 28 }]} />
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
