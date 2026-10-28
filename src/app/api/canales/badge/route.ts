import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureCanalesBase, canalesVisiblesWhere } from "@/lib/canales";

// Total de mensajes no leídos en todos los canales visibles — para el badge
// "Mensajes" del sidebar (Sidebar.tsx lo pollea cada 60s junto con los demás).
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ count: 0 }, { status: 200 });
  await ensureCanalesBase();

  const canales = await prisma.canal.findMany({
    where: canalesVisiblesWhere(session),
    select: { id: true, lecturas: { where: { usuarioId: session.id }, select: { leidoHasta: true } } },
  });

  const total = await Promise.all(
    canales.map((c) =>
      prisma.mensaje.count({
        where: { canalId: c.id, createdAt: { gt: c.lecturas[0]?.leidoHasta ?? new Date(0) }, NOT: { autorId: session.id } },
      }),
    ),
  );

  return NextResponse.json({ count: total.reduce((a, b) => a + b, 0) });
}
