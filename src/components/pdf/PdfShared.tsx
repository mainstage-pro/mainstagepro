/**
 * PdfShared.tsx — Sistema de diseño unificado para las fichas PDF de Mainstage Pro
 * Ambas fichas (cliente y operativa) comparten este sistema visual.
 */
import { StyleSheet } from "@react-pdf/renderer";

// ─── Paleta ──────────────────────────────────────────────────────────────────
export const C = {
  negro: "#0d0d0d",
  grisOscuro: "#1a1a1a",
  grisMedio: "#5a5a5a",
  grisClaro: "#9a9a9a",
  grisLinea: "#e8e8e8",
  grisFondo: "#f6f6f6",
  dorado: "#B3985B",
  doradoClaro: "#f7f0e2",
  doradoBorde: "#ddc98a",
  blanco: "#ffffff",
  verde: "#2d6e3e",
  verdeFondo: "#edf6f0",
  rojo: "#b91c1c",
  rojoFondo: "#fef2f2",
  amarilloFondo: "#fffbeb",
  amarillo: "#92400e",
};

// ─── Estilos base compartidos ─────────────────────────────────────────────────
export const base = StyleSheet.create({
  page: {
    backgroundColor: C.blanco,
    fontFamily: "Helvetica",
    paddingTop: 0,
    paddingBottom: 52,
    paddingHorizontal: 0,
    fontSize: 8.5,
    color: C.negro,
  },
  // Hero header negro (ocupa todo el ancho)
  hero: {
    backgroundColor: C.negro,
    paddingHorizontal: 36,
    paddingTop: 22,
    paddingBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroLeft: { flex: 1, paddingRight: 16 },
  heroTag: {
    fontSize: 6.5, color: "#888", textTransform: "uppercase",
    letterSpacing: 1.4, marginBottom: 5,
  },
  heroNombre: {
    fontSize: 17, fontFamily: "Helvetica-Bold",
    color: C.blanco, lineHeight: 1.2, marginBottom: 5,
  },
  heroMeta: { fontSize: 7.5, color: "#aaa" },
  heroLogo: { width: 96, height: 28, objectFit: "contain" },
  // Banda de datos rápidos (debajo del hero)
  banda: {
    flexDirection: "row", backgroundColor: C.dorado,
    paddingHorizontal: 36, paddingVertical: 8,
  },
  bandaItem: { flex: 1, alignItems: "center" },
  bandaLabel: {
    fontSize: 6, color: "#6b4e1a", textTransform: "uppercase",
    letterSpacing: 0.8, marginBottom: 2,
  },
  bandaVal: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.negro },
  bandaDivider: { width: 0.5, backgroundColor: "#c9a96a", marginHorizontal: 4 },
  // Contenido con padding
  body: { paddingHorizontal: 36, paddingTop: 18 },
  // Sección
  section: { marginBottom: 16 },
  secTitle: {
    fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.blanco,
    textTransform: "uppercase", letterSpacing: 1.3,
    backgroundColor: C.negro,
    marginBottom: 8, paddingVertical: 5, paddingHorizontal: 8,
    borderRadius: 3,
  },
  secTitleDark: {
    fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.blanco,
    textTransform: "uppercase", letterSpacing: 1.3,
    backgroundColor: C.grisOscuro,
    marginBottom: 8, paddingVertical: 5, paddingHorizontal: 8,
    borderRadius: 3,
  },
  // Grid de pares clave-valor
  kvGrid: { flexDirection: "row", flexWrap: "wrap" },
  kvCell: { width: "50%", paddingRight: 12, marginBottom: 6 },
  kvCellFull: { width: "100%", marginBottom: 6 },
  kvLabel: {
    fontSize: 6.5, color: C.grisClaro, textTransform: "uppercase",
    letterSpacing: 0.6, marginBottom: 1.5,
  },
  kvVal: { fontSize: 8.5, color: C.negro },
  kvValBold: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.negro },
  kvValLink: { fontSize: 8.5, color: "#1a73e8" },
  // Tablas
  table: {
    width: "100%", borderWidth: 0.5, borderColor: C.grisLinea,
    borderStyle: "solid", borderRadius: 3,
  },
  tableHd: {
    flexDirection: "row", backgroundColor: C.grisFondo,
    paddingVertical: 4, paddingHorizontal: 8,
    borderBottomWidth: 0.5, borderBottomColor: C.grisLinea, borderBottomStyle: "solid",
  },
  tableRow: {
    flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 8,
    borderBottomWidth: 0.3, borderBottomColor: "#f0f0f0", borderBottomStyle: "solid",
  },
  tableRowLast: { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 8 },
  tableRowCat: {
    flexDirection: "row", backgroundColor: "#f1f1f1",
    paddingVertical: 3.5, paddingHorizontal: 8,
    borderBottomWidth: 0.5, borderBottomColor: C.grisLinea, borderBottomStyle: "solid",
  },
  thTxt: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.grisMedio },
  tdTxt: { fontSize: 8, color: C.negro },
  tdMuted: { fontSize: 7.5, color: C.grisMedio },
  catTxt: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.grisMedio, textTransform: "uppercase", letterSpacing: 0.8 },
  // Checklist
  checkRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 },
  checkBox: {
    width: 10, height: 10, borderWidth: 0.8, borderColor: "#aaa",
    borderStyle: "solid", borderRadius: 1.5, marginRight: 7,
    marginTop: 1, flexShrink: 0,
  },
  checkTxt: { flex: 1, fontSize: 8.5, color: C.negro },
  checkSub: { fontSize: 7, color: C.grisClaro },
  // Chips de estado
  chipOk: {
    fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.verde,
    backgroundColor: C.verdeFondo, paddingHorizontal: 4,
    paddingVertical: 1.5, borderRadius: 2,
  },
  chipPend: {
    fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.amarillo,
    backgroundColor: C.amarilloFondo, paddingHorizontal: 4,
    paddingVertical: 1.5, borderRadius: 2,
  },
  // Caja de texto (notas, instrucciones)
  textBox: {
    backgroundColor: C.grisFondo, borderLeftWidth: 2,
    borderLeftColor: C.dorado, borderLeftStyle: "solid",
    padding: 9, borderRadius: 2, marginTop: 2,
  },
  textBoxContent: { fontSize: 8.5, color: C.negro, lineHeight: 1.55 },
  // Footer
  footer: {
    position: "absolute", bottom: 18, left: 36, right: 36,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopWidth: 0.5, borderTopColor: C.grisLinea,
    borderTopStyle: "solid", paddingTop: 6,
  },
  footerLogo: { width: 60, height: 16, objectFit: "contain" },
  footerTxt: { fontSize: 6.5, color: C.grisClaro },
  // Separador horizontal
  hr: { borderBottomWidth: 0.5, borderBottomColor: C.grisLinea, borderBottomStyle: "solid", marginBottom: 14 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      timeZone: "UTC", weekday: "long", day: "numeric",
      month: "long", year: "numeric",
    });
  } catch { return iso; }
}

export function fmtFechaCorta(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      timeZone: "UTC", day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

export function fmtHora(h: string | null | undefined): string {
  if (!h) return "";
  return h;
}

export function duracion(ini: string | null | undefined, fin: string | null | undefined): string {
  if (!ini || !fin) return "";
  try {
    const [sh, sm] = ini.split(":").map(Number);
    const [eh, em] = fin.split(":").map(Number);
    const m = (eh * 60 + em) - (sh * 60 + sm);
    if (m <= 0) return "";
    return m % 60 === 0 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 60)}h ${m % 60}min`;
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
    // Prefer white logo (for dark hero header)
    for (const name of ["logo-white.png", "logo.png"]) {
      const p = path.join(publicDir, name);
      if (fs.existsSync(p)) return `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
    }
    return null;
  } catch { return null; }
}

/** Logo negro (letras negras) — para usar en footer sobre fondo blanco */
export function logoBase64Dark(publicDir: string): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    for (const name of ["logo.png", "logo-white.png"]) {
      const p = path.join(publicDir, name);
      if (fs.existsSync(p)) return `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
    }
    return null;
  } catch { return null; }
}

// ─── Tipos compartidos ────────────────────────────────────────────────────────
export type EquipoFlat = {
  descripcion: string; marca: string | null; modelo: string | null; categoria: string;
  cantidad: number; tipo: string; confirmado: boolean; proveedor: string | null;
  imagenUrl?: string | null;
  accesorios: { nombre: string; cantidad: number; categoria: string | null }[];
};

export type CronoRow = { horaInicio: string; horaFin: string; actividad: string; responsable: string };
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

export function agruparPorCategoria(equipos: EquipoFlat[]): Map<string, EquipoFlat[]> {
  const map = new Map<string, EquipoFlat[]>();
  for (const e of equipos) {
    const cat = e.categoria || "General";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(e);
  }
  return map;
}

const TIPO_EVENTO_MAP: Record<string, string> = {
  MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", OTRO: "Otro",
};
const TIPO_SERVICIO_MAP: Record<string, string> = {
  PRODUCCION_TECNICA: "Producción técnica integral",
  RENTA: "Renta de equipo",
  DIRECCION_TECNICA: "Dirección técnica",
};
const ZONA_MAP: Record<string, string> = {
  LOCAL: "Local (Querétaro)", BAJIO: "Bajío", NACIONAL: "Nacional",
};
const ESTADO_MAP: Record<string, string> = {
  PLANEACION: "En preparación", CONFIRMADO: "Confirmado",
  EN_CURSO: "En evento", COMPLETADO: "Finalizado", CANCELADO: "Cancelado",
};

export const MAPS = { TIPO_EVENTO_MAP, TIPO_SERVICIO_MAP, ZONA_MAP, ESTADO_MAP };
