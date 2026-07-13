import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image,
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
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 0,
    fontSize: 9,
    color: BLACK,
  },
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingBottom: 25,
    marginTop: -36,
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
  headerRight: { alignItems: "flex-end" },
  docTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    marginBottom: 2,
  },
  docArea: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    marginBottom: 3,
  },
  docSemana: { fontSize: 8, color: "#888888" },
  goldBand: { height: 3, backgroundColor: GOLD },
  body: { paddingHorizontal: 40, paddingTop: 24 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  metaBox: { width: "50%", marginBottom: 8, paddingRight: 16 },
  metaLabel: {
    fontSize: 7.5,
    color: LIGHT_GRAY,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metaValue: { fontSize: 9, color: BLACK, fontFamily: "Helvetica-Bold" },
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
  freeText: {
    fontSize: 8.5,
    color: GRAY,
    lineHeight: 1.5,
    backgroundColor: BG_SECTION,
    padding: 10,
    borderRadius: 3,
  },
  emptyText: {
    fontSize: 8.5,
    color: LIGHT_GRAY,
    fontStyle: "italic",
    backgroundColor: BG_SECTION,
    padding: 10,
    borderRadius: 3,
  },
  puntoBox: {
    marginBottom: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: GOLD,
  },
  puntoTitulo: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    marginBottom: 2,
  },
  puntoContenido: { fontSize: 8.5, color: GRAY, lineHeight: 1.5 },
  subLabel: {
    fontSize: 7.5,
    color: LIGHT_GRAY,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
    marginTop: 8,
  },
  table: { marginBottom: 4 },
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
  thText: { fontSize: 8, color: WHITE, fontFamily: "Helvetica-Bold" },
  tdText: { fontSize: 8.5, color: GRAY },
  tdBold: { fontSize: 8.5, color: BLACK, fontFamily: "Helvetica-Bold" },
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
  footerText: { fontSize: 7.5, color: "#BBBBBB" },
  footerGold: { fontSize: 7.5, color: GOLD, fontFamily: "Helvetica-Bold" },
});

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface EntregaPunto { id: string; titulo: string; contenido: string }
interface PreExtra {
  mejoras: string;
  solicitudesHerramientas: string;
  solicitudesRecursoHumano: string;
  solicitudesPresupuesto: string;
  fallasTransporte: string;
  incidenciasPersonal: string;
  situacionesGenerales: string;
}
interface VisionTareaPDF {
  id: string;
  titulo: string;
  prioridad: string;
  estado: string;
  fecha: string | null;
  asignadoA: { name: string } | null;
}
interface VisionProyectoPDF {
  id: string;
  nombre: string;
  estado: string;
  porcentajeAvance: number;
  fechaFin: string | null;
  totalFases: number;
  fasesCompletadas: number;
  lider: { name: string } | null;
}

export interface VisionSemanalPDFData {
  areaLabel: string;
  tipo: "STANDARD" | "PREPRODUCCION";
  entregaLabel: string;
  semana: string;
  enfoque: string;
  entregaInfo: EntregaPunto[];
  desbloqueo: string;
  comentarios: string;
  extra: PreExtra;
  responsable: { name: string } | null;
  autor: { name: string } | null;
  actualizadoEn: string | null;
  tareas: VisionTareaPDF[];
  proyectos: VisionProyectoPDF[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function rangoSemana(semana: string): string {
  const lunes = new Date(`${semana}T00:00:00`);
  const dom = new Date(lunes);
  dom.setDate(dom.getDate() + 6);
  const sameMonth = lunes.getMonth() === dom.getMonth();
  const l = `${lunes.getDate()}${sameMonth ? "" : " " + MESES[lunes.getMonth()]}`;
  const d = `${dom.getDate()} ${MESES[dom.getMonth()]} ${dom.getFullYear()}`;
  return `${l} – ${d}`;
}
function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}
const PRIORIDAD_LABEL: Record<string, string> = {
  URGENTE: "Urgente", ALTA: "Alta", MEDIA: "Media", BAJA: "Baja",
};
const ESTADO_PROY_LABEL: Record<string, string> = {
  PLANIFICACION: "Planificación", ACTIVO: "Activo",
  EN_PAUSA: "En pausa", COMPLETADO: "Completado",
};

// ─── Subcomponentes ──────────────────────────────────────────────────────────
function SectionTitle({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionLine} />
    </View>
  );
}

function TextoLibre({ value }: { value: string }) {
  return value.trim()
    ? <Text style={s.freeText}>{value}</Text>
    : <Text style={s.emptyText}>Sin información registrada</Text>;
}

function EntregaLista({ puntos }: { puntos: EntregaPunto[] }) {
  const conContenido = puntos.filter((p) => p.titulo.trim() || p.contenido.trim());
  if (conContenido.length === 0) {
    return <Text style={s.emptyText}>Sin puntos registrados</Text>;
  }
  return (
    <View>
      {conContenido.map((p) => (
        <View key={p.id} style={s.puntoBox} wrap={false}>
          <Text style={s.puntoTitulo}>{p.titulo.trim() || "—"}</Text>
          {p.contenido.trim() ? <Text style={s.puntoContenido}>{p.contenido}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function TablaTareas({ tareas }: { tareas: VisionTareaPDF[] }) {
  if (tareas.length === 0) {
    return <Text style={s.emptyText}>Sin tareas asignadas con fecha en esta área</Text>;
  }
  return (
    <View style={s.table}>
      <View style={s.tableHeader}>
        <Text style={[s.thText, { width: "50%" }]}>Tarea</Text>
        <Text style={[s.thText, { width: "25%" }]}>Responsable</Text>
        <Text style={[s.thText, { width: "13%" }]}>Prioridad</Text>
        <Text style={[s.thText, { width: "12%", textAlign: "right" }]}>Fecha</Text>
      </View>
      {tareas.map((t, i) => (
        <View key={t.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
          <Text style={[s.tdBold, { width: "50%" }]}>{t.titulo}</Text>
          <Text style={[s.tdText, { width: "25%" }]}>{t.asignadoA?.name ?? "—"}</Text>
          <Text style={[s.tdText, { width: "13%" }]}>{PRIORIDAD_LABEL[t.prioridad] ?? t.prioridad}</Text>
          <Text style={[s.tdText, { width: "12%", textAlign: "right" }]}>{fmtFecha(t.fecha)}</Text>
        </View>
      ))}
    </View>
  );
}

function TablaProyectos({ proyectos }: { proyectos: VisionProyectoPDF[] }) {
  if (proyectos.length === 0) {
    return <Text style={s.emptyText}>Aún no hay proyectos en esta área</Text>;
  }
  return (
    <View style={s.table}>
      <View style={s.tableHeader}>
        <Text style={[s.thText, { width: "44%" }]}>Proyecto</Text>
        <Text style={[s.thText, { width: "20%" }]}>Estado</Text>
        <Text style={[s.thText, { width: "16%", textAlign: "center" }]}>Avance</Text>
        <Text style={[s.thText, { width: "20%" }]}>Líder</Text>
      </View>
      {proyectos.map((p, i) => (
        <View key={p.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
          <Text style={[s.tdBold, { width: "44%" }]}>{p.nombre}</Text>
          <Text style={[s.tdText, { width: "20%" }]}>{ESTADO_PROY_LABEL[p.estado] ?? p.estado}</Text>
          <Text style={[s.tdText, { width: "16%", textAlign: "center" }]}>
            {p.porcentajeAvance}% · {p.fasesCompletadas}/{p.totalFases}
          </Text>
          <Text style={[s.tdText, { width: "20%" }]}>{p.lider?.name ?? "—"}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function VisionSemanalPDF({ data, logoSrc }: { data: VisionSemanalPDFData; logoSrc?: string | null }) {
  const generadoEl = new Date().toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const actualizado = data.actualizadoEn
    ? new Date(data.actualizadoEn).toLocaleDateString("es-MX", {
        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "Sin guardar aún";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header} fixed>
          <View>
            {logoSrc ? (
              <Image src={logoSrc} style={{ height: 22, objectFit: "contain" }} />
            ) : (
              <Text style={s.brand}>MAINSTAGE</Text>
            )}
            <Text style={s.tagline}>PRODUCCIONES · VISIÓN SEMANAL</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>VISIÓN SEMANAL</Text>
            <Text style={s.docArea}>{data.areaLabel}</Text>
            <Text style={s.docSemana}>{rangoSemana(data.semana)}</Text>
          </View>
        </View>

        <View style={s.goldBand} fixed />

        {/* ── Cuerpo ── */}
        <View style={s.body}>
          {/* Meta */}
          <View style={s.metaRow}>
            <View style={s.metaBox}>
              <Text style={s.metaLabel}>Responsable</Text>
              <Text style={s.metaValue}>{data.responsable?.name ?? "Sin asignar"}</Text>
            </View>
            <View style={s.metaBox}>
              <Text style={s.metaLabel}>Última actualización</Text>
              <Text style={s.metaValue}>
                {actualizado}{data.autor ? ` · ${data.autor.name}` : ""}
              </Text>
            </View>
          </View>

          {/* 1. Enfoque */}
          <SectionTitle title="Enfoque de la semana" />
          <TextoLibre value={data.enfoque} />

          {/* 2. Entrega de información */}
          <SectionTitle title={data.entregaLabel} />
          <EntregaLista puntos={data.entregaInfo} />

          {data.tipo === "STANDARD" ? (
            <>
              {/* 3. Revisión de tareas */}
              <SectionTitle title="Revisión de tareas pendientes" />
              <TablaTareas tareas={data.tareas} />

              {/* 4. Desbloqueo */}
              <SectionTitle title="Desbloqueo de tareas" />
              <TextoLibre value={data.desbloqueo} />

              {/* 5. Avances en proyectos */}
              <SectionTitle title="Avances en proyectos" />
              <TablaProyectos proyectos={data.proyectos} />

              {/* 6. Comentarios finales */}
              <SectionTitle title="Comentarios finales" />
              <TextoLibre value={data.comentarios} />
            </>
          ) : (
            <>
              {/* 3. Mejoras */}
              <SectionTitle title="Mejoras respecto a la semana pasada" />
              <TextoLibre value={data.extra.mejoras} />

              {/* 4. Solicitudes */}
              <SectionTitle title="Solicitudes" />
              <Text style={s.subLabel}>Herramientas</Text>
              <TextoLibre value={data.extra.solicitudesHerramientas} />
              <Text style={s.subLabel}>Recurso humano</Text>
              <TextoLibre value={data.extra.solicitudesRecursoHumano} />
              <Text style={s.subLabel}>Presupuesto</Text>
              <TextoLibre value={data.extra.solicitudesPresupuesto} />

              {/* 5. Incidencias operativas */}
              <SectionTitle title="Incidencias operativas" />
              <Text style={s.subLabel}>Fallas en el transporte</Text>
              <TextoLibre value={data.extra.fallasTransporte} />
              <Text style={s.subLabel}>Incidencias de personal técnico</Text>
              <TextoLibre value={data.extra.incidenciasPersonal} />
              <Text style={s.subLabel}>Situaciones generales</Text>
              <TextoLibre value={data.extra.situacionesGenerales} />

              {/* 6. Próximos eventos y proyectos */}
              <SectionTitle title="Próximos eventos y proyectos a trabajar" />
              <TablaProyectos proyectos={data.proyectos} />

              {/* 7. Comentarios finales */}
              <SectionTitle title="Comentarios finales" />
              <TextoLibre value={data.comentarios} />
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
