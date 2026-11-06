import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { CartaFreelanceProps } from "./CartaFreelancePDF";

// ─── Paleta ──────────────────────────────────────────────────────────────────
const BLACK  = "#0a0a0a";
const GOLD   = "#B3985B";
const LIGHT  = "#666666";
const WHITE  = "#FFFFFF";
const CREAM  = "#f7f5f0";

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 36,
    paddingBottom: 64,
    paddingHorizontal: 0,
    fontSize: 8.5,
    color: BLACK,
  },
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 40,
    paddingTop: 22,
    paddingBottom: 18,
    marginTop: -36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: { fontSize: 14, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 2 },
  tagline: { fontSize: 6.5, color: LIGHT, letterSpacing: 1 },
  docTipo: { fontSize: 9, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 1 },
  docSub:  { fontSize: 7.5, color: LIGHT, marginTop: 2, textAlign: "right" },
  goldBar: { height: 2, backgroundColor: GOLD },

  body: { paddingHorizontal: 40, paddingTop: 20 },

  // ── Datos del evento ──────────────────────────────────────────────────────
  infoBox: {
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "#e0ddd8",
    borderRadius: 4,
    padding: 12,
    marginBottom: 14,
  },
  infoTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: LIGHT,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  infoRow: { flexDirection: "row", marginBottom: 5 },
  infoLabel: { fontSize: 8, color: LIGHT, width: 110 },
  infoValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK, flex: 1 },

  // ── Encabezado principal ──────────────────────────────────────────────────
  introText: { fontSize: 8.5, lineHeight: 1.6, marginBottom: 12, color: BLACK },

  // ── Cláusulas ─────────────────────────────────────────────────────────────
  clausula: { marginBottom: 7 },
  clausulaNum: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLACK },
  clausulaTexto: { fontSize: 8.5, color: BLACK, lineHeight: 1.55 },
  clausulaDestacada: {
    borderLeftWidth: 2,
    borderLeftColor: GOLD,
    paddingLeft: 8,
    marginBottom: 8,
  },

  // ── Declaración ───────────────────────────────────────────────────────────
  declaracion: {
    backgroundColor: BLACK,
    padding: 10,
    borderRadius: 3,
    marginTop: 14,
    marginBottom: 18,
  },
  declaracionText: { fontSize: 8.5, color: WHITE, fontFamily: "Helvetica-Bold", textAlign: "center" },

  // ── Firmas ────────────────────────────────────────────────────────────────
  firmasRow: { flexDirection: "row", justifyContent: "space-between" },
  firmaCol: { width: "46%" },
  firmaLinea: { borderBottomWidth: 1, borderBottomColor: "#999", marginBottom: 6, paddingBottom: 20 },
  firmaLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 2 },
  firmaDetalle: { fontSize: 7.5, color: LIGHT },
  firmaFechaRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 4 },
  firmaFechaLabel: { fontSize: 7.5, color: LIGHT },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 0, right: 0,
    paddingHorizontal: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
  },
  footerBrand: { fontSize: 6.5, color: "#aaa", letterSpacing: 1 },
  footerNote:  { fontSize: 6.5, color: "#aaa" },
});

// ─── Utilidades ──────────────────────────────────────────────────────────────
function field(val: string | null | undefined, placeholder = "________________________________") {
  return val && val.trim() ? val.trim() : placeholder;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function CartaRiggerPDF(p: CartaFreelanceProps) {
  return (
    <Document title={`Carta Responsiva Rigging — ${p.tecnicoNombre}`}>
      <Page size="LETTER" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRO</Text>
            <Text style={s.tagline}>ESCENARIO PRINCIPAL PRODUCCIONES, S.A. DE C.V. · AUDIO · ILUMINACIÓN · VIDEO</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTipo}>RESPONSIVA DE RIGGING Y TRABAJO EN ALTURAS</Text>
            <Text style={s.docSub}>Proyecto {p.numeroProyecto}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        <View style={s.body}>

          {/* ── Datos del evento ── */}
          <View style={s.infoBox}>
            <Text style={s.infoTitle}>Datos del evento e Involucrado</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Nombre del Rigger:</Text>
              <Text style={s.infoValue}>{p.tecnicoNombre}</Text>
              <Text style={[s.infoLabel, { width: 40, textAlign: "right" }]}>Rol:</Text>
              <Text style={[s.infoValue, { width: 90 }]}>{p.rolNombre}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Evento / Proyecto:</Text>
              <Text style={s.infoValue}>{p.nombreEvento}</Text>
              <Text style={[s.infoLabel, { width: 40, textAlign: "right" }]}>Fecha:</Text>
              <Text style={[s.infoValue, { width: 90 }]}>{p.fechaEvento}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Sede:</Text>
              <Text style={s.infoValue}>{field(p.lugarEvento)}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Responsable directo:</Text>
              <Text style={s.infoValue}>{field(p.responsableNombre)}</Text>
            </View>
          </View>

          <Text style={s.introText}>
            En {p.ciudad}, a ____/____/______,{"  "}yo{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{p.tecnicoNombre}</Text>
            {"  "}(INE/ID: _______________________ · Teléfono celular: {field(p.tecnicoCelular, "______________________")}),{"\n"}
            acepto prestar mis servicios especializados de montaje y trabajo en alturas (Rigging) para la empresa Escenario Principal Producciones, S.A. de C.V. (Mainstage Pro). Debido al alto riesgo inherente al trabajo en alturas y elevación de cargas, me obligo a cumplir estrictamente los siguientes lineamientos de seguridad:
          </Text>

          {/* ── Cláusulas Exclusivas para Rigging ── */}
          <View style={s.clausulaDestacada}>
            <Text style={s.clausula}>
              <Text style={s.clausulaNum}>1) Capacidad y Certificación: </Text>
              <Text style={s.clausulaTexto}>Declaro contar con la experiencia comprobable, capacitación técnica y capacidad física necesarias para realizar cálculos de carga segura, instalación de puntos de anclaje, manejo de polipastos/motores y trabajo en alturas. Asumo la responsabilidad técnica de las maniobras a mi cargo.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>2) Uso obligatorio de Equipo de Protección Personal (EPP): </Text>
              <Text style={s.clausulaTexto}>Es obligatorio el uso continuo de casco de seguridad con barboquejo, arnés de cuerpo entero debidamente certificado, líneas de vida dobles con amortiguador de impacto, calzado de seguridad con casquillo y guantes de protección. Queda estrictamente prohibido iniciar trabajos en altura sin portar el equipo completo e inspeccionado.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>3) Aseguramiento y sujeción de herramientas: </Text>
              <Text style={s.clausulaTexto}>Todas las herramientas manuales, radios de comunicación y accesorios deberán estar permanentemente asegurados mediante cintas o líneas de seguridad anticaídas para prevenir el riesgo de impacto al personal en tierra.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>4) Inspección previa de herrajes y estructuras: </Text>
              <Text style={s.clausulaTexto}>Me comprometo a inspeccionar visual y operativamente todos los motores de elevación, eslingas de carga, grilletes, cables de acero de seguridad y tramos de estructura (truss) antes de su izaje. Cualquier elemento que presente deformación o daño será reportado y descartado inmediatamente.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>5) Autoridad para detención de trabajo (Stop Work Authority): </Text>
              <Text style={s.clausulaTexto}>Tengo el derecho y la obligación ineludible de detener cualquier maniobra de elevación o montaje si detecto que los puntos de anclaje no son seguros, si hay sobrecarga, si la velocidad del viento supera los límites tolerables o si las condiciones ambientales o del recinto comprometen la seguridad estructural.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>6) Respeto a límites de carga del recinto: </Text>
              <Text style={s.clausulaTexto}>Me apegaré estrictamente a los límites de carga establecidos por la ingeniería del recinto o sede y el plano de rigging autorizado. Queda estrictamente prohibido improvisar puntos de anclaje en vigas o estructuras no autorizadas.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>7) Despeje de zona de maniobra (zona cero): </Text>
              <Text style={s.clausulaTexto}>Durante el izaje o descenso de estructuras o cargas suspendidas, coordinaré el despeje total del área inferior. Ninguna persona podrá permanecer o transitar debajo de una estructura en movimiento.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>8) Condición física y cero tolerancia: </Text>
              <Text style={s.clausulaTexto}>Declaro presentarme a laborar descansado y en óptimas condiciones de salud. Está estrictamente prohibido laborar bajo la influencia de alcohol, drogas o medicamentos que alteren los reflejos o la concentración. El incumplimiento causará la baja inmediata del evento.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>9) Responsabilidad técnica y civil: </Text>
              <Text style={s.clausulaTexto}>Asumo responsabilidad total sobre accidentes, colapsos o lesiones a terceros ocasionados por mi negligencia directa comprobada, mala práctica o por omitir deliberadamente estas normativas de seguridad técnica.</Text>
            </Text>
          </View>

          {/* ── Comentarios opcionales del freelance ── */}
          {p.comentarios ? (
            <View style={{ marginTop: 6, marginBottom: 6, padding: 6, backgroundColor: CREAM, borderRadius: 3, borderWidth: 1, borderColor: "#e0ddd8" }}>
              <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: LIGHT, textTransform: "uppercase", marginBottom: 2 }}>
                Comentarios u observaciones del freelance:
              </Text>
              <Text style={{ fontSize: 7.5, color: BLACK }}>{p.comentarios}</Text>
            </View>
          ) : null}

          {/* ── Declaración ── */}
          <View style={s.declaracion}>
            <Text style={s.declaracionText}>DECLARO QUE LEÍ, ENTIENDO LA RESPONSABILIDAD TÉCNICA, Y ACEPTO EL CONTENIDO DE ESTA CARTA RESPONSIVA.</Text>
          </View>

          {/* ── Firmas ── */}
          <View style={s.firmasRow}>
            <View style={s.firmaCol}>
              <View style={[s.firmaLinea, p.firmaTecnicoUrl ? { paddingBottom: 0 } : {}]}>
                {p.firmaTecnicoUrl && <Image src={p.firmaTecnicoUrl} style={{ width: 100, height: 40, alignSelf: 'center', marginBottom: -5 }} />}
              </View>
              <Text style={[s.firmaDetalle, { fontFamily: "Helvetica-Bold", marginTop: 2, fontSize: 8.5 }]}>{p.tecnicoNombre}</Text>
              <Text style={[s.firmaLabel, { fontSize: 7, color: LIGHT, marginTop: 1, textTransform: "uppercase" }]}>Nombre completo del técnico rigger</Text>
              <Text style={s.firmaDetalle}>{p.rolNombre}</Text>
              <View style={s.firmaFechaRow}>
                <Text style={s.firmaFechaLabel}>Fecha: {p.firmaTecnicoUrl ? new Date().toLocaleDateString('es-MX') : "____/____/______"}</Text>
              </View>
            </View>
            <View style={s.firmaCol}>
              <View style={s.firmaLinea} />
              <Text style={[s.firmaDetalle, { fontFamily: "Helvetica-Bold", marginTop: 2, fontSize: 8.5 }]}>
                {p.responsableNombre && !/mauricio|mau/i.test(p.responsableNombre) ? p.responsableNombre : "Escenario Principal Producciones, S.A. de C.V."}
              </Text>
              <Text style={[s.firmaLabel, { fontSize: 7, color: LIGHT, marginTop: 1, textTransform: "uppercase" }]}>Por Escenario Principal Producciones, S.A. de C.V.</Text>
              <Text style={s.firmaDetalle}>
                {p.responsableNombre && !/mauricio|mau/i.test(p.responsableNombre) ? (p.responsableCargo ?? "Coordinador de Rigging") : "Mainstage Pro"}
              </Text>
            </View>
          </View>

        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>ESCENARIO PRINCIPAL PRODUCCIONES, S.A. DE C.V. · MAINSTAGE PRO</Text>
          <Text style={s.footerNote}>Responsiva Rigging y Trabajo en Alturas · {p.nombreEvento} · {p.numeroProyecto}</Text>
        </View>

      </Page>
    </Document>
  );
}
