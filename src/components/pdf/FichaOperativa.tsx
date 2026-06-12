/**
 * FichaOperativa.tsx — Ficha operativa unificada (coordinador + técnicos)
 * Misma estructura visual que FichaCliente. Sin info financiera ni costos.
 * Incluye: cronograma, rider con accesorios (checklist), traslados, proveedores,
 * personal, contactos clave, documentos del show, notas.
 */
import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import {
  C, base, fmtFecha, fmtFechaCorta, fmtHora, duracion, nowStr,
  agruparPorCategoria, EquipoFlat, CronoRow, TransporteSlot,
  DocsData, EquipoRiderExtra, ProveedorRenta, MAPS,
} from "./PdfShared";

const s = StyleSheet.create({
  // Sección numerada con badge negro
  secNumBadge: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: C.negro,
    alignItems: "center", justifyContent: "center", marginRight: 7, flexShrink: 0,
  },
  secNumTxt: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.blanco, paddingTop: 1 },
  secTitleRow: {
    flexDirection: "row", alignItems: "center", marginBottom: 8,
    paddingBottom: 4, borderBottomWidth: 0.8,
    borderBottomColor: C.doradoBorde, borderBottomStyle: "solid",
  },
  secTitleTxt: {
    fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.dorado,
    textTransform: "uppercase", letterSpacing: 1.3,
  },
  // Tabla de horarios del día (grande, visual)
  horaTable: {
    width: "100%", borderWidth: 0.5, borderColor: C.grisLinea,
    borderStyle: "solid", borderRadius: 4,
  },
  horaRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 7, paddingHorizontal: 10,
    borderBottomWidth: 0.5, borderBottomColor: C.grisLinea, borderBottomStyle: "solid",
  },
  horaRowLast: { flexDirection: "row", alignItems: "center", paddingVertical: 7, paddingHorizontal: 10 },
  horaIcon: { width: 18, fontSize: 11, marginRight: 8, flexShrink: 0 },
  horaLabel: { width: 118, fontSize: 8, color: C.grisMedio },
  horaFecha: { width: 72, fontSize: 7.5, color: C.grisClaro },
  horaFechaBlank: { width: 72, borderBottomWidth: 0.5, borderBottomColor: "#bbb", borderBottomStyle: "solid", height: 10 },
  horaHora: { width: 55, fontSize: 13, fontFamily: "Helvetica-Bold", color: C.negro },
  horaRef: { flex: 1, fontSize: 7.5, color: C.grisMedio },
  // Accesorio dentro de rider
  accRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 3, paddingLeft: 17 },
  accBox: {
    width: 8, height: 8, borderWidth: 0.5, borderColor: "#bbb",
    borderStyle: "solid", borderRadius: 1, marginRight: 5, marginTop: 1, flexShrink: 0,
  },
  accTxt: { flex: 1, fontSize: 7.5, color: C.grisMedio },
  // Contactos tabla grande
  contactoNombre: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.negro },
  contactoRol: { fontSize: 7.5, color: C.grisMedio },
  contactoCel: { fontSize: 9, color: C.negro },
  // Notas box con label
  notaBox: { backgroundColor: C.grisFondo, borderRadius: 3, padding: 9, marginBottom: 6 },
  notaLabel: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.grisClaro, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  notaText: { fontSize: 8.5, color: C.negro, lineHeight: 1.55 },
  // Badge subrenta
  badgeExt: {
    fontSize: 6, fontFamily: "Helvetica-Bold", color: C.dorado,
    backgroundColor: C.doradoClaro, paddingHorizontal: 4, paddingVertical: 1.5,
    borderRadius: 2, marginLeft: 4,
  },
});

function SecNum({ num, titulo }: { num: string; titulo: string }) {
  return (
    <View style={s.secTitleRow}>
      <View style={s.secNumBadge}><Text style={s.secNumTxt}>{num}</Text></View>
      <Text style={s.secTitleTxt}>{titulo}</Text>
    </View>
  );
}

function KV({ label, value, bold, full }: { label: string; value?: string | null; bold?: boolean; full?: boolean }) {
  if (!value) return null;
  return (
    <View style={full ? base.kvCellFull : base.kvCell}>
      <Text style={base.kvLabel}>{label}</Text>
      <Text style={bold ? base.kvValBold : base.kvVal}>{value}</Text>
    </View>
  );
}

export interface PersonalItem {
  nombre: string; rolEnEvento: string | null; rolTecnico: string | null;
  celular: string | null; confirmado: boolean;
  fechaJornada: string | null; participacion: string | null;
}
export interface ProveedorEvento {
  nombreProveedor: string; servicioEquipo: string | null; telefonoProveedor: string | null;
}
export interface ArchivoItem { tipo: string; nombre: string; url: string }
export interface CheckItemFlat { item: string; completado: boolean; tipo: string }

export interface FichaOperativaData {
  nombre: string; numeroProyecto: string; estado: string;
  tipoEvento: string; tipoServicio: string | null; zona: string;
  fechaEvento: string | null;
  horaInicioEvento: string | null; horaFinEvento: string | null;
  horaInicio: string | null; horaDesmontaje: string | null;
  fechaMontaje: string | null; horaInicioMontaje: string | null; duracionMontajeHrs: number | null;
  horaMontaje: string | null;
  horaSalidaBodega: string | null; puntoSalidaBodega: string | null;
  lugarEvento: string | null; direccionVenue: string | null;
  linkMaps: string | null; indicacionesAcceso: string | null;
  indicacionesCliente: string | null;
  descripcionGeneral: string | null; detallesEspecificos: string | null; comentariosFinales: string | null;
  encargadoNombre: string | null;
  encargadoCliente: string | null; encargadoClienteContacto: string | null;
  encargadoLugar: string | null; encargadoLugarContacto: string | null;
  contactosEmergencia: string | null;
  llamadoBodega: string | null;  // ISO datetime string
  choferNombre: string | null;
  aplicaCatering: boolean;
  proveedorCatering: string | null;
  cliente: { nombre: string; empresa: string | null; telefono: string | null };
  equipos: EquipoFlat[];
  equiposRiderExtra: EquipoRiderExtra[];
  personal: PersonalItem[];
  proveedoresEvento: ProveedorEvento[];
  proveedoresRenta: ProveedorRenta[];
  archivos: ArchivoItem[];
  checklist: CheckItemFlat[];
  cronograma: CronoRow[];
  transportes: TransporteSlot[];
  docsTecnicos: DocsData | null;
  tratoNotas: string | null;
  logoSrc: string | null;
  logoSrcDark: string | null;
}

const ARCHIVO_TIPO: Record<string, string> = {
  RENDER: "Render", PLOT_PATCH: "Plot / Patch", INPUT_LIST: "Input List",
  RIDER: "Rider", ITINERARIO: "Itinerario", DOCUMENTO: "Documento", OTRO: "Otro",
};

export function FichaOperativa({ data }: { data: FichaOperativaData }) {
  const fechaStr = fmtFecha(data.fechaEvento);
  const fechaMontajeStr = fmtFecha(data.fechaMontaje);
  const horaIni = fmtHora(data.horaInicio || data.horaInicioEvento);
  const horaFin = fmtHora(data.horaDesmontaje || data.horaFinEvento);
  const dur = duracion(data.horaInicio || data.horaInicioEvento, data.horaDesmontaje || data.horaFinEvento);
  const horaMontaje = fmtHora(data.horaMontaje || data.horaInicioMontaje);
  const horaSalida = fmtHora(data.horaSalidaBodega);

  const propios = data.equipos.filter(e => e.tipo === "PROPIO");
  const externos = data.equipos.filter(e => e.tipo === "EXTERNO");
  const gruposPropios = agruparPorCategoria(propios);

  const cronConDatos = data.cronograma.filter(r => r.actividad?.trim());
  const transConDatos = data.transportes.filter(t => t.horaSalida || t.choferNombre || t.vehiculoNombre);

  const todosProveedores = [
    ...data.proveedoresEvento.map(p => ({ nombre: p.nombreProveedor, servicio: p.servicioEquipo, tel: p.telefonoProveedor })),
    ...data.proveedoresRenta.map(p => ({ nombre: p.nombre, servicio: p.equipos.join(", "), tel: p.contacto })),
  ];

  const soundcheck = data.docsTecnicos?.soundcheck?.filter(r => r.artista || r.hora) ?? [];
  const programa = data.docsTecnicos?.programaEvento?.filter(r => r.actividad || r.hora) ?? [];
  const coordProv = data.docsTecnicos?.coordinacionProveedores?.filter(r => r.proveedor) ?? [];

  // Extract time from llamadoBodega ISO datetime
  const llamadoBodegaHora = data.llamadoBodega
    ? new Date(data.llamadoBodega).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
    : null;
  const llamadoBodegaFecha = data.llamadoBodega
    ? fmtFechaCorta(data.llamadoBodega)
    : null;

  // Horarios del día — solo filas con hora
  type HoraItem = { label: string; hora: string; ref: string; fecha: string };
  const horariosDia: HoraItem[] = [
    { label: "Llamado en bodega", hora: llamadoBodegaHora ?? "", ref: data.puntoSalidaBodega ?? "", fecha: llamadoBodegaFecha ?? fmtFechaCorta(data.fechaMontaje) ?? fmtFechaCorta(data.fechaEvento) },
    { label: "Salida desde bodega", hora: horaSalida, ref: data.puntoSalidaBodega ?? "", fecha: fmtFechaCorta(data.fechaMontaje) || fmtFechaCorta(data.fechaEvento) },
    { label: "Llegada / inicio de montaje", hora: horaMontaje, ref: data.lugarEvento ?? "", fecha: fmtFechaCorta(data.fechaMontaje) || fmtFechaCorta(data.fechaEvento) },
    { label: "Inicio del evento", hora: horaIni, ref: data.lugarEvento ?? "", fecha: fmtFechaCorta(data.fechaEvento) },
    { label: "Fin / inicio de desmontaje", hora: horaFin, ref: "", fecha: fmtFechaCorta(data.fechaEvento) },
  ].filter(h => h.hora);

  let seccion = 0;
  const sec = (titulo: string) => { seccion++; return String(seccion); };

  return (
    <Document title={`Ficha Operativa ${data.numeroProyecto}`} author="Mainstage Pro">
      <Page size="LETTER" style={base.page}>

        {/* HERO HEADER NEGRO */}
        <View style={base.hero}>
          <View style={base.heroLeft}>
            <Text style={base.heroTag}>
              Ficha Operativa · {data.numeroProyecto} · {MAPS.ESTADO_MAP[data.estado] ?? data.estado}
            </Text>
            <Text style={base.heroNombre}>{data.nombre}</Text>
            <Text style={base.heroMeta}>
              {data.cliente.nombre}{data.cliente.empresa ? ` · ${data.cliente.empresa}` : ""}
              {data.tipoServicio ? ` · ${MAPS.TIPO_SERVICIO_MAP[data.tipoServicio] ?? data.tipoServicio}` : ""}
            </Text>
          </View>
          {data.logoSrc && <Image src={data.logoSrc} style={base.heroLogo} />}
        </View>

        {/* BANDA DORADA resumen */}
        <View style={base.banda}>
          {fechaStr && (
            <View style={base.bandaItem}>
              <Text style={base.bandaLabel}>Fecha del evento</Text>
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
          {horaMontaje && (
            <>
              <View style={base.bandaDivider} />
              <View style={base.bandaItem}>
                <Text style={base.bandaLabel}>Montaje</Text>
                <Text style={base.bandaVal}>{horaMontaje}</Text>
              </View>
            </>
          )}
          {horaIni && (
            <>
              <View style={base.bandaDivider} />
              <View style={base.bandaItem}>
                <Text style={base.bandaLabel}>Inicio evento</Text>
                <Text style={base.bandaVal}>{horaIni}</Text>
              </View>
            </>
          )}
          {horaFin && (
            <>
              <View style={base.bandaDivider} />
              <View style={base.bandaItem}>
                <Text style={base.bandaLabel}>Fin / desmontaje</Text>
                <Text style={base.bandaVal}>{horaFin}</Text>
              </View>
            </>
          )}
        </View>

        <View style={base.body}>

          {/* 1. HORARIOS DEL DÍA */}
          {horariosDia.length > 0 && (
            <View style={base.section}>
              <SecNum num={sec("horarios")} titulo="Horarios del día" />
              <View style={s.horaTable}>
                {horariosDia.map((h, i) => (
                  <View key={i} style={i < horariosDia.length - 1 ? s.horaRow : s.horaRowLast} wrap={false}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.dorado, marginRight: 14, marginTop: 1, flexShrink: 0 }} />
                    <Text style={s.horaLabel}>{h.label}</Text>
                    {h.fecha
                      ? <Text style={s.horaFecha}>{h.fecha}</Text>
                      : <View style={s.horaFechaBlank} />}
                    <Text style={s.horaHora}>{h.hora}</Text>
                    {h.ref ? <Text style={s.horaRef}>{h.ref}</Text> : null}
                  </View>
                ))}
              </View>
              {dur && (
                <Text style={{ fontSize: 7.5, color: C.grisMedio, marginTop: 4 }}>
                  Duración del evento: {dur}
                </Text>
              )}
            </View>
          )}

          {/* 2. CLIENTE Y CONTACTOS */}
          <View style={base.section}>
            <SecNum num={sec("cliente")} titulo="Cliente y Contactos" />
            <View style={base.kvGrid}>
              <KV label="Cliente" value={data.cliente.nombre} bold />
              {data.cliente.empresa && <KV label="Empresa" value={data.cliente.empresa} />}
              {data.cliente.telefono && <KV label="Teléfono cliente" value={data.cliente.telefono} />}
              {data.encargadoCliente && <KV label="Encargado del cliente" value={data.encargadoCliente} bold />}
              {data.encargadoClienteContacto && <KV label="Contacto directo" value={data.encargadoClienteContacto} />}
              {data.encargadoLugar && <KV label="Encargado del venue" value={data.encargadoLugar} bold />}
              {data.encargadoLugarContacto && <KV label="Contacto del venue" value={data.encargadoLugarContacto} />}
              {data.encargadoNombre && <KV label="Coordinador Mainstage" value={data.encargadoNombre} bold />}
            </View>
            {data.contactosEmergencia && (
              <View style={[base.textBox, { marginTop: 6 }]}>
                <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.grisClaro, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>Contactos de emergencia</Text>
                <Text style={base.textBoxContent}>{data.contactosEmergencia}</Text>
              </View>
            )}
          </View>

          {/* 3. VENUE Y LOGÍSTICA */}
          {(data.lugarEvento || data.direccionVenue || data.indicacionesAcceso) && (
            <View style={base.section}>
              <SecNum num={sec("venue")} titulo="Venue y Logística" />
              <View style={base.kvGrid}>
                {data.lugarEvento && <KV label="Venue" value={data.lugarEvento} bold full />}
                {data.direccionVenue && <KV label="Dirección" value={data.direccionVenue} full />}
                {data.linkMaps && (
                  <View style={base.kvCellFull}>
                    <Text style={base.kvLabel}>Google Maps</Text>
                    <Text style={base.kvValLink}>{data.linkMaps}</Text>
                  </View>
                )}
                {horaSalida && <KV label="Salida desde bodega" value={horaSalida} bold />}
                {data.puntoSalidaBodega && <KV label="Punto de salida" value={data.puntoSalidaBodega} />}
                {fechaMontajeStr && <KV label="Fecha de montaje" value={fechaMontajeStr} />}
                {horaMontaje && <KV label="Inicio de montaje" value={horaMontaje} bold />}
                {data.duracionMontajeHrs && <KV label="Duración montaje" value={`${data.duracionMontajeHrs} hrs`} />}
                {data.choferNombre && <KV label="Chofer asignado" value={data.choferNombre} bold />}
                {data.aplicaCatering && <KV label="Catering" value={data.proveedorCatering ? `Sí — ${data.proveedorCatering}` : 'Incluido'} />}
              </View>
              {data.indicacionesAcceso && (
                <View style={[base.textBox, { marginTop: 6 }]}>
                  <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.grisClaro, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>
                    Acceso al venue
                  </Text>
                  <Text style={base.textBoxContent}>{data.indicacionesAcceso}</Text>
                </View>
              )}
            </View>
          )}

          {/* 4. CRONOGRAMA */}
          {cronConDatos.length > 0 && (
            <View style={base.section}>
              <SecNum num={sec("crono")} titulo="Cronograma" />
              <View style={base.table}>
                <View style={base.tableHd}>
                  <Text style={[base.thTxt, { width: 46 }]}>Inicio</Text>
                  <Text style={[base.thTxt, { width: 40 }]}>Fin</Text>
                  <Text style={[base.thTxt, { flex: 1 }]}>Actividad</Text>
                  <Text style={[base.thTxt, { width: 100 }]}>Responsable</Text>
                </View>
                {cronConDatos.map((r, i) => (
                  <View key={i} style={i < cronConDatos.length - 1 ? base.tableRow : base.tableRowLast} wrap={false}>
                    <Text style={[base.tdTxt, { width: 46, fontFamily: "Helvetica-Bold" }]}>{fmtHora(r.horaInicio)}</Text>
                    <Text style={[base.tdMuted, { width: 40 }]}>{fmtHora(r.horaFin)}</Text>
                    <Text style={[base.tdTxt, { flex: 1 }]}>{r.actividad}</Text>
                    <Text style={[base.tdMuted, { width: 100 }]}>{r.responsable}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 5. TRASLADOS */}
          {transConDatos.length > 0 && (
            <View style={base.section}>
              <SecNum num={sec("traslados")} titulo="Traslados" />
              <View style={base.table}>
                <View style={base.tableHd}>
                  <Text style={[base.thTxt, { flex: 1 }]}>Vehículo</Text>
                  <Text style={[base.thTxt, { flex: 1 }]}>Chofer</Text>
                  <Text style={[base.thTxt, { width: 48 }]}>Salida</Text>
                  <Text style={[base.thTxt, { flex: 1 }]}>Notas</Text>
                </View>
                {transConDatos.map((t, i) => (
                  <View key={i} style={i < transConDatos.length - 1 ? base.tableRow : base.tableRowLast} wrap={false}>
                    <Text style={[base.tdTxt, { flex: 1 }]}>{t.vehiculoNombre ?? t.vehiculoId}</Text>
                    <Text style={[base.tdTxt, { flex: 1 }]}>{t.choferNombre ?? t.choferId}</Text>
                    <Text style={[base.tdTxt, { width: 48, fontFamily: "Helvetica-Bold" }]}>{fmtHora(t.horaSalida)}</Text>
                    <Text style={[base.tdMuted, { flex: 1 }]}>{t.comentarios}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 6. RIDER DE CARGA — EQUIPOS PROPIOS (checklist con accesorios) */}
          {propios.length > 0 && (
            <View style={base.section}>
              <SecNum num={sec("rider")} titulo="Rider de Carga — Equipos Propios" />
              {Array.from(gruposPropios.entries()).map(([cat, items]) => (
                <View key={cat} style={{ marginBottom: 8 }}>
                  <Text style={[base.catTxt, { marginBottom: 4 }]}>{cat}</Text>
                  {items.map((e, i) => (
                    <View key={i} wrap={false}>
                      <View style={base.checkRow}>
                        <View style={base.checkBox} />
                        <Text style={base.checkTxt}>
                          {e.cantidad}x{" "}
                          {[e.marca, e.modelo].filter(Boolean).join(" ") || e.descripcion}
                          {(e.marca || e.modelo) && e.descripcion
                            ? <Text style={base.checkSub}>{" — "}{e.descripcion}</Text>
                            : null}
                        </Text>
                      </View>
                      {/* Accesorios del equipo */}
                      {e.accesorios.filter(a => a.nombre).map((a, j) => (
                        <View key={j} style={s.accRow}>
                          <View style={s.accBox} />
                          <Text style={s.accTxt}>{a.cantidad}x {a.nombre}{a.categoria ? ` (${a.categoria})` : ""}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* 7. EQUIPO EXTERNO / SUBRENTAS */}
          {externos.length > 0 && (
            <View style={base.section}>
              <SecNum num={sec("externo")} titulo="Equipo Externo / Subrentas" />
              <View style={base.table}>
                <View style={base.tableHd}>
                  <Text style={[base.thTxt, { width: 36 }]}>Cant.</Text>
                  <Text style={[base.thTxt, { flex: 1 }]}>Equipo</Text>
                  <Text style={[base.thTxt, { flex: 1 }]}>Proveedor</Text>
                  <Text style={[base.thTxt, { width: 60 }]}>Estado</Text>
                </View>
                {externos.map((e, i) => (
                  <View key={i} style={i < externos.length - 1 ? base.tableRow : base.tableRowLast} wrap={false}>
                    <Text style={[base.tdTxt, { width: 36 }]}>{e.cantidad}</Text>
                    <Text style={[base.tdTxt, { flex: 1 }]}>{e.descripcion}</Text>
                    <Text style={[base.tdMuted, { flex: 1 }]}>{e.proveedor ?? "—"}</Text>
                    <Text style={e.confirmado ? base.chipOk : base.chipPend}>
                      {e.confirmado ? "Confirmado" : "Pendiente"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 8. EQUIPOS RIDER EXTRA (fuera de cotización) */}
          {data.equiposRiderExtra.length > 0 && (
            <View style={base.section}>
              <SecNum num={sec("extra")} titulo="Equipo Adicional (fuera de cotización)" />
              {data.equiposRiderExtra.map((e, i) => (
                <View key={i} style={base.checkRow} wrap={false}>
                  <View style={base.checkBox} />
                  <Text style={base.checkTxt}>
                    {e.cantidad}x {e.descripcion}
                    {e.notas ? <Text style={base.checkSub}> · {e.notas}</Text> : null}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 9. PROVEEDORES Y SUBRENTAS */}
          {todosProveedores.length > 0 && (
            <View style={base.section}>
              <SecNum num={sec("proveedores")} titulo="Proveedores y Subrentas" />
              <View style={base.table}>
                <View style={base.tableHd}>
                  <Text style={[base.thTxt, { flex: 1 }]}>Proveedor</Text>
                  <Text style={[base.thTxt, { flex: 1 }]}>Equipo / Servicio</Text>
                  <Text style={[base.thTxt, { width: 100 }]}>Teléfono</Text>
                </View>
                {todosProveedores.map((p, i) => (
                  <View key={i} style={i < todosProveedores.length - 1 ? base.tableRow : base.tableRowLast} wrap={false}>
                    <Text style={[base.tdTxt, { flex: 1, fontFamily: "Helvetica-Bold" }]}>{p.nombre}</Text>
                    <Text style={[base.tdMuted, { flex: 1 }]}>{p.servicio ?? "—"}</Text>
                    <Text style={[base.tdMuted, { width: 100 }]}>{p.tel ?? "—"}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 10. PERSONAL TECNICO — agrupado por fecha derivada del proyecto */}
          {data.personal.length > 0 && (() => {
            // Fechas base del proyecto
            const fechaEvento = data.fechaEvento ? data.fechaEvento.substring(0, 10) : null;
            const fechaMontajeProy = data.fechaMontaje ? data.fechaMontaje.substring(0, 10) : null;

            // Derivar fecha efectiva: fechaJornada manual tiene prioridad;
            // si no, MONTAJE usa fechaMontaje del proyecto, el resto usa fechaEvento
            const fechaEfectiva = (p: PersonalItem): string => {
              if (p.fechaJornada) return p.fechaJornada;
              const part = p.participacion ?? "OPERACION";
              if (part === "MONTAJE" && fechaMontajeProy) return fechaMontajeProy;
              if (part === "MONTAJE" && fechaEvento) return fechaEvento;
              return fechaEvento ?? "__sin_fecha__";
            };

            // Agrupar por fecha efectiva
            const gruposFecha = new Map<string, typeof data.personal>();
            for (const p of data.personal) {
              const key = fechaEfectiva(p);
              if (!gruposFecha.has(key)) gruposFecha.set(key, []);
              gruposFecha.get(key)!.push(p);
            }
            const fechaKeys = Array.from(gruposFecha.keys()).sort((a, b) => {
              if (a === "__sin_fecha__") return 1;
              if (b === "__sin_fecha__") return -1;
              return a.localeCompare(b);
            });
            const tieneMultiplesFechas = fechaKeys.filter(k => k !== "__sin_fecha__").length >= 1;

            const fmtJornada = (yyyymmdd: string) => {
              try {
                return new Date(yyyymmdd + "T12:00:00Z").toLocaleDateString("es-MX", {
                  timeZone: "UTC", weekday: "long", day: "numeric", month: "long",
                });
              } catch { return yyyymmdd; }
            };
            const PART_LABELS: Record<string, string> = {
              OPERACION: "Operacion tecnica", MONTAJE: "Montaje", DESMONTAJE: "Desmontaje",
              TRANSPORTE: "Transporte", OTRO: "Otro",
            };

            return (
              <View style={base.section}>
                <SecNum num={sec("personal")} titulo="Personal Tecnico" />
                {fechaKeys.map((fechaKey) => {
                  const itemsFecha = gruposFecha.get(fechaKey)!;
                  // Sub-agrupar por participacion dentro de cada fecha
                  const subGrupos = new Map<string, typeof data.personal>();
                  for (const p of itemsFecha) {
                    const pKey = p.participacion ?? "OTRO";
                    if (!subGrupos.has(pKey)) subGrupos.set(pKey, []);
                    subGrupos.get(pKey)!.push(p);
                  }
                  const tipoKeys = Array.from(subGrupos.keys()).sort();

                  return (
                    <View key={fechaKey} style={{ marginBottom: tieneMultiplesFechas ? 10 : 0 }}>
                      {/* Encabezado de fecha */}
                      {tieneMultiplesFechas && (
                        <View wrap={false} style={{
                          backgroundColor: fechaKey === "__sin_fecha__" ? "#f0f0f0" : "#0d0d0d",
                          paddingVertical: 5, paddingHorizontal: 10,
                          marginBottom: 4,
                          flexDirection: "row", alignItems: "center",
                        }}>
                          <Text style={{
                            fontSize: 8.5, fontFamily: "Helvetica-Bold",
                            color: fechaKey === "__sin_fecha__" ? "#5a5a5a" : "#ffffff", flex: 1,
                          }}>
                            {fechaKey === "__sin_fecha__" ? "Sin fecha asignada" : fmtJornada(fechaKey)}
                          </Text>
                          <Text style={{ fontSize: 7, color: fechaKey === "__sin_fecha__" ? "#888" : "#aaa" }}>
                            {itemsFecha.length} {itemsFecha.length === 1 ? "tecnico" : "tecnicos"}
                          </Text>
                        </View>
                      )}
                      {/* Sub-encabezado de tipo + tabla */}
                      {tipoKeys.map((tipoKey) => {
                        const items = subGrupos.get(tipoKey)!;
                        return (
                          <View key={tipoKey} style={{ marginBottom: 6 }}>
                            <View style={base.table}>
                              {/* Sub-encabezado de tipo de participacion */}
                              <View style={[base.tableHd, { backgroundColor: "#1a1a1a" }]}>
                                <Text style={[base.thTxt, { flex: 1, color: "#B3985B" }]}>
                                  {PART_LABELS[tipoKey] ?? tipoKey}
                                </Text>
                                <Text style={[base.thTxt, { flex: 1 }]}>Rol en el evento</Text>
                                <Text style={[base.thTxt, { width: 95 }]}>Celular</Text>
                                <Text style={[base.thTxt, { width: 60 }]}>Estado</Text>
                              </View>
                              {items.map((p, i) => (
                                <View key={i} style={i < items.length - 1 ? base.tableRow : base.tableRowLast} wrap={false}>
                                  <Text style={[base.tdTxt, { flex: 1, fontFamily: "Helvetica-Bold" }]}>{p.nombre}</Text>
                                  <Text style={[base.tdMuted, { flex: 1 }]}>{p.rolEnEvento ?? p.rolTecnico ?? "—"}</Text>
                                  <Text style={[base.tdTxt, { width: 95 }]}>{p.celular ?? "—"}</Text>
                                  <Text style={p.confirmado ? base.chipOk : base.chipPend}>
                                    {p.confirmado ? "Confirmado" : "Pendiente"}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            );
          })()}

          {/* 11. ARCHIVOS OPERATIVOS */}
          {data.archivos.length > 0 && (
            <View style={base.section}>
              <SecNum num={sec("archivos")} titulo="Archivos Operativos" />
              <View style={base.table}>
                <View style={base.tableHd}>
                  <Text style={[base.thTxt, { width: 80 }]}>Tipo</Text>
                  <Text style={[base.thTxt, { flex: 1 }]}>Nombre</Text>
                  <Text style={[base.thTxt, { flex: 1 }]}>URL</Text>
                </View>
                {data.archivos.map((a, i) => (
                  <View key={i} style={i < data.archivos.length - 1 ? base.tableRow : base.tableRowLast} wrap={false}>
                    <Text style={[base.tdMuted, { width: 80 }]}>{ARCHIVO_TIPO[a.tipo] ?? a.tipo}</Text>
                    <Text style={[base.tdTxt, { flex: 1 }]}>{a.nombre}</Text>
                    <Text style={[{ fontSize: 7, color: "#1a73e8", flex: 1 }]}>{a.url}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 12. DOCUMENTOS DEL SHOW */}
          {(soundcheck.length > 0 || programa.length > 0 || coordProv.length > 0) && (
            <View style={base.section}>
              <SecNum num={sec("docs")} titulo="Documentos del Show" />
              {soundcheck.length > 0 && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={[base.kvLabel, { marginBottom: 4 }]}>Orden de Soundcheck</Text>
                  <View style={base.table}>
                    <View style={base.tableHd}>
                      <Text style={[base.thTxt, { width: 46 }]}>Hora</Text>
                      <Text style={[base.thTxt, { flex: 1 }]}>Artista / Act</Text>
                      <Text style={[base.thTxt, { width: 56 }]}>Duración</Text>
                      <Text style={[base.thTxt, { flex: 1 }]}>Notas</Text>
                    </View>
                    {soundcheck.map((r, i) => (
                      <View key={i} style={i < soundcheck.length - 1 ? base.tableRow : base.tableRowLast} wrap={false}>
                        <Text style={[base.tdTxt, { width: 46 }]}>{r.hora}</Text>
                        <Text style={[base.tdTxt, { flex: 1 }]}>{r.artista}</Text>
                        <Text style={[base.tdMuted, { width: 56 }]}>{r.duracion}</Text>
                        <Text style={[base.tdMuted, { flex: 1 }]}>{r.notas}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {programa.length > 0 && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={[base.kvLabel, { marginBottom: 4 }]}>Programa General del Evento</Text>
                  <View style={base.table}>
                    <View style={base.tableHd}>
                      <Text style={[base.thTxt, { width: 46 }]}>Hora</Text>
                      <Text style={[base.thTxt, { flex: 1 }]}>Actividad</Text>
                      <Text style={[base.thTxt, { width: 100 }]}>Responsable</Text>
                      <Text style={[base.thTxt, { flex: 1 }]}>Notas</Text>
                    </View>
                    {programa.map((r, i) => (
                      <View key={i} style={i < programa.length - 1 ? base.tableRow : base.tableRowLast} wrap={false}>
                        <Text style={[base.tdTxt, { width: 46, fontFamily: "Helvetica-Bold" }]}>{r.hora}</Text>
                        <Text style={[base.tdTxt, { flex: 1 }]}>{r.actividad}</Text>
                        <Text style={[base.tdMuted, { width: 100 }]}>{r.responsable}</Text>
                        <Text style={[base.tdMuted, { flex: 1 }]}>{r.notas}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {coordProv.length > 0 && (
                <View>
                  <Text style={[base.kvLabel, { marginBottom: 4 }]}>Coordinación de Proveedores</Text>
                  <View style={base.table}>
                    <View style={base.tableHd}>
                      <Text style={[base.thTxt, { flex: 1 }]}>Proveedor</Text>
                      <Text style={[base.thTxt, { width: 100 }]}>Contacto</Text>
                      <Text style={[base.thTxt, { width: 56 }]}>Horario</Text>
                      <Text style={[base.thTxt, { flex: 1 }]}>Notas</Text>
                    </View>
                    {coordProv.map((r, i) => (
                      <View key={i} style={i < coordProv.length - 1 ? base.tableRow : base.tableRowLast} wrap={false}>
                        <Text style={[base.tdTxt, { flex: 1 }]}>{r.proveedor}</Text>
                        <Text style={[base.tdMuted, { width: 100 }]}>{r.contacto}</Text>
                        <Text style={[base.tdMuted, { width: 56 }]}>{r.horario}</Text>
                        <Text style={[base.tdMuted, { flex: 1 }]}>{r.notas}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 13. NOTAS */}
          {(data.descripcionGeneral || data.tratoNotas || data.detallesEspecificos || data.comentariosFinales || data.indicacionesCliente) && (
            <View style={base.section}>
              <SecNum num={sec("notas")} titulo="Notas" />
              {data.descripcionGeneral && (
                <View style={s.notaBox}>
                  <Text style={s.notaLabel}>Descripción general</Text>
                  <Text style={s.notaText}>{data.descripcionGeneral}</Text>
                </View>
              )}
              {data.tratoNotas && (
                <View style={s.notaBox}>
                  <Text style={s.notaLabel}>Notas del descubrimiento</Text>
                  <Text style={s.notaText}>{data.tratoNotas}</Text>
                </View>
              )}
              {data.detallesEspecificos && (
                <View style={s.notaBox}>
                  <Text style={s.notaLabel}>Detalles específicos</Text>
                  <Text style={s.notaText}>{data.detallesEspecificos}</Text>
                </View>
              )}
              {data.indicacionesCliente && (
                <View style={s.notaBox}>
                  <Text style={s.notaLabel}>Indicaciones para el cliente</Text>
                  <Text style={s.notaText}>{data.indicacionesCliente}</Text>
                </View>
              )}
              {data.comentariosFinales && (
                <View style={s.notaBox}>
                  <Text style={s.notaLabel}>Comentarios finales</Text>
                  <Text style={s.notaText}>{data.comentariosFinales}</Text>
                </View>
              )}
            </View>
          )}

        </View>

        {/* FOOTER */}
        <View style={base.footer} fixed>
          {(data.logoSrcDark ?? data.logoSrc) && <Image src={(data.logoSrcDark ?? data.logoSrc)!} style={base.footerLogo} />}
          <Text style={base.footerTxt}>Uso interno — Mainstage Pro</Text>
          <Text style={base.footerTxt}>{data.numeroProyecto} · {nowStr()}</Text>
        </View>

      </Page>
    </Document>
  );
}
