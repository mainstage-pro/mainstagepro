import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ─── Paleta ──────────────────────────────────────────────────────────────────
const BLACK  = "#0a0a0a";
const GOLD   = "#B3985B";
const GRAY   = "#3a3a3a";
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
  infoUnderline: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    minHeight: 10,
  },

  // ── Puesto checkboxes ─────────────────────────────────────────────────────
  puestoRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  puestoLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK, marginRight: 6 },
  checkItem: { flexDirection: "row", alignItems: "center", marginRight: 10 },
  checkBox: {
    width: 9, height: 9,
    borderWidth: 1, borderColor: "#999",
    marginRight: 3,
    justifyContent: "center", alignItems: "center",
  },
  checkBoxFilled: {
    width: 9, height: 9,
    borderWidth: 1, borderColor: GOLD,
    backgroundColor: GOLD,
    marginRight: 3,
    justifyContent: "center", alignItems: "center",
  },
  checkMark: { fontSize: 7, color: WHITE, fontFamily: "Helvetica-Bold" },
  checkLabel: { fontSize: 8, color: BLACK },

  // ── Encabezado principal ──────────────────────────────────────────────────
  introText: { fontSize: 8.5, lineHeight: 1.6, marginBottom: 12, color: BLACK },
  underlineSpan: { borderBottomWidth: 1, borderBottomColor: "#999" },

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
  firmaFechaLinea: { flex: 1, borderBottomWidth: 1, borderBottomColor: "#ccc" },

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

// ─── Datos del puesto por categoría ──────────────────────────────────────────
export type PuestoCategoria =
  | "AUDIO" | "ILUMINACION" | "VIDEO_LED" | "RIGGING"
  | "STAGE" | "RUNNER" | "DJ" | "PM" | "ENERGIA" | "OTRO";

const PUESTO_LABELS: Record<PuestoCategoria, string> = {
  AUDIO:      "Audio",
  ILUMINACION:"Iluminación",
  VIDEO_LED:  "Video/LED",
  RIGGING:    "Rigging",
  STAGE:      "Stage/Backline",
  RUNNER:     "Runner",
  DJ:         "DJ",
  PM:         "Coordinación/PM",
  ENERGIA:    "Técnico Energía",
  OTRO:       "Otro",
};

const CHECKBOXES: PuestoCategoria[] = [
  "AUDIO","ILUMINACION","VIDEO_LED","RIGGING","STAGE","RUNNER","DJ","PM","ENERGIA","OTRO",
];

// Clausula 1 personalizada por categoría
const CLAUSULA1: Record<PuestoCategoria, string> = {
  AUDIO:
    "Realizaré las funciones de operador/técnico de audio asignado, incluyendo preparación y revisión del sistema de sonido, armado de rack y conexiones, pruebas de línea, ganancia y frecuencias, operación de consola durante el show (FOH / monitors según se indique), y desmontaje ordenado. Seguiré el rider técnico, input list y las indicaciones del responsable de audio o director de producción. Cualquier cambio técnico crítico al sistema lo consultaré antes de ejecutar.",
  ILUMINACION:
    "Realizaré las funciones de operador/técnico de iluminación, incluyendo montaje y cableado de fixtures, programación de consola conforme al plot y cue list proporcionados, operación durante el show, y desmontaje. Verificaré el correcto enfoque y funcionamiento de cada fixture antes del show. Seguiré el plot de iluminación y las indicaciones del lighting designer o responsable de producción. Cualquier modificación al diseño o estructura la autorizaré con el responsable.",
  VIDEO_LED:
    "Realizaré las funciones de operador/técnico de video y/o LED, incluyendo montaje de pantallas, procesadores y cableado de señal, calibración de imagen y color, operación de switcher/playback durante el show, y desmontaje. Verificaré la integridad de la señal y la uniformidad de pantallas antes del show. Seguiré el plan de video y las indicaciones del responsable de producción.",
  RIGGING:
    "Realizaré las funciones de rigger, incluyendo inspección de puntos de carga, instalación y tensado de elementos de suspensión (motores, tornillería, hardware), montaje aéreo de estructuras, truss y equipos, verificación de cargas (SWL) y desmontaje controlado. Todas las maniobras estarán estrictamente dentro de mi capacidad técnica y certificación vigente. Ante cualquier condición de riesgo o duda sobre la integridad de un punto de carga, detendré la operación y reportaré al responsable antes de continuar. La seguridad es absoluta prioridad.",
  STAGE:
    "Realizaré las funciones de stage hand / técnico de escenario / backline, incluyendo preparación y limpieza del área de escenario, colocación de equipo de backline conforme a stage plot, apoyo a cambios de set (playbacks/instrumentos/risers), atención al artista/talento en stage según instrucciones, y desmontaje. Estaré disponible en el área de escenario durante toda la operación y atenderé las instrucciones del stage manager.",
  RUNNER:
    "Realizaré las funciones de runner / asistente general de producción, incluyendo apoyo en traslados y mensajería interna, entrega de materiales y consumibles al equipo técnico, apoyo en montaje y desmontaje según se requiera, y cualquier función de soporte logístico que el responsable asigne. Permaneceré disponible, localizable y con teléfono cargado en todo momento. Mantendré comunicación constante con el coordinador asignado.",
  DJ:
    "Realizaré las funciones de DJ, incluyendo setup y revisión del equipo de DJ (controles, interfaz de audio, cableado), ejecución del set musical conforme a los requerimientos del evento, cliente y género acordado, y desmontaje. Coordinaré con el operador de audio cualquier ajuste de señal o monitoreo. Cuidaré el equipo asignado y mantendré comunicación con el responsable de producción. El setlist o género musical lo definiré conforme a lo acordado previamente con el cliente o director creativo.",
  PM:
    "Realizaré las funciones de production manager / coordinador de producción, incluyendo supervisión general del montaje y flujo del evento, coordinación del equipo técnico (audio, iluminación, video, rigging, stage), gestión de tiempos y cronograma, comunicación con cliente y venue, resolución de imprevistos operativos, y supervisión del desmontaje. Seré el punto de contacto principal entre el equipo técnico y la dirección de Mainstage Pro. Las decisiones críticas que impliquen cambios al plan original las consultaré con el responsable de la empresa.",
  ENERGIA:
    "Realizaré las funciones de técnico de energía / electricista de producción, incluyendo revisión del suministro eléctrico del venue, distribución de alimentación a todos los sistemas técnicos del evento, instalación y conexión de cuadros, multicontactos y cable de poder conforme al plano eléctrico, supervisión de cargas durante el evento, y desmontaje seguro. Todas las intervenciones eléctricas estarán estrictamente dentro de mi capacidad técnica y certificación. Ante cualquier anomalía eléctrica (sobrecarga, corto, falla), aislaré y reportaré de inmediato sin intentar correcciones fuera de mi alcance.",
  OTRO:
    "Realizaré las funciones del puesto asignado (montaje, pruebas, operación/soporte y desmontaje) conforme al layout, rider o plan del evento y a las indicaciones del responsable de área. Cualquier cambio crítico o decisión que afecte la operación lo consultaré antes de ejecutar con el responsable directo.",
};

// ─── Utilidades ──────────────────────────────────────────────────────────────
function field(val: string | null | undefined, placeholder = "________________________________") {
  return val && val.trim() ? val.trim() : placeholder;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface CartaFreelanceProps {
  // Técnico
  tecnicoNombre: string;
  tecnicoCelular?: string | null;
  rolNombre: string;
  categoria: PuestoCategoria;

  // Evento
  numeroProyecto: string;
  nombreEvento: string;
  fechaEvento: string;   // "15 de abril de 2026"
  lugarEvento?: string | null;
  ciudad: string;

  // Responsable Mainstage
  responsableNombre: string;
  responsableCargo?: string;

  // Participaciones (para personalizar clausula 1)
  participacion?: string | null; // OPERACION | MONTAJE | DESMONTAJE | etc.
  jornada?: string | null;
  responsabilidad?: string | null;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function CartaFreelancePDF(p: CartaFreelanceProps) {
  const clausula1 = CLAUSULA1[p.categoria] ?? CLAUSULA1.OTRO;

  return (
    <Document title={`Carta Responsiva Freelance — ${p.tecnicoNombre}`}>
      <Page size="LETTER" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRODUCCIONES</Text>
            <Text style={s.tagline}>PRODUCCIÓN TÉCNICA · AUDIO · ILUMINACIÓN · VIDEO</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTipo}>CARTA RESPONSIVA – STAFF FREELANCE</Text>
            <Text style={s.docSub}>Proyecto {p.numeroProyecto}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        <View style={s.body}>

          {/* ── Datos del evento ── */}
          <View style={s.infoBox}>
            <Text style={s.infoTitle}>Datos del evento</Text>
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

          {/* ── Puesto checkboxes ── */}
          <View style={s.puestoRow}>
            <Text style={s.puestoLabel}>Puesto asignado:</Text>
            {CHECKBOXES.map(cat => (
              <View key={cat} style={s.checkItem}>
                <View style={cat === p.categoria ? s.checkBoxFilled : s.checkBox}>
                  {cat === p.categoria && <Text style={s.checkMark}>✓</Text>}
                </View>
                <Text style={[s.checkLabel, cat === p.categoria ? { fontFamily: "Helvetica-Bold" } : {}]}>
                  {PUESTO_LABELS[cat]}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Encabezado de aceptación ── */}
          <Text style={s.introText}>
            En {p.ciudad}, a ____/____/______,{"  "}yo{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{p.tecnicoNombre}</Text>
            {"  "}(INE/ID: _______________________ · Tel: {field(p.tecnicoCelular, "______________________")}),{"\n"}
            acepto prestar servicios como freelance para Mainstage Pro y me obligo a cumplir los siguientes lineamientos:
          </Text>

          {/* ── Cláusulas ── */}

          {/* 1. Rol personalizado — con borde dorado */}
          <View style={s.clausulaDestacada}>
            <Text style={s.clausula}>
              <Text style={s.clausulaNum}>1) Alcance y rol ({p.rolNombre}): </Text>
              <Text style={s.clausulaTexto}>{clausula1}</Text>
              {p.responsabilidad ? (
                <Text style={s.clausulaTexto}>
                  {"\n"}Responsabilidad específica en este evento: {p.responsabilidad}
                </Text>
              ) : null}
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>2) Horarios y permanencia: </Text>
              <Text style={s.clausulaTexto}>
                Cumpliré puntualmente los horarios establecidos para bodega, carga, traslado, montaje, show y desmontaje. Permaneceré disponible en mi área durante toda la jornada
                {p.jornada ? ` (jornada ${p.jornada === "CORTA" ? "0–8 hrs" : p.jornada === "MEDIA" ? "8–12 hrs" : "12+ hrs"})` : ""} y avisaré cualquier salida al responsable.
              </Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>3) Conducta y ética: </Text>
              <Text style={s.clausulaTexto}>Respeto total a cliente, venue, proveedores y equipo. Queda prohibido: agresiones, acoso, discriminación, conflictos y consumo de alcohol o sustancias durante el servicio.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>4) Presentación: </Text>
              <Text style={s.clausulaTexto}>Ropa negra o uniforme cuando se solicite; higiene personal y lenguaje profesional en todo momento.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>5) Seguridad (EHS): </Text>
              <Text style={s.clausulaTexto}>Seguridad primero: usaré EPP cuando aplique y realizaré únicamente maniobras dentro de mi capacidad y certificación. Si identifico un riesgo, detengo la operación y reporto de inmediato.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>6) Comunicación: </Text>
              <Text style={s.clausulaTexto}>Usaré los canales oficiales del evento (WhatsApp u otro indicado). Ante duda o error potencial, consulto antes de ejecutar. Reporto avances y envío evidencia cuando se solicite.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>7) Orden, limpieza e higiene (áreas técnicas): </Text>
              <Text style={s.clausulaTexto}>Mantendré las áreas técnicas funcionales, limpias e higiénicas: sin basura, líquidos ni obstáculos. Cableado ordenado e identificable para detectar fallas rápido, acceder con seguridad y mantener pasillos libres.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>8) Uso y cuidado del equipo: </Text>
              <Text style={s.clausulaTexto}>Uso correcto del equipo asignado, sin préstamos ni uso personal. Orden por zonas (audio/iluminación/video/cables) y resguardo adecuado al finalizar.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>9) Daños, pérdidas y faltantes: </Text>
              <Text style={s.clausulaTexto}>Reportaré de inmediato cualquier daño, falla o extravío. Acepto responsabilidad por negligencia, mal uso o falta de reporte oportuno (reparación/reposición o descuento acordado). No aplica a desgaste normal por uso correcto.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>10) Incidencias y reporte: </Text>
              <Text style={s.clausulaTexto}>Las incidencias técnicas, operativas o de seguridad se reportan en el momento y al cierre del evento con resumen breve y evidencia cuando aplique.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>11) Operación estándar (montaje–show–desmontaje): </Text>
              <Text style={s.clausulaTexto}>Carga segura; plan de zona; descarga ordenada; revisión inicial; seguridad antes que estética; pruebas completas; monitoreo constante; desmontaje calmado; cables por tipo; regreso y orden final en bodega.</Text>
            </Text>
          </View>

          <View style={s.clausula}>
            <Text>
              <Text style={s.clausulaNum}>12) Confidencialidad e imagen: </Text>
              <Text style={s.clausulaTexto}>No divulgaré información interna ni publicaré fotos o videos del backstage o del evento sin autorización expresa de Mainstage Pro.</Text>
            </Text>
          </View>

          {/* ── Declaración ── */}
          <View style={s.declaracion}>
            <Text style={s.declaracionText}>DECLARO QUE LEÍ, ENTIENDO Y ACEPTO el contenido de esta carta responsiva.</Text>
          </View>

          {/* ── Firmas ── */}
          <View style={s.firmasRow}>
            <View style={s.firmaCol}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaLabel}>Nombre y firma del Freelance</Text>
              <Text style={[s.firmaDetalle, { fontFamily: "Helvetica-Bold", marginTop: 2 }]}>{p.tecnicoNombre}</Text>
              <Text style={s.firmaDetalle}>{p.rolNombre}</Text>
              <View style={s.firmaFechaRow}>
                <Text style={s.firmaFechaLabel}>Fecha: ____/____/______</Text>
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
          <Text style={s.footerNote}>Carta responsiva freelance · {p.nombreEvento} · {p.numeroProyecto}</Text>
        </View>

      </Page>
    </Document>
  );
}
