import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { areaCodeDeProyecto, vincularSeccionConSubarea } from "@/lib/organizacion";

// POST: recorre las secciones PLAN de los proyectos operativos y las deriva/vincula
// como PTSubArea del maestro. No borra nada: find-or-create por nombre dentro del
// área + set subAreaId. Re-ejecutable (idempotente).
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const secciones = await prisma.tareaSeccion.findMany({
    where: { tipoModulo: "PLAN" },
    select: { id: true, subAreaId: true, proyecto: { select: { nombre: true } } },
    orderBy: [{ proyecto: { nombre: "asc" } }, { orden: "asc" }],
  });

  let creadas = 0, vinculadas = 0, omitidas = 0;

  // Snapshot de subáreas existentes para distinguir creadas vs. reutilizadas.
  const previas = new Set((await prisma.pTSubArea.findMany({ select: { id: true } })).map(s => s.id));

  for (const s of secciones) {
    if (!areaCodeDeProyecto(s.proyecto.nombre)) { omitidas++; continue; }
    const subAreaId = await vincularSeccionConSubarea(s.id);
    if (!subAreaId) { omitidas++; continue; }
    if (!previas.has(subAreaId)) { creadas++; previas.add(subAreaId); }
    vinculadas++;
  }

  return NextResponse.json({ ok: true, vinculadas, creadas, omitidas });
}
