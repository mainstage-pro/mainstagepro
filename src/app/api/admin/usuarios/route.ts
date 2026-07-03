import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let isAuthorized = session.role === "ADMIN";
  if (!isAuthorized) {
    const hasModule = await prisma.moduloAcceso.findFirst({ where: { userId: session.id, moduloKey: "admin-usuarios" } });
    if (hasModule) isAuthorized = true;
  }
  if (!isAuthorized) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, area: true, active: true, createdAt: true,
      moduloAccesos: { select: { moduloKey: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let isAuthorized = session.role === "ADMIN";
  if (!isAuthorized) {
    const hasModule = await prisma.moduloAcceso.findFirst({ where: { userId: session.id, moduloKey: "admin-usuarios" } });
    if (hasModule) isAuthorized = true;
  }
  if (!isAuthorized) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name, email, password, role, area } = await req.json();

  const pwd = password || (session.role === "ADMIN" ? "" : "Temporal2026!");

  if (!name || !email || !pwd) {
    return NextResponse.json({ error: "Nombre, correo y contraseña son obligatorios" }, { status: 400 });
  }
  if (pwd.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "Ya existe un usuario con ese correo" }, { status: 400 });
  }

  const hashed = await hashPassword(pwd);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role ?? "USER", area: area ?? "GENERAL" },
    select: { id: true, name: true, email: true, role: true, area: true, active: true, createdAt: true },
  });

  return NextResponse.json({ user });
}
