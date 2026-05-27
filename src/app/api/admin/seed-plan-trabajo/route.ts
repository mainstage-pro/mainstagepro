import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { seedPlanTrabajo } from "@/../prisma/seeds/run-plan-trabajo";

// POST /api/admin/seed-plan-trabajo — solo ADMIN
export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  try {
    const resultado = await seedPlanTrabajo();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[seed-plan-trabajo]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
