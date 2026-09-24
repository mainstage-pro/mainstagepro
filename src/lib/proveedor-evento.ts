/**
 * proveedor-evento.ts — Vocabulario compartido del proveedor externo de un evento.
 * Lo usan el panel del proyecto, los endpoints y los documentos, para que las tres
 * ventanas y las modalidades se llamen igual en todos lados.
 */

/** Las tres ventanas de participación. Siempre existen, aunque estén sin hora. */
export const FASES_PROVEEDOR = ["INSTALACION", "OPERACION", "RECOLECCION"] as const;
export type FaseProveedor = (typeof FASES_PROVEEDOR)[number];

export const TITULO_FASE: Record<FaseProveedor, string> = {
  INSTALACION: "Instalación",
  OPERACION: "Operación",
  RECOLECCION: "Recolección",
};

/** Cómo llega el equipo. Se captura aparte del regreso porque rara vez coinciden. */
export const MODALIDADES_ENTREGA = [
  { valor: "DEJA_BODEGA", label: "Nos lo deja en bodega" },
  { valor: "LLEVA_VENUE", label: "Lo lleva al lugar del evento" },
  { valor: "RECOGEMOS_NOSOTROS", label: "Nosotros pasamos por él" },
] as const;

/** Cómo se regresa el equipo. */
export const MODALIDADES_REGRESO = [
  { valor: "RECOGE_BODEGA", label: "Lo recoge en bodega" },
  { valor: "RECOGE_VENUE", label: "Lo recoge en el lugar del evento" },
  { valor: "DEVOLVEMOS_NOSOTROS", label: "Nosotros se lo devolvemos" },
] as const;

export const labelModalidad = (valor: string | null | undefined): string | null =>
  [...MODALIDADES_ENTREGA, ...MODALIDADES_REGRESO].find((m) => m.valor === valor)?.label ?? null;
