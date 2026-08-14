// Serie "Contenido para campañas". A diferencia del contenido informativo (banco
// curado), aquí el usuario mete un BRIEF breve y estándar y de ahí se arma UN
// creativo de anuncio. El brief viaja en la URL (base64 de JSON) para que la vista
// previa sea en vivo y editable sin guardar nada todavía.

import type { EditableField } from "../overrides";
import { ARROBA, TELEFONO } from "../servicios/data";

export type CampanaObjetivo = "promocion" | "lanzamiento" | "evento" | "reconocimiento" | "leads";

// Etiqueta de esquina (badge) según el objetivo de la campaña.
export const OBJETIVO_BADGE: Record<CampanaObjetivo, string> = {
  promocion: "PROMOCIÓN",
  lanzamiento: "LANZAMIENTO",
  evento: "EVENTO ESPECIAL",
  reconocimiento: "MAINSTAGE PRO",
  leads: "COTIZA HOY",
};

export const OBJETIVO_LABEL: Record<CampanaObjetivo, string> = {
  promocion: "Promoción / oferta",
  lanzamiento: "Lanzamiento",
  evento: "Evento especial",
  reconocimiento: "Reconocimiento de marca",
  leads: "Generar contactos",
};

export const OBJETIVOS = Object.keys(OBJETIVO_LABEL) as CampanaObjetivo[];

export const CTA_OPCIONES = [
  "Cotiza hoy",
  "Reserva tu fecha",
  "Aparta tu fecha",
  "Escríbenos por WhatsApp",
  "Conoce más",
];

// Fondos curados (rutas reales en /public). El usuario elige por id.
export const FONDOS_CAMPANA: { id: string; label: string; bg: string }[] = [
  { id: "musical", label: "Concierto / musical", bg: "images/presentacion/musicales/Musicales-108.jpg" },
  { id: "boda", label: "Boda / social", bg: "images/presentacion/sociales/s-boda-elegante.jpg" },
  { id: "corporativo", label: "Corporativo", bg: "images/presentacion/empresariales/e-auditorio.jpg" },
  { id: "led", label: "Pantalla LED", bg: "images/presentacion/empresariales/e-carpa-led.jpg" },
  { id: "escenario", label: "Escenario iluminado", bg: "images/presentacion/sociales/s-hacienda-iluminada.jpg" },
  { id: "audio", label: "Equipo de audio", bg: "images/presentacion/equip-speaker.jpg" },
];

// Un fondo subido (Vercel Blob) o incrustado (data URL) se usa tal cual; los
// curados se resuelven por id. El "id" de un fondo subido ES su propia URL.
const esUrlFondo = (v: string | null | undefined): boolean =>
  !!v && (/^https?:\/\//.test(v) || v.startsWith("data:"));

export const bgDeFondo = (id: string | null | undefined): string => {
  if (esUrlFondo(id)) return id as string;
  return FONDOS_CAMPANA.find((f) => f.id === id)?.bg ?? FONDOS_CAMPANA[0].bg;
};

export const idDeFondo = (bg: string): string => {
  if (esUrlFondo(bg)) return bg;
  return FONDOS_CAMPANA.find((f) => f.bg === bg)?.id ?? FONDOS_CAMPANA[0].id;
};

// ── El BRIEF (lo que captura el usuario) ─────────────────────────────────────
export type CampanaBrief = {
  objetivo: CampanaObjetivo;
  tituloGold: string; // 1ª línea del titular (oro)
  tituloWhite: string; // 2ª línea del titular (blanco)
  mensaje: string; // texto de apoyo
  oferta: string; // gancho opcional (ej. "20% de descuento") — vacío = sin chip
  cta: string; // llamado a la acción
  bg: string; // ruta de fondo
};

export const CAMPANA_MUESTRA_BRIEF: CampanaBrief = {
  objetivo: "promocion",
  tituloGold: "TU EVENTO",
  tituloWhite: "SUENA MEJOR",
  mensaje: "Renta de audio, iluminación y video profesional para bodas, conciertos y eventos de empresa.",
  oferta: "Visita técnica sin costo",
  cta: "Cotiza hoy",
  bg: FONDOS_CAMPANA[0].bg,
};

// ── Datos que consume el render ──────────────────────────────────────────────
export type CampanaData = {
  badge: string;
  tituloGold: string;
  tituloWhite: string;
  mensaje: string;
  oferta: string;
  cta: string;
  telefono: string;
  arroba: string;
  bg: string;
};

export function briefToData(b: CampanaBrief): CampanaData {
  return {
    badge: OBJETIVO_BADGE[b.objetivo] ?? OBJETIVO_BADGE.promocion,
    tituloGold: b.tituloGold,
    tituloWhite: b.tituloWhite,
    mensaje: b.mensaje,
    oferta: b.oferta,
    cta: b.cta,
    telefono: TELEFONO,
    arroba: ARROBA,
    bg: b.bg,
  };
}

export const CAMPANA_MUESTRA: CampanaData = briefToData(CAMPANA_MUESTRA_BRIEF);

// Reconstruye el brief editable desde los datos congelados de una plantilla
// guardada (snapshot). El badge es biyectivo con el objetivo, así que se invierte.
const BADGE_OBJETIVO = Object.fromEntries(
  (Object.entries(OBJETIVO_BADGE) as [CampanaObjetivo, string][]).map(([k, v]) => [v, k]),
) as Record<string, CampanaObjetivo>;

export function dataToBrief(d: CampanaData): CampanaBrief {
  return {
    objetivo: BADGE_OBJETIVO[d.badge] ?? "promocion",
    tituloGold: d.tituloGold,
    tituloWhite: d.tituloWhite,
    mensaje: d.mensaje,
    oferta: d.oferta,
    cta: d.cta,
    bg: d.bg,
  };
}

// El brief completo va en un solo parámetro (base64url de JSON) para render en vivo.
export function encodeBrief(b: CampanaBrief): string {
  return Buffer.from(JSON.stringify(b), "utf8").toString("base64url");
}

export function decodeBrief(raw: string | null | undefined): CampanaBrief | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<CampanaBrief>;
    return {
      objetivo: (OBJETIVOS.includes(o.objetivo as CampanaObjetivo) ? o.objetivo : "promocion") as CampanaObjetivo,
      tituloGold: String(o.tituloGold ?? ""),
      tituloWhite: String(o.tituloWhite ?? ""),
      mensaje: String(o.mensaje ?? ""),
      oferta: String(o.oferta ?? ""),
      cta: String(o.cta ?? CAMPANA_MUESTRA_BRIEF.cta),
      bg: String(o.bg ?? CAMPANA_MUESTRA_BRIEF.bg),
    };
  } catch {
    return null;
  }
}

// ── Slides (un solo creativo por campaña) ────────────────────────────────────
export function campanaSlides(): { id: string; label: string }[] {
  return [{ id: "creativo", label: "Creativo" }];
}

export function campanaBg(d: CampanaData): string {
  return d.bg;
}

export function campanaEditableFields(): EditableField[] {
  const f: EditableField[] = [];
  const add = (path: string, label: string, kind: EditableField["kind"] = "text") =>
    f.push({ path, label, slideId: "creativo", slideLabel: "Creativo", kind });
  add("tituloGold", "Titular (dorado)");
  add("tituloWhite", "Titular (blanco)");
  add("mensaje", "Mensaje", "textarea");
  add("oferta", "Oferta / gancho");
  add("cta", "Llamado a la acción");
  return f;
}
