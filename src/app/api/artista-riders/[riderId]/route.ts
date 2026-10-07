import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CONTEXTOS_RIDER, leerSeccionesExtra } from "@/lib/giras";

const TEXTO = [
  "nombre",
  "formacion",
  "requerimientosGenerales",
  "notasFoh",
  "notasMonitoreo",
  "notasBackline",
  "notasIluminacion",
  "notasVideo",
  "notasEnergia",
  "notasEscenario",
  "notasHospitalidad",
  "notasCrewRequerido",
  "stagePlotUrl",
  "archivoUrl",
  "archivoNombre",
] as const;

const FLOTANTES = ["escenarioAnchoM", "escenarioProfundoM", "escenarioAlturaM"] as const;
const ENTEROS = [
  "canalesMinimos",
  "mixesMonitor",
  "tiempoSoundcheckMin",
  "tiempoCambioMin",
  "archivoTamanoBytes",
] as const;

function num(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;

  const rider = await prisma.artistaRider.findUnique({
    where: { id: riderId },
    include: {
      canales: { orderBy: [{ tipo: "asc" }, { numero: "asc" }] },
      lineas: { orderBy: [{ disciplina: "asc" }, { orden: "asc" }] },
      contactos: { orderBy: [{ orden: "asc" }, { createdAt: "asc" }] },
      archivos: { orderBy: [{ orden: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!rider) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ rider });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;
  const body = await req.json();

  const actual = await prisma.artistaRider.findUnique({
    where: { id: riderId },
    select: { artistaId: true, contexto: true },
  });
  if (!actual) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const f of TEXTO) {
    if (f in body) {
      if (f === "nombre") {
        const n = typeof body.nombre === "string" ? body.nombre.trim() : "";
        if (!n) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
        data.nombre = n;
      } else {
        data[f] = body[f] || null;
      }
    }
  }
  for (const f of FLOTANTES) if (f in body) data[f] = num(body[f]);
  for (const f of ENTEROS) {
    if (f in body) {
      const n = num(body[f]);
      data[f] = n === null ? null : Math.trunc(n);
    }
  }

  if ("seccionesExtra" in body) {
    data.seccionesExtra = leerSeccionesExtra(body.seccionesExtra);
  }

  if ("contexto" in body && (CONTEXTOS_RIDER as readonly string[]).includes(body.contexto)) {
    data.contexto = body.contexto;
  }

  // Vigente DENTRO de su contexto: el rider de festival no apaga al de tour.
  // Si el PATCH mueve el rider de contexto, el vigente que se apaga es el del
  // contexto nuevo, no el del viejo.
  const activar = body.esActivo === true;
  const contextoFinal = (data.contexto as string | undefined) ?? actual.contexto;

  const rider = await prisma.$transaction(async (tx) => {
    if (activar) {
      await tx.artistaRider.updateMany({
        where: { artistaId: actual.artistaId, contexto: contextoFinal, esActivo: true, id: { not: riderId } },
        data: { esActivo: false },
      });
      data.esActivo = true;
    }
    return tx.artistaRider.update({ where: { id: riderId }, data });
  });

  return NextResponse.json({ rider });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;

  const rider = await prisma.artistaRider.findUnique({
    where: { id: riderId },
    select: { artistaId: true, esActivo: true, contexto: true },
  });
  if (!rider) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.artistaRider.update({ where: { id: riderId }, data: { activo: false, esActivo: false } });
    // Si se dio de baja la versión vigente, la más reciente que quede en ese
    // contexto toma el relevo: un contexto sin rider vigente rompe el advance.
    if (rider.esActivo) {
      const sustituta = await tx.artistaRider.findFirst({
        where: { artistaId: rider.artistaId, contexto: rider.contexto, activo: true },
        orderBy: { version: "desc" },
        select: { id: true },
      });
      if (sustituta) {
        await tx.artistaRider.update({ where: { id: sustituta.id }, data: { esActivo: true } });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
