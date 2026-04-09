import React from "react";
import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";

// ─── Paleta ──────────────────────────────────────────────────────────────────
const GOLD = "#B3985B";
const BLACK = "#0a0a0a";
const DARK = "#111111";
const GRAY = "#4a4a4a";
const LIGHT_GRAY = "#888888";
const WHITE = "#FFFFFF";
const BG_SECTION = "#F7F5F0";
const BG_ALT = "#EEECE8";

// ─── Estilos ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
    fontSize: 9,
    color: BLACK,
  },
  // Header negro con oro
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingBottom: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 2,
    marginBottom: 3,
  },
  tagline: {
    fontSize: 7.5,
    color: "#888888",
    letterSpacing: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    marginBottom: 2,
  },
  docNum: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    marginBottom: 2,
  },
  docEstado: {
    fontSize: 8,
    color: "#888888",
  },

  // Banda dorada separadora
  goldBand: {
    height: 3,
    backgroundColor: GOLD,
  },

  // Contenido principal
  body: {
    paddingHorizontal: 40,
    paddingTop: 24,
  },

  // Sección
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 18,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: GOLD,
    marginLeft: 10,
    opacity: 0.5,
  },
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Grid de campos info
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    marginBottom: 4,
  },
  infoBox: {
    width: "50%",
    marginBottom: 10,
    paddingRight: 16,
  },
  infoBoxFull: {
    width: "100%",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 7,
    color: LIGHT_GRAY,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 9,
    color: BLACK,
    fontFamily: "Helvetica-Bold",
  },
  infoValueNormal: {
    fontSize: 9,
    color: GRAY,
  },

  // Tabla personal
  table: {
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: DARK,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: BG_ALT,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  thText: {
    fontSize: 7.5,
    color: WHITE,
    fontFamily: "Helvetica-Bold",
  },
  tdText: {
    fontSize: 8.5,
    color: GRAY,
  },
  tdBold: {
    fontSize: 8.5,
    color: BLACK,
    fontFamily: "Helvetica-Bold",
  },
  confirmed: {
    fontSize: 7,
    color: "#2ECC71",
    fontFamily: "Helvetica-Bold",
  },
  notConfirmed: {
    fontSize: 7,
    color: LIGHT_GRAY,
  },

  // Checklist
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE8",
  },
  checkBox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: GRAY,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxDone: {
    width: 10,
    height: 10,
    backgroundColor: GOLD,
    borderWidth: 1,
    borderColor: GOLD,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    fontSize: 8.5,
    color: GRAY,
  },
  checkTextDone: {
    fontSize: 8.5,
    color: LIGHT_GRAY,
  },
  checkMark: {
    fontSize: 6,
    color: BLACK,
    fontFamily: "Helvetica-Bold",
  },

  // Texto libre (cronograma, notas)
  freeText: {
    fontSize: 8.5,
    color: GRAY,
    lineHeight: 1.5,
    backgroundColor: BG_SECTION,
    padding: 10,
    borderRadius: 3,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E8E4DC",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: "#BBBBBB",
  },
  footerGold: {
    fontSize: 7,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
  },

  // Badge estado
  estadoBadge: {
    backgroundColor: GOLD,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  estadoText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
  },
});

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface PersonalItem {
  id: string;
  confirmado: boolean;
  participacion: string | null;
  nivel: string | null;
  jornada: string | null;
  responsabilidad: string | null;
  tarifaAcordada: number | null;
  estadoPago: string;
  notas: string | null;
  tecnico: { nombre: string; rol: { nombre: string } | null } | null;
  rolTecnico: { nombre: string } | null;
}

interface EquipoItem {
  id: string;
  tipo: string;
  cantidad: number;
  dias: number;
  costoExterno: number | null;
  confirmado: boolean;
  equipo: {
    descripcion: string;
    marca: string | null;
    categoria: { nombre: string };
  };
}

interface CheckItem {
  id: string;
  item: string;
  completado: boolean;
  orden: number;
}

export interface FichaTecnicaData {
  id: string;
  numeroProyecto: string;
  nombre: string;
  estado: string;
  tipoEvento: string;
  tipoServicio: string | null;
  fechaEvento: string;
  horaInicioEvento: string | null;
  horaFinEvento: string | null;
  fechaMontaje: string | null;
  horaInicioMontaje: string | null;
  duracionMontajeHrs: number | null;
  lugarEvento: string | null;
  encargadoLugar: string | null;
  encargadoLugarContacto: string | null;
  encargadoCliente: string | null;
  descripcionGeneral: string | null;
  detallesEspecificos: string | null;
  transportes: string | null;
  proveedorCatering: string | null;
  cronograma: string | null;
  contactosDireccion: string | null;
  contactosEmergencia: string | null;
  comentariosFinales: string | null;
  cliente: {
    nombre: string;
    empresa: string | null;
    telefono: string | null;
    correo: string | null;
  };
  encargado: { name: string } | null;
  cotizacion: { numeroCotizacion: string; granTotal: number } | null;
  personal: PersonalItem[];
  equipos: EquipoItem[];
  checklist: CheckItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function labelEstado(e: string): string {
  const m: Record<string, string> = {
    PLANEACION: "Planeación",
    CONFIRMADO: "Confirmado",
    EN_CURSO: "En curso",
    COMPLETADO: "Completado",
    CANCELADO: "Cancelado",
  };
  return m[e] ?? e;
}

// ─── Sección heading ─────────────────────────────────────────────────────────
function SectionTitle({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionLine} />
    </View>
  );
}

// ─── Campo info ──────────────────────────────────────────────────────────────
function InfoField({ label, value, full = false, bold = true }: {
  label: string; value: string | null | undefined; full?: boolean; bold?: boolean;
}) {
  return (
    <View style={full ? s.infoBoxFull : s.infoBox}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={bold ? s.infoValue : s.infoValueNormal}>{value || "—"}</Text>
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function FichaTecnicaPDF({ proyecto }: { proyecto: FichaTecnicaData }) {
  // Agrupar personal por participación
  const PARTICIPACION_LABELS: Record<string, string> = {
    OPERACION: "Operadores del evento",
    MONTAJE: "Técnicos de montaje",
    DESMONTAJE: "Técnicos de desmontaje",
    TRANSPORTE: "Transportes",
    OTRO: "Otros",
  };
  const personalAgrupado = proyecto.personal.reduce((acc, p) => {
    const grupo = PARTICIPACION_LABELS[p.participacion ?? "OPERACION"] ?? "Operadores del evento";
    if (!acc[grupo]) acc[grupo] = [];
    acc[grupo].push(p);
    return acc;
  }, {} as Record<string, PersonalItem[]>);

  // Agrupar equipos por categoría
  const equiposAgrupados = proyecto.equipos.reduce((acc, e) => {
    const cat = e.tipo === "EXTERNO" ? `${e.equipo.categoria.nombre} (Externo)` : e.equipo.categoria.nombre;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(e);
    return acc;
  }, {} as Record<string, EquipoItem[]>);

  const checkDone = proyecto.checklist.filter(c => c.completado).length;
  const checkTotal = proyecto.checklist.length;

  const generadoEl = new Date().toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header} fixed>
          <View>
            <Text style={s.brand}>MAINSTAGE</Text>
            <Text style={s.tagline}>PRODUCCIONES · FICHA TÉCNICA</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>FICHA TÉCNICA</Text>
            <Text style={s.docNum}>{proyecto.numeroProyecto}</Text>
            <View style={s.estadoBadge}>
              <Text style={s.estadoText}>{labelEstado(proyecto.estado)}</Text>
            </View>
          </View>
        </View>

        {/* Banda dorada */}
        <View style={s.goldBand} fixed />

        {/* ── Cuerpo ── */}
        <View style={s.body}>

          {/* ── Info del evento ── */}
          <SectionTitle title="Información del evento" />
          <View style={s.infoGrid}>
            <InfoField label="Nombre del evento" value={proyecto.nombre} full />
            <InfoField label="Tipo de evento" value={proyecto.tipoEvento} />
            <InfoField label="Tipo de servicio" value={proyecto.tipoServicio} />
            <InfoField label="Estado" value={labelEstado(proyecto.estado)} />
            <InfoField label="Cotización ref." value={proyecto.cotizacion?.numeroCotizacion} />
          </View>

          {/* ── Fechas y lugar ── */}
          <SectionTitle title="Fechas y ubicación" />
          <View style={s.infoGrid}>
            <InfoField
              label="Fecha del evento"
              value={fmtDate(proyecto.fechaEvento)}
            />
            <InfoField
              label="Horario del evento"
              value={
                proyecto.horaInicioEvento
                  ? `${proyecto.horaInicioEvento}${proyecto.horaFinEvento ? ` – ${proyecto.horaFinEvento}` : ""}`
                  : null
              }
            />
            <InfoField
              label="Fecha de montaje"
              value={fmtDate(proyecto.fechaMontaje)}
            />
            <InfoField
              label="Hora de inicio montaje"
              value={
                proyecto.horaInicioMontaje
                  ? `${proyecto.horaInicioMontaje}${proyecto.duracionMontajeHrs ? ` (${proyecto.duracionMontajeHrs} hrs)` : ""}`
                  : null
              }
            />
            <InfoField label="Lugar del evento" value={proyecto.lugarEvento} full />
            <InfoField label="Encargado del lugar" value={proyecto.encargadoLugar} />
            <InfoField label="Contacto del lugar" value={proyecto.encargadoLugarContacto} />
          </View>

          {/* ── Cliente ── */}
          <SectionTitle title="Cliente" />
          <View style={s.infoGrid}>
            <InfoField label="Nombre" value={proyecto.cliente.nombre} />
            <InfoField label="Empresa" value={proyecto.cliente.empresa} />
            <InfoField label="Teléfono" value={proyecto.cliente.telefono} />
            <InfoField label="Correo" value={proyecto.cliente.correo} />
            {proyecto.encargadoCliente && (
              <InfoField label="Encargado de parte del cliente" value={proyecto.encargadoCliente} full />
            )}
          </View>

          {/* ── Encargado interno ── */}
          {proyecto.encargado && (
            <>
              <SectionTitle title="Coordinación interna" />
              <View style={s.infoGrid}>
                <InfoField label="Encargado del proyecto (Mainstage)" value={proyecto.encargado.name} />
              </View>
            </>
          )}

          {/* ── Personal ── */}
          {proyecto.personal.length > 0 && (
            <>
              <SectionTitle title={`Personal técnico (${proyecto.personal.length})`} />

              {Object.entries(personalAgrupado).map(([rol, personas]) => (
                <View key={rol} style={{ marginBottom: 10 }}>
                  <View style={{ backgroundColor: "#E8E4DC", paddingHorizontal: 8, paddingVertical: 4, marginBottom: 0 }}>
                    <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.8 }}>
                      {rol} ({personas.length})
                    </Text>
                  </View>
                  <View style={s.table}>
                    <View style={s.tableHeader}>
                      <Text style={[s.thText, { width: "35%" }]}>Nombre</Text>
                      <Text style={[s.thText, { width: "15%" }]}>Nivel</Text>
                      <Text style={[s.thText, { width: "20%" }]}>Jornada</Text>
                      <Text style={[s.thText, { width: "20%" }]}>Responsabilidad</Text>
                      <Text style={[s.thText, { width: "10%", textAlign: "right" }]}>Status</Text>
                    </View>
                    {personas.map((p, i) => (
                      <View key={p.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                        <Text style={[s.tdBold, { width: "35%" }]}>{p.tecnico?.nombre ?? "—"}</Text>
                        <Text style={[s.tdText, { width: "15%" }]}>{p.nivel ?? "—"}</Text>
                        <Text style={[s.tdText, { width: "20%" }]}>{p.jornada ?? "—"}</Text>
                        <Text style={[s.tdText, { width: "20%" }]}>{p.responsabilidad ?? "—"}</Text>
                        <View style={{ width: "10%", alignItems: "flex-end" }}>
                          <Text style={p.confirmado ? s.confirmed : s.notConfirmed}>
                            {p.confirmado ? "✓ OK" : "Pendiente"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ── Equipos ── */}
          {proyecto.equipos.length > 0 && (
            <>
              <SectionTitle title={`Equipos (${proyecto.equipos.length} líneas)`} />

              {Object.entries(equiposAgrupados).map(([cat, items]) => (
                <View key={cat} style={{ marginBottom: 10 }}>
                  <View style={{ backgroundColor: "#E8E4DC", paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.8 }}>
                      {cat}
                    </Text>
                  </View>
                  <View style={s.table}>
                    <View style={s.tableHeader}>
                      <Text style={[s.thText, { width: "50%" }]}>Equipo</Text>
                      <Text style={[s.thText, { width: "15%", textAlign: "center" }]}>Cant.</Text>
                      <Text style={[s.thText, { width: "15%", textAlign: "center" }]}>Días</Text>
                      <Text style={[s.thText, { width: "20%", textAlign: "right" }]}>Confirmado</Text>
                    </View>
                    {items.map((e, i) => (
                      <View key={e.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                        <View style={{ width: "50%" }}>
                          <Text style={s.tdBold}>{e.equipo.descripcion}</Text>
                          {e.equipo.marca && <Text style={[s.tdText, { fontSize: 7.5, color: LIGHT_GRAY }]}>{e.equipo.marca}</Text>}
                        </View>
                        <Text style={[s.tdText, { width: "15%", textAlign: "center" }]}>{e.cantidad}</Text>
                        <Text style={[s.tdText, { width: "15%", textAlign: "center" }]}>{e.dias}</Text>
                        <View style={{ width: "20%", alignItems: "flex-end" }}>
                          <Text style={e.confirmado ? s.confirmed : s.notConfirmed}>
                            {e.confirmado ? "✓ OK" : "Pendiente"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ── Checklist ── */}
          {proyecto.checklist.length > 0 && (
            <>
              <SectionTitle title={`Checklist (${checkDone}/${checkTotal})`} />
              <View>
                {proyecto.checklist.map((c) => (
                  <View key={c.id} style={s.checkRow}>
                    <View style={c.completado ? s.checkBoxDone : s.checkBox}>
                      {c.completado && <Text style={s.checkMark}>✓</Text>}
                    </View>
                    <Text style={c.completado ? s.checkTextDone : s.checkText}>{c.item}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── Descripción general ── */}
          {proyecto.descripcionGeneral && (
            <>
              <SectionTitle title="Descripción general" />
              <Text style={s.freeText}>{proyecto.descripcionGeneral}</Text>
            </>
          )}

          {/* ── Detalles específicos ── */}
          {proyecto.detallesEspecificos && (
            <>
              <SectionTitle title="Detalles específicos del proyecto" />
              <Text style={s.freeText}>{proyecto.detallesEspecificos}</Text>
            </>
          )}

          {/* ── Logística ── */}
          {(proyecto.transportes || proyecto.proveedorCatering) && (
            <>
              <SectionTitle title="Logística" />
              <View style={s.infoGrid}>
                {proyecto.transportes && <InfoField label="Transportes del evento" value={proyecto.transportes} full bold={false} />}
                {proyecto.proveedorCatering && <InfoField label="Proveedor catering / alimentación" value={proyecto.proveedorCatering} full bold={false} />}
              </View>
            </>
          )}

          {/* ── Cronograma ── */}
          {proyecto.cronograma && (
            <>
              <SectionTitle title="Cronograma general del proyecto" />
              <Text style={s.freeText}>{proyecto.cronograma}</Text>
            </>
          )}

          {/* ── Contactos dirección ── */}
          {proyecto.contactosDireccion && (
            <>
              <SectionTitle title="Contactos de dirección y coordinación" />
              <Text style={s.freeText}>{proyecto.contactosDireccion}</Text>
            </>
          )}

          {/* ── Contactos de emergencia ── */}
          {proyecto.contactosEmergencia && (
            <>
              <SectionTitle title="Contactos de emergencia" />
              <Text style={s.freeText}>{proyecto.contactosEmergencia}</Text>
            </>
          )}

          {/* ── Comentarios finales ── */}
          {proyecto.comentariosFinales && (
            <>
              <SectionTitle title="Comentarios finales" />
              <Text style={s.freeText}>{proyecto.comentariosFinales}</Text>
            </>
          )}

        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Generado el {generadoEl} · Documento interno confidencial
          </Text>
          <Text style={s.footerGold}>MAINSTAGE PRODUCCIONES</Text>
        </View>

      </Page>
    </Document>
  );
}
