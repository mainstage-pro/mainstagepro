import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const riders = await prisma.artistaRider.findMany({
    where: { artistaId: id, activo: true },
    orderBy: { version: "desc" },
    include: { _count: { select: { canales: true, lineas: true } } },
  });

  return NextResponse.json({ riders });
}

/// Crea una versión del rider. Si se pide clonar, copia cabecera, canales y líneas
/// de la versión origen: una versión nueva casi siempre es "la anterior con cambios",
/// no una hoja en blanco.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const artista = await prisma.artista.findUnique({
    where: { id },
    select: { id: true, nombre: true },
  });
  if (!artista) return NextResponse.json({ error: "Artista no encontrado" }, { status: 404 });

  const ultima = await prisma.artistaRider.findFirst({
    where: { artistaId: id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (ultima?.version ?? 0) + 1;

  const origenId: string | null = body.clonarDeId || null;
  const origen = origenId
    ? await prisma.artistaRider.findFirst({
        where: { id: origenId, artistaId: id },
        include: { canales: true, lineas: true },
      })
    : null;
  if (origenId && !origen) {
    return NextResponse.json({ error: "Versión de origen no encontrada" }, { status: 404 });
  }

  const nombre: string =
    (typeof body.nombre === "string" && body.nombre.trim()) ||
    (origen ? `${origen.nombre} v${version}` : `Rider ${artista.nombre} v${version}`);

  const rider = await prisma.$transaction(async (tx) => {
    await tx.artistaRider.updateMany({
      where: { artistaId: id, esActivo: true },
      data: { esActivo: false },
    });

    const creado = await tx.artistaRider.create({
      data: {
        artistaId: id,
        nombre,
        version,
        esActivo: true,
        formacion: origen?.formacion ?? null,
        requerimientosGenerales: origen?.requerimientosGenerales ?? null,
        notasFoh: origen?.notasFoh ?? null,
        notasMonitoreo: origen?.notasMonitoreo ?? null,
        notasBackline: origen?.notasBackline ?? null,
        notasIluminacion: origen?.notasIluminacion ?? null,
        notasVideo: origen?.notasVideo ?? null,
        notasEnergia: origen?.notasEnergia ?? null,
        notasEscenario: origen?.notasEscenario ?? null,
        notasHospitalidad: origen?.notasHospitalidad ?? null,
        notasCrewRequerido: origen?.notasCrewRequerido ?? null,
        escenarioAnchoM: origen?.escenarioAnchoM ?? null,
        escenarioProfundoM: origen?.escenarioProfundoM ?? null,
        escenarioAlturaM: origen?.escenarioAlturaM ?? null,
        stagePlotUrl: origen?.stagePlotUrl ?? null,
        canalesMinimos: origen?.canalesMinimos ?? null,
        mixesMonitor: origen?.mixesMonitor ?? null,
        tiempoSoundcheckMin: origen?.tiempoSoundcheckMin ?? null,
        tiempoCambioMin: origen?.tiempoCambioMin ?? null,
      },
    });

    if (origen?.canales.length) {
      await tx.artistaRiderCanal.createMany({
        data: origen.canales.map((c) => ({
          riderId: creado.id,
          tipo: c.tipo,
          numero: c.numero,
          nombre: c.nombre,
          instrumento: c.instrumento,
          microfono: c.microfono,
          alternativas: c.alternativas,
          soporte: c.soporte,
          phantom: c.phantom,
          inserto: c.inserto,
          tipoSalida: c.tipoSalida,
          estereo: c.estereo,
          personaId: c.personaId,
          notas: c.notas,
        })),
      });
    }

    if (origen?.lineas.length) {
      await tx.artistaRiderLinea.createMany({
        data: origen.lineas.map((l) => ({
          riderId: creado.id,
          disciplina: l.disciplina,
          concepto: l.concepto,
          cantidad: l.cantidad,
          unidad: l.unidad,
          equipoId: l.equipoId,
          preferido: l.preferido,
          aceptables: l.aceptables,
          noAceptable: l.noAceptable,
          prioridad: l.prioridad,
          provistoPor: l.provistoPor,
          notas: l.notas,
          orden: l.orden,
        })),
      });
    }

    return creado;
  });

  return NextResponse.json({ rider });
}
