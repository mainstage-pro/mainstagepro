/**
 * Lo que se le paga a un freelancer por un puesto: tarifa de jornada más bonos.
 *
 * Existe para que haya UN solo lugar donde se sume el pago. Antes cada pantalla
 * y cada endpoint leía `tarifaAcordada` directo, así que al agregar un concepto
 * había que acordarse de los diez lugares — y el recibo del técnico, la cuenta
 * por pagar y el movimiento financiero podían salir con números distintos.
 */

export const BONOS_PERSONAL = [
  { campo: "bonoMontaje", config: "bonoMontaje", label: "Montaje", ayuda: "Montaje el mismo día del evento. Si fue otro día, va como jornada aparte." },
  { campo: "bonoDesmontaje", config: "bonoDesmontaje", label: "Desmontaje", ayuda: "Desmontaje el mismo día del evento." },
  { campo: "bonoEncargado", config: "bonoEncargado", label: "Encargado", ayuda: "Responsable en sitio. Uno por proyecto." },
  { campo: "bonoChofer", config: "bonoChofer", label: "Chofer", ayuda: "Manejó unidad." },
  { campo: "bonoForaneo", config: "bonoForaneo", label: "Foráneo", ayuda: "Evento fuera de la zona local." },
] as const;

export type BonoPersonal = (typeof BONOS_PERSONAL)[number];
export type CampoBono = BonoPersonal["campo"];

export type PuestoPagable = {
  tarifaAcordada?: number | null;
} & Partial<Record<CampoBono, number | null>>;

export type ConfigBonos = Record<CampoBono, number>;

export const CONFIG_BONOS_DEFAULT: ConfigBonos = {
  bonoMontaje: 800,
  bonoDesmontaje: 800,
  bonoEncargado: 500,
  bonoChofer: 500,
  bonoForaneo: 400,
};

/** Suma de los bonos que sí aplican a este puesto. */
export function totalBonos(p: PuestoPagable): number {
  let total = 0;
  for (const b of BONOS_PERSONAL) {
    const v = p[b.campo];
    if (typeof v === "number") total += v;
  }
  return total;
}

/** Bonos activos con su monto, para mostrarlos desglosados. */
export function desgloseBonos(p: PuestoPagable): { label: string; monto: number }[] {
  return BONOS_PERSONAL.flatMap(b => {
    const v = p[b.campo];
    return typeof v === "number" ? [{ label: b.label, monto: v }] : [];
  });
}

/**
 * Pago total del puesto. Devuelve null solo si no hay tarifa NI bonos: un puesto
 * sin tarifa capturada no vale cero, está sin definir, y las pantallas lo
 * distinguen para poder reclamarlo antes del evento.
 */
export function totalPagoPersonal(p: PuestoPagable): number | null {
  const bonos = totalBonos(p);
  if (p.tarifaAcordada == null) return bonos > 0 ? bonos : null;
  return p.tarifaAcordada + bonos;
}

/** Los campos de bonos que hay que pedirle a Prisma para poder sumar el pago. */
export const SELECT_BONOS = Object.fromEntries(
  BONOS_PERSONAL.map(b => [b.campo, true as const]),
) as Record<CampoBono, true>;

// ── Jornada por horas reales ──────────────────────────────────────────────────
// Los tramos del tabulador. La jornada se escogía a mano al cotizar y nadie la
// corregía cuando el evento se alargaba; con las horas reales del proyecto se
// puede al menos avisar que ya no corresponde.

export const TRAMOS_JORNADA = [
  { jornada: "CORTA", hasta: 8 },
  { jornada: "MEDIA", hasta: 12 },
  { jornada: "LARGA", hasta: Infinity },
] as const;

export function jornadaPorHoras(horas: number): string {
  return TRAMOS_JORNADA.find(t => horas <= t.hasta)!.jornada;
}

/** Horas entre dos "HH:MM". Cruza la medianoche: un desmontaje acaba de madrugada. */
export function horasEntre(inicio: string | null | undefined, fin: string | null | undefined): number | null {
  const min = (h: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(h.trim());
    if (!m) return null;
    const hh = Number(m[1]), mm = Number(m[2]);
    if (hh > 23 || mm > 59) return null;
    return hh * 60 + mm;
  };
  if (!inicio || !fin) return null;
  const a = min(inicio), b = min(fin);
  if (a == null || b == null) return null;
  const diff = b >= a ? b - a : b + 1440 - a;
  return Math.round((diff / 60) * 100) / 100;
}
