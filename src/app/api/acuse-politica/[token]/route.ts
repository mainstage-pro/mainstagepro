import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTokenExpired } from "@/lib/tokens";
import { renderMarkdown } from "@/lib/markdown";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "El enlace ha expirado" }, { status: 410 });
  const acuse = await prisma.politicaAcuse.findUnique({ where: { token } });
  if (!acuse) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  const politica = await prisma.politica.findUnique({ where: { id: acuse.politicaId } });
  if (!politica) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  // Mostrar el contenido de la versión que se pidió firmar (snapshot si existe).
  const version = await prisma.politicaVersion.findFirst({
    where: { politicaId: politica.id, version: acuse.version },
  });
  const contenido = version?.contenido ?? politica.contenido;

  return NextResponse.json({
    titulo: version?.titulo ?? politica.titulo,
    categoria: politica.categoria,
    version: acuse.version,
    html: renderMarkdown(contenido),
    aceptado: acuse.aceptado,
    aceptadoNombre: acuse.aceptadoNombre,
    aceptadoEn: acuse.aceptadoEn,
    personalNombre: acuse.personalNombre,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "El enlace ha expirado" }, { status: 410 });
  const acuse = await prisma.politicaAcuse.findUnique({ where: { token } });
  if (!acuse) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  if (acuse.aceptado) return NextResponse.json({ error: "Este documento ya fue firmado" }, { status: 409 });

  const b = await req.json().catch(() => ({}));
  const nombre = typeof b.nombre === "string" ? b.nombre.trim() : "";
  if (!nombre) return NextResponse.json({ error: "El nombre completo es requerido" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const updated = await prisma.politicaAcuse.update({
    where: { token },
    data: { aceptado: true, aceptadoNombre: nombre, aceptadoEn: new Date(), aceptadoIp: ip },
  });
  return NextResponse.json({ ok: true, aceptadoEn: updated.aceptadoEn });
}
