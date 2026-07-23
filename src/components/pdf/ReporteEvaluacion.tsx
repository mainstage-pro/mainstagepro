/**
 * ReporteEvaluacion.tsx — Reporte interno de la Evaluación Post Evento / Post Renta
 * Cierre operativo del coordinador para presentar en junta: respuestas por sección,
 * incidencias detectadas, calificaciones, propuestas de mejora y comentarios.
 * Diseño Mainstage: fondo blanco, hero negro, acento dorado, logo y footer.
 */
import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { C, base, nowStr, MAPS } from "./PdfShared";
import {
  getEvalConfig,
  contarRespondidos,
  contarIncidencias,
  promedioCalificaciones,
  nivelResultado,
  type EvalPostEventoData,
  type EvalItem,
} from "@/lib/evaluacion-post-evento";

const s = StyleSheet.create({
  metaLine: { fontSize: 7.5, color: C.grisMedio, marginBottom: 12 },
  metaBold: { fontFamily: "Helvetica-Bold", color: C.negro },
  // Tablero de KPIs
  kpiRow: { flexDirection: "row", marginHorizontal: -4, marginBottom: 4 },
  kpiCard: {
    flex: 1, marginHorizontal: 4, padding: 10, borderRadius: 4,
    borderWidth: 0.5, borderStyle: "solid", backgroundColor: C.grisFondo, borderColor: C.grisLinea,
  },
  kpiLabel: { fontSize: 6, color: C.grisMedio, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  kpiVal: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.negro },
  kpiSub: { fontSize: 6.5, color: C.grisClaro, marginTop: 2 },
  // Ítems de evaluación
  itemRow: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingVertical: 6, paddingHorizontal: 8,
    borderBottomWidth: 0.3, borderBottomColor: "#f0f0f0", borderBottomStyle: "solid",
  },
  itemLeft: { flex: 1, paddingRight: 10 },
  itemLabel: { fontSize: 8.5, color: C.negro },
  itemComentario: { fontSize: 7.5, color: C.grisMedio, marginTop: 2, fontStyle: "italic" },
  badge: {
    fontSize: 7, fontFamily: "Helvetica-Bold", paddingHorizontal: 6, paddingVertical: 2.5,
    borderRadius: 3, flexShrink: 0,
  },
  badgeGood: { color: C.verde, backgroundColor: C.verdeFondo },
  badgeBad: { color: C.rojo, backgroundColor: C.rojoFondo },
  badgeMuted: { color: C.grisMedio, backgroundColor: C.grisFondo },
  incidenciaTag: { fontSize: 6, fontFamily: "Helvetica-Bold", color: C.rojo, marginTop: 2 },
  // Calificaciones
  califRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 5 },
  califLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.negro },
  califDesc: { fontSize: 7, color: C.grisMedio, marginTop: 1 },
  starRow: { flexDirection: "row" },
  star: { width: 9, height: 9, borderRadius: 2, marginLeft: 3, borderWidth: 0.5, borderStyle: "solid" },
  starOn: { backgroundColor: C.dorado, borderColor: C.dorado },
  starOff: { backgroundColor: C.blanco, borderColor: C.grisLinea },
  resultBox: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 8, padding: 10, borderRadius: 4, backgroundColor: C.negro,
  },
  resultLabel: { fontSize: 7, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.8 },
  resultVal: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.blanco, marginTop: 2 },
  resultNivel: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  // Propuestas de mejora
  mejoraRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  mejoraNum: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.dorado, width: 14 },
  mejoraTxt: { flex: 1, fontSize: 8.5, color: C.negro, lineHeight: 1.4 },
  emptyTxt: { fontSize: 8, color: C.grisClaro, fontStyle: "italic", paddingHorizontal: 8, paddingVertical: 4 },
});

function StarBar({ valor }: { valor: number | null }) {
  const n = Math.round(valor ?? 0);
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[s.star, i <= n ? s.starOn : s.starOff]} />
      ))}
    </View>
  );
}

function estadoItem(it: EvalItem, valor: "si" | "no" | "na" | null) {
  if (valor == null) return { label: "Sin responder", tone: "muted" as const, incidencia: false };
  if (valor === "na") return { label: "No fue necesario", tone: "muted" as const, incidencia: false };
  const incidencia =
    (it.incidenciaSiSi && valor === "si") || (!it.incidenciaSiSi && it.tipo === "si-no" && valor === "no");
  return {
    label: valor === "si" ? "Sí" : "No",
    tone: incidencia ? ("bad" as const) : ("good" as const),
    incidencia,
  };
}

export interface ReporteEvaluacionData {
  numeroProyecto: string;
  nombre: string;
  cliente: { nombre: string; empresa: string | null };
  tipoServicio: string | null;
  fechasTexto: string;
  lugarEvento: string | null;
  evaluacion: EvalPostEventoData;
  logoSrc: string | null;
  logoSrcDark: string | null;
}

export function ReporteEvaluacion({ data }: { data: ReporteEvaluacionData }) {
  const config = getEvalConfig(data.tipoServicio);
  const ev = data.evaluacion;

  const { respondidos, total } = contarRespondidos(ev.items, config.secciones);
  const incidencias = contarIncidencias(ev.items, config.secciones);
  const promDim = promedioCalificaciones(ev.calificaciones, config.califDimensiones);
  const nivelDim = nivelResultado(promDim);
  const nivelFinal = nivelResultado(ev.calificacionFinal);

  const llenadoFecha = ev.actualizadoEn
    ? new Date(ev.actualizadoEn).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const propuestas = (ev.propuestasMejora ?? []).map((p) => p.trim()).filter(Boolean);

  return (
    <Document title={`${config.etiqueta} ${data.numeroProyecto}`} author="Mainstage Pro">
      <Page size="LETTER" style={base.page}>

        {/* HERO */}
        <View style={base.hero}>
          <View style={base.heroLeft}>
            <Text style={base.heroTag}>{config.etiqueta} · {data.numeroProyecto}</Text>
            <Text style={base.heroNombre}>{data.nombre}</Text>
            <Text style={base.heroMeta}>
              {data.cliente.nombre}{data.cliente.empresa ? ` · ${data.cliente.empresa}` : ""}
              {data.tipoServicio ? ` · ${MAPS.TIPO_SERVICIO_MAP[data.tipoServicio] ?? data.tipoServicio}` : ""}
            </Text>
          </View>
          {data.logoSrc && <Image src={data.logoSrc} style={base.heroLogo} />}
        </View>

        {/* BANDA */}
        {(data.fechasTexto || data.lugarEvento) && (
          <View style={base.banda}>
            {data.fechasTexto && (
              <View style={base.bandaItem}>
                <Text style={base.bandaLabel}>Fecha del evento</Text>
                <Text style={base.bandaVal}>{data.fechasTexto}</Text>
              </View>
            )}
            {data.lugarEvento && (
              <>
                <View style={base.bandaDivider} />
                <View style={base.bandaItem}>
                  <Text style={base.bandaLabel}>Lugar</Text>
                  <Text style={base.bandaVal}>{data.lugarEvento}</Text>
                </View>
              </>
            )}
          </View>
        )}

        <View style={base.body}>

          {/* META: quién y cuándo */}
          <Text style={s.metaLine}>
            {ev.llenadoPorNombre ? (
              <>Llenó: <Text style={s.metaBold}>{ev.llenadoPorNombre}</Text></>
            ) : (
              "Coordinador no registrado"
            )}
            {llenadoFecha ? `  ·  Actualizado: ${llenadoFecha}` : ""}
          </Text>

          {/* KPIs */}
          <View style={s.kpiRow}>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Ítems respondidos</Text>
              <Text style={s.kpiVal}>{respondidos}/{total}</Text>
              <Text style={s.kpiSub}>del checklist operativo</Text>
            </View>
            <View style={[s.kpiCard, incidencias > 0 ? { backgroundColor: C.rojoFondo, borderColor: "#f5c2c2" } : {}]}>
              <Text style={s.kpiLabel}>Incidencias</Text>
              <Text style={[s.kpiVal, incidencias > 0 ? { color: C.rojo } : {}]}>{incidencias}</Text>
              <Text style={s.kpiSub}>{incidencias > 0 ? "requieren atención" : "sin incidencias"}</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>{config.resultadoLabel}</Text>
              <Text style={[s.kpiVal, { color: nivelDim.color }]}>
                {promDim != null ? promDim.toFixed(1) : "—"}
                {promDim != null && <Text style={{ fontSize: 9, color: C.grisMedio }}> /5</Text>}
              </Text>
              <Text style={[s.kpiSub, { color: nivelDim.color }]}>{nivelDim.label}</Text>
            </View>
          </View>

          {/* SECCIONES DE RESPUESTAS */}
          {config.secciones.map((sec) => (
            <View key={sec.id} style={base.section} wrap={false}>
              <Text style={base.secTitle}>{sec.titulo}</Text>
              <View style={base.table}>
                {sec.items.map((it) => {
                  const resp = ev.items?.[it.id];
                  const est = estadoItem(it, resp?.valor ?? null);
                  const badgeStyle =
                    est.tone === "good" ? s.badgeGood : est.tone === "bad" ? s.badgeBad : s.badgeMuted;
                  return (
                    <View key={it.id} style={s.itemRow}>
                      <View style={s.itemLeft}>
                        <Text style={s.itemLabel}>{it.label}</Text>
                        {resp?.comentario ? <Text style={s.itemComentario}>“{resp.comentario}”</Text> : null}
                        {est.incidencia ? <Text style={s.incidenciaTag}>● INCIDENCIA</Text> : null}
                      </View>
                      <Text style={[s.badge, badgeStyle]}>{est.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          {/* CALIFICACIONES */}
          <View style={base.section} wrap={false}>
            <Text style={base.secTitle}>{config.califTitulo}</Text>
            <View style={base.table}>
              {config.califDimensiones.map((d) => (
                <View key={d.id} style={[s.califRow, { paddingHorizontal: 8 }]}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={s.califLabel}>{d.label}</Text>
                    <Text style={s.califDesc}>{d.desc}</Text>
                  </View>
                  <StarBar valor={ev.calificaciones?.[d.id] ?? null} />
                </View>
              ))}
            </View>

            <View style={s.resultBox}>
              <View>
                <Text style={s.resultLabel}>{config.califFinalPregunta}</Text>
                <Text style={[s.resultNivel, { color: nivelFinal.color, marginTop: 3 }]}>
                  {ev.calificacionFinal != null ? `${ev.calificacionFinal}/5 · ${nivelFinal.label}` : "Sin calificar"}
                </Text>
              </View>
              <StarBar valor={ev.calificacionFinal} />
            </View>
          </View>

          {/* PROPUESTAS DE MEJORA */}
          <View style={base.section} wrap={false}>
            <Text style={base.secTitle}>Propuestas de mejora</Text>
            {propuestas.length > 0 ? (
              <View style={base.textBox}>
                {propuestas.map((p, i) => (
                  <View key={i} style={s.mejoraRow}>
                    <Text style={s.mejoraNum}>{i + 1}.</Text>
                    <Text style={s.mejoraTxt}>{p}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={s.emptyTxt}>Sin propuestas de mejora registradas.</Text>
            )}
          </View>

          {/* COMENTARIOS FINALES */}
          <View style={base.section} wrap={false}>
            <Text style={base.secTitle}>Comentarios finales</Text>
            {ev.comentariosFinales?.trim() ? (
              <View style={base.textBox}>
                <Text style={base.textBoxContent}>{ev.comentariosFinales.trim()}</Text>
              </View>
            ) : (
              <Text style={s.emptyTxt}>Sin comentarios finales.</Text>
            )}
          </View>

        </View>

        {/* FOOTER */}
        <View style={base.footer} fixed>
          {(data.logoSrcDark ?? data.logoSrc) && <Image src={(data.logoSrcDark ?? data.logoSrc)!} style={base.footerLogo} />}
          <Text style={base.footerTxt}>mainstagepro.mx</Text>
          <Text style={base.footerTxt}>{data.numeroProyecto} · {nowStr()}</Text>
        </View>

      </Page>
    </Document>
  );
}
