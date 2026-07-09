// Estructura del brief de campaña. Se guarda como JSON en un campo de texto:
//   - TipoCampana.briefTemplate  → plantilla default del tipo
//   - EjecucionCampana.brief      → clon editable de la plantilla, por campaña
// Este módulo es client-safe (sin imports de servidor): lo usan las pantallas.

export type ObjetivoBrief = "LEADS" | "MENSAJES" | "CONVERSION" | "TRAFICO" | "RECONOCIMIENTO";

export const OBJETIVOS_BRIEF: ObjetivoBrief[] = ["LEADS", "MENSAJES", "CONVERSION", "TRAFICO", "RECONOCIMIENTO"];
export const OBJETIVO_BRIEF_LABEL: Record<string, string> = {
  LEADS: "Leads", MENSAJES: "Mensajes", CONVERSION: "Conversión",
  TRAFICO: "Tráfico", RECONOCIMIENTO: "Reconocimiento",
};

export interface AtencionEtapa {
  etapa: string;
  responsable: string;
  accion: string;
}

export interface HerramientasVenta {
  fotosPorTipoEvento: boolean;
  fotosPorEquipo: boolean;
  presentacionPorTipoEvento: boolean;
  presentacionPaquetes: boolean;
  presentacionEventoEspecifico: boolean;
  disponibilidadFechas: boolean;
  testimonios: boolean;
}

export interface ChecklistLanzamiento {
  pixelProbado: boolean;
  formularioLandingProbado: boolean;
  responsableAsignado: boolean;
  herramientasListas: boolean;
  presupuestoConfirmado: boolean;
}

export interface CampanaBrief {
  // 1. Datos generales (nombre/fechas/presupuesto viven en la entidad)
  marca: string;
  responsable: string;
  // 2. Objetivo (uno solo)
  objetivo: ObjetivoBrief | "";
  // 3. Audiencia
  ubicacion: string;
  edadMin: string;
  edadMax: string;
  intereses: string;
  publicosPersonalizados: string;
  exclusiones: string;
  // 4. Creatividad
  formato: string;
  copies: string[]; // mín. 2 variantes
  cta: string;
  destinoClic: string;
  // 5. Bloque condicional según objetivo
  leads: { preguntas: string; mensajeBienvenida: string; destinoLead: string };
  mensajes: { scriptApertura: string; preguntasCalificacion: string };
  conversion: { landing: string; eventoPixel: string };
  // 6. Atención al prospecto (SLA por etapa)
  atencion: AtencionEtapa[];
  // 7. Herramientas de venta requeridas
  herramientas: HerramientasVenta;
  // 8. KPIs a medir
  kpis: string[];
  // 9. Checklist de lanzamiento (define brief completo)
  lanzamiento: ChecklistLanzamiento;
}

export const ETAPAS_ATENCION_DEFAULT = ["0–30 min", "Día 1", "Día 3", "Día 7", "Nutrición"];

export const HERRAMIENTAS_LABEL: Record<keyof HerramientasVenta, string> = {
  fotosPorTipoEvento: "Fotos por tipo de evento",
  fotosPorEquipo: "Fotos por equipo",
  presentacionPorTipoEvento: "Presentación por tipo de evento",
  presentacionPaquetes: "Presentación de paquetes",
  presentacionEventoEspecifico: "Presentación por evento específico",
  disponibilidadFechas: "Disponibilidad de fechas",
  testimonios: "Testimonios",
};

export const LANZAMIENTO_LABEL: Record<keyof ChecklistLanzamiento, string> = {
  pixelProbado: "Pixel probado",
  formularioLandingProbado: "Formulario / landing probados",
  responsableAsignado: "Responsable asignado",
  herramientasListas: "Herramientas listas",
  presupuestoConfirmado: "Presupuesto confirmado",
};

export const KPIS_POR_OBJETIVO: Record<string, string[]> = {
  LEADS: ["CPL", "CTR", "CPM", "Frequency", "% leads calificados", "Tasa de contacto", "Tasa de cierre", "CAC"],
  MENSAJES: ["Costo por conversación", "CTR", "CPM", "Frequency", "% leads calificados", "Tasa de contacto", "Tasa de cierre", "CAC"],
  CONVERSION: ["Costo por conversión", "CTR", "CPM", "Frequency", "Tasa de cierre", "CAC"],
  TRAFICO: ["CTR", "CPM", "Frequency"],
  RECONOCIMIENTO: ["CPM", "Frequency"],
};

export function defaultBrief(): CampanaBrief {
  return {
    marca: "",
    responsable: "",
    objetivo: "",
    ubicacion: "",
    edadMin: "",
    edadMax: "",
    intereses: "",
    publicosPersonalizados: "",
    exclusiones: "",
    formato: "",
    copies: ["", ""],
    cta: "",
    destinoClic: "",
    leads: { preguntas: "", mensajeBienvenida: "", destinoLead: "" },
    mensajes: { scriptApertura: "", preguntasCalificacion: "" },
    conversion: { landing: "", eventoPixel: "" },
    atencion: ETAPAS_ATENCION_DEFAULT.map((etapa) => ({ etapa, responsable: "", accion: "" })),
    herramientas: {
      fotosPorTipoEvento: false,
      fotosPorEquipo: false,
      presentacionPorTipoEvento: false,
      presentacionPaquetes: false,
      presentacionEventoEspecifico: false,
      disponibilidadFechas: false,
      testimonios: false,
    },
    kpis: [],
    lanzamiento: {
      pixelProbado: false,
      formularioLandingProbado: false,
      responsableAsignado: false,
      herramientasListas: false,
      presupuestoConfirmado: false,
    },
  };
}

// Merge tolerante: normaliza JSON viejo/incompleto contra la estructura actual.
export function parseBrief(raw: string | null | undefined): CampanaBrief {
  const base = defaultBrief();
  if (!raw) return base;
  try {
    const p = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!p || typeof p !== "object") return base;
    return {
      ...base,
      ...p,
      leads: { ...base.leads, ...(p.leads ?? {}) },
      mensajes: { ...base.mensajes, ...(p.mensajes ?? {}) },
      conversion: { ...base.conversion, ...(p.conversion ?? {}) },
      herramientas: { ...base.herramientas, ...(p.herramientas ?? {}) },
      lanzamiento: { ...base.lanzamiento, ...(p.lanzamiento ?? {}) },
      atencion: Array.isArray(p.atencion) && p.atencion.length ? p.atencion : base.atencion,
      copies: Array.isArray(p.copies) && p.copies.length ? p.copies : base.copies,
      kpis: Array.isArray(p.kpis) ? p.kpis : base.kpis,
    };
  } catch {
    return base;
  }
}

// El brief se considera completo cuando el checklist de lanzamiento (sección 9)
// está totalmente marcado. Esto define EjecucionCampana.briefCompleto.
export function isBriefCompleto(brief: CampanaBrief): boolean {
  const l = brief.lanzamiento;
  return (
    l.pixelProbado &&
    l.formularioLandingProbado &&
    l.responsableAsignado &&
    l.herramientasListas &&
    l.presupuestoConfirmado
  );
}

export function isBriefCompletoRaw(raw: string | null | undefined): boolean {
  return isBriefCompleto(parseBrief(raw));
}
