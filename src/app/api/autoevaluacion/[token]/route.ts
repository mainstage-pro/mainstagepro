import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTokenExpired } from "@/lib/tokens";
import { METRICAS, safeParseObjetivos } from "@/lib/evaluaciones";

// Flujo público (sin login, por token) de la evaluación de un colaborador:
//  1) Autoevaluación 180°: antes de que dirección califique, el colaborador se autoevalúa.
//  2) Acuse de firma: cuando la evaluación queda COMPLETADA, el colaborador la firma.

function normAutoData(raw: unknown): {
  metricas: Record<string, number>;
  comentarios: Record<string, string>;
  logros: string;
  retos: string;
} {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const metricas: Record<string, number> = {};
  const comentarios: Record<string, string> = {};
  const mSrc = (src.metricas && typeof src.metricas === "object" ? src.metricas : {}) as Record<string, unknown>;
  const cSrc = (src.comentarios && typeof src.comentarios === "object" ? src.comentarios : {}) as Record<string, unknown>;
  for (const m of METRICAS) {
    const v = Math.max(0, Math.min(5, Math.round(Number(mSrc[m]) || 0)));
    if (v > 0) metricas[m] = v;
    const c = String(cSrc[m] ?? "").trim();
    if (c) comentarios[m] = c;
  }
  return {
    metricas,
    comentarios,
    logros: String(src.logros ?? "").trim(),
    retos: String(src.retos ?? "").trim(),
  };
}

async function findByToken(token: string) {
  if (isTokenExpired(token)) return null;
  return prisma.evaluacionEmpleado.findUnique({
    where: { autoToken: token },
    include: { personal: { select: { nombre: true, puesto: true } } },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ev = await findByToken(token);
  if (!ev) return NextResponse.json({ error: "Enlace inválido o expirado" }, { status: 404 });

  const completada = ev.estado === "COMPLETADA";
  return NextResponse.json({
    nombre: ev.personal.nombre,
    puesto: ev.personal.puesto,
    periodo: ev.periodo,
    autoEstado: ev.autoEstado,
    autoData: ev.autoData ? JSON.parse(ev.autoData) : null,
    completada,
    firmada: ev.firmada,
    firmadaNombre: ev.firmadaNombre,
    // Resultado visible solo cuando ya está cerrada, para el acuse de firma.
    resultado: completada
      ? {
          puntajeTotal: ev.puntajeTotal,
          calificacionFinal: ev.calificacionFinal,
          aspectosPositivos: ev.aspectosPositivos,
          areasMejora: ev.areasMejora,
          objetivos: safeParseObjetivos(ev.objetivos),
        }
      : null,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ev = await findByToken(token);
  if (!ev) return NextResponse.json({ error: "Enlace inválido o expirado" }, { status: 404 });

  const body = await req.json();
  const accion = body?.accion;

  if (accion === "autoevaluacion") {
    if (ev.autoEstado === "ENVIADA") return NextResponse.json({ error: "Ya enviaste tu autoevaluación" }, { status: 409 });
    const autoData = normAutoData(body.autoData);
    await prisma.evaluacionEmpleado.update({
      where: { id: ev.id },
      data: { autoData: JSON.stringify(autoData), autoEstado: "ENVIADA", autoEnviadaEn: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (accion === "firma") {
    if (ev.estado !== "COMPLETADA") return NextResponse.json({ error: "La evaluación aún no está cerrada" }, { status: 409 });
    const nombre = String(body.nombre ?? "").trim();
    if (!nombre) return NextResponse.json({ error: "Escribe tu nombre para firmar" }, { status: 400 });
    await prisma.evaluacionEmpleado.update({
      where: { id: ev.id },
      data: { firmada: true, firmadaNombre: nombre, firmadaEn: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
