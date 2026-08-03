import type { BriefTecnicoData, EquipoItem, StatItem } from "./data";

// ── Hechos crudos de un proyecto (agnósticos de Prisma) ──────────────────────
export type EquipoFact = {
  categoria: string;
  subcategoria?: string | null;
  marca?: string | null;
  modelo?: string | null;
  descripcion: string;
  cantidad: number;
};

export type ProyectoFacts = {
  nombre: string;
  clienteNombre: string;
  clienteEmpresa?: string | null;
  tipoEvento: string;
  tipoServicio?: string | null;
  lugarEvento?: string | null;
  fechaEvento: string; // ISO
  fechasEvento?: string[] | null;
  personalCount?: number;
  equipos: EquipoFact[];
};

// ── Mapas de negocio ─────────────────────────────────────────────────────────
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const TIPO_EVENTO_LABEL: Record<string, string> = {
  EMPRESARIAL: "Evento empresarial",
  SOCIAL: "Evento social",
  MUSICAL: "Evento musical",
  VARIOS: "Evento",
};

const TIPO_SERVICIO_LABEL: Record<string, string> = {
  PRODUCCION_TECNICA: "Producción técnica completa",
  RENTA: "Renta de equipo",
  DIRECCION_TECNICA: "Dirección técnica",
};

const CATEGORIA_CORTA: Record<string, string> = {
  "Equipo de Audio": "Audio",
  "Sistemas de Microfonía": "Microfonía",
  "Consolas de Audio": "Consola",
  "Monitoreo In-Ear": "Monitoreo",
  "Pantalla / Video": "Video",
  "Equipo de Iluminación": "Iluminación",
  "Consolas de Iluminación": "Consola de luces",
  "Rigging y Estructuras": "Rigging",
  "Entarimado": "Escenario",
  "Corriente Eléctrica": "Energía",
};

const AUDIO_FAMILY = new Set(["Equipo de Audio", "Sistemas de Microfonía", "Consolas de Audio", "Monitoreo In-Ear"]);
const VIDEO_FAMILY = new Set(["Pantalla / Video"]);

// ── Helpers de formato ───────────────────────────────────────────────────────
function titleCase(s?: string | null): string {
  if (!s) return "";
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(^|\s|-)([a-záéíóúñ])/g, (_, p1, p2) => p1 + p2.toUpperCase());
}

function shortCat(categoria: string): string {
  return CATEGORIA_CORTA[categoria] ?? categoria;
}

// "Expo supraterra" → { gold:"EXPO", white:"SUPRATERRA" }
function splitTitulo(nombre: string): { gold: string; white: string } {
  const words = nombre.trim().split(/\s+/);
  if (words.length >= 2) return { gold: words[0].toUpperCase(), white: words.slice(1).join(" ").toUpperCase() };
  return { gold: "", white: (words[0] ?? "").toUpperCase() };
}

// Fechas: ["2026-07-24","2026-07-25","2026-07-26"] → "24, 25 y 26 Julio 2026"
function formatFechas(fechaEvento: string, fechasEvento?: string[] | null): string {
  const parse = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return { y, m, d };
  };
  const list = (fechasEvento && fechasEvento.length ? fechasEvento : [fechaEvento]).map(parse);
  if (list.length === 1) {
    const { y, m, d } = list[0];
    return `${d} ${MESES[m - 1]} ${y}`;
  }
  const sameMonth = list.every((x) => x.m === list[0].m && x.y === list[0].y);
  if (sameMonth) {
    const dias = list.map((x) => x.d);
    const ultimo = dias.pop();
    return `${dias.join(", ")} y ${ultimo} ${MESES[list[0].m - 1]} ${list[0].y}`;
  }
  return list.map((x) => `${x.d} ${MESES[x.m - 1]}`).join(" · ") + ` ${list[list.length - 1].y}`;
}

// Nombre del equipo limpio (marca+modelo sin palabras duplicadas), o descripción.
function cleanNombre(f: EquipoFact): string {
  const base = [f.marca, f.modelo].filter(Boolean).join(" ").trim() || f.descripcion;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of base.split(/\s+/)) {
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out.join(" ").replace(/\bpitch\b/i, "Pitch");
}

const esPantallaM2 = (f: EquipoFact) => VIDEO_FAMILY.has(f.categoria) && /m2|m²/i.test(f.descripcion);

// Descriptor corto para el subtítulo del item.
function descriptor(f: EquipoFact): string {
  if (f.subcategoria) return f.subcategoria;
  return f.descripcion
    .replace(/\bactiv[oa]\b/gi, "")
    .replace(/\btipo\b/gi, "")
    .replace(/\(m2\)|\(m²\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toItem(f: EquipoFact): EquipoItem {
  const sc = shortCat(f.categoria);
  if (esPantallaM2(f)) {
    return { nombre: cleanNombre(f), sub: `${sc} · ×${f.cantidad} m²`, cant: "x1" };
  }
  return { nombre: cleanNombre(f), sub: `${sc} · ${descriptor(f)}`, cant: `x${f.cantidad}` };
}

function buildStats(facts: ProyectoFacts): StatItem[] {
  const stats: StatItem[] = [];
  const dias = facts.fechasEvento?.length || 1;
  stats.push({ n: String(dias), label: dias > 1 ? "DÍAS DE OPERACIÓN" : "DÍA DE OPERACIÓN" });

  const m2 = facts.equipos.filter(esPantallaM2).reduce((a, e) => a + e.cantidad, 0);
  if (m2 > 0) stats.push({ n: String(m2), label: "METROS DE PANTALLA LED" });

  const cajas = facts.equipos.filter((e) => e.categoria === "Equipo de Audio").reduce((a, e) => a + e.cantidad, 0);
  if (cajas > 0) stats.push({ n: String(cajas), label: "CAJAS DE AUDIO" });

  if (facts.personalCount && facts.personalCount > 0) {
    stats.push({ n: String(facts.personalCount), label: facts.personalCount > 1 ? "TÉCNICOS EN SITIO" : "TÉCNICO EN SITIO" });
  }
  return stats.slice(0, 4);
}

// ── Draft determinista (verdad de los hechos, sin IA) ────────────────────────
export function buildDraft(facts: ProyectoFacts): BriefTecnicoData {
  const titulo = splitTitulo(facts.nombre);
  const venue = titleCase(facts.lugarEvento);
  const tipo = TIPO_EVENTO_LABEL[facts.tipoEvento] ?? "Evento";
  const servicio = facts.tipoServicio ? TIPO_SERVICIO_LABEL[facts.tipoServicio] ?? "Producción técnica" : "Producción técnica";
  const dias = facts.fechasEvento?.length || 1;

  const audioItems = facts.equipos.filter((e) => AUDIO_FAMILY.has(e.categoria)).map(toItem);
  const videoItems = facts.equipos.filter((e) => VIDEO_FAMILY.has(e.categoria)).map(toItem);

  const descripcion = `${servicio} para ${tipo.toLowerCase()} en ${venue || "el venue"}, con operación durante ${dias} ${dias > 1 ? "jornadas" : "jornada"}. Audio profesional${videoItems.length ? ", pantalla LED" : ""} y equipo técnico en sitio.`;

  return {
    portada: {
      kicker: "DETRÁS DEL SHOW",
      tituloGold: titulo.gold,
      tituloWhite: titulo.white,
      lugar: venue,
      fechas: formatFechas(facts.fechaEvento, facts.fechasEvento),
    },
    brief: {
      descripcion,
      venue: venue || "—",
      tipo,
      cliente: facts.clienteEmpresa || facts.clienteNombre,
      servicio,
    },
    audio: {
      tituloGold: "AUDIO Y",
      tituloWhite: "MICROFONÍA",
      items: audioItems,
      footer: [`Sistema operado por técnico de Mainstage los ${dias} ${dias > 1 ? "días" : "día"}`],
    },
    video: {
      tituloGold: "VIDEO Y",
      tituloWhite: "PANTALLA",
      items: videoItems,
      footer: facts.tipoServicio === "PRODUCCION_TECNICA" ? [`Operador de video presente los ${dias} ${dias > 1 ? "días" : "día"}`] : [],
    },
    numeros: {
      intro: `Esto es lo que requiere una producción técnica integral para ${tipo.toLowerCase()}.`,
      stats: buildStats(facts),
      cierreNormal: "Tu evento merece",
      cierreBold: "una producción de este nivel.",
    },
  };
}
