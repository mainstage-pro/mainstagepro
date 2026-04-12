import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { computarTareasIntegradas } from "@/lib/tareas-integradas";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tareas = await computarTareasIntegradas();
  return NextResponse.json({ tareas, generadoEn: new Date().toISOString() });
}
