import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const venue = await prisma.venue.findUnique({ where: { id } });
  if (!venue) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ venue });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  const textFields = ["nombre", "direccion", "ciudad", "contacto", "telefonoContacto", "emailContacto",
    "accesoVehicular", "puntoDescarga", "voltajeDisponible", "fases", "ubicacionTablero",
    "restriccionDecibeles", "restriccionHorario", "restriccionInstalacion", "notas", "fotoPortada"];
  const numFields = ["largoM", "anchoM", "alturaMaximaM", "amperajeTotal", "calificacion"];
  const intFields = ["capacidadPersonas"];

  for (const f of textFields) if (f in body) data[f] = body[f] ?? null;
  for (const f of numFields) if (f in body) data[f] = body[f] ? parseFloat(body[f]) : null;
  for (const f of intFields) if (f in body) data[f] = body[f] ? parseInt(body[f]) : null;
  if ("tiposEvento" in body) data.tiposEvento = Array.isArray(body.tiposEvento) ? JSON.stringify(body.tiposEvento) : body.tiposEvento ?? null;
  if ("activo" in body) data.activo = body.activo;

  const venue = await prisma.venue.update({ where: { id }, data });
  return NextResponse.json({ venue });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.venue.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
