import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/plan-trabajo/subareas/[id] — update entregables
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const { entregables } = await req.json();
  if (!Array.isArray(entregables)) return NextResponse.json({ error: "entregables debe ser un array" }, { status: 400 });
  const subarea = await prisma.pTSubArea.update({ where: { id }, data: { entregables } });
  return NextResponse.json({ subarea });
}
