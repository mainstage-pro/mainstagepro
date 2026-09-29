import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { computarPendientes } from "@/lib/pendientes";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { pendientes, fallos, generadoEn } = await computarPendientes();
  return NextResponse.json({ tareas: pendientes, fallos, generadoEn });
}
