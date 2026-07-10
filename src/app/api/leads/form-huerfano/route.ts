import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ensureFormularioLeadTable } from "@/lib/formulario-lead";
import { randomUUID } from "crypto";

/**
 * POST /api/leads/form-huerfano
 *
 * Genera un link de descubrimiento SIN trato previo. El cliente lo llena y al
 * enviarse se coteja/crea el Cliente y se crea el Trato en el pipeline.
 *
 * Body (opcional): { origenLead, tipoServicio, tipoEvento, momentoSugerido, responsableId }
 * Respuesta: { token, url }
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureFormularioLeadTable();

  const body = await req.json().catch(() => ({}));
  const token = randomUUID();

  await prisma.formularioLead.create({
    data: {
      token,
      origenLead: body.origenLead || "META_ADS",
      tipoServicio: body.tipoServicio || null,
      tipoEvento: body.tipoEvento || null,
      momentoSugerido: body.momentoSugerido || null,
      responsableId: body.responsableId || session.id,
    },
  });

  return NextResponse.json({ token, url: `/f/${token}` });
}
