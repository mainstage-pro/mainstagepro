/**
 * Sugerencias de personal técnico para el cotizador.
 * Se basan en:
 *  - Categorías de equipos ya agregados (Audio, Iluminación, Video, DJ/Consola)
 *  - Tipo de evento y número de asistentes (para stagehands y coordinación)
 */

export interface SugTecnico {
  rolKeyword: string;   // palabra clave para buscar en la lista de roles
  cantidad: number;
  esOpcional: boolean;
  motivo: string;       // por qué se sugiere
}

export interface SugTecnicoGroup {
  categoria: string;
  items: SugTecnico[];
}

export function getSugerenciasTecnicos(
  tipoEvento: string,
  asistentes: number,
  categoriasEquipo: string[], // categorías de equipos ya en la cotización
): SugTecnicoGroup[] {
  if (asistentes <= 0 && categoriasEquipo.length === 0) return [];

  const tipo = tipoEvento.toUpperCase();
  const cats = categoriasEquipo.map(c => c.toLowerCase());
  const grupos: SugTecnicoGroup[] = [];

  const tieneAudio = cats.some(c => c.includes("audio") || c.includes("sonido"));
  const tieneIlum  = cats.some(c => c.includes("iluminaci") || c.includes("luces") || c.includes("luz"));
  const tieneVideo = cats.some(c => c.includes("video") || c.includes("pantalla") || c.includes("led"));
  const tieneDJ    = cats.some(c => c.includes("dj") || c.includes("consola"));

  // ── Operadores de área ─────────────────────────────────────────────────────
  const operadores: SugTecnico[] = [];

  if (tieneAudio) {
    operadores.push({
      rolKeyword: "audio",
      cantidad: asistentes > 300 ? 2 : 1,
      esOpcional: false,
      motivo: "Equipos de audio en cotización",
    });
  }

  if (tieneIlum) {
    operadores.push({
      rolKeyword: "iluminaci",
      cantidad: asistentes > 400 ? 2 : 1,
      esOpcional: false,
      motivo: "Equipos de iluminación en cotización",
    });
  }

  if (tieneVideo) {
    operadores.push({
      rolKeyword: "video",
      cantidad: 1,
      esOpcional: false,
      motivo: "Equipos de video / pantalla LED en cotización",
    });
  }

  if (tieneDJ && tipo !== "MUSICAL") {
    // En MUSICAL el DJ va en sección aparte; en otros eventos puede ser técnico
    operadores.push({
      rolKeyword: "dj",
      cantidad: 1,
      esOpcional: true,
      motivo: "Equipo DJ en cotización",
    });
  }

  if (operadores.length > 0) {
    grupos.push({ categoria: "Operadores de área", items: operadores });
  }

  // ── Stagehands ─────────────────────────────────────────────────────────────
  if (asistentes > 0) {
    let cant = 0;
    let nota = "";

    if (asistentes <= 100) { cant = 2; nota = "carga/descarga + montaje básico"; }
    else if (asistentes <= 200) { cant = 3; nota = "montaje y desmontaje ágil"; }
    else if (asistentes <= 350) { cant = 4; nota = "montaje simultáneo de áreas"; }
    else if (asistentes <= 500) { cant = 5; nota = "equipo completo para producción media"; }
    else { cant = 6; nota = "producción grande — ajustar con jefe de producción"; }

    grupos.push({
      categoria: "Stagehands",
      items: [{
        rolKeyword: "stagehand",
        cantidad: cant,
        esOpcional: false,
        motivo: nota,
      }],
    });
  }

  // ── Coordinación (eventos medianos/grandes) ────────────────────────────────
  if (asistentes > 200 || (tipo === "EMPRESARIAL" && asistentes > 100)) {
    const coord: SugTecnico[] = [];

    coord.push({
      rolKeyword: "coordinador",
      cantidad: 1,
      esOpcional: asistentes <= 300,
      motivo: asistentes > 300 ? "Evento grande — coordinación técnica recomendada" : "Recomendado para eventos empresariales",
    });

    if (asistentes > 400) {
      coord.push({
        rolKeyword: "producción",
        cantidad: 1,
        esOpcional: true,
        motivo: "Eventos de más de 400 personas requieren jefe de producción",
      });
    }

    grupos.push({ categoria: "Coordinación", items: coord });
  }

  return grupos;
}
