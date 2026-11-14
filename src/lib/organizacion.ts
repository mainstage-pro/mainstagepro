import { prisma } from "@/lib/prisma";

// Mapea el nombre de un proyecto operativo → código de área canónica del maestro.
export function areaCodeDeProyecto(nombre: string): string | null {
  const n = nombre.toLowerCase();
  if (n.includes("direcc")) return "DIRECCION";
  if (n.includes("administ")) return "ADMINISTRACION";
  if (n.includes("marketing")) return "MARKETING";
  if (n.includes("comercial") || n.includes("venta")) return "VENTAS";
  if (n.includes("producc")) return "PRODUCCION";
  return null;
}

/**
 * Vincula una sección del plan operativo con una subárea del maestro (PTSubArea).
 * Find-or-create por nombre (case-insensitive) dentro del área que corresponde al
 * proyecto de la sección. No borra nada; es idempotente. Devuelve el id de la
 * subárea vinculada, o null si el proyecto no mapea a un área canónica.
 */
export async function vincularSeccionConSubarea(seccionId: string): Promise<string | null> {
  const seccion = await prisma.tareaSeccion.findUnique({
    where: { id: seccionId },
    select: { id: true, nombre: true, descripcion: true, subAreaId: true, proyecto: { select: { nombre: true } } },
  });
  if (!seccion) return null;

  const code = areaCodeDeProyecto(seccion.proyecto.nombre);
  if (!code) return null;

  const area = await prisma.pTArea.findFirst({ where: { codigo: code }, select: { id: true } });
  if (!area) return null;

  const existente = await prisma.pTSubArea.findFirst({
    where: { areaId: area.id, nombre: { equals: seccion.nombre, mode: "insensitive" } },
    select: { id: true, descripcion: true },
  });

  let subAreaId: string;
  if (existente) {
    subAreaId = existente.id;
    if (!existente.descripcion && seccion.descripcion) {
      await prisma.pTSubArea.update({ where: { id: subAreaId }, data: { descripcion: seccion.descripcion } });
    }
  } else {
    const last = await prisma.pTSubArea.findFirst({
      where: { areaId: area.id }, orderBy: { orden: "desc" }, select: { orden: true },
    });
    const nueva = await prisma.pTSubArea.create({
      data: { areaId: area.id, nombre: seccion.nombre, descripcion: seccion.descripcion ?? null, orden: (last?.orden ?? -1) + 1 },
    });
    subAreaId = nueva.id;
  }

  if (seccion.subAreaId !== subAreaId) {
    await prisma.tareaSeccion.update({ where: { id: seccion.id }, data: { subAreaId } });
  }
  return subAreaId;
}

/**
 * Inverso de vincularSeccionConSubarea: dada una subárea del maestro, crea (o
 * vincula) su sección en el bloque indicado (PLAN = Plan de trabajo, TAREA =
 * Tareas) del área. Busca el proyecto operativo cuyo nombre mapea al código del
 * área. Idempotente: si ya hay una sección de ese tipo ligada no hace nada.
 * Devuelve el id de la sección, o null si el área no tiene proyecto operativo
 * (p. ej. transversales).
 */
export async function crearSeccionParaSubarea(
  subAreaId: string,
  tipoModulo: "PLAN" | "TAREA",
): Promise<string | null> {
  const sub = await prisma.pTSubArea.findUnique({
    where: { id: subAreaId },
    select: { id: true, nombre: true, descripcion: true, area: { select: { codigo: true, nombre: true } } },
  });
  if (!sub) return null;

  const yaLigada = await prisma.tareaSeccion.findFirst({
    where: { tipoModulo, subAreaId: sub.id },
    select: { id: true },
  });
  if (yaLigada) return yaLigada.id;

  const proyectos = await prisma.tareaProyecto.findMany({
    where: { archivado: false },
    select: { id: true, nombre: true },
    orderBy: { orden: "asc" },
  });
  const proyecto = proyectos.find(p =>
    sub.area.codigo
      ? areaCodeDeProyecto(p.nombre) === sub.area.codigo
      : p.nombre.toLowerCase() === sub.area.nombre.toLowerCase()
  );
  if (!proyecto) return null;

  // Reutiliza una sección homónima del mismo bloque sin subárea, si la hay; si no, crea una.
  const homonima = await prisma.tareaSeccion.findFirst({
    where: { proyectoId: proyecto.id, tipoModulo, subAreaId: null, nombre: { equals: sub.nombre, mode: "insensitive" } },
    select: { id: true },
  });
  if (homonima) {
    await prisma.tareaSeccion.update({ where: { id: homonima.id }, data: { subAreaId: sub.id } });
    return homonima.id;
  }

  const last = await prisma.tareaSeccion.findFirst({
    where: { proyectoId: proyecto.id }, orderBy: { orden: "desc" }, select: { orden: true },
  });
  const seccion = await prisma.tareaSeccion.create({
    data: {
      nombre:      sub.nombre,
      descripcion: sub.descripcion ?? null,
      proyectoId:  proyecto.id,
      orden:       (last?.orden ?? -1) + 1,
      tipoModulo,
      subAreaId:   sub.id,
    },
  });
  return seccion.id;
}

/** Compat: siembra la sección de Plan de trabajo de una subárea. */
export function crearSeccionPlanParaSubarea(subAreaId: string) {
  return crearSeccionParaSubarea(subAreaId, "PLAN");
}

/** Siembra la sección de Tareas de una subárea. */
export function crearSeccionTareaParaSubarea(subAreaId: string) {
  return crearSeccionParaSubarea(subAreaId, "TAREA");
}

/**
 * Garantiza que cada subárea del maestro tenga su sección en el bloque "Tareas"
 * de su área. Barato cuando ya está todo sembrado (una sola consulta).
 * Idempotente; nunca borra. Devuelve cuántas secciones se crearon/vincularon.
 */
export async function asegurarSeccionesTareaPorSubarea(): Promise<number> {
  const pendientes = await prisma.pTSubArea.findMany({
    where: { secciones: { none: { tipoModulo: "TAREA" } } },
    select: { id: true },
    orderBy: [{ areaId: "asc" }, { orden: "asc" }],
  });
  let n = 0;
  for (const p of pendientes) {
    if (await crearSeccionTareaParaSubarea(p.id)) n++;
  }
  return n;
}
