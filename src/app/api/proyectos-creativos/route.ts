import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";

function textoOpcional(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function enteroOpcional(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
}

function fecha(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v.length === 10 ? `${v}T12:00:00.000Z` : v);
  return isNaN(d.getTime()) ? null : d;
}

async function siguienteNumero(): Promise<string> {
  const ultimo = await prisma.proyectoCreativo.findFirst({
    where: { numero: { startsWith: "PC-" } },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const n = ultimo ? parseInt(ultimo.numero.replace("PC-", ""), 10) || 0 : 0;
  return `PC-${String(n + 1).padStart(4, "0")}`;
}

// GET: lista de proyectos de Mainstage Creative
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const estado = req.nextUrl.searchParams.get("estado");

  const proyectos = await prisma.proyectoCreativo.findMany({
    where: { activo: true, ...(estado ? { estado } : {}) },
    select: {
      id: true,
      numero: true,
      nombre: true,
      estado: true,
      fechaSolicitud: true,
      fechaEntrega: true,
      createdAt: true,
      cliente: { select: { id: true, nombre: true, empresa: true } },
      artista: { select: { id: true, nombre: true } },
      gira: { select: { id: true, nombre: true } },
      trato: { select: { id: true, nombreEvento: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ proyectos });
}

// POST: nuevo proyecto creativo. Sin FK a Proyecto (Pro): solo cuelga de las
// entidades de origen compartidas (cliente/artista/trato/gira), igual que Gira
// no cuelga de Proyecto salvo por el join angosto GiraShow.proyectoId.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const nombre = textoOpcional(body.nombre);
  if (!nombre) return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });

  const numero = await siguienteNumero();

  const proyecto = await prisma.proyectoCreativo.create({
    data: {
      numero,
      nombre,
      clienteId: textoOpcional(body.clienteId),
      artistaId: textoOpcional(body.artistaId),
      tratoId: textoOpcional(body.tratoId),
      giraId: textoOpcional(body.giraId),
      briefing: textoOpcional(body.briefing),
      fechaEntrega: fecha(body.fechaEntrega),
      fixtureCountEstimado: enteroOpcional(body.fixtureCountEstimado),
      urgente: body.urgente === true,
    },
    select: { id: true, numero: true },
  });

  await logActividad(
    session.id,
    "CREAR",
    "proyecto_creativo",
    proyecto.id,
    `Proyecto creativo ${proyecto.numero} creado`,
  );

  return NextResponse.json({ proyecto });
}
