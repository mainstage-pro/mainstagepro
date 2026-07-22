import { NextRequest, NextResponse } from "next/server";

// DESACTIVADO (Bloque 2): el plan de trabajo ahora genera Tarea (tipoOrigen="PLAN")
// vía /api/cron/plan-trabajo-diario + el motor. Este job basado en
// PlanTrabajoActividad quedó retirado. La tabla se conserva como archivo.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return NextResponse.json({ ok: true, disabled: true, generadas: 0, omitidas: 0 });
}
