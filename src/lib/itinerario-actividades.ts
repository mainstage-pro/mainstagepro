/**
 * itinerario-actividades.ts — Actividades sueltas del itinerario de operaciones.
 *
 * Una actividad suelta es algo que pasa ese día y no vive en la Logística general de
 * ningún proyecto. Se puede integrar después a un proyecto: se convierte en un
 * ProyectoBloqueTiempo (Montaje / Evento / Desmontaje) y la suelta se apaga.
 */
import { prisma } from "./prisma";
import type { ActividadSuelta } from "./itinerario-operaciones";

let tablaLista: Promise<void> | null = null;

/** Migración lazy: crea la tabla la primera vez (patrón intencional para Neon). */
export function ensureTablaActividades(): Promise<void> {
  if (!tablaLista) {
    tablaLista = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "itinerario_actividades" (
          "id" TEXT PRIMARY KEY,
          "fecha" TEXT NOT NULL,
          "horaInicio" TEXT,
          "horaFin" TEXT,
          "titulo" TEXT NOT NULL,
          "nota" TEXT,
          "responsable" TEXT,
          "activo" BOOLEAN NOT NULL DEFAULT true,
          "creadoPorId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "itinerario_actividades_fecha_idx" ON "itinerario_actividades" ("fecha")`,
      );
    })().catch((e) => {
      tablaLista = null; // reintenta en la siguiente llamada
      throw e;
    });
  }
  return tablaLista;
}

/** Actividades sueltas activas en el rango [inicio, fin] (fechas "YYYY-MM-DD"). */
export async function actividadesEnRango(inicio: string, fin: string): Promise<ActividadSuelta[]> {
  await ensureTablaActividades();
  const filas = await prisma.itinerarioActividad.findMany({
    where: { activo: true, fecha: { gte: inicio, lte: fin } },
    orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }, { createdAt: "asc" }],
    select: { id: true, fecha: true, horaInicio: true, horaFin: true, titulo: true, nota: true, responsable: true },
  });
  return filas;
}

/** Sección de la Logística general a la que se integra una actividad. */
export type SeccionLogistica = "MONTAJE" | "EVENTO" | "DESMONTAJE";

/** Sección → tipo de ProyectoBloqueTiempo (el "Evento" es el programa del día). */
export const TIPO_DE_SECCION: Record<SeccionLogistica, string> = {
  MONTAJE: "MONTAJE",
  EVENTO: "PROGRAMA",
  DESMONTAJE: "DESMONTAJE",
};

export function esSeccion(v: unknown): v is SeccionLogistica {
  return v === "MONTAJE" || v === "EVENTO" || v === "DESMONTAJE";
}

export function horaValida(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return /^\d{1,2}:\d{2}$/.test(t) ? t : null;
}

export function fechaValida(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export function textoLimpio(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Crea un renglón en la Logística general del proyecto, al final de su sección.
 * La nota va en `involucrados`, que es la columna de notas que lee y guarda la página
 * del proyecto (el `detalle` lo pierde al autoguardar).
 */
export async function crearBloqueEnProyecto(datos: {
  proyectoId: string;
  seccion: SeccionLogistica;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  titulo: string;
  nota: string | null;
  responsable: string | null;
}) {
  const tipo = TIPO_DE_SECCION[datos.seccion];
  const ultimo = await prisma.proyectoBloqueTiempo.findFirst({
    where: { proyectoId: datos.proyectoId },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });
  return prisma.proyectoBloqueTiempo.create({
    data: {
      proyectoId: datos.proyectoId,
      tipo,
      fecha: new Date(`${datos.fecha}T12:00:00.000Z`),
      horaInicio: datos.horaInicio,
      horaFin: datos.horaFin,
      titulo: datos.titulo,
      involucrados: datos.nota,
      responsable: datos.responsable,
      orden: (ultimo?.orden ?? -1) + 1,
    },
    select: { id: true },
  });
}
