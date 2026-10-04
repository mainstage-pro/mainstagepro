/**
 * frentes-produccion.ts — Los frentes que se coordinan y no son audio, luz ni video.
 *
 * En dirección y operaciones el trabajo no es traer equipo propio: es que la planta
 * de luz, el entarimado, la estructura y las vallas lleguen, cuadren entre sí y
 * alguien responda por cada uno. Marcar el frente del proveedor es lo que permite
 * ver ese tablero sin capturar nada dos veces.
 *
 * `frente` nulo = equipo técnico, el caso de siempre.
 */

export const FRENTES = [
  { valor: "ENERGIA", label: "Energía", detalle: "Plantas de luz, distribución, UPS" },
  { valor: "ENTARIMADO", label: "Entarimado", detalle: "Escenario, templetes, tarimas" },
  { valor: "ESTRUCTURA", label: "Estructura", detalle: "Truss, torres, techos, ground support" },
  { valor: "VALLAS", label: "Vallas", detalle: "Barreras, control de acceso, perímetro" },
  { valor: "CARPAS", label: "Carpas", detalle: "Carpas, toldos, pisos, climas" },
  { valor: "SANITARIOS", label: "Sanitarios", detalle: "Baños portátiles y servicio" },
  { valor: "SEGURIDAD", label: "Seguridad", detalle: "Elementos, paramédicos, protección civil" },
] as const;

export type Frente = (typeof FRENTES)[number]["valor"];

export const esFrente = (v: unknown): v is Frente => FRENTES.some((f) => f.valor === v);

export const frenteLabel = (v: string | null | undefined): string | null =>
  FRENTES.find((f) => f.valor === v)?.label ?? null;
