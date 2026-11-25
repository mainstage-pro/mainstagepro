// Secciones de Cobros y pagos — se DERIVAN de lo que ya guarda cada cuenta
// (tipoAcreedor + banderas de origen), nunca se guardan. Si nace un origen
// nuevo de CxP, decide aquí a qué sección pertenece.
//
// Precedencia en CxP: el ORIGEN manda sobre el tipo de acreedor. Un préstamo
// de capital puede ser de un socio o de un proveedor, pero se controla como
// préstamo; un gasto recurrente puede ser de un proveedor, pero es gasto fijo.

export type SeccionCxP = "NOMINA" | "FREELANCE" | "PROVEEDOR" | "GASTO_FIJO" | "SOCIO" | "PRESTAMO" | "OTRO";

export const SECCIONES_CXP: { key: SeccionCxP; label: string; ayuda: string }[] = [
  { key: "NOMINA", label: "Nómina", ayuda: "Sueldos del personal interno" },
  { key: "FREELANCE", label: "Freelance", ayuda: "Técnicos por evento" },
  { key: "PROVEEDOR", label: "Proveedores", ayuda: "Rentas de equipo, servicios y compras" },
  { key: "GASTO_FIJO", label: "Gastos fijos", ayuda: "Gastos recurrentes: renta, servicios, suscripciones" },
  { key: "SOCIO", label: "Socios", ayuda: "Pago a socios, renta de activos y reparto de utilidades" },
  { key: "PRESTAMO", label: "Préstamos y deudas", ayuda: "Préstamos de capital y pasivos" },
  { key: "OTRO", label: "Reembolsos y otros", ayuda: "Reembolsos al equipo, choferes y gastos operativos" },
];

export function seccionCxP(c: {
  tipoAcreedor: string;
  esNomina?: boolean;
  esDeuda?: boolean;
  esReparto?: boolean;
  esPrestamo?: boolean;
  gastoRecurrenteId?: string | null;
}): SeccionCxP {
  if (c.esPrestamo || c.esDeuda) return "PRESTAMO";
  if (c.esNomina || c.tipoAcreedor === "PERSONAL_INTERNO") return "NOMINA";
  if (c.gastoRecurrenteId) return "GASTO_FIJO";
  if (c.esReparto || c.tipoAcreedor === "SOCIO") return "SOCIO";
  if (c.tipoAcreedor === "TECNICO") return "FREELANCE";
  if (c.tipoAcreedor === "PROVEEDOR" || c.tipoAcreedor === "EMPRESA") return "PROVEEDOR";
  return "OTRO";
}

export type SeccionCxC = "EVENTO" | "RECURRENTE" | "OTRO";

// Cobros y pagos es de Mainstage Pro: las secciones de CxC no separan otras
// unidades de negocio.
export const SECCIONES_CXC: { key: SeccionCxC; label: string; ayuda: string }[] = [
  { key: "EVENTO", label: "Eventos", ayuda: "Cobros ligados a un proyecto" },
  { key: "RECURRENTE", label: "Recurrentes", ayuda: "Igualas y cobros periódicos" },
  { key: "OTRO", label: "Otros", ayuda: "Sin proyecto" },
];

export function seccionCxC(c: {
  proyecto?: { id: string } | null;
  serieRecurrenteId?: string | null;
}): SeccionCxC {
  if (c.serieRecurrenteId) return "RECURRENTE";
  if (c.proyecto) return "EVENTO";
  return "OTRO";
}
