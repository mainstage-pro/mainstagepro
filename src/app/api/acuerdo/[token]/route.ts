import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTokenExpired } from "@/lib/tokens";
import { ensureDocLaboralSchema, type DocLaboralSnapshot } from "@/lib/documentos-laborales";

// Acuse público del acuerdo laboral por enlace con token. Sin autenticación:
// el colaborador confirma que lo leyó y quedó enterado de sus responsabilidades.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await ensureDocLaboralSchema();
  const doc = await prisma.documentoLaboral.findUnique({ where: { token } });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  if (isTokenExpired(token)) return NextResponse.json({ error: "El enlace expiró" }, { status: 410 });

  let snapshot: DocLaboralSnapshot;
  try { snapshot = JSON.parse(doc.datos); }
  catch { return NextResponse.json({ error: "Documento inválido" }, { status: 500 }); }

  return NextResponse.json({
    acuerdo: {
      tipo: doc.tipo,
      snapshot,
      aceptado: doc.aceptado,
      aceptadoNombre: doc.aceptadoNombre,
      aceptadoEn: doc.aceptadoEn,
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await ensureDocLaboralSchema();
  const body = await req.json().catch(() => ({}));
  const nombre: string = (body.nombre ?? "").trim();
  if (!nombre) return NextResponse.json({ error: "Escribe tu nombre para firmar" }, { status: 400 });

  const doc = await prisma.documentoLaboral.findUnique({ where: { token }, select: { id: true, aceptado: true } });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  if (isTokenExpired(token)) return NextResponse.json({ error: "El enlace expiró" }, { status: 410 });
  if (doc.aceptado) return NextResponse.json({ ok: true, yaAceptado: true });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await prisma.documentoLaboral.update({
    where: { id: doc.id },
    data: { aceptado: true, aceptadoNombre: nombre, aceptadoEn: new Date(), aceptadoIp: ip },
  });
  return NextResponse.json({ ok: true });
}
