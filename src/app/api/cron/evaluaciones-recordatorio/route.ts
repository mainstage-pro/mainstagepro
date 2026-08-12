import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cron/evaluaciones-recordatorio — corre el día 5 (Vercel Cron "0 9 5 * *").
// Recuerda a cada evaluador las evaluaciones del mes anterior que siguen en BORRADOR.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ahora = new Date();
  const prev = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const mesGenerado = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

  const pendientes = await prisma.evaluacionEmpleado.findMany({
    where: { mesGenerado, estado: "BORRADOR" },
    include: { personal: { select: { nombre: true, puestoRef: { select: { reportaAId: true } } } } },
  });

  // Agrupa por evaluador (titular del puesto "Reporta a").
  const porJefe = new Map<string, number>();
  for (const e of pendientes) {
    const jefePuestoId = e.personal?.puestoRef?.reportaAId;
    if (!jefePuestoId) continue;
    porJefe.set(jefePuestoId, (porJefe.get(jefePuestoId) ?? 0) + 1);
  }

  let notificados = 0;
  for (const [jefePuestoId, n] of porJefe) {
    const jefe = await prisma.personalInterno.findFirst({
      where: { puestoId: jefePuestoId, activo: true, NOT: { userId: null } },
      select: { userId: true },
    });
    if (!jefe?.userId) continue;
    await prisma.notificacion.create({
      data: {
        usuarioId: jefe.userId,
        tipo: "SISTEMA",
        titulo: "Evaluaciones pendientes de cerrar",
        mensaje: `Tienes ${n} evaluación(es) del mes anterior en borrador. Ciérralas para que cuenten en el tablero de cumplimiento.`,
        url: "/rrhh/evaluaciones",
      },
    });
    notificados++;
  }

  return NextResponse.json({ ok: true, mes: mesGenerado, pendientes: pendientes.length, notificados });
}
