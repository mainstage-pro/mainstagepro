import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generarInstanciasDelDia } from "@/lib/plan-trabajo/motor";

// POST /api/plan-trabajo/generar
// Body: { fecha?: "2026-05-27" } — si no viene fecha, usa hoy
// Solo ADMIN puede llamar esto manualmente
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "DIRECTOR"].includes(session.role ?? "")) {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const fecha = body.fecha ? new Date(body.fecha + "T12:00:00.000-06:00") : new Date();

  const resultado = await generarInstanciasDelDia(fecha);
  return NextResponse.json({ ok: true, ...resultado });
}
