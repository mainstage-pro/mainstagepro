import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const reporte = await prisma.reporteSemanal.findUnique({ where: { id } });
  if (!reporte) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ reporte });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const { notas } = await req.json();
  const reporte = await prisma.reporteSemanal.update({ where: { id }, data: { notas } });
  return NextResponse.json({ reporte });
}
