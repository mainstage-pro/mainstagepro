// Ciclo semanal de pagos a personal y orden natural de las jornadas.
// Compartido por la página de Pagos a personal, su API, el PDF, los recibos
// y la ficha del proyecto, para que todos calculen y ordenen igual.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Miércoles de pago del ciclo actual (hoy si es miércoles). */
export function cicloActualISO(hoy: Date = new Date()): string {
  const d = new Date(hoy);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
  return d.toISOString().slice(0, 10);
}

/**
 * Rango de eventos que se calculan en la nómina.
 * - Con `desde` y `hasta` (YYYY-MM-DD): rango personalizado, ambos días incluidos.
 * - Si no: ciclo semanal; el miércoles `ciclo` paga los eventos del miércoles
 *   anterior al martes previo.
 */
export function rangoNomina(params: URLSearchParams): {
  ciclo: string;
  desde: Date;
  hasta: Date;
  personalizado: boolean;
} {
  const desdeStr = params.get("desde");
  const hastaStr = params.get("hasta");
  if (desdeStr && hastaStr && ISO_DATE.test(desdeStr) && ISO_DATE.test(hastaStr)) {
    const [a, b] = desdeStr <= hastaStr ? [desdeStr, hastaStr] : [hastaStr, desdeStr];
    return {
      ciclo: params.get("ciclo") && ISO_DATE.test(params.get("ciclo")!) ? params.get("ciclo")! : cicloActualISO(),
      desde: new Date(a + "T00:00:00.000Z"),
      hasta: new Date(b + "T23:59:59.999Z"),
      personalizado: true,
    };
  }

  const cicloStr = params.get("ciclo");
  const ciclo = cicloStr && ISO_DATE.test(cicloStr) ? cicloStr : cicloActualISO();
  const base = new Date(ciclo + "T12:00:00Z");
  const desde = new Date(base);
  desde.setUTCDate(desde.getUTCDate() - 7);
  desde.setUTCHours(0, 0, 0, 0);
  const hasta = new Date(base);
  hasta.setUTCDate(hasta.getUTCDate() - 1);
  hasta.setUTCHours(23, 59, 59, 999);
  return { ciclo, desde, hasta, personalizado: false };
}

/** Orden natural de las jornadas: montaje → operación → desmontaje → resto. */
export const ORDEN_PARTICIPACION = ["MONTAJE", "OPERACION", "DESMONTAJE", "TRANSPORTE", "OTRO"] as const;

export function rangoParticipacion(p: string | null | undefined): number {
  const i = ORDEN_PARTICIPACION.indexOf((p ?? "OTRO") as (typeof ORDEN_PARTICIPACION)[number]);
  return i === -1 ? ORDEN_PARTICIPACION.length : i;
}

function fechaKey(f: string | Date | null | undefined): string {
  if (!f) return "￿"; // sin fecha al final de su jornada
  return typeof f === "string" ? f.slice(0, 10) : f.toISOString().slice(0, 10);
}

/** Compara por tipo de jornada y, dentro del mismo tipo, por fecha. */
export function compararJornada(
  a: { participacion?: string | null; fechaJornada?: string | Date | null },
  b: { participacion?: string | null; fechaJornada?: string | Date | null },
): number {
  return (
    rangoParticipacion(a.participacion) - rangoParticipacion(b.participacion) ||
    fechaKey(a.fechaJornada).localeCompare(fechaKey(b.fechaJornada))
  );
}
