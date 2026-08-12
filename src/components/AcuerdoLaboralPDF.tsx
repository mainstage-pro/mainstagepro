import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { DocLaboralSnapshot } from "@/lib/documentos-laborales";

const GOLD = "#B3985B";
const BLACK = "#0a0a0a";
const GRAY = "#4a4a4a";
const LIGHT = "#888888";
const WHITE = "#FFFFFF";
const CREAM = "#f7f5f0";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: WHITE, paddingTop: 36, paddingBottom: 72, paddingHorizontal: 0, fontSize: 9, color: BLACK },
  header: { backgroundColor: BLACK, paddingHorizontal: 44, paddingTop: 26, paddingBottom: 20, marginTop: -36, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  brand: { fontSize: 15, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 2 },
  tagline: { fontSize: 6.5, color: LIGHT, letterSpacing: 1 },
  docTipo: { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 1 },
  docSub: { fontSize: 8, color: LIGHT, marginTop: 2, textAlign: "right" },
  goldBar: { height: 2, backgroundColor: GOLD },
  body: { paddingHorizontal: 44, paddingTop: 20 },
  titulo: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BLACK, textAlign: "center", marginVertical: 14, letterSpacing: 1 },
  partes: { backgroundColor: CREAM, borderRadius: 4, padding: 12, marginBottom: 14, flexDirection: "row", justifyContent: "space-between" },
  parteCol: { width: "46%" },
  parteLabel: { fontSize: 7, color: LIGHT, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  parteNombre: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 2 },
  parteDetalle: { fontSize: 8, color: GRAY },
  seccionTitulo: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1, textTransform: "uppercase", borderBottomWidth: 1, borderBottomColor: "#e5e5e5", paddingBottom: 4, marginBottom: 8, marginTop: 14 },
  texto: { fontSize: 8.5, color: BLACK, lineHeight: 1.65, marginBottom: 6 },
  bold: { fontFamily: "Helvetica-Bold" },
  row2: { flexDirection: "row", gap: 20, marginBottom: 8 },
  campo: { flex: 1 },
  campoLabel: { fontSize: 7, color: LIGHT, marginBottom: 2 },
  campoValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 10, fontSize: 8.5, color: GOLD },
  bulletText: { flex: 1, fontSize: 8.5, color: BLACK, lineHeight: 1.5 },
  estRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee", paddingVertical: 4 },
  estHead: { flexDirection: "row", backgroundColor: CREAM, paddingVertical: 5, paddingHorizontal: 4, borderRadius: 3, marginBottom: 2 },
  estColSub: { width: "24%", paddingHorizontal: 4, fontSize: 7.5 },
  estColResp: { width: "38%", paddingHorizontal: 4, fontSize: 7.5 },
  estColStd: { width: "38%", paddingHorizontal: 4, fontSize: 7.5 },
  estHeadTxt: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: LIGHT, letterSpacing: 0.5, textTransform: "uppercase" },
  firmaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 30 },
  firmaCol: { width: "44%" },
  firmaLinea: { borderBottomWidth: 1, borderBottomColor: "#999", paddingBottom: 24, marginBottom: 8 },
  firmaNombre: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLACK },
  firmaDetalle: { fontSize: 8, color: LIGHT },
  footer: { position: "absolute", bottom: 22, left: 0, right: 0, paddingHorizontal: 44, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e0e0e0", paddingTop: 8 },
  footerBrand: { fontSize: 6.5, color: "#aaa", letterSpacing: 1 },
  footerPage: { fontSize: 6.5, color: "#aaa" },
});

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
const PERIODO: Record<string, string> = { MENSUAL: "mensual", QUINCENAL: "quincenal", SEMANAL: "semanal", POR_EVENTO: "por evento" };
const NIVEL: Record<string, string> = { basico: "básico", intermedio: "intermedio", avanzado: "avanzado" };
const FREC: Record<string, string> = { diaria: "diaria", semanal: "semanal", mensual: "mensual", por_evento: "por evento" };

export function AcuerdoLaboralPDF(raw: DocLaboralSnapshot) {
  // Tolerante con snapshots antiguos que no traen los campos nuevos (§8/§9).
  const p = {
    ...raw,
    responsabilidades: raw.responsabilidades ?? [],
    estandares: raw.estandares ?? [],
    estandaresMinimos: raw.estandaresMinimos ?? [],
    valores: raw.valores ?? [],
    aptitudes: raw.aptitudes ?? [],
    conocimientos: raw.conocimientos ?? [],
    coordinaCon: raw.coordinaCon ?? [],
    supervisaA: raw.supervisaA ?? [],
    funciones: raw.funciones ?? [],
    beneficios: raw.beneficios ?? [],
  };
  return (
    <Document title={`Acuerdo — ${p.personaNombre}`}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRODUCCIONES</Text>
            <Text style={s.tagline}>PRODUCCIÓN TÉCNICA · AUDIO · ILUMINACIÓN · VIDEO</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTipo}>ACUERDO LABORAL</Text>
            <Text style={s.docSub}>{p.fechaDocumento}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        <View style={s.body}>
          <Text style={s.titulo}>ACUERDO DE ALINEACIÓN OPERATIVA</Text>

          <View style={s.partes}>
            <View style={s.parteCol}>
              <Text style={s.parteLabel}>La Empresa</Text>
              <Text style={s.parteNombre}>Mainstage Producciones</Text>
              <Text style={s.parteDetalle}>Producción técnica integral · Querétaro, México</Text>
            </View>
            <View style={s.parteCol}>
              <Text style={s.parteLabel}>El/La Colaborador(a)</Text>
              <Text style={s.parteNombre}>{p.personaNombre}</Text>
              {p.personaDomicilio && <Text style={s.parteDetalle}>{p.personaDomicilio}</Text>}
              {p.personaTelefono && <Text style={s.parteDetalle}>{p.personaTelefono}</Text>}
              {p.personaCorreo && <Text style={s.parteDetalle}>{p.personaCorreo}</Text>}
            </View>
          </View>

          <Text style={s.seccionTitulo}>1 — Puesto y ubicación en la organización</Text>
          <View style={s.row2}>
            <View style={s.campo}><Text style={s.campoLabel}>PUESTO</Text><Text style={s.campoValue}>{p.puestoNombre}</Text></View>
            <View style={s.campo}><Text style={s.campoLabel}>ÁREA</Text><Text style={s.campoValue}>{p.area}</Text></View>
            {p.reportaA && <View style={s.campo}><Text style={s.campoLabel}>REPORTA A</Text><Text style={s.campoValue}>{p.reportaA}</Text></View>}
          </View>
          {p.objetivoArea && (<><Text style={s.campoLabel}>OBJETIVO DEL ÁREA</Text><Text style={s.texto}>{p.objetivoArea}</Text></>)}
          {p.descripcionPuesto && (<><Text style={s.campoLabel}>DESCRIPCIÓN DEL PUESTO</Text><Text style={s.texto}>{p.descripcionPuesto}</Text></>)}
          {p.objetivoPuesto && (<><Text style={s.campoLabel}>OBJETIVO DEL PUESTO</Text><Text style={s.texto}>{p.objetivoPuesto}</Text></>)}
          {p.misionPuesto && (<><Text style={s.campoLabel}>MISIÓN DEL PUESTO</Text><Text style={s.texto}>{p.misionPuesto}</Text></>)}

          {p.responsabilidades.length > 0 && (
            <>
              <Text style={s.seccionTitulo}>2 — Responsabilidades permanentes</Text>
              <Text style={s.texto}>El/La colaborador(a) es responsable de forma permanente, con independencia del plan de trabajo vigente, de lo siguiente:</Text>
              {p.responsabilidades.map((r, i) => (
                <View key={i} style={s.bullet}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>{r}</Text></View>
              ))}
            </>
          )}

          {(p.coordinaCon.length > 0 || p.supervisaA.length > 0) && (
            <>
              <Text style={s.seccionTitulo}>3 — Relaciones de trabajo</Text>
              {p.coordinaCon.length > 0 && <Text style={s.texto}><Text style={s.bold}>Coordina con: </Text>{p.coordinaCon.join(", ")}.</Text>}
              {p.supervisaA.length > 0 && <Text style={s.texto}><Text style={s.bold}>Supervisa a: </Text>{p.supervisaA.join(", ")}.</Text>}
            </>
          )}

          {p.estandaresMinimos.length > 0 && (
            <>
              <Text style={s.seccionTitulo}>4 — Estándares mínimos (no negociables)</Text>
              <Text style={s.texto}>El/La colaborador(a) se compromete a cumplir de forma no negociable con los siguientes estándares mínimos verificables:</Text>
              {p.estandaresMinimos.map((m, i) => (
                <View key={i} style={s.bullet}>
                  <Text style={s.bulletDot}>•</Text>
                  <Text style={s.bulletText}>{m.enunciado} <Text style={{ color: LIGHT }}>({FREC[m.frecuencia] ?? m.frecuencia}{m.evidencia ? ` · evidencia: ${m.evidencia}` : ""})</Text></Text>
                </View>
              ))}
            </>
          )}

          {p.estandares.length > 0 && (
            <>
              <Text style={s.seccionTitulo}>5 — Criterios de calidad</Text>
              <View style={s.estHead}>
                <View style={s.estColSub}><Text style={s.estHeadTxt}>Subárea</Text></View>
                <View style={s.estColResp}><Text style={s.estHeadTxt}>Responsabilidad</Text></View>
                <View style={s.estColStd}><Text style={s.estHeadTxt}>Estándar esperado</Text></View>
              </View>
              {p.estandares.map((e, i) => (
                <View key={i} style={s.estRow}>
                  <View style={s.estColSub}><Text>{e.subarea}</Text></View>
                  <View style={s.estColResp}><Text>{e.responsabilidad}</Text></View>
                  <View style={s.estColStd}><Text>{e.estandar}</Text></View>
                </View>
              ))}
            </>
          )}

          {(p.valores.length > 0 || p.aptitudes.length > 0 || p.conocimientos.length > 0) && (
            <>
              <Text style={s.seccionTitulo}>6 — Perfil requerido</Text>
              {p.valores.length > 0 && (
                <Text style={s.texto}>
                  <Text style={s.bold}>Valores: </Text>
                  {p.valores.map(v => v.comoSeVe ? `${v.nombre} (${v.comoSeVe})` : v.nombre).join("; ")}.
                </Text>
              )}
              {p.aptitudes.length > 0 && (
                <Text style={s.texto}>
                  <Text style={s.bold}>Aptitudes y habilidades: </Text>
                  {p.aptitudes.map(a => `${a.nombre} (${NIVEL[a.nivel] ?? a.nivel})`).join("; ")}.
                </Text>
              )}
              {p.conocimientos.length > 0 && (
                <Text style={s.texto}>
                  <Text style={s.bold}>Conocimientos: </Text>
                  {p.conocimientos.map(c => `${c.nombre} (${NIVEL[c.nivel] ?? c.nivel}${c.indispensable ? ", indispensable" : ""})`).join("; ")}.
                </Text>
              )}
            </>
          )}

          <Text style={s.seccionTitulo}>7 — Plan de trabajo variable</Text>
          <Text style={s.texto}>
            Además de las responsabilidades permanentes, el/la colaborador(a) atenderá el plan de trabajo que le sea asignado,
            el cual podrá actualizarse periódicamente según las prioridades operativas. El plan de trabajo vigente y su avance
            se registran y evalúan dentro de la plataforma. El cumplimiento de las responsabilidades permanentes y de los
            estándares aquí definidos es la base para la evaluación de desempeño.
          </Text>

          <Text style={s.seccionTitulo}>8 — Condiciones y compensación</Text>
          <View style={s.row2}>
            {p.tipoContrato && <View style={s.campo}><Text style={s.campoLabel}>TIPO DE CONTRATO</Text><Text style={s.campoValue}>{p.tipoContrato}</Text></View>}
            {p.modalidad && <View style={s.campo}><Text style={s.campoLabel}>MODALIDAD</Text><Text style={s.campoValue}>{p.modalidad}</Text></View>}
          </View>
          {p.horario && (<><Text style={s.campoLabel}>JORNADA</Text><Text style={s.texto}>{p.horario}</Text></>)}
          {(p.beneficios.length > 0 || p.prestacionesOtro) && (
            <>
              <Text style={s.campoLabel}>PRESTACIONES</Text>
              <Text style={s.texto}>{[...p.beneficios, ...(p.prestacionesOtro ? [p.prestacionesOtro] : [])].join(" · ")}</Text>
            </>
          )}
          <View style={s.row2}>
            {p.salario != null && <View style={s.campo}><Text style={s.campoLabel}>COMPENSACIÓN</Text><Text style={s.campoValue}>{fmt(p.salario)} {PERIODO[p.periodoPago] ?? ""}</Text></View>}
            {p.fechaIngreso && <View style={s.campo}><Text style={s.campoLabel}>FECHA DE INGRESO</Text><Text style={s.campoValue}>{p.fechaIngreso}</Text></View>}
          </View>
          <Text style={s.texto}>
            Ambas partes acuerdan que las presentes condiciones son válidas y serán respetadas de conformidad con lo establecido
            en la Ley Federal del Trabajo. El presente acuerdo alinea las expectativas de desempeño y no sustituye al contrato
            laboral formal cuando este resulte aplicable.
          </Text>

          <View style={s.firmaRow}>
            <View style={s.firmaCol}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaNombre}>{p.personaNombre}</Text>
              <Text style={s.firmaDetalle}>{p.puestoNombre}</Text>
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
          <Text style={s.footerBrand}>MAINSTAGE PRODUCCIONES{p.puestoVersion ? ` · Puesto v${p.puestoVersion}` : ""}</Text>
          <Text style={s.footerPage}>Acuerdo confidencial · Uso exclusivo de las partes</Text>
        </View>
      </Page>
    </Document>
  );
}
