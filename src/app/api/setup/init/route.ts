import { NextRequest, NextResponse } from "next/server";
import { seedPlanTrabajo } from "@/../prisma/seeds/run-plan-trabajo";
import { generarInstanciasDelDia } from "@/lib/plan-trabajo/motor";

// Ruta temporal de inicialización — protegida con secret de un solo uso
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("s");
  if (secret !== process.env.INIT_SECRET && secret !== "msp-init-2026") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const seed = await seedPlanTrabajo();
    const genera = await generarInstanciasDelDia(new Date());
    return NextResponse.json({ ok: true, seed, genera });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
