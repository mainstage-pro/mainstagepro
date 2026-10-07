// ─────────────────────────────────────────────────────────────────────────────
// Qué vendemos (combinación de servicios) y dónde se opera (canal).
//
// La escalera es acumulativa: cada nivel supone al anterior, pero se contratan
// por separado — un cliente puede pedir dirección y operaciones sin rentarnos
// un solo equipo.
//
// `Trato.servicios` (JSON array) es la FUENTE. `Trato.tipoServicio` es su espejo
// en los valores históricos, igual que `lugarEstimado` espeja a `Venue.nombre`:
// existe para que las ~96 rutas, PDFs y portales que ya leen ese string sigan
// funcionando sin tocar nada. Nunca se captura directo.
// ─────────────────────────────────────────────────────────────────────────────

import { RENTA_MODALIDAD_ENTREGA, RENTA_NIVEL_SERVICIO } from "./form-labels";

export const SERVICIOS = ["RENTA", "PRODUCCION_TECNICA", "DIRECCION_OPERACIONES"] as const;
export type Servicio = (typeof SERVICIOS)[number];

export const SERVICIO_LABELS: Record<Servicio, string> = {
  RENTA: "Renta de equipo",
  PRODUCCION_TECNICA: "Producción técnica",
  DIRECCION_OPERACIONES: "Dirección y operaciones",
};

export const SERVICIO_DESCRIPCIONES: Record<Servicio, string> = {
  RENTA: "Entregamos el equipo. El cliente lo opera.",
  PRODUCCION_TECNICA: "Nuestro equipo, operado por nuestra gente.",
  DIRECCION_OPERACIONES:
    "Dirección de producción, operaciones de sitio, stage management, diseño y renders, coordinación de terceros.",
};

// El espejo usa los valores históricos: DIRECCION_OPERACIONES se escribe como
// DIRECCION_TECNICA porque así lo leen el discovery, los PDFs y la presentación.
const ESPEJO: Record<Servicio, string> = {
  RENTA: "RENTA",
  PRODUCCION_TECNICA: "PRODUCCION_TECNICA",
  DIRECCION_OPERACIONES: "DIRECCION_TECNICA",
};

// ── Canal operativo ──────────────────────────────────────────────────────────
// Ojo: no confundir con `Trato.canalAtencion` (WhatsApp/llamada/reunión), que es
// por dónde llegó el cliente. Esto es dónde se opera el trato.
export const CANALES = ["EVENTO", "SHOW"] as const;
export type CanalOperativo = (typeof CANALES)[number];

export const CANAL_LABELS: Record<CanalOperativo, string> = {
  EVENTO: "Evento",
  SHOW: "Show o gira",
};

export const CANAL_DESCRIPCIONES: Record<CanalOperativo, string> = {
  EVENTO: "Se opera en Proyectos, como cualquier evento.",
  SHOW: "Se opera en Shows y artistas, con advance y documentos de gira.",
};

// ── Lectura y escritura del JSON ─────────────────────────────────────────────

export function parseServicios(raw: string | null | undefined): Servicio[] {
  if (!raw) return [];
  let crudo: unknown;
  try {
    crudo = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(crudo)) return [];
  const validos = crudo.filter((s): s is Servicio => SERVICIOS.includes(s as Servicio));
  // Se ordenan por la escalera, no por el orden en que los palomeó el vendedor.
  return SERVICIOS.filter((s) => validos.includes(s));
}

export function serializeServicios(servicios: Servicio[]): string | null {
  const limpios = SERVICIOS.filter((s) => servicios.includes(s));
  return limpios.length ? JSON.stringify(limpios) : null;
}

/**
 * El valor histórico con que un escalón se guarda en `Trato.tipoServicio`. La
 * vitrina pública también lo necesita —su botón de "me interesa" abre un lead—
 * y hardcodearlo allá dejaba el espejo con dos dueños.
 */
export function espejoDeServicio(servicio: Servicio): string {
  return ESPEJO[servicio];
}

/** El nivel más alto contratado, en los valores históricos de `tipoServicio`. */
export function espejoTipoServicio(servicios: Servicio[]): string | null {
  const ordenados = SERVICIOS.filter((s) => servicios.includes(s));
  const top = ordenados[ordenados.length - 1];
  return top ? ESPEJO[top] : null;
}

/**
 * Camino inverso del espejo. El discovery y el alta de tratos siguen capturando
 * `tipoServicio` suelto; cuando eso pasa se siembra `servicios` desde ahí para
 * que las dos caras nunca queden en desacuerdo.
 */
export function serviciosDesdeTipo(tipo: string | null | undefined): Servicio[] {
  const entrada = (Object.entries(ESPEJO) as [Servicio, string][]).find(([, v]) => v === tipo);
  return entrada ? [entrada[0]] : [];
}

// ── El sello de servicio de los documentos ───────────────────────────────────

const NIVEL_RENTA_LABELS: Record<string, string> = Object.fromEntries(
  RENTA_NIVEL_SERVICIO.map((n) => [n.id, n.label]),
);

/** Etiqueta legible del valor espejo que guardan `Proyecto.tipoServicio` y los PDFs. */
export function etiquetaTipoServicio(tipo: string | null | undefined): string | null {
  const [servicio] = serviciosDesdeTipo(tipo);
  return servicio ? SERVICIO_LABELS[servicio] : null;
}

/** El nivel contratado dentro de renta, leído del JSON de logística del proyecto. */
export function nivelDeRenta(logisticaRenta: string | null | undefined): string | null {
  if (!logisticaRenta) return null;
  try {
    const d = JSON.parse(logisticaRenta) as Record<string, string>;
    return d.nivelServicio || d.modalidadServicio || null;
  } catch {
    return null;
  }
}

/** Etiqueta del nivel contratado dentro de renta, si ya se definió. */
export function etiquetaNivelRenta(logisticaRenta: string | null | undefined): string | null {
  const nivel = nivelDeRenta(logisticaRenta);
  return nivel ? NIVEL_RENTA_LABELS[nivel] ?? nivel : null;
}

/**
 * Lo que va impreso en todos los documentos del proyecto para que nadie confunda
 * un servicio con otro. En renta se baja al nivel contratado, porque su etiqueta
 * ya dice "Renta + …" y distingue lo que de verdad cambia la operación.
 */
export function selloDeServicio(
  tipoServicio: string | null | undefined,
  logisticaRenta?: string | null,
): string | null {
  if (tipoServicio === ESPEJO.RENTA) {
    const nivel = etiquetaNivelRenta(logisticaRenta);
    if (nivel) return nivel;
  }
  return etiquetaTipoServicio(tipoServicio);
}

/**
 * Renta donde el montaje lo hacemos nosotros. Es la frontera que decide si el
 * proyecto necesita ficha operativa: hay personal, cronología y traslados que
 * coordinar, no nada más equipo que entregar y firmar.
 */
export function rentaConMontaje(logisticaRenta: string | null | undefined): boolean {
  const nivel = nivelDeRenta(logisticaRenta);
  return nivel === "RENTA_MONTAJE" || nivel === "RENTA_FULL";
}

// ── Logística de renta ───────────────────────────────────────────────────────

const ENTREGA_LABELS: Record<string, string> = Object.fromEntries(
  RENTA_MODALIDAD_ENTREGA.map((m) => [m.id, m.label]),
);

export interface LogisticaRenta {
  nivel: string | null;
  entrega: string | null;
  fechaEntrega: string | null;
  horaEntrega: string | null;
  fechaDevolucion: string | null;
  horaDevolucion: string | null;
  direccionEntrega: string | null;
  quienEntrega: string | null;
  quienRecibe: string | null;
  /** "Sí" / "No" si el cliente ya lo contestó; null mientras no se especifique. */
  tecnicoPropio: string | null;
  notas: string | null;
}

/**
 * Lee el JSON de logística de renta con las etiquetas ya resueltas, para que la
 * captura de la página y lo que sale impreso digan exactamente lo mismo. Los
 * nombres viejos (`modalidadServicio`, `modalidadEntrega`, `descripcionEquipos`)
 * siguen vivos en proyectos capturados antes del rediseño del formulario.
 */
export function datosLogisticaRenta(raw: string | null | undefined): LogisticaRenta | null {
  if (!raw) return null;
  let d: Record<string, string>;
  try {
    d = JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
  if (!d || typeof d !== "object") return null;

  const v = (x: string | undefined) => (x && x.trim() ? x.trim() : null);
  const nivel = v(d.nivelServicio) ?? v(d.modalidadServicio);
  const entrega = v(d.entrega) ?? v(d.modalidadEntrega);

  const datos: LogisticaRenta = {
    nivel: nivel ? NIVEL_RENTA_LABELS[nivel] ?? nivel : null,
    entrega: entrega ? ENTREGA_LABELS[entrega] ?? entrega : null,
    fechaEntrega: v(d.fechaEntrega),
    horaEntrega: v(d.horaEntrega),
    fechaDevolucion: v(d.fechaDevolucion),
    horaDevolucion: v(d.horaDevolucion),
    direccionEntrega: v(d.direccionEntrega),
    quienEntrega: v(d.quienEntrega),
    quienRecibe: v(d.quienRecibe),
    tecnicoPropio: d.tecnicoPropio === "SI" ? "Sí" : d.tecnicoPropio === "NO" ? "No" : null,
    notas: v(d.notasLogistica) ?? v(d.descripcionEquipos),
  };

  // El JSON puede venir del trato (`ideasReferencias`), donde hay capturas que no
  // son logística de renta. Sin un solo dato que imprimir, no hay sección.
  return Object.values(datos).some(Boolean) ? datos : null;
}

export function parseCanal(raw: string | null | undefined): CanalOperativo | null {
  return CANALES.includes(raw as CanalOperativo) ? (raw as CanalOperativo) : null;
}

/**
 * El trato ya declaró qué vende y dónde se opera. Es la condición para cotizar:
 * cada servicio arma su cotización o su propuesta de forma distinta, así que
 * cotizar antes de decidirlo obliga a rehacer el documento.
 */
export function listoParaCotizar(
  servicios: string | null | undefined,
  canal: string | null | undefined,
): boolean {
  return parseServicios(servicios).length > 0 && parseCanal(canal) !== null;
}

export function resumenServicios(raw: string | null | undefined): string | null {
  const servicios = parseServicios(raw);
  if (!servicios.length) return null;
  return servicios.map((s) => SERVICIO_LABELS[s]).join(" · ");
}
