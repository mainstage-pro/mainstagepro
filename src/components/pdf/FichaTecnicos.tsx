/**
 * FichaTecnicos.tsx — Brief de evento para técnicos
 * Diseño: tipografía grande, máximo contraste, sin info financiera.
 * Pensado para leerse en el teléfono.
 */
import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import {
  C, base, fmtFecha, fmtHora, nowStr,
  agruparPorCategoria, EquipoFlat, TransporteSlot,
} from "./PdfShared";
import { PersonalItem, ProveedorEvento } from "./FichaCoordinador";

const s = StyleSheet.create({
  // Header
  heroWrap: { backgroundColor: C.negro, borderRadius: 6, padding: 16, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroLeft: { flex: 1 },
  heroTag: { fontSize: 7, color: "#888", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 },
  heroNombre: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.blanco, marginBottom: 6, lineHeight: 1.2 },
  heroFecha: { fontSize: 10, color: "#ccc", marginBottom: 2 },
  heroPry: { fontSize: 7.5, color: "#666" },
  // Sección
  secWrap: { marginBottom: 14 },
  secTitle: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.grisMedio, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: C.grisLinea, borderBottomStyle: "solid" },
  // Tabla de horarios (grande)
  horaTable: { width: "100%", borderWidth: 0.5, borderColor: C.grisLinea, borderStyle: "solid", borderRadius: 4, overflow: "hidden" },
  horaRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: C.grisLinea, borderBottomStyle: "solid" },
  horaRowLast: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12 },
  horaIcon: { width: 20, fontSize: 12, marginRight: 10 },
  horaLabel: { width: 140, fontSize: 9, color: C.grisMedio },
  horaVal: { width: 60, fontSize: 14, fontFamily: "Helvetica-Bold", color: C.negro },
  horaRef: { flex: 1, fontSize: 8, color: C.grisMedio },
  // Venue
  venueBox: { backgroundColor: "#f9f9f9", borderWidth: 0.5, borderColor: C.grisLinea, borderStyle: "solid", borderRadius: 4, padding: 10 },
  venueNombre: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 3 },
  venueDirec: { fontSize: 8, color: C.grisMedio, marginBottom: 4 },
  venueMaps: { fontSize: 8, color: "#1a73e8" },
  // Acceso
  accesoBox: { backgroundColor: "#fffbf2", borderLeftWidth: 3, borderLeftColor: C.dorado, borderLeftStyle: "solid", padding: 10, borderRadius: 2 },
  accesoText: { fontSize: 8.5, color: C.negro, lineHeight: 1.6 },
  // Rol box
  rolBox: { backgroundColor: C.negro, borderRadius: 4, padding: 12 },
  rolLabel: { fontSize: 7, color: "#777", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  rolVal: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.blanco, marginBottom: 6 },
  rolCoord: { fontSize: 8, color: "#aaa" },
  // Checklist rider
  catHeader: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.grisMedio, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 8, marginBottom: 4 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 },
  checkBox: { width: 11, height: 11, borderWidth: 0.8, borderColor: C.grisMedio, borderStyle: "solid", marginRight: 8, marginTop: 1, borderRadius: 1, flexShrink: 0 },
  checkText: { flex: 1, fontSize: 9, color: C.negro },
  checkSub: { fontSize: 7.5, color: C.grisClaro },
  // Equipo de trabajo
  equipoRow: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: C.grisLinea, borderBottomStyle: "solid", alignItems: "center" },
  equipoNombre: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold", color: C.negro },
  equipoRol: { flex: 1, fontSize: 8, color: C.grisMedio },
  equipoCel: { width: 90, fontSize: 9, color: C.negro },
  // Contactos
  contactosTable: { width: "100%", borderWidth: 0.5, borderColor: C.grisLinea, borderStyle: "solid", borderRadius: 3 },
  contactoHd: { flexDirection: "row", backgroundColor: C.grisFondo, paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: C.grisLinea, borderBottomStyle: "solid" },
  contactoHdTxt: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.grisMedio },
  contactoRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 0.3, borderBottomColor: "#f0f0f0", borderBottomStyle: "solid", alignItems: "center" },
  contactoRowLast: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, alignItems: "center" },
  contactoTxt: { fontSize: 8.5, color: C.negro },
  contactoMuted: { fontSize: 8, color: C.grisMedio },
  // Notas
  notasBox: { backgroundColor: "#fffbf2", borderLeftWidth: 3, borderLeftColor: "#e0a020", borderLeftStyle: "solid", padding: 10, borderRadius: 2 },
  notasText: { fontSize: 8.5, color: C.negro, lineHeight: 1.6 },
  // Footer
  footer: { position: "absolute", bottom: 18, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 0.5, borderTopColor: C.grisLinea, borderTopStyle: "solid", paddingTop: 5 },
  footerTxt: { fontSize: 6.5, color: C.grisClaro },
});

export interface FichaTecnicosData {
  nombre: string;
  numeroProyecto: string;
  fechaEvento: string | null;
  horaSalidaBodega: string | null;
  puntoSalidaBodega: string | null;
  horaMontaje: string | null;
  horaInicio: string | null;
  horaInicioEvento: string | null;
  horaDesmontaje: string | null;
  horaFinEvento: string | null;
  lugarEvento: string | null;
  direccionVenue: string | null;
  linkMaps: string | null;
  indicacionesAcceso: string | null;
  encargadoNombre: string | null;
  encargadoLugar: string | null;
  encargadoLugarContacto: string | null;
  comentariosFinales: string | null;
  detallesEspecificos: string | null;
  equipos: EquipoFlat[];
  personal: PersonalItem[];
  proveedoresEvento: ProveedorEvento[];
  transportes: TransporteSlot[];
  logoSrc: string | null;
}

export function FichaTecnicos({ data }: { data: FichaTecnicosData }) {
  const fechaStr = fmtFecha(data.fechaEvento);
  const horaSalida = fmtHora(data.horaSalidaBodega);
  const horaMontaje = fmtHora(data.horaMontaje);
  const horaInicio = fmtHora(data.horaInicio || data.horaInicioEvento);
  const horaFin = fmtHora(data.horaDesmontaje || data.horaFinEvento);

  const equiposPropios = data.equipos.filter(e => e.tipo === "PROPIO");
  const equiposExternos = data.equipos.filter(e => e.tipo === "EXTERNO");
  const gruposPropios = agruparPorCategoria(equiposPropios);

  const transConDatos = data.transportes.filter(t => t.horaSalida || t.choferNombre || t.vehiculoNombre);

  // Construir tabla de horarios — solo mostrar filas con hora
  type HoraItem = { icon: string; label: string; hora: string; ref: string };
  const horarios: HoraItem[] = [
    { icon: "🚗", label: "Salida desde bodega", hora: horaSalida, ref: data.puntoSalidaBodega ?? "" },
    { icon: "🔧", label: "Llegada / inicio de montaje", hora: horaMontaje, ref: data.lugarEvento ?? "" },
    { icon: "🎤", label: "Inicio del evento", hora: horaInicio, ref: "En sitio" },
    { icon: "📦", label: "Fin / desmontaje y salida", hora: horaFin, ref: data.lugarEvento ?? "" },
  ].filter(h => h.hora);

  // Rol en el evento (primer técnico asignado con rolEnEvento, o fallback a rolTecnico)
  const primerTecRol = data.personal.find(p => p.rolEnEvento)?.rolEnEvento ?? null;

  return (
    <Document title={`Brief Técnicos ${data.numeroProyecto}`} author="Mainstage Pro">
      <Page size="LETTER" style={[base.page, { paddingTop: 28, paddingBottom: 48 }]}>

        {/* HEADER negro */}
        <View style={s.heroWrap}>
          <View style={s.heroLeft}>
            <Text style={s.heroTag}>Brief de Evento</Text>
            <Text style={s.heroNombre}>{data.nombre}</Text>
            {fechaStr && <Text style={s.heroFecha}>{fechaStr}</Text>}
            <Text style={s.heroPry}>{data.numeroProyecto}</Text>
          </View>
          {data.logoSrc && <Image src={data.logoSrc} style={{ width: 90, height: 26, objectFit: "contain" }} />}
        </View>

        {/* HORARIOS — TU DÍA */}
        {horarios.length > 0 && (
          <View style={s.secWrap}>
            <Text style={s.secTitle}>Horarios — Tu día</Text>
            <View style={s.horaTable}>
              {horarios.map((h, i) => (
                <View key={i} style={i < horarios.length - 1 ? s.horaRow : s.horaRowLast}>
                  <Text style={s.horaIcon}>{h.icon}</Text>
                  <Text style={s.horaLabel}>{h.label}</Text>
                  <Text style={s.horaVal}>{h.hora}</Text>
                  {h.ref ? <Text style={s.horaRef}>{h.ref}</Text> : null}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* DÓNDE */}
        {(data.lugarEvento || data.direccionVenue) && (
          <View style={s.secWrap}>
            <Text style={s.secTitle}>Dónde</Text>
            <View style={s.venueBox}>
              {data.lugarEvento && <Text style={s.venueNombre}>{data.lugarEvento}</Text>}
              {data.direccionVenue && <Text style={s.venueDirec}>{data.direccionVenue}</Text>}
              {data.linkMaps && <Text style={s.venueMaps}>{data.linkMaps}</Text>}
            </View>
          </View>
        )}

        {/* ACCESO AL VENUE */}
        {data.indicacionesAcceso && (
          <View style={s.secWrap}>
            <Text style={s.secTitle}>Acceso al Venue</Text>
            <View style={s.accesoBox}>
              <Text style={s.accesoText}>{data.indicacionesAcceso}</Text>
            </View>
          </View>
        )}

        {/* TRASLADO */}
        {transConDatos.length > 0 && (
          <View style={s.secWrap}>
            <Text style={s.secTitle}>Traslado</Text>
            {transConDatos.map((t, i) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
                <Text style={{ width: 120, fontSize: 9, fontFamily: "Helvetica-Bold", color: C.negro }}>
                  {t.vehiculoNombre ?? t.vehiculoId ?? "Vehículo"}
                </Text>
                <Text style={{ flex: 1, fontSize: 8.5, color: C.grisMedio }}>
                  {t.choferNombre ?? t.choferId}{t.horaSalida ? ` · Sale ${fmtHora(t.horaSalida)}` : ""}{t.comentarios ? ` · ${t.comentarios}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* TU ROL */}
        {(primerTecRol || data.encargadoNombre) && (
          <View style={s.secWrap}>
            <Text style={s.secTitle}>Tu Rol en Este Evento</Text>
            <View style={s.rolBox}>
              {primerTecRol && (
                <>
                  <Text style={s.rolLabel}>Tu rol asignado</Text>
                  <Text style={s.rolVal}>{primerTecRol}</Text>
                </>
              )}
              {data.encargadoNombre && (
                <Text style={s.rolCoord}>Coordinador en sitio: {data.encargadoNombre}</Text>
              )}
            </View>
          </View>
        )}

        {/* RIDER DE CARGA — PROPIOS */}
        {equiposPropios.length > 0 && (
          <View style={s.secWrap}>
            <Text style={s.secTitle}>Rider de Carga — Equipos que llevas</Text>
            {Array.from(gruposPropios.entries()).map(([cat, items]) => (
              <View key={cat}>
                <Text style={s.catHeader}>{cat}</Text>
                {items.map((e, i) => (
                  <View key={i} style={s.checkRow}>
                    <View style={s.checkBox} />
                    <Text style={s.checkText}>
                      {e.cantidad}x {e.descripcion}
                      {e.marca ? <Text style={s.checkSub}> — {e.marca}</Text> : null}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
            {/* Equipos externos como subrenta */}
            {equiposExternos.length > 0 && (
              <View>
                <Text style={s.catHeader}>Subrenta — Confirmar llegada con proveedor</Text>
                {equiposExternos.map((e, i) => (
                  <View key={i} style={s.checkRow}>
                    <View style={s.checkBox} />
                    <Text style={s.checkText}>
                      {e.cantidad}x {e.descripcion}
                      <Text style={{ color: C.dorado }}> (Subrenta{e.proveedor ? ` — ${e.proveedor}` : ""})</Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* EQUIPO DE TRABAJO */}
        {data.personal.length > 0 && (
          <View style={s.secWrap}>
            <Text style={s.secTitle}>Equipo de Trabajo en el Evento</Text>
            {data.personal.map((p, i) => (
              <View key={i} style={[s.equipoRow, i === data.personal.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                <Text style={s.equipoNombre}>{p.nombre}</Text>
                <Text style={s.equipoRol}>{p.rolEnEvento ?? p.rolTecnico ?? "Técnico"}</Text>
                <Text style={s.equipoCel}>{p.celular ?? "—"}</Text>
              </View>
            ))}
          </View>
        )}

        {/* CONTACTOS CLAVE */}
        {(data.encargadoNombre || data.encargadoLugar || data.proveedoresEvento.length > 0) && (
          <View style={s.secWrap}>
            <Text style={s.secTitle}>Contactos Clave</Text>
            <View style={s.contactosTable}>
              <View style={s.contactoHd}>
                <Text style={[s.contactoHdTxt, { width: 140 }]}>Quién</Text>
                <Text style={[s.contactoHdTxt, { flex: 1 }]}>Nombre</Text>
                <Text style={[s.contactoHdTxt, { width: 110 }]}>Teléfono</Text>
              </View>
              {data.encargadoNombre && (
                <View style={s.contactoRow}>
                  <Text style={[s.contactoMuted, { width: 140 }]}>Coordinador Mainstage</Text>
                  <Text style={[s.contactoTxt, { flex: 1 }]}>{data.encargadoNombre}</Text>
                  <Text style={[s.contactoMuted, { width: 110 }]}>—</Text>
                </View>
              )}
              {data.encargadoLugar && (
                <View style={s.contactoRow}>
                  <Text style={[s.contactoMuted, { width: 140 }]}>Encargado del venue</Text>
                  <Text style={[s.contactoTxt, { flex: 1 }]}>{data.encargadoLugar}</Text>
                  <Text style={[s.contactoMuted, { width: 110 }]}>{data.encargadoLugarContacto ?? "—"}</Text>
                </View>
              )}
              {data.proveedoresEvento.map((p, i) => (
                <View key={i} style={i === data.proveedoresEvento.length - 1 && !data.encargadoNombre && !data.encargadoLugar ? s.contactoRowLast : s.contactoRow}>
                  <Text style={[s.contactoMuted, { width: 140 }]}>{p.servicioEquipo ?? "Proveedor"}</Text>
                  <Text style={[s.contactoTxt, { flex: 1 }]}>{p.nombreProveedor}</Text>
                  <Text style={[s.contactoMuted, { width: 110 }]}>{p.telefonoProveedor ?? "—"}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* NOTAS IMPORTANTES */}
        {(data.comentariosFinales || data.detallesEspecificos) && (
          <View style={s.secWrap}>
            <Text style={s.secTitle}>Notas Importantes</Text>
            {data.detallesEspecificos && (
              <View style={[s.notasBox, { marginBottom: 6 }]}>
                <Text style={s.notasText}>{data.detallesEspecificos}</Text>
              </View>
            )}
            {data.comentariosFinales && (
              <View style={s.notasBox}>
                <Text style={s.notasText}>{data.comentariosFinales}</Text>
              </View>
            )}
          </View>
        )}

        {/* FOOTER */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>Mainstage Pro · {data.numeroProyecto}</Text>
          <Text style={s.footerTxt}>Generado el {nowStr()}</Text>
        </View>

      </Page>
    </Document>
  );
}
