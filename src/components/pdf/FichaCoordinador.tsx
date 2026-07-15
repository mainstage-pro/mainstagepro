/**
 * FichaCoordinador.tsx — Ficha operativa completa para el coordinador
 * Diseño: denso, secciones numeradas, tablas compactas. Para imprimir en carta.
 */
import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import {
  C, base, fmtFecha, fmtFechaCorta, fmtHora, duracion, nowStr,
  agruparPorCategoria, EquipoFlat,
  CronoRow, TransporteSlot, DocsData, EquipoRiderExtra, ProveedorRenta,
} from "./PdfShared";
import { diasEvento, agruparPorDia, horarioDeDia } from "@/lib/fechas-evento";

const s = StyleSheet.create({
  // Header
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 2 },
  headerNombre: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 3 },
  headerMeta: { fontSize: 7.5, color: C.grisMedio },
  estadoBadge: { fontSize: 7, fontFamily: "Helvetica-Bold", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, alignSelf: "flex-start", marginTop: 4 },
  // Banda resumen
  banda: { flexDirection: "row", backgroundColor: C.negro, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14, gap: 0 },
  bandaItem: { flex: 1, alignItems: "center" },
  bandaLabel: { fontSize: 6, color: "#888", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  bandaVal: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.blanco },
  bandaDivider: { width: 0.5, backgroundColor: "#444", marginHorizontal: 2 },
  // Sección numerada
  secNum: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.blanco, backgroundColor: C.negro, width: 14, height: 14, borderRadius: 7, textAlign: "center", paddingTop: 2.5, marginRight: 6, flexShrink: 0 },
  secTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: C.grisLinea, borderBottomStyle: "solid" },
  secTitleText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.negro, textTransform: "uppercase", letterSpacing: 0.8 },
  // KV grid 2 cols
  kvGrid: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
  kvCell: { width: "50%", marginBottom: 4 },
  kvLabel: { fontSize: 6.5, color: C.grisClaro, marginBottom: 1, textTransform: "uppercase", letterSpacing: 0.5 },
  kvVal: { fontSize: 8, color: C.negro },
  kvValBold: { fontSize: 8, color: C.negro, fontFamily: "Helvetica-Bold" },
  // Tablas compactas
  tbl: { width: "100%", borderWidth: 0.5, borderColor: C.grisLinea, borderStyle: "solid", borderRadius: 2, marginTop: 2 },
  diaLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.dorado, marginBottom: 3, marginTop: 2 },
  tblHd: { flexDirection: "row", backgroundColor: C.grisFondo, paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: C.grisLinea, borderBottomStyle: "solid" },
  tblRow: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.3, borderBottomColor: "#f0f0f0", borderBottomStyle: "solid" },
  tblRowLast: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6 },
  tblHdTxt: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.grisMedio },
  tblTxt: { fontSize: 7.5, color: C.negro },
  tblTxtMuted: { fontSize: 7.5, color: C.grisMedio },
  // Cat header dentro de tabla
  catRow: { flexDirection: "row", backgroundColor: "#f5f5f5", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.3, borderBottomColor: C.grisLinea, borderBottomStyle: "solid" },
  catTxt: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.grisMedio, textTransform: "uppercase", letterSpacing: 0.8 },
  // Estado chips
  chipOk: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.verde, backgroundColor: "#e8f5ea", paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 2 },
  chipPend: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#b45309", backgroundColor: "#fef3c7", paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 2 },
  chipX: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.rojo, backgroundColor: "#fee2e2", paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 2 },
  // Notas box
  notasBox: { backgroundColor: "#fafafa", borderLeftWidth: 2, borderLeftColor: C.grisLinea, borderLeftStyle: "solid", padding: 8, borderRadius: 2, marginBottom: 6 },
  notasLabel: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.grisClaro, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  notasText: { fontSize: 7.5, color: C.negro, lineHeight: 1.5 },
  // footer
  footer: { position: "absolute", bottom: 18, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 0.5, borderTopColor: C.grisLinea, borderTopStyle: "solid", paddingTop: 5 },
  footerTxt: { fontSize: 6.5, color: C.grisClaro },
});

export interface PersonalItem {
  nombre: string;
  rolEnEvento: string | null;
  rolTecnico: string | null;
  celular: string | null;
  confirmado: boolean;
  fechaJornada: string | null;  // YYYY-MM-DD — fecha específica de jornada
  participacion: string | null; // OPERACION | MONTAJE | DESMONTAJE | TRANSPORTE | OTRO
  jornada: string | null;       // CORTA | MEDIA | LARGA
}
export interface ProveedorEvento {
  nombreProveedor: string;
  servicioEquipo: string | null;
  telefonoProveedor: string | null;
}
export interface ArchivoItem {
  tipo: string;
  nombre: string;
  url: string;
}
export interface CheckItemFlat {
  item: string;
  completado: boolean;
  tipo: string;
}
export interface CxCFlat {
  concepto: string;
  monto: number;
  montoCobrado: number;
  estado: string;
  tipoPago: string;
}

export interface FichaCoordinadorData {
  nombre: string;
  numeroProyecto: string;
  estado: string;
  tipoEvento: string;
  tipoServicio: string | null;
  zona: string;
  fechaEvento: string | null;
  fechasEvento: string | null;
  horariosEvento: string | null;
  horaInicioEvento: string | null;
  horaFinEvento: string | null;
  horaInicio: string | null;
  horaDesmontaje: string | null;
  fechaMontaje: string | null;
  horaInicioMontaje: string | null;
  duracionMontajeHrs: number | null;
  horaMontaje: string | null;
  horaSalidaBodega: string | null;
  puntoSalidaBodega: string | null;
  lugarEvento: string | null;
  direccionVenue: string | null;
  linkMaps: string | null;
  indicacionesAcceso: string | null;
  indicacionesCliente: string | null;
  descripcionGeneral: string | null;
  detallesEspecificos: string | null;
  comentariosFinales: string | null;
  encargadoNombre: string | null;
  encargadoCliente: string | null;
  encargadoClienteContacto: string | null;
  encargadoLugar: string | null;
  encargadoLugarContacto: string | null;
  cliente: { nombre: string; empresa: string | null; telefono: string | null };
  equipos: EquipoFlat[];
  personal: PersonalItem[];
  proveedoresEvento: ProveedorEvento[];
  proveedoresRenta: ProveedorRenta[];
  archivos: ArchivoItem[];
  checklist: CheckItemFlat[];
  cuentasCobrar: CxCFlat[];
  cronograma: CronoRow[];
  transportes: TransporteSlot[];
  equiposRiderExtra: EquipoRiderExtra[];
  docsTecnicos: DocsData | null;
  tratoNotas: string | null;
  logoSrc: string | null;
}

const ESTADO_LABEL: Record<string, string> = {
  PLANEACION: "En preparación", CONFIRMADO: "Confirmado",
  EN_CURSO: "En evento", COMPLETADO: "Finalizado", CANCELADO: "Cancelado",
};
const TIPO_EVENTO: Record<string, string> = {
  MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", OTRO: "Otro",
};
const TIPO_SERVICIO: Record<string, string> = {
  PRODUCCION_TECNICA: "Producción técnica", RENTA: "Renta de equipo", DIRECCION_TECNICA: "Dirección técnica",
};
const ZONA: Record<string, string> = { LOCAL: "Local", BAJIO: "Bajío", NACIONAL: "Nacional" };
const ARCHIVO_TIPO: Record<string, string> = {
  RENDER: "Render", PLOT_PATCH: "Plot / Patch", INPUT_LIST: "Input List",
  RIDER: "Rider", ITINERARIO: "Itinerario", DOCUMENTO: "Documento", OTRO: "Otro",
};

function SeccionHeader({ num, titulo }: { num: string; titulo: string }) {
  return (
    <View style={s.secTitleRow}>
      <Text style={s.secNum}>{num}</Text>
      <Text style={s.secTitleText}>{titulo}</Text>
    </View>
  );
}

function KVRow({ label, value, bold }: { label: string; value: string | null | undefined; bold?: boolean }) {
  if (!value) return null;
  return (
    <View style={s.kvCell}>
      <Text style={s.kvLabel}>{label}</Text>
      <Text style={bold ? s.kvValBold : s.kvVal}>{value}</Text>
    </View>
  );
}

export function FichaCoordinador({ data }: { data: FichaCoordinadorData }) {
  const fechaStr = fmtFecha(data.fechaEvento);
  const fechaMontajeStr = fmtFecha(data.fechaMontaje);
  const horaIni = fmtHora(data.horaInicio || data.horaInicioEvento);
  const horaFin = fmtHora(data.horaDesmontaje || data.horaFinEvento);
  const duracionEvento = duracion(data.horaInicio || data.horaInicioEvento, data.horaDesmontaje || data.horaFinEvento);
  const horaMontajeStr = fmtHora(data.horaMontaje || data.horaInicioMontaje);
  const horaSalidaStr = fmtHora(data.horaSalidaBodega);

  const equiposPropios = data.equipos.filter(e => e.tipo === "PROPIO");
  const equiposExternos = data.equipos.filter(e => e.tipo === "EXTERNO");
  const gruposPropios = agruparPorCategoria(equiposPropios);
  const gruposExternos = agruparPorCategoria(equiposExternos);

  const checkOk = data.checklist.filter(c => c.completado).length;
  const checkTotal = data.checklist.length;
  const personalConf = data.personal.filter(p => p.confirmado).length;
  const equipConf = data.equipos.filter(e => e.confirmado).length;
  const anticipo = data.cuentasCobrar.find(c => c.tipoPago === "ANTICIPO");
  const liquidacion = data.cuentasCobrar.find(c => c.tipoPago === "LIQUIDACION");

  const cronConDatos = data.cronograma.filter(r => r.actividad?.trim());
  // Servicio de varios días: agrupa la cronología por fecha.
  const diasCrono = diasEvento(data.fechaEvento, data.fechasEvento);
  const esMultidiaCrono = diasCrono.length > 1;
  const fmtDiaCrono = (iso: string) =>
    new Date(iso + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  const cronoFilasDoc = (rows: CronoRow[]) => rows.map((r, i) => (
    <View key={i} style={i < rows.length - 1 ? s.tblRow : s.tblRowLast} wrap={false}>
      <Text style={[s.tblTxt, { width: 50 }]}>{fmtHora(r.horaInicio)}</Text>
      <Text style={[s.tblTxtMuted, { width: 50 }]}>{fmtHora(r.horaFin)}</Text>
      <Text style={[s.tblTxt, { flex: 1 }]}>{r.actividad}</Text>
      <Text style={[s.tblTxtMuted, { width: 90 }]}>{r.responsable}</Text>
    </View>
  ));
  const transConDatos = data.transportes.filter(t => t.horaSalida || t.choferNombre);
  const todosProveedores = [
    ...data.proveedoresEvento.map(p => ({ nombre: p.nombreProveedor, servicio: p.servicioEquipo, telefono: p.telefonoProveedor })),
    ...data.proveedoresRenta.map(p => ({ nombre: p.nombre, servicio: p.equipos.join(", "), telefono: p.contacto })),
  ];

  const soundcheckConDatos = data.docsTecnicos?.soundcheck?.filter(r => r.artista || r.hora) ?? [];
  const programaConDatos = data.docsTecnicos?.programaEvento?.filter(r => r.actividad || r.hora) ?? [];
  const coordProvConDatos = data.docsTecnicos?.coordinacionProveedores?.filter(r => r.proveedor || r.horario) ?? [];

  return (
    <Document title={`Ficha Operativa ${data.numeroProyecto}`} author="Mainstage Pro">
      <Page size="LETTER" style={[base.page, { paddingTop: 28, paddingBottom: 48 }]}>

        {/* HEADER */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>Ficha Operativa del Evento</Text>
            <Text style={s.headerNombre}>{data.nombre}</Text>
            <Text style={s.headerMeta}>{data.numeroProyecto} · Generado el {nowStr()}</Text>
            <Text style={[s.estadoBadge, { color: C.blanco, backgroundColor: C.negro }]}>
              {ESTADO_LABEL[data.estado] ?? data.estado}
            </Text>
          </View>
          {data.logoSrc && <Image src={data.logoSrc} style={{ width: 90, height: 26, objectFit: "contain" }} />}
        </View>

        {/* BANDA RESUMEN */}
        <View style={s.banda}>
          {fechaStr && (
            <View style={s.bandaItem}>
              <Text style={s.bandaLabel}>Fecha</Text>
              <Text style={s.bandaVal}>{fechaStr.split(",")[0]?.trim() ?? fechaStr}</Text>
            </View>
          )}
          {data.lugarEvento && (
            <>
              <View style={s.bandaDivider} />
              <View style={s.bandaItem}>
                <Text style={s.bandaLabel}>Venue</Text>
                <Text style={s.bandaVal}>{data.lugarEvento}</Text>
              </View>
            </>
          )}
          {horaMontajeStr && (
            <>
              <View style={s.bandaDivider} />
              <View style={s.bandaItem}>
                <Text style={s.bandaLabel}>Montaje</Text>
                <Text style={s.bandaVal}>{horaMontajeStr}</Text>
              </View>
            </>
          )}
          {horaIni && (
            <>
              <View style={s.bandaDivider} />
              <View style={s.bandaItem}>
                <Text style={s.bandaLabel}>Inicio</Text>
                <Text style={s.bandaVal}>{horaIni}</Text>
              </View>
            </>
          )}
        </View>

        {/* 1. CLIENTE */}
        <View style={base.section}>
          <SeccionHeader num="1" titulo="Cliente" />
          <View style={s.kvGrid}>
            <KVRow label="Cliente" value={data.cliente.nombre} bold />
            {data.cliente.empresa && <KVRow label="Empresa" value={data.cliente.empresa} />}
            {data.cliente.telefono && <KVRow label="Teléfono cliente" value={data.cliente.telefono} />}
            {data.encargadoCliente && <KVRow label="Encargado del cliente" value={data.encargadoCliente} />}
            {data.encargadoClienteContacto && <KVRow label="Contacto directo" value={data.encargadoClienteContacto} />}
            {data.encargadoLugar && <KVRow label="Encargado del venue" value={data.encargadoLugar} />}
            {data.encargadoLugarContacto && <KVRow label="Contacto del venue" value={data.encargadoLugarContacto} />}
            {data.encargadoNombre && <KVRow label="Coordinador Mainstage" value={data.encargadoNombre} bold />}
          </View>
        </View>

        {/* 2. DATOS DEL EVENTO */}
        <View style={base.section}>
          <SeccionHeader num="2" titulo="Datos del Evento" />
          <View style={s.kvGrid}>
            <KVRow label="Tipo de evento" value={TIPO_EVENTO[data.tipoEvento] ?? data.tipoEvento} />
            {data.tipoServicio && <KVRow label="Tipo de servicio" value={TIPO_SERVICIO[data.tipoServicio] ?? data.tipoServicio} />}
            <KVRow label="Zona" value={ZONA[data.zona] ?? data.zona} />
            {fechaStr && <KVRow label="Fecha del evento" value={fechaStr} bold />}
            {horaIni && <KVRow label="Hora de inicio" value={horaIni} bold />}
            {horaFin && <KVRow label="Hora fin / desmontaje" value={horaFin} />}
            {duracionEvento && <KVRow label="Duración evento" value={duracionEvento} />}
          </View>
        </View>

        {/* 3. VENUE Y LOGÍSTICA */}
        {(data.lugarEvento || data.direccionVenue || data.horaSalidaBodega || data.horaMontaje) && (
          <View style={base.section}>
            <SeccionHeader num="3" titulo="Venue y Logística del Día" />
            <View style={s.kvGrid}>
              {data.lugarEvento && <KVRow label="Venue" value={data.lugarEvento} bold />}
              {data.direccionVenue && <KVRow label="Dirección" value={data.direccionVenue} />}
              {data.linkMaps && <KVRow label="Google Maps" value={data.linkMaps} />}
              {data.horaSalidaBodega && <KVRow label="Salida desde bodega" value={fmtHora(data.horaSalidaBodega)} bold />}
              {data.puntoSalidaBodega && <KVRow label="Punto de salida" value={data.puntoSalidaBodega} />}
              {fechaMontajeStr && <KVRow label="Fecha de montaje" value={fechaMontajeStr} />}
              {data.horaInicioMontaje && <KVRow label="Inicio de montaje" value={fmtHora(data.horaInicioMontaje)} bold />}
              {data.duracionMontajeHrs && <KVRow label="Duración montaje" value={`${data.duracionMontajeHrs} hrs`} />}
              {data.horaMontaje && <KVRow label="Llegada al venue" value={fmtHora(data.horaMontaje)} bold />}
              {esMultidiaCrono ? (
                diasCrono.map((fecha, di) => {
                  const h = horarioDeDia(fecha, di, diasCrono, data.horariosEvento, data.horaInicioEvento, data.horaFinEvento);
                  if (!h.inicio && !h.fin) return null;
                  const etiqueta = `Día ${di + 1} · ${fmtFechaCorta(fecha)}`;
                  const valor = [h.inicio ? `Inicio ${fmtHora(h.inicio)}` : null, h.fin ? `Fin ${fmtHora(h.fin)}` : null].filter(Boolean).join("  ·  ");
                  return <KVRow key={fecha} label={etiqueta} value={valor} bold />;
                })
              ) : (<>
                {horaIni && <KVRow label="Inicio del evento" value={horaIni} bold />}
                {horaFin && <KVRow label="Fin / desmontaje" value={horaFin} />}
              </>)}
            </View>
            {data.indicacionesAcceso && (
              <View style={{ marginTop: 6 }}>
                <Text style={s.kvLabel}>Indicaciones de acceso al venue</Text>
                <View style={{ backgroundColor: "#fffbf5", borderLeftWidth: 2, borderLeftColor: C.dorado, borderLeftStyle: "solid", padding: 6, borderRadius: 2, marginTop: 2 }}>
                  <Text style={s.tblTxt}>{data.indicacionesAcceso}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 4. CRONOLOGÍA */}
        {cronConDatos.length > 0 && (
          <View style={base.section}>
            <SeccionHeader num="4" titulo="Cronología del Evento" />
            {esMultidiaCrono ? (
              agruparPorDia(cronConDatos, diasCrono)
                .filter(g => g.rows.length > 0)
                .map(g => (
                  <View key={g.fecha} style={{ marginBottom: 8 }}>
                    <Text style={[s.diaLabel, { textTransform: "capitalize" }]}>Día {g.numero} · {fmtDiaCrono(g.fecha)}</Text>
                    <View style={s.tbl}>
                      <View style={s.tblHd}>
                        <Text style={[s.tblHdTxt, { width: 50 }]}>Hora</Text>
                        <Text style={[s.tblHdTxt, { width: 50 }]}>Fin</Text>
                        <Text style={[s.tblHdTxt, { flex: 1 }]}>Actividad</Text>
                        <Text style={[s.tblHdTxt, { width: 90 }]}>Responsable</Text>
                      </View>
                      {cronoFilasDoc(g.rows)}
                    </View>
                  </View>
                ))
            ) : (
              <View style={s.tbl}>
                <View style={s.tblHd}>
                  <Text style={[s.tblHdTxt, { width: 50 }]}>Hora</Text>
                  <Text style={[s.tblHdTxt, { width: 50 }]}>Fin</Text>
                  <Text style={[s.tblHdTxt, { flex: 1 }]}>Actividad</Text>
                  <Text style={[s.tblHdTxt, { width: 90 }]}>Responsable</Text>
                </View>
                {cronoFilasDoc(cronConDatos)}
              </View>
            )}
          </View>
        )}

        {/* 5. TRASLADOS */}
        {transConDatos.length > 0 && (
          <View style={base.section}>
            <SeccionHeader num="5" titulo="Traslados y Vehículos" />
            <View style={s.tbl}>
              <View style={s.tblHd}>
                <Text style={[s.tblHdTxt, { flex: 1 }]}>Vehículo</Text>
                <Text style={[s.tblHdTxt, { flex: 1 }]}>Chofer</Text>
                <Text style={[s.tblHdTxt, { width: 50 }]}>Salida</Text>
                <Text style={[s.tblHdTxt, { flex: 1 }]}>Notas</Text>
              </View>
              {transConDatos.map((t, i) => (
                <View key={i} style={i < transConDatos.length - 1 ? s.tblRow : s.tblRowLast} wrap={false}>
                  <Text style={[s.tblTxt, { flex: 1 }]}>{t.vehiculoNombre ?? t.vehiculoId}</Text>
                  <Text style={[s.tblTxt, { flex: 1 }]}>{t.choferNombre ?? t.choferId}</Text>
                  <Text style={[s.tblTxt, { width: 50 }]}>{fmtHora(t.horaSalida)}</Text>
                  <Text style={[s.tblTxtMuted, { flex: 1 }]}>{t.comentarios}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 6. RIDER — EQUIPOS PROPIOS */}
        {equiposPropios.length > 0 && (
          <View style={base.section}>
            <SeccionHeader num="6" titulo="Rider — Equipos Propios" />
            <View style={s.tbl}>
              <View style={s.tblHd}>
                <Text style={[s.tblHdTxt, { width: 36 }]}>Cant.</Text>
                <Text style={[s.tblHdTxt, { flex: 1 }]}>Descripción</Text>
                <Text style={[s.tblHdTxt, { width: 80 }]}>Categoría</Text>
              </View>
              {Array.from(gruposPropios.entries()).map(([cat, items]) => (
                <React.Fragment key={cat}>
                  <View style={s.catRow}><Text style={s.catTxt}>{cat}</Text></View>
                  {items.map((e, i) => (
                    <View key={i} style={s.tblRow} wrap={false}>
                      <Text style={[s.tblTxt, { width: 36 }]}>{e.cantidad}</Text>
                      <Text style={[s.tblTxt, { flex: 1 }]}>{e.descripcion}{e.marca ? ` — ${e.marca}` : ""}</Text>
                      <Text style={[s.tblTxtMuted, { width: 80 }]}>{cat}</Text>
                    </View>
                  ))}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* 7. EQUIPO EXTERNO */}
        {equiposExternos.length > 0 && (
          <View style={base.section}>
            <SeccionHeader num="7" titulo="Equipo Externo / Subrentas" />
            <View style={s.tbl}>
              <View style={s.tblHd}>
                <Text style={[s.tblHdTxt, { width: 36 }]}>Cant.</Text>
                <Text style={[s.tblHdTxt, { flex: 1 }]}>Descripción</Text>
                <Text style={[s.tblHdTxt, { flex: 1 }]}>Proveedor</Text>
                <Text style={[s.tblHdTxt, { width: 60 }]}>Estado</Text>
              </View>
              {Array.from(gruposExternos.entries()).flatMap(([, items]) =>
                items.map((e, i) => (
                  <View key={i} style={s.tblRow} wrap={false}>
                    <Text style={[s.tblTxt, { width: 36 }]}>{e.cantidad}</Text>
                    <Text style={[s.tblTxt, { flex: 1 }]}>{e.descripcion}</Text>
                    <Text style={[s.tblTxtMuted, { flex: 1 }]}>{e.proveedor ?? "—"}</Text>
                    <Text style={[e.confirmado ? s.chipOk : s.chipPend, { width: 60 }]}>
                      {e.confirmado ? "Confirmado" : "Pendiente"}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* 8. PROVEEDORES Y SUBRENTAS */}
        {todosProveedores.length > 0 && (
          <View style={base.section}>
            <SeccionHeader num="8" titulo="Proveedores y Subrentas" />
            <View style={s.tbl}>
              <View style={s.tblHd}>
                <Text style={[s.tblHdTxt, { flex: 1 }]}>Proveedor</Text>
                <Text style={[s.tblHdTxt, { flex: 1 }]}>Equipo / Servicio</Text>
                <Text style={[s.tblHdTxt, { width: 90 }]}>Teléfono</Text>
              </View>
              {todosProveedores.map((p, i) => (
                <View key={i} style={i < todosProveedores.length - 1 ? s.tblRow : s.tblRowLast} wrap={false}>
                  <Text style={[s.tblTxt, { flex: 1, fontFamily: "Helvetica-Bold" }]}>{p.nombre}</Text>
                  <Text style={[s.tblTxtMuted, { flex: 1 }]}>{p.servicio ?? "—"}</Text>
                  <Text style={[s.tblTxtMuted, { width: 90 }]}>{p.telefono ?? "—"}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 9. PERSONAL TÉCNICO — agrupado por jornada/fecha */}
        {data.personal.length > 0 && (() => {
          // Agrupar por fechaJornada (YYYY-MM-DD) → "2025-06-14" o null
          const grupos = new Map<string, PersonalItem[]>();
          for (const p of data.personal) {
            const key = p.fechaJornada ?? '__sin_fecha__';
            if (!grupos.has(key)) grupos.set(key, []);
            grupos.get(key)!.push(p);
          }
          // Ordenar grupos: fechas primero (asc), luego sin fecha
          const keys = Array.from(grupos.keys()).sort((a, b) => {
            if (a === '__sin_fecha__') return 1;
            if (b === '__sin_fecha__') return -1;
            return a.localeCompare(b);
          });
          const tieneMultiplesFechas = keys.filter(k => k !== '__sin_fecha__').length > 0 && keys.length > 1;
          const fmtJornada = (yyyymmdd: string): string => {
            try {
              return new Date(yyyymmdd + 'T12:00:00Z').toLocaleDateString('es-MX', {
                timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
              });
            } catch { return yyyymmdd; }
          };
          const PART: Record<string, string> = {
            OPERACION: 'Operación', MONTAJE: 'Montaje', DESMONTAJE: 'Desmontaje',
            TRANSPORTE: 'Transporte', OTRO: 'Otro',
          };
          return (
            <View style={base.section}>
              <SeccionHeader num="9" titulo="Personal Técnico" />
              {keys.map((key) => {
                const items = grupos.get(key)!;
                return (
                  <View key={key}>
                    {tieneMultiplesFechas && (
                      <View wrap={false} style={{
                        backgroundColor: key === '__sin_fecha__' ? '#f1f1f1' : '#0d0d0d',
                        paddingVertical: 4, paddingHorizontal: 8,
                        borderRadius: 3, marginBottom: 2, marginTop: 6,
                      }}>
                        <Text style={{
                          fontSize: 7, fontFamily: 'Helvetica-Bold',
                          color: key === '__sin_fecha__' ? '#5a5a5a' : '#ffffff',
                          textTransform: 'uppercase', letterSpacing: 0.8,
                        }}>
                          {key === '__sin_fecha__' ? 'Todas las jornadas' : fmtJornada(key)}
                        </Text>
                      </View>
                    )}
                    <View style={s.tbl}>
                      <View style={s.tblHd}>
                        <Text style={[s.tblHdTxt, { flex: 1 }]}>Nombre</Text>
                        <Text style={[s.tblHdTxt, { flex: 1 }]}>Rol en el evento</Text>
                        {tieneMultiplesFechas && <Text style={[s.tblHdTxt, { width: 70 }]}>Jornada</Text>}
                        <Text style={[s.tblHdTxt, { width: 90 }]}>Celular</Text>
                        <Text style={[s.tblHdTxt, { width: 60 }]}>Estado</Text>
                      </View>
                      {items.map((p, i) => (
                        <View key={i} style={i < items.length - 1 ? s.tblRow : s.tblRowLast} wrap={false}>
                          <Text style={[s.tblTxt, { flex: 1, fontFamily: 'Helvetica-Bold' }]}>{p.nombre}</Text>
                          <Text style={[s.tblTxtMuted, { flex: 1 }]}>
                            {p.rolEnEvento ?? p.rolTecnico ?? '—'}
                            {p.participacion && p.participacion !== 'OPERACION' ? ` · ${PART[p.participacion] ?? p.participacion}` : ''}
                          </Text>
                          {tieneMultiplesFechas && (
                            <Text style={[s.tblTxtMuted, { width: 70 }]}>{p.jornada ?? '—'}</Text>
                          )}
                          <Text style={[s.tblTxtMuted, { width: 90 }]}>{p.celular ?? '—'}</Text>
                          <Text style={[p.confirmado ? s.chipOk : s.chipPend, { width: 60 }]}>
                            {p.confirmado ? 'Confirmado' : 'Pendiente'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })()}


        {/* 10. ARCHIVOS OPERATIVOS */}
        {data.archivos.length > 0 && (
          <View style={base.section}>
            <SeccionHeader num="10" titulo="Archivos Operativos" />
            <View style={s.tbl}>
              <View style={s.tblHd}>
                <Text style={[s.tblHdTxt, { width: 80 }]}>Tipo</Text>
                <Text style={[s.tblHdTxt, { flex: 1 }]}>Nombre</Text>
                <Text style={[s.tblHdTxt, { flex: 1 }]}>URL</Text>
              </View>
              {data.archivos.map((a, i) => (
                <View key={i} style={i < data.archivos.length - 1 ? s.tblRow : s.tblRowLast} wrap={false}>
                  <Text style={[s.tblTxtMuted, { width: 80 }]}>{ARCHIVO_TIPO[a.tipo] ?? a.tipo}</Text>
                  <Text style={[s.tblTxt, { flex: 1 }]}>{a.nombre}</Text>
                  <Text style={[{ fontSize: 6.5, color: "#1a73e8", flex: 1 }]}>{a.url}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 11. DOCUMENTOS DEL SHOW */}
        {(soundcheckConDatos.length > 0 || programaConDatos.length > 0 || coordProvConDatos.length > 0) && (
          <View style={base.section}>
            <SeccionHeader num="11" titulo="Documentos del Show" />
            {soundcheckConDatos.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={[s.kvLabel, { marginBottom: 4 }]}>Orden de Soundcheck</Text>
                <View style={s.tbl}>
                  <View style={s.tblHd}>
                    <Text style={[s.tblHdTxt, { width: 50 }]}>Hora</Text>
                    <Text style={[s.tblHdTxt, { flex: 1 }]}>Artista / Act</Text>
                    <Text style={[s.tblHdTxt, { width: 60 }]}>Duración</Text>
                    <Text style={[s.tblHdTxt, { flex: 1 }]}>Notas</Text>
                  </View>
                  {soundcheckConDatos.map((r, i) => (
                    <View key={i} style={i < soundcheckConDatos.length - 1 ? s.tblRow : s.tblRowLast} wrap={false}>
                      <Text style={[s.tblTxt, { width: 50 }]}>{r.hora}</Text>
                      <Text style={[s.tblTxt, { flex: 1 }]}>{r.artista}</Text>
                      <Text style={[s.tblTxtMuted, { width: 60 }]}>{r.duracion}</Text>
                      <Text style={[s.tblTxtMuted, { flex: 1 }]}>{r.notas}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {programaConDatos.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={[s.kvLabel, { marginBottom: 4 }]}>Programa General del Evento</Text>
                <View style={s.tbl}>
                  <View style={s.tblHd}>
                    <Text style={[s.tblHdTxt, { width: 50 }]}>Hora</Text>
                    <Text style={[s.tblHdTxt, { flex: 1 }]}>Actividad</Text>
                    <Text style={[s.tblHdTxt, { width: 90 }]}>Responsable</Text>
                    <Text style={[s.tblHdTxt, { flex: 1 }]}>Notas</Text>
                  </View>
                  {programaConDatos.map((r, i) => (
                    <View key={i} style={i < programaConDatos.length - 1 ? s.tblRow : s.tblRowLast} wrap={false}>
                      <Text style={[s.tblTxt, { width: 50 }]}>{r.hora}</Text>
                      <Text style={[s.tblTxt, { flex: 1 }]}>{r.actividad}</Text>
                      <Text style={[s.tblTxtMuted, { width: 90 }]}>{r.responsable}</Text>
                      <Text style={[s.tblTxtMuted, { flex: 1 }]}>{r.notas}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {coordProvConDatos.length > 0 && (
              <View>
                <Text style={[s.kvLabel, { marginBottom: 4 }]}>Coordinación de Proveedores</Text>
                <View style={s.tbl}>
                  <View style={s.tblHd}>
                    <Text style={[s.tblHdTxt, { flex: 1 }]}>Proveedor</Text>
                    <Text style={[s.tblHdTxt, { width: 90 }]}>Contacto</Text>
                    <Text style={[s.tblHdTxt, { width: 60 }]}>Horario</Text>
                    <Text style={[s.tblHdTxt, { flex: 1 }]}>Notas</Text>
                  </View>
                  {coordProvConDatos.map((r, i) => (
                    <View key={i} style={i < coordProvConDatos.length - 1 ? s.tblRow : s.tblRowLast} wrap={false}>
                      <Text style={[s.tblTxt, { flex: 1 }]}>{r.proveedor}</Text>
                      <Text style={[s.tblTxtMuted, { width: 90 }]}>{r.contacto}</Text>
                      <Text style={[s.tblTxtMuted, { width: 60 }]}>{r.horario}</Text>
                      <Text style={[s.tblTxtMuted, { flex: 1 }]}>{r.notas}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* 12. ESTADO DE PREPARACIÓN */}
        <View style={base.section}>
          <SeccionHeader num="12" titulo="Estado de Preparación" />
          <View style={s.tbl}>
            <View style={s.tblHd}>
              <Text style={[s.tblHdTxt, { flex: 1 }]}>Ítem</Text>
              <Text style={[s.tblHdTxt, { flex: 1 }]}>Estado</Text>
            </View>
            {[
              { label: "Personal asignado", val: `${personalConf}/${data.personal.length} confirmados` },
              { label: "Equipos confirmados", val: `${equipConf}/${data.equipos.length} confirmados` },
              { label: "Anticipo", val: anticipo ? (anticipo.montoCobrado >= anticipo.monto ? "Cobrado ✓" : `$${anticipo.montoCobrado.toLocaleString()} / $${anticipo.monto.toLocaleString()}`) : "Sin esquema" },
              { label: "Liquidación", val: liquidacion ? (liquidacion.montoCobrado >= liquidacion.monto ? "Cobrada ✓" : `$${liquidacion.montoCobrado.toLocaleString()} / $${liquidacion.monto.toLocaleString()}`) : "Sin esquema" },
              { label: "Checklist operativo", val: checkTotal > 0 ? `${checkOk}/${checkTotal} completados` : "Sin ítems" },
            ].map((item, i, arr) => (
              <View key={i} style={i < arr.length - 1 ? s.tblRow : s.tblRowLast} wrap={false}>
                <Text style={[s.tblTxt, { flex: 1 }]}>{item.label}</Text>
                <Text style={[s.tblTxtMuted, { flex: 1 }]}>{item.val}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 13. NOTAS */}
        {(data.descripcionGeneral || data.tratoNotas || data.comentariosFinales || data.indicacionesCliente || data.detallesEspecificos) && (
          <View style={base.section}>
            <SeccionHeader num="13" titulo="Notas" />
            {data.descripcionGeneral && (
              <View style={s.notasBox}>
                <Text style={s.notasLabel}>Descripción general</Text>
                <Text style={s.notasText}>{data.descripcionGeneral}</Text>
              </View>
            )}
            {data.tratoNotas && (
              <View style={s.notasBox}>
                <Text style={s.notasLabel}>Notas del descubrimiento</Text>
                <Text style={s.notasText}>{data.tratoNotas}</Text>
              </View>
            )}
            {data.detallesEspecificos && (
              <View style={s.notasBox}>
                <Text style={s.notasLabel}>Detalles específicos</Text>
                <Text style={s.notasText}>{data.detallesEspecificos}</Text>
              </View>
            )}
            {data.comentariosFinales && (
              <View style={s.notasBox}>
                <Text style={s.notasLabel}>Comentarios finales</Text>
                <Text style={s.notasText}>{data.comentariosFinales}</Text>
              </View>
            )}
            {data.indicacionesCliente && (
              <View style={s.notasBox}>
                <Text style={s.notasLabel}>Indicaciones para el cliente</Text>
                <Text style={s.notasText}>{data.indicacionesCliente}</Text>
              </View>
            )}
          </View>
        )}

        {/* FOOTER */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>Mainstage Pro · Ficha operativa — uso interno confidencial</Text>
          <Text style={s.footerTxt}>{data.numeroProyecto} · {nowStr()}</Text>
        </View>

      </Page>
    </Document>
  );
}
