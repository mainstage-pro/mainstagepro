import { prisma } from "@/lib/prisma";

// Mensajería interna — reglas de visibilidad de canal:
//   GENERAL          → todos
//   AREA (area=X)    → usuarios con session.area === X, o ADMIN (ve todas)
//   DIRECTO / GRUPO  → solo quien tiene fila en CanalMiembro
// No hay tabla de "a quién le toca el canal de área": se deriva de Session.area
// (igual que el resto del dashboard), así que agregar un área nueva no requiere
// tocar esta tabla, solo sembrar su canal una vez (ensureCanalesBase).

export const AREA_CANALES = ["DIRECCION", "ADMINISTRACION", "MARKETING", "VENTAS", "PRODUCCION", "RRHH"] as const;

let aseguradoEnEsteProceso = false;

/** Siembra (idempotente) el canal GENERAL + un canal por área, si no existen. */
export async function ensureCanalesBase(): Promise<void> {
  if (aseguradoEnEsteProceso) return; // evita repetir el roundtrip en cada request del mismo proceso
  const existentes = await prisma.canal.findMany({
    where: { tipo: { in: ["GENERAL", "AREA"] } },
    select: { tipo: true, area: true },
  });
  const tieneGeneral = existentes.some((c) => c.tipo === "GENERAL");
  const areasExistentes = new Set(existentes.filter((c) => c.tipo === "AREA").map((c) => c.area));

  const faltantes = AREA_CANALES.filter((a) => !areasExistentes.has(a));
  await Promise.all([
    !tieneGeneral ? prisma.canal.create({ data: { tipo: "GENERAL", nombre: "General" } }) : Promise.resolve(),
    ...faltantes.map((area) => prisma.canal.create({ data: { tipo: "AREA", area } })),
  ]);
  aseguradoEnEsteProceso = true;
}

/** Condición Prisma para los canales visibles a esta sesión (GENERAL/AREA propia/admin + DIRECTO/GRUPO donde es miembro). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function canalesVisiblesWhere(session: { id: string; role: string; area?: string | null }): Record<string, any> {
  const esAdmin = session.role === "ADMIN";
  return {
    OR: [
      { tipo: "GENERAL" },
      esAdmin ? { tipo: "AREA" } : { tipo: "AREA", area: session.area ?? "__ninguna__" },
      { tipo: { in: ["DIRECTO", "GRUPO"] }, miembros: { some: { usuarioId: session.id } } },
    ],
  };
}

export function puedeVerCanal(
  canal: { tipo: string; area: string | null; miembros?: { usuarioId: string }[] },
  session: { id: string; role: string; area?: string | null },
): boolean {
  if (canal.tipo === "GENERAL") return true;
  if (canal.tipo === "AREA") return session.role === "ADMIN" || canal.area === session.area;
  return (canal.miembros ?? []).some((m) => m.usuarioId === session.id);
}

export function nombreCanal(
  canal: { tipo: string; area: string | null; nombre: string | null },
  AREA_LABELS: Record<string, string>,
): string {
  if (canal.tipo === "GENERAL") return "General";
  if (canal.tipo === "AREA") return AREA_LABELS[canal.area ?? ""] ?? canal.area ?? "Área";
  return canal.nombre ?? "Grupo";
}
