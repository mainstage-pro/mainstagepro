import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/plan-trabajo/kpis
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const kpis = await prisma.pTKPI.findMany({ orderBy: [{ esTransversal: "asc" }, { areaId: "asc" }, { orden: "asc" }] });
  return NextResponse.json({ kpis });
}

// POST /api/plan-trabajo/kpis
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const kpi = await prisma.pTKPI.create({ data: body });
  return NextResponse.json({ kpi });
}
