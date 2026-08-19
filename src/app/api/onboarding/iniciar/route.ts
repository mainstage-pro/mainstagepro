import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ONBOARDING_PASOS, parseIdList } from "@/lib/onboarding";
import { MODULOS_POR_SECCION } from "@/lib/nav";
import { asignacionesEfectivas, NIVEL_LABEL } from "@/lib/capacitacion-plan";
import { subAreaSlug } from "@/lib/capacitacion-ui";

// Migración lazy YA APLICADA en prod (verificado 2026-08-19: onboarding_planes.
// personal_id, puesto_id, origen y el índice único ya existen). No-op: antes
// corría ALTER TABLE incondicional en CADA request (sin ningún flag/chequeo),
// y ALTER TABLE ... ADD COLUMN IF NOT EXISTS toma un lock ACCESS EXCLUSIVE
// aunque la columna ya exista, bloqueando lecturas concurrentes de la tabla.
async function ensureOnboardingSchema() {}

// Mapa moduloKey → label legible (derivado del NAV, misma fuente que permisos).
const MODULO_LABELS: Record<string, string> = Object.fromEntries(
  MODULOS_POR_SECCION.flatMap((s) => s.items.map((i) => [i.key, i.label])),
);

// GET ?personalId= — devuelve el onboarding de la persona (o null) + estado de config del puesto.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const personalId = req.nextUrl.searchParams.get("personalId");
  if (!personalId) return NextResponse.json({ error: "Falta personalId" }, { status: 400 });

  try {
    await ensureOnboardingSchema();
    const persona = await prisma.personalInterno.findUnique({
      where: { id: personalId },
      select: { id: true, nombre: true, puestoId: true, puestoRef: { select: { id: true, nombre: true } } },
    });
    if (!persona) return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });

    const plan = await prisma.onboardingPlan.findUnique({
      where: { personalId },
      include: { modulos: { include: { tareas: { orderBy: { orden: "asc" } } }, orderBy: { orden: "asc" } } },
    });

    return NextResponse.json({
      plan,
      puestoAsignado: !!persona.puestoId,
      puestoNombre: persona.puestoRef?.nombre ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST { personalId } — instancia la plantilla canónica de onboarding para la persona,
// usando la config de su puesto (módulos a revisar + áreas de capacitación).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { personalId } = await req.json();
  if (!personalId) return NextResponse.json({ error: "Falta personalId" }, { status: 400 });

  try {
    await ensureOnboardingSchema();

    const persona = await prisma.personalInterno.findUnique({
      where: { id: personalId },
      select: {
        id: true, nombre: true, fechaIngreso: true,
        puestoRef: {
          select: {
            id: true, nombre: true, area: true,
            onboardingModulos: true, onboardingCapacitaciones: true, capacitacionAsignaciones: true,
          },
        },
      },
    });
    if (!persona) return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    if (!persona.puestoRef) {
      return NextResponse.json(
        { error: "Esta persona no tiene un puesto asignado. Asigna un puesto antes de iniciar el onboarding." },
        { status: 400 },
      );
    }

    // Idempotente: si ya existe, devuélvelo.
    const existente = await prisma.onboardingPlan.findUnique({
      where: { personalId },
      include: { modulos: { include: { tareas: { orderBy: { orden: "asc" } } }, orderBy: { orden: "asc" } } },
    });
    if (existente) return NextResponse.json({ plan: existente, yaExistia: true });

    const puesto = persona.puestoRef;
    const moduloKeys = parseIdList(puesto.onboardingModulos);

    // Capacitación ligada al puesto: usa las asignaciones nuevas (área/sub-área con
    // nivel) o cae al legado. Cada asignación se vuelve una tarea; OBLIGATORIO primero.
    const asignaciones = asignacionesEfectivas(puesto.capacitacionAsignaciones, puesto.onboardingCapacitaciones);
    const catIds = Array.from(new Set(asignaciones.map((a) => a.categoriaId)));
    const catRows = catIds.length
      ? await prisma.categoriaCapacitacion.findMany({
          where: { id: { in: catIds }, activo: true },
          select: { id: true, nombre: true, slug: true },
        })
      : [];
    const catById = new Map(catRows.map((c) => [c.id, c]));

    const capTareas = asignaciones
      .filter((a) => catById.has(a.categoriaId))
      .map((a) => {
        const cat = catById.get(a.categoriaId)!;
        const nivelTxt = NIVEL_LABEL[a.nivel];
        if (a.subArea) {
          return {
            nivel: a.nivel,
            titulo: `Capacitación ${nivelTxt.toLowerCase()}: ${cat.nombre} · ${a.subArea}`,
            recurso: `/capacitacion/area/${cat.slug}/${subAreaSlug(a.subArea)}`,
          };
        }
        return {
          nivel: a.nivel,
          titulo: `Capacitación ${nivelTxt.toLowerCase()} del área: ${cat.nombre}`,
          recurso: `/capacitacion/area/${cat.slug}`,
        };
      })
      .sort((x, y) => (x.nivel === y.nivel ? 0 : x.nivel === "OBLIGATORIO" ? -1 : 1));

    const modulos = ONBOARDING_PASOS.map((paso, i) => {
      let tareas: { titulo: string; descripcion: string | null; tipo: string; orden: number; recurso: string | null }[];

      if (paso.dynamic === "modulos") {
        tareas = moduloKeys.length
          ? moduloKeys.map((k, j) => ({
              titulo: `Revisar módulo: ${MODULO_LABELS[k] ?? k}`,
              descripcion: null,
              tipo: paso.tareaTipo,
              orden: j,
              recurso: null,
            }))
          : [{ titulo: "Sin módulos asignados a este puesto", descripcion: paso.descripcion, tipo: paso.tareaTipo, orden: 0, recurso: null }];
      } else if (paso.dynamic === "capacitaciones") {
        tareas = capTareas.length
          ? capTareas.map((t, j) => ({
              titulo: t.titulo,
              descripcion: null,
              tipo: paso.tareaTipo,
              orden: j,
              recurso: t.recurso,
            }))
          : [{ titulo: "Sin áreas de capacitación asignadas a este puesto", descripcion: paso.descripcion, tipo: paso.tareaTipo, orden: 0, recurso: null }];
      } else {
        tareas = [{ titulo: paso.titulo, descripcion: paso.descripcion, tipo: paso.tareaTipo, orden: 0, recurso: null }];
      }

      return {
        nombre: paso.titulo,
        descripcion: paso.descripcion,
        tipo: paso.tipo,
        orden: i,
        tareas: { create: tareas },
      };
    });

    const plan = await prisma.onboardingPlan.create({
      data: {
        nombre: `Onboarding — ${persona.nombre}`,
        puesto: puesto.nombre,
        area: puesto.area,
        origen: "PUESTO",
        fechaIngreso: persona.fechaIngreso,
        personalId: persona.id,
        puestoId: puesto.id,
        modulos: { create: modulos },
      },
      include: { modulos: { include: { tareas: { orderBy: { orden: "asc" } } }, orderBy: { orden: "asc" } } },
    });

    return NextResponse.json({ plan });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[onboarding/iniciar POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
