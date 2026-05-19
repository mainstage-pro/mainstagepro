import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tratos = await prisma.$queryRaw<{
    id: string; etapa: string; nombreEvento: string | null;
    createdAt: Date; clienteNombre: string; clienteEmpresa: string | null;
  }[]>`
    SELECT t.id, t.etapa, t."nombreEvento", t."createdAt",
           c.nombre AS "clienteNombre", c.empresa AS "clienteEmpresa"
    FROM tratos t
    JOIN clientes c ON c.id = t."clienteId"
    WHERE t."requiereRevision" = true
      AND t.etapa IN ('DESCUBRIMIENTO', 'OPORTUNIDAD')
    ORDER BY t."createdAt" ASC
  `.catch(() => []);

  return NextResponse.json({ tratos });
}

// PATCH /api/tratos/en-revision — resolver un trato en revisión
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { tratoId, accion } = await req.json();
  if (!tratoId || !accion) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

  if (accion === "continuar") {
    // Desmarcar requiereRevision, el trato sigue activo
    await prisma.$executeRawUnsafe(`UPDATE tratos SET "requiereRevision" = false WHERE id = $1`, tratoId);
  } else if (accion === "nurturing") {
    await prisma.$executeRawUnsafe(
      `UPDATE tratos SET "requiereRevision" = false, "tipoProspecto" = 'NURTURING' WHERE id = $1`,
      tratoId
    );
  } else if (accion === "perder") {
    await prisma.$executeRawUnsafe(
      `UPDATE tratos SET "requiereRevision" = false, etapa = 'VENTA_PERDIDA', "etapaCambiadaEn" = NOW() WHERE id = $1`,
      tratoId
    );
  }

  return NextResponse.json({ ok: true });
}
