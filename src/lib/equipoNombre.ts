type EquipoNombre = { marca?: string | null; modelo?: string | null; descripcion?: string | null };

/** Nombre para mostrar: "Marca · Modelo", con fallback a la descripción libre. */
export function getEquipoDisplayName(equipo: EquipoNombre): string {
  return [equipo.marca, equipo.modelo].filter(Boolean).join(" · ") || equipo.descripcion || "";
}

/** Solo "Marca · Modelo", sin fallback — útil para mostrar como subtítulo junto a la descripción. */
export function getEquipoMarcaModelo(equipo: EquipoNombre): string {
  return [equipo.marca, equipo.modelo].filter(Boolean).join(" · ");
}
