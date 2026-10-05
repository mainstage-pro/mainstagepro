import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const plan = await prisma.sitePlan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json(plan);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as {
    nombre?: string;
    contenido?: string;
    notas?: string | null;
    fondoUrl?: string | null;
    fondoAncho?: number | null;
    fondoAlto?: number | null;
    escalaMPorPx?: number | null;
    direccionSitio?: string | null;
    norteGrados?: number | null;
    dibujadoPor?: string | null;
    responsableSitio?: string | null;
    clienteOPromotor?: string | null;
    capacidadSitio?: number | null;
    capacidadEvacuacion?: number | null;
  };

  // Campo por campo: el editor manda PATCH parciales cada pocos segundos y un
  // spread del body dejaría que un `undefined` de la pantalla borre el fondo.
  const data: Record<string, unknown> = {};
  if (typeof body.nombre === "string" && body.nombre.trim()) data.nombre = body.nombre.trim();
  if (typeof body.contenido === "string") data.contenido = body.contenido;
  if (body.notas !== undefined) data.notas = body.notas;
  if (body.fondoUrl !== undefined) data.fondoUrl = body.fondoUrl;
  if (body.fondoAncho !== undefined) data.fondoAncho = body.fondoAncho;
  if (body.fondoAlto !== undefined) data.fondoAlto = body.fondoAlto;
  if (body.escalaMPorPx !== undefined) data.escalaMPorPx = body.escalaMPorPx;

  for (const campo of [
    "direccionSitio",
    "norteGrados",
    "dibujadoPor",
    "responsableSitio",
    "clienteOPromotor",
    "capacidadSitio",
    "capacidadEvacuacion",
  ] as const) {
    if (body[campo] !== undefined) data[campo] = body[campo] === "" ? null : body[campo];
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true });

  await prisma.sitePlan.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.sitePlan.update({ where: { id }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
