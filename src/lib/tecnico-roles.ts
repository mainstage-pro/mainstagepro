import { prisma } from "@/lib/prisma";

/**
 * Reemplaza los roles asignados a un técnico (relación N-a-N) y deriva:
 *  - rolId principal = primer rol de la lista (compat con vistas que leen 1 rol)
 *  - disciplina[]    = unión de las disciplinas de esos roles (para tabs/sugerencias)
 * Devuelve { rolId, disciplina } para persistirlos en el propio Tecnico.
 */
export async function syncTecnicoRoles(
  tecnicoId: string,
  roleIds: string[]
): Promise<{ rolId: string | null; disciplina: string[] }> {
  const ids = Array.from(new Set(roleIds.filter(Boolean)));

  await prisma.tecnicoRol.deleteMany({ where: { tecnicoId } });
  if (ids.length > 0) {
    await prisma.tecnicoRol.createMany({
      data: ids.map(rolTecnicoId => ({ tecnicoId, rolTecnicoId })),
      skipDuplicates: true,
    });
  }

  const roles = await prisma.rolTecnico.findMany({
    where: { id: { in: ids } },
    select: { id: true, disciplina: true },
  });
  const byId = new Map(roles.map(r => [r.id, r.disciplina]));
  const disciplina = Array.from(
    new Set(ids.map(id => byId.get(id)).filter((d): d is string => !!d))
  );

  return { rolId: ids[0] ?? null, disciplina };
}

export const TECNICO_ROLES_INCLUDE = {
  roles: {
    include: { rolTecnico: { select: { id: true, nombre: true, disciplina: true } } },
  },
} as const;

type TecnicoConRoles = { roles?: { rolTecnico: { id: string; nombre: string; disciplina: string | null } }[] };

/** Aplana la relación a `roles: [{id,nombre,disciplina}]` para el cliente. */
export function flattenTecnicoRoles<T extends TecnicoConRoles>(t: T) {
  const roles = (t.roles ?? []).map(r => r.rolTecnico);
  return { ...t, roles };
}
