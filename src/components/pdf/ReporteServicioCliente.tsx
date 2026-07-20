/**
 * ReporteServicioCliente.tsx — Reporte de servicio para el cliente
 * Documenta la correcta ejecución del servicio con evidencia fotográfica.
 * Diseño Mainstage: fondo blanco, hero negro, acento dorado, logo y footer.
 */
import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { C, base, nowStr, MAPS } from "./PdfShared";

const CONTACTO_TELEFONO = "446 143 2565";
const FIRMA_NOMBRE = "Jose Mauricio Alejandro Hernández Vázquez Mellado";
const FIRMA_REPRESENTACION = "En representación de Escenario Principal Producciones S.A. de C.V.";
const FIRMA_MARCA = "Mainstage Pro";

const INTRO =
  "El presente reporte documenta la ejecución del servicio contratado, el cual se llevó a cabo conforme a lo " +
  "planeado y acordado previamente. Nuestro equipo técnico realizó el montaje, la operación y el desmontaje del " +
  "equipo audiovisual cumpliendo con los estándares de calidad, los tiempos establecidos y las especificaciones " +
  "técnicas requeridas para el correcto desarrollo del evento. A continuación se presenta la evidencia fotográfica " +
  "de la ejecución del servicio.";

const CIERRE =
  "Agradecemos la confianza depositada en nosotros para la realización de su evento. Esperamos que el servicio haya " +
  "sido de su total agrado. Para cualquier comentario, queja o sugerencia, quedamos a sus órdenes en el número " +
  `${CONTACTO_TELEFONO}, dirección general de la empresa.`;

const s = StyleSheet.create({
  intro: { fontSize: 9, color: C.negro, lineHeight: 1.6, marginBottom: 4 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 2 },
  chip: {
    backgroundColor: C.grisFondo, borderWidth: 0.5, borderColor: C.grisLinea,
    borderStyle: "solid", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4,
    marginRight: 6, marginBottom: 6,
  },
  chipTxt: { fontSize: 8, color: C.negro },
  chipCant: { fontFamily: "Helvetica-Bold", color: C.dorado },
  fotoGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  fotoCell: { width: "50%", padding: 4 },
  foto: {
    width: "100%", height: 150, objectFit: "cover",
    borderRadius: 4, borderWidth: 0.5, borderColor: C.grisLinea, borderStyle: "solid",
  },
  cierreBox: {
    backgroundColor: C.doradoClaro, borderWidth: 0.5, borderColor: C.doradoBorde,
    borderStyle: "solid", borderRadius: 4, padding: 12, marginTop: 4,
  },
  cierreTxt: { fontSize: 9, color: C.negro, lineHeight: 1.6 },
  firma: { marginTop: 22, alignItems: "center" },
  firmaLinea: { width: 220, borderBottomWidth: 0.8, borderBottomColor: C.negro, borderBottomStyle: "solid", marginBottom: 6 },
  firmaNombre: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 2 },
  firmaRep: { fontSize: 7.5, color: C.grisMedio, marginBottom: 1 },
  firmaMarca: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.dorado, letterSpacing: 0.6 },
});

export interface ReporteServicioClienteData {
  numeroProyecto: string;
  nombre: string;
  cliente: { nombre: string; empresa: string | null };
  fechasTexto: string;
  lugarEvento: string | null;
  direccionVenue: string | null;
  tipoServicio: string | null;
  equipos: { nombre: string; cantidad: number }[];
  fotos: string[];
  logoSrc: string | null;
  logoSrcDark: string | null;
}

export function ReporteServicioCliente({ data }: { data: ReporteServicioClienteData }) {
  return (
    <Document title={`Reporte de servicio ${data.numeroProyecto}`} author="Mainstage Pro">
      <Page size="LETTER" style={base.page}>

        {/* HERO HEADER NEGRO */}
        <View style={base.hero}>
          <View style={base.heroLeft}>
            <Text style={base.heroTag}>Reporte de servicio · {data.numeroProyecto}</Text>
            <Text style={base.heroNombre}>{data.nombre}</Text>
            <Text style={base.heroMeta}>
              {data.cliente.nombre}{data.cliente.empresa ? ` · ${data.cliente.empresa}` : ""}
            </Text>
          </View>
          {data.logoSrc && <Image src={data.logoSrc} style={base.heroLogo} />}
        </View>

        {/* BANDA DORADA con datos rápidos */}
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

          {/* INFORMACIÓN DEL SERVICIO */}
          <View style={base.section}>
            <Text style={base.secTitle}>Información del servicio</Text>
            <View style={base.kvGrid}>
              <View style={base.kvCell}>
                <Text style={base.kvLabel}>Cliente</Text>
                <Text style={base.kvValBold}>
                  {data.cliente.nombre}{data.cliente.empresa ? ` · ${data.cliente.empresa}` : ""}
                </Text>
              </View>
              {data.tipoServicio && (
                <View style={base.kvCell}>
                  <Text style={base.kvLabel}>Servicio</Text>
                  <Text style={base.kvVal}>{MAPS.TIPO_SERVICIO_MAP[data.tipoServicio] ?? data.tipoServicio}</Text>
                </View>
              )}
              {data.fechasTexto && (
                <View style={base.kvCell}>
                  <Text style={base.kvLabel}>Fecha(s) del evento</Text>
                  <Text style={base.kvValBold}>{data.fechasTexto}</Text>
                </View>
              )}
              {data.lugarEvento && (
                <View style={base.kvCell}>
                  <Text style={base.kvLabel}>Lugar del evento</Text>
                  <Text style={base.kvVal}>{data.lugarEvento}</Text>
                </View>
              )}
              {data.direccionVenue && (
                <View style={base.kvCellFull}>
                  <Text style={base.kvLabel}>Dirección</Text>
                  <Text style={base.kvVal}>{data.direccionVenue}</Text>
                </View>
              )}
            </View>
          </View>

          {/* EQUIPO UTILIZADO */}
          {data.equipos.length > 0 && (
            <View style={base.section}>
              <Text style={base.secTitle}>Equipo que se llevó al evento</Text>
              <View style={s.chipsWrap}>
                {data.equipos.map((e, i) => (
                  <View key={i} style={s.chip}>
                    <Text style={s.chipTxt}>
                      {e.cantidad > 1 && <Text style={s.chipCant}>{e.cantidad}× </Text>}{e.nombre}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* EJECUCIÓN DEL SERVICIO (texto genérico) */}
          <View style={base.section}>
            <Text style={base.secTitle}>Ejecución del servicio</Text>
            <View style={base.textBox}>
              <Text style={base.textBoxContent}>{INTRO}</Text>
            </View>
          </View>

          {/* EVIDENCIA FOTOGRÁFICA */}
          {data.fotos.length > 0 && (
            <View style={base.section}>
              <Text style={base.secTitle}>Evidencia fotográfica del evento</Text>
              <View style={s.fotoGrid}>
                {data.fotos.map((url, i) => (
                  <View key={i} style={s.fotoCell} wrap={false}>
                    <Image src={url} style={s.foto} />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* CIERRE Y AGRADECIMIENTO */}
          <View style={base.section} wrap={false}>
            <Text style={base.secTitle}>Agradecimiento</Text>
            <View style={s.cierreBox}>
              <Text style={s.cierreTxt}>{CIERRE}</Text>
            </View>

            <View style={s.firma}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaNombre}>{FIRMA_NOMBRE}</Text>
              <Text style={s.firmaRep}>{FIRMA_REPRESENTACION}</Text>
              <Text style={s.firmaMarca}>{FIRMA_MARCA}</Text>
            </View>
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
