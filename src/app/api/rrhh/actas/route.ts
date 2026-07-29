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
  const ambito = searchParams.get("ambito");
  const proyectoId = searchParams.get("proyectoId");
  const where: Record<string, unknown> = {};
  if (personalId) where.personalId = personalId;
  if (estado) where.estado = estado;
  if (ambito) where.ambito = ambito;
  if (proyectoId) where.proyectoId = proyectoId;

  const actas = await prisma.actaAdministrativa.findMany({
    where,
    orderBy: { fecha: "desc" },
    include: {
      personal: { select: { id: true, nombre: true, puesto: true } },
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true } },
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
  const { personalId, tipoId, fecha, hechos, evidenciaUrl, montoDescuento, consecuencia: consOverride, levantadaPor, proyectoId } = body;
  // Rama del acta: INTERNA (empleado) | EVENTO (técnico/staff de un proyecto de evento).
  const ambito: string = body.ambito === "EVENTO" ? "EVENTO" : "INTERNA";
  // El acta de evento puede apuntar a un freelance sin ficha interna: se captura por nombre.
  const personaNombreInput: string = (body.personaNombre ?? "").trim();

  if (!fecha || !hechos) {
    return NextResponse.json({ error: "Fecha y hechos son requeridos" }, { status: 400 });
  }
  // La interna exige colaborador; la de evento acepta ficha interna O nombre libre.
  if (ambito === "INTERNA" && !personalId) {
    return NextResponse.json({ error: "Selecciona al colaborador" }, { status: 400 });
  }
  if (ambito === "EVENTO" && !personalId && !personaNombreInput) {
    return NextResponse.json({ error: "Indica quién (colaborador o nombre del técnico)" }, { status: 400 });
  }

  const [personal, tipo] = await Promise.all([
    personalId
      ? prisma.personalInterno.findUnique({ where: { id: personalId }, select: { id: true, puestoId: true, nombre: true } })
      : Promise.resolve(null),
    tipoId ? prisma.tipoIncidencia.findUnique({ where: { id: tipoId } }) : Promise.resolve(null),
  ]);
  if (personalId && !personal) return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });

  // Snapshot del nombre: de la ficha interna si existe, si no el nombre capturado.
  const personaNombre = personal?.nombre ?? (personaNombreInput || null);

  const fechaDate = new Date(String(fecha) + "T12:00:00");
  const gravedad: Gravedad = (tipo?.gravedad as Gravedad) ?? (body.gravedad as Gravedad) ?? "LEVE";
  // El escalón de reincidencia solo aplica a personas con ficha interna.
  const nivelEscalon = personalId ? await calcularNivelEscalon(personalId, fechaDate) : 1;
  const consecuencia: string = (consOverride && String(consOverride).trim())
    || sugerirConsecuencia(gravedad, nivelEscalon);
  const folio = await siguienteFolio(fechaDate);
  const token = createExpiringToken(365);
  const monto = typeof montoDescuento === "number" && montoDescuento > 0 ? montoDescuento : null;

  // Si hay descuento, se genera una Incidencia PROPUESTA ligada para que impacte nómina.
  // Solo aplica a personal interno (nómina); las actas de evento a freelance no descuentan.
  let incidenciaId: string | null = null;
  if (monto && tipoId && personalId) {
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
      ambito,
      personalId: personalId ?? null,
      personaNombre,
      proyectoId: ambito === "EVENTO" ? (proyectoId ?? null) : null,
      tipoId: tipoId ?? null,
      puestoId: personal?.puestoId ?? null,
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
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true } },
      tipo: { select: { id: true, nombre: true, codigo: true, categoria: true } },
    },
  });
  return NextResponse.json({ acta }, { status: 201 });
}
