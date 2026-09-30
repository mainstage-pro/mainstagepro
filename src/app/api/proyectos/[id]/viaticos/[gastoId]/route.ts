import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { montoDeFila } from "@/lib/viaticos-proyecto";

/**
 * Un renglón de comidas y viáticos: se corrige el desglose, se autoriza el dinero y se
 * marca cuándo salió de caja.
 *
 * Autorizar es de ADMIN: es la firma que libera el efectivo, y de ella depende que el
 * gasto entre a los reportes financieros. Corregir el renglón lo puede hacer quien
 * coordina, porque es el que sabe cuánta gente va.
 */

const CAMPOS_TEXTO = ["tipo", "concepto", "modalidad", "responsable", "notas"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; gastoId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, gastoId } = await params;
  const body = await req.json();

  const actual = await prisma.gastoOperativo.findFirst({ where: { id: gastoId, proyectoId: id } });
  if (!actual) return NextResponse.json({ error: "Renglón no encontrado" }, { status: 404 });

  const data: Record<string, unknown> = {};

  for (const campo of CAMPOS_TEXTO) {
    if (body[campo] !== undefined) data[campo] = body[campo] || null;
  }
  if (data.concepto === null) data.concepto = actual.concepto;

  const desglose = {
    personas: body.personas !== undefined
      ? (body.personas === null || body.personas === "" ? null : parseInt(body.personas) || 0)
      : actual.personas,
    porDia: body.porDia !== undefined ? Math.max(1, parseInt(body.porDia) || 1) : actual.porDia,
    dias: body.dias !== undefined ? Math.max(1, parseInt(body.dias) || 1) : actual.dias,
    costoUnitario: body.costoUnitario !== undefined
      ? Math.max(0, parseFloat(body.costoUnitario) || 0)
      : actual.costoUnitario,
  };
  Object.assign(data, desglose);
  data.monto = montoDeFila(desglose);
  data.cantidad = Math.max(1, (desglose.personas ?? 1) * (desglose.porDia ?? 1));

  if (body.accion === "AUTORIZAR" || body.accion === "REVOCAR") {
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo dirección autoriza la salida del dinero" }, { status: 403 });
    }
    const autoriza = body.accion === "AUTORIZAR";
    data.autorizadoEn = autoriza ? new Date() : null;
    data.autorizadoPor = autoriza ? session.name || session.email : null;
    // Revocar la autorización echa para atrás la entrega: no hay dinero entregado sin
    // firma que lo respalde.
    if (!autoriza) {
      data.entregado = false;
      data.fechaEntrega = null;
    }
  }

  if (body.accion === "ENTREGAR" || body.accion === "DESHACER_ENTREGA") {
    const entrega = body.accion === "ENTREGAR";
    if (entrega && !actual.autorizadoEn && !data.autorizadoEn) {
      return NextResponse.json({ error: "Primero hay que autorizar el renglón" }, { status: 400 });
    }
    data.entregado = entrega;
    data.fechaEntrega = entrega ? new Date() : null;
  }

  const viatico = await prisma.gastoOperativo.update({ where: { id: gastoId }, data });

  if (body.accion) {
    await logActividad(
      session.id,
      body.accion,
      "viatico",
      gastoId,
      `${body.accion.toLowerCase()} · ${viatico.concepto} · ${viatico.monto}`,
      { proyectoId: id },
    );
  }

  return NextResponse.json({ viatico });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; gastoId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, gastoId } = await params;
  const actual = await prisma.gastoOperativo.findFirst({ where: { id: gastoId, proyectoId: id } });
  if (!actual) return NextResponse.json({ error: "Renglón no encontrado" }, { status: 404 });
  if (actual.entregado) {
    return NextResponse.json({ error: "El dinero ya se entregó: este renglón es historia" }, { status: 400 });
  }

  await prisma.gastoOperativo.delete({ where: { id: gastoId } });
  return NextResponse.json({ ok: true });
}
