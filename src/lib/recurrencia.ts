export interface RecurrenciaConfig {
  tipo: "diario" | "semanal" | "mensual" | "anual";
  cada: number;           // every N units
  diasSemana?: number[];  // 0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb
  diaMes?: number;        // for mensual (día fijo del mes) — legacy, un solo día
  diasMes?: number[];     // for mensual (varios días fijos del mes, ej. 1 y 15)
  semanaMes?: number[];   // 1..5 (5 = última) — para "primer lunes del mes"
  mesAnio?: number;       // 0..11 — para anual anclado a un mes (opcional)
}

/** Devuelve la lista efectiva de días del mes (une `diasMes` y el legacy `diaMes`). */
export function diasMesEfectivos(cfg: RecurrenciaConfig): number[] {
  const set = new Set<number>();
  for (const d of cfg.diasMes ?? []) if (d >= 1 && d <= 31) set.add(d);
  if (cfg.diaMes != null && cfg.diaMes >= 1 && cfg.diaMes <= 31) set.add(cfg.diaMes);
  return [...set].sort((a, b) => a - b);
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
  ultimo: 5, último: 5, ultima: 5, "última": 5,
};

const MESES: Record<string, number> = {
  enero: 0, ene: 0,
  febrero: 1, feb: 1,
  marzo: 2, mar: 2, mzo: 2,
  abril: 3, abr: 3,
  mayo: 4, may: 4,
  junio: 5, jun: 5,
  julio: 6, jul: 6,
  agosto: 7, ago: 7, agt: 7,
  septiembre: 8, sep: 8, sept: 8, set: 8,
  octubre: 9, oct: 9,
  noviembre: 10, nov: 10,
  diciembre: 11, dic: 11,
};

// Une una lista de números de día en texto natural: "lunes, miércoles y viernes"
function joinDias(nums: number[]): string {
  const NOMBRES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const names = nums.map(d => NOMBRES[d]);
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return names.join(" y ");
  return names.slice(0, -1).join(", ") + " y " + names[names.length - 1];
}

// Parsea una lista de días separada por comas y/o "y": "lunes, miércoles y viernes"
function parseDiasList(str: string): number[] | null {
  const parts = str
    .replace(/\s+y\s+/gi, ",")
    .split(",")
    .map(s => s.trim().replace(/^los\s+/, "").replace(/^el\s+/, ""))
    .filter(Boolean);
  if (parts.length === 0) return null;
  const nums: number[] = [];
  for (const p of parts) {
    const d = DIAS[p];
    if (d === undefined) return null;
    if (!nums.includes(d)) nums.push(d);
  }
  return nums.sort((a, b) => a - b);
}

const ORDINAL_LABEL = ["", "primer", "segundo", "tercer", "cuarto", "último"];

/** Parse natural-language recurrence string into a RecurrenciaConfig */
export function parsearRecurrencia(texto: string): RecurrenciaConfig | null {
  const t = texto.toLowerCase().trim();

  // ── Frases especiales (deben ir antes de los patrones genéricos) ──

  // "entre semana" / "días hábiles" / "de lunes a viernes"
  if (/^(entre semana|d[ií]as h[áa]biles|de lunes a viernes|lunes a viernes)$/.test(t)) {
    return { tipo: "semanal", cada: 1, diasSemana: [1, 2, 3, 4, 5] };
  }

  // "fin de semana" / "fines de semana" / "los fines de semana"
  if (/^(los )?fin(es)? de semana$/.test(t)) {
    return { tipo: "semanal", cada: 1, diasSemana: [0, 6] };
  }

  // "quincenal" / "cada quincena" / "cada 15 días"
  if (/^(quincenal|cada quincena|cada 15 d[ií]as)$/.test(t)) {
    return { tipo: "semanal", cada: 2, diasSemana: [new Date().getDay()] };
  }

  // "primer|segundo|tercer|cuarto|último [día] del mes" → mensual con semanaMes
  const semMes = t.match(/^(primer|primero|primera|segundo|segunda|tercer|tercero|tercera|cuarto|cuarta|quinto|quinta|[uú]ltimo|[uú]ltima) (\w+) del mes$/);
  if (semMes) {
    const n = ORDINALES[semMes[1]];
    const d = DIAS[semMes[2]];
    if (n !== undefined && d !== undefined) {
      return { tipo: "mensual", cada: 1, semanaMes: [n], diasSemana: [d] };
    }
  }

  // "cada N semanas los [día]" / "cada N semanas los [día] y [día]" / listas
  const nSemDias = t.match(/^cada (\d+) semanas? (?:los |el )?(.+)$/);
  if (nSemDias) {
    const dias = parseDiasList(nSemDias[2]);
    if (dias) return { tipo: "semanal", cada: parseInt(nSemDias[1]), diasSemana: dias };
  }

  // "cada día" / "diario" / "todos los días"
  if (/^(cada d[ií]a|diario|todos los d[ií]as|diariamente)$/.test(t)) {
    return { tipo: "diario", cada: 1 };
  }

  // "cada N días"
  const nDias = t.match(/^cada (\d+) d[ií]as?$/);
  if (nDias) return { tipo: "diario", cada: parseInt(nDias[1]) };

  // "cada semana" / "semanalmente"
  if (/^(cada semana|semanal|semanalmente)$/.test(t)) {
    return { tipo: "semanal", cada: 1, diasSemana: [new Date().getDay()] };
  }

  // "cada N semanas"
  const nSem = t.match(/^cada (\d+) semanas?$/);
  if (nSem) return { tipo: "semanal", cada: parseInt(nSem[1]), diasSemana: [new Date().getDay()] };

  // "los días 1 y 15 del mes" / "días 1, 15 y 30 de cada mes"
  const diasMesLista = t.match(/^(?:los\s+)?d[ií]as\s+([\d,\sy]+?)\s+(?:del\s+mes|de\s+cada\s+mes)$/);
  if (diasMesLista) {
    const nums = diasMesLista[1]
      .replace(/\s+y\s+/gi, ",")
      .split(",")
      .map(s => parseInt(s.trim(), 10))
      .filter(n => n >= 1 && n <= 31);
    if (nums.length) {
      const uniq = [...new Set(nums)].sort((a, b) => a - b);
      return { tipo: "mensual", cada: 1, diasMes: uniq };
    }
  }

  // "día 10 del mes" / "el día 10 de cada mes" / "cada día 10 del mes"
  const unDiaMes = t.match(/^(?:cada\s+)?(?:el\s+)?d[ií]a\s+(\d{1,2})\s+(?:del\s+mes|de\s+cada\s+mes)$/);
  if (unDiaMes) {
    const dia = parseInt(unDiaMes[1], 10);
    if (dia >= 1 && dia <= 31) return { tipo: "mensual", cada: 1, diaMes: dia };
  }

  // "cada mes el día 10" / "cada mes, día 10"
  const cadaMesDia = t.match(/^cada\s+mes,?\s+(?:el\s+)?d[ií]a\s+(\d{1,2})$/);
  if (cadaMesDia) {
    const dia = parseInt(cadaMesDia[1], 10);
    if (dia >= 1 && dia <= 31) return { tipo: "mensual", cada: 1, diaMes: dia };
  }

  // "cada N meses el día 10"
  const nMesesDia = t.match(/^cada\s+(\d+)\s+meses?,?\s+(?:el\s+)?d[ií]a\s+(\d{1,2})$/);
  if (nMesesDia) {
    const dia = parseInt(nMesesDia[2], 10);
    if (dia >= 1 && dia <= 31) return { tipo: "mensual", cada: parseInt(nMesesDia[1], 10), diaMes: dia };
  }

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

  // "cada [día] y [día]" / "cada [día], [día] y [día]" / listas de 2+ días
  const listaDias = t.match(/^cada (?:los |el )?(.+ (?:y|,) .+)$/);
  if (listaDias) {
    const dias = parseDiasList(listaDias[1]);
    if (dias && dias.length >= 2) {
      return { tipo: "semanal", cada: 1, diasSemana: dias };
    }
  }

  return null;
}

/** Format a RecurrenciaConfig back to human-readable Spanish */
export function formatearRecurrencia(cfg: RecurrenciaConfig): string {
  if (cfg.tipo === "diario") {
    return cfg.cada === 1 ? "Cada día" : `Cada ${cfg.cada} días`;
  }

  if (cfg.tipo === "semanal") {
    const ds = [...(cfg.diasSemana ?? [])].sort((a, b) => a - b);
    // Casos especiales
    if (cfg.cada === 1 && ds.length === 5 && ds.join() === "1,2,3,4,5") return "Entre semana (L–V)";
    if (cfg.cada === 1 && ds.length === 2 && ds.join() === "0,6") return "Fines de semana";
    const dias = joinDias(ds);
    if (cfg.cada === 1) return dias ? `Cada ${dias}` : "Cada semana";
    if (cfg.cada === 2) return dias ? `Quincenal, los ${dias}` : "Quincenal";
    return dias ? `Cada ${cfg.cada} semanas los ${dias}` : `Cada ${cfg.cada} semanas`;
  }

  if (cfg.tipo === "mensual") {
    // "primer lunes del mes" — soporta varios ordinales y varios días
    if (cfg.semanaMes?.length && cfg.diasSemana?.length) {
      const ords = cfg.semanaMes.map(n => ORDINAL_LABEL[n] ?? "").filter(Boolean);
      const ord = ords.length <= 1 ? ords.join("") : ords.slice(0, -1).join(", ") + " y " + ords[ords.length - 1];
      const dia = joinDias(cfg.diasSemana);
      const base = `El ${ord} ${dia} del mes`;
      return cfg.cada === 1 ? base : `${base} (cada ${cfg.cada} meses)`;
    }
    // "día 10" o "días 1, 15 y 30"
    const dias = diasMesEfectivos(cfg);
    if (dias.length > 1) {
      const lista = dias.slice(0, -1).join(", ") + " y " + dias[dias.length - 1];
      return cfg.cada === 1 ? `Cada mes, días ${lista}` : `Cada ${cfg.cada} meses, días ${lista}`;
    }
    const dia = dias[0] ?? 1;
    return cfg.cada === 1 ? `Cada mes, día ${dia}` : `Cada ${cfg.cada} meses, día ${dia}`;
  }

  if (cfg.tipo === "anual") {
    return cfg.cada === 1 ? "Cada año" : `Cada ${cfg.cada} años`;
  }

  return "";
}

// Devuelve la fecha del n-ésimo `weekday` del mes (n=5 → último). null si no existe.
function fechaSemanaMes(year: number, month: number, weekday: number, n: number): Date | null {
  if (n >= 5) {
    const last = new Date(year, month + 1, 0);
    const diff = (last.getDay() - weekday + 7) % 7;
    return new Date(year, month, last.getDate() - diff);
  }
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  if (day > diasEnMes) return null; // p.ej. no hay 5º lunes
  return new Date(year, month, day);
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
    // "primer lunes del mes" — semana-del-mes + día de la semana
    if (cfg.semanaMes?.length && cfg.diasSemana?.length) {
      const semanas = cfg.semanaMes;
      const dias = cfg.diasSemana;
      let y = d.getFullYear();
      let m = d.getMonth();
      for (let iter = 0; iter < 36; iter++) {
        const candidatos: Date[] = [];
        for (const s of semanas) {
          for (const w of dias) {
            const f = fechaSemanaMes(y, m, w, s);
            if (f && f.getTime() > d.getTime()) candidatos.push(f);
          }
        }
        if (candidatos.length) {
          candidatos.sort((a, b) => a.getTime() - b.getTime());
          return candidatos[0];
        }
        // avanzar `cada` meses
        m += cfg.cada;
        y += Math.floor(m / 12);
        m = ((m % 12) + 12) % 12;
      }
      // fallback improbable
      return new Date(y, m, 1);
    }

    // Uno o varios días fijos del mes (ej. 1 y 15)
    const dias = diasMesEfectivos(cfg);
    if (dias.length > 1) {
      // ¿Queda algún día del listado más adelante en el mes actual?
      const maxEste = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const siguienteEste = dias.find(x => Math.min(x, maxEste) > d.getDate());
      if (siguienteEste !== undefined) {
        return new Date(d.getFullYear(), d.getMonth(), Math.min(siguienteEste, maxEste));
      }
      // Si no, avanzar `cada` meses y tomar el primer día del listado
      const mes = d.getMonth() + cfg.cada;
      const anio = d.getFullYear() + Math.floor(mes / 12);
      const mesReal = ((mes % 12) + 12) % 12;
      const maxDia = new Date(anio, mesReal + 1, 0).getDate();
      return new Date(anio, mesReal, Math.min(dias[0], maxDia));
    }

    const mes = d.getMonth() + cfg.cada;
    const anio = d.getFullYear() + Math.floor(mes / 12);
    const mesReal = mes % 12;
    const dia = dias[0] ?? d.getDate();
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

// Resultado de la detección inline estilo Todoist (no anclada).
export interface DeteccionInline {
  matchTexto: string | null;      // subcadena detectada dentro del texto original
  cfg: RecurrenciaConfig | null;  // recurrencia detectada
  fecha: string | null;           // fecha ISO detectada
  tituloLimpio: string;           // texto sin el token detectado
}

// Elimina la primera aparición literal de `match` y normaliza espacios.
function _quitarMatch(texto: string, match: string): string {
  const idx = texto.toLowerCase().indexOf(match.toLowerCase());
  if (idx < 0) return texto.trim();
  return (texto.slice(0, idx) + texto.slice(idx + match.length)).replace(/\s+/g, " ").trim();
}

const _MESES_RE = "enero|ene|febrero|feb|marzo|mzo|mar|abril|abr|mayo|may|junio|jun|julio|jul|agosto|agt|ago|septiembre|sept|sep|set|octubre|oct|noviembre|nov|diciembre|dic";

// Frases de recurrencia que NO empiezan con "cada".
const _FRASES_REC: RegExp[] = [
  /\b(primer|primero|primera|segundo|segunda|tercer|tercero|tercera|cuarto|cuarta|quinto|quinta|[uú]ltimo|[uú]ltima)\s+(lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo)\s+del\s+mes\b/i,
  /\b(quincenal|cada quincena)\b/i,
  /\b(entre semana|d[ií]as h[áa]biles|de lunes a viernes)\b/i,
  /\bfin(?:es)? de semana\b/i,
];

/**
 * Detección inline estilo Todoist: busca (NO anclado) tokens de fecha y
 * recurrencia dentro de un texto libre y devuelve qué se encontró, sin
 * modificar nada. El llamador decide si aplicar.
 */
export function detectarEnTexto(texto: string): DeteccionInline {
  const none: DeteccionInline = { matchTexto: null, cfg: null, fecha: null, tituloLimpio: texto };
  if (!texto.trim()) return none;

  // 1a. Frases de recurrencia no ancladas (quincenal, entre semana, primer lunes del mes…)
  for (const re of _FRASES_REC) {
    const m = texto.match(re);
    if (m) {
      const cfg = parsearRecurrencia(m[0].toLowerCase());
      if (cfg) return { matchTexto: m[0], cfg, fecha: null, tituloLimpio: _quitarMatch(texto, m[0]) };
    }
  }

  // 1b. Recurrencia "cada …" — probar la coincidencia de palabras más larga
  const tLow = texto.toLowerCase();
  const cadaIdx = tLow.indexOf("cada ");
  if (cadaIdx >= 0) {
    const words = texto.slice(cadaIdx).trim().split(/\s+/);
    for (let len = Math.min(words.length, 8); len >= 2; len--) {
      const attempt = words.slice(0, len).join(" ");
      const cfg = parsearRecurrencia(attempt.toLowerCase());
      if (cfg) {
        const before = texto.slice(0, cadaIdx);
        const after  = texto.slice(cadaIdx + attempt.length);
        return { matchTexto: attempt, cfg, fecha: null, tituloLimpio: (before + after).replace(/\s+/g, " ").trim() };
      }
    }
  }

  // 2. "hoy"
  const mHoy = texto.match(/(?:^|\s)(hoy)(?:\s|$)/i);
  if (mHoy) {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    return { matchTexto: mHoy[1], cfg: null, fecha: _isoFromDate(hoy), tituloLimpio: _quitarMatch(texto, mHoy[1]) };
  }

  // 3. "mañana"
  const mMan = texto.match(/(?:^|\s)(mañana)(?:\s|$)/i);
  if (mMan) {
    const man = new Date(); man.setHours(0,0,0,0); man.setDate(man.getDate() + 1);
    return { matchTexto: mMan[1], cfg: null, fecha: _isoFromDate(man), tituloLimpio: _quitarMatch(texto, mMan[1]) };
  }

  // 4. "el próximo [día]" / "este [día]" / "el [día]"
  const prefixPatterns: RegExp[] = [
    /\bel\s+pr[oó]ximo\s+(\w+)/i,
    /\beste\s+(\w+)/i,
    /\bel\s+(\w+)/i,
  ];
  for (const pat of prefixPatterns) {
    const m = texto.match(pat);
    if (m) {
      const dayNum = DIAS[m[1].toLowerCase()];
      if (dayNum !== undefined) {
        return { matchTexto: m[0], cfg: null, fecha: _siguienteDia(dayNum), tituloLimpio: _quitarMatch(texto, m[0]) };
      }
    }
  }

  // 5. Fecha numérica "5 jul" / "5 de julio"
  const mFecha = texto.match(new RegExp(`\\b(\\d{1,2})\\s+(?:de\\s+)?(${_MESES_RE})\\b`, "i"));
  if (mFecha) {
    const dia = parseInt(mFecha[1], 10);
    const mes = MESES[mFecha[2].toLowerCase()];
    if (mes !== undefined && dia >= 1 && dia <= 31) {
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      let anio = hoy.getFullYear();
      let cand = new Date(anio, mes, dia);
      if (cand < hoy) { anio += 1; cand = new Date(anio, mes, dia); }
      return { matchTexto: mFecha[0], cfg: null, fecha: _isoFromDate(cand), tituloLimpio: _quitarMatch(texto, mFecha[0]) };
    }
  }

  // 6. Día de la semana suelto (nombre completo) en cualquier parte
  const fullNames = ['domingo','lunes','martes','miércoles','miercoles','jueves','viernes','sábado','sabado'];
  for (const name of fullNames) {
    const pat = new RegExp(`(?:^|\\s)(${name})(?:\\s|$)`, 'i');
    const m   = texto.match(pat);
    if (m) {
      const dayNum = DIAS[name];
      if (dayNum !== undefined) {
        return { matchTexto: m[1], cfg: null, fecha: _siguienteDia(dayNum), tituloLimpio: _quitarMatch(texto, m[1]) };
      }
    }
  }

  return none;
}

/**
 * Compatibilidad: devuelve la forma previa { fecha, recurrencia, tituloLimpio,
 * textoDetectado } delegando en `detectarEnTexto`.
 */
export function detectarFechaEnTitulo(titulo: string): FechaDetectada {
  const d = detectarEnTexto(titulo);
  return {
    fecha: d.fecha,
    recurrencia: d.cfg ? JSON.stringify(d.cfg) : null,
    tituloLimpio: d.tituloLimpio,
    textoDetectado: d.matchTexto,
  };
}

/** True if the task should appear in "Hoy" (fecha is today or overdue, not completed) */
export function aparecerEnHoy(fecha: Date | null | undefined, estado: string): boolean {
  if (!fecha || estado === "COMPLETADA" || estado === "CANCELADA") return false;
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  return fecha <= hoy;
}

/**
 * True si el patrón de recurrencia cae en la fecha `ref` (por defecto hoy).
 * Sirve para que los compromisos recurrentes (que se guardan con fecha=null)
 * aparezcan en "Hoy" el día que toca, sin depender de un campo `fecha`.
 * Nota: para patrones "cada N" sin fecha ancla se aproxima al patrón base
 * (p.ej. "cada 2 semanas los lunes" se muestra todos los lunes).
 */
export function recurrenciaOcurreEnFecha(cfg: RecurrenciaConfig, ref: Date = new Date()): boolean {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);

  if (cfg.tipo === "diario") return true;

  if (cfg.tipo === "semanal") {
    const dias = cfg.diasSemana ?? [];
    return dias.includes(d.getDay());
  }

  if (cfg.tipo === "mensual") {
    if (cfg.semanaMes?.length && cfg.diasSemana?.length) {
      for (const s of cfg.semanaMes) {
        for (const w of cfg.diasSemana) {
          const f = fechaSemanaMes(d.getFullYear(), d.getMonth(), w, s);
          if (f && f.getDate() === d.getDate()) return true;
        }
      }
      return false;
    }
    const dias = diasMesEfectivos(cfg);
    const maxDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    if (dias.length) {
      return dias.some(dia => d.getDate() === Math.min(dia, maxDia));
    }
    return d.getDate() === Math.min(1, maxDia);
  }

  // anual: sin fecha ancla no se puede determinar de forma fiable
  return false;
}

/** Igual que `recurrenciaOcurreEnFecha` pero recibe el JSON crudo de recurrencia. */
export function recurrenciaOcurreHoy(recurrenciaRaw: string | null | undefined, ref: Date = new Date()): boolean {
  if (!recurrenciaRaw) return false;
  let cfg: RecurrenciaConfig | null = null;
  try { cfg = JSON.parse(recurrenciaRaw) as RecurrenciaConfig; } catch { return false; }
  if (!cfg || !cfg.tipo) return false;
  return recurrenciaOcurreEnFecha(cfg, ref);
}
