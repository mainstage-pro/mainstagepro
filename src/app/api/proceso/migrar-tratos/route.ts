import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ensureProcesoTablas, ensureSeguimientoColumns, ensureProcesoVentaColumns } from "@/lib/migraciones-lazy";
import { migrarTratos } from "@/lib/proceso/migracion";

// Migración de los tratos existentes al nuevo proceso comercial. Solo ADMIN.
// Dry-run por defecto: escribe únicamente si el body trae { commit: true }.
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await Promise.all([ensureProcesoTablas(), ensureSeguimientoColumns(), ensureProcesoVentaColumns()]);

  let commit = false;
  try {
    const body = await req.json();
    commit = body?.commit === true;
  } catch { /* sin body → dry-run */ }

  const reporte = await migrarTratos({ commit });
  return NextResponse.json({ ok: true, ...reporte });
}
