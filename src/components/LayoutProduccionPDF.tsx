/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import { Document, G, Line, Page, Rect, StyleSheet, Svg, Text, View, Image } from "@react-pdf/renderer";
import { C, fmtFecha, nowStr } from "@/components/pdf/PdfShared";
import type { DocumentoLayout, FilaEquipo, ZonaDoc } from "@/lib/layout-produccion";
import { rotuloEnLineas, type Area } from "@/lib/layout-escenario";

/** Carta horizontal: el plano y la tabla ancha piden apaisado. */
const PAGINA = { ancho: 792, alto: 612 };
const MARGEN = 30;
const UTIL = PAGINA.ancho - MARGEN * 2;

/** Anchos de la lista de instalación. Suman UTIL exacto para que no haya deriva. */
const COL = {
  img: 26,
  cant: 30,
  equipo: 112,
  descripcion: 140,
  config: 88,
  montaje: 88,
  peso: 42,
  carga: 64,
  notas: UTIL - (26 + 30 + 112 + 140 + 88 + 88 + 42 + 64),
};

const s = StyleSheet.create({
  page: {
    paddingTop: MARGEN,
    paddingBottom: 38,
    paddingHorizontal: MARGEN,
    backgroundColor: C.blanco,
    fontSize: 7.5,
    color: C.negro,
  },

  hero: {
    backgroundColor: C.negro,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  heroTag: { fontSize: 6.5, color: C.dorado, letterSpacing: 2.2 },
  heroTitulo: { fontSize: 16, color: C.blanco, marginTop: 2 },
  heroSub: { fontSize: 7.5, color: "#9a9a9a", marginTop: 3 },
  heroLogo: { height: 24, objectFit: "contain" },

  banda: {
    flexDirection: "row",
    borderBottomWidth: 1.6,
    borderBottomColor: C.dorado,
    backgroundColor: C.grisFondo,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  bandaItem: { flex: 1, paddingRight: 8 },
  bandaLabel: { fontSize: 5.6, color: C.grisMedio, letterSpacing: 1.1 },
  bandaVal: { fontSize: 8.5, color: C.negro, marginTop: 1.5 },

  secTitulo: {
    fontSize: 8,
    letterSpacing: 1.6,
    color: C.negro,
    borderLeftWidth: 2.4,
    borderLeftColor: C.dorado,
    paddingLeft: 6,
    marginTop: 14,
    marginBottom: 6,
  },

  kpis: { flexDirection: "row", gap: 7 },
  kpi: {
    flex: 1,
    borderWidth: 0.7,
    borderColor: C.grisLinea,
    borderTopWidth: 2,
    borderTopColor: C.dorado,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  kpiVal: { fontSize: 14, color: C.negro },
  kpiLabel: { fontSize: 5.8, color: C.grisMedio, letterSpacing: 1, marginTop: 2 },

  thead: { flexDirection: "row", backgroundColor: C.negro, paddingVertical: 4.5, paddingHorizontal: 4 },
  th: { fontSize: 5.8, color: C.blanco, letterSpacing: 0.9 },

  zonaHd: { flexDirection: "row", alignItems: "center", marginTop: 9, paddingVertical: 4, paddingHorizontal: 4, backgroundColor: C.grisFondo },
  zonaChip: { width: 7, height: 7, marginRight: 6 },
  zonaNombre: { fontSize: 9, letterSpacing: 0.8, flex: 1 },
  zonaMeta: { fontSize: 6.5, color: C.grisMedio },

  subHd: { flexDirection: "row", alignItems: "center", marginTop: 5, paddingVertical: 2.5, paddingHorizontal: 4, borderBottomWidth: 0.7, borderBottomColor: C.grisLinea },
  subChip: { width: 5, height: 5, marginRight: 5 },
  subNombre: { fontSize: 7.5, flex: 1 },
  subMeta: { fontSize: 6, color: C.grisMedio },

  tr: { flexDirection: "row", alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0", paddingVertical: 3, paddingHorizontal: 4 },
  td: { fontSize: 6.8, color: "#333333" },
  tdFuerte: { fontSize: 7.2, color: C.negro },
  tdTenue: { fontSize: 6.3, color: C.grisClaro },
  thumb: { width: 18, height: 18, objectFit: "contain" },

  nota: { fontSize: 6.3, color: C.amarillo },
  avisoCaja: { borderWidth: 0.7, borderColor: C.doradoBorde, backgroundColor: C.doradoClaro, padding: 7, marginTop: 10 },
  avisoTxt: { fontSize: 7, color: "#6b5a2e", lineHeight: 1.4 },

  leyenda: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  leyItem: { flexDirection: "row", alignItems: "center", width: "25%", paddingRight: 6, marginBottom: 3 },
  leyChip: { width: 6, height: 6, marginRight: 4 },
  leyTxt: { fontSize: 6.3, color: "#444444" },

  pie: {
    position: "absolute",
    bottom: 16,
    left: MARGEN,
    right: MARGEN,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.6,
    borderTopColor: C.grisLinea,
    paddingTop: 5,
  },
  pieTxt: { fontSize: 5.8, color: C.grisClaro },
});

function kg(v: number) {
  return `${v.toFixed(v >= 100 ? 0 : 1)} kg`;
}

function Pie({ doc }: { doc: DocumentoLayout }) {
  return (
    <View style={s.pie} fixed>
      <Text style={s.pieTxt}>
        {doc.proyecto.numero} · {doc.proyecto.nombre} · Layout de producción · {doc.escenario.nombre}
      </Text>
      <Text style={s.pieTxt} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

/**
 * El plano cenital, redibujado en vectores para impresión. No es una captura de
 * pantalla: se arma con las mismas áreas y piezas del editor pero en claro, que
 * es como se lee en sitio con una hoja en la mano.
 */
function Plano({ doc, ancho, alto }: { doc: DocumentoLayout; ancho: number; alto: number }) {
  const { anchoM, largoM, areas, piezas } = doc.plano;
  const escala = Math.min(ancho / anchoM, alto / largoM);
  const w = anchoM * escala;
  const h = largoM * escala;
  const dx = (ancho - w) / 2;

  const lineasV = Math.floor(anchoM);
  const lineasH = Math.floor(largoM);
  const zonas = areas.filter(a => a.clase === "ZONA");
  const subzonas = areas.filter(a => a.clase === "SUBZONA");

  /**
   * Rótulo en pastilla: el mismo criterio del editor y de la vista pública. El
   * texto suelto sobre las piezas se volvía ilegible en cuanto dos áreas se tocan.
   */
  function Rotulo({ a, maximo, invertido }: { a: Area; maximo: number; invertido: boolean }) {
    const texto = invertido ? a.etiqueta.toUpperCase() : a.etiqueta;
    const { lineas, fs } = rotuloEnLineas(texto, a.anchoM * escala - 6, maximo);
    const x = dx + a.x * escala + 2;
    const y = a.y * escala + 2;
    const anchoTexto = Math.max(...lineas.map(l => l.length)) * fs * 0.56;
    return (
      <G>
        <Rect
          x={x} y={y}
          width={Math.min(a.anchoM * escala - 4, anchoTexto + fs * 1.1)}
          height={lineas.length * fs * 1.25 + fs * 0.6}
          fill={invertido ? a.color : "#ffffff"}
          fillOpacity={invertido ? 1 : 0.9}
          stroke={a.color} strokeWidth={invertido ? 0 : 0.5}
        />
        {lineas.map((l, i) => (
          <Text
            key={i}
            x={x + fs * 0.55}
            y={y + fs * (1.05 + i * 1.25)}
            fill={invertido ? "#ffffff" : a.color}
            style={{ fontSize: fs }}
          >
            {l}
          </Text>
        ))}
      </G>
    );
  }

  return (
    <Svg width={ancho} height={alto + 14} viewBox={`0 0 ${ancho} ${alto + 14}`}>
      <G>
        <Rect x={dx} y={0} width={w} height={h} fill="#fcfcfc" stroke="#cfcfcf" strokeWidth={0.9} />

        {Array.from({ length: lineasV }, (_, i) => (
          <Line key={`v${i}`} x1={dx + (i + 1) * escala} y1={0} x2={dx + (i + 1) * escala} y2={h} stroke="#ededed" strokeWidth={0.4} />
        ))}
        {Array.from({ length: lineasH }, (_, i) => (
          <Line key={`h${i}`} x1={dx} y1={(i + 1) * escala} x2={dx + w} y2={(i + 1) * escala} stroke="#ededed" strokeWidth={0.4} />
        ))}

        {zonas.map(a => (
          <G key={a.id}>
            <Rect
              x={dx + a.x * escala} y={a.y * escala}
              width={a.anchoM * escala} height={a.largoM * escala}
              fill={a.color} fillOpacity={0.1} stroke={a.color} strokeWidth={1.1}
            />
          </G>
        ))}

        {subzonas.map(a => (
          <G key={a.id}>
            <Rect
              x={dx + a.x * escala} y={a.y * escala}
              width={a.anchoM * escala} height={a.largoM * escala}
              fill={a.color} fillOpacity={0.16} stroke={a.color} strokeWidth={0.6} strokeDasharray="2.5 1.8"
            />
          </G>
        ))}

        {piezas.map(p => (
          <Rect
            key={p.id}
            x={dx + p.x * escala} y={p.y * escala}
            width={Math.max(1.5, p.anchoM * escala)} height={Math.max(1.5, p.largoM * escala)}
            fill={p.colgado ? "#dfe5f2" : "#e4e4e4"}
            stroke={p.colgado ? "#6b7fae" : "#9a9a9a"}
            strokeWidth={0.5}
            strokeDasharray={p.colgado ? "1.6 1.1" : undefined}
          />
        ))}

        {/* Los rótulos van al final: tienen que quedar encima de las piezas. */}
        {subzonas.map(a => <Rotulo key={`r${a.id}`} a={a} maximo={6.5} invertido={false} />)}
        {zonas.map(a => <Rotulo key={`r${a.id}`} a={a} maximo={8} invertido />)}

        <Text x={dx + w / 2} y={h + 10} fill="#9a9a9a" textAnchor="middle" style={{ fontSize: 7 }}>
          P Ú B L I C O
        </Text>
      </G>
    </Svg>
  );
}

function FilaEquipoPDF({ e, thumb }: { e: FilaEquipo; thumb?: string }) {
  return (
    <View style={s.tr} wrap={false}>
      <View style={{ width: COL.img }}>{thumb ? <Image src={thumb} style={s.thumb} /> : null}</View>
      <Text style={[s.tdFuerte, { width: COL.cant }]}>{e.cantidad}</Text>
      <View style={{ width: COL.equipo, paddingRight: 5 }}>
        <Text style={s.tdFuerte}>{e.nombre}</Text>
        {e.colgado ? <Text style={s.tdTenue}>volado</Text> : null}
      </View>
      <Text style={[s.td, { width: COL.descripcion, paddingRight: 5 }]}>{e.descripcion}</Text>
      <Text style={[s.td, { width: COL.config, paddingRight: 5 }]}>{e.configuracion}</Text>
      <Text style={[s.td, { width: COL.montaje, paddingRight: 5 }]}>{e.montaje || "—"}</Text>
      <Text style={[s.td, { width: COL.peso }]}>{e.pesoKg > 0 ? kg(e.pesoKg) : "—"}</Text>
      <Text style={[s.td, { width: COL.carga }]}>{e.carga || "sin dato"}</Text>
      <Text style={[e.notas ? s.nota : s.tdTenue, { width: COL.notas }]}>{e.notas || "—"}</Text>
    </View>
  );
}

function Zona({ z, thumbs }: { z: ZonaDoc; thumbs: Record<string, string> }) {
  const amperes = [
    z.carga.amperaje110 > 0 ? `${z.carga.amperaje110.toFixed(1)} A/110V` : null,
    z.carga.amperaje220 > 0 ? `${z.carga.amperaje220.toFixed(1)} A/220V` : null,
  ].filter(Boolean).join(" · ");

  return (
    <View>
      <View style={s.zonaHd} wrap={false}>
        <View style={[s.zonaChip, { backgroundColor: z.color }]} />
        <Text style={s.zonaNombre}>{z.etiqueta.toUpperCase()}</Text>
        <Text style={s.zonaMeta}>
          {z.unidades} uds · {kg(z.pesoKg)}{amperes ? ` · ${amperes}` : ""}
        </Text>
      </View>

      {z.subzonas.map(sub => (
        <View key={sub.clave}>
          <View style={s.subHd} wrap={false}>
            <View style={[s.subChip, { backgroundColor: sub.color }]} />
            <Text style={s.subNombre}>
              {sub.etiqueta}
              {sub.disciplina ? <Text style={s.subMeta}>{`  ${sub.disciplina.toLowerCase()}`}</Text> : null}
            </Text>
            <Text style={s.subMeta}>{sub.unidades} uds · {kg(sub.pesoKg)}</Text>
          </View>
          {sub.equipos.map(e => (
            <FilaEquipoPDF key={e.clave} e={e} thumb={e.imagenUrl ? thumbs[e.imagenUrl] : undefined} />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function LayoutProduccionPDF({
  doc,
  logo,
  thumbs = {},
}: {
  doc: DocumentoLayout;
  logo: string | null;
  thumbs?: Record<string, string>;
}) {
  const { totales, plano } = doc;
  const leyenda = [
    ...doc.zonas.map(z => ({ color: z.color, texto: z.etiqueta })),
    ...doc.zonas.flatMap(z => z.subzonas.map(sub => ({ color: sub.color, texto: `${z.etiqueta} · ${sub.etiqueta}` }))),
  ].slice(0, 24);

  return (
    <Document title={`Layout de producción · ${doc.proyecto.numero} · ${doc.escenario.nombre}`}>
      {/* ── Plano ── */}
      <Page size="LETTER" orientation="landscape" style={s.page}>
        <View style={s.hero}>
          <View>
            <Text style={s.heroTag}>LAYOUT DE PRODUCCIÓN</Text>
            <Text style={s.heroTitulo}>{doc.escenario.nombre}</Text>
            <Text style={s.heroSub}>{doc.proyecto.nombre}</Text>
          </View>
          {logo ? <Image src={logo} style={s.heroLogo} /> : null}
        </View>

        <View style={s.banda}>
          <View style={s.bandaItem}>
            <Text style={s.bandaLabel}>PROYECTO</Text>
            <Text style={s.bandaVal}>{doc.proyecto.numero}</Text>
          </View>
          <View style={s.bandaItem}>
            <Text style={s.bandaLabel}>CLIENTE</Text>
            <Text style={s.bandaVal}>{doc.proyecto.cliente}</Text>
          </View>
          <View style={s.bandaItem}>
            <Text style={s.bandaLabel}>FECHA DEL EVENTO</Text>
            <Text style={s.bandaVal}>{fmtFecha(doc.proyecto.fechaEvento)}</Text>
          </View>
          <View style={s.bandaItem}>
            <Text style={s.bandaLabel}>LUGAR</Text>
            <Text style={s.bandaVal}>{doc.proyecto.lugar || "Por confirmar"}</Text>
          </View>
          <View style={s.bandaItem}>
            <Text style={s.bandaLabel}>ÁREA</Text>
            <Text style={s.bandaVal}>{plano.anchoM} × {plano.largoM} m</Text>
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <Plano doc={doc} ancho={UTIL} alto={300} />
        </View>

        {leyenda.length > 0 && (
          <View style={s.leyenda}>
            {leyenda.map((l, i) => (
              <View key={`${l.texto}-${i}`} style={s.leyItem}>
                <View style={[s.leyChip, { backgroundColor: l.color }]} />
                <Text style={s.leyTxt}>{l.texto}</Text>
              </View>
            ))}
          </View>
        )}

        <Pie doc={doc} />
      </Page>

      {/* ── Resumen y lista de instalación ── */}
      <Page size="LETTER" orientation="landscape" style={s.page}>
        <Text style={s.secTitulo}>RESUMEN DE LA INSTALACIÓN</Text>
        <View style={s.kpis}>
          <View style={s.kpi}>
            <Text style={s.kpiVal}>{totales.unidades}</Text>
            <Text style={s.kpiLabel}>UNIDADES</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiVal}>{totales.modelos}</Text>
            <Text style={s.kpiLabel}>MODELOS</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiVal}>{totales.zonas}</Text>
            <Text style={s.kpiLabel}>ZONAS</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiVal}>{totales.configuraciones}</Text>
            <Text style={s.kpiLabel}>CONFIGURACIONES</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiVal}>{kg(totales.pesoKg)}</Text>
            <Text style={s.kpiLabel}>PESO TOTAL</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiVal}>{kg(totales.pesoColgadoKg)}</Text>
            <Text style={s.kpiLabel}>PESO VOLADO</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiVal}>{totales.carga.amperaje110.toFixed(1)} A</Text>
            <Text style={s.kpiLabel}>A 110 V</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiVal}>{totales.carga.amperaje220.toFixed(1)} A</Text>
            <Text style={s.kpiLabel}>A 220 V</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiVal}>{Math.round(totales.carga.watts).toLocaleString("es-MX")}</Text>
            <Text style={s.kpiLabel}>WATTS</Text>
          </View>
        </View>

        {doc.porDisciplina.length > 0 && (
          <>
            <Text style={s.secTitulo}>REPARTO POR DISCIPLINA</Text>
            <View style={s.thead}>
              <Text style={[s.th, { flex: 1 }]}>DISCIPLINA</Text>
              <Text style={[s.th, { width: 70 }]}>UNIDADES</Text>
              <Text style={[s.th, { width: 70 }]}>PESO</Text>
              <Text style={[s.th, { width: 80 }]}>110 V</Text>
              <Text style={[s.th, { width: 80 }]}>220 V</Text>
              <Text style={[s.th, { width: 90 }]}>SIN AMPERAJE</Text>
            </View>
            {doc.porDisciplina.map(d => (
              <View key={d.disciplina} style={s.tr} wrap={false}>
                <Text style={[s.tdFuerte, { flex: 1 }]}>{d.disciplina}</Text>
                <Text style={[s.td, { width: 70 }]}>{d.unidades}</Text>
                <Text style={[s.td, { width: 70 }]}>{kg(d.pesoKg)}</Text>
                <Text style={[s.td, { width: 80 }]}>{d.carga.amperaje110.toFixed(1)} A</Text>
                <Text style={[s.td, { width: 80 }]}>{d.carga.amperaje220.toFixed(1)} A</Text>
                <Text style={[s.td, { width: 90 }]}>{d.carga.sinDato > 0 ? `${d.carga.sinDato} uds` : "—"}</Text>
              </View>
            ))}
          </>
        )}

        {totales.carga.sinDato > 0 && (
          <View style={s.avisoCaja}>
            <Text style={s.avisoTxt}>
              {totales.carga.sinDato} unidades no tienen amperaje capturado en el catálogo, así que el
              consumo de arriba es un piso, no el total. Captúralo antes de dimensionar la acometida.
            </Text>
          </View>
        )}

        {doc.escenario.notas ? (
          <>
            <Text style={s.secTitulo}>NOTAS DEL ESCENARIO</Text>
            <Text style={[s.td, { lineHeight: 1.5 }]}>{doc.escenario.notas}</Text>
          </>
        ) : null}

        <Pie doc={doc} />
      </Page>

      {/* ── Lista completa ── */}
      <Page size="LETTER" orientation="landscape" style={s.page}>
        <Text style={s.secTitulo}>LISTA DE INSTALACIÓN POR ZONA Y CONFIGURACIÓN</Text>

        <View style={s.thead} fixed>
          <Text style={[s.th, { width: COL.img }]} />
          <Text style={[s.th, { width: COL.cant }]}>CANT</Text>
          <Text style={[s.th, { width: COL.equipo }]}>EQUIPO</Text>
          <Text style={[s.th, { width: COL.descripcion }]}>DESCRIPCIÓN</Text>
          <Text style={[s.th, { width: COL.config }]}>CONFIGURACIÓN</Text>
          <Text style={[s.th, { width: COL.montaje }]}>MONTAJE</Text>
          <Text style={[s.th, { width: COL.peso }]}>PESO</Text>
          <Text style={[s.th, { width: COL.carga }]}>CARGA</Text>
          <Text style={[s.th, { width: COL.notas }]}>NOTAS</Text>
        </View>

        {doc.zonas.map(z => (
          <Zona key={z.clave} z={z} thumbs={thumbs} />
        ))}

        <Text style={[s.tdTenue, { marginTop: 12 }]}>
          Documento final generado el {nowStr()}. Cualquier cambio posterior en el rider obliga a
          descargarlo de nuevo.
        </Text>

        <Pie doc={doc} />
      </Page>
    </Document>
  );
}
