import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";

function textoOpcional(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? null : t;
}

function fecha(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v !== "string") return undefined;
  const d = new Date(v.length === 10 ? `${v}T12:00:00.000Z` : v);
  return isNaN(d.getTime()) ? undefined : d;
}

function enteroOpcional(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : undefined;
}

function soloDefinidos<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  }
  return out;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const proyecto = await prisma.proyectoCreativo.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true } },
      artista: { select: { id: true, nombre: true } },
      gira: { select: { id: true, nombre: true } },
      trato: { select: { id: true, nombreEvento: true } },
      propuestas: {
        where: { activo: true },
        select: { id: true, numero: true, estado: true, granTotal: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ proyecto });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const proyecto = await prisma.proyectoCreativo.update({
    where: { id },
    data: soloDefinidos({
      nombre: textoOpcional(body.nombre) ?? undefined,
      estado: textoOpcional(body.estado) ?? undefined,
      briefing: textoOpcional(body.briefing),
      notas: textoOpcional(body.notas),
      fechaEntrega: fecha(body.fechaEntrega),
      clienteId: textoOpcional(body.clienteId),
      artistaId: textoOpcional(body.artistaId),
      tratoId: textoOpcional(body.tratoId),
      giraId: textoOpcional(body.giraId),
      revisionesIncluidas: enteroOpcional(body.revisionesIncluidas),
      revisionesUsadas: enteroOpcional(body.revisionesUsadas),
      fixtureCountEstimado: body.fixtureCountEstimado === null ? null : enteroOpcional(body.fixtureCountEstimado),
      urgente: typeof body.urgente === "boolean" ? body.urgente : undefined,
    }),
    select: { id: true, numero: true },
  });

  await logActividad(session.id, "EDITAR", "proyecto_creativo", proyecto.id, `Proyecto creativo ${proyecto.numero} editado`);

  return NextResponse.json({ proyecto });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const proyecto = await prisma.proyectoCreativo.update({
    where: { id },
    data: { activo: false },
    select: { numero: true },
  });

  await logActividad(session.id, "ELIMINAR", "proyecto_creativo", id, `Proyecto creativo ${proyecto.numero} eliminado`);

  return NextResponse.json({ ok: true });
}
