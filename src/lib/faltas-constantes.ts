// Constantes puras del sistema de faltas (sin dependencias de servidor).
// Se importan tanto desde endpoints como desde componentes cliente.

export type Gravedad = "LEVE" | "GRAVE" | "MUY_GRAVE";
export type CategoriaFalta = "ASISTENCIA" | "CONDUCTA" | "OPERACION" | "DESEMPEÑO" | "RECONOCIMIENTO";

export interface FaltaSemilla {
  codigo: string;
  nombre: string;
  categoria: CategoriaFalta;
  gravedad: Gravedad;
  deteccion: "MANUAL" | "AUTO";
  calculoTipo: "FIJO" | "PORCENTAJE_DIA" | "PORCENTAJE_HORA" | "SIN_DESCUENTO";
  valor: number;
  esDescuento: boolean;
  descripcion: string;
}

// Días hacia atrás que cuentan para el escalón de reincidencia.
export const VENTANA_ESCALON_DIAS = 180;

// ─── Catálogo semilla ────────────────────────────────────────────────────────
export const CATALOGO_FALTAS: FaltaSemilla[] = [
  // LEVES — 1ra vez: registro y revisión; reinciden y escalan.
  { codigo: "FL-ORDEN", nombre: "Desorden en área de trabajo", categoria: "OPERACION", gravedad: "LEVE", deteccion: "MANUAL", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "No dejar el área como se encontró al terminar la jornada (Reglamento §1)." },
  { codigo: "FL-EQUIPO-GUARDADO", nombre: "Equipo o cables mal guardados", categoria: "OPERACION", gravedad: "LEVE", deteccion: "MANUAL", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "Equipo, herramienta o cables sin guardar en su lugar o mal enrollados (Reglamento §1)." },
  { codigo: "FL-TELEFONO", nombre: "Uso indebido del teléfono personal en jornada", categoria: "CONDUCTA", gravedad: "LEVE", deteccion: "MANUAL", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "Uso prolongado del teléfono personal interfiriendo con el rol (Reglamento §4)." },
  { codigo: "FL-VISITA", nombre: "No avisar visita externa con anticipación", categoria: "OPERACION", gravedad: "LEVE", deteccion: "MANUAL", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "Recibir visita externa sin avisar al área correspondiente (Reglamento §5)." },
  { codigo: "FL-VESTIMENTA", nombre: "Presentación o vestimenta fuera de estándar", categoria: "CONDUCTA", gravedad: "LEVE", deteccion: "MANUAL", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "No cumplir el código de vestimenta o presentación en campo (Reglamento Freelance §1)." },

  // GRAVES — amonestación escrita y posible penalización económica.
  { codigo: "FG-FALTA-INJUST", nombre: "Falta injustificada", categoria: "ASISTENCIA", gravedad: "GRAVE", deteccion: "AUTO", calculoTipo: "PORCENTAJE_DIA", valor: 100, esDescuento: true,
    descripcion: "Ausencia sin justificación conforme a ley. Se detecta desde el módulo de Asistencia (Reglamento §9)." },
  { codigo: "FG-PLAN-INCUMPLIDO", nombre: "Incumplimiento de entregables del plan de trabajo", categoria: "DESEMPEÑO", gravedad: "GRAVE", deteccion: "AUTO", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "Tareas o entregables del plan de trabajo vencidos o no realizados. Se detecta desde Rendimiento." },
  { codigo: "FG-GASTO-SIN-COMPROBANTE", nombre: "Gasto sin comprobante ni notificación", categoria: "OPERACION", gravedad: "GRAVE", deteccion: "MANUAL", calculoTipo: "FIJO", valor: 0, esDescuento: true,
    descripcion: "Gasto con dinero de la empresa sin comprobante y sin aviso; se descuenta el monto (Reglamento §12)." },
  { codigo: "FG-CIERRE", nombre: "No ejecutar el protocolo de cierre", categoria: "OPERACION", gravedad: "GRAVE", deteccion: "MANUAL", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "Dejar instalaciones sin asegurar: luces, puertas, candados o camioneta (Reglamento §2)." },
  { codigo: "FG-USO-PERSONAL", nombre: "Uso personal no autorizado de equipo o vehículo", categoria: "OPERACION", gravedad: "GRAVE", deteccion: "MANUAL", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "Uso de equipo, herramienta o vehículo para fines ajenos a la empresa sin autorización (Reglamento §10)." },
  { codigo: "FG-CANCELACION", nombre: "Cancelación tardía o no presentación (freelance)", categoria: "CONDUCTA", gravedad: "GRAVE", deteccion: "MANUAL", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "No avisar con al menos 48 h o no presentarse a un llamado (Reglamento Freelance §2)." },

  // MUY GRAVES — penalización fuerte, suspensión o rescisión / no recontratación.
  { codigo: "FMG-OCULTAR-DANO", nombre: "Ocultar o retrasar reporte de daño o pérdida", categoria: "OPERACION", gravedad: "MUY_GRAVE", deteccion: "MANUAL", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "No reportar de inmediato un daño, pérdida o faltante de equipo, vehículo o instalación (Reglamento §11)." },
  { codigo: "FMG-CONFIDENCIALIDAD", nombre: "Violación de confidencialidad", categoria: "CONDUCTA", gravedad: "MUY_GRAVE", deteccion: "MANUAL", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "Divulgar información de clientes, precios, proyectos u operación interna (Reglamento §6)." },
  { codigo: "FMG-RESPETO", nombre: "Falta de respeto, acoso o conducta intimidante", categoria: "CONDUCTA", gravedad: "MUY_GRAVE", deteccion: "MANUAL", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "Ofensas verbales, contacto físico no deseado, acoso o discriminación (Reglamento §7)." },
  { codigo: "FMG-SUSTANCIAS", nombre: "Alcohol o sustancias en servicio", categoria: "CONDUCTA", gravedad: "MUY_GRAVE", deteccion: "MANUAL", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "Consumo de alcohol o cualquier sustancia antes o durante el servicio (Reglamento Freelance §4)." },
  { codigo: "FMG-3FALTAS", nombre: "3 faltas injustificadas en 30 días", categoria: "ASISTENCIA", gravedad: "MUY_GRAVE", deteccion: "AUTO", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "Causal de rescisión conforme al art. 47 LFT. Se detecta desde el módulo de Asistencia." },

  // RECONOCIMIENTOS — el sistema también registra lo positivo para una evaluación balanceada.
  { codigo: "REC-INICIATIVA", nombre: "Iniciativa y esfuerzo sobresaliente", categoria: "RECONOCIMIENTO", gravedad: "LEVE", deteccion: "MANUAL", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "Reconocimiento por proactividad, aprovechamiento del tiempo o resultados por encima del estándar." },
  { codigo: "REC-EVENTO", nombre: "Desempeño destacado en operación de evento", categoria: "RECONOCIMIENTO", gravedad: "LEVE", deteccion: "MANUAL", calculoTipo: "SIN_DESCUENTO", valor: 0, esDescuento: false,
    descripcion: "Reconocimiento por ejecución técnica impecable o manejo sobresaliente en campo." },
];

// ─── Matriz de consecuencias (gravedad × nivel de reincidencia) ───────────────
// Implementa el escalón del Reglamento §13: 1ra revisión → 2da penalización → 3ra mayor.
export const MATRIZ_CONSECUENCIAS: Record<Gravedad, Record<number, string>> = {
  LEVE: {
    1: "Registro y revisión conjunta con el colaborador. Sin penalización económica.",
    2: "Amonestación verbal documentada. Se advierte que una nueva incidencia escala a amonestación escrita.",
    3: "Amonestación escrita. Dirección puede definir un descuento menor según el caso.",
  },
  GRAVE: {
    1: "Amonestación escrita y revisión conjunta. Registro formal en el expediente.",
    2: "Amonestación escrita + penalización económica definida por Dirección.",
    3: "Penalización económica y suspensión temporal. Se evalúa la continuidad de la relación laboral.",
  },
  MUY_GRAVE: {
    1: "Amonestación escrita grave + penalización económica. Posible suspensión inmediata.",
    2: "Suspensión y evaluación formal de continuidad de la relación laboral.",
    3: "Rescisión o no recontratación conforme a la Ley Federal del Trabajo.",
  },
};

export function sugerirConsecuencia(gravedad: Gravedad, nivel: number): string {
  const escalones = MATRIZ_CONSECUENCIAS[gravedad] ?? MATRIZ_CONSECUENCIAS.LEVE;
  const n = Math.min(Math.max(nivel, 1), 3);
  return escalones[n] ?? escalones[3];
}

export function etiquetaGravedad(g: string): string {
  return g === "MUY_GRAVE" ? "Muy grave" : g === "GRAVE" ? "Grave" : "Leve";
}

export function etiquetaNivel(n: number): string {
  return n <= 1 ? "1ra incidencia" : n === 2 ? "2da incidencia" : `${n}ª incidencia`;
}
