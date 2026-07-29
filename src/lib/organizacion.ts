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
