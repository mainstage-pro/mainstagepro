import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CONTEXTOS_RIDER, leerSeccionesExtra } from "@/lib/giras";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const riders = await prisma.artistaRider.findMany({
    where: { artistaId: id, activo: true },
    orderBy: { version: "desc" },
    include: { _count: { select: { canales: true, lineas: true, contactos: true, archivos: true } } },
  });

  return NextResponse.json({ riders });
}

/// Crea una versión del rider. Si se pide clonar, copia cabecera, canales, líneas,
/// contactos y anexos de la versión origen: una versión nueva casi siempre es "la
/// anterior con cambios", no una hoja en blanco.
///
/// El contexto (tour, festival, privado…) es su propia línea de versiones: la
/// nueva queda vigente en SU contexto y apaga a la anterior de ese mismo contexto,
/// no a todas las del artista.
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
        include: { canales: true, lineas: true, contactos: true, archivos: true },
      })
    : null;
  if (origenId && !origen) {
    return NextResponse.json({ error: "Versión de origen no encontrada" }, { status: 404 });
  }

  // El contexto pedido manda; si no viene, se hereda del clonado y en última
  // instancia es GENERAL.
  const contexto: string =
    typeof body.contexto === "string" && (CONTEXTOS_RIDER as readonly string[]).includes(body.contexto)
      ? body.contexto
      : (origen?.contexto ?? "GENERAL");

  const nombre: string =
    (typeof body.nombre === "string" && body.nombre.trim()) ||
    (origen ? `${origen.nombre} v${version}` : `Rider ${artista.nombre} v${version}`);

  const rider = await prisma.$transaction(async (tx) => {
    await tx.artistaRider.updateMany({
      where: { artistaId: id, contexto, esActivo: true },
      data: { esActivo: false },
    });

    const creado = await tx.artistaRider.create({
      data: {
        artistaId: id,
        nombre,
        version,
        esActivo: true,
        contexto,
        // El PDF del artista, si lo trae, se adjunta como referencia: la ficha
        // se captura igual y es ella la que genera el documento de la casa.
        archivoUrl: typeof body.archivoUrl === "string" ? body.archivoUrl : null,
        archivoNombre: typeof body.archivoNombre === "string" ? body.archivoNombre : null,
        archivoTamanoBytes:
          typeof body.archivoTamanoBytes === "number" && Number.isFinite(body.archivoTamanoBytes)
            ? Math.round(body.archivoTamanoBytes)
            : null,
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
        seccionesExtra: leerSeccionesExtra(origen?.seccionesExtra) as unknown as object,
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

    if (origen?.contactos.length) {
      await tx.artistaRiderContacto.createMany({
        data: origen.contactos.map((c) => ({
          riderId: creado.id,
          personaId: c.personaId,
          nombre: c.nombre,
          rol: c.rol,
          telefono: c.telefono,
          email: c.email,
          notas: c.notas,
          enPdf: c.enPdf,
          orden: c.orden,
        })),
      });
    }

    // Los anexos se clonan apuntando al mismo blob: el stage plot no cambió solo
    // porque se abrió una versión nueva, y duplicar el archivo no gana nada.
    if (origen?.archivos.length) {
      await tx.artistaRiderArchivo.createMany({
        data: origen.archivos.map((a) => ({
          riderId: creado.id,
          nombre: a.nombre,
          url: a.url,
          tipo: a.tipo,
          mime: a.mime,
          tamanoBytes: a.tamanoBytes,
          incluirEnPdf: a.incluirEnPdf,
          notas: a.notas,
          orden: a.orden,
        })),
      });
    }

    return creado;
  });

  return NextResponse.json({ rider });
}
