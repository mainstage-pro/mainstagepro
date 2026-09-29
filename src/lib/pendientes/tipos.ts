// Motor de pendientes — estado DERIVADO, nunca almacenado.
//
// Un pendiente existe mientras la condición SQL que lo genera siga siendo cierta.
// Nadie lo marca como resuelto: se resuelve solo cuando el dato de origen cambia.
// Esa es la garantía de que esto no se convierte en una bandeja que hay que limpiar.

export type AreaOp = "VENTAS" | "ADMINISTRACION" | "PRODUCCION" | "MARKETING" | "RRHH" | "GENERAL";
export type Severidad = "URGENTE" | "ALTA" | "MEDIA";

export type Fuente =
  // ── Ventas ────────────────────────────────────────────────────────────────
  | "TRATO_VENCIDO"
  | "TRATO_EN_REVISION"
  | "COTIZACION_POR_VENCER"
  | "COTIZACION_APROBADA_SIN_PROYECTO"
  | "EVENTO_CONFIRMADO_SIN_APROBAR"
  // ── Proyectos ─────────────────────────────────────────────────────────────
  | "PROYECTO_SIN_PERSONAL"
  | "PLAN_SIN_APROBAR"
  | "PERSONAL_SIN_CONFIRMAR"
  | "PERSONAL_NECESITA_REVISION"
  | "EQUIPO_EXTERNO_SIN_CONFIRMAR"
  | "PROVEEDOR_SIN_LOGISTICA"
  | "CARGA_INCIDENCIA"
  | "RECOLECCION_PENDIENTE"
  | "CIERRE_FINANCIERO_PENDIENTE"
  // ── Finanzas ──────────────────────────────────────────────────────────────
  | "CXC_VENCIDA"
  | "CXP_VENCIDA"
  | "CXP_POR_VENCER"
  | "ANTICIPO_SIN_COBRAR"
  | "LIQUIDACION_PENDIENTE"
  // ── Inventario ────────────────────────────────────────────────────────────
  | "EQUIPO_MANTENIMIENTO"
  | "FALLA_CRITICA"
  | "FALLA_ESTANCADA"
  | "VEHICULO_SERVICIO"
  // ── Marketing ─────────────────────────────────────────────────────────────
  | "LEVANTAMIENTO_PROXIMO"
  | "PUBLICACION_ATRASADA"
  | "CAMPANA_SIN_PRESUPUESTO"
  | "CAMPANA_SIN_CERRAR"
  // ── RRHH ──────────────────────────────────────────────────────────────────
  | "DOCUMENTO_POR_VENCER"
  | "EVALUACION_BORRADOR"
  | "VACACIONES_PENDIENTES";

export interface Pendiente {
  id: string;               // "{FUENTE}_{entityId}"
  fuente: Fuente;
  titulo: string;
  descripcion?: string;
  area: AreaOp;
  entidadId: string;
  href: string;             // a dónde se va a EJECUTAR, no a dónde se lee
  severidad: Severidad;
  etiqueta: string;
  diasVencido?: number;
  cliente?: string;
  monto?: number;
  fechaRef?: string;        // ISO — fecha que disparó la alerta
}

export interface Contexto {
  ahora: Date;
  inicioDeHoy: Date;
  limite: number;
}

export interface DefinicionFuente {
  fuente: Fuente;
  area: AreaOp;
  etiqueta: string;
  /** La condición exacta que la dispara, en una línea legible. */
  criterio: string;
  /** Apagada = se calcula para medición pero no se muestra ni se entrega. */
  activa: boolean;
  /** Avisa ANTES de que algo se venza, en vez de reportar el daño hecho. */
  anticipa: boolean;
  computar: (ctx: Contexto) => Promise<Pendiente[]>;
}

export const LIMITE_POR_FUENTE = 50;

export function diasDesde(fecha: Date, ahora: Date): number {
  return Math.floor((ahora.getTime() - fecha.getTime()) / 86400000);
}

export function diasHasta(fecha: Date, ahora: Date): number {
  return Math.ceil((fecha.getTime() - ahora.getTime()) / 86400000);
}

/** Severidad por retraso acumulado. */
export function sevVencido(dias: number): Severidad {
  if (dias >= 7) return "URGENTE";
  if (dias >= 1) return "ALTA";
  return "MEDIA";
}

/** Severidad por cercanía: mientras menos días falten, más urgente. */
export function sevProximo(dias: number): Severidad {
  if (dias <= 2) return "URGENTE";
  if (dias <= 5) return "ALTA";
  return "MEDIA";
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * 86400000);
}

export function plural(n: number, singular: string, prefijoPlural = "s"): string {
  return `${n} ${singular}${n === 1 ? "" : prefijoPlural}`;
}
