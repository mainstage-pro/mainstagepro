import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Mapea nombre de proyecto operativo → código de área canónica del maestro.
function areaCodeDeProyecto(nombre: string): string | null {
  const n = nombre.toLowerCase();
  if (n.includes("direcc")) return "DIRECCION";
  if (n.includes("administ")) return "ADMINISTRACION";
  if (n.includes("marketing")) return "MARKETING";
  if (n.includes("comercial") || n.includes("venta")) return "VENTAS";
  if (n.includes("producc")) return "PRODUCCION";
  return null;
}

// POST: recorre las secciones PLAN de los proyectos operativos, las agrupa por área
// (según su proyecto) y las deriva/vincula como PTSubArea del maestro. No borra nada:
// find-or-create por nombre dentro del área + set subAreaId. Re-ejecutable (idempotente).
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const areas = await prisma.pTArea.findMany({ select: { id: true, codigo: true } });
  const areaIdPorCodigo = new Map<string, string>();
  for (const a of areas) if (a.codigo) areaIdPorCodigo.set(a.codigo, a.id);

  const secciones = await prisma.tareaSeccion.findMany({
    where: { tipoModulo: "PLAN" },
    select: { id: true, nombre: true, descripcion: true, subAreaId: true, proyecto: { select: { nombre: true } } },
    orderBy: [{ proyecto: { nombre: "asc" } }, { orden: "asc" }],
  });

  let creadas = 0, vinculadas = 0, omitidas = 0;

  for (const s of secciones) {
    const code = areaCodeDeProyecto(s.proyecto.nombre);
    const areaId = code ? areaIdPorCodigo.get(code) : undefined;
    if (!areaId) { omitidas++; continue; }

    // Buscar subárea existente por nombre exacto (case-insensitive) dentro del área.
    const existente = await prisma.pTSubArea.findFirst({
      where: { areaId, nombre: { equals: s.nombre, mode: "insensitive" } },
      select: { id: true, descripcion: true },
    });

    let subAreaId: string;
    if (existente) {
      subAreaId = existente.id;
      if (!existente.descripcion && s.descripcion) {
        await prisma.pTSubArea.update({ where: { id: subAreaId }, data: { descripcion: s.descripcion } });
      }
    } else {
      const last = await prisma.pTSubArea.findFirst({
        where: { areaId }, orderBy: { orden: "desc" }, select: { orden: true },
      });
      const nueva = await prisma.pTSubArea.create({
        data: { areaId, nombre: s.nombre, descripcion: s.descripcion ?? null, orden: (last?.orden ?? -1) + 1 },
      });
      subAreaId = nueva.id;
      creadas++;
    }

    if (s.subAreaId !== subAreaId) {
      await prisma.tareaSeccion.update({ where: { id: s.id }, data: { subAreaId } });
    }
    vinculadas++;
  }

  return NextResponse.json({ ok: true, vinculadas, creadas, omitidas });
}
