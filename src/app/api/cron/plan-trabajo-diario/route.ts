import { NextRequest, NextResponse } from "next/server";
import { generarTareasDelDia } from "@/lib/plan-trabajo/motor";

// Vercel Cron: runs daily at 07:00 UTC = 01:00 AM America/Mexico_City
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Genera las Tarea (tipoOrigen="PLAN") del día. El vencimiento se calcula
  // dinámicamente desde fechaVencimiento, ya no se marca estado VENCIDA.
  const generadas = await generarTareasDelDia(new Date());

  return NextResponse.json({ ok: true, generadas });
}
