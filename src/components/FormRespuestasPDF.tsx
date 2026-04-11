import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { FORM_KEY_LABELS, SERVICIO_LABELS, EVENTO_LABELS, RUTA_LABELS } from "@/lib/form-labels";

const GOLD = "#B3985B";
const BLACK = "#0a0a0a";
const DARK = "#1a1a1a";
const GRAY = "#4a4a4a";
const LIGHT_GRAY = "#888888";
const WHITE = "#FFFFFF";
const BG = "#F7F5F0";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: WHITE, paddingBottom: 40, fontSize: 9, color: BLACK },
  header: { backgroundColor: BLACK, paddingHorizontal: 40, paddingTop: 44, paddingBottom: 28 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 160, height: 40, objectFit: "contain" },
  headerTitle: { color: GOLD, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 2, textTransform: "uppercase" },
  headerNombre: { color: WHITE, fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 4 },
  headerSub: { color: LIGHT_GRAY, fontSize: 8, marginTop: 3 },
  dividerGold: { height: 2, backgroundColor: GOLD, marginTop: 16, marginHorizontal: 40 },
  body: { paddingHorizontal: 40, paddingTop: 24 },
  // Info bar
  infoBar: { flexDirection: "row", gap: 0, marginBottom: 24, backgroundColor: BG, borderRadius: 6 },
  infoItem: { flex: 1, padding: 12, borderRightWidth: 1, borderRightColor: "#e8e4dc" },
  infoItemLast: { flex: 1, padding: 12 },
  infoLabel: { color: LIGHT_GRAY, fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 },
  infoValue: { color: BLACK, fontSize: 9, fontFamily: "Helvetica-Bold" },
  // Sections
  section: { marginBottom: 20 },
  sectionTitle: { color: GOLD, fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e8e4dc", paddingBottom: 5 },
  row: { flexDirection: "row", marginBottom: 6, gap: 8 },
  rowLabel: { width: 160, color: GRAY, fontSize: 8 },
  rowValue: { flex: 1, color: BLACK, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  rowValueMulti: { flex: 1, color: BLACK, fontSize: 8 },
  // Footer
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e8e4dc", paddingTop: 8 },
  footerText: { color: LIGHT_GRAY, fontSize: 7 },
  badge: { backgroundColor: DARK, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginTop: 6 },
  badgeText: { color: GOLD, fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1 },
});

interface Props {
  trato: {
    nombreEvento: string | null;
    tipoServicio: string | null;
    tipoEvento: string;
    rutaEntrada: string | null;
    fechaEventoEstimada: string | null;
    lugarEstimado: string | null;
    asistentesEstimados: number | null;
    formRespuestas: string | null;
    cliente: { nombre: string; empresa: string | null };
    createdAt: string;
  };
  logoSrc: string | null;
  fechaImpresion: string;
}

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return iso; }
}

/** Agrupa las respuestas en secciones detectadas por patrones de keys */
function agruparRespuestas(resp: Record<string, unknown>): { titulo: string; items: { label: string; valor: string }[] }[] {
  const grupos: Record<string, { label: string; valor: string }[]> = {};
  const orden = ["evento", "espacio", "audio", "iluminacion", "video", "logistica", "extras", "otros"];

  const mapGrupo = (key: string): string => {
    if (["nombreEvento","fechaEvento","lugar","ciudad","asistentes","duracion","horaMontaje"].includes(key)) return "evento";
    if (["tipoEspacio","tipoEscenario","energia","zonasAudio"].includes(key)) return "espacio";
    if (["sistemaPa","musicosEnEscena","monitores","djBridge","backline","musica","microfono","karaoke","tipoAudio","microfonos"].includes(key)) return "audio";
    if (["iluminacion","efectos"].includes(key)) return "iluminacion";
    if (["pantallaLed","pantalla","produccionVideo","pantallas","traduccion","grabacion","streaming","branding"].includes(key)) return "video";
    if (["transporte","direccionVenue","fechaInicio","fechaFin","entrega","direccionEntrega","restriccionMontaje","operacion"].includes(key)) return "logistica";
    if (["referencias","presupuesto","extras","descripcion","descripcionEquipos","tiposEquipo","servicios","tipoEvento","tecnicoPropio","ponentes"].includes(key)) return "extras";
    return "otros";
  };

  const TITULO_GRUPOS: Record<string, string> = {
    evento: "El evento", espacio: "El espacio", audio: "Audio",
    iluminacion: "Iluminación", video: "Video", logistica: "Logística y montaje",
    extras: "Extras y referencias", otros: "Información adicional",
  };

  for (const [key, val] of Object.entries(resp)) {
    if (!val || val === "" || (Array.isArray(val) && val.length === 0)) continue;
    const grupo = mapGrupo(key);
    if (!grupos[grupo]) grupos[grupo] = [];
    const label = FORM_KEY_LABELS[key] ?? key;
    const valor = Array.isArray(val) ? val.join(", ") : String(val);
    grupos[grupo].push({ label, valor });
  }

  return orden
    .filter(g => grupos[g]?.length)
    .map(g => ({ titulo: TITULO_GRUPOS[g], items: grupos[g] }));
}

export function FormRespuestasPDF({ trato, logoSrc, fechaImpresion }: Props) {
  let respuestas: Record<string, unknown> = {};
  try { if (trato.formRespuestas) respuestas = JSON.parse(trato.formRespuestas); } catch { /* empty */ }
  const grupos = agruparRespuestas(respuestas);
  const rutaLabel = RUTA_LABELS[trato.rutaEntrada ?? ""] ?? "Descubrimiento";
  const servicioLabel = SERVICIO_LABELS[trato.tipoServicio ?? ""] ?? trato.tipoServicio ?? "—";
  const eventoLabel = EVENTO_LABELS[trato.tipoEvento] ?? trato.tipoEvento;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.headerTitle}>Formulario de {rutaLabel}</Text>
              <Text style={s.headerNombre}>{trato.nombreEvento ?? "Sin nombre de evento"}</Text>
              <Text style={s.headerSub}>{trato.cliente.nombre}{trato.cliente.empresa ? ` · ${trato.cliente.empresa}` : ""}</Text>
            </View>
            {logoSrc && <Image src={logoSrc} style={s.logo} />}
          </View>
          <View style={s.badge}><Text style={s.badgeText}>{servicioLabel} · {eventoLabel}</Text></View>
        </View>
        <View style={s.dividerGold} />

        <View style={s.body}>
          {/* Info bar */}
          <View style={s.infoBar}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Fecha del evento</Text>
              <Text style={s.infoValue}>{formatFecha(trato.fechaEventoEstimada)}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Lugar</Text>
              <Text style={s.infoValue}>{trato.lugarEstimado ?? "—"}</Text>
            </View>
            <View style={s.infoItemLast}>
              <Text style={s.infoLabel}>Asistentes</Text>
              <Text style={s.infoValue}>{trato.asistentesEstimados ? `~${trato.asistentesEstimados}` : "—"}</Text>
            </View>
          </View>

          {/* Grupos de respuestas */}
          {grupos.map((grupo) => (
            <View key={grupo.titulo} style={s.section}>
              <Text style={s.sectionTitle}>{grupo.titulo}</Text>
              {grupo.items.map((item, i) => (
                <View key={i} style={s.row}>
                  <Text style={s.rowLabel}>{item.label}</Text>
                  {item.valor.length > 80
                    ? <Text style={s.rowValueMulti}>{item.valor}</Text>
                    : <Text style={s.rowValue}>{item.valor}</Text>
                  }
                </View>
              ))}
            </View>
          ))}

          {grupos.length === 0 && (
            <Text style={{ color: LIGHT_GRAY, fontSize: 9 }}>Sin respuestas registradas.</Text>
          )}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mainstage Pro · Producción de eventos</Text>
          <Text style={s.footerText}>Generado el {fechaImpresion}</Text>
        </View>
      </Page>
    </Document>
  );
}
