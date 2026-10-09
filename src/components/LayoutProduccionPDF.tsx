/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import { Document, G, Line, Page, Rect, StyleSheet, Svg, Text, View, Image } from "@react-pdf/renderer";
import { C, fmtFecha, nowStr } from "@/components/pdf/PdfShared";
import type { DocumentoLayout, FilaEquipo, ZonaDoc } from "@/lib/layout-produccion";
import { rotuloEnLineas, type Area } from "@/lib/layout-escenario";
import { DISCIPLINA_LABELS } from "@/lib/disciplinaColors";

/** Carta horizontal: el plano y la tabla ancha piden apaisado. */
const MARGEN = 36;
const UTIL = 792 - MARGEN * 2;

/**
 * El plano de un evento casi siempre es más alto que ancho —el público abajo, el
 * escenario arriba—, así que al centrarlo sobran dos franjas a los costados. Ahí
 * van el resumen, la carga eléctrica y la leyenda: la hoja se lee de un vistazo
 * sin pasar de página.
 */
const COL_LATERAL = 166;
const GAP_COL = 15;
const PLANO_ANCHO = UTIL - COL_LATERAL * 2 - GAP_COL * 2;
const PLANO_ALTO = 398;

/**
 * Cuánta nota cabe debajo de la leyenda, en caracteres. La franja es de alto fijo y
 * cada zona le come un renglón, así que el presupuesto baja con el número de zonas;
 * si queda muy poco, la nota se va completa a la última página en vez de partirse.
 */
function presupuestoNotas(zonas: number): number {
  const libre = 620 - Math.max(0, zonas - 6) * 65;
  return libre < 140 ? 0 : libre;
}

const CREMA = "#F7F5F0";
const LINEA = "#e4e0d7";

/** Anchos de la lista de instalación. Suman UTIL exacto para que no haya deriva. */
const COL = {
  img: 38,
  cant: 26,
  equipo: 128,
  descripcion: 142,
  config: 72,
  montaje: 72,
  peso: 38,
  carga: 56,
  notas: UTIL - (38 + 26 + 128 + 142 + 72 + 72 + 38 + 56),
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    paddingTop: 0,
    paddingBottom: 34,
    paddingHorizontal: 0,
    backgroundColor: C.blanco,
    fontSize: 7.5,
    color: C.negro,
  },
  cuerpo: { paddingHorizontal: MARGEN, paddingTop: 14 },

  // ── Encabezado de marca ──
  hero: {
    backgroundColor: C.negro,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: MARGEN,
    paddingTop: 20,
    paddingBottom: 16,
  },
  heroTag: { fontSize: 6.5, color: C.dorado, letterSpacing: 2.4 },
  heroTitulo: { fontSize: 17, fontFamily: "Helvetica-Bold", color: C.blanco, marginTop: 5 },
  heroSub: { fontSize: 8, color: "#8a8a8a", marginTop: 4 },
  heroDer: { alignItems: "flex-end" },
  heroLogo: { height: 24, objectFit: "contain" },
  heroNum: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.blanco, marginTop: 8 },
  barraDorada: { height: 3, backgroundColor: C.dorado },

  banda: {
    flexDirection: "row",
    backgroundColor: CREMA,
    paddingVertical: 8,
    paddingHorizontal: MARGEN,
  },
  bandaItem: { flex: 1, paddingRight: 10 },
  bandaLabel: { fontSize: 5.6, fontFamily: "Helvetica-Bold", color: "#9a917f", letterSpacing: 1.2 },
  bandaVal: { fontSize: 8.5, color: C.negro, marginTop: 2 },

  // ── Franjas laterales ──
  lateral: { width: COL_LATERAL },
  bloqueTit: {
    fontSize: 6.2,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.4,
    color: C.negro,
    borderBottomWidth: 1.2,
    borderBottomColor: C.dorado,
    paddingBottom: 3.5,
    marginBottom: 6,
    marginTop: 15,
  },
  statGrid: { flexDirection: "row", flexWrap: "wrap" },
  stat: { width: "50%", paddingBottom: 7, paddingRight: 6 },
  statVal: { fontSize: 15, fontFamily: "Helvetica-Bold", color: C.negro },
  statLbl: { fontSize: 5.4, color: C.grisClaro, letterSpacing: 0.9, marginTop: 2 },

  fila: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2.8,
    borderBottomWidth: 0.4,
    borderBottomColor: LINEA,
  },
  filaLbl: { fontSize: 6.8, color: C.grisMedio },
  filaVal: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.negro },

  leyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3.2,
    borderBottomWidth: 0.4,
    borderBottomColor: LINEA,
  },
  leyChip: { width: 8, height: 8, marginRight: 6 },
  leyNom: { flex: 1, fontSize: 7.2, fontFamily: "Helvetica-Bold", color: C.negro },
  leyMeta: { fontSize: 5.8, color: C.grisClaro },

  notaCaja: {
    backgroundColor: CREMA,
    borderLeftWidth: 2,
    borderLeftColor: C.dorado,
    paddingVertical: 6,
    paddingHorizontal: 7,
  },
  notaTxt: { fontSize: 6.6, color: "#4a4a4a", lineHeight: 1.5 },

  planoPie: { fontSize: 5.8, color: C.grisClaro, letterSpacing: 0.8, textAlign: "center", marginTop: 6 },

  // ── Lista de instalación ──
  secTitulo: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.blanco,
    backgroundColor: C.negro,
    letterSpacing: 1.4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    marginBottom: 9,
  },
  thead: {
    flexDirection: "row",
    backgroundColor: C.negro,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  th: { fontSize: 5.8, fontFamily: "Helvetica-Bold", color: C.blanco, letterSpacing: 0.9 },

  zonaHd: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
    paddingVertical: 6.5,
    paddingHorizontal: 9,
    backgroundColor: CREMA,
    borderLeftWidth: 4,
  },
  zonaNombre: { flex: 1, fontSize: 12, fontFamily: "Helvetica-Bold", letterSpacing: 1.2, color: C.negro },
  zonaMeta: { fontSize: 6.6, color: C.grisMedio },

  subHd: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    paddingVertical: 3.5,
    paddingLeft: 10,
    borderLeftWidth: 2.5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#d8d8d8",
  },
  subNombre: { flex: 1, fontSize: 8.6, fontFamily: "Helvetica-Bold", letterSpacing: 0.6, color: C.negro },
  subDisc: { fontSize: 6.2, fontFamily: "Helvetica", color: C.grisClaro, letterSpacing: 0 },
  subMeta: { fontSize: 6.2, color: C.grisMedio },

  tr: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.4,
    borderBottomColor: "#f1efea",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  td: { fontSize: 7, color: "#3a3a3a" },
  tdFuerte: { fontSize: 7.6, fontFamily: "Helvetica-Bold", color: C.negro },
  tdTenue: { fontSize: 6.4, color: C.grisClaro },
  thumb: { width: 30, height: 30, objectFit: "contain" },
  nota: { fontSize: 6.5, color: C.amarillo },

  avisoCaja: {
    borderLeftWidth: 2,
    borderLeftColor: C.doradoBorde,
    backgroundColor: C.doradoClaro,
    paddingVertical: 6,
    paddingHorizontal: 7,
    marginTop: 7,
  },
  avisoTxt: { fontSize: 6.4, color: "#6b5a2e", lineHeight: 1.45 },

  pie: {
    position: "absolute",
    bottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: LINEA,
    paddingTop: 5,
  },
  pieTxt: { fontSize: 5.8, color: C.grisClaro },
});

function kg(v: number) {
  return `${v.toFixed(v >= 100 ? 0 : 1)} kg`;
}

function disciplina(t: string) {
  return DISCIPLINA_LABELS[t] ?? t.charAt(0) + t.slice(1).toLowerCase();
}

/** `sangrado` para las páginas cuyo contenido llega al borde: ahí el pie pone su propio margen. */
function Pie({ doc, sangrado }: { doc: DocumentoLayout; sangrado?: boolean }) {
  const lados = sangrado ? MARGEN : 0;
  return (
    <View style={[s.pie, { left: lados, right: lados }]} fixed>
      <Text style={s.pieTxt}>
        {doc.proyecto.numero} · {doc.proyecto.nombre} · Layout de producción · {doc.escenario.nombre}
      </Text>
      <Text style={s.pieTxt} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function BloqueTit({ children, primero }: { children: string; primero?: boolean }) {
  return <Text style={[s.bloqueTit, primero ? { marginTop: 0 } : {}]}>{children}</Text>;
}

function Fila({ label, valor, acento }: { label: string; valor: string; acento?: boolean }) {
  return (
    <View style={s.fila}>
      <Text style={[s.filaLbl, { flex: 1 }]}>{label}</Text>
      <Text style={[s.filaVal, acento ? { color: C.dorado } : {}]}>{valor}</Text>
    </View>
  );
}

/**
 * El renderer de react-pdf sí dibuja imágenes dentro del `<Svg>`, pero sus tipos no
 * declaran las props de SVG (`x`, `y`, `transform`) porque `Image` es la de flujo.
 */
const ImagenSvg = Image as unknown as React.ComponentType<{
  src: string;
  x: number;
  y: number;
  transform?: string;
  style: { width: number; height: number };
}>;

/**
 * Centra la foto dentro de la huella sin deformarla. El SVG de react-pdf ignora
 * `preserveAspectRatio`, así que el encaje se calcula aquí leyendo el tamaño real
 * del PNG (cabecera IHDR). Si no se puede leer, la foto llena la huella.
 */
function encajar(dataUrl: string, x: number, y: number, w: number, h: number) {
  const coma = dataUrl.indexOf(",");
  const cab = coma < 0 ? Buffer.alloc(0) : Buffer.from(dataUrl.slice(coma + 1, coma + 65), "base64");
  if (cab.length < 24 || cab.toString("ascii", 12, 16) !== "IHDR") return { x, y, w, h };
  const px = cab.readUInt32BE(16);
  const py = cab.readUInt32BE(20);
  if (!px || !py) return { x, y, w, h };
  const escala = Math.min(w / px, h / py);
  const ancho = px * escala;
  const alto = py * escala;
  return { x: x + (w - ancho) / 2, y: y + (h - alto) / 2, w: ancho, h: alto };
}

/**
 * El plano cenital, redibujado en vectores para impresión. No es una captura de
 * pantalla: se arma con las mismas áreas y piezas del editor pero en claro, que
 * es como se lee en sitio con una hoja en la mano.
 *
 * Un color por zona: la configuración de montaje hereda el tono de su zona en vez
 * de traer el de su disciplina. Con quince tonos distintos el plano se volvía un
 * mosaico y la leyenda dejaba de servir.
 */
function Plano({
  doc,
  ancho,
  alto,
  colorDeZona,
  thumbs,
}: {
  doc: DocumentoLayout;
  ancho: number;
  alto: number;
  colorDeZona: (a: Area) => string;
  thumbs: Record<string, string>;
}) {
  const { anchoM, largoM, areas, piezas } = doc.plano;
  const escala = Math.min(ancho / anchoM, alto / largoM);
  const w = anchoM * escala;
  const h = largoM * escala;
  const dx = (ancho - w) / 2;
  const dy = (alto - h) / 2;

  const lineasV = Math.floor(anchoM);
  const lineasH = Math.floor(largoM);
  const zonas = areas.filter(a => a.clase === "ZONA");
  const subzonas = areas.filter(a => a.clase === "SUBZONA");

  /**
   * Rótulo en pastilla: el mismo criterio del editor y de la vista pública. El
   * texto suelto sobre las piezas se volvía ilegible en cuanto dos áreas se tocan.
   */
  function Rotulo({ a, maximo, mayusculas }: { a: Area; maximo: number; mayusculas: boolean }) {
    const texto = mayusculas ? a.etiqueta.toUpperCase() : a.etiqueta;
    const anchoCaja = a.anchoM * escala;
    const r = rotuloEnLineas(texto, anchoCaja - 5, maximo);
    const pad = r.fs * 0.5;
    const x = dx + a.x * escala + 1.5;
    const y = dy + a.y * escala + 1.5;
    return (
      <G>
        <Rect
          x={x} y={y}
          width={Math.min(anchoCaja - 3, r.ancho + pad * 2)}
          height={r.lineas.length * r.fs * 1.2 + pad * 1.4}
          fill={colorDeZona(a)}
        />
        {r.lineas.map((l, i) => (
          <Text
            key={i}
            x={x + pad}
            y={y + pad * 0.7 + r.fs * (0.92 + i * 1.2)}
            fill="#ffffff"
            style={{ fontSize: r.fs }}
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
        <Rect x={dx} y={dy} width={w} height={h} fill="#fcfbf9" stroke="#cdc8bd" strokeWidth={0.9} />

        {Array.from({ length: lineasV }, (_, i) => (
          <Line key={`v${i}`} x1={dx + (i + 1) * escala} y1={dy} x2={dx + (i + 1) * escala} y2={dy + h} stroke="#ebe8e1" strokeWidth={0.4} />
        ))}
        {Array.from({ length: lineasH }, (_, i) => (
          <Line key={`h${i}`} x1={dx} y1={dy + (i + 1) * escala} x2={dx + w} y2={dy + (i + 1) * escala} stroke="#ebe8e1" strokeWidth={0.4} />
        ))}

        {zonas.map(a => (
          <Rect
            key={a.id}
            x={dx + a.x * escala} y={dy + a.y * escala}
            width={a.anchoM * escala} height={a.largoM * escala}
            fill={colorDeZona(a)} fillOpacity={0.14} stroke={colorDeZona(a)} strokeWidth={1.1}
          />
        ))}

        {subzonas.map(a => (
          <Rect
            key={a.id}
            x={dx + a.x * escala} y={dy + a.y * escala}
            width={a.anchoM * escala} height={a.largoM * escala}
            fill={colorDeZona(a)} fillOpacity={0.22} stroke={colorDeZona(a)} strokeWidth={0.55} strokeDasharray="2.5 1.8"
          />
        ))}

        {piezas.map(p => {
          const x = dx + p.x * escala;
          const y = dy + p.y * escala;
          const w = Math.max(1.5, p.anchoM * escala);
          const h = Math.max(1.5, p.largoM * escala);
          // La rotación de react-pdf dentro del SVG es la estándar siempre que se le
          // pase el centro; sin él gira alrededor del origen del plano.
          const giro = p.rot ? `rotate(${p.rot}, ${x + w / 2}, ${y + h / 2})` : undefined;
          const foto = p.imagenUrl ? thumbs[p.imagenUrl] : undefined;
          if (foto) {
            const caja = encajar(foto, x, y, w, h);
            return <ImagenSvg key={p.id} src={foto} x={caja.x} y={caja.y} style={{ width: caja.w, height: caja.h }} transform={giro} />;
          }
          return (
            <Rect
              key={p.id}
              x={x} y={y} width={w} height={h} transform={giro}
              fill={p.colgado ? "#e6e9f1" : "#e9e7e2"}
              stroke={p.colgado ? "#7b88a6" : "#a8a49c"}
              strokeWidth={0.5}
              strokeDasharray={p.colgado ? "1.6 1.1" : undefined}
            />
          );
        })}

        {/* Los rótulos van al final: tienen que quedar encima de las piezas. */}
        {subzonas.map(a => <Rotulo key={`r${a.id}`} a={a} maximo={5.5} mayusculas={false} />)}
        {zonas.map(a => <Rotulo key={`r${a.id}`} a={a} maximo={6.5} mayusculas />)}

        <Text x={dx + w / 2} y={dy + h + 11} fill="#9a9a9a" textAnchor="middle" style={{ fontSize: 7 }}>
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
      <View style={{ width: COL.equipo, paddingRight: 6 }}>
        <Text style={s.tdFuerte}>{e.nombre}</Text>
        {e.colgado ? <Text style={s.tdTenue}>volado</Text> : null}
      </View>
      <Text style={[s.td, { width: COL.descripcion, paddingRight: 6 }]}>{e.descripcion}</Text>
      <Text style={[s.td, { width: COL.config, paddingRight: 6 }]}>{e.configuracion}</Text>
      <Text style={[s.td, { width: COL.montaje, paddingRight: 6 }]}>{e.montaje || "—"}</Text>
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
      {/* Un título solo al pie de la página no dice nada: arrastra consigo su primer renglón. */}
      <View style={[s.zonaHd, { borderLeftColor: z.color }]} wrap={false} minPresenceAhead={72}>
        <Text style={s.zonaNombre}>{z.etiqueta.toUpperCase()}</Text>
        <Text style={s.zonaMeta}>
          {z.unidades} uds · {kg(z.pesoKg)}{amperes ? ` · ${amperes}` : ""}
        </Text>
      </View>

      {z.subzonas.map(sub => (
        <View key={sub.clave}>
          <View style={[s.subHd, { borderLeftColor: z.color }]} wrap={false} minPresenceAhead={52}>
            <Text style={s.subNombre}>
              {sub.etiqueta.toUpperCase()}
              {sub.disciplina ? <Text style={s.subDisc}>{`   ${disciplina(sub.disciplina)}`}</Text> : null}
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

  // Un color por zona del evento. Las áreas dibujadas a mano no corresponden a
  // ninguna zona del rider y se quedan con el tono que les puso quien las dibujó.
  const colorPorZonaId = new Map(doc.zonas.map(z => [z.zonaId, z.color]));
  const colorDeZona = (a: Area) => colorPorZonaId.get(a.zona) ?? a.color;

  const notas = doc.escenario.notas?.trim() ?? "";
  const cupo = presupuestoNotas(doc.zonas.length);
  const notasPortada = notas.length <= cupo ? notas : "";
  const notasAlFinal = notas && !notasPortada;

  return (
    <Document title={`Layout de producción · ${doc.proyecto.numero} · ${doc.escenario.nombre}`}>
      {/* ── Plano, con el resumen en las franjas laterales ── */}
      <Page size="LETTER" orientation="landscape" style={s.page}>
        <View style={s.hero}>
          <View>
            <Text style={s.heroTag}>LAYOUT DE PRODUCCIÓN</Text>
            <Text style={s.heroTitulo}>{doc.escenario.nombre}</Text>
            <Text style={s.heroSub}>{doc.proyecto.nombre}</Text>
          </View>
          <View style={s.heroDer}>
            {logo ? <Image src={logo} style={s.heroLogo} /> : null}
            <Text style={s.heroNum}>{doc.proyecto.numero}</Text>
          </View>
        </View>
        <View style={s.barraDorada} />

        <View style={s.banda}>
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
            <Text style={s.bandaLabel}>ÁREA DEL MONTAJE</Text>
            <Text style={s.bandaVal}>{plano.anchoM} × {plano.largoM} m</Text>
          </View>
        </View>

        <View style={[s.cuerpo, { flexDirection: "row" }]}>
          {/* Franja izquierda: qué se instala y cuánto pesa. */}
          <View style={s.lateral}>
            <BloqueTit primero>RESUMEN DEL MONTAJE</BloqueTit>
            <View style={s.statGrid}>
              <View style={s.stat}>
                <Text style={s.statVal}>{totales.unidades}</Text>
                <Text style={s.statLbl}>UNIDADES</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statVal}>{totales.modelos}</Text>
                <Text style={s.statLbl}>MODELOS</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statVal}>{totales.zonas}</Text>
                <Text style={s.statLbl}>ZONAS</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statVal}>{totales.configuraciones}</Text>
                <Text style={s.statLbl}>CONFIGURACIONES</Text>
              </View>
            </View>

            <BloqueTit>PESO</BloqueTit>
            <Fila label="Total" valor={kg(totales.pesoKg)} />
            <Fila label="Volado" valor={kg(totales.pesoColgadoKg)} />
            <Fila label="En piso" valor={kg(totales.pesoPisoKg)} />

            {doc.porDisciplina.length > 0 && (
              <>
                <BloqueTit>REPARTO POR DISCIPLINA</BloqueTit>
                {doc.porDisciplina.map(d => (
                  <View key={d.disciplina} style={s.fila}>
                    <Text style={[s.filaLbl, { flex: 1 }]}>{disciplina(d.disciplina)}</Text>
                    <Text style={[s.filaVal, { width: 30, textAlign: "right" }]}>{d.unidades}</Text>
                    <Text style={[s.filaLbl, { width: 46, textAlign: "right" }]}>{kg(d.pesoKg)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* Centro: el plano. */}
          <View style={{ width: PLANO_ANCHO, marginHorizontal: GAP_COL }}>
            <Plano doc={doc} ancho={PLANO_ANCHO} alto={PLANO_ALTO} colorDeZona={colorDeZona} thumbs={thumbs} />
            <Text style={s.planoPie}>
              VISTA CENITAL · CUADRÍCULA DE 1 m · {plano.anchoM} × {plano.largoM} m
            </Text>
          </View>

          {/* Franja derecha: qué consume y dónde va cada cosa. */}
          <View style={s.lateral}>
            <BloqueTit primero>CARGA ELÉCTRICA</BloqueTit>
            <Fila label="110 V" valor={`${totales.carga.amperaje110.toFixed(1)} A`} acento />
            <Fila label="220 V" valor={`${totales.carga.amperaje220.toFixed(1)} A`} acento />
            <Fila label="Potencia" valor={`${Math.round(totales.carga.watts).toLocaleString("es-MX")} W`} />
            {totales.carga.sinDato > 0 && (
              <View style={s.avisoCaja}>
                <Text style={s.avisoTxt}>
                  {totales.carga.sinDato} unidades sin amperaje en el catálogo: el consumo de arriba es
                  un piso, no el total. Captúralo antes de dimensionar la acometida.
                </Text>
              </View>
            )}

            <BloqueTit>ZONAS DEL PLANO</BloqueTit>
            {doc.zonas.map(z => (
              <View key={z.clave} style={s.leyItem}>
                <View style={[s.leyChip, { backgroundColor: z.color }]} />
                <Text style={s.leyNom}>{z.etiqueta}</Text>
                <Text style={s.leyMeta}>{z.unidades} uds</Text>
              </View>
            ))}

            {notasPortada ? (
              <>
                <BloqueTit>NOTAS DEL ESCENARIO</BloqueTit>
                <View style={s.notaCaja}>
                  <Text style={s.notaTxt}>{notasPortada}</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        <Pie doc={doc} sangrado />
      </Page>

      {/* ── Lista de instalación ── */}
      <Page size="LETTER" orientation="landscape" style={[s.page, { paddingTop: MARGEN, paddingHorizontal: MARGEN }]}>
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

        {notasAlFinal && (
          <>
            <Text style={[s.secTitulo, { marginTop: 16 }]}>NOTAS DEL ESCENARIO</Text>
            <Text style={[s.td, { lineHeight: 1.55 }]}>{notas}</Text>
          </>
        )}

        <Text style={[s.tdTenue, { marginTop: 14 }]}>
          Documento final generado el {nowStr()}. Cualquier cambio posterior en el rider obliga a
          descargarlo de nuevo.
        </Text>

        <Pie doc={doc} />
      </Page>
    </Document>
  );
}
