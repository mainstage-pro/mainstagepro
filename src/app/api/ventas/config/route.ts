import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function getConfig() {
  let config = await prisma.configComisiones.findFirst();
  if (!config) {
    config = await prisma.configComisiones.create({ data: {} });
  }
  return config;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const config = await getConfig();
  return NextResponse.json({ config });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const allowed = [
    "metaMes1", "metaMes2", "metaMes3", "metaMesNormal",
    "pctClientePropio", "pctPublicidad", "pctAsignadoVendedor", "pctAsignadoOrigen",
    "pctBono",
  ];

  const config = await getConfig();
  const data: Record<string, number> = {};
  for (const key of allowed) {
    if (key in body && body[key] !== "" && body[key] !== null) {
      data[key] = parseFloat(body[key]);
    }
  }

  const updated = await prisma.configComisiones.update({ where: { id: config.id }, data });
  return NextResponse.json({ config: updated });
}
