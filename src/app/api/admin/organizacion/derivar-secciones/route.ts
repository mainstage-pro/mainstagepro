import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { areaCodeDeProyecto, vincularSeccionConSubarea, crearSeccionPlanParaSubarea } from "@/lib/organizacion";

// POST: sincroniza en ambos sentidos maestro ↔ plan. (1) Deriva las secciones PLAN
// como PTSubArea del maestro; (2) siembra la sección de plan para las subáreas
// huérfanas. No borra nada: find-or-create + set subAreaId. Idempotente.
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

  // Sentido inverso: siembra la sección de plan para las subáreas aún huérfanas.
  let sembradas = 0;
  const huerfanas = await prisma.pTSubArea.findMany({
    where: { secciones: { none: { tipoModulo: "PLAN" } } },
    select: { id: true },
  });
  for (const h of huerfanas) {
    if (await crearSeccionPlanParaSubarea(h.id)) sembradas++;
  }

  return NextResponse.json({ ok: true, vinculadas, creadas, sembradas, omitidas });
}
