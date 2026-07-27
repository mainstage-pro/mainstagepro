// ─────────────────────────────────────────────────────────────────────────────
// Conjuntos de valores del proceso comercial (los "enums" del proceso).
//
// En este repo NO se usan enums de Postgres: las columnas son String y el conjunto
// de valores válido se define y valida en la app. Este archivo es la única fuente
// de verdad de esos conjuntos para el nuevo proceso. Cambiar un valor aquí obliga
// a actualizar el mapeo de migración y el seed.
//
// El contenido editable del proceso (pasos, guiones, reglas) vive en la BD
// (ProcesoSubetapa / ProcesoPaso / ProcesoRegla). Lo que vive aquí es la estructura
// fija: qué etapas existen, qué subetapas pertenecen a cada etapa y en qué orden.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from "zod";

// ── Etapa del pipeline ───────────────────────────────────────────────────────
export const ETAPAS = [
  "PROSPECCION",
  "DESCUBRIMIENTO",
  "OPORTUNIDAD",
  "VENTA_CERRADA",
  "VENTA_PERDIDA",
] as const;
export type EtapaTrato = (typeof ETAPAS)[number];

export const ETAPA_LABELS: Record<EtapaTrato, string> = {
  PROSPECCION: "Prospección",
  DESCUBRIMIENTO: "Descubrimiento",
  OPORTUNIDAD: "Oportunidad",
  VENTA_CERRADA: "Venta cerrada",
  VENTA_PERDIDA: "Venta perdida",
};

// ── Etapa interna (subetapa) ─────────────────────────────────────────────────
export const ETAPAS_INTERNAS = [
  "PRIMER_CONTACTO",
  "NURTURING",
  "FORMULARIO_ENVIADO",
  "PROPUESTA_EN_ELABORACION",
  "COTIZACION_ENVIADA",
  "CAMBIOS_Y_NEGOCIACION",
  "CONFIRMADA",
  "FORMALIZADA",
  "PERDIDA",
] as const;
export type EtapaInterna = (typeof ETAPAS_INTERNAS)[number];

export const ETAPA_INTERNA_LABELS: Record<EtapaInterna, string> = {
  PRIMER_CONTACTO: "Primer contacto",
  NURTURING: "Nurturing",
  FORMULARIO_ENVIADO: "Formulario enviado",
  PROPUESTA_EN_ELABORACION: "Propuesta en elaboración",
  COTIZACION_ENVIADA: "Cotización enviada",
  CAMBIOS_Y_NEGOCIACION: "Cambios y negociación",
  CONFIRMADA: "Confirmada",
  FORMALIZADA: "Formalizada",
  PERDIDA: "Perdida",
};

// A qué etapa pertenece cada subetapa. Estructura fija del proceso.
export const ETAPA_DE_INTERNA: Record<EtapaInterna, EtapaTrato> = {
  PRIMER_CONTACTO: "PROSPECCION",
  NURTURING: "PROSPECCION",
  FORMULARIO_ENVIADO: "DESCUBRIMIENTO",
  PROPUESTA_EN_ELABORACION: "OPORTUNIDAD",
  COTIZACION_ENVIADA: "OPORTUNIDAD",
  CAMBIOS_Y_NEGOCIACION: "OPORTUNIDAD",
  CONFIRMADA: "VENTA_CERRADA",
  FORMALIZADA: "VENTA_CERRADA",
  PERDIDA: "VENTA_PERDIDA",
};

// Subetapas de cada etapa, en orden de avance.
export const SUBETAPAS_DE_ETAPA: Record<EtapaTrato, EtapaInterna[]> = {
  PROSPECCION: ["PRIMER_CONTACTO", "NURTURING"],
  DESCUBRIMIENTO: ["FORMULARIO_ENVIADO"],
  OPORTUNIDAD: ["PROPUESTA_EN_ELABORACION", "COTIZACION_ENVIADA", "CAMBIOS_Y_NEGOCIACION"],
  VENTA_CERRADA: ["CONFIRMADA", "FORMALIZADA"],
  VENTA_PERDIDA: ["PERDIDA"],
};

// Primera subetapa (punto de entrada) al caer en una etapa.
export function primeraSubetapa(etapa: EtapaTrato): EtapaInterna {
  return SUBETAPAS_DE_ETAPA[etapa][0];
}

// ── Momento de contratación ──────────────────────────────────────────────────
export const MOMENTOS = ["EXPLORANDO", "COTIZANDO", "LISTO_PARA_DECIDIR", "URGENTE"] as const;
export type MomentoContratacion = (typeof MOMENTOS)[number];

export const MOMENTO_LABELS: Record<MomentoContratacion, string> = {
  EXPLORANDO: "Prospección",
  COTIZANDO: "Cotizando",
  LISTO_PARA_DECIDIR: "Listo para decidir",
  URGENTE: "Urgente",
};

export const MOMENTO_COLORS: Record<MomentoContratacion, string> = {
  EXPLORANDO: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  COTIZANDO: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  LISTO_PARA_DECIDIR: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  URGENTE: "bg-red-500/15 text-red-300 border-red-500/30",
};

// ── Canal de seguimiento ─────────────────────────────────────────────────────
export const CANALES = ["WHATSAPP", "LLAMADA", "EMAIL", "PRESENCIAL"] as const;
export type CanalSeguimiento = (typeof CANALES)[number];

export const CANAL_LABELS: Record<CanalSeguimiento, string> = {
  WHATSAPP: "WhatsApp",
  LLAMADA: "Llamada",
  EMAIL: "Email",
  PRESENCIAL: "Presencial",
};

// ── Modo de descubrimiento ───────────────────────────────────────────────────
export const MODOS_DESCUBRIMIENTO = ["FORMULARIO", "LLAMADA"] as const;
export type ModoDescubrimiento = (typeof MODOS_DESCUBRIMIENTO)[number];

export const MODO_DESCUBRIMIENTO_LABELS: Record<ModoDescubrimiento, string> = {
  FORMULARIO: "Formulario",
  LLAMADA: "Llamada",
};

// ── Estado del formulario (brief del cliente) ────────────────────────────────
export const FORM_ESTADOS = ["NO_ENVIADO", "ENVIADO", "COMPLETADO"] as const;
export type FormEstado = (typeof FORM_ESTADOS)[number];

export const FORM_ESTADO_LABELS: Record<FormEstado, string> = {
  NO_ENVIADO: "No enviado",
  ENVIADO: "Enviado",
  COMPLETADO: "Completado",
};

// ── Motivo de pérdida ────────────────────────────────────────────────────────
export const MOTIVOS_PERDIDA = ["PRECIO", "FECHA", "COMPETENCIA", "SIN_RESPUESTA", "EVENTO_CANCELADO"] as const;
export type MotivoPerdida = (typeof MOTIVOS_PERDIDA)[number];

export const MOTIVO_PERDIDA_LABELS: Record<MotivoPerdida, string> = {
  PRECIO: "Precio",
  FECHA: "Fecha",
  COMPETENCIA: "Competencia",
  SIN_RESPUESTA: "Sin respuesta",
  EVENTO_CANCELADO: "Evento cancelado",
};

// ── Nivel de descubrimiento (calculado, nunca capturado) ─────────────────────
export const NIVELES_DESCUBRIMIENTO = ["BASICO", "TECNICO"] as const;
export type DescubrimientoNivel = (typeof NIVELES_DESCUBRIMIENTO)[number];

export const NIVEL_DESCUBRIMIENTO_LABELS: Record<DescubrimientoNivel, string> = {
  BASICO: "Básico",
  TECNICO: "Técnico",
};

// ── Tipo de seguimiento ──────────────────────────────────────────────────────
export const TIPOS_SEGUIMIENTO = ["PROCESO", "MANUAL"] as const;
export type TipoSeguimiento = (typeof TIPOS_SEGUIMIENTO)[number];

// ── Categoría de regla del proceso ───────────────────────────────────────────
export const CATEGORIAS_REGLA = ["COMUNICACION", "CADENCIA"] as const;
export type CategoriaRegla = (typeof CATEGORIAS_REGLA)[number];

export const CATEGORIA_REGLA_LABELS: Record<CategoriaRegla, string> = {
  COMUNICACION: "Comunicación",
  CADENCIA: "Cadencia",
};

// ── Zod schemas (validación en endpoints/forms) ──────────────────────────────
export const zEtapaTrato = z.enum(ETAPAS);
export const zEtapaInterna = z.enum(ETAPAS_INTERNAS);
export const zMomento = z.enum(MOMENTOS);
export const zCanal = z.enum(CANALES);
export const zModoDescubrimiento = z.enum(MODOS_DESCUBRIMIENTO);
export const zFormEstado = z.enum(FORM_ESTADOS);
export const zMotivoPerdida = z.enum(MOTIVOS_PERDIDA);
export const zNivelDescubrimiento = z.enum(NIVELES_DESCUBRIMIENTO);
export const zTipoSeguimiento = z.enum(TIPOS_SEGUIMIENTO);
export const zCategoriaRegla = z.enum(CATEGORIAS_REGLA);

// ── Guards ───────────────────────────────────────────────────────────────────
export const esEtapa = (v: unknown): v is EtapaTrato => ETAPAS.includes(v as EtapaTrato);
export const esEtapaInterna = (v: unknown): v is EtapaInterna => ETAPAS_INTERNAS.includes(v as EtapaInterna);
export const esMomento = (v: unknown): v is MomentoContratacion => MOMENTOS.includes(v as MomentoContratacion);

// Label helpers tolerantes a null (para UI que lee datos históricos).
export const etapaLabel = (v: string | null | undefined): string =>
  v && esEtapa(v) ? ETAPA_LABELS[v] : "—";
export const etapaInternaLabel = (v: string | null | undefined): string =>
  v && esEtapaInterna(v) ? ETAPA_INTERNA_LABELS[v] : "—";
