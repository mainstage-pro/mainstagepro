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
