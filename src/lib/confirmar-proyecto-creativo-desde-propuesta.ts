// src/lib/confirmar-proyecto-creativo-desde-propuesta.ts
//
// Espejo de confirmar-gira-desde-propuesta.ts para Creative: al aprobarse la
// propuesta ligada a un ProyectoCreativo, el proyecto deja de ser un brief y
// pasa a trabajarse — §4.6 punto 2 de docs/grupo-mainstage-fase4-esquema-comercial.md.
//
// Solo avanza BRIEF → EN_PROCESO. Si el proyecto ya está en REVISION,
// ENTREGADO o CANCELADO (p. ej. una propuesta adicional/extra que se aprueba
// después), no lo toca — nunca retrocede ni resucita un proyecto cerrado.

import { Prisma } from "@prisma/client";

export async function confirmarProyectoCreativoDesdePropuesta(
  tx: Prisma.TransactionClient,
  propuestaId: string,
): Promise<void> {
  const propuesta = await tx.propuestaServicio.findUnique({
    where: { id: propuestaId },
    select: { proyectoCreativoId: true },
  });
  if (!propuesta?.proyectoCreativoId) return;

  const proyecto = await tx.proyectoCreativo.findUnique({
    where: { id: propuesta.proyectoCreativoId },
    select: { estado: true },
  });
  if (proyecto?.estado === "BRIEF") {
    await tx.proyectoCreativo.update({
      where: { id: propuesta.proyectoCreativoId },
      data: { estado: "EN_PROCESO" },
    });
  }
}
