import type { DefinicionFuente, Fuente } from "./tipos";
import { FUENTES_VENTAS } from "./fuentes/ventas";
import { FUENTES_PROYECTOS } from "./fuentes/proyectos";
import { FUENTES_FINANZAS } from "./fuentes/finanzas";
import { FUENTES_INVENTARIO } from "./fuentes/inventario";
import { FUENTES_MARKETING } from "./fuentes/marketing";
import { FUENTES_RRHH } from "./fuentes/rrhh";

/**
 * Registro único de todo lo que el sistema sabe reclamar.
 *
 * `activa: false` = se calcula para medir volumen pero no se muestra a nadie.
 * Apagar una fuente es cambiar un booleano, no revertir una implementación:
 * ese es el seguro de que esto se puede acotar sin desmontarlo.
 */
export const CATALOGO: DefinicionFuente[] = [
  ...FUENTES_VENTAS,
  ...FUENTES_PROYECTOS,
  ...FUENTES_FINANZAS,
  ...FUENTES_INVENTARIO,
  ...FUENTES_MARKETING,
  ...FUENTES_RRHH,
];

export function definicionDe(fuente: Fuente): DefinicionFuente | undefined {
  return CATALOGO.find(d => d.fuente === fuente);
}
