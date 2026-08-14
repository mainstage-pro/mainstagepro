// Precio total de un paquete = suma de sus componentes a precio de lista.
// Puro (sin Prisma) para poder usarse tanto en servidor como en cliente.
// - Item EQUIPO:   cantidad × equipo.precioRenta
// - Item PRODUCTO: cantidad × producto.precioFinal (ya suma sus equipos)
// - Concepto:      cantidad × dias × precioUnitario (operación, transporte, etc.)

export type ItemPrecio = {
  tipo: string;
  cantidad?: number | null;
  equipo?: { precioRenta?: number | null } | null;
  producto?: { precioFinal?: number | null } | null;
};

export type ConceptoPrecio = {
  cantidad?: number | null;
  dias?: number | null;
  precioUnitario?: number | null;
};

export function calcularTotalPaquete(
  items: ItemPrecio[] = [],
  conceptos: ConceptoPrecio[] = [],
): number {
  let total = 0;
  for (const it of items) {
    const cant = Math.max(1, it.cantidad ?? 1);
    if (it.tipo === "PRODUCTO" && it.producto) {
      total += cant * (it.producto.precioFinal ?? 0);
    } else if (it.equipo) {
      total += cant * (it.equipo.precioRenta ?? 0);
    }
  }
  for (const c of conceptos) {
    total += Math.max(1, c.cantidad ?? 1) * Math.max(1, c.dias ?? 1) * (c.precioUnitario ?? 0);
  }
  return Math.round(total);
}

export function money(n: number): string {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}
