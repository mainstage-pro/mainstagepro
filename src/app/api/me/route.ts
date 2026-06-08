import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let moduloKeys: string[] | null = null;
  if (session.role !== "ADMIN") {
    const accesos = await prisma.moduloAcceso.findMany({ where: { userId: session.id }, select: { moduloKey: true } });
    moduloKeys = accesos.map(a => a.moduloKey);
  }

  const modoArranqueRow = await prisma.appConfig.findFirst({ where: { key: 'plan-trabajo.modo-arranque' } });
  const modoArranque = modoArranqueRow?.value === 'true';

  return NextResponse.json({ id: session.id, name: session.name, email: session.email, role: session.role, area: session.area, moduloKeys, modoArranque });
}
