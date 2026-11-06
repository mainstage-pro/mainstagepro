import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { cierreDiarioEnVivo, guardarCierreDiario, historialCierres } from "@/lib/resumen/cierre-diario";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [hoy, historial] = await Promise.all([cierreDiarioEnVivo(), historialCierres()]);
  return NextResponse.json({ hoy, historial });
}

// Dispara manualmente un cierre fuera del cron L/M/V (ej. antes de un fin de semana largo).
export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cierre = await guardarCierreDiario(session.id);
  return NextResponse.json({ ok: true, cierre });
}
