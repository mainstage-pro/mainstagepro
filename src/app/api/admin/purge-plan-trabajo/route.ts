import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// TEMPORAL — purga una-sola-vez de las tareas generadas por el motor de "plan de
// trabajo" (ptTemplateId != null). Los compromisos hechos a mano (incluidos los
// recurrentes) tienen ptTemplateId = null y NO se tocan. Protegido por CRON_SECRET.
// Se elimina este archivo tras usarlo.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apply = new URL(req.url).searchParams.get("apply") === "1";
  const where = { ptTemplateId: { not: null } };

  const total = await prisma.tarea.count({ where });
  const conservados = await prisma.tarea.count({
    where: { tipoOrigen: "PLAN", ptTemplateId: null },
  });

  if (!apply) {
    return NextResponse.json({ dryRun: true, aPurgar: total, conservados });
  }

  const res = await prisma.tarea.deleteMany({ where });
  const restante = await prisma.tarea.count({ where });
  return NextResponse.json({ purgadas: res.count, restante, conservados });
}
