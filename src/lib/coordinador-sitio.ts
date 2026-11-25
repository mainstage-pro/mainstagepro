import type { Prisma } from "@prisma/client";

/**
 * Coordinador en sitio = una PERSONA, no una jornada.
 *
 * - La estrella va en todas las jornadas (renglones) de esa persona en el
 *   proyecto, y en ninguna de nadie más.
 * - El bono de encargado se paga UNA sola vez: va en una sola de sus jornadas
 *   (de preferencia la de operación, luego la más temprana).
 * - Lo ya pagado no se toca: si un renglón pagado ya trae el bono, no se pone
 *   otro, y a un relevado no se le quita un bono que ya cobró.
 *
 * `tecnicoId` null = nadie coordina. `montoBono` null = no tocar bonos (quien
 * hace el cambio no puede ver costos de técnicos).
 */
export async function normalizarCoordinadorSitio(
  tx: Prisma.TransactionClient,
  proyectoId: string,
  tecnicoId: string | null,
  montoBono: number | null,
) {
  await tx.proyectoPersonal.updateMany({
    where: { proyectoId, coordinaEnSitio: true, ...(tecnicoId ? { NOT: { tecnicoId } } : {}) },
    data: { coordinaEnSitio: false },
  });
  if (tecnicoId) {
    await tx.proyectoPersonal.updateMany({
      where: { proyectoId, tecnicoId },
      data: { coordinaEnSitio: true },
    });
  }

  if (montoBono == null) return;

  // Fuera el bono de quien no coordina (salvo lo ya pagado).
  await tx.proyectoPersonal.updateMany({
    where: {
      proyectoId, estadoPago: { not: "PAGADO" }, bonoEncargado: { not: null },
      ...(tecnicoId ? { NOT: { tecnicoId } } : {}),
    },
    data: { bonoEncargado: null },
  });
  if (!tecnicoId) return;

  const filas = await tx.proyectoPersonal.findMany({
    where: { proyectoId, tecnicoId },
    select: { id: true, estadoPago: true, bonoEncargado: true, participacion: true, fechaJornada: true },
  });
  const conBono = filas.filter(f => f.bonoEncargado != null);
  const pagadaConBono = conBono.find(f => f.estadoPago === "PAGADO");

  // Ya cobró el bono en una jornada pagada: las demás no lo llevan.
  if (pagadaConBono) {
    await tx.proyectoPersonal.updateMany({
      where: { proyectoId, tecnicoId, estadoPago: { not: "PAGADO" }, bonoEncargado: { not: null } },
      data: { bonoEncargado: null },
    });
    return;
  }

  // Si ya hay una jornada con bono se respeta (conserva el monto congelado);
  // si no, se elige: operación primero, luego la más temprana.
  const pendientes = filas.filter(f => f.estadoPago !== "PAGADO");
  if (pendientes.length === 0) return;
  const elegida = conBono[0] ?? [...pendientes].sort((a, b) => {
    const op = Number(b.participacion === "OPERACION") - Number(a.participacion === "OPERACION");
    if (op !== 0) return op;
    return (a.fechaJornada ?? "9999").localeCompare(b.fechaJornada ?? "9999");
  })[0];

  await tx.proyectoPersonal.updateMany({
    where: { proyectoId, tecnicoId, id: { not: elegida.id }, estadoPago: { not: "PAGADO" }, bonoEncargado: { not: null } },
    data: { bonoEncargado: null },
  });
  if (elegida.bonoEncargado == null && montoBono > 0) {
    await tx.proyectoPersonal.update({ where: { id: elegida.id }, data: { bonoEncargado: montoBono } });
  }
}
