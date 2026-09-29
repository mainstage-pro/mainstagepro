import { CATALOGO } from "./catalogo";
import {
  type AreaOp,
  type DefinicionFuente,
  type Fuente,
  type Pendiente,
  type Severidad,
  LIMITE_POR_FUENTE,
} from "./tipos";

export type { AreaOp, Fuente, Pendiente, Severidad } from "./tipos";
export { CATALOGO } from "./catalogo";

export interface ConteoFuente {
  fuente: Fuente;
  area: AreaOp;
  etiqueta: string;
  criterio: string;
  activa: boolean;
  anticipa: boolean;
  total: number;
  urgente: number;
  alta: number;
  media: number;
  /** Llegó al tope de la consulta: el número real es mayor. */
  truncado: boolean;
  ms: number;
  /** Ejemplos reales, sólo para calibrar una fuente antes de encenderla. */
  muestra?: Array<Pick<Pendiente, "titulo" | "severidad" | "diasVencido" | "href">>;
}

export interface ResultadoPendientes {
  pendientes: Pendiente[];
  conteos: ConteoFuente[];
  fallos: { fuente: Fuente; error: string }[];
  generadoEn: string;
  ms: number;
}

const ORDEN_SEVERIDAD: Record<Severidad, number> = { URGENTE: 0, ALTA: 1, MEDIA: 2 };

/**
 * Separa lo accionable del rezago.
 *
 * Cuarenta publicaciones de hace cinco meses no son cuarenta tareas: son una
 * decisión de limpieza que nadie ha tomado. Repetirlas a diario no las resuelve,
 * sólo entierra lo que sí se puede hacer hoy. Todo lo que cruza la ventana vuelve
 * como un único renglón que dice cuánto hay y a dónde ir a depurarlo.
 */
function partirPorVentana(def: DefinicionFuente, encontrados: Pendiente[]): Pendiente[] {
  if (!def.ventana) return encontrados;

  const vigentes: Pendiente[] = [];
  const rezagados: Pendiente[] = [];
  for (const p of encontrados) {
    ((p.diasVencido ?? 0) > def.ventana ? rezagados : vigentes).push(p);
  }
  if (rezagados.length === 0) return vigentes;

  const masViejo = rezagados.reduce((a, b) => ((a.diasVencido ?? 0) >= (b.diasVencido ?? 0) ? a : b));
  vigentes.push({
    id: `REZAGO_${def.fuente}`,
    fuente: def.fuente,
    titulo: `Depurar rezago — ${def.etiqueta.toLowerCase()}`,
    descripcion:
      `${rezagados.length} llevan más de ${def.ventana} días sin moverse` +
      ` (el más viejo, ${masViejo.diasVencido} días). Revisar de una vez y cerrar lo que ya no aplica.`,
    area: def.area,
    entidadId: def.fuente,
    href: def.hrefLista ?? masViejo.href,
    severidad: "MEDIA",
    etiqueta: "Rezago",
    diasVencido: masViejo.diasVencido,
  });
  return vigentes;
}

export function ordenarPendientes(pendientes: Pendiente[]): Pendiente[] {
  return [...pendientes].sort((a, b) => {
    const s = ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad];
    if (s !== 0) return s;
    return (b.diasVencido ?? 0) - (a.diasVencido ?? 0);
  });
}

/**
 * Calcula el estado pendiente de toda la operación.
 *
 * Cada fuente se aísla: si una consulta truena, se reporta en `fallos` y las
 * demás siguen. Con treinta consultas en paralelo, que una falla tumbe la
 * vista completa deja de ser hipotético.
 */
export async function computarPendientes(
  opciones: { incluirInactivas?: boolean; fuentes?: Fuente[]; muestra?: number } = {},
): Promise<ResultadoPendientes> {
  const arranque = Date.now();
  const ahora = new Date();
  const inicioDeHoy = new Date(ahora.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }));
  const ctx = { ahora, inicioDeHoy, limite: LIMITE_POR_FUENTE };

  const seleccionadas: DefinicionFuente[] = CATALOGO.filter(d => {
    if (opciones.fuentes) return opciones.fuentes.includes(d.fuente);
    return opciones.incluirInactivas || d.activa;
  });

  const pendientes: Pendiente[] = [];
  const conteos: ConteoFuente[] = [];
  const fallos: { fuente: Fuente; error: string }[] = [];

  await Promise.all(
    seleccionadas.map(async def => {
      const t0 = Date.now();
      try {
        const crudos = await def.computar(ctx);
        const encontrados = partirPorVentana(def, crudos);
        conteos.push({
          fuente: def.fuente,
          area: def.area,
          etiqueta: def.etiqueta,
          criterio: def.criterio,
          activa: def.activa,
          anticipa: def.anticipa,
          total: encontrados.length,
          urgente: encontrados.filter(p => p.severidad === "URGENTE").length,
          alta: encontrados.filter(p => p.severidad === "ALTA").length,
          media: encontrados.filter(p => p.severidad === "MEDIA").length,
          truncado: crudos.length >= LIMITE_POR_FUENTE,
          ms: Date.now() - t0,
          muestra: opciones.muestra
            ? ordenarPendientes(encontrados)
                .slice(0, opciones.muestra)
                .map(({ titulo, severidad, diasVencido, href }) => ({ titulo, severidad, diasVencido, href }))
            : undefined,
        });
        if (def.activa || opciones.fuentes) pendientes.push(...encontrados);
      } catch (e) {
        fallos.push({ fuente: def.fuente, error: e instanceof Error ? e.message : String(e) });
      }
    }),
  );

  return {
    pendientes: ordenarPendientes(pendientes),
    conteos: conteos.sort((a, b) => b.total - a.total),
    fallos,
    generadoEn: ahora.toISOString(),
    ms: Date.now() - arranque,
  };
}
