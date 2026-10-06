import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";

export const dynamic = "force-dynamic";

const SELECT_PLOT = {
  id: true,
  nombre: true,
  anchoM: true,
  largoM: true,
  alturaM: true,
  layout: true,
  notas: true,
  orden: true,
  updatedAt: true,
} as const;

/**
 * Las medidas del escenario del venue vienen como texto libre ("10 x 8 m, 1.2 m de
 * alto"). El editor necesita números, así que al sembrar el primer stage plot se
 * intentan leer; si no se pueden, quedan vacías y se capturan a mano en la plaza.
 */
function parsearMedidas(texto: string | null): { anchoM: number | null; largoM: number | null } {
  if (!texto) return { anchoM: null, largoM: null };
  const m = texto.match(/(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/i);
  if (!m) return { anchoM: null, largoM: null };
  const a = parseFloat(m[1].replace(",", "."));
  const b = parseFloat(m[2].replace(",", "."));
  return {
    anchoM: Number.isFinite(a) && a > 0 && a < 200 ? a : null,
    largoM: Number.isFinite(b) && b > 0 && b < 200 ? b : null,
  };
}

type Params = { params: Promise<{ showId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const plots = await prisma.showStagePlot.findMany({
    where: { showId },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    select: SELECT_PLOT,
  });

  return NextResponse.json({ plots });
}

/**
 * Un stage plot nuevo para esta fecha. El primero nace con las medidas que el venue
 * tenga capturadas —editables, no heredadas de solo lectura: cada plaza monta
 * distinto y lo que manda es lo que se mide en sitio.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { id: true, venue: { select: { medidasEscenario: true, alturaRejaM: true } } },
  });
  if (!show) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const existentes = await prisma.showStagePlot.count({ where: { showId } });

  const semilla =
    existentes === 0
      ? parsearMedidas(show.venue?.medidasEscenario ?? null)
      : { anchoM: null, largoM: null };

  function numero(v: unknown, fallback: number | null) {
    if (v === undefined || v === null || v === "") return fallback;
    const n = parseFloat(String(v));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  const plot = await prisma.showStagePlot.create({
    data: {
      showId,
      nombre:
        typeof body.nombre === "string" && body.nombre.trim()
          ? body.nombre.trim()
          : existentes === 0
            ? "Stage plot"
            : `Stage plot ${existentes + 1}`,
      anchoM: numero(body.anchoM, semilla.anchoM),
      largoM: numero(body.largoM, semilla.largoM),
      alturaM: numero(body.alturaM, null),
      notas: typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null,
      orden: existentes * 10,
    },
    select: SELECT_PLOT,
  });

  await logActividad(
    session.id,
    "CREAR",
    "ShowStagePlot",
    plot.id,
    `Agregó el stage plot «${plot.nombre}» a la fecha`,
    { showId },
  );

  return NextResponse.json({ plot }, { status: 201 });
}
