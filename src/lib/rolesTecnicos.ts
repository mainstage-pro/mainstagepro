import { DISCIPLINA_LABELS } from "./disciplinaColors";

/** Orden de las secciones del tabulador de personal (Producción primero). null = "Sin categoría". */
export const SECCIONES_ROL: (string | null)[] = [
  "PRODUCCION", "AUDIO", "ILUMINACION", "VIDEO", "ELECTRICIDAD",
  "STAGE", "RIGGING", "DJ", "STAFF_GENERAL", null,
];

/** Jerarquía dentro de cada sección: ingeniero > operador > técnico. */
export function rangoJerarquia(nombre: string): number {
  const n = nombre.toLowerCase();
  if (n.includes("ingenier")) return 0;
  if (n.includes("operador")) return 1;
  if (n.includes("técnico") || n.includes("tecnico")) return 2;
  return 1.5;
}

/** Jornadas del tabulador. La llave es legacy (CORTA/MEDIA/LARGA); la etiqueta es la del tabulador. */
export const JORNADAS_ROL = ["CORTA", "MEDIA", "LARGA"] as const;
export const JORNADA_ROL_LABELS: Record<string, string> = {
  CORTA: "0–8 hrs",
  MEDIA: "8–12 hrs",
  LARGA: "+12 hrs",
};

/** Niveles. Solo aplican a los roles que NO se cobran por jornada. */
export const NIVELES_ROL = ["AAA", "AA", "A"] as const;

export type RolTarifado = {
  tipoPago: string;
  tarifaAAACorta?: number | null;
  tarifaAAAMedia?: number | null;
  tarifaAAALarga?: number | null;
  tarifaPlanaAAA?: number | null;
  tarifaPlanaAA?: number | null;
  tarifaPlanaA?: number | null;
  tarifaHoraAAA?: number | null;
  tarifaHoraAA?: number | null;
  tarifaHoraA?: number | null;
};

/** Los roles por jornada no tienen niveles: el tabulador guarda una tasa única por tramo de horas. */
export function rolUsaNivel(tipoPago: string): boolean {
  return tipoPago !== "POR_JORNADA";
}

export function rolUsaJornada(tipoPago: string): boolean {
  return tipoPago === "POR_JORNADA";
}

export function nivelEfectivo(tipoPago: string, nivel: string): string {
  return rolUsaNivel(tipoPago) ? nivel : "AAA";
}

/** Tarifa tal como está capturada en el tabulador de personal. */
export function tarifaRol(rol: RolTarifado, nivel: string, jornada: string): number {
  const campo = (k: keyof RolTarifado) => {
    const v = rol[k];
    return typeof v === "number" ? v : 0;
  };
  if (rol.tipoPago === "TARIFA_PLANA" || rol.tipoPago === "POR_PROYECTO") {
    return campo(`tarifaPlana${nivel}` as keyof RolTarifado);
  }
  if (rol.tipoPago === "POR_HORA") {
    return campo(`tarifaHora${nivel}` as keyof RolTarifado);
  }
  // POR_JORNADA: el tabulador captura la tasa única en los campos AAA.
  const j = jornada.charAt(0) + jornada.slice(1).toLowerCase();
  return campo(`tarifaAAA${j}` as keyof RolTarifado);
}

/** Etiqueta corta de la tarifa elegida, con los mismos términos del tabulador. */
export function etiquetaTarifaRol(tipoPago: string, nivel?: string | null, jornada?: string | null): string {
  if (rolUsaJornada(tipoPago)) return jornada ? (JORNADA_ROL_LABELS[jornada] ?? jornada) : "";
  return nivel ?? "";
}

export type RolOrdenable = {
  nombre: string;
  disciplina?: string | null;
  orden?: number | null;
};

export function seccionLabel(disciplina: string | null | undefined): string {
  if (!disciplina) return "Sin categoría";
  return DISCIPLINA_LABELS[disciplina] ?? disciplina;
}

function rangoSeccion(disciplina: string | null | undefined): number {
  const i = SECCIONES_ROL.indexOf(disciplina ?? null);
  return i === -1 ? SECCIONES_ROL.length : i;
}

export function compararRolesTecnicos(a: RolOrdenable, b: RolOrdenable): number {
  return (
    rangoSeccion(a.disciplina) - rangoSeccion(b.disciplina) ||
    rangoJerarquia(a.nombre) - rangoJerarquia(b.nombre) ||
    (a.orden ?? 0) - (b.orden ?? 0) ||
    a.nombre.localeCompare(b.nombre)
  );
}

export function ordenarRolesTecnicos<T extends RolOrdenable>(roles: T[]): T[] {
  return [...roles].sort(compararRolesTecnicos);
}

/** Agrupa en secciones del tabulador, ya ordenadas y sin secciones vacías. */
export function agruparRolesTecnicos<T extends RolOrdenable>(
  roles: T[]
): { disciplina: string | null; label: string; roles: T[] }[] {
  return SECCIONES_ROL
    .map(disciplina => ({
      disciplina,
      label: seccionLabel(disciplina),
      roles: roles
        .filter(r => (r.disciplina ?? null) === disciplina)
        .sort(compararRolesTecnicos),
    }))
    .filter(s => s.roles.length > 0);
}
