import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTokenExpired } from "@/lib/tokens";
import type { DocLaboralSnapshot } from "@/lib/documentos-laborales";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "El enlace ha expirado" }, { status: 410 });
  const doc = await prisma.documentoLaboral.findUnique({ where: { token } });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  const snapshot = JSON.parse(doc.datos) as DocLaboralSnapshot;
  return NextResponse.json({
    tipo: doc.tipo,
    aceptado: doc.aceptado,
    aceptadoNombre: doc.aceptadoNombre,
    aceptadoEn: doc.aceptadoEn,
    snapshot,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "El enlace ha expirado" }, { status: 410 });
  const doc = await prisma.documentoLaboral.findUnique({ where: { token } });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  if (doc.aceptado) return NextResponse.json({ error: "Este documento ya fue aceptado" }, { status: 409 });

  const b = await req.json().catch(() => ({}));
  const nombre = typeof b.nombre === "string" ? b.nombre.trim() : "";
  if (!nombre) return NextResponse.json({ error: "El nombre completo es requerido" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const updated = await prisma.documentoLaboral.update({
    where: { token },
    data: { aceptado: true, aceptadoNombre: nombre, aceptadoEn: new Date(), aceptadoIp: ip },
  });
  return NextResponse.json({ ok: true, aceptadoEn: updated.aceptadoEn });
}
