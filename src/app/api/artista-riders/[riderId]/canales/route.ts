import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SOPORTES_MIC, TIPOS_SALIDA } from "@/lib/giras";
import { fechasConAjuste } from "@/lib/show-canales";

type Tipo = "INPUT" | "OUTPUT";

interface CanalEntrante {
  id?: string | null;
  numero?: number | string | null;
  nombre?: string | null;
  instrumento?: string | null;
  microfono?: string | null;
  alternativas?: string | null;
  soporte?: string | null;
  phantom?: boolean;
  inserto?: string | null;
  rigId?: string | null;
  rigPuerto?: string | null;
  tipoSalida?: string | null;
  estereo?: boolean;
  personaId?: string | null;
  notas?: string | null;
}

interface CanalDatos {
  tipo: Tipo;
  numero: number;
  nombre: string;
  instrumento: string | null;
  microfono: string | null;
  alternativas: string | null;
  soporte: string | null;
  phantom: boolean;
  inserto: string | null;
  rigId: string | null;
  rigPuerto: string | null;
  tipoSalida: string | null;
  estereo: boolean;
  personaId: string | null;
  notas: string | null;
}

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;
  const tipo = req.nextUrl.searchParams.get("tipo");

  const canales = await prisma.artistaRiderCanal.findMany({
    where: { riderId, ...(tipo === "INPUT" || tipo === "OUTPUT" ? { tipo } : {}) },
    orderBy: [{ tipo: "asc" }, { numero: "asc" }],
  });

  return NextResponse.json({ canales });
}

/// Guardado completo de una lista (INPUT u OUTPUT) en un solo viaje: la tabla se
/// autoguarda entera cada vez que el usuario deja de escribir. Los renglones que
/// el usuario quitó de la tabla se borran aquí.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;
  const body = await req.json();

  const tipo: Tipo | null = body.tipo === "INPUT" || body.tipo === "OUTPUT" ? body.tipo : null;
  if (!tipo) return NextResponse.json({ error: "tipo debe ser INPUT u OUTPUT" }, { status: 400 });
  if (!Array.isArray(body.canales)) {
    return NextResponse.json({ error: "canales debe ser un arreglo" }, { status: 400 });
  }

  const rider = await prisma.artistaRider.findUnique({
    where: { id: riderId },
    select: { id: true, artistaId: true },
  });
  if (!rider) return NextResponse.json({ error: "Rider no encontrado" }, { status: 404 });

  const personasValidas = new Set(
    (
      await prisma.artistaPersona.findMany({
        where: { artistaId: rider.artistaId },
        select: { id: true },
      })
    ).map((p) => p.id),
  );

  /// Con autoguardado el cliente puede mandar el id de una fila que un guardado
  /// anterior ya borró (le quitaron el nombre y se lo devolvieron). Esos ids se
  /// tratan como fila nueva en vez de reventar el update.
  const idsVivos = new Set(
    (
      await prisma.artistaRiderCanal.findMany({ where: { riderId, tipo }, select: { id: true } })
    ).map((c) => c.id),
  );

  const rigsValidos = new Set(
    (await prisma.artistaRiderRig.findMany({ where: { riderId }, select: { id: true } })).map((r) => r.id),
  );

  // El nombre puede quedar vacío: un renglón abierto es un canal que ya cuenta en
  // la lista y lleva su número, y todavía no se sabe qué va a entrar por él.
  const entrantes = (body.canales as CanalEntrante[])
    .map((c, i): { id: string | null; datos: CanalDatos } => {
      const nombre = texto(c.nombre) ?? "";
      const n = Number(c.numero);
      const personaId = c.personaId && personasValidas.has(c.personaId) ? c.personaId : null;
      const soporte = c.soporte && (SOPORTES_MIC as readonly string[]).includes(c.soporte) ? c.soporte : null;
      const tipoSalida =
        c.tipoSalida && (TIPOS_SALIDA as readonly string[]).includes(c.tipoSalida) ? c.tipoSalida : null;
      const rigId = c.rigId && rigsValidos.has(c.rigId) ? c.rigId : null;
      return {
        id: c.id && idsVivos.has(c.id) ? c.id : null,
        datos: {
          tipo,
          numero: Number.isFinite(n) ? Math.trunc(n) : i + 1,
          nombre,
          instrumento: tipo === "INPUT" ? texto(c.instrumento) : null,
          microfono: tipo === "INPUT" ? texto(c.microfono) : null,
          alternativas: tipo === "INPUT" ? texto(c.alternativas) : null,
          soporte: tipo === "INPUT" ? soporte : null,
          phantom: tipo === "INPUT" ? c.phantom === true : false,
          inserto: tipo === "INPUT" ? texto(c.inserto) : null,
          // El rig sirve en las dos listas: la interfaz entrega entradas y el
          // rack de in-ears recibe salidas.
          rigId,
          rigPuerto: rigId ? texto(c.rigPuerto) : null,
          tipoSalida: tipo === "OUTPUT" ? tipoSalida : null,
          estereo: tipo === "OUTPUT" ? c.estereo === true : false,
          personaId: tipo === "OUTPUT" ? personaId : null,
          notas: texto(c.notas),
        },
      };
    });

  const conservados = entrantes.map((e) => e.id).filter((id): id is string => !!id);

  await prisma.$transaction(async (tx) => {
    await tx.artistaRiderCanal.deleteMany({
      where: { riderId, tipo, ...(conservados.length ? { id: { notIn: conservados } } : {}) },
    });
    for (const e of entrantes) {
      if (e.id) {
        await tx.artistaRiderCanal.update({ where: { id: e.id }, data: e.datos });
      } else {
        await tx.artistaRiderCanal.create({ data: { ...e.datos, riderId } });
      }
    }
  });

  const canales = await prisma.artistaRiderCanal.findMany({
    where: { riderId, tipo },
    orderBy: { numero: "asc" },
  });

  // Cambiar el rider puede dejar de ser una divergencia (el rider se movió hacia
  // lo que la plaza ya decía) o volverse una: el aviso se recalcula cada vez.
  return NextResponse.json({ canales, divergencias: await fechasConAjuste(riderId) });
}
