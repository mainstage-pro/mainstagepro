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
