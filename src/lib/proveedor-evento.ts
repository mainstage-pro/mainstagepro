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

/**
 * Las tres ventanas con que nace un proveedor del evento, ya fechadas con lo que el
 * proyecto sabe. Que existan desde el alta obliga a la recolección —lo que más se
 * queda al aire— a aparecer en la cronología aunque nadie la haya llenado.
 */
export function ventanasIniciales(opts: {
  proyectoId: string;
  proveedorEventoId: string;
  nombreProveedor: string;
  responsable: string | null;
  fechaMontaje: Date | null;
  fechaEvento: Date | null;
  fechaDesmontaje: Date | null;
}) {
  const fechaPorFase: Record<FaseProveedor, Date | null> = {
    INSTALACION: opts.fechaMontaje ?? opts.fechaEvento,
    OPERACION: opts.fechaEvento,
    RECOLECCION: opts.fechaDesmontaje ?? opts.fechaEvento,
  };
  return FASES_PROVEEDOR.map((fase, i) => ({
    proyectoId: opts.proyectoId,
    proveedorEventoId: opts.proveedorEventoId,
    tipo: "PROVEEDOR",
    fase,
    fecha: fechaPorFase[fase],
    titulo: `${TITULO_FASE[fase]} — ${opts.nombreProveedor}`,
    responsable: opts.responsable,
    orden: i * 10,
  }));
}

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

/**
 * De qué catálogo salió quien puso lo que se ocupó. Lo coordinado en preproducción
 * siempre es un proveedor; el imprevisto también lo pone un técnico o alguien de casa
 * que lo pagó de su bolsa, y a los tres se les genera la misma cuenta por pagar.
 */
export const TIPOS_ACREEDOR = [
  { valor: "PROVEEDOR", label: "Proveedor", singular: "proveedor", buscar: "Buscar proveedor..." },
  { valor: "TECNICO", label: "Técnico", singular: "técnico", buscar: "Buscar técnico..." },
  {
    valor: "PERSONAL_INTERNO",
    label: "Mainstage Pro",
    singular: "compañero",
    buscar: "Buscar a quien lo puso...",
  },
] as const;

export type TipoAcreedor = (typeof TIPOS_ACREEDOR)[number]["valor"];

/** Columna de ProveedorEvento que liga el registro con su catálogo. */
export const CAMPO_ACREEDOR = {
  PROVEEDOR: "proveedorId",
  TECNICO: "tecnicoId",
  PERSONAL_INTERNO: "personalId",
} as const satisfies Record<TipoAcreedor, string>;

export const esTipoAcreedor = (v: unknown): v is TipoAcreedor =>
  TIPOS_ACREEDOR.some((t) => t.valor === v);

export const tipoAcreedorLabel = (v: string): string =>
  TIPOS_ACREEDOR.find((t) => t.valor === v)?.label ?? "Proveedor";
