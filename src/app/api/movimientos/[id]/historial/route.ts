import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getHistorialMovimiento } from "@/lib/auditoria-movimiento";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  return NextResponse.json({ historial: await getHistorialMovimiento(id) });
}
