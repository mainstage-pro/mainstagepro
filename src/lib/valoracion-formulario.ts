// Motor de valoración de respuestas de formularios de reclutamiento (Fase 2).
//
// Función pura: recibe todo lo necesario ya cargado (preguntas visibles, snapshots,
// respuestas y la config del formulario) y devuelve el resultado completo.
// NO toca prisma ni hace I/O. Se usa tanto al recibir una postulación como al
// recalificar manualmente desde el editor.
//
// Las preguntas se consideran una a una con la forma de su snapshot, que es lo
// que se guardó al recibir: así ediciones posteriores del formulario no mueven
// puntajes históricos (versionado de Fase 1).
//
// Ambigüedades que resolví por mi cuenta (la spec las deja implícitas):
//  - `excluyeSi: "incorrecta"` → excluye cuando el valor no coincide con
//    `correcta`. Si no hay valor, NO excluye (no responder una opcional no
//    debe rechazar al candidato; las obligatorias ya se validan antes).
//  - `requiere` (opción múltiple): si alguna opción requerida NO está marcada,
//    excluye. Si la pregunta no se respondió, NO excluye (idem).
//  - Preguntas P con mapa de puntos: posible = max(valores del mapa); obtenido =
//    valor de la opción respondida, o 0 si no coincide/no respondió.
//  - Opción múltiple con `porOpcion`: cada opción marcada vale ese número;
//    con `puntosPorOpcion`: mapa por opción; ambos se topan con `max`.
//  - Preguntas M: posibles = `max` (3 por defecto) siempre que la pregunta sea
//    visible. Si `calificacionManual` es null todavía, no suma al obtenido ni
//    al posible del PRELIMINAR (porque la spec dice "con los M fuera del
//    cálculo"). En el FINAL sí se incluyen con su calificación real.
//  - Preguntas E "puras" (sin `puntos`) y las I aportan 0 puntos posibles.
//  - Si una pregunta tiene tipo "E" Y además `puntos`/`correcta`, se cuenta
//    como E para exclusión y como P para puntuación (lo que habilita la nota
//    de la spec "una pregunta puede ser E y P a la vez").
//  - Desglose por bloque: el porcentaje de cada bloque se calcula igual que
//    el preliminar (M fuera) para que sea comparable sin esperar M. Si todas
//    las M del bloque están calificadas, aplica la calificación real.
//  - Sugerencia de nivel inferior (spec §5.7):
//      · Si bloque "ingeniero" visible y < 50% Y bloques "tecnico" y
//        "operador" en ≥ 75% → sugerir "Operador".
//      · Si bloque "operador" visible y < 50% Y bloque "tecnico" en
//        ≥ 75% → sugerir "Técnico".
//    Si no hay bloques inferiores visibles para comparar, no sugiere.

import { seMuestra, type MostrarSi, parseJSON } from "./formularios";

export type TipoValoracion = "E" | "P" | "M" | "I";

export interface ValoracionPregunta {
  tipo: TipoValoracion;
  // Para opción única con una respuesta correcta
  correcta?: string;
  // Para P: número (si hay `correcta`) o mapa { opcion: puntos }
  puntos?: number | Record<string, number>;
  // Opción múltiple: todas las marcadas valen `porOpcion`, hasta `max`
  porOpcion?: number;
  // Opción múltiple con valor distinto por opción
  puntosPorOpcion?: Record<string, number>;
  // Tope de puntos para opción múltiple o M
  max?: number;
  // E: lista literal de respuestas que excluyen, o "incorrecta"
  excluyeSi?: string[] | "incorrecta";
  // E en opción múltiple: opciones que DEBEN estar marcadas
  requiere?: string[];
  // M: rúbrica visible al evaluador
  rubrica?: string;
  // Si la calificación manual iguala este número, excluye
  excluyeSiCalificacion?: number;
  // Etiquetas libres (p. ej. competencia asociada), ignoradas por el motor
  competencia?: string;
  [k: string]: unknown;
}

export interface SnapshotPregunta {
  codigo?: string | null;
  texto: string;
  tipo: string; // texto_corto | opcion_unica | si_no | ...
  opciones: string[];
  valoracion: ValoracionPregunta | null;
}

export interface PreguntaEntrada {
  id: string;
  seccionId: string;
  // mostrarSi de la pregunta (al momento del envío)
  mostrarSi: MostrarSi;
  // snapshot congelado al momento del envío
  snapshot: SnapshotPregunta;
  // valor respondido: string | string[] | boolean | number | null
  valor: unknown;
  calificacionManual: number | null;
}

export interface SeccionEntrada {
  id: string;
  bloque: string | null; // general | puesto | base | tecnico | operador | ingeniero | null
  mostrarSi: MostrarSi;
}

export interface EntradaMotor {
  secciones: SeccionEntrada[];
  preguntas: PreguntaEntrada[];
  umbralAvanza: number; // default 75
  umbralBanco: number;  // default 50
}

export interface MotivoExclusion {
  preguntaId: string;
  codigo?: string | null;
  texto: string;
  respuesta: string;
}

export interface DesgloseBloque {
  bloque: string;
  puntosObtenidos: number;
  puntosPosibles: number;
  porcentaje: number;
}

export interface ResultadoValoracion {
  excluido: boolean;
  motivoExclusion: MotivoExclusion | null;
  puntosObtenidos: number;
  puntosPosibles: number;
  porcentajePreliminar: number | null; // null si posible=0
  porcentajeFinal: number | null;      // null si aún hay M sin calificar
  banda: "AVANZA" | "BANCO" | "DESCARTAR" | null;
  desglose: DesgloseBloque[];
  nivelSugerido: "Operador" | "Técnico" | null;
  // Para diagnóstico: cuántas M visibles quedan sin calificar.
  mPendientes: number;
  // Puntaje por pregunta para armar la vista Individual.
  puntosPorPregunta: Record<string, { obtenidos: number; posibles: number }>;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function sumaMapa(m: Record<string, number> | undefined): number {
  if (!m) return 0;
  return Object.values(m).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
}

function maxMapa(m: Record<string, number> | undefined): number {
  if (!m) return 0;
  const vals = Object.values(m).filter((v) => typeof v === "number") as number[];
  return vals.length ? Math.max(...vals) : 0;
}

function valorLegible(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return String(v);
}

function normalizaValor(v: unknown, tipo: string): string | string[] | boolean | null {
  if (v == null) return null;
  // Algunos clientes mandan ya string/array/boolean; para si_no también puede
  // llegar "Sí"/"No" o true/false. Normalizamos a lo que se guardó.
  if (tipo === "si_no") {
    if (typeof v === "boolean") return v ? "Sí" : "No";
    if (typeof v === "string") return v;
    return null;
  }
  if (Array.isArray(v)) return v.map(String);
  return String(v);
}

function respuestaIncluye(valor: unknown, opcion: string): boolean {
  if (Array.isArray(valor)) return valor.map(String).includes(opcion);
  if (valor == null) return false;
  if (typeof valor === "boolean") return (valor ? "Sí" : "No") === opcion;
  return String(valor) === opcion;
}

// ── exclusión ───────────────────────────────────────────────────────────────

function evaluaExclusion(p: PreguntaEntrada): MotivoExclusion | null {
  const val = p.snapshot.valoracion;
  if (!val || val.tipo !== "E") {
    // Regla especial: `excluyeSiCalificacion` también aplica a M.
    if (val && val.tipo === "M" && typeof val.excluyeSiCalificacion === "number") {
      if (p.calificacionManual != null && p.calificacionManual === val.excluyeSiCalificacion) {
        return {
          preguntaId: p.id,
          codigo: p.snapshot.codigo ?? null,
          texto: p.snapshot.texto,
          respuesta: `Calificación manual: ${p.calificacionManual}`,
        };
      }
    }
    return null;
  }

  const v = normalizaValor(p.valor, p.snapshot.tipo);

  // 1. excluyeSi lista
  if (Array.isArray(val.excluyeSi)) {
    if (v == null) return null; // sin respuesta: no excluye
    const marca = (opt: string) => {
      if (Array.isArray(v)) return v.includes(opt);
      return v === opt;
    };
    const hit = val.excluyeSi.find((opt) => marca(opt));
    if (hit != null) {
      return {
        preguntaId: p.id,
        codigo: p.snapshot.codigo ?? null,
        texto: p.snapshot.texto,
        respuesta: valorLegible(p.valor) || hit,
      };
    }
  }

  // 2. excluyeSi "incorrecta"
  if (val.excluyeSi === "incorrecta" && val.correcta != null) {
    if (v != null && v !== val.correcta) {
      return {
        preguntaId: p.id,
        codigo: p.snapshot.codigo ?? null,
        texto: p.snapshot.texto,
        respuesta: valorLegible(p.valor) || "—",
      };
    }
  }

  // 3. requiere (opción múltiple)
  if (Array.isArray(val.requiere) && val.requiere.length > 0) {
    if (v == null) {
      // No respondió: no excluimos aquí (lo hace la validación de obligatorias
      // en el POST si la pregunta era obligatoria).
      return null;
    }
    const marcadas = Array.isArray(v) ? v : [String(v)];
    const faltan = val.requiere.filter((r) => !marcadas.includes(r));
    if (faltan.length > 0) {
      return {
        preguntaId: p.id,
        codigo: p.snapshot.codigo ?? null,
        texto: p.snapshot.texto,
        respuesta: `Faltan opciones requeridas: ${faltan.join(", ")}`,
      };
    }
  }

  // 4. excluyeSiCalificacion para E con componente manual (poco común,
  // pero se maneja igual).
  if (typeof val.excluyeSiCalificacion === "number" && p.calificacionManual === val.excluyeSiCalificacion) {
    return {
      preguntaId: p.id,
      codigo: p.snapshot.codigo ?? null,
      texto: p.snapshot.texto,
      respuesta: `Calificación manual: ${p.calificacionManual}`,
    };
  }

  return null;
}

// ── puntuación por pregunta ─────────────────────────────────────────────────

interface PuntosPregunta {
  obtenidos: number; // automáticos de E/P (M = 0 hasta calificar)
  posibles: number;  // posibles totales (incluye M.max si visible)
  // Para cálculo preliminar: se excluye tanto obtenidos como posibles de M.
  obtenidosPrelim: number;
  posiblesPrelim: number;
  // Si es M y aún sin calificar, pesa para que el final espere.
  mPendiente: boolean;
}

function puntosDe(p: PreguntaEntrada): PuntosPregunta {
  const val = p.snapshot.valoracion;
  const vacio: PuntosPregunta = { obtenidos: 0, posibles: 0, obtenidosPrelim: 0, posiblesPrelim: 0, mPendiente: false };
  if (!val) return vacio;

  const v = normalizaValor(p.valor, p.snapshot.tipo);

  if (val.tipo === "I") return vacio;

  if (val.tipo === "E") {
    // E "puro" sin puntos: 0. E con `correcta` + `puntos` se cuenta como P también.
    if (val.correcta != null && (typeof val.puntos === "number" || val.puntos == null)) {
      const puntosCorrecta = typeof val.puntos === "number" ? val.puntos : 1;
      const posibles = puntosCorrecta;
      const obtenidos = v === val.correcta ? puntosCorrecta : 0;
      return {
        obtenidos,
        posibles,
        obtenidosPrelim: obtenidos,
        posiblesPrelim: posibles,
        mPendiente: false,
      };
    }
    return vacio;
  }

  if (val.tipo === "P") {
    // P con correcta → `puntos` number (default 1)
    if (val.correcta != null) {
      const pts = typeof val.puntos === "number" ? val.puntos : 1;
      const obtenidos = v === val.correcta ? pts : 0;
      return {
        obtenidos,
        posibles: pts,
        obtenidosPrelim: obtenidos,
        posiblesPrelim: pts,
        mPendiente: false,
      };
    }

    // P con mapa { opcion: puntos } → posible = max(mapa), obtenido = mapa[v] si existe
    if (val.puntos && typeof val.puntos === "object") {
      const mapa = val.puntos as Record<string, number>;
      const posibles = maxMapa(mapa);
      let obtenidos = 0;
      if (typeof v === "string" && typeof mapa[v] === "number") obtenidos = mapa[v];
      return {
        obtenidos,
        posibles,
        obtenidosPrelim: obtenidos,
        posiblesPrelim: posibles,
        mPendiente: false,
      };
    }

    // P múltiple: porOpcion + max
    if (typeof val.porOpcion === "number") {
      const marcadas = Array.isArray(v) ? v : (v != null ? [String(v)] : []);
      const bruto = marcadas.length * val.porOpcion;
      const posibles = typeof val.max === "number" ? val.max : bruto;
      const obtenidos = Math.min(bruto, posibles);
      return {
        obtenidos,
        posibles,
        obtenidosPrelim: obtenidos,
        posiblesPrelim: posibles,
        mPendiente: false,
      };
    }

    // P múltiple: puntosPorOpcion + max
    if (val.puntosPorOpcion && typeof val.puntosPorOpcion === "object") {
      const mapa = val.puntosPorOpcion as Record<string, number>;
      const marcadas = Array.isArray(v) ? v : (v != null ? [String(v)] : []);
      const bruto = marcadas.reduce((acc, opt) => acc + (typeof mapa[opt] === "number" ? mapa[opt] : 0), 0);
      // Si trae max, lo respetamos; si no, posible = suma total del mapa.
      const posibles = typeof val.max === "number" ? val.max : sumaMapa(mapa);
      const obtenidos = Math.min(bruto, posibles);
      return {
        obtenidos,
        posibles,
        obtenidosPrelim: obtenidos,
        posiblesPrelim: posibles,
        mPendiente: false,
      };
    }

    return vacio;
  }

  if (val.tipo === "M") {
    const posibles = typeof val.max === "number" ? val.max : 3;
    if (p.calificacionManual != null) {
      return {
        obtenidos: p.calificacionManual,
        posibles,
        obtenidosPrelim: 0,
        posiblesPrelim: 0,
        mPendiente: false,
      };
    }
    return {
      obtenidos: 0,
      posibles,
      obtenidosPrelim: 0,
      posiblesPrelim: 0,
      mPendiente: true,
    };
  }

  return vacio;
}

// ── motor ───────────────────────────────────────────────────────────────────

export function evaluarRespuesta(entrada: EntradaMotor): ResultadoValoracion {
  // 1. Mapa de respuestas por preguntaId Y por codigo (para mostrarSi que usa
  //    código tipo "5.1" en vez de id).
  const respuestas: Record<string, unknown> = {};
  for (const p of entrada.preguntas) {
    respuestas[p.id] = p.valor;
    if (p.snapshot.codigo) respuestas[p.snapshot.codigo] = p.valor;
  }

  // 2. Resolver visibilidad: una pregunta cuenta si su sección Y ella misma son visibles.
  const seccionVisible = new Map<string, boolean>();
  for (const s of entrada.secciones) {
    seccionVisible.set(s.id, seMuestra(s.mostrarSi, respuestas));
  }

  const preguntasVisibles = entrada.preguntas.filter((p) => {
    if (!seccionVisible.get(p.seccionId)) return false;
    return seMuestra(p.mostrarSi, respuestas);
  });

  // 3. Exclusión: la PRIMERA pregunta visible que excluya corta el flujo.
  let motivo: MotivoExclusion | null = null;
  for (const p of preguntasVisibles) {
    const m = evaluaExclusion(p);
    if (m) {
      motivo = m;
      break;
    }
  }

  // 4. Puntuación por pregunta y acumulados.
  const puntosPorPregunta: Record<string, { obtenidos: number; posibles: number }> = {};
  let obtTotal = 0;
  let posTotal = 0;
  let obtPrelim = 0;
  let posPrelim = 0;
  let mPendientes = 0;

  // Bloques: por cada bloque llevamos los dos agregados.
  const porBloque = new Map<string, { obt: number; pos: number; obtPrelim: number; posPrelim: number; mPendientes: number }>();

  for (const p of preguntasVisibles) {
    const pu = puntosDe(p);
    puntosPorPregunta[p.id] = { obtenidos: pu.obtenidos, posibles: pu.posibles };
    obtTotal += pu.obtenidos;
    posTotal += pu.posibles;
    obtPrelim += pu.obtenidosPrelim;
    posPrelim += pu.posiblesPrelim;
    if (pu.mPendiente) mPendientes += 1;

    const sec = entrada.secciones.find((s) => s.id === p.seccionId);
    const bloque = sec?.bloque ?? null;
    if (bloque) {
      const acc = porBloque.get(bloque) ?? { obt: 0, pos: 0, obtPrelim: 0, posPrelim: 0, mPendientes: 0 };
      acc.obt += pu.obtenidos;
      acc.pos += pu.posibles;
      acc.obtPrelim += pu.obtenidosPrelim;
      acc.posPrelim += pu.posiblesPrelim;
      if (pu.mPendiente) acc.mPendientes += 1;
      porBloque.set(bloque, acc);
    }
  }

  const porcentajePreliminar = posPrelim > 0 ? Math.round((obtPrelim / posPrelim) * 1000) / 10 : null;
  const porcentajeFinal = mPendientes === 0 && posTotal > 0 ? Math.round((obtTotal / posTotal) * 1000) / 10 : null;

  const base = porcentajeFinal ?? porcentajePreliminar;
  let banda: ResultadoValoracion["banda"] = null;
  if (base != null) {
    if (base >= entrada.umbralAvanza) banda = "AVANZA";
    else if (base >= entrada.umbralBanco) banda = "BANCO";
    else banda = "DESCARTAR";
  }

  // 5. Desglose por bloque: porcentaje con la regla preliminar (M fuera) para
  // comparabilidad; si el bloque ya no tiene M pendiente, igualmente el
  // preliminar coincide con el final.
  const desglose: DesgloseBloque[] = [];
  for (const [bloque, acc] of porBloque.entries()) {
    const pos = acc.mPendientes === 0 ? acc.pos : acc.posPrelim;
    const obt = acc.mPendientes === 0 ? acc.obt : acc.obtPrelim;
    const porcentaje = pos > 0 ? Math.round((obt / pos) * 1000) / 10 : 0;
    desglose.push({ bloque, puntosObtenidos: obt, puntosPosibles: pos, porcentaje });
  }

  // 6. Sugerencia de nivel inferior.
  const pct = (b: string) => desglose.find((d) => d.bloque === b)?.porcentaje;
  const tieneBloque = (b: string) => desglose.some((d) => d.bloque === b);
  let nivelSugerido: "Operador" | "Técnico" | null = null;
  if (tieneBloque("ingeniero") && (pct("ingeniero") ?? 100) < 50) {
    const tOk = (pct("tecnico") ?? 0) >= 75;
    const oOk = (pct("operador") ?? 0) >= 75;
    if (tOk && oOk) nivelSugerido = "Operador";
    else if (tOk) nivelSugerido = "Técnico";
  } else if (tieneBloque("operador") && (pct("operador") ?? 100) < 50) {
    if ((pct("tecnico") ?? 0) >= 75) nivelSugerido = "Técnico";
  }

  // Si hubo exclusión, el motor igual reporta los puntajes calculados (puede
  // servir para analítica), pero `excluido=true` manda sobre la banda.
  return {
    excluido: motivo != null,
    motivoExclusion: motivo,
    puntosObtenidos: Math.round(obtTotal * 100) / 100,
    puntosPosibles: Math.round(posTotal * 100) / 100,
    porcentajePreliminar,
    porcentajeFinal,
    banda: motivo ? null : banda,
    desglose,
    nivelSugerido,
    mPendientes,
    puntosPorPregunta,
  };
}

// ── adaptador: construir EntradaMotor desde modelos Prisma ─────────────────
//
// Útil para las rutas: toma lo que devuelve una query normal y lo convierte
// a lo que espera `evaluarRespuesta`. Se exporta para evitar duplicar parsing
// de JSON en cada endpoint.

export interface FilaRespuestaCruda {
  id: string;
  preguntaId: string;
  valor: string | null;
  snapshotPregunta: string;
  calificacionManual: number | null;
  pregunta: {
    id: string;
    seccionId: string;
    mostrarSi: string | null;
  };
}

export interface FilaSeccionCruda {
  id: string;
  bloque: string | null;
  mostrarSi: string | null;
}

export function construirEntrada(
  respuestas: FilaRespuestaCruda[],
  secciones: FilaSeccionCruda[],
  umbralAvanza: number,
  umbralBanco: number,
): EntradaMotor {
  return {
    umbralAvanza,
    umbralBanco,
    secciones: secciones.map((s) => ({
      id: s.id,
      bloque: s.bloque,
      mostrarSi: parseJSON<MostrarSi>(s.mostrarSi, null),
    })),
    preguntas: respuestas.map((rp) => ({
      id: rp.preguntaId,
      seccionId: rp.pregunta.seccionId,
      mostrarSi: parseJSON<MostrarSi>(rp.pregunta.mostrarSi, null),
      snapshot: parseJSON<SnapshotPregunta>(rp.snapshotPregunta, {
        texto: "",
        tipo: "texto_corto",
        opciones: [],
        valoracion: null,
      }),
      valor: parseJSON<unknown>(rp.valor, null),
      calificacionManual: rp.calificacionManual,
    })),
  };
}
