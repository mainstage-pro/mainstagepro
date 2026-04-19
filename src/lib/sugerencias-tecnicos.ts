/**
 * Sugerencias de personal técnico para el cotizador.
 * Siempre muestra el núcleo de 5 roles: audio op, video op, ilum op, coordinador y stagehands.
 */

export interface SugTecnico {
  rolKeyword: string;
  cantidad: number;
  esOpcional: boolean;
  motivo: string;
  isStagehands?: boolean; // muestra selector 2/4/6/8 en lugar de "+ Agregar"
}

export interface SugTecnicoGroup {
  categoria: string;
  items: SugTecnico[];
}

export function getSugerenciasTecnicos(
  tipoEvento: string,
  asistentes: number,
  categoriasEquipo: string[],
): SugTecnicoGroup[] {
  const tipo = tipoEvento.toUpperCase();
  const cats = categoriasEquipo.map(c => c.toLowerCase());

  const tieneDJ = cats.some(c => c.includes("dj") || c.includes("consola"));

  const operadores: SugTecnico[] = [
    {
      rolKeyword: "audio",
      cantidad: asistentes > 300 ? 2 : 1,
      esOpcional: false,
      motivo: "Operador de audio",
    },
    {
      rolKeyword: "video",
      cantidad: 1,
      esOpcional: false,
      motivo: "Operador de video / pantalla",
    },
    {
      rolKeyword: "iluminaci",
      cantidad: asistentes > 400 ? 2 : 1,
      esOpcional: false,
      motivo: "Operador de iluminación",
    },
  ];

  if (tieneDJ && tipo !== "MUSICAL") {
    operadores.push({
      rolKeyword: "dj",
      cantidad: 1,
      esOpcional: true,
      motivo: "Equipo DJ en cotización",
    });
  }

  const grupos: SugTecnicoGroup[] = [
    { categoria: "Operadores de área", items: operadores },
    {
      categoria: "Coordinación",
      items: [{
        rolKeyword: "coord",
        cantidad: 1,
        esOpcional: false,
        motivo: "Coordinación técnica del evento",
      }],
    },
    {
      categoria: "Stagehands",
      items: [{
        rolKeyword: "stagehand",
        cantidad: asistentes <= 100 ? 2 : asistentes <= 250 ? 4 : asistentes <= 500 ? 6 : 8,
        esOpcional: false,
        motivo: "Carga, descarga y montaje",
        isStagehands: true,
      }],
    },
  ];

  return grupos;
}
