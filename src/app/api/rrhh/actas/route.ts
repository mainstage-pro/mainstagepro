import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createExpiringToken } from "@/lib/tokens";
import { ensureActasFaltas } from "@/lib/migraciones-lazy";
import {
  calcularNivelEscalon,
  siguienteFolio,
  sugerirConsecuencia,
  type Gravedad,
} from "@/lib/faltas";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureActasFaltas();

  const { searchParams } = new URL(req.url);
  const personalId = searchParams.get("personalId");
  const estado = searchParams.get("estado");
  const where: Record<string, unknown> = {};
  if (personalId) where.personalId = personalId;
  if (estado) where.estado = estado;

  const actas = await prisma.actaAdministrativa.findMany({
    where,
    orderBy: { fecha: "desc" },
    include: {
      personal: { select: { id: true, nombre: true, puesto: true } },
      tipo: { select: { id: true, nombre: true, codigo: true, categoria: true } },
    },
  });
  return NextResponse.json({ actas });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureActasFaltas();

  const body = await req.json();
  const { personalId, tipoId, fecha, hechos, evidenciaUrl, montoDescuento, consecuencia: consOverride, levantadaPor } = body;
  if (!personalId || !fecha || !hechos) {
    return NextResponse.json({ error: "Persona, fecha y hechos son requeridos" }, { status: 400 });
  }

  const [personal, tipo] = await Promise.all([
    prisma.personalInterno.findUnique({ where: { id: personalId }, select: { id: true, puestoId: true } }),
    tipoId ? prisma.tipoIncidencia.findUnique({ where: { id: tipoId } }) : Promise.resolve(null),
  ]);
  if (!personal) return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });

  const fechaDate = new Date(String(fecha) + "T12:00:00");
  const gravedad: Gravedad = (tipo?.gravedad as Gravedad) ?? (body.gravedad as Gravedad) ?? "LEVE";
  const nivelEscalon = await calcularNivelEscalon(personalId, fechaDate);
  const consecuencia: string = (consOverride && String(consOverride).trim())
    || sugerirConsecuencia(gravedad, nivelEscalon);
  const folio = await siguienteFolio(fechaDate);
  const token = createExpiringToken(365);
  const monto = typeof montoDescuento === "number" && montoDescuento > 0 ? montoDescuento : null;

  // Si hay descuento, se genera una Incidencia PROPUESTA ligada para que impacte nómina.
  let incidenciaId: string | null = null;
  if (monto && tipoId) {
    const mes = `${fechaDate.getFullYear()}-${String(fechaDate.getMonth() + 1).padStart(2, "0")}`;
    const inc = await prisma.incidencia.create({
      data: {
        personalId,
        tipoId,
        fecha: fechaDate,
        descripcion: `Acta ${folio}: ${String(hechos).slice(0, 200)}`,
        montoCalculado: monto,
        periodoNomina: mes,
        origen: "MANUAL",
        estado: "PROPUESTA",
        evidenciaUrl: evidenciaUrl ?? null,
      },
      select: { id: true },
    });
    incidenciaId = inc.id;
  }

  const acta = await prisma.actaAdministrativa.create({
    data: {
      folio,
      personalId,
      tipoId: tipoId ?? null,
      puestoId: personal.puestoId ?? null,
      gravedad,
      fecha: fechaDate,
      hechos,
      evidenciaUrl: evidenciaUrl ?? null,
      nivelEscalon,
      consecuencia,
      montoDescuento: monto,
      incidenciaId,
      levantadaPor: levantadaPor ?? session.name ?? null,
      token,
    },
    include: {
      personal: { select: { id: true, nombre: true, puesto: true } },
      tipo: { select: { id: true, nombre: true, codigo: true, categoria: true } },
    },
  });
  return NextResponse.json({ acta }, { status: 201 });
}
