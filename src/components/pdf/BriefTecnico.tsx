/**
 * BriefTecnico.tsx — Info para Técnicos (Mainstage Pro)
 * Documento de uso interno para el equipo técnico que va al evento.
 * Comunica los generales: llamado, fechas, horarios, montaje, lugar, contactos, notas.
 * Diseño alineado con la Ficha Técnica (acentos dorados) pero simplificado.
 */
import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { C, base } from "./PdfShared";

// ─── Helper: formatear fecha en español ───────────────────────────────────────
function formatFechaES(date: Date | string | null | undefined): string {
  if (!date) return "Por definir";
  try {
    const d = new Date(date);
    return d
      .toLocaleDateString("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
      .replace(/^./, (c) => c.toUpperCase());
  } catch {
    return String(date);
  }
}

function formatHoraES(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  try {
    return new Date(date).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  } catch {
    return null;
  }
}

// ─── Estilos locales B&W ──────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#000000",
    paddingHorizontal: 30,
    paddingVertical: 18,
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 7.5,
    color: "#999999",
    marginTop: 3,
    letterSpacing: 0.8,
  },
  headerRight: { alignItems: "flex-end" },
  headerProyecto: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#cccccc",
  },
  headerFecha: { fontSize: 7.5, color: "#999999", marginTop: 2 },
  logoImg: { width: 80, height: 22, objectFit: "contain", marginBottom: 6 },
  // Separador dorado fino
  goldLine: {
    height: 2,
    backgroundColor: "#B3985B",
  },
  // Cuerpo
  body: { paddingHorizontal: 28, paddingTop: 14 },
  // Sección
  section: { marginBottom: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#B3985B",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#B3985B",
    opacity: 0.5,
    marginLeft: 10,
  },
  // Caja destacada del llamado (hero)
  llamadoBox: {
    flexDirection: "row",
    backgroundColor: "#000000",
    borderLeftWidth: 3,
    borderLeftColor: "#B3985B",
    borderLeftStyle: "solid",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 3,
    marginBottom: 14,
  },
  llamadoCol: { flex: 1, paddingRight: 12 },
  llamadoLabel: {
    fontSize: 6.5,
    color: "#B3985B",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },
  llamadoVal: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  llamadoValSm: { fontSize: 9, color: "#dddddd" },
  // Grid KV
  kvGrid: { flexDirection: "row", flexWrap: "wrap" },
  kvCell: { width: "50%", paddingRight: 10, marginBottom: 5 },
  kvCellFull: { width: "100%", marginBottom: 5 },
  kvLabel: {
    fontSize: 6.5,
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1.5,
  },
  kvVal: { fontSize: 8.5, color: "#000000" },
  kvValBold: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#000000" },
  // Caja de texto
  textBox: {
    backgroundColor: "#f0f0f0",
    borderLeftWidth: 2,
    borderLeftColor: "#333333",
    borderLeftStyle: "solid",
    padding: 8,
    borderRadius: 2,
    marginTop: 2,
  },
  textBoxContent: { fontSize: 8.5, color: "#000000", lineHeight: 1.55 },
  // Footer
  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e0e0e0",
    borderTopStyle: "solid",
    paddingTop: 5,
  },
  footerTxt: { fontSize: 6.5, color: "#999999" },
  footerLogoImg: { width: 55, height: 14, objectFit: "contain" },
});

// ─── Componentes ─────────────────────────────────────────────────────────────

function KV({
  label,
  value,
  bold,
  full,
}: {
  label: string;
  value?: string | null;
  bold?: boolean;
  full?: boolean;
}) {
  if (!value) return null;
  return (
    <View style={full ? s.kvCellFull : s.kvCell}>
      <Text style={s.kvLabel}>{label}</Text>
      <Text style={bold ? s.kvValBold : s.kvVal}>{value}</Text>
    </View>
  );
}

function SecTitle({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionLine} />
    </View>
  );
}

// ─── Interface ────────────────────────────────────────────────────────────────
export interface BriefTecnicoData {
  proyecto: {
    id: string;
    nombre: string;
    numeroProyecto: string;
    tipoEvento: string;
    tipoServicio: string | null;
    fechaEvento: Date | string;
    horaInicioEvento: string | null;
    horaFinEvento: string | null;
    fechaMontaje: Date | string | null;
    horaInicioMontaje: string | null;
    duracionMontajeHrs: number | null;
    horaSalidaBodega: string | null;
    puntoSalidaBodega: string | null;
    horaDesmontaje: string | null;
    llamadoBodega: Date | string | null;
    lugarLlamado: string | null;
    lugarEvento: string | null;
    direccionVenue: string | null;
    linkMaps: string | null;
    indicacionesAcceso: string | null;
    encargadoLugar: string | null;
    encargadoLugarContacto: string | null;
    encargadoCliente: string | null;
    encargadoClienteContacto: string | null;
    contactosEmergencia: string | null;
    transportes: string | null;
    choferNombre: string | null;
    comentariosFinales: string | null;
    notasBriefTecnico: string | null;
    cliente: { nombre: string; empresa: string | null };
    encargado: { name: string } | null;
  };
  logoSrc: string | null;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function BriefTecnico({ proyecto, logoSrc }: BriefTecnicoData) {
  const p = proyecto;

  // Fecha generación
  const hoy = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Tipo evento / servicio mapeado
  const TIPO_EVENTO_MAP: Record<string, string> = {
    MUSICAL: "Musical",
    SOCIAL: "Social",
    EMPRESARIAL: "Empresarial",
    OTRO: "Otro",
  };
  const TIPO_SERVICIO_MAP: Record<string, string> = {
    PRODUCCION_TECNICA: "Producción técnica integral",
    RENTA: "Renta de equipo",
    DIRECCION_TECNICA: "Dirección técnica",
  };

  const tipoEventoLabel = TIPO_EVENTO_MAP[p.tipoEvento] ?? p.tipoEvento;
  const tipoServicioLabel = p.tipoServicio
    ? (TIPO_SERVICIO_MAP[p.tipoServicio] ?? p.tipoServicio)
    : null;

  // Cliente
  const clienteStr = p.cliente.empresa
    ? `${p.cliente.nombre} (${p.cliente.empresa})`
    : p.cliente.nombre;

  // Fechas
  const fechaEventoStr = formatFechaES(p.fechaEvento);
  const fechaMontajeStr = formatFechaES(p.fechaMontaje);
  const llamadoFechaStr = p.llamadoBodega ? formatFechaES(p.llamadoBodega) : null;
  const llamadoHoraStr = formatHoraES(p.llamadoBodega);
  const hasLlamado = !!(llamadoFechaStr || llamadoHoraStr || p.lugarLlamado);

  // Transportes: intentar parsear JSON, mostrar representación legible
  let transportesStr: string | null = null;
  if (p.transportes) {
    try {
      const parsed = JSON.parse(p.transportes);
      if (Array.isArray(parsed)) {
        // Es un array (podría ser array de slots)
        const lineas: string[] = [];
        parsed.forEach((item: Record<string, unknown>, idx: number) => {
          if (item.vehiculoNombre || item.choferId || item.comentarios) {
            const partes: string[] = [];
            if (item.vehiculoNombre) partes.push(String(item.vehiculoNombre));
            if (item.choferId) partes.push(`Chofer: ${item.choferId}`);
            if (item.horaSalida) partes.push(`Salida: ${item.horaSalida}`);
            if (item.comentarios) partes.push(String(item.comentarios));
            lineas.push(`Vehículo ${idx + 1}: ${partes.join(" · ")}`);
          }
        });
        transportesStr = lineas.length > 0 ? lineas.join("\n") : p.transportes;
      } else {
        transportesStr = p.transportes;
      }
    } catch {
      transportesStr = p.transportes;
    }
  }

  // Sección Lugar y Acceso: mostrar si alguno tiene valor
  const hasLugar =
    p.lugarEvento || p.direccionVenue || p.linkMaps || p.indicacionesAcceso;

  // Sección Contactos: mostrar si alguno tiene valor
  const hasContactos =
    p.encargadoLugar ||
    p.encargadoLugarContacto ||
    p.encargadoCliente ||
    p.encargadoClienteContacto ||
    p.contactosEmergencia;

  // Sección Transporte
  const hasTransporte = transportesStr || p.choferNombre;

  // Sección Notas
  const hasNotas = p.notasBriefTecnico || p.comentariosFinales;

  return (
    <Document
      title={`Info para Técnicos — ${p.nombre}`}
      author="Mainstage Pro"
      subject={`Info para técnicos ${p.numeroProyecto}`}
    >
      <Page
        size="LETTER"
        orientation="portrait"
        style={{ backgroundColor: "#ffffff", fontFamily: "Helvetica", fontSize: 8.5, color: "#000000", paddingBottom: 44 }}
      >
        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {logoSrc && <Image src={logoSrc} style={s.logoImg} />}
            <Text style={s.headerTitle}>INFO PARA TÉCNICOS</Text>
            <Text style={s.headerSub}>Generales del evento · Equipo técnico</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerProyecto}>{p.numeroProyecto}</Text>
            <Text style={s.headerFecha}>Generado: {hoy}</Text>
          </View>
        </View>

        {/* Línea dorada */}
        <View style={s.goldLine} />

        {/* ── BODY ── */}
        <View style={s.body}>

          {/* 0. LLAMADO (destacado, siempre al inicio) */}
          {hasLlamado && (
            <View style={s.llamadoBox}>
              {(llamadoFechaStr || llamadoHoraStr) && (
                <View style={s.llamadoCol}>
                  <Text style={s.llamadoLabel}>Llamado</Text>
                  <Text style={s.llamadoVal}>{llamadoHoraStr ?? "Por definir"}</Text>
                  {llamadoFechaStr && <Text style={s.llamadoValSm}>{llamadoFechaStr}</Text>}
                </View>
              )}
              {p.lugarLlamado && (
                <View style={s.llamadoCol}>
                  <Text style={s.llamadoLabel}>Lugar de llamado</Text>
                  <Text style={s.llamadoVal}>{p.lugarLlamado}</Text>
                </View>
              )}
            </View>
          )}

          {/* 1. DATOS DEL EVENTO */}
          <View style={s.section}>
            <SecTitle title="Datos del Evento" />
            <View style={s.kvGrid}>
              <KV label="Proyecto" value={p.nombre} bold full />
              <KV label="Tipo de evento" value={tipoEventoLabel} />
              <KV label="Tipo de servicio" value={tipoServicioLabel} />
              <KV label="Cliente" value={clienteStr} />
              <KV label="Coordinador Mainstage" value={p.encargado?.name} />
            </View>
          </View>

          {/* 2. FECHAS Y HORARIOS */}
          <View style={s.section}>
            <SecTitle title="Fechas y Horarios" />
            <View style={s.kvGrid}>
              <KV label="Fecha del evento" value={fechaEventoStr} bold full />
              <KV label="Hora inicio" value={p.horaInicioEvento} />
              <KV label="Hora fin" value={p.horaFinEvento} />
              <KV label="Hora de desmontaje" value={p.horaDesmontaje} />
            </View>
          </View>

          {/* 3. MONTAJE */}
          <View style={s.section}>
            <SecTitle title="Montaje y Logística de Salida" />
            <View style={s.kvGrid}>
              <KV label="Fecha de montaje" value={fechaMontajeStr} bold full />
              <KV label="Hora de salida de bodega" value={p.horaSalidaBodega} />
              <KV label="Punto de salida" value={p.puntoSalidaBodega} />
              <KV label="Hora inicio montaje" value={p.horaInicioMontaje} />
              {p.duracionMontajeHrs != null && (
                <KV
                  label="Duración estimada montaje"
                  value={`${p.duracionMontajeHrs} hrs`}
                />
              )}
            </View>
          </View>

          {/* 4. LUGAR Y ACCESO (condicional) */}
          {hasLugar && (
            <View style={s.section}>
              <SecTitle title="Lugar y Acceso" />
              <View style={s.kvGrid}>
                <KV label="Lugar del evento" value={p.lugarEvento} bold full />
                <KV label="Dirección" value={p.direccionVenue} full />
                <KV label="Google Maps" value={p.linkMaps} full />
              </View>
              {p.indicacionesAcceso && (
                <View style={s.textBox}>
                  <Text style={[s.kvLabel, { marginBottom: 3 }]}>Indicaciones de acceso</Text>
                  <Text style={s.textBoxContent}>{p.indicacionesAcceso}</Text>
                </View>
              )}
            </View>
          )}

          {/* 5. CONTACTOS (condicional) */}
          {hasContactos && (
            <View style={s.section}>
              <SecTitle title="Contactos Clave" />
              <View style={s.kvGrid}>
                {(p.encargadoLugar || p.encargadoLugarContacto) && (
                  <KV
                    label="Encargado del lugar"
                    value={[p.encargadoLugar, p.encargadoLugarContacto]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                )}
                {(p.encargadoCliente || p.encargadoClienteContacto) && (
                  <KV
                    label="Encargado del cliente"
                    value={[p.encargadoCliente, p.encargadoClienteContacto]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                )}
              </View>
              {p.contactosEmergencia && (
                <View style={[s.textBox, { marginTop: 4 }]}>
                  <Text style={[s.kvLabel, { marginBottom: 3 }]}>Contactos de emergencia</Text>
                  <Text style={s.textBoxContent}>{p.contactosEmergencia}</Text>
                </View>
              )}
            </View>
          )}

          {/* 6. TRANSPORTE (condicional) */}
          {hasTransporte && (
            <View style={s.section}>
              <SecTitle title="Transporte" />
              <View style={s.kvGrid}>
                <KV label="Chofer" value={p.choferNombre} />
              </View>
              {transportesStr && (
                <View style={s.textBox}>
                  <Text style={[s.kvLabel, { marginBottom: 3 }]}>Vehículos</Text>
                  <Text style={s.textBoxContent}>{transportesStr}</Text>
                </View>
              )}
            </View>
          )}

          {/* 7. NOTAS PARA EL TÉCNICO (condicional) */}
          {hasNotas && (
            <View style={s.section}>
              <SecTitle title="Notas para el Técnico" />
              {p.notasBriefTecnico && (
                <View style={s.textBox}>
                  <Text style={s.textBoxContent}>{p.notasBriefTecnico}</Text>
                </View>
              )}
              {p.comentariosFinales && (
                <View style={[s.textBox, { marginTop: 6 }]}>
                  <Text style={[s.kvLabel, { marginBottom: 3 }]}>Comentarios finales</Text>
                  <Text style={s.textBoxContent}>{p.comentariosFinales}</Text>
                </View>
              )}
            </View>
          )}

        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>
            Mainstage Pro · Documento de uso interno · {p.numeroProyecto}
          </Text>
          {logoSrc && <Image src={logoSrc} style={s.footerLogoImg} />}
        </View>
      </Page>
    </Document>
  );
}
