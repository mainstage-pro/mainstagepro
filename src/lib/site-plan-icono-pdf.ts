import { iconoDe } from "./site-plan-iconos";

/**
 * Convierte un icono de lucide a primitivas que `@react-pdf/renderer` sepa
 * dibujar. Se leen los trazos del propio icono en vez de copiarlos a mano: así
 * el plano impreso y el de pantalla usan un solo catálogo y no pueden separarse
 * con el tiempo.
 *
 * Cada icono de lucide es un `forwardRef` que devuelve `<Icon iconNode=... />`,
 * donde `iconNode` es la lista `[tag, atributos]` de sus trazos. Invocar el
 * render para leer esa lista es más barato y más fiel que serializar a SVG: no
 * arrastra `react-dom/server`, que el bundler de Next no deja importar.
 */
export type PrimitivaIcono = { tag: string; attrs: Record<string, string> };

type IconNode = [string, Record<string, string>][];
type RenderDeIcono = (props: object, ref: null) => { props?: { iconNode?: IconNode } };

const CACHE = new Map<string, PrimitivaIcono[]>();
const DIBUJABLES = new Set(["path", "circle", "line", "rect", "polyline", "polygon", "ellipse"]);

export function primitivasDeIcono(clave: string | null | undefined): PrimitivaIcono[] {
  if (!clave) return [];
  const guardado = CACHE.get(clave);
  if (guardado) return guardado;

  const def = iconoDe(clave);
  if (!def) return [];

  const render = (def.Icono as unknown as { render?: RenderDeIcono }).render;
  const nodos = render?.({}, null)?.props?.iconNode ?? [];

  const primitivas = nodos
    .filter(([tag]) => DIBUJABLES.has(tag))
    .map(([tag, attrs]) => ({ tag, attrs: atributosTexto(attrs) }));

  CACHE.set(clave, primitivas);
  return primitivas;
}

function atributosTexto(attrs: Record<string, unknown>): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [nombre, valor] of Object.entries(attrs)) {
    if (nombre === "key" || valor === null || valor === undefined) continue;
    salida[nombre] = String(valor);
  }
  return salida;
}
