// Origen de un equipo del catálogo (Equipo.tipo). Tres líneas de inventario:
//
//   PROPIO  — de Mainstage. Entra a bodega, checklist y disponibilidad real.
//   EXTERNO — subrenta de un proveedor. Costo y proveedor por equipo.
//   PREMIUM — subrenta de marcas premium (L'Acoustics, Funktion One, Robe, Clay
//             Paky, Nexo...). Se cotiza y se paga igual que EXTERNO, pero se
//             lista aparte porque es un catálogo de otro nivel comercial.
//
// PREMIUM no es inventario propio: no cuenta para disponibilidad, bodega ni
// valuación de activos. En cotizaciones y en el rider del proyecto viaja por la
// misma vía que el equipo de tercero (línea EQUIPO_EXTERNO, ProyectoEquipo
// EXTERNO), porque financieramente es lo mismo: pass-through con costo y
// proveedor a quién pedírselo.

export const TIPOS_EQUIPO = ["PROPIO", "EXTERNO", "PREMIUM"] as const;
export type TipoEquipo = (typeof TIPOS_EQUIPO)[number];

export const TIPO_EQUIPO_LABEL: Record<string, string> = {
  PROPIO: "Propio",
  EXTERNO: "Externo",
  PREMIUM: "Premium",
};

/** Se subrenta a un proveedor: lleva costo, proveedor y no es stock propio. */
export function esEquipoDeTercero(tipo: string | null | undefined): boolean {
  return tipo === "EXTERNO" || tipo === "PREMIUM";
}
