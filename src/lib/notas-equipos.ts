import { prisma } from "@/lib/prisma";

/**
 * Siembra `ProyectoEquipo.notas` a partir de `CotizacionLinea.notas`.
 *
 * La nota que se escribe en el concepto de cada equipo dentro de la cotización
 * es la fuente inicial; una vez copiada, `ProyectoEquipo.notas` pasa a ser la
 * fuente única (la que muestran ficha operativa y rider de carga, y la que se
 * edita desde el proyecto). Por eso:
 *
 * - Solo rellena filas con nota vacía — NUNCA sobrescribe una edición manual.
 * - Empareja por `equipoId` en orden: `crear-proyecto` crea las filas 1:1 con
 *   las líneas de equipo de la cotización, así que la N-ésima fila de un equipo
 *   corresponde a la N-ésima línea de ese equipo.
 *
 * Idempotente y no lanza: cualquier error se registra y se traga para no romper
 * la ruta que lo invoca.
 */
export async function sembrarNotasEquiposProyecto(proyectoId: string): Promise<void> {
  try {
    // Fast path: si no hay equipos sin nota, no hay nada que sembrar.
    const pendientes = await prisma.proyectoEquipo.count({
      where: { proyectoId, OR: [{ notas: null }, { notas: "" }] },
    });
    if (pendientes === 0) return;

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        equipos: {
          select: { id: true, equipoId: true, notas: true },
          orderBy: { id: "asc" },
        },
        cotizacion: {
          select: {
            lineas: {
              where: { tipo: { in: ["EQUIPO_PROPIO", "EQUIPO_EXTERNO"] } },
              select: { equipoId: true, notas: true },
              orderBy: { id: "asc" },
            },
          },
        },
      },
    });
    if (!proyecto?.cotizacion) return;

    // Notas de cotización agrupadas por equipoId, en orden de línea (se incluyen
    // las vacías como null para conservar la alineación posicional).
    const notasPorEquipo = new Map<string, (string | null)[]>();
    for (const l of proyecto.cotizacion.lineas) {
      if (!l.equipoId) continue;
      const arr = notasPorEquipo.get(l.equipoId) ?? [];
      arr.push((l.notas ?? "").trim() || null);
      notasPorEquipo.set(l.equipoId, arr);
    }

    // Empareja cada ProyectoEquipo con su línea correspondiente (mismo equipoId,
    // mismo orden). El cursor avanza incluso cuando la fila ya tiene nota, para
    // no desalinear las siguientes.
    const cursor = new Map<string, number>();
    const updates: { id: string; notas: string }[] = [];
    for (const eq of proyecto.equipos) {
      const notas = notasPorEquipo.get(eq.equipoId);
      if (!notas) continue;
      const i = cursor.get(eq.equipoId) ?? 0;
      cursor.set(eq.equipoId, i + 1);
      if ((eq.notas ?? "").trim()) continue; // conserva edición manual
      const nota = notas[i];
      if (nota) updates.push({ id: eq.id, notas: nota });
    }

    if (updates.length === 0) return;
    await prisma.$transaction(
      updates.map((u) =>
        prisma.proyectoEquipo.update({ where: { id: u.id }, data: { notas: u.notas } }),
      ),
    );
  } catch (err) {
    console.error("[sembrarNotasEquiposProyecto]", err);
  }
}
