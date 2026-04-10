import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [accesos, users] = await Promise.all([
    prisma.moduloAcceso.findMany({
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ accesos, users });
}
