/**
 * FichaCliente.tsx — Confirmación de servicio para el cliente
 * Diseño: limpio, cálido, profesional. Pensado para enviar por WhatsApp o correo.
 */
import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { C, base, fmtFecha, fmtHora, duracionEntreHoras, nowStr, agruparPorCategoria, EquipoFlat } from "./PdfShared";

const s = StyleSheet.create({
  heroTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.negro, textAlign: "center", marginBottom: 4 },
  heroSub: { fontSize: 9, color: C.grisMedio, textAlign: "center", marginBottom: 2 },
  heroPry: { fontSize: 8, color: C.grisClaro, textAlign: "center", marginBottom: 18 },
  divider: { borderBottomWidth: 0.5, borderBottomColor: C.grisLinea, borderBottomStyle: "solid", marginBottom: 14 },
  sectionTitle: {
    fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 1.2,
    color: C.dorado, textTransform: "uppercase",
    marginBottom: 8, paddingBottom: 4,
    borderBottomWidth: 0.5, borderBottomColor: "#e9dcc8", borderBottomStyle: "solid",
  },
  dataRow: { flexDirection: "row", marginBottom: 5, alignItems: "flex-start" },
  dataLabel: { width: 110, fontSize: 8, color: C.grisMedio, flexShrink: 0 },
  dataValue: { flex: 1, fontSize: 9, color: C.negro, fontFamily: "Helvetica-Bold" },
  dataValueNorm: { flex: 1, fontSize: 8.5, color: C.negro },
  horaChip: {
    backgroundColor: C.grisFondo, borderWidth: 0.5, borderColor: C.grisLinea, borderStyle: "solid",
    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4,
    marginRight: 8, alignItems: "center",
  },
  horaChipLabel: { fontSize: 6, color: C.grisClaro, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  horaChipVal: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.negro },
  equiTable: { width: "100%", borderWidth: 0.5, borderColor: C.grisLinea, borderStyle: "solid", borderRadius: 3 },
  equiHd: { flexDirection: "row", backgroundColor: "#fafafa", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: C.grisLinea, borderBottomStyle: "solid" },
  equiRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 0.3, borderBottomColor: "#f0f0f0", borderBottomStyle: "solid" },
  equiRowLast: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8 },
  equiCat: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, backgroundColor: "#f7f7f7", borderBottomWidth: 0.5, borderBottomColor: C.grisLinea, borderBottomStyle: "solid" },
  equiCatText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.grisMedio, textTransform: "uppercase", letterSpacing: 0.8 },
  badge: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.dorado, backgroundColor: "#fdf6e8", borderWidth: 0.5, borderColor: "#e9dcc8", borderStyle: "solid", paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 2, marginLeft: 4 },
  coordBox: { backgroundColor: "#fafaf8", borderWidth: 0.5, borderColor: "#e9dcc8", borderStyle: "solid", borderRadius: 4, padding: 12 },
  coordName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 3 },
  coordSub: { fontSize: 8, color: C.grisMedio, lineHeight: 1.5 },
  instrucBox: { backgroundColor: "#f8f8f8", borderLeftWidth: 2, borderLeftColor: C.dorado, borderLeftStyle: "solid", padding: 10, borderRadius: 2 },
  instrucText: { fontSize: 8.5, color: C.negro, lineHeight: 1.6 },
  footerBox: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 0.5, borderTopColor: C.grisLinea, borderTopStyle: "solid", paddingTop: 6 },
  footerText: { fontSize: 7, color: C.grisClaro },
});

export interface FichaClienteData {
  nombre: string;
  numeroProyecto: string;
  tipoEvento: string;
  tipoServicio: string | null;
  zona: string;
  fechaEvento: string | null;
  horaInicioEvento: string | null;
  horaFinEvento: string | null;
  horaInicio: string | null;
  horaDesmontaje: string | null;
  lugarEvento: string | null;
  direccionVenue: string | null;
  linkMaps: string | null;
  indicacionesCliente: string | null;
  encargadoNombre: string | null;
  cliente: { nombre: string; empresa: string | null };
  equipos: EquipoFlat[];
  logoSrc: string | null;
}

const TIPO_EVENTO: Record<string, string> = {
  MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", OTRO: "Otro",
};
const TIPO_SERVICIO: Record<string, string> = {
  PRODUCCION_TECNICA: "Producción técnica integral",
  RENTA: "Renta de equipo",
  DIRECCION_TECNICA: "Dirección técnica",
};
const ZONA: Record<string, string> = {
  LOCAL: "Local (Querétaro)", BAJIO: "Bajío", NACIONAL: "Nacional",
};

export function FichaCliente({ data }: { data: FichaClienteData }) {
  const fechaStr = fmtFecha(data.fechaEvento);
  const horaIni = fmtHora(data.horaInicio || data.horaInicioEvento);
  const horaFin = fmtHora(data.horaDesmontaje || data.horaFinEvento);
  const duracion = duracionEntreHoras(
    data.horaInicio || data.horaInicioEvento,
    data.horaDesmontaje || data.horaFinEvento
  );

  const equiposPropios = data.equipos.filter(e => e.tipo === "PROPIO");
  const equiposExternos = data.equipos.filter(e => e.tipo === "EXTERNO");
  const gruposPropios = agruparPorCategoria(equiposPropios);
  const gruposExternos = agruparPorCategoria(equiposExternos);
  const tieneEquipos = data.equipos.length > 0;

  return (
    <Document title={`Confirmación ${data.numeroProyecto}`} author="Mainstage Pro">
      <Page size="LETTER" style={base.page}>

        {/* HEADER */}
        <View style={base.headerWrap}>
          {data.logoSrc && <Image src={data.logoSrc} style={base.logo} />}
          <Text style={s.heroTitle}>{data.nombre}</Text>
          <Text style={s.heroSub}>Confirmación de servicio</Text>
          <Text style={s.heroPry}>{data.numeroProyecto} · Generado el {nowStr()}</Text>
        </View>
        <View style={s.divider} />

        {/* TU EVENTO */}
        {(fechaStr || data.lugarEvento || horaIni) && (
          <View style={base.section}>
            <Text style={s.sectionTitle}>Tu evento</Text>

            {data.tipoEvento && (
              <View style={s.dataRow}>
                <Text style={s.dataLabel}>Tipo de evento</Text>
                <Text style={s.dataValue}>{TIPO_EVENTO[data.tipoEvento] ?? data.tipoEvento}</Text>
              </View>
            )}
            {data.tipoServicio && (
              <View style={s.dataRow}>
                <Text style={s.dataLabel}>Servicio contratado</Text>
                <Text style={s.dataValue}>{TIPO_SERVICIO[data.tipoServicio] ?? data.tipoServicio}</Text>
              </View>
            )}
            {fechaStr && (
              <View style={s.dataRow}>
                <Text style={s.dataLabel}>Fecha</Text>
                <Text style={s.dataValue}>{fechaStr}</Text>
              </View>
            )}

            {/* Chips de horario */}
            {(horaIni || horaFin) && (
              <View style={{ flexDirection: "row", marginTop: 8, marginBottom: 8 }}>
                {horaIni && (
                  <View style={s.horaChip}>
                    <Text style={s.horaChipLabel}>Inicio</Text>
                    <Text style={s.horaChipVal}>{horaIni}</Text>
                  </View>
                )}
                {horaFin && (
                  <View style={s.horaChip}>
                    <Text style={s.horaChipLabel}>Fin est.</Text>
                    <Text style={s.horaChipVal}>{horaFin}</Text>
                  </View>
                )}
                {duracion && (
                  <View style={s.horaChip}>
                    <Text style={s.horaChipLabel}>Duración</Text>
                    <Text style={s.horaChipVal}>{duracion}</Text>
                  </View>
                )}
              </View>
            )}

            {data.lugarEvento && (
              <View style={s.dataRow}>
                <Text style={s.dataLabel}>Venue</Text>
                <Text style={s.dataValue}>{data.lugarEvento}</Text>
              </View>
            )}
            {data.direccionVenue && (
              <View style={s.dataRow}>
                <Text style={s.dataLabel}>Dirección</Text>
                <Text style={s.dataValueNorm}>{data.direccionVenue}</Text>
              </View>
            )}
            {data.linkMaps && (
              <View style={s.dataRow}>
                <Text style={s.dataLabel}>Google Maps</Text>
                <Text style={[s.dataValueNorm, { color: "#1a73e8" }]}>{data.linkMaps}</Text>
              </View>
            )}
          </View>
        )}

        {/* EQUIPO CONFIRMADO */}
        {tieneEquipos && (
          <View style={base.section}>
            <Text style={s.sectionTitle}>Equipo confirmado para tu evento</Text>
            <View style={s.equiTable}>
              <View style={s.equiHd}>
                <Text style={[base.tableCellHd, { width: 36 }]}>Cant.</Text>
                <Text style={[base.tableCellHd, { flex: 1 }]}>Descripción</Text>
                <Text style={[base.tableCellHd, { width: 100 }]}>Categoría</Text>
              </View>
              {/* Equipos propios por categoría */}
              {Array.from(gruposPropios.entries()).map(([cat, items]) => (
                <React.Fragment key={cat}>
                  <View style={s.equiCat}>
                    <Text style={s.equiCatText}>{cat}</Text>
                  </View>
                  {items.map((e, i) => (
                    <View key={i} style={s.equiRow}>
                      <Text style={[base.tableCell, { width: 36 }]}>{e.cantidad}</Text>
                      <Text style={[base.tableCell, { flex: 1 }]}>{e.descripcion}{e.marca ? ` — ${e.marca}` : ""}</Text>
                      <Text style={[base.tableCell, { width: 100, color: C.grisMedio }]}>{cat}</Text>
                    </View>
                  ))}
                </React.Fragment>
              ))}
              {/* Equipos externos (subrentas) */}
              {equiposExternos.length > 0 && (
                <>
                  <View style={s.equiCat}>
                    <Text style={s.equiCatText}>Subrenta confirmada</Text>
                  </View>
                  {Array.from(gruposExternos.entries()).flatMap(([, items]) =>
                    items.map((e, i) => (
                      <View key={`ext-${i}`} style={s.equiRow}>
                        <Text style={[base.tableCell, { width: 36 }]}>{e.cantidad}</Text>
                        <Text style={[base.tableCell, { flex: 1 }]}>{e.descripcion}</Text>
                        <Text style={[base.tableCell, { width: 100, color: C.grisMedio }]}>{e.proveedor ?? "Proveedor ext."}</Text>
                      </View>
                    ))
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {/* TU COORDINADOR */}
        {data.encargadoNombre && (
          <View style={base.section}>
            <Text style={s.sectionTitle}>Tu coordinador Mainstage Pro</Text>
            <View style={s.coordBox}>
              <Text style={s.coordName}>{data.encargadoNombre}</Text>
              <Text style={s.coordSub}>
                Esta es tu persona de contacto antes y durante el evento.{"\n"}
                Ante cualquier duda o cambio de último momento, comunícate directamente con {data.encargadoNombre.split(" ")[0]}.
              </Text>
            </View>
          </View>
        )}

        {/* LO QUE NECESITAMOS DE TU PARTE */}
        {data.indicacionesCliente && (
          <View style={base.section}>
            <Text style={s.sectionTitle}>Lo que necesitamos de tu parte</Text>
            <View style={s.instrucBox}>
              <Text style={s.instrucText}>{data.indicacionesCliente}</Text>
            </View>
          </View>
        )}

        {/* FOOTER */}
        <View style={s.footerBox} fixed>
          <Text style={s.footerText}>Mainstage Pro · mainstagepro.mx</Text>
          <Text style={s.footerText}>{data.numeroProyecto}</Text>
        </View>

      </Page>
    </Document>
  );
}
