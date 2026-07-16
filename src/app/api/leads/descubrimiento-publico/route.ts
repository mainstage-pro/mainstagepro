import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureFormularioLeadTable } from "@/lib/formulario-lead";
import { randomUUID } from "crypto";

const TIPOS_EVENTO = new Set(["MUSICAL", "SOCIAL", "EMPRESARIAL", "OTRO"]);
const TIPOS_SERVICIO = new Set(["RENTA", "PRODUCCION_TECNICA", "DIRECCION_TECNICA"]);

/**
 * POST /api/leads/descubrimiento-publico
 *
 * Punto de entrada PÚBLICO (sin auth) al formulario de descubrimiento desde las
 * presentaciones de venta. Genera un link huérfano preconfigurado con el tipo de
 * evento (y opcionalmente el servicio) de la presentación donde está el prospecto,
 * y devuelve la URL `/f/{token}` a la que redirigir.
 *
 * Body: { tipoEvento, tipoServicio? }  Respuesta: { token, url }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const tipoEvento = TIPOS_EVENTO.has(body.tipoEvento) ? body.tipoEvento : "OTRO";
  const tipoServicio = TIPOS_SERVICIO.has(body.tipoServicio) ? body.tipoServicio : null;

  await ensureFormularioLeadTable();

  const token = randomUUID();
  await prisma.formularioLead.create({
    data: {
      token,
      origenLead: "ORGANICO",
      tipoEvento,
      tipoServicio,
      responsableId: null,
    },
  });

  return NextResponse.json({ token, url: `/f/${token}` });
}
