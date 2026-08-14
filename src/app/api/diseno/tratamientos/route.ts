import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { prisma } from "@/lib/prisma";
import { esTratamiento } from "@/lib/diseno/tratamiento";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lista/edita el tratamiento visual de los equipos (módulo de diseño, solo dueño).
export async function GET() {
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) return NextResponse.json({ error: "no autorizado" }, { status: 401 });

  const equipos = await prisma.equipo.findMany({
    where: { activo: true, NOT: [{ imagenUrl: null }, { imagenUrl: "" }] },
    select: { id: true, marca: true, modelo: true, descripcion: true, imagenUrl: true, tratamiento: true },
    orderBy: [{ tratamiento: "asc" }, { descripcion: "asc" }],
  });
  return NextResponse.json({ equipos });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) return NextResponse.json({ error: "no autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  const tratamiento = body?.tratamiento as string | undefined;
  if (!id || !esTratamiento(tratamiento)) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });

  await prisma.equipo.update({ where: { id }, data: { tratamiento } });
  return NextResponse.json({ ok: true });
}
