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
            <Text style={s.brand}>MAINSTAGE PRODUCCIONES</Text>
            <Text style={s.tagline}>PRODUCCIÓN TÉCNICA · AUDIO · ILUMINACIÓN · VIDEO</Text>
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
            {"  "}(INE/ID: _______________________ · Tel: {field(p.tecnicoCelular, "______________________")}),{"\n"}
            acepto prestar mis servicios especializados de RIGGING para Mainstage Pro. Debido al alto riesgo inherente al trabajo en alturas y elevación de cargas, me obligo a cumplir estrictamente los siguientes lineamientos:
          </Text>

          {/* ── Cláusulas Exclusivas para Rigging ── */}
          <View style={s.clausulaDestacada}>
            <Text style={s.clausula}>
              <Text style={s.clausulaNum}>1) Capacidad y Certificación: </Text>
              <Text style={s.clausulaTexto}>Declaro contar con la experiencia, capacitación técnica y capacidad física necesarias para realizar cálculos de carga segura (SWL/WLL), instalación de puntos de anclaje, manejo de polipastos/motores y trabajo en alturas. Asumo la responsabilidad técnica de las maniobras a mi cargo.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>2) Uso de Equipo de Protección Personal (EPP): </Text>
              <Text style={s.clausulaTexto}>Es obligatorio el uso en todo momento de casco de seguridad (con barboquejo), arnés de cuerpo entero, líneas de vida (Y-lanyard), botas de seguridad y guantes. Está estrictamente prohibido iniciar trabajos en altura sin el EPP correctamente colocado.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>3) Aseguramiento de Herramientas: </Text>
              <Text style={s.clausulaTexto}>Todas las herramientas manuales, radios y accesorios deben estar sujetos obligatoriamente con cintas o líneas de seguridad (tool lanyards) para prevenir la caída de objetos que puedan poner en riesgo la vida del personal en piso.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>4) Inspección Previa de Equipo: </Text>
              <Text style={s.clausulaTexto}>Me comprometo a inspeccionar visual y operativamente todos los motores, eslingas (slings), grilletes (shackles), steels y estructuras (truss) antes de su izaje. Cualquier equipo que presente desgaste, daño estructural o carezca de identificación de carga deberá ser reportado y descartado inmediatamente.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>5) Stop Work Authority (SWA) - Derecho a Detener la Maniobra: </Text>
              <Text style={s.clausulaTexto}>Tengo el derecho y la obligación de detener cualquier maniobra de elevación si detecto que los puntos de anclaje no son seguros, si hay sobrecarga, si existen vientos por encima de los límites permitidos, o si las condiciones climáticas o del recinto comprometen la seguridad estructural.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>6) Cargas y Puntos del Recinto: </Text>
              <Text style={s.clausulaTexto}>Me apegaré estrictamente a los límites de carga establecidos por la ingeniería del recinto (venue) y el plot aprobado. Queda estrictamente prohibido improvisar puntos de anclaje (bridles o dead hangs) en vigas o estructuras no autorizadas.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>7) Zona Cero y Elevación: </Text>
              <Text style={s.clausulaTexto}>Durante el izaje (vuelo) o descenso de estructuras, coordinaré el despeje total del área inferior ("zona cero"). Ningún técnico u otra persona debe permanecer debajo de una estructura en movimiento.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>8) Estado Físico y Cero Tolerancia: </Text>
              <Text style={s.clausulaTexto}>Declaro presentarme a laborar descansado, sin fatiga extrema y en pleno uso de mis facultades. Está estrictamente prohibido laborar bajo la influencia de alcohol, drogas, o cualquier medicamento que altere el sistema nervioso. El incumplimiento causará baja inmediata del evento.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>9) Responsabilidad Civil: </Text>
              <Text style={s.clausulaTexto}>Asumo responsabilidad total sobre accidentes, colapsos o lesiones a terceros ocasionados por mi negligencia directa, mala práctica, o por omitir deliberadamente estas normativas de seguridad, deslindando a Mainstage Producciones en casos de negligencia comprobada de mi parte.</Text>
            </Text>
          </View>

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
              <Text style={s.firmaLabel}>Nombre y firma del Rigger</Text>
              <Text style={[s.firmaDetalle, { fontFamily: "Helvetica-Bold", marginTop: 2 }]}>{p.tecnicoNombre}</Text>
              <Text style={s.firmaDetalle}>{p.rolNombre}</Text>
              <View style={s.firmaFechaRow}>
                <Text style={s.firmaFechaLabel}>Fecha: {p.firmaTecnicoUrl ? new Date().toLocaleDateString('es-MX') : "____/____/______"}</Text>
              </View>
            </View>
            <View style={s.firmaCol}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaLabel}>Nombre y firma (Mainstage Pro)</Text>
              <Text style={[s.firmaDetalle, { fontFamily: "Helvetica-Bold", marginTop: 2 }]}>{field(p.responsableNombre)}</Text>
              <Text style={s.firmaDetalle}>{p.responsableCargo ?? "Director de Producción"}</Text>
            </View>
          </View>

        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>MAINSTAGE PRODUCCIONES</Text>
          <Text style={s.footerNote}>Responsiva Rigging y Trabajo en Alturas · {p.nombreEvento} · {p.numeroProyecto}</Text>
        </View>

      </Page>
    </Document>
  );
}
