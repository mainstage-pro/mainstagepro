import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPuestoSnapshot } from "@/lib/puesto";
import { loadPuestoKpis } from "@/lib/puesto-kpis";
import {
  computeResultados, competenciasDesdePuesto, estMinDesdePuesto,
  calcularEvaluacion, perfilPorcentaje,
} from "@/lib/puesto-evaluacion";
import { safeParseAcuerdos } from "@/lib/evaluaciones";

// GET /api/cron/evaluaciones-mensual — corre el día 1 (Vercel Cron "0 9 1 * *").
// Genera un BORRADOR de evaluación por cada colaborador con puesto asignado, evaluando
// el MES QUE ACABA DE TERMINAR. Congela el snapshot del puesto (§9), precarga los
// resultados automáticos (plan + KPIs), la checklist de estándares mínimos y el perfil
// a calificar, y arrastra los acuerdos abiertos del período anterior. Idempotente por mes.
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ahora = new Date();
  // Mes anterior (el que se evalúa).
  const prev = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const y = prev.getFullYear();
  const m = prev.getMonth(); // 0-based
  const mesGenerado = `${y}-${String(m + 1).padStart(2, "0")}`;
  const periodo = `${MESES[m].charAt(0).toUpperCase() + MESES[m].slice(1)} ${y}`;

  const personal = await prisma.personalInterno.findMany({
    where: { activo: true, NOT: { puestoId: null } },
    select: { id: true, nombre: true, userId: true, puestoId: true },
  });

  let creadas = 0;
  const notificados: string[] = [];

  for (const p of personal) {
    if (!p.puestoId) continue;
    // Idempotencia: no dupliques el mismo mes.
    const existe = await prisma.evaluacionEmpleado.findFirst({
      where: { personalId: p.id, mesGenerado },
      select: { id: true },
    });
    if (existe) continue;

    const puesto = await prisma.puesto.findUnique({ where: { id: p.puestoId } });
    if (!puesto) continue;

    const kpisDef = await loadPuestoKpis(puesto.id);
    const snapshot = buildPuestoSnapshot(puesto, kpisDef);
    const resultados = await computeResultados({ userId: p.userId, puestoId: puesto.id, mes: mesGenerado });
    const competencias = competenciasDesdePuesto(puesto);
    const estMin = estMinDesdePuesto(puesto);

    // Arrastra acuerdos abiertos del período previo (§7 bloque 5).
    const anterior = await prisma.evaluacionEmpleado.findFirst({
      where: { personalId: p.id },
      orderBy: { fecha: "desc" },
      select: { acuerdos: true },
    });
    const acuerdosAbiertos = safeParseAcuerdos(anterior?.acuerdos ?? null)
      .filter(a => a.estado === "PENDIENTE" || a.estado === "PARCIAL");

    // Cálculo provisional: sin perfil calificado aún (solo resultados objetivos).
    const perfilPct = perfilPorcentaje(competencias);
    const estMinFallidos = estMin.filter(e => e.cumple === false).length;
    const calc = calcularEvaluacion({
      planPct: resultados.planPct, kpiPct: resultados.kpiPct, perfilPct, estMinFallidos,
    });

    // Evaluador: titular del puesto "Reporta a".
    let evaluadorNombre: string | null = null;
    let evaluadorUserId: string | null = null;
    if (puesto.reportaAId) {
      const jefe = await prisma.personalInterno.findFirst({
        where: { puestoId: puesto.reportaAId, activo: true },
        select: { nombre: true, userId: true },
      });
      evaluadorNombre = jefe?.nombre ?? null;
      evaluadorUserId = jefe?.userId ?? null;
    }

    await prisma.evaluacionEmpleado.create({
      data: {
        personalId: p.id,
        periodo,
        mesGenerado,
        evaluador: evaluadorNombre,
        puestoId: puesto.id,
        puestoVersion: puesto.version,
        puestoSnapshot: JSON.stringify(snapshot),
        resultadosData: JSON.stringify(resultados),
        estandaresMinData: JSON.stringify(estMin),
        perfilCompetencias: JSON.stringify(competencias),
        calificacionCalculada: calc.label,
        acuerdos: acuerdosAbiertos.length ? JSON.stringify(acuerdosAbiertos) : null,
        estado: "BORRADOR",
      },
    });
    creadas++;

    if (evaluadorUserId) {
      await prisma.notificacion.create({
        data: {
          usuarioId: evaluadorUserId,
          tipo: "SISTEMA",
          titulo: `Evaluación pendiente — ${periodo}`,
          mensaje: `Se generó la evaluación de ${p.nombre} para ${periodo}. Los resultados ya están cargados; califica el perfil y ciérrala.`,
          url: "/rrhh/evaluaciones",
        },
      });
      notificados.push(evaluadorUserId);
    }
  }

  return NextResponse.json({ ok: true, mes: mesGenerado, periodo, creadas, notificados: notificados.length });
}
