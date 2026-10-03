// Los anexos del rider: stage plots, patches y planos.
//
// El binario NO pasa por aquí: sube del navegador directo a Vercel Blob con
// /api/upload/token y este endpoint solo registra la metadata. Un stage plot
// escaneado de 20 MB no cabe en el límite de las funciones serverless.
//
// `incluirEnPdf` es lo que decide si el anexo se imprime con el rider: hay planos
// de trabajo que sirven internamente y no se mandan a la casa.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { TIPOS_ARCHIVO_RIDER } from "@/lib/giras";

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;

  const archivos = await prisma.artistaRiderArchivo.findMany({
    where: { riderId },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ archivos });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;
  const body = await req.json().catch(() => ({}));

  const rider = await prisma.artistaRider.findUnique({ where: { id: riderId }, select: { id: true } });
  if (!rider) return NextResponse.json({ error: "Rider no encontrado" }, { status: 404 });

  const url = texto(body.url);
  if (!url) return NextResponse.json({ error: "Falta la URL del archivo" }, { status: 400 });

  const tipo =
    typeof body.tipo === "string" && (TIPOS_ARCHIVO_RIDER as readonly string[]).includes(body.tipo)
      ? body.tipo
      : "STAGE_PLOT";

  const tamanoBytes =
    typeof body.tamanoBytes === "number" && Number.isFinite(body.tamanoBytes) && body.tamanoBytes > 0
      ? Math.round(body.tamanoBytes)
      : null;

  const ultimo = await prisma.artistaRiderArchivo.findFirst({
    where: { riderId },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  const archivo = await prisma.artistaRiderArchivo.create({
    data: {
      riderId,
      nombre: texto(body.nombre) ?? url.split("/").pop() ?? "Anexo",
      url,
      tipo,
      mime: texto(body.mime),
      tamanoBytes,
      incluirEnPdf: body.incluirEnPdf !== false,
      notas: texto(body.notas),
      orden: (ultimo?.orden ?? -1) + 1,
    },
  });

  return NextResponse.json({ archivo });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;
  const body = await req.json().catch(() => ({}));

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Falta el id del anexo" }, { status: 400 });

  const actual = await prisma.artistaRiderArchivo.findFirst({ where: { id, riderId }, select: { id: true } });
  if (!actual) return NextResponse.json({ error: "Anexo no encontrado" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if ("nombre" in body) {
    const n = texto(body.nombre);
    if (!n) return NextResponse.json({ error: "El anexo necesita nombre" }, { status: 400 });
    data.nombre = n;
  }
  if ("tipo" in body && (TIPOS_ARCHIVO_RIDER as readonly string[]).includes(body.tipo)) data.tipo = body.tipo;
  if ("notas" in body) data.notas = texto(body.notas);
  if ("incluirEnPdf" in body) data.incluirEnPdf = body.incluirEnPdf === true;
  if ("orden" in body) {
    const n = Number(body.orden);
    if (Number.isFinite(n)) data.orden = Math.trunc(n);
  }

  const archivo = await prisma.artistaRiderArchivo.update({ where: { id }, data });
  return NextResponse.json({ archivo });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;

  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Falta el id del anexo" }, { status: 400 });

  const actual = await prisma.artistaRiderArchivo.findFirst({ where: { id, riderId }, select: { id: true } });
  if (!actual) return NextResponse.json({ error: "Anexo no encontrado" }, { status: 404 });

  // El blob se queda: otra versión del rider pudo clonar el mismo anexo.
  await prisma.artistaRiderArchivo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
