/**
 * FichaCliente.tsx — Confirmación de servicio para el cliente
 * Diseño: cálido, profesional, limpio. Fondo blanco, hero negro, acento dorado.
 */
import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { C, base, fmtFecha, fmtHora, duracion, nowStr, agruparPorCategoria, EquipoFlat, MAPS } from "./PdfShared";

const s = StyleSheet.create({
  // Chips de horario
  chipsRow: { flexDirection: "row", gap: 0, marginBottom: 10, marginTop: 4 },
  chip: {
    backgroundColor: C.grisFondo, borderWidth: 0.5, borderColor: C.grisLinea,
    borderStyle: "solid", borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6,
    alignItems: "center", marginRight: 8,
  },
  chipLabel: { fontSize: 6, color: C.grisClaro, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  chipVal: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.negro },
  // Caja del coordinador
  coordBox: {
    backgroundColor: C.grisFondo, borderRadius: 4,
    padding: 12, flexDirection: "row", alignItems: "center",
    borderWidth: 0.5, borderColor: C.grisLinea, borderStyle: "solid",
  },
  coordDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.dorado,
    alignItems: "center", justifyContent: "center", marginRight: 10, flexShrink: 0,
  },
  coordDotTxt: { fontSize: 13, color: C.negro, fontFamily: "Helvetica-Bold" },
  coordNombre: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 2 },
  coordSub: { fontSize: 7.5, color: C.grisMedio, lineHeight: 1.4 },
});

export interface FichaClienteData {
  nombre: string; numeroProyecto: string; estado: string;
  tipoEvento: string; tipoServicio: string | null; zona: string;
  fechaEvento: string | null;
  horaInicioEvento: string | null; horaFinEvento: string | null;
  horaInicio: string | null; horaDesmontaje: string | null;
  lugarEvento: string | null; direccionVenue: string | null; linkMaps: string | null;
  indicacionesCliente: string | null;
  encargadoNombre: string | null;
  cliente: { nombre: string; empresa: string | null };
  equipos: EquipoFlat[];
  logoSrc: string | null;
  logoSrcDark: string | null;
}

export function FichaCliente({ data }: { data: FichaClienteData }) {
  const fechaStr = fmtFecha(data.fechaEvento);
  const horaIni = fmtHora(data.horaInicio || data.horaInicioEvento);
  const horaFin = fmtHora(data.horaDesmontaje || data.horaFinEvento);
  const dur = duracion(data.horaInicio || data.horaInicioEvento, data.horaDesmontaje || data.horaFinEvento);
  const propios = data.equipos.filter(e => e.tipo === "PROPIO");
  const externos = data.equipos.filter(e => e.tipo === "EXTERNO");
  const gruposPropios = agruparPorCategoria(propios);
  const gruposExternos = agruparPorCategoria(externos);
  const inicial = data.encargadoNombre ? data.encargadoNombre.charAt(0).toUpperCase() : "M";

  return (
    <Document title={`Confirmación ${data.numeroProyecto}`} author="Mainstage Pro">
      <Page size="LETTER" style={base.page}>

        {/* HERO HEADER NEGRO */}
        <View style={base.hero}>
          <View style={base.heroLeft}>
            <Text style={base.heroTag}>Confirmación de servicio · {data.numeroProyecto}</Text>
            <Text style={base.heroNombre}>{data.nombre}</Text>
            <Text style={base.heroMeta}>
              {data.cliente.nombre}{data.cliente.empresa ? ` · ${data.cliente.empresa}` : ""}
              {" · "}{MAPS.TIPO_EVENTO_MAP[data.tipoEvento] ?? data.tipoEvento}
            </Text>
          </View>
          {data.logoSrc && <Image src={data.logoSrc} style={base.heroLogo} />}
        </View>

        {/* BANDA DORADA con datos rápidos */}
        {(fechaStr || data.lugarEvento || horaIni) && (
          <View style={base.banda}>
            {fechaStr && (
              <View style={base.bandaItem}>
                <Text style={base.bandaLabel}>Fecha</Text>
                <Text style={base.bandaVal}>{fechaStr.split(",")[0]?.trim()}</Text>
              </View>
            )}
            {data.lugarEvento && (
              <>
                <View style={base.bandaDivider} />
                <View style={base.bandaItem}>
                  <Text style={base.bandaLabel}>Venue</Text>
                  <Text style={base.bandaVal}>{data.lugarEvento}</Text>
                </View>
              </>
            )}
            {horaIni && (
              <>
                <View style={base.bandaDivider} />
                <View style={base.bandaItem}>
                  <Text style={base.bandaLabel}>Inicio</Text>
                  <Text style={base.bandaVal}>{horaIni}</Text>
                </View>
              </>
            )}
            {horaFin && (
              <>
                <View style={base.bandaDivider} />
                <View style={base.bandaItem}>
                  <Text style={base.bandaLabel}>Fin est.</Text>
                  <Text style={base.bandaVal}>{horaFin}</Text>
                </View>
              </>
            )}
          </View>
        )}

        <View style={base.body}>

          {/* TU EVENTO */}
          <View style={base.section}>
            <Text style={base.secTitle}>Tu evento</Text>
            <View style={base.kvGrid}>
              {data.tipoEvento && (
                <View style={base.kvCell}>
                  <Text style={base.kvLabel}>Tipo de evento</Text>
                  <Text style={base.kvVal}>{MAPS.TIPO_EVENTO_MAP[data.tipoEvento] ?? data.tipoEvento}</Text>
                </View>
              )}
              {data.tipoServicio && (
                <View style={base.kvCell}>
                  <Text style={base.kvLabel}>Servicio contratado</Text>
                  <Text style={base.kvValBold}>{MAPS.TIPO_SERVICIO_MAP[data.tipoServicio] ?? data.tipoServicio}</Text>
                </View>
              )}
              {fechaStr && (
                <View style={base.kvCellFull}>
                  <Text style={base.kvLabel}>Fecha</Text>
                  <Text style={base.kvValBold}>{fechaStr}</Text>
                </View>
              )}
            </View>

            {/* Chips de horario */}
            {(horaIni || horaFin || dur) && (
              <View style={s.chipsRow}>
                {horaIni && (
                  <View style={s.chip}>
                    <Text style={s.chipLabel}>Hora de inicio</Text>
                    <Text style={s.chipVal}>{horaIni}</Text>
                  </View>
                )}
                {horaFin && (
                  <View style={s.chip}>
                    <Text style={s.chipLabel}>Fin estimado</Text>
                    <Text style={s.chipVal}>{horaFin}</Text>
                  </View>
                )}
                {dur && (
                  <View style={s.chip}>
                    <Text style={s.chipLabel}>Duración</Text>
                    <Text style={s.chipVal}>{dur}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={base.kvGrid}>
              {data.lugarEvento && (
                <View style={base.kvCellFull}>
                  <Text style={base.kvLabel}>Venue</Text>
                  <Text style={base.kvValBold}>{data.lugarEvento}</Text>
                </View>
              )}
              {data.direccionVenue && (
                <View style={base.kvCellFull}>
                  <Text style={base.kvLabel}>Dirección</Text>
                  <Text style={base.kvVal}>{data.direccionVenue}</Text>
                </View>
              )}
              {data.linkMaps && (
                <View style={base.kvCellFull}>
                  <Text style={base.kvLabel}>Google Maps</Text>
                  <Text style={base.kvValLink}>{data.linkMaps}</Text>
                </View>
              )}
              {data.zona && (
                <View style={base.kvCell}>
                  <Text style={base.kvLabel}>Zona de servicio</Text>
                  <Text style={base.kvVal}>{MAPS.ZONA_MAP[data.zona] ?? data.zona}</Text>
                </View>
              )}
            </View>
          </View>

          {/* EQUIPO CONFIRMADO */}
          {data.equipos.length > 0 && (
            <View style={base.section}>
              <Text style={base.secTitle}>Equipo confirmado para tu evento</Text>
              <View style={base.table}>
                <View style={base.tableHd}>
                  <Text style={[base.thTxt, { width: 36 }]}>Cant.</Text>
                  <Text style={[base.thTxt, { flex: 1 }]}>Descripción</Text>
                  <Text style={[base.thTxt, { width: 100 }]}>Categoría</Text>
                </View>
                {Array.from(gruposPropios.entries()).map(([cat, items]) => (
                  <React.Fragment key={cat}>
                    <View style={base.tableRowCat}>
                      <Text style={base.catTxt}>{cat}</Text>
                    </View>
                    {items.map((e, i) => (
                      <View key={i} style={base.tableRow} wrap={false}>
                        <Text style={[base.tdTxt, { width: 36 }]}>{e.cantidad}</Text>
                        <Text style={[base.tdTxt, { flex: 1 }]}>{e.descripcion}{e.marca ? ` — ${e.marca}` : ""}</Text>
                        <Text style={[base.tdMuted, { width: 100 }]}>{cat}</Text>
                      </View>
                    ))}
                  </React.Fragment>
                ))}
                {externos.length > 0 && (
                  <>
                    <View style={base.tableRowCat}>
                      <Text style={base.catTxt}>Subrenta confirmada</Text>
                    </View>
                    {Array.from(gruposExternos.values()).flat().map((e, i) => (
                      <View key={`ext-${i}`} style={base.tableRow}>
                        <Text style={[base.tdTxt, { width: 36 }]}>{e.cantidad}</Text>
                        <Text style={[base.tdTxt, { flex: 1 }]}>{e.descripcion}</Text>
                        <Text style={[base.tdMuted, { width: 100 }]}>{e.proveedor ?? "Proveedor externo"}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            </View>
          )}

          {/* TU COORDINADOR */}
          {data.encargadoNombre && (
            <View style={base.section}>
              <Text style={base.secTitle}>Tu coordinador Mainstage Pro</Text>
              <View style={s.coordBox}>
                <View style={s.coordDot}>
                  <Text style={s.coordDotTxt}>{inicial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.coordNombre}>{data.encargadoNombre}</Text>
                  <Text style={s.coordSub}>
                    Es tu persona de contacto directo antes y durante el evento.
                    Ante cualquier duda o cambio, comunícate con {data.encargadoNombre.split(" ")[0]}.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* LO QUE NECESITAMOS DE TU PARTE */}
          {data.indicacionesCliente && (
            <View style={base.section}>
              <Text style={base.secTitle}>Lo que necesitamos de tu parte</Text>
              <View style={base.textBox}>
                <Text style={base.textBoxContent}>{data.indicacionesCliente}</Text>
              </View>
            </View>
          )}

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
