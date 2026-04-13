import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const GOLD  = "#B3985B";
const BLACK = "#0a0a0a";
const GRAY  = "#4a4a4a";
const LIGHT = "#888888";
const WHITE = "#FFFFFF";
const CREAM = "#f7f5f0";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica", backgroundColor: WHITE,
    paddingTop: 36, paddingBottom: 72, paddingHorizontal: 0,
    fontSize: 9, color: BLACK,
  },
  header: {
    backgroundColor: BLACK, paddingHorizontal: 44,
    paddingTop: 26, paddingBottom: 20, marginTop: -36,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
  },
  brand: { fontSize: 15, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 2 },
  tagline: { fontSize: 6.5, color: LIGHT, letterSpacing: 1 },
  docTipo: { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 1 },
  docSub:  { fontSize: 8, color: LIGHT, marginTop: 2, textAlign: "right" },
  goldBar: { height: 2, backgroundColor: GOLD },
  body: { paddingHorizontal: 44, paddingTop: 24 },

  intro: { fontSize: 10, lineHeight: 1.7, color: BLACK, marginBottom: 18 },
  candidatoNombre: { fontSize: 20, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 4 },
  candidatoSub: { fontSize: 9, color: LIGHT, marginBottom: 20 },

  seccionTitulo: {
    fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD,
    letterSpacing: 1.5, textTransform: "uppercase",
    borderBottomWidth: 1, borderBottomColor: "#e5e5e5",
    paddingBottom: 5, marginBottom: 10, marginTop: 16,
  },
  row2: { flexDirection: "row", gap: 24, marginBottom: 12 },
  campo: { flex: 1 },
  campoLabel: { fontSize: 7, color: LIGHT, marginBottom: 3 },
  campoValue: { fontSize: 9, color: BLACK, fontFamily: "Helvetica-Bold" },
  campoValueLight: { fontSize: 9, color: GRAY },

  destacado: {
    backgroundColor: CREAM, borderLeftWidth: 2, borderLeftColor: GOLD,
    padding: 12, marginVertical: 10, borderRadius: 3,
  },
  destacadoTexto: { fontSize: 9, color: BLACK, lineHeight: 1.6 },

  listItem: { flexDirection: "row", marginBottom: 5 },
  bullet: { fontSize: 9, color: GOLD, marginRight: 6, width: 10 },
  listText: { fontSize: 9, color: BLACK, flex: 1, lineHeight: 1.5 },

  llamado: {
    backgroundColor: BLACK, padding: 16, borderRadius: 4, marginTop: 20,
  },
  llamadoText: { fontSize: 9.5, color: WHITE, lineHeight: 1.6 },
  llamadoGold: { fontSize: 10, fontFamily: "Helvetica-Bold", color: GOLD },

  firmaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 28 },
  firmaCol: { width: "44%" },
  firmaLinea: { borderBottomWidth: 1, borderBottomColor: "#ccc", marginBottom: 8, paddingBottom: 22 },
  firmaNombre: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLACK },
  firmaDetalle: { fontSize: 8, color: LIGHT },

  footer: {
    position: "absolute", bottom: 22, left: 0, right: 0,
    paddingHorizontal: 44, flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: "#e0e0e0", paddingTop: 8,
  },
  footerBrand: { fontSize: 6.5, color: "#aaa", letterSpacing: 1 },
  footerNote:  { fontSize: 6.5, color: "#aaa" },
});

export interface PropuestaProps {
  candidatoNombre: string;
  candidatoCorreo?: string | null;
  candidatoTelefono?: string | null;
  candidatoCiudad?: string | null;
  candidatoCarrera?: string | null;

  puestoTitulo: string;
  puestoArea: string;
  puestoDescripcion?: string | null;
  puestoObjetivo?: string | null;

  salarioPropuesto?: number | null;
  salarioMin?: number | null;
  salarioMax?: number | null;
  tipoContrato?: string | null;
  modalidad?: string | null;
  horario?: string | null;
  fechaIngreso?: string | null;
  beneficios?: string[];

  observaciones?: string | null;
  responsableNombre: string;
  fechaDocumento: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

const MODALIDAD: Record<string, string> = {
  PRESENCIAL: "Presencial", REMOTO: "Remoto", HIBRIDO: "Híbrido",
};
const CONTRATO: Record<string, string> = {
  NOMINA: "Nómina (empleado formal)", HONORARIOS: "Honorarios profesionales", FREELANCE: "Freelance / Por proyecto",
};

export function PropuestaTrabajoPDF(p: PropuestaProps) {
  const beneficios = p.beneficios ?? [];

  return (
    <Document title={`Propuesta de Trabajo — ${p.candidatoNombre}`}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRODUCCIONES</Text>
            <Text style={s.tagline}>PRODUCCIÓN TÉCNICA · AUDIO · ILUMINACIÓN · VIDEO</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTipo}>PROPUESTA DE COLABORACIÓN</Text>
            <Text style={s.docSub}>{p.fechaDocumento}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        <View style={s.body}>
          {/* Saludo */}
          <Text style={[s.intro, { marginTop: 4, marginBottom: 8 }]}>Estimado/a</Text>
          <Text style={s.candidatoNombre}>{p.candidatoNombre}</Text>
          <Text style={s.candidatoSub}>
            {[p.candidatoCarrera, p.candidatoCiudad].filter(Boolean).join(" · ")}
          </Text>

          <View style={s.destacado}>
            <Text style={s.destacadoTexto}>
              Nos complace extenderte una propuesta formal de colaboración para unirte al equipo de{" "}
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Mainstage Producciones</Text>.
              Después de conocer tu perfil y experiencia, consideramos que representas una incorporación de alto valor para nuestra organización.
            </Text>
          </View>

          {/* Puesto */}
          <Text style={s.seccionTitulo}>El puesto</Text>
          <View style={s.row2}>
            <View style={s.campo}>
              <Text style={s.campoLabel}>TÍTULO</Text>
              <Text style={s.campoValue}>{p.puestoTitulo}</Text>
            </View>
            <View style={s.campo}>
              <Text style={s.campoLabel}>ÁREA</Text>
              <Text style={s.campoValue}>{p.puestoArea}</Text>
            </View>
            <View style={s.campo}>
              <Text style={s.campoLabel}>MODALIDAD</Text>
              <Text style={s.campoValue}>{MODALIDAD[p.modalidad ?? ""] ?? p.modalidad ?? "—"}</Text>
            </View>
          </View>
          {p.puestoObjetivo || p.puestoDescripcion ? (
            <Text style={[s.campoValueLight, { lineHeight: 1.6, marginBottom: 8 }]}>
              {p.puestoObjetivo ?? p.puestoDescripcion}
            </Text>
          ) : null}

          {/* Condiciones */}
          <Text style={s.seccionTitulo}>Condiciones de la oferta</Text>
          <View style={s.row2}>
            <View style={s.campo}>
              <Text style={s.campoLabel}>COMPENSACIÓN MENSUAL</Text>
              <Text style={s.campoValue}>
                {p.salarioPropuesto ? fmt(p.salarioPropuesto) :
                 (p.salarioMin && p.salarioMax) ? `${fmt(p.salarioMin)} – ${fmt(p.salarioMax)}` : "A convenir"}
              </Text>
            </View>
            <View style={s.campo}>
              <Text style={s.campoLabel}>TIPO DE CONTRATO</Text>
              <Text style={s.campoValue}>{CONTRATO[p.tipoContrato ?? ""] ?? p.tipoContrato ?? "—"}</Text>
            </View>
            <View style={s.campo}>
              <Text style={s.campoLabel}>HORARIO</Text>
              <Text style={s.campoValue}>{p.horario ?? "—"}</Text>
            </View>
            <View style={s.campo}>
              <Text style={s.campoLabel}>INICIO ESTIMADO</Text>
              <Text style={s.campoValue}>{p.fechaIngreso ?? "A convenir"}</Text>
            </View>
          </View>

          {/* Beneficios */}
          {beneficios.length > 0 && (
            <>
              <Text style={s.seccionTitulo}>Beneficios y prestaciones</Text>
              {beneficios.map((b, i) => (
                <View key={i} style={s.listItem}>
                  <Text style={s.bullet}>▸</Text>
                  <Text style={s.listText}>{b}</Text>
                </View>
              ))}
            </>
          )}

          {/* Observaciones */}
          {p.observaciones && (
            <>
              <Text style={s.seccionTitulo}>Notas adicionales</Text>
              <Text style={[s.campoValueLight, { lineHeight: 1.6 }]}>{p.observaciones}</Text>
            </>
          )}

          {/* Llamado a la acción */}
          <View style={s.llamado}>
            <Text style={s.llamadoGold}>¿Listo/a para sumarte?</Text>
            <Text style={[s.llamadoText, { marginTop: 6 }]}>
              Esperamos tu confirmación para avanzar con el proceso de incorporación. Por favor comunícate con nosotros a la brevedad para confirmar tu aceptación o resolver cualquier duda.
            </Text>
          </View>

          {/* Firmas */}
          <View style={s.firmaRow}>
            <View style={s.firmaCol}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaNombre}>{p.candidatoNombre}</Text>
              <Text style={s.firmaDetalle}>Candidato/a · Fecha: ____/____/______</Text>
            </View>
            <View style={s.firmaCol}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaNombre}>{p.responsableNombre}</Text>
              <Text style={s.firmaDetalle}>Mainstage Producciones</Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>MAINSTAGE PRODUCCIONES</Text>
          <Text style={s.footerNote}>Propuesta de colaboración · Documento confidencial</Text>
        </View>
      </Page>
    </Document>
  );
}
