import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

// TEMPORARY endpoint - DELETE after use
export async function POST(req: NextRequest) {
  const { secret, email, newPassword } = await req.json();
  
  // Protect with SEED_SECRET
  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!email || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "Email y contraseña (min 6 chars) requeridos" }, { status: 400 });
  }

  const hashed = await hashPassword(newPassword);
  const user = await prisma.user.update({
    where: { email },
    data: { password: hashed },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ ok: true, user });
}
