import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureEntradasProspectoTable } from "@/lib/bandeja-prospectos";
import { serializePerfiles } from "@/lib/proceso/perfiles";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  for (const key of ["nombre", "empresa", "telefono", "correo", "origenLead", "notas"]) {
    if (key in body) data[key] = (body[key] ?? "")?.toString().trim() || null;
  }
  if ("perfilesProspecto" in body) {
    const arr: string[] = Array.isArray(body.perfilesProspecto) ? body.perfilesProspecto : [];
    data.perfilesProspecto = serializePerfiles(arr);
  }

  await ensureEntradasProspectoTable();
  const entrada = await prisma.entradaProspecto.update({ where: { id }, data });
  return NextResponse.json({ entrada });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await ensureEntradasProspectoTable();
  await prisma.entradaProspecto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
