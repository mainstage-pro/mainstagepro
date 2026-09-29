import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ESTADOS_TACTICA, type EstadoTactica } from "@/lib/estrategia";
import { ensureEstrategiaSchema } from "../route";

const VALIDOS = new Set(ESTADOS_TACTICA.map(e => e.value));

// Mover una táctica es la única forma de mover el avance de un objetivo, así que
// cualquier persona autenticada puede actualizar la suya; crear y borrar es de ADMIN.
async function guardEdicion() {
  const session = await getSession();
  if (!session) return null;
  await ensureEstrategiaSchema();
  return session;
}

export async function POST(req: NextRequest) {
  const session = await guardEdicion();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const b = await req.json();
  const descripcion = (b.descripcion ?? "").trim();
  if (!b.objetivoId || !descripcion) {
    return NextResponse.json({ error: "Objetivo y descripción requeridos" }, { status: 400 });
  }
  const ultimo = await prisma.tactica.findFirst({
    where: { objetivoId: b.objetivoId },
    orderBy: { orden: "desc" },
  });
  const tactica = await prisma.tactica.create({
    data: {
      objetivoId: b.objetivoId,
      descripcion,
      responsableId: b.responsableId || null,
      fechaEjecucion: b.fechaEjecucion ? new Date(b.fechaEjecucion) : null,
      estado: VALIDOS.has(b.estado) ? b.estado : "PENDIENTE",
      notas: b.notas ?? null,
      orden: (ultimo?.orden ?? -1) + 1,
    },
  });
  return NextResponse.json({ tactica }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await guardEdicion();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  if (b.estado !== undefined && !VALIDOS.has(b.estado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }
  const estado = b.estado as EstadoTactica | undefined;
  const tactica = await prisma.tactica.update({
    where: { id: b.id },
    data: {
      ...(b.descripcion !== undefined ? { descripcion: String(b.descripcion).trim() } : {}),
      ...(b.responsableId !== undefined ? { responsableId: b.responsableId || null } : {}),
      ...(b.fechaEjecucion !== undefined
        ? { fechaEjecucion: b.fechaEjecucion ? new Date(b.fechaEjecucion) : null }
        : {}),
      ...(b.notas !== undefined ? { notas: b.notas } : {}),
      ...(b.orden !== undefined ? { orden: Number(b.orden) } : {}),
      ...(estado !== undefined
        ? { estado, completadoEn: estado === "COMPLETADO" ? new Date() : null }
        : {}),
    },
  });
  return NextResponse.json({ tactica });
}

export async function DELETE(req: NextRequest) {
  const session = await guardEdicion();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  await prisma.tactica.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
