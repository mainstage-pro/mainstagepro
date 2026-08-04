import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Diagnóstico temporal (token de un solo uso). Borrar tras usar.
// 1) Lista las columnas reales de `tareas` en la BD viva (neon HTTP con el
//    DATABASE_URL del runtime).
// 2) Ejecuta el MISMO SELECT del GET /api/tareas/[id] para ver si Prisma truena
//    por una columna faltante (P2022) o cualquier otra causa.
const ONE_TIME_TOKEN = "diag-2026-08-04";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== ONE_TIME_TOKEN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const out: Record<string, unknown> = {};

  // (1) columnas reales
  try {
    const raw = process.env.DATABASE_URL!;
    const url = raw
      .replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "")
      .replace(/\?&/, "?")
      .replace(/\?$/, "");
    const sql = neon(url);
    const cols = await sql.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'tareas' ORDER BY column_name`,
    );
    out.columnas = (cols as { column_name: string }[]).map((c) => c.column_name);
  } catch (e) {
    out.columnasError = (e as Error).message;
  }

  // (2) query real del GET para un id de muestra
  const sampleId = req.nextUrl.searchParams.get("id");
  try {
    const tarea = await prisma.tarea.findFirst({
      where: sampleId ? { id: sampleId } : { estado: { not: "CANCELADA" } },
      select: {
        id: true, titulo: true, evidenciasHistorial: true, tipoOrigen: true,
        requiereEvidencia: true, tipoEvidencia: true, evidenciaNota: true,
        estadoVerificacion: true, motivoRechazo: true, evidenciaEnviadaAt: true,
        evidenciaEnviadaCanal: true, noRealizada: true, motivoNoRealizada: true,
        justificacionNoRealizada: true, porqueSeHace: true, estandarMinimo: true,
        siNoSeHace: true, cuando: true, moduloDestino: true, moduloTexto: true,
        moduloDisponible: true, esAccionCampo: true, tratoId: true,
        subtareas: { select: { id: true } },
        comentarios: { select: { id: true } },
        archivos: { select: { id: true } },
        colaboradores: { select: { usuario: { select: { id: true } } } },
      },
    });
    out.queryOk = true;
    out.tareaId = tarea?.id ?? null;
  } catch (e) {
    out.queryOk = false;
    out.queryError = (e as Error).message;
  }

  return NextResponse.json(out);
}
