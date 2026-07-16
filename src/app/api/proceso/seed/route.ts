import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ensureProcesoTablas } from "@/lib/migraciones-lazy";
import { seedProceso } from "@/lib/proceso/seed";

// Siembra idempotente del estándar del proceso comercial. Solo ADMIN.
export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureProcesoTablas();
  const resumen = await seedProceso();
  return NextResponse.json({ ok: true, ...resumen });
}
