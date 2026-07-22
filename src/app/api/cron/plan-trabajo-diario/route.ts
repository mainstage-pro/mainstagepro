import { NextRequest, NextResponse } from "next/server";

// DESACTIVADO: el motor de "plan de trabajo" ya no genera tareas en el módulo de
// operaciones. Este cron se retiró de vercel.json y queda como no-op para que,
// aunque alguien lo dispare manualmente, no vuelva a inundar la bandeja.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, generadas: 0, desactivado: true });
}
