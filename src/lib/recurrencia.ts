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

// ── Natural-language date detection in title ─────────────────────────────────

function _isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function _siguienteDia(dayNum: number): string {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  let diff = dayNum - hoy.getDay();
  if (diff <= 0) diff += 7;
  const next = new Date(hoy); next.setDate(hoy.getDate() + diff);
  return _isoFromDate(next);
}

export interface FechaDetectada {
  fecha: string | null;
  recurrencia: string | null;
  tituloLimpio: string;
  textoDetectado: string | null;
}

/**
 * Scans the task title for date/recurrence keywords and returns what was found.
 * Does NOT modify any state — the caller decides whether to apply it.
 */
export function detectarFechaEnTitulo(titulo: string): FechaDetectada {
  const none: FechaDetectada = { fecha: null, recurrencia: null, tituloLimpio: titulo, textoDetectado: null };
  if (!titulo.trim()) return none;
  const tLow = titulo.toLowerCase();

  // 1. Recurrence: find "cada …" — try longest word-match first
  const cadaIdx = tLow.indexOf('cada ');
  if (cadaIdx >= 0) {
    const fromCada = titulo.slice(cadaIdx);
    const words    = fromCada.trim().split(/\s+/);
    for (let len = words.length; len >= 2; len--) {
      const attempt = words.slice(0, len).join(' ');
      const cfg = parsearRecurrencia(attempt.toLowerCase());
      if (cfg) {
        const before = titulo.slice(0, cadaIdx);
        const after  = titulo.slice(cadaIdx + attempt.length);
        const tituloLimpio = (before + after).replace(/\s+/g, ' ').trim();
        return { fecha: null, recurrencia: JSON.stringify(cfg), tituloLimpio, textoDetectado: attempt };
      }
    }
  }

  // 2. "hoy"
  if (/(?:^|\s)hoy(?:\s|$)/i.test(titulo)) {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    return {
      fecha: _isoFromDate(hoy), recurrencia: null,
      tituloLimpio: titulo.replace(/(?:^|\s)hoy(?=\s|$)/i, ' ').replace(/\s+/g, ' ').trim(),
      textoDetectado: 'hoy',
    };
  }

  // 3. "mañana"
  if (/(?:^|\s)mañana(?:\s|$)/i.test(titulo)) {
    const man = new Date(); man.setHours(0,0,0,0); man.setDate(man.getDate() + 1);
    return {
      fecha: _isoFromDate(man), recurrencia: null,
      tituloLimpio: titulo.replace(/(?:^|\s)mañana(?=\s|$)/i, ' ').replace(/\s+/g, ' ').trim(),
      textoDetectado: 'mañana',
    };
  }

  // 4. "el próximo [día]" / "este [día]" / "el [día]"
  const prefixPatterns: RegExp[] = [
    /\bel\s+pr[oó]ximo\s+(\w+)/i,
    /\beste\s+(\w+)/i,
    /\bel\s+(\w+)/i,
  ];
  for (const pat of prefixPatterns) {
    const m = titulo.match(pat);
    if (m) {
      const dayNum = DIAS[m[1].toLowerCase()];
      if (dayNum !== undefined) {
        return {
          fecha: _siguienteDia(dayNum), recurrencia: null,
          tituloLimpio: titulo.replace(pat, '').replace(/\s+/g, ' ').trim(),
          textoDetectado: m[0],
        };
      }
    }
  }

  // 5. Bare full weekday name (not abbreviation) anywhere in the title
  const fullNames = ['domingo','lunes','martes','miércoles','miercoles','jueves','viernes','sábado','sabado'];
  for (const name of fullNames) {
    const pat = new RegExp(`(?:^|\\s)(${name})(?:\\s|$)`, 'i');
    const m   = titulo.match(pat);
    if (m) {
      const dayNum = DIAS[name];
      if (dayNum !== undefined) {
        return {
          fecha: _siguienteDia(dayNum), recurrencia: null,
          tituloLimpio: titulo.replace(pat, ' ').replace(/\s+/g, ' ').trim(),
          textoDetectado: m[1],
        };
      }
    }
  }

  return none;
}

/** True if the task should appear in "Hoy" (fecha is today or overdue, not completed) */
export function aparecerEnHoy(fecha: Date | null | undefined, estado: string): boolean {
  if (!fecha || estado === "COMPLETADA" || estado === "CANCELADA") return false;
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  return fecha <= hoy;
}
