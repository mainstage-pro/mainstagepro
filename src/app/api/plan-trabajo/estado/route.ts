import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CONFIG_KEY = "plan_trabajo_activo";

// GET /api/plan-trabajo/estado
// Interruptor maestro: si no hay fila en AppConfig se asume activo=true.
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const config = await prisma.appConfig.findUnique({ where: { key: CONFIG_KEY } });
  const activo = config ? config.value === "true" : true;
  return NextResponse.json({ activo });
}

// POST /api/plan-trabajo/estado  Body: { activo: boolean }
// Pausar (activo=false) detiene el motor (src/lib/plan-trabajo/motor.ts) sin tocar
// la configuración de recurrencia de cada plantilla, y cancela de inmediato las
// tareas tipoOrigen=PLAN que ya estaban PENDIENTE/EN_PROGRESO (deja de contar en
// Rendimiento). Reactivar NO resucita esas tareas canceladas: el motor genera
// ocurrencias frescas para los días vigentes la próxima vez que corra.
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.activo !== "boolean") {
    return NextResponse.json({ error: "Falta 'activo' (boolean)" }, { status: 400 });
  }

  await prisma.appConfig.upsert({
    where: { key: CONFIG_KEY },
    create: {
      key: CONFIG_KEY,
      value: String(body.activo),
      section: "plan-trabajo",
      label: "Plan de trabajo activo",
      type: "boolean",
    },
    update: { value: String(body.activo) },
  });

  let canceladas = 0;
  if (!body.activo) {
    const resultado = await prisma.tarea.updateMany({
      where: { tipoOrigen: "PLAN", estado: { in: ["PENDIENTE", "EN_PROGRESO"] } },
      data: { estado: "CANCELADA" },
    });
    canceladas = resultado.count;
  }

  return NextResponse.json({ ok: true, activo: body.activo, canceladas });
}
