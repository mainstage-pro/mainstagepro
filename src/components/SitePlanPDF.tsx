/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import {
  Circle, Document, Ellipse, G, Image, Line, Page, Path, Polygon, Polyline, Rect, StyleSheet, Svg,
  Text, View,
} from "@react-pdf/renderer";
import { C } from "@/components/pdf/PdfShared";
import {
  type Capa, type ObjetoPlano, anclaRotulo, areaPoligono, colorDe, medidaDe, puntaDeFlecha, radioDe,
  RELLENO_DEFAULT, TAMANO_PIN_DEFAULT, TAMANO_TEXTO_DEFAULT,
} from "@/lib/site-plan";
import { iconoDe } from "@/lib/site-plan-iconos";
import { primitivasDeIcono } from "@/lib/site-plan-icono-pdf";

const MARGEN = 30;
const ANCHO_HOJA = 792;
const ALTO_HOJA = 612;
const COL_LEYENDA = 170;
const PLANO_ANCHO = ANCHO_HOJA - MARGEN * 2 - COL_LEYENDA - 14;
const PLANO_ALTO = ALTO_HOJA - 150;

export type DatosSitePlanPDF = {
  nombre: string;
  subtitulo: string;
  fecha: string;
  fondoBase64: string | null;
  fondoAncho: number;
  fondoAlto: number;
  escala: number | null;
  capas: Capa[];
  objetos: ObjetoPlano[];
  notas: string | null;
  logoBase64: string | null;
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: C.blanco, fontSize: 8, color: C.negro, paddingBottom: 26 },
  hero: {
    backgroundColor: C.negro, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    paddingHorizontal: MARGEN, paddingTop: 18, paddingBottom: 14,
  },
  heroTag: { fontSize: 6.5, color: "#888", textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 4 },
  heroNombre: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.blanco },
  heroMeta: { fontSize: 7.5, color: "#aaa", marginTop: 3 },
  heroLogo: { width: 88, height: 26, objectFit: "contain" },

  cuerpo: { flexDirection: "row", paddingHorizontal: MARGEN, paddingTop: 12, gap: 14 },
  marco: { borderWidth: 0.7, borderColor: C.grisLinea, backgroundColor: "#111" },

  leyenda: { width: COL_LEYENDA },
  capaTitulo: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, marginBottom: 3 },
  capaSwatch: { width: 6, height: 6, borderRadius: 1 },
  capaNombre: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.negro },
  item: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 1.2 },
  itemTexto: { fontSize: 7, color: C.grisMedio, flex: 1 },
  itemMedida: { fontSize: 6.5, color: C.grisClaro },

  pie: {
    position: "absolute", bottom: 12, left: MARGEN, right: MARGEN,
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 0.7, borderTopColor: C.grisLinea, paddingTop: 6,
  },
  pieTexto: { fontSize: 6.5, color: C.grisClaro },
  notas: { marginTop: 10, borderTopWidth: 0.7, borderTopColor: C.grisLinea, paddingTop: 6 },
  notasTitulo: { fontSize: 6.5, color: C.grisClaro, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 },
  notasTexto: { fontSize: 7, color: C.grisMedio, lineHeight: 1.4 },
  sinEscala: { fontSize: 6.5, color: C.grisClaro, marginTop: 8 },
});

/** Los `<path>`, `<circle>`… del icono, ya traducidos a primitivas de react-pdf. */
function IconoPDF({ clave, x, y, lado, color }: { clave: string; x: number; y: number; lado: number; color: string }) {
  const primitivas = primitivasDeIcono(clave);
  if (primitivas.length === 0) return null;
  const k = lado / 24;

  return (
    <G transform={`translate(${x}, ${y}) scale(${k})`}>
      {primitivas.map(({ tag, attrs }, i) => {
        const comun = { stroke: color, strokeWidth: 2.2, fill: "none" as const };
        switch (tag) {
          case "path":
            return <Path key={i} {...comun} d={attrs.d} strokeLinecap="round" strokeLinejoin="round" />;
          case "circle":
            return <Circle key={i} {...comun} cx={Number(attrs.cx)} cy={Number(attrs.cy)} r={Number(attrs.r)} />;
          case "ellipse":
            return <Ellipse key={i} {...comun} cx={Number(attrs.cx)} cy={Number(attrs.cy)} rx={Number(attrs.rx)} ry={Number(attrs.ry)} />;
          case "line":
            return <Line key={i} {...comun} x1={Number(attrs.x1)} y1={Number(attrs.y1)} x2={Number(attrs.x2)} y2={Number(attrs.y2)} strokeLinecap="round" />;
          case "rect":
            return (
              <Rect key={i} {...comun} x={Number(attrs.x)} y={Number(attrs.y)} width={Number(attrs.width)} height={Number(attrs.height)} rx={attrs.rx ? Number(attrs.rx) : undefined} />
            );
          case "polyline":
            return <Polyline key={i} {...comun} points={attrs.points} strokeLinejoin="round" />;
          case "polygon":
            return <Polygon key={i} {...comun} points={attrs.points} strokeLinejoin="round" />;
          default:
            return null;
        }
      })}
    </G>
  );
}

function puntosDe(o: ObjetoPlano) {
  return o.puntos.map(p => `${p.x},${p.y}`).join(" ");
}

export default function SitePlanPDF({ d }: { d: DatosSitePlanPDF }) {
  // La hoja fija el marco; el dibujo se mete dentro conservando su proporción.
  const k = Math.min(PLANO_ANCHO / d.fondoAncho, PLANO_ALTO / d.fondoAlto);
  const anchoDibujo = d.fondoAncho * k;
  const altoDibujo = d.fondoAlto * k;
  // Un píxel de papel vale esto en píxeles de imagen: con eso los contornos y los
  // rótulos salen del mismo grosor óptico que en pantalla.
  const unidad = 1 / k;

  const visibles = d.objetos.filter(o => !o.oculto && d.capas.find(c => c.id === o.capaId)?.visible !== false);
  const leyenda = d.capas
    .map(capa => ({ capa, items: visibles.filter(o => o.capaId === capa.id && o.etiqueta.trim() && o.tipo !== "TEXTO") }))
    .filter(g => g.items.length > 0);

  const metrosBarra = d.escala ? [100, 50, 25, 10, 5].find(m => m / d.escala! <= d.fondoAncho * 0.3) ?? 5 : null;

  return (
    <Document title={d.nombre}>
      <Page size={[ANCHO_HOJA, ALTO_HOJA]} style={s.page}>
        <View style={s.hero}>
          <View>
            <Text style={s.heroTag}>Site plan</Text>
            <Text style={s.heroNombre}>{d.nombre}</Text>
            <Text style={s.heroMeta}>{d.subtitulo}</Text>
          </View>
          {d.logoBase64 ? <Image src={d.logoBase64} style={s.heroLogo} /> : null}
        </View>

        <View style={s.cuerpo}>
          <View style={[s.marco, { width: anchoDibujo, height: altoDibujo }]}>
            {d.fondoBase64 ? (
              <Image src={d.fondoBase64} style={{ position: "absolute", width: anchoDibujo, height: altoDibujo }} />
            ) : null}

            <Svg
              width={anchoDibujo}
              height={altoDibujo}
              viewBox={`0 0 ${d.fondoAncho} ${d.fondoAlto}`}
              style={{ position: "absolute" }}
            >
              {/* Rellenos */}
              {visibles.map(o => {
                const color = colorDe(o, d.capas);
                if (o.tipo === "ZONA") {
                  return <Polygon key={`f${o.id}`} points={puntosDe(o)} fill={color} fillOpacity={o.relleno ?? RELLENO_DEFAULT} />;
                }
                if (o.tipo === "CIRCULO") {
                  return (
                    <Circle key={`f${o.id}`} cx={o.puntos[0].x} cy={o.puntos[0].y} r={radioDe(o.puntos)} fill={color} fillOpacity={o.relleno ?? RELLENO_DEFAULT} />
                  );
                }
                return null;
              })}

              {/* Contornos */}
              {visibles.map(o => {
                const color = colorDe(o, d.capas);
                const borde = 2 * unidad;
                const guion = o.punteado ? `${borde * 4},${borde * 3}` : undefined;
                if (o.tipo === "ZONA") {
                  return <Polygon key={`c${o.id}`} points={puntosDe(o)} fill="none" stroke={color} strokeWidth={borde} strokeDasharray={guion} />;
                }
                if (o.tipo === "CIRCULO") {
                  return <Circle key={`c${o.id}`} cx={o.puntos[0].x} cy={o.puntos[0].y} r={radioDe(o.puntos)} fill="none" stroke={color} strokeWidth={borde} strokeDasharray={guion} />;
                }
                if (o.tipo === "TRAZO") {
                  const g = o.grosor ?? 6;
                  const punta = o.flecha ? puntaDeFlecha(o) : null;
                  return (
                    <G key={`c${o.id}`}>
                      <Polyline
                        points={puntosDe(o)}
                        fill="none"
                        stroke={color}
                        strokeWidth={g}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={o.punteado ? `${g * 2},${g * 1.6}` : undefined}
                      />
                      {punta ? <Polygon points={punta.map(p => `${p.x},${p.y}`).join(" ")} fill={color} /> : null}
                    </G>
                  );
                }
                return null;
              })}

              {/* Pines */}
              {visibles
                .filter(o => o.tipo === "PIN")
                .map(o => {
                  const color = colorDe(o, d.capas);
                  const diam = o.tamano ?? TAMANO_PIN_DEFAULT;
                  const lado = diam * 0.56;
                  const { x, y } = o.puntos[0];
                  return (
                    <G key={`p${o.id}`}>
                      <Circle cx={x} cy={y} r={diam / 2} fill={color} stroke="#0b0b0b" strokeWidth={diam * 0.05} />
                      {o.icono ? <IconoPDF clave={o.icono} x={x - lado / 2} y={y - lado / 2} lado={lado} color="#0b0b0b" /> : null}
                    </G>
                  );
                })}

              {/* Rótulos */}
              {visibles.map(o => {
                const color = colorDe(o, d.capas);
                if (o.tipo === "TEXTO") {
                  const fs = o.tamano ?? TAMANO_TEXTO_DEFAULT;
                  return (
                    <Text key={`t${o.id}`} x={o.puntos[0].x} y={o.puntos[0].y} fill={color} style={{ fontSize: fs, fontFamily: "Helvetica-Bold" }}>
                      {o.etiqueta}
                    </Text>
                  );
                }
                if (!o.etiqueta.trim()) return null;

                const medida = medidaDe(o, d.escala);
                const ancla = anclaRotulo(o);
                const fs = 11 * unidad;
                const lineas = medida ? [o.etiqueta, medida] : [o.etiqueta];
                const ancho = Math.max(...lineas.map(l => l.length)) * fs * 0.55 + fs;
                const alto = fs * 1.3 * lineas.length + fs * 0.5;
                const cy = o.tipo === "PIN" ? ancla.y + (o.tamano ?? TAMANO_PIN_DEFAULT) / 2 + alto / 2 + fs * 0.4 : ancla.y;

                return (
                  <G key={`t${o.id}`}>
                    <Rect
                      x={ancla.x - ancho / 2}
                      y={cy - alto / 2}
                      width={ancho}
                      height={alto}
                      rx={fs * 0.4}
                      fill="#0b0b0b"
                      fillOpacity={0.88}
                      stroke={color}
                      strokeWidth={unidad}
                    />
                    {lineas.map((linea, i) => (
                      <Text
                        key={i}
                        x={ancla.x}
                        y={cy - alto / 2 + fs * 1.25 * (i + 1)}
                        textAnchor="middle"
                        fill={i === 0 ? "#ffffff" : color}
                        style={{ fontSize: i === 0 ? fs : fs * 0.85, fontFamily: i === 0 ? "Helvetica-Bold" : "Helvetica" }}
                      >
                        {linea}
                      </Text>
                    ))}
                  </G>
                );
              })}

              {/* Barra de escala */}
              {metrosBarra && d.escala ? (
                <G transform={`translate(${16 * unidad}, ${d.fondoAlto - 22 * unidad})`}>
                  <Rect x={0} y={0} width={metrosBarra / d.escala} height={6 * unidad} fill="#ffffff" stroke="#0b0b0b" strokeWidth={unidad} />
                  <Rect x={0} y={0} width={metrosBarra / d.escala / 2} height={6 * unidad} fill="#0b0b0b" />
                  <Text x={metrosBarra / d.escala + 8 * unidad} y={6 * unidad} fill="#ffffff" style={{ fontSize: 10 * unidad, fontFamily: "Helvetica-Bold" }}>
                    {`${metrosBarra} m`}
                  </Text>
                </G>
              ) : null}
            </Svg>
          </View>

          <View style={s.leyenda}>
            {leyenda.map(({ capa, items }) => (
              <View key={capa.id} wrap={false}>
                <View style={s.capaTitulo}>
                  <View style={[s.capaSwatch, { backgroundColor: capa.color }]} />
                  <Text style={s.capaNombre}>{capa.nombre}</Text>
                </View>
                {items.map(o => {
                  const color = colorDe(o, d.capas);
                  const medida = medidaDe(o, d.escala);
                  const def = iconoDe(o.icono);
                  return (
                    <View key={o.id} style={s.item}>
                      {def ? (
                        <Svg width={8} height={8} viewBox="0 0 24 24">
                          <IconoPDF clave={o.icono!} x={0} y={0} lado={24} color={color} />
                        </Svg>
                      ) : (
                        <View style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: color }} />
                      )}
                      <Text style={s.itemTexto}>{o.etiqueta}</Text>
                      {medida ? <Text style={s.itemMedida}>{medida}</Text> : null}
                    </View>
                  );
                })}
              </View>
            ))}

            {d.notas ? (
              <View style={s.notas}>
                <Text style={s.notasTitulo}>Notas</Text>
                <Text style={s.notasTexto}>{d.notas}</Text>
              </View>
            ) : null}

            {!d.escala ? (
              <Text style={s.sinEscala}>
                Plano sin escala calibrada. Las superficies y distancias no son medibles sobre este documento.
              </Text>
            ) : null}
          </View>
        </View>

        <View style={s.pie} fixed>
          <Text style={s.pieTexto}>
            {d.nombre} · {d.subtitulo}
          </Text>
          <Text style={s.pieTexto}>
            {d.escala ? `Escala 1 px = ${(d.escala * 100).toFixed(1)} cm · ` : ""}
            Generado {d.fecha} · Mainstage Pro
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/** Superficie total trazada, para el encabezado de la ficha operativa. */
export function superficieTotal(objetos: ObjetoPlano[], escala: number | null): number {
  if (!escala) return 0;
  return objetos
    .filter(o => o.tipo === "ZONA")
    .reduce((s, o) => s + areaPoligono(o.puntos) * escala * escala, 0);
}
