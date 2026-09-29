import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// El orden de las cuentas es una preferencia compartida, no por usuario: quien
// las reacomoda las reacomoda para todos. Se recibe la lista completa de ids ya
// en el orden deseado y la posición es el índice.
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.some(id => typeof id !== "string")) {
    return NextResponse.json({ error: "Se espera ids: string[]" }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((id: string, i: number) =>
      prisma.cuentaBancaria.update({ where: { id }, data: { orden: i } }),
    ),
  );

  return NextResponse.json({ ok: true });
}
