import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let isAuthorized = session.role === "ADMIN";
  if (!isAuthorized) {
    const hasModule = await prisma.moduloAcceso.findFirst({ where: { userId: session.id, moduloKey: "admin-usuarios" } });
    if (hasModule) isAuthorized = true;
  }
  if (!isAuthorized) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.email !== undefined) data.email = body.email;
  if (body.role !== undefined) data.role = body.role;
  if (body.area !== undefined) data.area = body.area;
  if (body.active !== undefined) data.active = body.active;
  
  if (body.password) {
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo los administradores pueden cambiar contraseñas" }, { status: 403 });
    }
    if (body.password.length < 6) {
      return NextResponse.json({ error: "Mínimo 6 caracteres" }, { status: 400 });
    }
    data.password = await hashPassword(body.password);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, area: true, active: true, createdAt: true },
  });

  return NextResponse.json({ user });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let isAuthorized = session.role === "ADMIN";
  if (!isAuthorized) {
    const hasModule = await prisma.moduloAcceso.findFirst({ where: { userId: session.id, moduloKey: "admin-usuarios" } });
    if (hasModule) isAuthorized = true;
  }
  if (!isAuthorized) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // No permitir eliminar el propio usuario
  if (session.id === id) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
