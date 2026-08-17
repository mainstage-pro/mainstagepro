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

// ─── Desglose visible al cliente ──────────────────────────────────────────────
// Mismas reglas que `calcularTotalPaquete`, pero línea por línea. El total sale de
// sumar las líneas, así que el desglose y la cifra grande no pueden discrepar.

const ETIQUETA_CONCEPTO: Record<string, string> = {
  OPERACION_TECNICA: "Operación técnica",
  TRANSPORTE: "Transporte",
  HOSPEDAJE: "Hospedaje",
  COMIDA: "Alimentos",
};

export type ItemDesglose = ItemPrecio & {
  equipo?: { descripcion?: string | null; marca?: string | null; modelo?: string | null; categoria?: string | null; precioRenta?: number | null } | null;
  producto?: { nombre?: string | null; categoria?: string | null; precioFinal?: number | null } | null;
};

export type ConceptoDesglose = ConceptoPrecio & { tipo?: string | null; descripcion?: string | null };

export type LineaDesglose = { descripcion: string; cantidad: number; dias: number; precioUnitario: number; subtotal: number };
export type GrupoDesglose = { titulo: string; lineas: LineaDesglose[]; subtotal: number };

export function desglosePaquete(
  items: ItemDesglose[] = [],
  conceptos: ConceptoDesglose[] = [],
): { grupos: GrupoDesglose[]; total: number } {
  const orden: string[] = [];
  const mapa = new Map<string, Map<string, LineaDesglose>>();

  const agrega = (titulo: string, linea: LineaDesglose) => {
    if (!mapa.has(titulo)) { mapa.set(titulo, new Map()); orden.push(titulo); }
    const grupo = mapa.get(titulo)!;
    // Une repetidos (misma pieza al mismo precio) en una sola línea con más cantidad.
    const clave = `${linea.descripcion}|${linea.precioUnitario}|${linea.dias}`;
    const prev = grupo.get(clave);
    if (prev) { prev.cantidad += linea.cantidad; prev.subtotal += linea.subtotal; }
    else grupo.set(clave, { ...linea });
  };

  for (const it of items) {
    const cantidad = Math.max(1, it.cantidad ?? 1);
    if (it.tipo === "PRODUCTO" && it.producto) {
      const precioUnitario = it.producto.precioFinal ?? 0;
      agrega(it.producto.categoria || "Equipo técnico", {
        descripcion: (it.producto.nombre || "Producto").trim(),
        cantidad, dias: 1, precioUnitario, subtotal: cantidad * precioUnitario,
      });
    } else if (it.equipo) {
      const e = it.equipo;
      const precioUnitario = e.precioRenta ?? 0;
      const titulo = [e.marca, e.modelo].filter(Boolean).join(" ").trim() || (e.descripcion || "").trim() || "Equipo";
      agrega(e.categoria || "Equipo técnico", {
        descripcion: titulo,
        cantidad, dias: 1, precioUnitario, subtotal: cantidad * precioUnitario,
      });
    }
  }

  for (const c of conceptos) {
    const cantidad = Math.max(1, c.cantidad ?? 1);
    const dias = Math.max(1, c.dias ?? 1);
    const precioUnitario = c.precioUnitario ?? 0;
    agrega(ETIQUETA_CONCEPTO[c.tipo ?? ""] || "Servicios", {
      descripcion: (c.descripcion || "Servicio").trim(),
      cantidad, dias, precioUnitario, subtotal: cantidad * dias * precioUnitario,
    });
  }

  const grupos = orden.map((titulo) => {
    const lineas = Array.from(mapa.get(titulo)!.values());
    return { titulo, lineas, subtotal: lineas.reduce((s, l) => s + l.subtotal, 0) };
  });

  return { grupos, total: Math.round(grupos.reduce((s, g) => s + g.subtotal, 0)) };
}

export function money(n: number): string {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}
