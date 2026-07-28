import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Guarda en lote las posiciones (x, y) de los nodos del organigrama.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const b = await req.json();
    const posiciones = Array.isArray(b.posiciones) ? b.posiciones : [];
    await prisma.$transaction(
      posiciones
        .filter((p: { id?: string }) => typeof p.id === "string")
        .map((p: { id: string; posX: number; posY: number }) =>
          prisma.puesto.update({
            where: { id: p.id },
            data: { posX: Number(p.posX), posY: Number(p.posY) },
          }),
        ),
    );
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rrhh/puestos-operativos/posiciones POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
