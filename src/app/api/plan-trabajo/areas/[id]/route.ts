import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/plan-trabajo/areas/[id] — update objetivo
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const { objetivo } = await req.json();
  const area = await prisma.pTArea.update({ where: { id }, data: { objetivo } });
  return NextResponse.json({ area });
}
