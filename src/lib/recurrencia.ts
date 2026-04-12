export interface RecurrenciaConfig {
  tipo: "diario" | "semanal" | "mensual" | "anual";
  cada: number;           // every N units
  diasSemana?: number[];  // 0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb
  diaMes?: number;        // for mensual
}

const DIAS: Record<string, number> = {
  domingo: 0, dom: 0,
  lunes: 1, lun: 1,
  martes: 2, mar: 2,
  "miércoles": 3, miercoles: 3, mié: 3, mie: 3,
  jueves: 4, jue: 4,
  viernes: 5, vie: 5,
  sábado: 6, sabado: 6, sáb: 6, sab: 6,
};

const ORDINALES: Record<string, number> = {
  primer: 1, primero: 1, primera: 1,
  segundo: 2, segunda: 2,
  tercer: 3, tercero: 3, tercera: 3,
  cuarto: 4, cuarta: 4,
  quinto: 5, quinta: 5,
};

/** Parse natural-language recurrence string into a RecurrenciaConfig */
export function parsearRecurrencia(texto: string): RecurrenciaConfig | null {
  const t = texto.toLowerCase().trim();

  // "cada día" / "diario" / "todos los días"
  if (/^(cada día|diario|todos los días|diariamente)$/.test(t)) {
    return { tipo: "diario", cada: 1 };
  }

  // "cada N días"
  const nDias = t.match(/^cada (\d+) días?$/);
  if (nDias) return { tipo: "diario", cada: parseInt(nDias[1]) };

  // "cada semana" / "semanalmente"
  if (/^(cada semana|semanal|semanalmente)$/.test(t)) {
    return { tipo: "semanal", cada: 1, diasSemana: [new Date().getDay()] };
  }

  // "cada N semanas"
  const nSem = t.match(/^cada (\d+) semanas?$/);
  if (nSem) return { tipo: "semanal", cada: parseInt(nSem[1]), diasSemana: [new Date().getDay()] };

  // "cada mes" / "mensual"
  if (/^(cada mes|mensual|mensualmente)$/.test(t)) {
    return { tipo: "mensual", cada: 1, diaMes: new Date().getDate() };
  }

  // "cada N meses"
  const nMeses = t.match(/^cada (\d+) meses?$/);
  if (nMeses) return { tipo: "mensual", cada: parseInt(nMeses[1]), diaMes: new Date().getDate() };

  // "cada año" / "anual"
  if (/^(cada año|anual|anualmente)$/.test(t)) {
    return { tipo: "anual", cada: 1 };
  }

  // "cada [ordinal] [día]"  e.g. "cada tercer viernes" → cada:3 diasSemana:[5]
  const ordDia = t.match(/^cada (\w+) (\w+)$/);
  if (ordDia) {
    const n = ORDINALES[ordDia[1]];
    const d = DIAS[ordDia[2]];
    if (n !== undefined && d !== undefined) {
      return { tipo: "semanal", cada: n, diasSemana: [d] };
    }
  }

  // "cada [día]"  e.g. "cada lunes"
  const soloDia = t.match(/^cada (\w+)$/);
  if (soloDia) {
    const d = DIAS[soloDia[1]];
    if (d !== undefined) return { tipo: "semanal", cada: 1, diasSemana: [d] };
  }

  // "cada [día] y [día]"  e.g. "cada martes y jueves"
  const dosDias = t.match(/^cada (\w+) y (\w+)$/);
  if (dosDias) {
    const d1 = DIAS[dosDias[1]];
    const d2 = DIAS[dosDias[2]];
    if (d1 !== undefined && d2 !== undefined) {
      return { tipo: "semanal", cada: 1, diasSemana: [d1, d2].sort((a, b) => a - b) };
    }
  }

  // "cada [día], [día] y [día]"
  const tresDias = t.match(/^cada (\w+),\s*(\w+)\s*y\s*(\w+)$/);
  if (tresDias) {
    const ds = [DIAS[tresDias[1]], DIAS[tresDias[2]], DIAS[tresDias[3]]];
    if (ds.every(d => d !== undefined)) {
      return { tipo: "semanal", cada: 1, diasSemana: ds.sort((a, b) => a - b) };
    }
  }

  return null;
}

/** Format a RecurrenciaConfig back to human-readable Spanish */
export function formatearRecurrencia(cfg: RecurrenciaConfig): string {
  const NOMBRES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  if (cfg.tipo === "diario") {
    return cfg.cada === 1 ? "Cada día" : `Cada ${cfg.cada} días`;
  }

  if (cfg.tipo === "semanal") {
    const dias = (cfg.diasSemana ?? []).map(d => NOMBRES[d]).join(" y ");
    if (cfg.cada === 1) return `Cada ${dias}`;
    return `Cada ${cfg.cada} semanas los ${dias}`;
  }

  if (cfg.tipo === "mensual") {
    const dia = cfg.diaMes ?? 1;
    return cfg.cada === 1 ? `Cada mes, día ${dia}` : `Cada ${cfg.cada} meses, día ${dia}`;
  }

  if (cfg.tipo === "anual") {
    return cfg.cada === 1 ? "Cada año" : `Cada ${cfg.cada} años`;
  }

  return "";
}

/** Given a config and a reference date (when last occurred), return the next date */
export function calcularProximaFecha(cfg: RecurrenciaConfig, desde: Date): Date {
  const d = new Date(desde);

  if (cfg.tipo === "diario") {
    d.setDate(d.getDate() + cfg.cada);
    return d;
  }

  if (cfg.tipo === "semanal") {
    const dias = cfg.diasSemana ?? [d.getDay()];
    const cada = cfg.cada;

    // Find next matching weekday after `desde`
    const base = new Date(d);
    base.setDate(base.getDate() + 1); // start from tomorrow

    // Check up to 7*cada days for next matching day
    for (let i = 0; i < 7 * cada; i++) {
      if (dias.includes(base.getDay())) {
        // If cada > 1, we need to check week offset
        if (cada === 1) return base;
        // For "cada N semanas": compute weeks since first occurrence
        const diffDays = Math.floor((base.getTime() - d.getTime()) / 86400000);
        const diffWeeks = Math.floor(diffDays / 7);
        if (diffWeeks % cada === 0) return base;
      }
      base.setDate(base.getDate() + 1);
    }

    // Fallback: add N weeks from the current weekday
    const next = new Date(d);
    next.setDate(next.getDate() + 7 * cada);
    return next;
  }

  if (cfg.tipo === "mensual") {
    const mes = d.getMonth() + cfg.cada;
    const anio = d.getFullYear() + Math.floor(mes / 12);
    const mesReal = mes % 12;
    const dia = cfg.diaMes ?? d.getDate();
    const maxDia = new Date(anio, mesReal + 1, 0).getDate();
    return new Date(anio, mesReal, Math.min(dia, maxDia));
  }

  if (cfg.tipo === "anual") {
    return new Date(d.getFullYear() + cfg.cada, d.getMonth(), d.getDate());
  }

  return d;
}

/** True if the task should appear in "Hoy" (fecha is today or overdue, not completed) */
export function aparecerEnHoy(fecha: Date | null | undefined, estado: string): boolean {
  if (!fecha || estado === "COMPLETADA" || estado === "CANCELADA") return false;
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  return fecha <= hoy;
}
