/**
 * Qué líneas de la cotización siguen siendo "adicionales / terceros".
 *
 * Una línea con ficha de catálogo ya bajó al rider como ProyectoEquipo (lo hace
 * `sincronizarProyectoDesdeCotizacion`), así que volver a pintarla desde la
 * cotización la duplicaba en el proyecto y en la hoja de entrega. Las de texto
 * libre no tienen a dónde bajar: se siembran como fila editable del rider y
 * desde entonces mandan ellas.
 */

export type LineaCotizacionEquipo = {
  id: string;
  tipo: string;
  descripcion: string;
  marca?: string | null;
  cantidad: number;
  notas?: string | null;
  equipoId?: string | null;
};

// "Gastos de Producción" es la comisión interna; viaja como OTRO pero no es equipo.
const CONCEPTOS_NO_EQUIPO = ["gastos de produccion"];

const normalizar = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

export function lineasAdicionalesDeCotizacion<T extends LineaCotizacionEquipo>({
  lineas,
  equipoIdsEnRider,
  cotLineaIdsSembrados = [],
  hayInventario,
}: {
  lineas: T[];
  equipoIdsEnRider: Iterable<string>;
  cotLineaIdsSembrados?: Iterable<string>;
  hayInventario: boolean;
}): T[] {
  const enRider = new Set(equipoIdsEnRider);
  const sembrados = new Set(cotLineaIdsSembrados);
  const tipos = hayInventario
    ? ["EQUIPO_EXTERNO", "OTRO"]
    : ["EQUIPO_PROPIO", "EQUIPO_EXTERNO", "OTRO"];

  return lineas.filter((l) => {
    if (!tipos.includes(l.tipo) || !l.descripcion) return false;
    if (CONCEPTOS_NO_EQUIPO.includes(normalizar(l.descripcion))) return false;
    if (l.equipoId && enRider.has(l.equipoId)) return false;
    if (sembrados.has(l.id)) return false;
    return true;
  });
}

export const esLineaDeTextoLibre = (l: LineaCotizacionEquipo) => !l.equipoId;

/**
 * Extrae la nota visible del usuario del campo `notas` de una línea de
 * cotización. En la BD ese campo codifica la categoría y la nota juntas:
 *   "cat:Cat|nota:Texto" · "nota:Texto" · "cat:Cat" (sin nota) · texto plano.
 * Mismo criterio que `getItemNota` en CotizacionPDF, para no filtrar el
 * prefijo `cat:` hacia ficha operativa / rider.
 */
export function notaVisibleDeCotizacion(notas: string | null | undefined): string | null {
  if (!notas) return null;
  if (notas.includes("|nota:")) return notas.split("|nota:")[1]?.trim() || null;
  if (notas.startsWith("nota:")) return notas.slice(5).trim() || null;
  if (notas.startsWith("cat:")) return null; // solo categoría, sin nota
  return notas.trim() || null; // nota plana (legado)
}

export const nombreDeLinea = (l: LineaCotizacionEquipo) =>
  l.marca ? `${l.descripcion} · ${l.marca}` : l.descripcion;

/** Fila editable del rider a partir de una línea de cotización sin ficha de catálogo. */
export function extraDesdeLinea(l: LineaCotizacionEquipo) {
  return {
    id: `cot:${l.id}`,
    cotLineaId: l.id,
    descripcion: nombreDeLinea(l),
    cantidad: Math.max(1, Math.round(l.cantidad)),
    notas: notaVisibleDeCotizacion(l.notas) ?? "",
    completado: false,
    accesorios: [],
    tipo: (l.tipo === "EQUIPO_EXTERNO" ? "EXTERNO" : "PROPIO") as "PROPIO" | "EXTERNO",
    proveedor: "",
    montaje: "",
  };
}
