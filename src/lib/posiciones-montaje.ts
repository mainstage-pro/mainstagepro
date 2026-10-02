import type { Prisma, PrismaClient } from "@prisma/client";

type Cliente = PrismaClient | Prisma.TransactionClient;

/**
 * Las posiciones de montaje de un renglón del rider no pueden sumar más unidades
 * de las que ese renglón tiene. Si al bajar la cantidad no se recortan, el layout
 * del escenario —que se dibuja con las posiciones, no con la cantidad— sigue
 * contando equipo que ya no está.
 *
 * Recorta por el final (el montaje capturado primero es el que manda) y solo borra
 * la posición que se queda en cero: las piezas ya dibujadas en el plano guardan el
 * id de la posición.
 */
export async function recortarPosicionesSobrantes(tx: Cliente, proyectoEquipoId: string, cantidad: number) {
  const posiciones = await tx.proyectoEquipoPosicion.findMany({
    where: { proyectoEquipoId },
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
  });
  let sobra = posiciones.reduce((s, p) => s + p.cantidad, 0) - cantidad;
  for (const p of posiciones) {
    if (sobra <= 0) break;
    const quitar = Math.min(p.cantidad, sobra);
    if (quitar === p.cantidad) await tx.proyectoEquipoPosicion.delete({ where: { id: p.id } });
    else await tx.proyectoEquipoPosicion.update({ where: { id: p.id }, data: { cantidad: p.cantidad - quitar } });
    sobra -= quitar;
  }
}
