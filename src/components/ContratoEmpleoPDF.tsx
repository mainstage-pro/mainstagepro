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
  body: { paddingHorizontal: 44, paddingTop: 20 },

  titulo: {
    fontSize: 14, fontFamily: "Helvetica-Bold", color: BLACK,
    textAlign: "center", marginVertical: 14, letterSpacing: 1,
  },
  partes: {
    backgroundColor: CREAM, borderRadius: 4, padding: 12, marginBottom: 14,
    flexDirection: "row", justifyContent: "space-between",
  },
  parteCol: { width: "46%" },
  parteLabel: { fontSize: 7, color: LIGHT, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  parteNombre: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 2 },
  parteDetalle: { fontSize: 8, color: GRAY },

  clausulaTitulo: {
    fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD,
    letterSpacing: 1, textTransform: "uppercase",
    borderBottomWidth: 1, borderBottomColor: "#e5e5e5",
    paddingBottom: 4, marginBottom: 8, marginTop: 14,
  },
  clausulaTexto: { fontSize: 8.5, color: BLACK, lineHeight: 1.65, marginBottom: 6 },
  clausulaBold: { fontFamily: "Helvetica-Bold" },
  row2: { flexDirection: "row", gap: 20, marginBottom: 8 },
  campo: { flex: 1 },
  campoLabel: { fontSize: 7, color: LIGHT, marginBottom: 2 },
  campoValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK },

  firmaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 30 },
  firmaCol: { width: "44%" },
  firmaLinea: { borderBottomWidth: 1, borderBottomColor: "#999", paddingBottom: 24, marginBottom: 8 },
  firmaNombre: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLACK },
  firmaDetalle: { fontSize: 8, color: LIGHT },

  footer: {
    position: "absolute", bottom: 22, left: 0, right: 0,
    paddingHorizontal: 44, flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: "#e0e0e0", paddingTop: 8,
  },
  footerBrand: { fontSize: 6.5, color: "#aaa", letterSpacing: 1 },
  footerPage:  { fontSize: 6.5, color: "#aaa" },
});

export interface ContratoEmpleoProps {
  candidatoNombre: string;
  candidatoCorreo?: string | null;
  candidatoTelefono?: string | null;
  candidatoCiudad?: string | null;

  puestoTitulo: string;
  puestoArea: string;
  salario: number;
  tipoContrato?: string | null;
  modalidad?: string | null;
  horario?: string | null;
  fechaIngreso: string;
  beneficios?: string[];

  responsableNombre: string;
  fechaDocumento: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

const MODALIDAD: Record<string, string> = {
  PRESENCIAL: "presencial en las instalaciones de la empresa",
  REMOTO: "remota / home office",
  HIBRIDO: "híbrida (combinación presencial y remota)",
};

export function ContratoEmpleoPDF(p: ContratoEmpleoProps) {
  const beneficios = p.beneficios ?? [];
  const modalidadTexto = MODALIDAD[p.modalidad ?? ""] ?? "presencial";

  return (
    <Document title={`Contrato — ${p.candidatoNombre}`}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRODUCCIONES</Text>
            <Text style={s.tagline}>PRODUCCIÓN TÉCNICA · AUDIO · ILUMINACIÓN · VIDEO</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTipo}>CONTRATO DE COLABORACIÓN</Text>
            <Text style={s.docSub}>{p.fechaDocumento}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        <View style={s.body}>
          <Text style={s.titulo}>CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES</Text>

          {/* Partes */}
          <View style={s.partes}>
            <View style={s.parteCol}>
              <Text style={s.parteLabel}>La Empresa</Text>
              <Text style={s.parteNombre}>Mainstage Producciones</Text>
              <Text style={s.parteDetalle}>Producción técnica integral</Text>
              <Text style={s.parteDetalle}>R.F.C. / Querétaro, México</Text>
            </View>
            <View style={s.parteCol}>
              <Text style={s.parteLabel}>El Colaborador</Text>
              <Text style={s.parteNombre}>{p.candidatoNombre}</Text>
              {p.candidatoCiudad && <Text style={s.parteDetalle}>{p.candidatoCiudad}</Text>}
              {p.candidatoTelefono && <Text style={s.parteDetalle}>{p.candidatoTelefono}</Text>}
              {p.candidatoCorreo && <Text style={s.parteDetalle}>{p.candidatoCorreo}</Text>}
            </View>
          </View>

          {/* Cláusula 1 — Objeto */}
          <Text style={s.clausulaTitulo}>Cláusula 1 — Objeto y puesto</Text>
          <View style={s.row2}>
            <View style={s.campo}>
              <Text style={s.campoLabel}>PUESTO</Text>
              <Text style={s.campoValue}>{p.puestoTitulo}</Text>
            </View>
            <View style={s.campo}>
              <Text style={s.campoLabel}>ÁREA / DEPARTAMENTO</Text>
              <Text style={s.campoValue}>{p.puestoArea}</Text>
            </View>
            <View style={s.campo}>
              <Text style={s.campoLabel}>FECHA DE INGRESO</Text>
              <Text style={s.campoValue}>{p.fechaIngreso}</Text>
            </View>
          </View>
          <Text style={s.clausulaTexto}>
            La Empresa contrata los servicios profesionales de{" "}
            <Text style={s.clausulaBold}>{p.candidatoNombre}</Text> para desempeñar el puesto de{" "}
            <Text style={s.clausulaBold}>{p.puestoTitulo}</Text> dentro del área de{" "}
            <Text style={s.clausulaBold}>{p.puestoArea}</Text>, realizando las funciones inherentes a dicho rol según las instrucciones y lineamientos de la empresa.
          </Text>

          {/* Cláusula 2 — Duración y periodo de prueba */}
          <Text style={s.clausulaTitulo}>Cláusula 2 — Vigencia y periodo de prueba</Text>
          <Text style={s.clausulaTexto}>
            El presente contrato inicia el <Text style={s.clausulaBold}>{p.fechaIngreso}</Text> con un periodo de prueba de{" "}
            <Text style={s.clausulaBold}>90 días naturales</Text>. Durante este periodo cualquiera de las partes podrá dar por terminada la relación sin responsabilidad. Al término del periodo de prueba, y de mutuo acuerdo, se formalizará la continuidad de la relación laboral.
          </Text>

          {/* Cláusula 3 — Compensación */}
          <Text style={s.clausulaTitulo}>Cláusula 3 — Compensación y forma de pago</Text>
          <View style={s.row2}>
            <View style={s.campo}>
              <Text style={s.campoLabel}>COMPENSACIÓN MENSUAL</Text>
              <Text style={s.campoValue}>{fmt(p.salario)}</Text>
            </View>
            <View style={s.campo}>
              <Text style={s.campoLabel}>TIPO DE CONTRATACIÓN</Text>
              <Text style={s.campoValue}>{p.tipoContrato === "NOMINA" ? "Nómina formal" : p.tipoContrato === "HONORARIOS" ? "Honorarios" : "Freelance"}</Text>
            </View>
          </View>
          <Text style={s.clausulaTexto}>
            La Empresa pagará la compensación acordada de forma mensual mediante transferencia bancaria o el método que se establezca de mutuo acuerdo. El pago se realizará dentro de los primeros 5 días hábiles del mes siguiente al período laborado.
          </Text>

          {/* Cláusula 4 — Horario y lugar */}
          <Text style={s.clausulaTitulo}>Cláusula 4 — Horario y lugar de trabajo</Text>
          <Text style={s.clausulaTexto}>
            La modalidad de trabajo será <Text style={s.clausulaBold}>{modalidadTexto}</Text>.{" "}
            {p.horario && <>El horario establecido será <Text style={s.clausulaBold}>{p.horario}</Text>, pudiendo ajustarse según las necesidades operativas de los eventos, previo aviso y acuerdo de las partes.</>}
            {" "}Por la naturaleza del giro de la empresa (producción de eventos), el colaborador acepta que su disponibilidad podrá requerirse en fines de semana y horarios nocturnos conforme al calendario de eventos.
          </Text>

          {/* Cláusula 5 — Obligaciones */}
          <Text style={s.clausulaTitulo}>Cláusula 5 — Obligaciones del colaborador</Text>
          <Text style={s.clausulaTexto}>
            El colaborador se compromete a: desempeñar sus funciones con diligencia y profesionalismo; cumplir los lineamientos internos y protocolos de seguridad; mantener confidencialidad sobre información interna, datos de clientes y proyectos; reportar cualquier incidencia o falla al responsable de área; cuidar el equipo y recursos de la empresa; y actuar en todo momento conforme a los valores de Mainstage Producciones.
          </Text>

          {/* Cláusula 6 — Beneficios */}
          {beneficios.length > 0 && (
            <>
              <Text style={s.clausulaTitulo}>Cláusula 6 — Beneficios adicionales</Text>
              <Text style={s.clausulaTexto}>
                Adicionalmente a la compensación acordada, la Empresa otorgará al colaborador los siguientes beneficios:{" "}
                <Text style={s.clausulaBold}>{beneficios.join(", ")}</Text>.
              </Text>
            </>
          )}

          {/* Cláusula 7 — Confidencialidad */}
          <Text style={s.clausulaTitulo}>Cláusula {beneficios.length > 0 ? "7" : "6"} — Confidencialidad e imagen</Text>
          <Text style={s.clausulaTexto}>
            El colaborador se compromete a no divulgar información interna, datos de clientes, proveedores, proyectos o procesos de la empresa durante la vigencia del contrato ni con posterioridad a su término. Asimismo, no publicará contenido visual o audiovisual de los eventos y proyectos sin autorización expresa de Mainstage Producciones.
          </Text>

          {/* Cláusula 8 — Terminación */}
          <Text style={s.clausulaTitulo}>Cláusula {beneficios.length > 0 ? "8" : "7"} — Terminación</Text>
          <Text style={s.clausulaTexto}>
            Cualquiera de las partes podrá dar por terminada la relación laboral con un aviso previo de{" "}
            <Text style={s.clausulaBold}>15 días naturales</Text>. En caso de incumplimiento grave de las obligaciones establecidas, la empresa podrá rescindir el contrato de forma inmediata.
          </Text>

          {/* Firmas */}
          <View style={s.firmaRow}>
            <View style={s.firmaCol}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaNombre}>{p.candidatoNombre}</Text>
              <Text style={s.firmaDetalle}>{p.puestoTitulo}</Text>
              <Text style={s.firmaDetalle}>Fecha: ____/____/______</Text>
            </View>
            <View style={s.firmaCol}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaNombre}>{p.responsableNombre}</Text>
              <Text style={s.firmaDetalle}>Mainstage Producciones</Text>
              <Text style={s.firmaDetalle}>Fecha: ____/____/______</Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>MAINSTAGE PRODUCCIONES</Text>
          <Text style={s.footerPage}>Contrato confidencial · Uso exclusivo de las partes</Text>
        </View>
      </Page>
    </Document>
  );
}
