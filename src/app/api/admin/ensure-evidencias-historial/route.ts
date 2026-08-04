import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Token de un solo uso para forzar/verificar la creación desde curl sin sesión.
// La operación es idempotente (ADD COLUMN IF NOT EXISTS) y no expone datos.
// Borrar este endpoint tras confirmar.
const ONE_TIME_TOKEN = "evh-2026-08-04-fix";

// Endpoint manual: agrega la columna `evidenciasHistorial` a la BD real de
// producción usando el driver HTTP de Neon (el pooler de Prisma NO aplica DDL de
// forma fiable, ni desde local ni desde el runtime de Vercel). Sirve también para
// verificar que la columna quedó creada. Borrar tras confirmar.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token !== ONE_TIME_TOKEN) {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const out: Record<string, unknown> = {};
  const raw = process.env.DATABASE_URL;
  if (!raw) return NextResponse.json({ error: "Sin DATABASE_URL" }, { status: 500 });

  // El driver HTTP de Neon no acepta los parámetros del pooler.
  const url = raw
    .replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "");

  try {
    const sql = neon(url);
    await sql.query(`ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "evidenciasHistorial" TEXT`);
    out.alter = "ok";
    const rows = await sql.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'tareas' AND column_name = 'evidenciasHistorial'`,
    );
    out.columnaPresente = rows.length > 0;
  } catch (e) {
    out.alter = "error";
    out.alterError = (e as Error).message;
  }

  return NextResponse.json(out);
}
