/**
 * PdfShared.tsx — Estilos y helpers compartidos para las 3 fichas PDF de Mainstage Pro
 */
import { StyleSheet, Font } from "@react-pdf/renderer";

// ─── Paleta ──────────────────────────────────────────────────────────────────
export const C = {
  negro: "#0a0a0a",
  grisOscuro: "#1a1a1a",
  grisMedio: "#555555",
  grisClaro: "#999999",
  grisLinea: "#e5e5e5",
  grisFondo: "#f7f7f7",
  dorado: "#B3985B",
  blanco: "#ffffff",
  rojo: "#cc3333",
  verde: "#2d7a3a",
};

// ─── Estilos base compartidos ─────────────────────────────────────────────────
export const base = StyleSheet.create({
  page: {
    backgroundColor: C.blanco,
    fontFamily: "Helvetica",
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 40,
    fontSize: 9,
    color: C.negro,
  },
  // Header / footer
  headerWrap: { alignItems: "center", marginBottom: 20 },
  logo: { width: 140, height: 40, objectFit: "contain", marginBottom: 6 },
  logoSm: { width: 80, height: 22, objectFit: "contain" },
  // Secciones
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    color: C.grisMedio,
    textTransform: "uppercase",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.grisLinea,
    borderBottomStyle: "solid",
  },
  sectionTitleNum: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    color: C.negro,
    textTransform: "uppercase",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.negro,
    borderBottomStyle: "solid",
  },
  // Filas KV
  row: { flexDirection: "row", marginBottom: 4, alignItems: "flex-start" },
  label: { width: 130, fontSize: 8, color: C.grisMedio, flexShrink: 0 },
  value: { flex: 1, fontSize: 8, color: C.negro },
  labelSm: { width: 100, fontSize: 7.5, color: C.grisMedio, flexShrink: 0 },
  valueSm: { flex: 1, fontSize: 7.5, color: C.negro },
  // Tablas
  table: { width: "100%", borderWidth: 0.5, borderColor: C.grisLinea, borderStyle: "solid", borderRadius: 2 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.grisFondo,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.grisLinea,
    borderBottomStyle: "solid",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.grisLinea,
    borderBottomStyle: "solid",
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableCellHd: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.grisMedio },
  tableCell: { fontSize: 8, color: C.negro },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: C.grisLinea,
    borderTopStyle: "solid",
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: C.grisClaro },
  // Badges
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
  // Checklist item
  checkRow: { flexDirection: "row", marginBottom: 4, alignItems: "flex-start" },
  checkBox: { width: 12, height: 12, borderWidth: 0.8, borderColor: C.grisMedio, borderStyle: "solid", marginRight: 6, marginTop: 0.5, flexShrink: 0 },
  checkLabel: { flex: 1, fontSize: 8, color: C.negro },
  // Grids
  grid2: { flexDirection: "row", gap: 16 },
  gridCell: { flex: 1 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch { return iso; }
}

export function fmtHora(h: string | null | undefined): string {
  if (!h) return "";
  // If already HH:MM, return as-is; otherwise try to parse
  if (/^\d{1,2}:\d{2}$/.test(h)) return h;
  try {
    const d = new Date(`2000-01-01T${h}`);
    return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch { return h; }
}

export function duracionEntreHoras(inicio: string | null | undefined, fin: string | null | undefined): string {
  if (!inicio || !fin) return "";
  try {
    const [sh, sm] = inicio.split(":").map(Number);
    const [eh, em] = fin.split(":").map(Number);
    const totalMin = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMin <= 0) return "";
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  } catch { return ""; }
}

export function nowStr(): string {
  return new Date().toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function logoBase64(publicDir: string): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const logoPath = path.join(publicDir, "logo.png");
    if (fs.existsSync(logoPath)) {
      return `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
    }
    // fallback to logo-white
    const wPath = path.join(publicDir, "logo-white.png");
    if (fs.existsSync(wPath)) {
      return `data:image/png;base64,${fs.readFileSync(wPath).toString("base64")}`;
    }
    return null;
  } catch { return null; }
}

// Agrupa equipos por categoría
export type EquipoFlat = {
  descripcion: string;
  marca: string | null;
  categoria: string;
  cantidad: number;
  tipo: string; // PROPIO | EXTERNO
  confirmado: boolean;
  proveedor: string | null;
};

export function agruparPorCategoria(equipos: EquipoFlat[]): Map<string, EquipoFlat[]> {
  const map = new Map<string, EquipoFlat[]>();
  for (const e of equipos) {
    const cat = e.categoria || "Sin categoría";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(e);
  }
  return map;
}

// Tipos de datos JSON que vienen del proyecto
export type CronoRow = { horaInicio: string; horaFin: string; actividad: string; responsable: string; involucrados?: string };
export type TransporteSlot = { vehiculoId: string; vehiculoNombre?: string; choferId: string; choferNombre?: string; horaSalida: string; comentarios: string };
export type SoundcheckRow = { hora: string; artista: string; duracion: string; notas: string };
export type ProgramaRow = { hora: string; actividad: string; responsable: string; notas: string };
export type CoordProvRow = { proveedor: string; contacto: string; horario: string; notas: string };
export type EquipoRiderExtra = { id: string; descripcion: string; cantidad: number; notas: string; completado: boolean };
export type ProveedorRenta = { id: string; nombre: string; contacto: string; equipos: string[] };
export type DocsData = {
  soundcheck: SoundcheckRow[];
  programaEvento: ProgramaRow[];
  coordinacionProveedores: CoordProvRow[];
};
