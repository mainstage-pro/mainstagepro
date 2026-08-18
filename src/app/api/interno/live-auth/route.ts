import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";

/**
 * Endpoint interno para Mainstage Live.
 *
 * Desde 2026-08-18 Live vive en su propio proyecto de Neon (separado de Pro
 * para que ninguna operación sobre la BD de Live pueda volver a tocar datos
 * de producción de Pro — ver incidente del reset de Live). Antes, Live leía
 * `public.users` con SQL cross-schema directo contra la misma BD; ahora que
 * las BDs están separadas, este endpoint es el único puente entre las dos
 * plataformas. Protegido por secreto compartido (`LIVE_INTERNAL_SECRET`),
 * mismo patrón que CRON_SECRET/ADMIN_SECRET.
 *
 * NUNCA devuelve el hash de password — la verificación ocurre aquí mismo,
 * del lado de Pro.
 */

function autorizado(req: NextRequest) {
  const secret = process.env.LIVE_INTERNAL_SECRET;
  if (!secret) return false;
  return req.headers.get("x-interno-secret") === secret;
}

const SELECT_USUARIO = {
  id: true,
  name: true,
  email: true,
  role: true,
  area: true,
  active: true,
} as const;

export async function POST(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (body.action === "login") {
    const { email, password } = body as { email?: string; password?: string };
    if (!email || !password) {
      return NextResponse.json({ error: "Faltan email/password" }, { status: 400 });
    }
    const usuario = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, active: true },
      select: { ...SELECT_USUARIO, password: true },
    });
    if (!usuario) return NextResponse.json({ usuario: null });
    const ok = await verifyPassword(password, usuario.password);
    if (!ok) return NextResponse.json({ usuario: null });
    const { password: _password, ...safe } = usuario;
    return NextResponse.json({ usuario: safe });
  }

  if (body.action === "usuario") {
    const { id } = body as { id?: string };
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
    const usuario = await prisma.user.findFirst({
      where: { id, active: true },
      select: SELECT_USUARIO,
    });
    return NextResponse.json({ usuario: usuario ?? null });
  }

  if (body.action === "listar") {
    const usuarios = await prisma.user.findMany({
      where: { active: true },
      select: SELECT_USUARIO,
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ usuarios });
  }

  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
}
