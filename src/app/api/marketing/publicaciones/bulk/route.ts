import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const ESTADOS = ["PENDIENTE", "EN_PROCESO", "LISTO", "PUBLICADO", "CANCELADO"];

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { ids, accion, valor } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Sin publicaciones seleccionadas" }, { status: 400 });
  }

  const where = { id: { in: ids as string[] } };

  switch (accion) {
    case "ocultar":
    case "mostrar": {
      const { count } = await prisma.publicacion.updateMany({
        where, data: { oculta: accion === "ocultar" },
      });
      return NextResponse.json({ afectadas: count });
    }

    case "estado": {
      if (!ESTADOS.includes(valor)) {
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
      }
      const { count } = await prisma.publicacion.updateMany({ where, data: { estado: valor } });
      return NextResponse.json({ afectadas: count });
    }

    case "variacion": {
      const { count } = await prisma.publicacion.updateMany({
        where, data: { variacionId: valor || null },
      });
      return NextResponse.json({ afectadas: count });
    }

    case "mover": {
      const dias = Number(valor);
      if (!Number.isFinite(dias) || dias === 0) {
        return NextResponse.json({ error: "Días inválidos" }, { status: 400 });
      }
      const pubs = await prisma.publicacion.findMany({ where, select: { id: true, fecha: true } });
      await prisma.$transaction(pubs.map(p => prisma.publicacion.update({
        where: { id: p.id },
        data: { fecha: new Date(p.fecha.getTime() + dias * 86_400_000) },
      })));
      return NextResponse.json({ afectadas: pubs.length });
    }

    case "eliminar": {
      const { count } = await prisma.publicacion.deleteMany({ where });
      return NextResponse.json({ afectadas: count });
    }

    default:
      return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
  }
}
