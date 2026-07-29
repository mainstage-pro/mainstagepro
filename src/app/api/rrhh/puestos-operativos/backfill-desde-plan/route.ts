import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generarBorradorDesdePlan } from "@/lib/puesto-generador";

export const maxDuration = 300;

// Backfill masivo: recorre los puestos con titular y les genera un borrador de
// misión/responsabilidades/estándares desde el plan de trabajo. NO destructivo:
// solo rellena campos vacíos; nunca sobrescribe contenido ya capturado.
// Guardado por sesión (admin en la UI) o por CRON_SECRET (disparo one-off).

export async function POST(req: NextRequest) {
  const session = await getSession();
  const auth = req.headers.get("authorization");
  const porCron = auth === `Bearer ${process.env.CRON_SECRET}`;
  if (!session && !porCron) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const puestos = await prisma.puesto.findMany({
    where: { activo: true, ocupantes: { some: { activo: true } } },
    select: { id: true, nombre: true, misionPuesto: true, responsabilidades: true, estandares: true, subAreaId: true },
    orderBy: { nombre: "asc" },
  });

  const resultados: {
    puesto: string;
    estado: "actualizado" | "sin_cambios" | "sin_datos" | "error";
    campos: string[];
    detalle?: string;
  }[] = [];

  for (const p of puestos) {
    try {
      const b = await generarBorradorDesdePlan(p.id);
      if (!b.ok) {
        resultados.push({ puesto: p.nombre, estado: "sin_datos", campos: [], detalle: b.mensaje });
        continue;
      }

      // Solo rellena lo que esté vacío. No sobrescribe nada capturado por el usuario.
      const data: Record<string, unknown> = {};
      const campos: string[] = [];
      if (!p.misionPuesto?.trim() && b.misionPuesto) { data.misionPuesto = b.misionPuesto; campos.push("misión"); }
      if (!tieneContenido(p.responsabilidades) && b.responsabilidades.length) {
        data.responsabilidades = JSON.stringify(b.responsabilidades); campos.push("responsabilidades");
      }
      if (!tieneContenido(p.estandares) && b.estandares.length) {
        data.estandares = JSON.stringify(b.estandares); campos.push("estándares");
      }
      if (!p.subAreaId && b.subAreaPrincipalId) { data.subAreaId = b.subAreaPrincipalId; campos.push("subárea"); }

      if (Object.keys(data).length === 0) {
        resultados.push({ puesto: p.nombre, estado: "sin_cambios", campos: [] });
        continue;
      }

      await prisma.puesto.update({ where: { id: p.id }, data });
      resultados.push({ puesto: p.nombre, estado: "actualizado", campos });
    } catch (e) {
      const detalle = e instanceof Error ? e.message : String(e);
      console.error(`[backfill-desde-plan] ${p.nombre}:`, detalle);
      resultados.push({ puesto: p.nombre, estado: "error", campos: [], detalle });
    }
  }

  const resumen = {
    total: resultados.length,
    actualizados: resultados.filter((r) => r.estado === "actualizado").length,
    sinCambios: resultados.filter((r) => r.estado === "sin_cambios").length,
    sinDatos: resultados.filter((r) => r.estado === "sin_datos").length,
    errores: resultados.filter((r) => r.estado === "error").length,
  };
  return NextResponse.json({ resumen, resultados });
}

function tieneContenido(json: string | null): boolean {
  if (!json?.trim()) return false;
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  } catch {
    return json.trim().length > 0;
  }
}
