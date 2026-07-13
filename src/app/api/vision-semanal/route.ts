import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import {
  VISION_CONFIG,
  PREPRODUCCION_EXTRA_VACIO,
  ensureVisionSemanalTable,
  isVisionArea,
  puntosDefault,
  semanaKey,
  tareasDelArea,
  proyectosDelArea,
  type EntregaPunto,
  type VisionAreaKey,
} from "@/lib/vision-semanal";

// ¿Puede este usuario editar el documento de esta área?
function puedeEditar(role: string, userArea: string | null | undefined, area: VisionAreaKey): boolean {
  if (role === "ADMIN") return true;
  if (userArea === area) return true;
  // Producción también es responsable de pre-producción.
  if (area === "PREPRODUCCION" && userArea === "PRODUCCION") return true;
  return false;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const area = searchParams.get("area");
  const semana = searchParams.get("semana") || semanaKey();

  if (!isVisionArea(area)) {
    return NextResponse.json({ error: "Área inválida" }, { status: 400 });
  }

  await ensureVisionSemanalTable();

  const doc = await prisma.visionSemanal.findUnique({
    where: { area_semana: { area, semana } },
    include: { autor: { select: { id: true, name: true } } },
  });

  const [tareas, proyectos] = await Promise.all([
    tareasDelArea(area, semana),
    proyectosDelArea(area),
  ]);

  const config = VISION_CONFIG[area];
  const entregaInfo: EntregaPunto[] = doc
    ? (doc.entregaInfo as unknown as EntregaPunto[])
    : puntosDefault(area);
  const extra = doc
    ? { ...PREPRODUCCION_EXTRA_VACIO, ...(doc.extra as object) }
    : PREPRODUCCION_EXTRA_VACIO;

  return NextResponse.json({
    config,
    semana,
    puedeEditar: puedeEditar(session.role, session.area, area),
    nuevo: !doc,
    documento: {
      enfoque: doc?.enfoque ?? "",
      entregaInfo,
      desbloqueo: doc?.desbloqueo ?? "",
      comentarios: doc?.comentarios ?? "",
      extra,
      autor: doc?.autor ?? null,
      actualizadoEn: doc?.updatedAt?.toISOString() ?? null,
    },
    tareas,
    proyectos,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const area = body.area as string;
  const semana = (body.semana as string) || semanaKey();

  if (!isVisionArea(area)) {
    return NextResponse.json({ error: "Área inválida" }, { status: 400 });
  }
  if (!puedeEditar(session.role, session.area, area)) {
    return NextResponse.json({ error: "Sin permiso para editar esta área" }, { status: 403 });
  }

  await ensureVisionSemanalTable();

  // Sanea entregaInfo: array de { id, titulo, contenido }
  const entregaInfo: EntregaPunto[] = Array.isArray(body.entregaInfo)
    ? body.entregaInfo
        .filter((p: unknown): p is Record<string, unknown> => !!p && typeof p === "object")
        .map((p: Record<string, unknown>, i: number) => ({
          id: typeof p.id === "string" && p.id ? p.id : `p-${i}`,
          titulo: typeof p.titulo === "string" ? p.titulo : "",
          contenido: typeof p.contenido === "string" ? p.contenido : "",
        }))
    : puntosDefault(area as VisionAreaKey);

  const extra =
    body.extra && typeof body.extra === "object"
      ? { ...PREPRODUCCION_EXTRA_VACIO, ...body.extra }
      : PREPRODUCCION_EXTRA_VACIO;

  const data = {
    enfoque: typeof body.enfoque === "string" ? body.enfoque : "",
    desbloqueo: typeof body.desbloqueo === "string" ? body.desbloqueo : "",
    comentarios: typeof body.comentarios === "string" ? body.comentarios : "",
    entregaInfo: entregaInfo as unknown as object,
    extra: extra as unknown as object,
    autorId: session.id,
  };

  const doc = await prisma.visionSemanal.upsert({
    where: { area_semana: { area, semana } },
    create: { area, semana, ...data },
    update: data,
    include: { autor: { select: { id: true, name: true } } },
  });

  await logActividad(
    session.id,
    "EDITAR",
    "vision-semanal",
    doc.id,
    `Actualizó la Visión semanal de ${VISION_CONFIG[area].label} (${semana})`
  );

  return NextResponse.json({
    ok: true,
    documento: {
      enfoque: doc.enfoque,
      entregaInfo: doc.entregaInfo,
      desbloqueo: doc.desbloqueo,
      comentarios: doc.comentarios,
      extra: doc.extra,
      autor: doc.autor,
      actualizadoEn: doc.updatedAt.toISOString(),
    },
  });
}
