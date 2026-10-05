import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, puedeVerificar } from "@/lib/auth";
import { ensureReembolsos, siguienteFolio } from "@/lib/reembolsos";

const INCLUDE = {
  solicitante: { select: { id: true, name: true } },
  revisadoPor: { select: { id: true, name: true } },
  categoria: { select: { id: true, nombre: true } },
  proyecto: { select: { id: true, nombre: true, numeroProyecto: true } },
  cuentaPagar: { select: { id: true, estado: true, monto: true, montoPagado: true, fechaCompromiso: true } },
} as const;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureReembolsos();

  // Quien no revisa solo ve lo suyo.
  const revisor = puedeVerificar(session);
  const solicitudes = await prisma.solicitudReembolso.findMany({
    where: revisor ? undefined : { solicitanteId: session.id },
    include: INCLUDE,
    orderBy: [{ estado: "asc" }, { fechaGasto: "desc" }],
  });

  return NextResponse.json({ solicitudes, puedeRevisar: revisor });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureReembolsos();
  const body = await req.json();

  const monto = parseFloat(body.monto);
  if (!body.concepto?.trim()) return NextResponse.json({ error: "Falta el concepto" }, { status: 400 });
  if (!monto || monto <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  if (!body.fechaGasto) return NextResponse.json({ error: "Falta la fecha del gasto" }, { status: 400 });

  const solicitud = await prisma.solicitudReembolso.create({
    data: {
      folio: await siguienteFolio(),
      solicitanteId: session.id,
      fechaGasto: new Date(body.fechaGasto),
      concepto: body.concepto.trim(),
      monto,
      categoriaId: body.categoriaId || null,
      proyectoId: body.proyectoId || null,
      comprobanteUrl: body.comprobanteUrl || null,
      notas: body.notas || null,
    },
    include: INCLUDE,
  });

  return NextResponse.json({ solicitud });
}
