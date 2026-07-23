import { prisma } from "@/lib/prisma";

/**
 * Extrae la nota visible del usuario del campo `notas` de una línea de
 * cotización. En la BD ese campo codifica la categoría y la nota juntas:
 *   "cat:Cat|nota:Texto" · "nota:Texto" · "cat:Cat" (sin nota) · texto plano.
 * Mismo criterio que `getItemNota` en CotizacionPDF, para no filtrar el
 * prefijo `cat:` hacia ficha operativa / rider.
 */
export function notaVisibleDeCotizacion(notas: string | null | undefined): string | null {
  if (!notas) return null;
  if (notas.includes("|nota:")) return notas.split("|nota:")[1]?.trim() || null;
  if (notas.startsWith("nota:")) return notas.slice(5).trim() || null;
  if (notas.startsWith("cat:")) return null; // solo categoría, sin nota
  return notas.trim() || null; // nota plana (legado)
}

function esCodificada(n: string): boolean {
  return n.startsWith("cat:") || n.startsWith("nota:") || n.includes("|nota:");
}

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
 * - Limpia filas ya sembradas con el formato codificado (`cat:…|nota:…`) para
 *   dejar solo la nota visible.
 *
 * Idempotente y no lanza: cualquier error se registra y se traga para no romper
 * la ruta que lo invoca.
 */
export async function sembrarNotasEquiposProyecto(proyectoId: string): Promise<void> {
  try {
    // Fast path: solo trabajar si hay filas sin nota o con formato codificado.
    const pendientes = await prisma.proyectoEquipo.count({
      where: {
        proyectoId,
        OR: [
          { notas: null },
          { notas: "" },
          { notas: { startsWith: "cat:" } },
          { notas: { startsWith: "nota:" } },
          { notas: { contains: "|nota:" } },
        ],
      },
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
    if (!proyecto) return;

    // Notas de cotización (ya limpias) agrupadas por equipoId, en orden de línea.
    const notasPorEquipo = new Map<string, (string | null)[]>();
    for (const l of proyecto.cotizacion?.lineas ?? []) {
      if (!l.equipoId) continue;
      const arr = notasPorEquipo.get(l.equipoId) ?? [];
      arr.push(notaVisibleDeCotizacion(l.notas));
      notasPorEquipo.set(l.equipoId, arr);
    }

    const cursor = new Map<string, number>();
    const updates: { id: string; notas: string | null }[] = [];
    for (const eq of proyecto.equipos) {
      const stored = eq.notas ?? "";
      const notasLinea = notasPorEquipo.get(eq.equipoId);
      const i = cursor.get(eq.equipoId) ?? 0;
      if (notasLinea) cursor.set(eq.equipoId, i + 1);

      if (stored.trim() === "") {
        // Semilla desde la cotización (nota ya limpia).
        const nota = notasLinea ? notasLinea[i] : null;
        if (nota) updates.push({ id: eq.id, notas: nota });
      } else if (esCodificada(stored)) {
        // Limpia una fila ya sembrada con el formato codificado.
        const limpio = notaVisibleDeCotizacion(stored);
        if ((limpio ?? "") !== stored) updates.push({ id: eq.id, notas: limpio });
      }
      // Nota manual en texto plano → se respeta tal cual.
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
