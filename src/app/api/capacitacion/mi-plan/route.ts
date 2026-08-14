import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  asignacionesEfectivas,
  nivelMax,
  slugsDeArea,
  type NivelCapacitacion,
} from "@/lib/capacitacion-plan";
import { subAreaSlug } from "@/lib/capacitacion-ui";

// GET /api/capacitacion/mi-plan — Niveles (obligatorio/recomendado) de capacitación
// del usuario logueado, derivados del puesto que ocupa (área + sub-área).
//
// Devuelve mapas para badging en el portal:
//   porAreaId:   { [categoriaId]: nivel }      — área completa marcada
//   porAreaSlug: { [slug]: nivel }             — misma info, indexada por slug de área
//   porSubArea:  { ["${slug}::${sub}"]: nivel } — sub-área específica marcada
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const vacio = { tienePlan: false, porAreaId: {}, porAreaSlug: {}, porSubArea: {} };

  const persona = await prisma.personalInterno.findFirst({
    where: { userId: session.id },
    select: { puestoRef: { select: { area: true, capacitacionAsignaciones: true, onboardingCapacitaciones: true } } },
  });
  const puesto = persona?.puestoRef;
  if (!puesto) return NextResponse.json(vacio);

  const asignaciones = asignacionesEfectivas(
    puesto.capacitacionAsignaciones,
    puesto.onboardingCapacitaciones,
  );
  if (!asignaciones.length) return NextResponse.json(vacio);

  // Resolver slug por categoriaId. Si el área del puesto no matchea ninguna
  // categoría por slug, igual respetamos las asignaciones explícitas por id.
  const cats = await prisma.categoriaCapacitacion.findMany({
    where: { id: { in: Array.from(new Set(asignaciones.map((a) => a.categoriaId))) } },
    select: { id: true, slug: true },
  });
  const slugPorId = new Map(cats.map((c) => [c.id, (c.slug || "").toLowerCase()]));

  const porAreaId: Record<string, NivelCapacitacion> = {};
  const porAreaSlug: Record<string, NivelCapacitacion> = {};
  const porSubArea: Record<string, NivelCapacitacion> = {};

  for (const a of asignaciones) {
    const slug = slugPorId.get(a.categoriaId) ?? slugsDeArea(puesto.area)[0];
    if (a.subArea) {
      const k = `${slug}::${subAreaSlug(a.subArea)}`;
      porSubArea[k] = nivelMax(porSubArea[k], a.nivel);
    } else {
      porAreaId[a.categoriaId] = nivelMax(porAreaId[a.categoriaId], a.nivel);
      if (slug) porAreaSlug[slug] = nivelMax(porAreaSlug[slug], a.nivel);
    }
  }

  return NextResponse.json({ tienePlan: true, porAreaId, porAreaSlug, porSubArea });
}
