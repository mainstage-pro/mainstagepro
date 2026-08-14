import { prisma } from "@/lib/prisma";
import { ideaToData, type IdeaContenido } from "./data";
import type { DesignOverrides } from "../overrides";

// Persistencia de la elección de contenido POR SEMANA. Cada semana del calendario
// tiene una "ranura" estable (ancla = "contenido:<semanaKey>"). Al aprobar, se
// guarda un DisenoGuardado APROBADO con el snapshot de la idea elegida; ese
// snapshot ya contiene ideaId. Regenerar solo cambia qué idea se muestra (GET);
// la ranura se materializa hasta que el usuario aprueba.

const TEMPLATE = "contenido-informativo";

export const anclaDe = (semanaKey: string) => `contenido:${semanaKey}`;
const semanaDeAncla = (ancla: string) => ancla.replace(/^contenido:/, "");

export type SeleccionSemana = { id: string; ideaId: string; estado: string; editado: boolean };

const tieneEdiciones = (ov: DesignOverrides | null): boolean =>
  !!(ov && ((ov.texto && Object.keys(ov.texto).length > 0) || (ov.fotos && Object.keys(ov.fotos).length > 0)));

// Mapa semanaKey -> selección (id, ideaId, estado, editado) en una sola query.
export async function seleccionesDe(semanaKeys: string[]): Promise<Map<string, SeleccionSemana>> {
  if (semanaKeys.length === 0) return new Map();
  const rows = await prisma.disenoGuardado.findMany({
    where: { template: TEMPLATE, ancla: { in: semanaKeys.map(anclaDe) } },
    select: { id: true, ancla: true, snapshot: true, estado: true, overrides: true },
  });
  const out = new Map<string, SeleccionSemana>();
  for (const r of rows) {
    if (!r.ancla) continue;
    const snap = r.snapshot as { ideaId?: string } | null;
    if (snap?.ideaId) {
      out.set(semanaDeAncla(r.ancla), {
        id: r.id,
        ideaId: snap.ideaId,
        estado: r.estado,
        editado: tieneEdiciones((r.overrides as DesignOverrides) ?? null),
      });
    }
  }
  return out;
}

// Elección de UNA semana (para la vista de detalle).
export async function seleccionSemana(semanaKey: string): Promise<SeleccionSemana | null> {
  return (await seleccionesDe([semanaKey])).get(semanaKey) ?? null;
}

// Aprueba (o reemplaza) la idea de una semana. Sin unique constraint: findFirst + update/create.
export async function aprobarSemana(semanaKey: string, idea: IdeaContenido): Promise<void> {
  const ancla = anclaDe(semanaKey);
  const titulo = `${idea.tituloGold} ${idea.tituloWhite}`.trim();
  const snapshot = ideaToData(idea) as unknown as object;
  const existente = await prisma.disenoGuardado.findFirst({
    where: { template: TEMPLATE, ancla },
    select: { id: true },
  });
  if (existente) {
    await prisma.disenoGuardado.update({
      where: { id: existente.id },
      data: { snapshot, estado: "APROBADO", titulo, formato: "story" },
    });
  } else {
    await prisma.disenoGuardado.create({
      data: { template: TEMPLATE, proyectoId: null, titulo, formato: "story", snapshot, estado: "APROBADO", ancla },
    });
  }
}

// Materializa (o reutiliza) la ranura de una semana para EDITAR sus textos/fotos.
// Devuelve el id del DisenoGuardado. Si la semana ya tenía una idea distinta,
// refresca el snapshot base a la idea actual pero conserva los overrides.
export async function ranuraParaEditar(semanaKey: string, idea: IdeaContenido): Promise<string> {
  const ancla = anclaDe(semanaKey);
  const titulo = `${idea.tituloGold} ${idea.tituloWhite}`.trim();
  const snapshot = ideaToData(idea) as unknown as object;
  const existente = await prisma.disenoGuardado.findFirst({
    where: { template: TEMPLATE, ancla },
    select: { id: true, snapshot: true },
  });
  if (existente) {
    const snap = existente.snapshot as { ideaId?: string } | null;
    if (snap?.ideaId !== idea.id) {
      await prisma.disenoGuardado.update({ where: { id: existente.id }, data: { snapshot, titulo } });
    }
    return existente.id;
  }
  const creado = await prisma.disenoGuardado.create({
    data: { template: TEMPLATE, proyectoId: null, titulo, formato: "story", snapshot, estado: "BORRADOR", ancla },
  });
  return creado.id;
}
